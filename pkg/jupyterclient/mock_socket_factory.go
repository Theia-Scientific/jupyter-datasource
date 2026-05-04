package jupyterclient

import (
	"context"
	"errors"

  zmq "github.com/go-zeromq/zmq4"
)

type MockDealerSocket struct {}

type MockSocketFactory struct {}

func (_ MockSocketFactory) makeControl(ctx context.Context, connectionInfo *ConnectionInfo, zmqId string, sessionId string) (JupyterShellSocketInterface, error) {
	return nil, errors.New("TODO")
}

func (_ MockSocketFactory) makeShell(ctx context.Context, connectionInfo *ConnectionInfo, zmqId string, sessionId string) (JupyterShellSocketInterface, error) {
	return nil, errors.New("TODO")
}

func (_ MockSocketFactory) makeIOPub(ctx context.Context, connectionInfo *ConnectionInfo) (zmq.Socket, error) {
	return nil, errors.New("TODO")
}

func (_ MockSocketFactory) makeHeartbeat(ctx context.Context, connectionInfo *ConnectionInfo) (zmq.Socket, error) {
	return nil, errors.New("TODO")
}
