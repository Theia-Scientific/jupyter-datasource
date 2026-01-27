package main

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
  //  UserExpressions dict `json:"user_expressions"`
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

const DELIM = "<IDS|MSG>"

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

func GetMessage() (string, string) {
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
  header, err := json.Marshal(m.Header)
  fmt.Printf("native header: %s\n", m)
  fmt.Printf("serialized header: %s\n", header)
  if err != nil {
    log.Fatal(err)
  }
  content, err := json.Marshal(m.Content)
  fmt.Printf("native content: %s\n", m)
  fmt.Printf("serialized content: %s\n", content)
  if err != nil {
    log.Fatal(err)
  }
  return string(header), string(content)
}

func SignMessage(plaintext [][]byte, k *ConnectionInfo) string {
  // fmt.Printf("decoding key %s", k.Key)
  // key, err := hex.DecodeString(k.Key)
  // if err != nil {
  //   log.Fatal(err)
  // }
  key := []byte(k.Key)
  mac := hmac.New(sha256.New, key)
  for _, m := range plaintext {
    mac.Write([]byte(m))
  }
  return hex.EncodeToString(mac.Sum(nil))
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

  header, content := GetMessage()
  fmt.Printf("Message: %s %s\n", header, content)

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

  signed := []([]byte){
    []byte(header), // header
    []byte("{}"), // parentHeader
		[]byte("{}"), // metadata
    []byte(content), // content
  }

  signature := SignMessage(signed, &ci)
  fmt.Printf("Signature: %s\n", signature)

  // todo add zmq identifier
  zmqId := NewId()
  fmt.Printf("zmqId: %s\n", zmqId);
  message := []([]byte){[]byte(zmqId), []byte(DELIM), []byte(signature)}
  full_message := append(message, signed...)

  fmt.Printf("sending message\n")
  total, err := dealer.SendMessage(full_message)
  if err != nil {
    log.Fatal(err)
  }
  fmt.Printf("message sent, %d bytes\n", total)

  parts, err := dealer.RecvMessage(0)
  if err != nil {
    log.Fatal(err)
  }

  fmt.Printf("Received reply:\n%s\n", parts)
}

