package main

import (
	//	"crypto/hmac"
	"encoding/json"
	"flag"
	"fmt"
	"io"
	"io/ioutil"
	"log"
	"net/http"
	"os"
	"strings"
	"time"

	zmq "github.com/pebbe/zmq4"
)

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

type ExecuteRequest struct {
	Code string `json:"code"`
	Silent bool `json:"silent"`
	StoreHistory bool `json:"store_history"`
	//	UserExpressions dict `json:"user_expressions"`
	AllowStdin bool `json:"allow_stdin"`
	StopOnError bool `json:"stop_on_error"`
}

type ExecuteReply struct {
}

type KernelSpec struct {
	Id string `json:"id"`
	Name string `json:"name"`
	LastActivity string `json:"last_activity"`
	ExecutionState string `json:"execution_state"`
	Connections int `json:"connections"`
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

func GetMessage() string {
  type Header struct {
  	MsgId string `json:"msg_id"`
  	Username string `json:"username"`
  	Session string `json:"session"`
  	Date string `json:"date"`
  	MsgType string `json:"msg_type"`
  	Version string `json:"version"`
	}
	type Content struct {
		Code string `json:"code"`
	}
	type Message struct {
		Header Header `json:"header"`
		Content Content `json:"content"`
	}

	var m = Message{
		Header: Header{
			MsgId: "m00001",
			Username: "scruffy",
			Session: "s00001",
			Date: time.Now().Format(time.RFC3339),
			MsgType: "execute_request",
			Version: "5.0",
		},
		Content: Content{
			Code: "12+34",
		},
	}
	var rv, err = json.Marshal(m)
	fmt.Printf("native message: %s\n", m)
	fmt.Printf("serialized message: %s\n", rv)
	if err != nil {
		log.Fatal(err)
	}
	return string(rv)
}

func main() {
	jc := MakeJupyterHttpClient()
	kernel, err := jc.SelectKernel()
	if err != nil {
		log.Fatal(err)
	}

	ci, err := jc.GetConnectionInfo(&kernel)
	if err != nil {
		log.Fatal(err)
	}

	fmt.Printf("ci: %s\n", ci)

	fmt.Printf("Message: %s\n", GetMessage())
}

func honk() {
  flag.Parse()
  if flag.NArg() < 1 {
		log.Fatalln("Need a command line argument specifying the connection file.")
	}

  var connectionFile = flag.Arg(0)
  connectionData, err := ioutil.ReadFile(connectionFile)
  if err != nil {
    log.Fatal(err)
  }

  var connectionInfo ConnectionInfo
  err = json.Unmarshal(connectionData, &connectionInfo)
  if err != nil {
    log.Fatal(err)
  }

	// shell is a router socket that allows multiple connections from frontends
	// that's pretty much all i need for now
	dealer, err := zmq.NewSocket(zmq.DEALER)
	var shellAddr = fmt.Sprintf("tcp://%s:%d/", connectionInfo.IP, connectionInfo.ShellPort)
	log.Printf("shell address: %s", shellAddr)
	dealer.Connect(shellAddr)
	var executeRequest, _ = json.Marshal(ExecuteRequest{
		Code: "1 + 2",
		Silent: true,
		StoreHistory: false,
		//		UserExpressions: nil,
		AllowStdin: false,
		StopOnError: false,
	})
	fmt.Printf("making request: %s", string(executeRequest))
	dealer.Send(string(executeRequest), 0)
	response := make([]byte, 0)
	var chunks = 0
	var total = 0
	for {
		frame, err := dealer.RecvBytes(0)
		fmt.Printf("chunk received")
		if err != nil {
			break // shutting down, quit
		}
		chunks++
		size := len(frame)
		total += size
		if size == 0 {
			break // whole response received
		}
		response = append(response, frame...)
	}
	fmt.Printf("%v chunks received, %v bytes\n", chunks, total)	
	fmt.Printf("response: %s", string(response))	
}
