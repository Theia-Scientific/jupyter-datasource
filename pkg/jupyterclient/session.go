package jupyterclient

import (
  "crypto/hmac"
  "crypto/sha256"
  "encoding/hex"
  "encoding/json"
  "fmt"
  "io"
  "log"
  "math/rand"
  "net/http"
  "os"
	"strings"
  "time"

  zmq "github.com/pebbe/zmq4"
)

type Callback func(string)

type requestMsg struct {code string; cb Callback}
type replyMsg struct {id string; val string}

type JupyterSession struct {
	requests chan requestMsg
	quit chan int
}

type Header struct {
	MsgId string `json:"msg_id"`
	Username string `json:"username"`
	Session string `json:"session"`
	Date string `json:"date"`
	MsgType string `json:"msg_type"`
	Version string `json:"version"`
}
type ExecuteRequestContent struct {
	Code string `json:"code"`
}
type ExecuteResultContent struct {
	Data map[string]string `json:"data"`
}
type StatusContent struct {
	ExecutionState string `json:"execution_state"`
}

type ConnectionInfo struct {
  SignatureScheme string `json:"signature_scheme"`
  Transport       string `json:"transport"`
  StdinPort       int    `json:"stdin_port"`
  ControlPort     int    `json:"control_port"`
  IOPubPort       int    `json:"iopub_port"`
  HBPort          int    `json:"hb_port"`
  ShellPort       int    `json:"shell_port"`
  Key             string `json:"key"`
  IP              string `json:"ip"`
}

type KernelSpec struct {
  Id string `json:"id"`
  Name string `json:"name"`
  LastActivity string `json:"last_activity"`
  ExecutionState string `json:"execution_state"`
  Connections int `json:"connections"`
}

const DELIM = "<IDS|MSG>"
func MakeJupyterSession(ci *ConnectionInfo) JupyterSession {
	rv := JupyterSession {
		requests: make(chan requestMsg),
		quit: make(chan int),
	}
	go requestor(ci, rv.requests, rv.quit)
	return rv
}

func (js *JupyterSession) Query(code string, callback func(string)) {
	js.requests <- requestMsg{code: code, cb: callback}
}

func (js *JupyterSession) Quit() {
	js.quit <- 0
}

func getMessage(msgId string, sessionId string, code string) (string, string) {
  header, err := json.Marshal(Header{
		MsgId: msgId,
		Username: "scruffy",
		Session: sessionId,
		Date: time.Now().Format(time.RFC3339),
		MsgType: "execute_request",
		Version: "5.0",
	})
  fmt.Printf("serialized header: %s\n", header)
  if err != nil {
    log.Fatal(err)
  }
  content, err := json.Marshal(ExecuteRequestContent{
		Code: code,
	})
  fmt.Printf("serialized content: %s\n", content)
  if err != nil {
    log.Fatal(err)
  }
  return string(header), string(content)
}

func signMessage(plaintext [][]byte, k *ConnectionInfo) string {
  key := []byte(k.Key)
  mac := hmac.New(sha256.New, key)
  for _, m := range plaintext {
    mac.Write([]byte(m))
  }
  return hex.EncodeToString(mac.Sum(nil))
}

func requestor(ci *ConnectionInfo, requests chan requestMsg, quit chan int) {
	replies := make(chan replyMsg)
	replyQuit := make(chan int)
	go listener(ci, replies, replyQuit)

	liveRequests := make(map[string]Callback)
	sessionId := NewId()
	zmqId := NewId()

  dealer, err := zmq.NewSocket(zmq.DEALER)
  if err != nil {
    log.Fatal(err)
  }
  var shellAddr = fmt.Sprintf("tcp://%s:%d", ci.IP, ci.ShellPort)
  log.Printf("shell address: %s", shellAddr)
  err = dealer.Connect(shellAddr)
  if err != nil {
    log.Fatal(err)
  }
	defer dealer.Close()

	for {
		select {
		case request := <- requests: {
			msgId := NewId()
			liveRequests[msgId] = request.cb

			header, content := getMessage(msgId, sessionId, request.code)
			fmt.Printf("Message: %s %s\n", header, content)

			signed := []([]byte){
				[]byte(header), // header
				[]byte("{}"), // parentHeader
				[]byte("{}"), // metadata
				[]byte(content), // content
			}

			signature := signMessage(signed, ci)
			fmt.Printf("Signature: %s\n", signature)

			message := []([]byte){[]byte(zmqId), []byte(DELIM), []byte(signature)}
			full_message := append(message, signed...)

			fmt.Printf("sending message\n")
			total, err := dealer.SendMessage(full_message)
			if err != nil {
				log.Fatal(err)
			}
			fmt.Printf("message sent, %d bytes\n", total)
		}
		case reply := <- replies: {
			liveRequests[reply.id](reply.val)
			delete(liveRequests, reply.id)
		}
		case <-quit:
			replyQuit <- 0
			return
		}
	}
}

