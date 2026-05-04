package jupyterclient

import (
	"context"
	"fmt"

  zmq "github.com/go-zeromq/zmq4"
)	

type JupyterSocketFactoryInterface interface {
	makeControl(ctx context.Context, connectionInfo *ConnectionInfo, zmqId string, sessionId string) (JupyterShellSocketInterface, error)
	makeShell(ctx context.Context, connectionInfo *ConnectionInfo, zmqId string, sessionId string) (JupyterShellSocketInterface, error)
	makeIOPub(ctx context.Context, connectionInfo *ConnectionInfo) (zmq.Socket, error)
	makeHeartbeat(ctx context.Context, connectionInfo *ConnectionInfo) (zmq.Socket, error)
}

type JupyterSocketFactory struct {}

func (_ JupyterSocketFactory) makeDealer(ctx context.Context, connectionInfo *ConnectionInfo, zmqId string, sessionId string, port int) (*JupyterShellSocket, error) {
  dealer := zmq.NewDealer(ctx, zmq.WithAutomaticReconnect(true), zmq.WithDialerMaxRetries(-1))
  var shellAddr = fmt.Sprintf("tcp://%s:%d", connectionInfo.IP, port)
  err := dealer.Dial(shellAddr)
  if err != nil { return nil, err }
	
	return &JupyterShellSocket{
		zmqId: zmqId,
		sessionId: sessionId,
		username: "theiascope",
		dealer: dealer,
		connectionInfo: connectionInfo,
	}, nil
}

func (f JupyterSocketFactory) makeControl(ctx context.Context, connectionInfo *ConnectionInfo, zmqId string, sessionId string) (*JupyterShellSocket, error) {
	return f.makeDealer(ctx, connectionInfo, zmqId, sessionId, connectionInfo.ControlPort)
}

func (f JupyterSocketFactory) makeShell(ctx context.Context, connectionInfo *ConnectionInfo, zmqId string, sessionId string) (*JupyterShellSocket, error) {
	return f.makeDealer(ctx, connectionInfo, zmqId, sessionId, connectionInfo.ShellPort)
}

func (_ JupyterSocketFactory) makeIOPub(ctx context.Context, connectionInfo *ConnectionInfo) (zmq.Socket, error) {
  sub := zmq.NewSub(ctx, zmq.WithAutomaticReconnect(true), zmq.WithDialerMaxRetries(-1))
  var ioPubAddr = fmt.Sprintf("tcp://%s:%d", connectionInfo.IP, connectionInfo.IOPubPort)
  err := sub.Dial(ioPubAddr)
	if err != nil {
		return nil, err
	}
	err = sub.SetOption(zmq.OptionSubscribe, "")
  if err != nil {
		sub.Close()
		return nil, err
  }
	return sub, nil
}

func (_ JupyterSocketFactory) makeHB(ctx context.Context, connectionInfo *ConnectionInfo) (zmq.Socket, error) {
  req := zmq.NewReq(ctx, zmq.WithAutomaticReconnect(true), zmq.WithDialerMaxRetries(-1))
  var ioPubAddr = fmt.Sprintf("tcp://%s:%d", connectionInfo.IP, connectionInfo.HBPort)
  err := req.Dial(ioPubAddr)
	if err != nil {
		return nil, err
	}
	return req, nil
}

