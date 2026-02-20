package jupyterclient

import (
	"context"
  "encoding/json"
  "fmt"
	"log"
	"strings"

  zmq "github.com/go-zeromq/zmq4"
)

type Callback func(string)

type resultMsg struct {val string; err error}
type requestMsg struct {code string; resultChannel chan resultMsg}
type replyMsg struct {id string; res resultMsg}

type JupyterSession struct {
	requests chan requestMsg
	resets chan int
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
type ShutdownRequestContent struct {
	Restart bool `json:"restart"`
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

func MakeJupyterSession(ci *ConnectionInfo) (*JupyterSession, error) {
	ctx, cancel := context.WithCancel(context.Background())
	rv := JupyterSession{
		requests: make(chan requestMsg),
		resets: make(chan int),
		cancel: cancel,
	}
	go requestor(ctx, ci, rv.requests, rv.resets)
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

func (js *JupyterSession) Restart() {
	js.resets <- 0
}

func (js *JupyterSession) Quit() {
	js.cancel()
}

func requestor(ctx context.Context, ci *ConnectionInfo, requests chan requestMsg, resets chan int) {
	replies := make(chan replyMsg)
	go listener(ctx, ci, replies)

	liveRequests := make(map[string]chan resultMsg)
	shell, err := makeJupyterShellSocket(ctx, ci)
  if err != nil {
    log.Fatal(err)
  }

	defer shell.Close()

	for {
		select {
		case <- resets: {
			content, err := json.Marshal(ShutdownRequestContent{
				Restart: true,
			})
			if err != nil {
				log.Fatal(err)
			}
			_, err = shell.sendMessage("shutdown_request", content)
			if err != nil {
				log.Fatal(err)
			}
		}
		case request := <- requests: {
			content, err := json.Marshal(ExecuteRequestContent{
				Code: request.code,
			})
			if err != nil {
				log.Fatal(err)
			}
			msgId, err := shell.sendMessage("execute_request", content)
			if err != nil {
				log.Fatal(err)
			}
			liveRequests[msgId] = request.resultChannel
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
			val, ok := contentParsed.Data["application/json"]
			if !ok {
				val = contentParsed.Data["text/plain"]
			}
			results[parentHeaderParsed.MsgId] = resultMsg{val: val, err:nil}
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