func listener(ci *ConnectionInfo, replies chan replyMsg, quit chan int) {
  sub, err := zmq.NewSocket(zmq.SUB)
  if err != nil {
    log.Fatal(err)
  }
  var ioPubAddr = fmt.Sprintf("tcp://%s:%d", ci.IP, ci.IOPubPort)
  log.Printf("shell address: %s", ioPubAddr)
  err = sub.Connect(ioPubAddr)
  if err != nil {
    log.Fatal(err)
  }
	defer sub.Close()
	err = sub.SetSubscribe("")
  if err != nil {
    log.Fatal(err)
  }

	results := make(map[string]string)

	for {
		select {
		case <- quit:
			return
		default:
		}
		
		parts, err := sub.RecvMessage(0)
		if err != nil {
			log.Fatal(err)
		}

		fmt.Printf("received reply: %s\n", parts)
		// channel := parts[0]
		// delim := parts[1]
		// signature := parts[2]
		header := parts[3]
		parentHeader := parts[4]
		// metadata := parts[5]
		content := parts[6]

		var headerParsed Header
		err = json.Unmarshal([]byte(header), &headerParsed)
		if err != nil {
			log.Fatal(err)
		}

		var parentHeaderParsed Header
		err = json.Unmarshal([]byte(parentHeader), &parentHeaderParsed)
		if err != nil {
			log.Fatal(err)
		}

		fmt.Printf("got message type %s\n", headerParsed.MsgType)
		if headerParsed.MsgType == "execute_result" {
			var contentParsed ExecuteResultContent
			err = json.Unmarshal([]byte(content), &contentParsed)
			if err != nil {
				log.Fatal(err)
			}
			results[parentHeaderParsed.MsgId] = contentParsed.Data["text/plain"]
		} else if headerParsed.MsgType == "status" {
			var contentParsed StatusContent
			err = json.Unmarshal([]byte(content), &contentParsed)
			if err != nil {
				log.Fatal(err)
			}
			if contentParsed.ExecutionState == "idle" {
				result, ok := results[parentHeaderParsed.MsgId]
				if ok {
					fmt.Printf("result of %s: '%s'\n", parentHeaderParsed.MsgId, result)
					replies <- replyMsg{id: parentHeaderParsed.MsgId, val: result}
					delete(results, parentHeaderParsed.MsgId)
				} else {
					fmt.Printf("no result for %s\n", parentHeaderParsed.MsgId)
					replies <- replyMsg{id: parentHeaderParsed.MsgId, val: "None"}
				}
			}
		}
	}	
}




func NewId() string {
  part1 := make([]byte, 4)
  rand.Read(part1)
  part2 := make([]byte, 12)
  rand.Read(part2)
  return fmt.Sprintf("%s-%s", hex.EncodeToString(part1), hex.EncodeToString(part2))
}

func GetJupyterToken() string {
  host := os.Getenv("SYSTEM_SERVICE_HOST")
  port := os.Getenv("SYSTEM_SERVICE_PORT")
  url := fmt.Sprintf("http://%s:%s/tokens/jupyter", host, port)
  fmt.Printf("getting jupyter token... ");
  req, err := http.NewRequest(http.MethodPut, url, http.NoBody)
  if err != nil {
    log.Fatal(err)
  }
  res, err := http.DefaultClient.Do(req)
  if err != nil {
    log.Fatal(err)
  }
  defer res.Body.Close()
  body, err := io.ReadAll(res.Body)
  if err != nil {
    log.Fatal(err)
  }
  fmt.Printf("%s\n", string(body));
  return string(body)
}

