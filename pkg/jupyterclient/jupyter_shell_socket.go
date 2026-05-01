package jupyterclient

import (
  "crypto/hmac"
  "crypto/sha256"
  "encoding/hex"
  "encoding/json"
	"time"

  zmq "github.com/go-zeromq/zmq4"
)

type JupyterShellSocket struct {
	zmqId string
	sessionId string
	username string
	dealer zmq.Socket
	connectionInfo *ConnectionInfo
}

const DELIM = "<IDS|MSG>"

func (jss *JupyterShellSocket) Close() {
	jss.dealer.Close()
}

func (jss *JupyterShellSocket) encodeHeader(msgId string, msgType string) (string, error) {
  header, err := json.Marshal(Header{
		MsgId: msgId,
		Username: jss.username,
		Session: jss.sessionId,
		Date: time.Now().Format(time.RFC3339),
		MsgType: msgType,
		Version: "5.0",
	})
	return string(header), err
}

func (jss *JupyterShellSocket) signMessage(plaintext [][]byte) string {
  key := []byte(jss.connectionInfo.Key)
  mac := hmac.New(sha256.New, key)
  for _, m := range plaintext {
    mac.Write([]byte(m))
  }
  return hex.EncodeToString(mac.Sum(nil))
}

func (jss *JupyterShellSocket) sendMessage(msgType string, content []byte) (string, error) {
	msgId := NewId()

	header, err := jss.encodeHeader(msgId, msgType)
	if err != nil { return "", err }

	signed := []([]byte){
		[]byte(header), // header
		[]byte("{}"), // parentHeader
		[]byte("{}"), // metadata
		content, // content
	}

	signature := jss.signMessage(signed)

	message := []([]byte){[]byte(jss.zmqId), []byte(DELIM), []byte(signature)}
	full_message := append(message, signed...)

	err = jss.dealer.SendMulti(zmq.NewMsgFrom(full_message...))
	if err != nil { return "", err }

	return msgId, nil
}

