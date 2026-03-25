package plugin

import (
	"context"
	"encoding/json"
	"fmt"
	"net/http"

	"github.com/Theia-Scientific/jupyter-datasource/pkg/jupyterclient"
	"github.com/Theia-Scientific/jupyter-datasource/pkg/models"
	"github.com/grafana/grafana-plugin-sdk-go/backend"
	"github.com/grafana/grafana-plugin-sdk-go/backend/instancemgmt"
	"github.com/grafana/grafana-plugin-sdk-go/backend/log"
	"github.com/grafana/grafana-plugin-sdk-go/data"
)

// Make sure Datasource implements required interfaces. This is important to do
// since otherwise we will only get a not implemented error response from plugin in
// runtime. In this example datasource instance implements backend.QueryDataHandler,
// backend.CheckHealthHandler interfaces. Plugin should not implement all these
// interfaces - only those which are required for a particular task.
var (
	_ backend.CallResourceHandler   = (*Datasource)(nil)
	_ backend.QueryDataHandler      = (*Datasource)(nil)
	_ backend.CheckHealthHandler    = (*Datasource)(nil)
	_ instancemgmt.InstanceDisposer = (*Datasource)(nil)
)

type InstanceSettings struct {
	ConnectionType   string  `json:"connectionType"`
	AuthType         string  `json:"authType"`
	FetchRoute       *string `json:"fetchRoute"`
	FetchMethod      *string `json:"fetchMethod"`
	RawToken         *string `json:"rawToken"`
	JupyterUrl       *string `json:"jupyterUrl"`
}

// Datasource is an example datasource which can respond to data queries, reports
// its health and has streaming skills.
type Datasource struct {
	sessions map[string]*jupyterclient.JupyterSession
	httpClient *jupyterclient.JupyterHttpClient
	context context.Context
	cancel context.CancelFunc
}

func (p *Datasource) CallResource(ctx context.Context, req *backend.CallResourceRequest, sender backend.CallResourceResponseSender) error {
	logger := log.New()
	logger.Debug(fmt.Sprintf("got a resource request for %+v", req.Path))
	switch req.Path {
	case "notebooks": {
		notebooks, err := p.httpClient.GetNotebooks()
		var jsonData []byte
		if err == nil {
			jsonData, err = json.Marshal(notebooks)
		}
		if err != nil {
			return sender.Send(&backend.CallResourceResponse{
				Status: http.StatusInternalServerError,
			})
		} else {
			return sender.Send(&backend.CallResourceResponse{
				Status: http.StatusOK,
				Body:   jsonData,
			})
		}
	}
	}
	return nil
}

func getJupyterToken(settings *InstanceSettings) (string, error) {
	if settings.AuthType == "NONE" {
		return "", nil
	} else if settings.AuthType == "RAW" {
		if settings.RawToken == nil {
			return "", fmt.Errorf("Raw token auth selected, but no rawToken supplied")
		}
		return *settings.RawToken, nil
	} else if settings.AuthType == "FETCH" {
		if settings.FetchRoute == nil {
			return "", fmt.Errorf("Fetch auth selected, but no fetchRoute supplied")
		}
		if settings.FetchMethod == nil {
			return "", fmt.Errorf("Fetch auth selected, but no fetchMethod supplied")
		}
		systemSettings := jupyterclient.SystemServiceSettings{
			BaseUrl: *settings.FetchRoute,
			Method:  *settings.FetchMethod,
		}
		return jupyterclient.GetJupyterToken(&systemSettings)
	} else {
		return "", fmt.Errorf("Unknown auth type '%s'", settings.AuthType)
	}
}

func createHttpClient(settings *InstanceSettings) (*jupyterclient.JupyterHttpClient, error) {
	if settings.ConnectionType == "INFO" {
		// ConnectionInfo style doesn't require a http client
		return nil, nil
	}

	if settings.JupyterUrl == nil {
		return nil, fmt.Errorf("AUTO connection type selected, but no jupyterUrl supplied")
	}

	jupyterToken, err := getJupyterToken(settings)
	if err != nil {
		return nil, err
	}

	jupyterSettings := &jupyterclient.JupyterServiceSettings{
		BaseUrl: *settings.JupyterUrl,
		Token:   jupyterToken,
	}
	client := jupyterclient.MakeJupyterHttpClient(jupyterSettings)
	return &client, nil
}

