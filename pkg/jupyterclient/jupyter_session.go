package jupyterclient

import (
	"context"
  "crypto/hmac"
  "crypto/sha256"
  "encoding/hex"
  "encoding/json"
  "fmt"
	"log"
	"strings"
  "time"

  zmq "github.com/go-zeromq/zmq4"
)

type Callback func(string)

type resultMsg struct {val string; err error}
type requestMsg struct {code string; resultChannel chan resultMsg}
type replyMsg struct {id string; res resultMsg}

type JupyterSession struct {
	requests chan requestMsg
	cancel context.CancelFunc
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

type ErrorContent struct {
	EName string `json:"ename"`
	EValue string `json:"evalue"`
	Traceback []string `json:"traceback"`
}

// I want ErrorContent to be useable as a go error, so:
func (e ErrorContent) Error() string {
	return fmt.Sprintf("Jupyter error %s: %s (at %s)",
		e.EName, e.EValue,
		strings.Join(e.Traceback, "\n"),
	)
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

func MakeJupyterSession(ci *ConnectionInfo) (*JupyterSession, error) {
	ctx, cancel := context.WithCancel(context.Background())
	rv := JupyterSession{
		requests: make(chan requestMsg),
		cancel: cancel,
	}
	go requestor(ctx, ci, rv.requests)
	// @TODO roundtrip once to detect errors
	return &rv, nil
}

func (js *JupyterSession) Query(code string) (string, error) {
	// fake an await with channels
	resultChannel := make(chan resultMsg)
	js.requests <- requestMsg{code: code, resultChannel: resultChannel}
	res := <- resultChannel
	return res.val, res.err
}

func (js *JupyterSession) Quit() {
	js.cancel()
}

func encodeHeader(msgId string, sessionId string) (string, error) {
  header, err := json.Marshal(Header{
		MsgId: msgId,
		Username: "scruffy",
		Session: sessionId,
		Date: time.Now().Format(time.RFC3339),
		MsgType: "execute_request",
		Version: "5.0",
	})
	return string(header), err
}

func encodeContent(code string) (string, error) {
  content, err := json.Marshal(ExecuteRequestContent{
		Code: code,
	})
	return string(content), err
}

func signMessage(plaintext [][]byte, k *ConnectionInfo) string {
  key := []byte(k.Key)
  mac := hmac.New(sha256.New, key)
  for _, m := range plaintext {
    mac.Write([]byte(m))
  }
  return hex.EncodeToString(mac.Sum(nil))
}

func requestor(ctx context.Context, ci *ConnectionInfo, requests chan requestMsg) {
	replies := make(chan replyMsg)
	go listener(ctx, ci, replies)

	liveRequests := make(map[string]chan resultMsg)
	sessionId := NewId()
	zmqId := NewId()

  dealer := zmq.NewDealer(ctx, zmq.WithAutomaticReconnect(true))
  var shellAddr = fmt.Sprintf("tcp://%s:%d", ci.IP, ci.ShellPort)
  err := dealer.Dial(shellAddr)
  if err != nil {
    log.Fatal(err)
  }
	defer dealer.Close()

	for {
		select {
		case request := <- requests: {
			msgId := NewId()
			liveRequests[msgId] = request.resultChannel

			header, err := encodeHeader(msgId, sessionId)
			if err != nil {
				log.Fatal(err)
			}
			content, err := encodeContent(request.code)
			if err != nil {
				log.Fatal(err)
			}

			signed := []([]byte){
				[]byte(header), // header
				[]byte("{}"), // parentHeader
				[]byte("{}"), // metadata
				[]byte(content), // content
			}

			signature := signMessage(signed, ci)

			message := []([]byte){[]byte(zmqId), []byte(DELIM), []byte(signature)}
			full_message := append(message, signed...)

			err = dealer.SendMulti(zmq.NewMsgFrom(full_message...))
			if err != nil {
				log.Fatal(err)
			}
		}
		case reply := <- replies: {
			liveRequests[reply.id] <- reply.res
			delete(liveRequests, reply.id)
		}
		case <-ctx.Done():
			for _, resultChannel := range liveRequests {
				resultChannel <- resultMsg{val: "null", err: context.Cause(ctx)}
			}
			return
		}
	}
}

func listener(ctx context.Context, ci *ConnectionInfo, replies chan replyMsg) {
  sub := zmq.NewSub(ctx, zmq.WithAutomaticReconnect(true))
  var ioPubAddr = fmt.Sprintf("tcp://%s:%d", ci.IP, ci.IOPubPort)
  err := sub.Dial(ioPubAddr)
  if err != nil {
    log.Fatal(err)
  }
	defer sub.Close()
	err = sub.SetOption(zmq.OptionSubscribe, "")
  if err != nil {
    log.Fatal(err)
  }

	results := make(map[string]resultMsg)

	for {
		select {
		case <-ctx.Done():
			return
		default:
		}
		
		msg, err := sub.Recv()
		if err != nil {
			if err == context.Canceled {
				return
			} else {
				log.Fatal(err)
			}
		}
		parts := msg.Frames

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

		if headerParsed.MsgType == "execute_result" {
			var contentParsed ExecuteResultContent
			err = json.Unmarshal([]byte(content), &contentParsed)
			if err != nil {
				log.Fatal(err)
			}
			results[parentHeaderParsed.MsgId] = resultMsg{val: contentParsed.Data["application/json"], err:nil}
		} else if headerParsed.MsgType == "error" {
			var errorParsed ErrorContent
			err = json.Unmarshal([]byte(content), &errorParsed)
			if err != nil {
				log.Fatal(err)
			}
			results[parentHeaderParsed.MsgId] = resultMsg{val: "", err: errorParsed}
		} else if headerParsed.MsgType == "status" {
			var contentParsed StatusContent
			err = json.Unmarshal([]byte(content), &contentParsed)
			if err != nil {
				log.Fatal(err)
			}
			if contentParsed.ExecutionState == "idle" {
				result, ok := results[parentHeaderParsed.MsgId]
				if ok {
					// got a result
					replies <- replyMsg{id: parentHeaderParsed.MsgId, res: result}
					delete(results, parentHeaderParsed.MsgId)
				} else {
					// computation terminated without result
					// (like we did a print('something')
					// just return a null
					replies <- replyMsg{id: parentHeaderParsed.MsgId, res: resultMsg{val: "null", err: nil}}
				}
			}
		}
	}	
}
