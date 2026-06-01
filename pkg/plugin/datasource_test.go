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
	"github.com/Theia-Scientific/jupyter-datasource/pkg/plugin_test"
)

// calling makeConnectionStrategy with a valid string will succeed, an invalid string will fail
func TestConnectionStrategy(t *testing.T) {
	_, err := makeConnectionStrategy(&InstanceSettings{ConnectionType:"AUTO"})
	assert.Nil(t, err)

	_, err = makeConnectionStrategy(&InstanceSettings{ConnectionType:"INFO"})
	assert.Nil(t, err)

	_, err = makeConnectionStrategy(&InstanceSettings{ConnectionType:"CORNDOG"})
	assert.NotNil(t, err)
}

func setupDatasource(t *testing.T) (*jupyterclient_test.MockIJupyterHttpClient, *Datasource) {
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
		sessionFactory: nil,
		createdKernels: []string{},
		taggedKernels: make(map[string]string),
		httpClient: httpClient,
		context: context.Background(),
		cancel: func(){},
	}

	return httpClient, d
}

// calling GetListing will return a list of paths
func TestCallResource(t *testing.T) {
	httpClient, d := setupDatasource(t)

	httpClient.EXPECT().GetListing("some/path").Return([]jupyterclient.PathEntry{}, nil);

	rv, err := d.callResource(&backend.CallResourceRequest{
		Path: "list",
		URL: "http://whatever/list?path=some/path",
	});

	assert.Equal(t, string(rv), "[]")
	assert.Nil(t, err)
}

// a query with no UUID specified should fail
func TestNoUUIDReturnsError(t *testing.T) {
	_, d := setupDatasource(t)

	resp := d.query(context.Background(), backend.DataQuery{
		JSON: json.RawMessage(`{"code":"1+1"}`),
	})
	d.logger.Debug(fmt.Sprintf("Got result: %+v", resp))
	assert.NotNil(t, resp.Error)
	assert.Equal(t, resp.Error.Error(), "query missing uuid")
}

func setupDatasourceWithSession(t *testing.T) (*jupyterclient_test.MockIJupyterHttpClient, *jupyterclient_test.MockIJupyterSession, *Datasource) {
	httpClient, d := setupDatasource(t)
	session := jupyterclient_test.NewMockIJupyterSession(t)
	sessionFactory := plugin_test.NewMockIJupyterSessionFactory(t)
	sessionFactory.EXPECT().
		MakeJupyterSession(mock.Anything, mock.Anything, mock.Anything).
		Return(session, nil)
	d.sessionFactory = sessionFactory

	return httpClient, session, d
}

// a query with no kernelId specified should create a new kernel
func TestUnspecifiedKernelIdCreatesKernel(t *testing.T) {
	httpClient, session, d := setupDatasourceWithSession(t)

	httpClient.EXPECT().CreateKernel("python3").Return(jupyterclient.KernelSpec{Id:"kid"}, nil);
	httpClient.EXPECT().GetConnectionInfo("kid").Return(jupyterclient.ConnectionInfo{}, nil);
	session.EXPECT().Initialize((*[]string)(nil), "1+1").Return(nil)

	val := json.RawMessage("2")
	session.EXPECT().Query("1+1").Return(jupyterclient.Result{Val: &val},nil)

	d.query(context.Background(), backend.DataQuery{
		JSON: json.RawMessage(`{"uuid":"x","code":"1+1"}`),
	})
}

// a query with a kernelId specified should reuse an existing kernel
func TestSpecifiedKernelIdDoesNotCreateKernel(t *testing.T) {
	httpClient, session, d := setupDatasourceWithSession(t)

	httpClient.EXPECT().GetConnectionInfo("kid").Return(jupyterclient.ConnectionInfo{}, nil);
	session.EXPECT().Initialize((*[]string)(nil), "1+1").Return(nil)
	val := json.RawMessage("2")
	session.EXPECT().Query("1+1").Return(jupyterclient.Result{Val: &val},nil)

	d.query(context.Background(), backend.DataQuery{
		JSON: json.RawMessage(`{"uuid":"x","kernelId":"kid","code":"1+1"}`),
	})
}

