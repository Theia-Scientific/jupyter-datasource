package plugin

import (
	"context"
	"encoding/json"
	"fmt"
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

type MockJupyterSessionFactory struct {
	session jupyterclient.IJupyterSession
}

func (f MockJupyterSessionFactory) MakeJupyterSession(ctx context.Context, ci *jupyterclient.ConnectionInfo, logger jupyterclient.Logger) (jupyterclient.IJupyterSession, error) {
	log.New().Debug("mock factory being called")
	return f.session, nil
}

func setupDatasource(t *testing.T) (*jupyterclient_test.MockIJupyterHttpClient, *jupyterclient_test.MockIJupyterSession, *Datasource) {
	httpClient := jupyterclient_test.NewMockIJupyterHttpClient(t)
	jupyterUrl := "http://jupyter.corndog.edu/";
	session :=	jupyterclient_test.NewMockIJupyterSession(t)
	sessionFactory := MockJupyterSessionFactory{session}
	d := &Datasource{
		settings: &InstanceSettings{
			ConnectionType: "AUTO",
			AuthType: "NONE",
			JupyterUrl: &jupyterUrl,
			connectionStrategy: ConnectionStrategyAuto{},
		},
		logger: log.New(),
		sessions: make(map[string]SessionState),
		sessionFactory: sessionFactory,
		createdKernels: []string{},
		httpClient: httpClient,
		context: context.Background(),
		cancel: func(){},
	}

	return httpClient, session, d
}

// a query with no UUID specified should fail
func TestNoUUIDReturnsError(t *testing.T) {
	_, _, d := setupDatasource(t)

	resp := d.query(context.Background(), backend.DataQuery{
		JSON: json.RawMessage(`{"code":"1+1"}`),
	})
	d.logger.Debug(fmt.Sprintf("Got result: %+v", resp))
	assert.NotNil(t, resp.Error)
	assert.Equal(t, resp.Error.Error(), "query missing uuid")
}

// a query with no kernelId specified should create a new kernel
func TestUnspecifiedKernelIdCreatesKernel(t *testing.T) {
	httpClient, session, d := setupDatasource(t)

	httpClient.EXPECT().CreateKernel("python3").Return(jupyterclient.KernelSpec{Id:"kid"}, nil);
	httpClient.EXPECT().GetConnectionInfo("kid").Return(jupyterclient.ConnectionInfo{}, nil);
	session.EXPECT().Initialize(mock.Anything, "1+1").Return(nil)

	val := json.RawMessage("2")
	session.EXPECT().Query("1+1").Return(jupyterclient.Result{Val: &val},nil)

	d.query(context.Background(), backend.DataQuery{
		JSON: json.RawMessage(`{"uuid":"x","code":"1+1"}`),
	})
}

// a query with a kernelId specified should reuse an existing kernel
func TestSpecifiedKernelIdDoesNotCreateKernel(t *testing.T) {
	httpClient, session, d := setupDatasource(t)

	httpClient.EXPECT().GetConnectionInfo("kid").Return(jupyterclient.ConnectionInfo{}, nil);
	session.EXPECT().Initialize(mock.Anything, "1+1").Return(nil)
	val := json.RawMessage("2")
	session.EXPECT().Query("1+1").Return(jupyterclient.Result{Val: &val},nil)

	d.query(context.Background(), backend.DataQuery{
		JSON: json.RawMessage(`{"uuid":"x","kernelId":"kid","code":"1+1"}`),
	})
}

// a datasource with import statements should initialize a new kernel with them
func TestImportStatementsAreIncludedInInitialize(t *testing.T) {
}

// a query with a code change should call Initialize again
func TestCodeChangeReinitializes(t *testing.T) {
}

// a query without a code change should NOT call Initialize again
func TestNoCodeChangeDoesNotReinitialize(t *testing.T) {
}

// a query with a vars change should not reinitialize
func TestVarChangeDoesNotReinitialize(t *testing.T) {
}

// switching from an unspecified kernelId to a specified kernelId should kill the old kernelId
func TestMovingToSpecifiedKernelIdDeletesOldKernel(t *testing.T) {
}

// a kernelId should not be killed if it's still in use
func TestKernelsStillInUseShouldNotBeKilled(t *testing.T) {
}

// two queries using the same kernel tag should use the same kernel
func TestTwoQueriesWithSameTagShouldUseSameKernel(t *testing.T) {
}

// a query whose kernel tag changes should create a new kernel
func TestKernelTagChangeShouldCreateNewKernel(t *testing.T) {
}

// a 
