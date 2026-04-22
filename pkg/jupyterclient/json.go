package jupyterclient

import (
  "encoding/json"
	"strings"

	"github.com/acarl005/stripansi"
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

type KernelSpec struct {
  Id string `json:"id"`
  Name string `json:"name"`
  LastActivity string `json:"last_activity"`
  ExecutionState string `json:"execution_state"`
  Connections int `json:"connections"`
	NotebookPath *string `json:"notebook_path"`
}

type Session struct {
	Id string `json:"id"`
	Path string `json:"path"`
	Name string `json:"name"`
	Type string `json:"type"`
	Kernel KernelSpec `json:"kernel"`
	Notebook Notebook `json:"notebook"`
}

type Cell struct {
	CellType string `json:"cell_type"`
	Source string `json:"source"`
}

type NotebookContent struct {
	Cells []Cell `json:"cells"`
	// also metadata i guess
}

type Notebook struct {
	Name string `json:"name"`
	Path string `json:"path"`
	Type string `json:"type"`
	Content *NotebookContent `json:"content"`
}

type PathEntry struct {
	Name string `json:"name"`
	Path string `json:"path"`
	LastModified string `json:"last_modified"`
	Created string `json:"created"`
	Size uint64 `json:"size"`
	Type string `json:"type"`
	Content *[]PathEntry `json:"content"`
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
	return stripansi.Strip(strings.Join(e.Traceback, "\n"))
}

type StreamContent struct {
	Name string `json:"name"`
	Text string `json:"text"`
}