// a datasource with import statements should Execute them once
func TestImportStatementsAreIncludedInInitialize(t *testing.T) {
	httpClient, session, d := setupDatasourceWithSession(t)
	importStatements := "from treats import candy"
	d.settings.ImportStatements = &importStatements

	httpClient.EXPECT().GetConnectionInfo("kid").Return(jupyterclient.ConnectionInfo{}, nil);
	session.EXPECT().Initialize((*[]string)(nil), "1+1").Return(nil)
	val := json.RawMessage("2")
	session.EXPECT().Query("1+1").Return(jupyterclient.Result{Val: &val},nil).Times(2)
	session.EXPECT().Execute("from treats import candy").Return(jupyterclient.Result{}, nil).Once()

	d.query(context.Background(), backend.DataQuery{
		JSON: json.RawMessage(`{"uuid":"x","kernelId":"kid","code":"1+1"}`),
	})

	d.query(context.Background(), backend.DataQuery{
		JSON: json.RawMessage(`{"uuid":"x","kernelId":"kid","code":"1+1"}`),
	})
}

// a query without a code change should NOT call Initialize again
func TestNoCodeChangeDoesNotReinitialize(t *testing.T) {
	httpClient, session, d := setupDatasourceWithSession(t)

	httpClient.EXPECT().GetConnectionInfo("kid").Return(jupyterclient.ConnectionInfo{}, nil);
	session.EXPECT().Initialize((*[]string)(nil), "1+1").Return(nil).Once()
	val := json.RawMessage("2")
	session.EXPECT().Query("1+1").Return(jupyterclient.Result{Val: &val},nil).Times(2)

	d.query(context.Background(), backend.DataQuery{
		JSON: json.RawMessage(`{"uuid":"x","kernelId":"kid","code":"1+1"}`),
	})

	d.query(context.Background(), backend.DataQuery{
		JSON: json.RawMessage(`{"uuid":"x","kernelId":"kid","code":"1+1"}`),
	})
}

// a query with a code change should call Initialize again
func TestCodeChangeReinitializes(t *testing.T) {
	httpClient, session, d := setupDatasourceWithSession(t)

	httpClient.EXPECT().GetConnectionInfo("kid").Return(jupyterclient.ConnectionInfo{}, nil);
	session.EXPECT().Initialize((*[]string)(nil), "1+1").Return(nil).Once()
	session.EXPECT().Initialize((*[]string)(nil), "1+2").Return(nil).Once()
	val1 := json.RawMessage("2")
	session.EXPECT().Query("1+1").Return(jupyterclient.Result{Val: &val1},nil).Once()
	val2 := json.RawMessage("3")
	session.EXPECT().Query("1+2").Return(jupyterclient.Result{Val: &val2},nil).Once()

	d.query(context.Background(), backend.DataQuery{
		JSON: json.RawMessage(`{"uuid":"x","kernelId":"kid","code":"1+1"}`),
	})

	d.query(context.Background(), backend.DataQuery{
		JSON: json.RawMessage(`{"uuid":"x","kernelId":"kid","code":"1+2"}`),
	})
}

// a query with a vars change should not reinitialize
func TestVarChangeDoesNotReinitialize(t *testing.T) {
	httpClient, session, d := setupDatasourceWithSession(t)

	httpClient.EXPECT().GetConnectionInfo("kid").Return(jupyterclient.ConnectionInfo{}, nil);
	session.EXPECT().Initialize((*[]string)(nil), "1+foo").Return(nil).Once()

	val1 := json.RawMessage("2")
	session.EXPECT().Query("foo = 1\n1+foo").Return(jupyterclient.Result{Val: &val1},nil).Once()

	val2 := json.RawMessage("3")
	session.EXPECT().Query("foo = 2\n1+foo").Return(jupyterclient.Result{Val: &val2},nil).Once()

	d.query(context.Background(), backend.DataQuery{
		JSON: json.RawMessage(`{"uuid":"x","kernelId":"kid","code":"1+foo","vars":[{"name":"foo","value":"1"}]}`),
	})

	d.query(context.Background(), backend.DataQuery{
		JSON: json.RawMessage(`{"uuid":"x","kernelId":"kid","code":"1+foo","vars":[{"name":"foo","value":"2"}]}`),
	})
}