// NewDatasource creates a new datasource instance.
func NewDatasource(ctx context.Context, instanceSettings backend.DataSourceInstanceSettings) (instancemgmt.Instance, error) {
	var settings InstanceSettings
	err := json.Unmarshal(instanceSettings.JSONData, &settings)
	if err != nil {
		return nil, err
	}

	httpClient, err := createHttpClient(&settings)
	if err != nil {
		return nil, err
	}

	ctx, cancel := context.WithCancel(context.Background())

	return &Datasource{
		sessions: make(map[string]*jupyterclient.JupyterSession),
		httpClient: httpClient,
		context: ctx,
		cancel: cancel,
	}, nil
}

// Dispose here tells plugin SDK that plugin wants to clean up resources when a new instance
// created. As soon as datasource settings change detected by SDK old datasource instance will
// be disposed and a new one will be created using NewSampleDatasource factory function.
func (d *Datasource) Dispose() {
	d.cancel()
}

func (d *Datasource) UpdateDatasourceFromQuery(req *backend.QueryDataRequest) error {
	// queries don't change datasource
	// @TODO this might be where to start kernels?
	return nil
}

// QueryData handles multiple queries and returns multiple responses.
// req contains the queries []DataQuery (where each query contains RefID as a unique identifier).
// The QueryDataResponse contains a map of RefID to the response for each query, and each response
// contains Frames ([]*Frame).
func (d *Datasource) QueryData(ctx context.Context, req *backend.QueryDataRequest) (*backend.QueryDataResponse, error) {
	// create response struct
	response := backend.NewQueryDataResponse()

	// loop over queries and execute them individually.
	for _, q := range req.Queries {
		res := d.query(ctx, req.PluginContext, q)

		// save the response in a hashmap
		// based on with RefID as identifier
		response.Responses[q.RefID] = res
	}

	return response, nil
}

type queryModel struct {
  KernelId *string `json:"kernelId"`
  KernelType string `json:"kernelType"`
  ConnectionInfo *string `json:"connectionInfo"`
  Notebook *string `json:"notebook"`
  Code string `json:"code"`
  Vars string `json:"vars"`
}

type WrappedLogger struct {
	logger log.Logger
}
func (wrapped WrappedLogger) Log(s string) {
	wrapped.logger.Debug(s)
}

func (d *Datasource) createSession(pctx context.Context, settings *InstanceSettings, qm *queryModel, logger log.Logger) (*jupyterclient.JupyterSession, error) {
	wrapped := WrappedLogger{logger: logger}
	if settings.ConnectionType == "AUTO" {
		logger.Debug("AUTO type")
		if qm.KernelId != nil {
			logger.Debug(fmt.Sprintf("given kernelid %v", qm.KernelId))
			// we have an assigned kernel id - connect to that.
			ci, err := d.httpClient.GetConnectionInfo(*qm.KernelId)
			if err != nil {
				return nil, err
			}

			session, err := jupyterclient.MakeJupyterSession(pctx, &ci, wrapped)
			return session, err
		} else {
			kt := qm.KernelType
			if kt == "" {
				kt = "python3"
			}
			logger.Debug(fmt.Sprintf("no kernelid %v, creating %v", qm.KernelId, qm.KernelType))
			// create a kernel of qm.KernelType
			ks, err := d.httpClient.CreateKernel(qm.KernelType)
			if err != nil {
				return nil, err
			}

			logger.Debug(fmt.Sprintf("kernel created, id %v", ks.Id))
			ci, err := d.httpClient.GetConnectionInfo(ks.Id)
			if err != nil {
				return nil, err
			}

			logger.Debug(fmt.Sprintf("ci gotten %v", ci))
			session, err := jupyterclient.MakeJupyterSession(pctx, &ci, wrapped)
			return session, err
		}
	} else {
		// we (should) have a connection file
		var ci jupyterclient.ConnectionInfo
		err := json.Unmarshal([]byte(*qm.ConnectionInfo), &ci)
		if err != nil {
			return nil, err
		}
		session, err := jupyterclient.MakeJupyterSession(pctx, &ci, wrapped)
		return session, err
	}
}

func sessionKey(settings *InstanceSettings, qm *queryModel) string {
	if settings.ConnectionType == "AUTO" {
		if qm.KernelId != nil {
			return *qm.KernelId
		} else if qm.Notebook != nil {
			return *qm.Notebook
		} else {
			return qm.Code
		}
	} else {
		return *qm.ConnectionInfo
	}
}

