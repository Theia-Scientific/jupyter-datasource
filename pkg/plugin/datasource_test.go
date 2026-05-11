package plugin

import (
	"context"
	"testing"

	"github.com/grafana/grafana-plugin-sdk-go/backend"
	"github.com/stretchr/testify/assert"
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
	httpClient.EXPECT().GetListing("some/path").Return([]jupyterclient.PathEntry{}, nil);
	d := &Datasource{
		sessions: make(map[string]SessionState),
		createdKernels: []string{},
		httpClient: httpClient,
		context: context.Background(),
		cancel: func(){},
	}

	rv, err := d.callResource(&backend.CallResourceRequest{
		Path: "list",
		URL: "http://whatever/list?path=some/path",
	});

	assert.Equal(t, string(rv), "[]")
	assert.Nil(t, err)
}