// switching from an unspecified kernelId to a specified kernelId should kill the old kernelId
func TestMovingToSpecifiedKernelIdDeletesOldKernel(t *testing.T) {
	httpClient, d := setupDatasource(t)
	session1 := jupyterclient_test.NewMockIJupyterSession(t)
	sessionFactory := plugin_test.NewMockIJupyterSessionFactory(t)
	d.sessionFactory = sessionFactory
	sessionFactory.EXPECT().
		MakeJupyterSession(mock.Anything, mock.Anything, mock.Anything).
		Return(session1, nil).Once()

	httpClient.EXPECT().CreateKernel("python3").Return(jupyterclient.KernelSpec{Id:"dyn"}, nil);
	httpClient.EXPECT().GetConnectionInfo("dyn").Return(jupyterclient.ConnectionInfo{}, nil);
	session1.EXPECT().Initialize((*[]string)(nil), "1+1").Return(nil).Once()
	session1.EXPECT().Query("1+1").Return(jupyterclient.Result{},nil).Once()

	d.query(context.Background(), backend.DataQuery{
		JSON: json.RawMessage(`{"uuid":"x","code":"1+1"}`),
	})

	session2 := jupyterclient_test.NewMockIJupyterSession(t)
	sessionFactory.EXPECT().
		MakeJupyterSession(mock.Anything, mock.Anything, mock.Anything).
		Return(session2, nil).Once()

	session1.EXPECT().Quit().Return();
	httpClient.EXPECT().KillKernel("dyn").Return(nil);
	httpClient.EXPECT().GetConnectionInfo("kid").Return(jupyterclient.ConnectionInfo{}, nil);
	session2.EXPECT().Initialize((*[]string)(nil), "1+1").Return(nil).Once()
	session2.EXPECT().Query("1+1").Return(jupyterclient.Result{},nil).Once()

	httpClient.EXPECT().GetConnectionInfo("kid").Return(jupyterclient.ConnectionInfo{}, nil);

	d.query(context.Background(), backend.DataQuery{
		JSON: json.RawMessage(`{"uuid":"x","kernelId":"kid","code":"1+1"}`),
	})
}

// a kernelId should not be killed if it's still in use
func TestKernelsStillInUseShouldNotBeKilled(t *testing.T) {
	httpClient, d := setupDatasource(t)
	session1 := jupyterclient_test.NewMockIJupyterSession(t)
	sessionFactory := plugin_test.NewMockIJupyterSessionFactory(t)
	d.sessionFactory = sessionFactory
	sessionFactory.EXPECT().
		MakeJupyterSession(mock.Anything, mock.Anything, mock.Anything).
		Return(session1, nil).Once()

	httpClient.EXPECT().CreateKernel("python3").Return(jupyterclient.KernelSpec{Id:"kid"}, nil);
	httpClient.EXPECT().GetConnectionInfo("kid").Return(jupyterclient.ConnectionInfo{}, nil);
	session1.EXPECT().Initialize((*[]string)(nil), "1+1").Return(nil).Once()
	session1.EXPECT().Query("1+1").Return(jupyterclient.Result{},nil).Once()

	d.query(context.Background(), backend.DataQuery{
		JSON: json.RawMessage(`{"uuid":"x","code":"1+1"}`),
	})

	session2 := jupyterclient_test.NewMockIJupyterSession(t)
	sessionFactory.EXPECT().
		MakeJupyterSession(mock.Anything, mock.Anything, mock.Anything).
		Return(session2, nil).Once()

	httpClient.EXPECT().GetConnectionInfo("kid").Return(jupyterclient.ConnectionInfo{}, nil);
	session2.EXPECT().Initialize((*[]string)(nil), "2+2").Return(nil).Once()
	session2.EXPECT().Query("2+2").Return(jupyterclient.Result{},nil).Once()

	d.query(context.Background(), backend.DataQuery{
		JSON: json.RawMessage(`{"uuid":"y","kernelId":"kid","code":"2+2"}`),
	})

	session3 := jupyterclient_test.NewMockIJupyterSession(t)
	sessionFactory.EXPECT().
		MakeJupyterSession(mock.Anything, mock.Anything, mock.Anything).
		Return(session3, nil).Once()

	httpClient.EXPECT().GetConnectionInfo("kid2").Return(jupyterclient.ConnectionInfo{}, nil);
	session1.EXPECT().Quit().Return().Once()
	session3.EXPECT().Initialize((*[]string)(nil), "1+1").Return(nil).Once()
	session3.EXPECT().Query("1+1").Return(jupyterclient.Result{},nil).Once()

	d.query(context.Background(), backend.DataQuery{
		JSON: json.RawMessage(`{"uuid":"x","kernelId":"kid2","code":"1+1"}`),
	})
}