func (d *Datasource) query(pctx context.Context, pCtx backend.PluginContext, query backend.DataQuery) backend.DataResponse {
	logger := log.New()
	logger.Debug(fmt.Sprintf("grafana query: %+v\n", string(query.JSON)))

	var settings InstanceSettings
	err := json.Unmarshal(pCtx.DataSourceInstanceSettings.JSONData, &settings)
	if err != nil {
		return backend.ErrDataResponse(backend.StatusBadRequest, fmt.Sprintf("couldn't retrieve settings: %v", err.Error()))
	}

	var response backend.DataResponse

	// Unmarshal the JSON into our queryModel.
	var qm queryModel
	err = json.Unmarshal(query.JSON, &qm)
	if err != nil {
		return backend.ErrDataResponse(backend.StatusBadRequest, fmt.Sprintf("json unmarshal: %v", err.Error()))
	}

	logger.Debug(fmt.Sprintf("got query: %v", qm))

	// first, find/create the session
	var session *jupyterclient.JupyterSession = nil
	sessionKey := sessionKey(&settings, &qm)
	session = d.sessions[sessionKey]

	// @TODO handle notebooks
	code := qm.Code

	if session == nil {
		logger.Debug("session not found, creating")
		newSession, err := d.createSession(d.context, &settings, &qm, logger)
		if err != nil {
			return backend.ErrDataResponse(backend.StatusBadRequest, fmt.Sprintf("session creation failure: %v", err.Error()))
		}

		d.sessions[sessionKey] = newSession
		session = newSession

		logger.Debug("Initializing session")
		err = session.Initialize(code)
		if err != nil {
			return backend.ErrDataResponse(backend.StatusBadRequest, fmt.Sprintf("session creation failure: %v", err.Error()))
		}
		logger.Debug("Initialized")
	} else {
		logger.Debug("session found")
	}

	// got a session now
	logger.Debug(fmt.Sprintf("session: %v", session))
	queryText := fmt.Sprintf("%s\n%s", qm.Vars, code)
	result, err := session.Query(queryText)
	if err != nil {
		switch err.(type) {
		case jupyterclient.ErrorContent: {
			// @TODO if it's an ErrorContent, return it as {error:}
			return backend.ErrDataResponse(backend.StatusBadRequest, err.Error())
		}
		default: {
			// goroutines have been terminated - restart the session next query
			delete(d.sessions, sessionKey)
			return backend.ErrDataResponse(backend.StatusBadRequest, err.Error())
		}
		}
	}

	type row struct {
		Name string `json:"name"`
		Values []json.RawMessage `json:"values"`
	}
	var rows []row
	err = json.Unmarshal(*result, &rows)
	if err != nil {
		return backend.ErrDataResponse(backend.StatusBadRequest, fmt.Sprintf("result unmarshal: %v", err.Error()))
	}
	
	// create data frame response.
	// For an overview on data frames and how grafana handles them:
	// https://grafana.com/developers/plugin-tools/introduction/data-frames
	frame := data.NewFrame("response")
	for _, row := range rows {
		frame.Fields = append(frame.Fields, data.NewField(row.Name, nil, row.Values))
	}

	// add the frames to the response.
	response.Frames = append(response.Frames, frame)

	return response
}

// CheckHealth handles health checks sent from Grafana to the plugin.
// The main use case for these health checks is the test button on the
// datasource configuration page which allows users to verify that
// a datasource is working as expected.
func (d *Datasource) CheckHealth(_ context.Context, req *backend.CheckHealthRequest) (*backend.CheckHealthResult, error) {
	res := &backend.CheckHealthResult{}
	_, err := models.LoadPluginSettings(*req.PluginContext.DataSourceInstanceSettings)
	if err != nil {
		res.Status = backend.HealthStatusError
		res.Message = "Unable to load plugin settings"
		return res, nil
	}

	var settings InstanceSettings
	err = json.Unmarshal(req.PluginContext.DataSourceInstanceSettings.JSONData, &settings)
	if err != nil {
		res.Status = backend.HealthStatusError
		res.Message = fmt.Sprintf("Unable to parse settings: %v", err)
		return res, nil
	}

	httpClient, err := createHttpClient(&settings)
	if err != nil {
		res.Status = backend.HealthStatusError
		res.Message = fmt.Sprintf("Unable to create JupyterHttpClient: %v", err)
		return res, nil
	}

	if httpClient != nil {
		_, err = httpClient.GetKernels()
		if err != nil {
			res.Status = backend.HealthStatusError
			res.Message = fmt.Sprintf("Unable to browse kernels: %v", err)
			return res, nil
		}
	}

	return &backend.CheckHealthResult{
		Status:  backend.HealthStatusOk,
		Message: "Data source is working",
	}, nil
}
