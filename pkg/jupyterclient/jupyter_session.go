package jupyterclient

import (
	"context"
  "encoding/json"
	"errors"
  "fmt"
	"golang.org/x/sync/errgroup"
	"io"
	"slices"
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
	resets chan(chan resultMsg)
	connectionInfo *ConnectionInfo
	ctx context.Context
	group *errgroup.Group
	groupCtx context.Context
	logger Logger
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

var ShutdownError = errors.New("Session shutdown")

// pctx should be a context that bounds the entire session (use context.Background() if unsure)
func MakeJupyterSession(ctx context.Context, ci *ConnectionInfo, logger Logger) (*JupyterSession, error) {
	rv := &JupyterSession{
		requests: make(chan requestMsg),
		resets: make(chan (chan resultMsg)),
		connectionInfo: ci,
		ctx: ctx,
		logger: logger,
	}
	return rv, rv.Start()
}

func (js *JupyterSession) Start() error {
	js.group, js.groupCtx = errgroup.WithContext(js.ctx)
	replies := make(chan replyMsg)
	js.group.Go(func() error { return requestor(js.groupCtx, js.connectionInfo, js.requests, replies, js.resets, js.logger) })
	js.group.Go(func() error { return listener(js.groupCtx, js.connectionInfo, replies, js.logger) })

	// roundtrip once to detect errors
	if _, err := js.execute("None"); err != nil {
		return err
	}
	return nil
}

func (js *JupyterSession) execute(code string) (*json.RawMessage, error) {
	// if the session is already terminated, complain
	if err := context.Cause(js.groupCtx); err != nil {
		if err == io.EOF {
			js.Start()
		} else {
			return nil, err
		}
	}

	// fake an await with channels
	resultChannel := make(chan resultMsg)
	js.requests <- requestMsg{code: code, resultChannel: resultChannel}
	res := <- resultChannel
	if res.err == ShutdownError {
		// retry
		return js.execute(code)
	}
	return res.val, res.err
}

func (js *JupyterSession) Query(code string) (*json.RawMessage, error) {
	lines := strings.Split(code, "\n")
	nonSysLines := slices.DeleteFunc(lines, func(expr string) bool {
		return strings.HasPrefix(expr, "%") || strings.HasPrefix(expr, "!")
	})
	code = strings.Join(nonSysLines, "\n")
	js.logger.Log(fmt.Sprintf("query code: '%+v'", code))

	return js.execute(code)
}

func (js *JupyterSession) Restart() {
	js.logger.Log("restarting jupytersession")
	completionChannel := make(chan resultMsg)
	js.resets <- completionChannel
  <- completionChannel
	// shut down the group
	js.group.Go(func() error { return ShutdownError })
	js.group.Wait()
	js.Start()
	js.logger.Log("session restarted")
}

// install all packages, do all system commands &c, and restart
func (js *JupyterSession) Initialize(code string) error {
	lines := strings.Split(code, "\n")
	sysLines := slices.DeleteFunc(lines, func(expr string) bool {
		return !strings.HasPrefix(expr, "%") && !strings.HasPrefix(expr, "!")
	})
	if len(sysLines) > 0 {
		sys := strings.Join(sysLines, "\n")
		js.logger.Log(fmt.Sprintf("Initialization code: %+v", sys))
		_, err := js.execute(sys)
		if err != nil {
			return err
		}
		js.Restart()
	}
	return nil
}

func requestor(ctx context.Context, ci *ConnectionInfo, requests chan requestMsg, replies chan replyMsg, resets chan(chan resultMsg), logger Logger) error {
	liveRequests := make(map[string]chan resultMsg)
	zmqId := NewId()
	sessionId := NewId()
	shell, err := makeJupyterShellSocket(ctx, ci, zmqId, sessionId)
  if err != nil {
		return err
  }
	defer shell.Close()

	control, err := makeJupyterControlSocket(ctx, ci, zmqId, sessionId)
  if err != nil {
		return err
  }
	defer control.Close()

	for {
		select {
		case resetChannel := <- resets: {
			content, err := json.Marshal(ShutdownRequestContent{
				Restart: true,
			})
			if err != nil {
				return err
			}
			msgId, err := control.sendMessage("shutdown_request", content)
			if err != nil {
				return err
			}
			liveRequests[msgId] = resetChannel
		}
		case request := <- requests: {
			content, err := json.Marshal(ExecuteRequestContent{
				Code: request.code,
			})
			if err != nil {
				return err
			}
			msgId, err := shell.sendMessage("execute_request", content)
			if err != nil {
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
		return err
  }
	defer sub.Close()
	err = sub.SetOption(zmq.OptionSubscribe, "")
  if err != nil {
		return err
  }

	results := make(map[string]resultMsg)

	for {
		select {
		case <-ctx.Done():
			return nil
		default:
		}
		
		msg, err := sub.Recv()
		if err != nil {
			if err == context.Canceled {
				return nil
			} else if err == io.EOF {
				logger.Log("eof, aborting in hope of reconnection")
				return err
			} else {
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
			return err
		}

		var parentHeaderParsed Header
		err = json.Unmarshal([]byte(parentHeader), &parentHeaderParsed)
		if err != nil {
			return err
		}

		if headerParsed.MsgType == "execute_result" {
			var contentParsed ExecuteResultContent
			err = json.Unmarshal([]byte(content), &contentParsed)
			if err != nil {
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
				return err
			}
			results[parentHeaderParsed.MsgId] = resultMsg{val: nil, err: errorParsed}
		} else if headerParsed.MsgType == "status" {
			var contentParsed StatusContent
			err = json.Unmarshal([]byte(content), &contentParsed)
			if err != nil {
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
		}
	}
}
