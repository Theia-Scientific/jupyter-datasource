package jupyterclient

import (
	"context"
  "encoding/json"
  "fmt"
	"golang.org/x/sync/errgroup"
	"io"
	"strings"

  zmq "github.com/go-zeromq/zmq4"
)

type Logger interface {
	Log(string)
}

type Callback func(string)

type resultMsg struct {val *json.RawMessage; err error}
type requestMsg struct {code string; resultChannel chan resultMsg}
type replyMsg struct {id string; res resultMsg}

type JupyterSession struct {
	requests chan requestMsg
	resets chan int
	cancel context.CancelFunc
	context context.Context
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
	Data map[string]json.RawMessage `json:"data"`
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

// pctx should be a context that bounds the entire session (use context.Background() if unsure)
func MakeJupyterSession(ctx context.Context, ci *ConnectionInfo, logger Logger) (*JupyterSession, error) {
	group, ctx := errgroup.WithContext(ctx)
	ctx, cancel := context.WithCancel(ctx)
	rv := &JupyterSession{
		requests: make(chan requestMsg),
		resets: make(chan int),
		cancel: cancel,
		context: ctx,
	}
	replies := make(chan replyMsg)
	group.Go(func() error { return requestor(ctx, ci, rv.requests, replies, rv.resets, logger) })
	group.Go(func() error { return listener(ctx, ci, replies, logger) })

	// roundtrip once to detect errors
	if _, err := rv.Query("None"); err != nil {
		return nil, err
	}
	return rv, nil
}

func (js *JupyterSession) Query(code string) (*json.RawMessage, error) {
	// if the session is already terminated, complain
	if err := context.Cause(js.context); err != nil {
		return nil, err
	}

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

func requestor(ctx context.Context, ci *ConnectionInfo, requests chan requestMsg, replies chan replyMsg, resets chan int, logger Logger) error {
	liveRequests := make(map[string]chan resultMsg)
	shell, err := makeJupyterShellSocket(ctx, ci)
  if err != nil {
    logger.Log(fmt.Sprintf("xxxa %+v", err))
		return err
  }

	defer shell.Close()

	for {
		select {
		case <- resets: {
			logger.Log(fmt.Sprintf("encoding shutdown request"))
			content, err := json.Marshal(ShutdownRequestContent{
				Restart: true,
			})
			if err != nil {
				logger.Log(fmt.Sprintf("xxxb %+v", err))
				return err
			}
			logger.Log(fmt.Sprintf("sending shutdown request"))
			_, err = shell.sendMessage("shutdown_request", content)
			if err != nil {
				logger.Log(fmt.Sprintf("xxxc %+v", err))
				return err
			}
			logger.Log(fmt.Sprintf("sent shutdown request"))
		}
		case request := <- requests: {
			content, err := json.Marshal(ExecuteRequestContent{
				Code: request.code,
			})
			if err != nil {
				logger.Log(fmt.Sprintf("xxxd %+v", err))
				return err
			}
			msgId, err := shell.sendMessage("execute_request", content)
			if err != nil {
				logger.Log(fmt.Sprintf("xxxf %+v", err))
				return err
			}
			liveRequests[msgId] = request.resultChannel
		}
		case reply := <- replies: {
			replyChannel, ok := liveRequests[reply.id]
			if ok {
				replyChannel <- reply.res
			}
			delete(liveRequests, reply.id)
		}
		case <-ctx.Done(): {
			logger.Log("Got a done message, finishing requestor")
			for _, resultChannel := range liveRequests {
				resultChannel <- resultMsg{val: nil, err: context.Cause(ctx)}
			}
			return nil
		}
		}
	}
}

func listener(ctx context.Context, ci *ConnectionInfo, replies chan replyMsg, logger Logger) error {
  sub := zmq.NewSub(ctx, zmq.WithAutomaticReconnect(true), zmq.WithDialerMaxRetries(-1))
  var ioPubAddr = fmt.Sprintf("tcp://%s:%d", ci.IP, ci.IOPubPort)
  err := sub.Dial(ioPubAddr)
  if err != nil {
    logger.Log(fmt.Sprintf("xxxg %+v", err))
		return err
  }
	defer sub.Close()
	err = sub.SetOption(zmq.OptionSubscribe, "")
  if err != nil {
    logger.Log(fmt.Sprintf("xxxh %+v", err))
		return err
  }

	results := make(map[string]resultMsg)

	for {
		select {
		case <-ctx.Done():
			logger.Log("got a Done message, returning from listener")
			return nil
		default:
		}
		
		msg, err := sub.Recv()
		if err != nil {
			if err == context.Canceled {
				logger.Log("got context.Canceled err on sub, returning from listener")
				return nil
			} else if err == io.EOF {
				logger.Log("eof, continuing to hopefully reconnect")
				continue
			} else {
				logger.Log(fmt.Sprintf("xxxi %+v", err))
				return err
			}
		}
		parts := msg.Frames

		// channel := parts[0]
		// delim := parts[1]
		// signature := parts[2]
		header := parts[3]
		parentHeader := parts[4]
		// metadata := parts[5]
		var content []byte
		if len(parts) >= 7 {
			content = parts[6]
		} else {
			content = []byte{}
		}

		var headerParsed Header
		err = json.Unmarshal([]byte(header), &headerParsed)
		if err != nil {
			logger.Log(fmt.Sprintf("xxxj %+v", err))
			return err
		}

		var parentHeaderParsed Header
		err = json.Unmarshal([]byte(parentHeader), &parentHeaderParsed)
		if err != nil {
			logger.Log(fmt.Sprintf("xxxk %+v", err))
			return err
		}

		if headerParsed.MsgType == "execute_result" {
			var contentParsed ExecuteResultContent
			err = json.Unmarshal([]byte(content), &contentParsed)
			if err != nil {
				logger.Log(fmt.Sprintf("xxxl %+v", err))
				return err
			}
			val, ok := contentParsed.Data["application/json"]
			if !ok {
				val = contentParsed.Data["text/plain"]
			}
			results[parentHeaderParsed.MsgId] = resultMsg{val: &val, err:nil}
		} else if headerParsed.MsgType == "error" {
			var errorParsed ErrorContent
			err = json.Unmarshal([]byte(content), &errorParsed)
			if err != nil {
				logger.Log(fmt.Sprintf("xxxm %+v", err))
				return err
			}
			results[parentHeaderParsed.MsgId] = resultMsg{val: nil, err: errorParsed}
		} else if headerParsed.MsgType == "status" {
			var contentParsed StatusContent
			err = json.Unmarshal([]byte(content), &contentParsed)
			if err != nil {
				logger.Log(fmt.Sprintf("xxxn %+v", err))
				return err
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
					replies <- replyMsg{id: parentHeaderParsed.MsgId, res: resultMsg{val: nil, err: nil}}
				}
			}
		} else {
			logger.Log(fmt.Sprintf("unknown response: %s | %+v", headerParsed.MsgType, string(content)))
		}
	}
}
