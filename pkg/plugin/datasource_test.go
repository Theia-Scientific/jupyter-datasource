package plugin

import (
	"context"
	"encoding/json"
	"testing"

	"github.com/grafana/grafana-plugin-sdk-go/backend"
	"github.com/grafana/grafana-plugin-sdk-go/backend/log"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/mock"
	"github.com/Theia-Scientific/jupyter-datasource/pkg/jupyterclient_test"
	"github.com/Theia-Scientific/jupyter-datasource/pkg/jupyterclient"
)

func TestConnectionStrategy(t *testing.T) {
	_, err := makeConnectionStrategy(&InstanceSettings{ConnectionType:"AUTO"})
	assert.Nil(t, err)

	_, err = makeConnectionStrategy(&InstanceSettings{ConnectionType:"INFO"})
	assert.Nil(t, err)

	_, err = makeConnectionStrategy(&InstanceSettings{ConnectionType:"CORNDOG"})
	assert.NotNil(t, err)
}

func TestCallResource(t *testing.T) {
	httpClient := jupyterclient_test.NewMockIJupyterHttpClient(t)
	jupyterUrl := "http://jupyter.corndog.edu/";
	d := &Datasource{
		settings: &InstanceSettings{
			ConnectionType: "AUTO",
			AuthType: "NONE",
			JupyterUrl: &jupyterUrl,
			connectionStrategy: ConnectionStrategyAuto{},
		},
		logger: log.New(),
		sessions: make(map[string]SessionState),
		createdKernels: []string{},
		httpClient: httpClient,
		context: context.Background(),
		cancel: func(){},
	}

	httpClient.EXPECT().GetListing("some/path").Return([]jupyterclient.PathEntry{}, nil);

	rv, err := d.callResource(&backend.CallResourceRequest{
		Path: "list",
		URL: "http://whatever/list?path=some/path",
	});

	assert.Equal(t, string(rv), "[]")
	assert.Nil(t, err)
}

func TestCreateKernel(t *testing.T) {
	httpClient := jupyterclient_test.NewMockIJupyterHttpClient(t)
	jupyterUrl := "http://jupyter.corndog.edu/";
	d := &Datasource{
		settings: &InstanceSettings{
			ConnectionType: "AUTO",
			AuthType: "NONE",
			JupyterUrl: &jupyterUrl,
			connectionStrategy: ConnectionStrategyAuto{},
		},
		logger: log.New(),
		sessions: make(map[string]SessionState),
		createdKernels: []string{},
		httpClient: httpClient,
		context: context.Background(),
		cancel: func(){},
	}

	httpClient.EXPECT().CreateKernel(mock.Anything).Return(jupyterclient.KernelSpec{}, nil);
	httpClient.EXPECT().GetConnectionInfo(mock.Anything).Return(jupyterclient.ConnectionInfo{}, nil);
	httpClient.EXPECT().KillKernel(mock.Anything).Return(nil);

	_ = d.query(context.Background(), backend.DataQuery{
		JSON: json.RawMessage(`{"uuid":"x","code":"1+1"}`),
	})
}