type JupyterHttpClient struct {
  BasePath string
  AuthHeader string
}

func MakeJupyterHttpClient() JupyterHttpClient {
  tok := GetJupyterToken()
  host := os.Getenv("JUPYTER_SERVICE_HOST")
  port := os.Getenv("JUPYTER_SERVICE_PORT")
  return JupyterHttpClient {
    AuthHeader: fmt.Sprintf("Bearer %s", tok),
     BasePath: fmt.Sprintf("http://%s:%s/", host, port),
  }
}

func (jc *JupyterHttpClient) NewRequest(method, path string, body io.Reader) (*http.Request, error) {
  req, err := http.NewRequest(method, fmt.Sprintf("%s%s", jc.BasePath, path), body)
  if err != nil {
    return nil, err
  }
  req.Header.Add("Authorization", jc.AuthHeader)
  return req, nil
}

func (jc *JupyterHttpClient) Get(path string) (*http.Request, error) {
  return jc.NewRequest(http.MethodGet, path, http.NoBody)
}

func (jc *JupyterHttpClient) Post(path string, body string) (*http.Request, error) {
  return jc.NewRequest(http.MethodPost, path, strings.NewReader(body))
}

func (jc *JupyterHttpClient) GetKernels() ([]KernelSpec, error) {
  var kernels []KernelSpec

  req, err := jc.Get("jupyter/api/kernels")
  if err != nil {
    return kernels, err
  }
  res, err := http.DefaultClient.Do(req)
  if err != nil {
    return kernels, err
  }
  defer res.Body.Close()
  body, err := io.ReadAll(res.Body)
  if err != nil {
    return kernels, err
  }
  err = json.Unmarshal(body, &kernels)
  return kernels, err
}

func (jc *JupyterHttpClient) CreateKernel() (KernelSpec, error) {
  var kernel KernelSpec

  req, err := jc.Post("jupyter/api/kernels", "{\"name\":\"python3\"}")
  if err != nil {
    return kernel, err
  }
  res, err := http.DefaultClient.Do(req)
  if err != nil {
    return kernel, err
  }
  defer res.Body.Close()
  body, err := io.ReadAll(res.Body)
  if err != nil {
    return kernel, err
  }
  fmt.Printf("CreateKernel body: %s\n", body)
  err = json.Unmarshal(body, &kernel)
  return kernel, err
}

func (jc *JupyterHttpClient) SelectKernel() (KernelSpec, error) {
  kernels, err := jc.GetKernels()
  if err != nil {
    return KernelSpec{}, err
  }
  if len(kernels) == 0 {
    // create a kernel
    kernel, err := jc.CreateKernel()
    if err != nil {
      return KernelSpec{}, err
    }
    fmt.Printf("using new kernel: %s\n", kernel)
    return kernel, nil
  } else {
    // use the first kernel
    fmt.Printf("using existing kernel: %s\n", kernels[0])
    return kernels[0], nil
  }
}

func (jc *JupyterHttpClient) GetConnectionInfo(ks *KernelSpec) (ConnectionInfo, error) {
  var connectionInfo ConnectionInfo
  path := fmt.Sprintf("jupyter/api/kernels/%s/connection", ks.Id)
  fmt.Printf("getting path %s\n", path)
  req, err := jc.Get(path)
  if err != nil {
    return connectionInfo, err
  }
  res, err := http.DefaultClient.Do(req)
  if err != nil {
    return connectionInfo, err
  }
  defer res.Body.Close()
  body, err := io.ReadAll(res.Body)
  if err != nil {
    return connectionInfo, err
  }
  fmt.Printf("GetConnectionInfo body: %s\n", body)
  err = json.Unmarshal(body, &connectionInfo)
  return connectionInfo, err
}