// two queries using the same kernel tag should use the same kernel
func TestTwoQueriesWithSameTagShouldUseSameKernel(t *testing.T) {
	httpClient, d := setupDatasource(t)
	session1 := jupyterclient_test.NewMockIJupyterSession(t)
	sessionFactory := plugin_test.NewMockIJupyterSessionFactory(t)
	d.sessionFactory = sessionFactory
	sessionFactory.EXPECT().
		MakeJupyterSession(mock.Anything, mock.Anything, mock.Anything).
		Return(session1, nil).Once()

	httpClient.EXPECT().CreateKernel("python3").Return(jupyterclient.KernelSpec{Id:"kid"}, nil).Once();
	httpClient.EXPECT().GetConnectionInfo("kid").Return(jupyterclient.ConnectionInfo{}, nil);
	session1.EXPECT().Initialize((*[]string)(nil), "1+1").Return(nil).Once()
	session1.EXPECT().Query("1+1").Return(jupyterclient.Result{},nil).Once()

	d.logger.Debug("------------------------------------------------------")

	d.query(context.Background(), backend.DataQuery{
		JSON: json.RawMessage(`{"uuid":"x","kernelTag":"tomato","code":"1+1"}`),
	})

	session2 := jupyterclient_test.NewMockIJupyterSession(t)
	sessionFactory.EXPECT().
		MakeJupyterSession(mock.Anything, mock.Anything, mock.Anything).
		Return(session2, nil).Once()

	session2.EXPECT().Initialize((*[]string)(nil), "2+2").Return(nil).Once()
	session2.EXPECT().Query("2+2").Return(jupyterclient.Result{},nil).Once()

	d.query(context.Background(), backend.DataQuery{
		JSON: json.RawMessage(`{"uuid":"y","kernelTag":"tomato","code":"2+2"}`),
	})
}

// a query whose kernel tag changes should create a new kernel
func TestKernelTagChangeShouldCreateNewKernel(t *testing.T) {
	httpClient, d := setupDatasource(t)
	session1 := jupyterclient_test.NewMockIJupyterSession(t)
	sessionFactory := plugin_test.NewMockIJupyterSessionFactory(t)
	d.sessionFactory = sessionFactory
	sessionFactory.EXPECT().
		MakeJupyterSession(mock.Anything, mock.Anything, mock.Anything).
		Return(session1, nil).Once()

	httpClient.EXPECT().CreateKernel("python3").Return(jupyterclient.KernelSpec{Id:"kid"}, nil).Once();
	httpClient.EXPECT().GetConnectionInfo("kid").Return(jupyterclient.ConnectionInfo{}, nil).Once();
	session1.EXPECT().Initialize((*[]string)(nil), "1+1").Return(nil).Once()
	session1.EXPECT().Query("1+1").Return(jupyterclient.Result{},nil).Once()

	d.query(context.Background(), backend.DataQuery{
		JSON: json.RawMessage(`{"uuid":"x","kernelTag":"tomato","code":"1+1"}`),
	})

	session2 := jupyterclient_test.NewMockIJupyterSession(t)
	sessionFactory.EXPECT().
		MakeJupyterSession(mock.Anything, mock.Anything, mock.Anything).
		Return(session2, nil).Once()

	session1.EXPECT().Quit().Return().Once();
	httpClient.EXPECT().KillKernel("kid").Return(nil).Once();
	httpClient.EXPECT().CreateKernel("python3").Return(jupyterclient.KernelSpec{Id:"kid2"}, nil).Once();
	httpClient.EXPECT().GetConnectionInfo("kid2").Return(jupyterclient.ConnectionInfo{}, nil).Once();
	session2.EXPECT().Initialize((*[]string)(nil), "1+1").Return(nil).Once()
	session2.EXPECT().Query("1+1").Return(jupyterclient.Result{},nil).Once()

	d.query(context.Background(), backend.DataQuery{
		JSON: json.RawMessage(`{"uuid":"x","kernelTag":"tomatillo","code":"1+1"}`),
	})
}

