package plugin

import (
	"context"
	"encoding/json"
	"fmt"
	"net/http"
	"slices"
	"strings"

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
	ImportStatements *string `json:"importStatements"`
	connectionStrategy ConnectionStrategy
}

func unmarshalInstanceSettings(src []byte) (*InstanceSettings, error) {
	var settings InstanceSettings
	err := json.Unmarshal(src, &settings)
	if err != nil {
		return nil, err
	}

	settings.connectionStrategy, err = makeConnectionStrategy(&settings)
	if err != nil {
		return nil, err
	}

	return &settings, nil
}

type SessionState struct {
	session *jupyterclient.JupyterSession
	queryKernelId string
	actualKernelId string
	code string
}

// Datasource is an example datasource which can respond to data queries, reports
// its health and has streaming skills.
type Datasource struct {
	sessions map[string]SessionState
	createdKernels []string
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
				Body: []byte(err.Error()),
			})
		} else {
			return sender.Send(&backend.CallResourceResponse{
				Status: http.StatusOK,
				Body:   jsonData,
			})
		}
	}
	case "kernels": {
		kernels, err := p.httpClient.GetKernels()
		if err != nil {
			return sender.Send(&backend.CallResourceResponse{
				Status: http.StatusInternalServerError,
				Body: []byte(err.Error()),
			})
		}

		sessions, err := p.httpClient.GetSessions()
		if err != nil {
			return sender.Send(&backend.CallResourceResponse{
				Status: http.StatusInternalServerError,
				Body: []byte(err.Error()),
			})
		}

		for i, k := range kernels {
			for _, s := range sessions {
				if s.Kernel.Id == k.Id {
					kernels[i].NotebookPath = &s.Path
					break
				}
			}
		}

		jsonData, err := json.Marshal(kernels)
		if err != nil {
			return sender.Send(&backend.CallResourceResponse{
				Status: http.StatusInternalServerError,
				Body: []byte(err.Error()),
			})
		}

		return sender.Send(&backend.CallResourceResponse{
			Status: http.StatusOK,
			Body:   jsonData,
		})
	}
	case "kernelspecs": {
		kernelspecs, err := p.httpClient.GetKernelSpecs()
		if err != nil {
			return sender.Send(&backend.CallResourceResponse{
				Status: http.StatusInternalServerError,
				Body: []byte(err.Error()),
			})
		} else {
			return sender.Send(&backend.CallResourceResponse{
				Status: http.StatusOK,
				Body:   kernelspecs,
			})
		}
	}
	default: {
		return sender.Send(&backend.CallResourceResponse{
			Status: http.StatusNotFound,
		})
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

func makeConnectionStrategy(settings *InstanceSettings) (ConnectionStrategy, error) {
	switch settings.ConnectionType {
	case "AUTO":
		return ConnectionStrategyAuto{}, nil
	case "INFO":
		return ConnectionStrategyInfo{}, nil
	default:
		return nil, fmt.Errorf("Unknown connection type '%s'", settings.ConnectionType)
	}
}

// NewDatasource creates a new datasource instance.
func NewDatasource(ctx context.Context, instanceSettings backend.DataSourceInstanceSettings) (instancemgmt.Instance, error) {
	settings, err := unmarshalInstanceSettings(instanceSettings.JSONData)
	if err != nil {
		return nil, err
	}

	httpClient, err := settings.connectionStrategy.createHttpClient(settings)
	if err != nil {
		return nil, err
	}

	ctx, cancel := context.WithCancel(context.Background())

	return &Datasource{
		sessions: make(map[string]SessionState),
		createdKernels: []string{},
		httpClient: httpClient,
		context: ctx,
		cancel: cancel,
	}, nil
}

// Dispose here tells plugin SDK that plugin wants to clean up resources when a new instance
// created. As soon as datasource settings change detected by SDK old datasource instance will
// be disposed and a new one will be created using NewSampleDatasource factory function.
func (d *Datasource) Dispose() {
	for _, sessionState := range d.sessions {
		killKernel := slices.Contains(d.createdKernels, sessionState.actualKernelId)
		sessionState.session.Quit()
		if killKernel {
			_  = d.httpClient.KillKernel(sessionState.actualKernelId)
		}
	}
	d.cancel()
}

func (d *Datasource) UpdateDatasourceFromQuery(req *backend.QueryDataRequest) error {
	// queries don't change datasource
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

type Var struct {
	Name string `json:"name"`
	Value string `json:"value"`
}

type queryModel struct {
	Uuid *string `json:"uuid"`
  KernelId string `json:"kernelId"`
  KernelType string `json:"kernelType"`
  ConnectionInfo *string `json:"connectionInfo"`
  Notebook string `json:"notebook"`
  Code string `json:"code"`
  Vars []Var `json:"vars"`
}

type WrappedLogger struct {
	logger log.Logger
}
func (wrapped WrappedLogger) Log(s string) {
	wrapped.logger.Debug(s)
}

func (d *Datasource) createSession(pctx context.Context, settings *InstanceSettings, qm *queryModel, logger log.Logger) (SessionState, error) {
	wrapped := WrappedLogger{logger: logger}
	if settings.ConnectionType == "AUTO" {
		logger.Debug("AUTO type")
		if qm.KernelId != "" {
			logger.Debug(fmt.Sprintf("given kernelid %v", qm.KernelId))
			// we have an assigned kernel id - connect to that.
			ci, err := d.httpClient.GetConnectionInfo(qm.KernelId)
			if err != nil {
				return SessionState{}, err
			}

			session, err := jupyterclient.MakeJupyterSession(pctx, &ci, wrapped)
			return SessionState{session: session, queryKernelId: qm.KernelId, actualKernelId: qm.KernelId}, err
		} else {
			kt := qm.KernelType
			if kt == "" {
				kt = "python3"
			}
			logger.Debug(fmt.Sprintf("creating kernel of type '%v'", kt))
			// create a kernel of qm.KernelType
			ks, err := d.httpClient.CreateKernel(kt)
			if err != nil {
				return SessionState{}, err
			}

			logger.Debug(fmt.Sprintf("kernel created, id %v", ks.Id))
			d.createdKernels = append(d.createdKernels, ks.Id)
			ci, err := d.httpClient.GetConnectionInfo(ks.Id)
			if err != nil {
				return SessionState{}, err
			}

			logger.Debug(fmt.Sprintf("ci gotten %v", ci))
			session, err := jupyterclient.MakeJupyterSession(pctx, &ci, wrapped)
			return SessionState{session: session, queryKernelId: qm.KernelId, actualKernelId: ks.Id}, err
		}
	} else {
		// we (should) have a connection file
		var ci jupyterclient.ConnectionInfo
		err := json.Unmarshal([]byte(*qm.ConnectionInfo), &ci)
		if err != nil {
			return SessionState{}, err
		}
		session, err := jupyterclient.MakeJupyterSession(pctx, &ci, wrapped)
		// there's no way to know the ID of a kernel that we connect to
		// via connectionfile.  this seems like a problem.
		return SessionState{session: session}, err
	}
}

func (d *Datasource) query(pctx context.Context, pCtx backend.PluginContext, query backend.DataQuery) backend.DataResponse {
	logger := log.New()
	logger.Debug(fmt.Sprintf("grafana query: %+v\n", string(query.JSON)))

	settings, err := unmarshalInstanceSettings(pCtx.DataSourceInstanceSettings.JSONData)
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
	if (qm.Uuid == nil) {
		return backend.ErrDataResponse(backend.StatusBadRequest, fmt.Sprintf("query missing uuid"))
	}
	sessionState, foundSession := d.sessions[*qm.Uuid]

	code := qm.Code
	if settings.ConnectionType == "AUTO" && qm.Notebook != "" {
		code, err = d.httpClient.GetNotebook(qm.Notebook)
		if err != nil {
			return backend.ErrDataResponse(backend.StatusBadRequest, fmt.Sprintf("err fetching notebook %s: %v", qm.Notebook, err.Error()))
		}
	}

	logger.Debug(fmt.Sprintf("query uuid: %v", *qm.Uuid))
	logger.Debug(fmt.Sprintf("foundSession=%v, qm.KernelId=%v, sessionState.queryKernelId=%v, sessionState.actualKernelId=%v",
		foundSession, qm.KernelId, sessionState.queryKernelId, sessionState.actualKernelId))
	if !foundSession {
		logger.Debug("session not found, creating")
		sessionState, err = d.createSession(d.context, settings, &qm, logger)
		if err != nil {
			return backend.ErrDataResponse(backend.StatusBadRequest, fmt.Sprintf("session creation failure: %v", err.Error()))
		}

		d.sessions[*qm.Uuid] = sessionState
	} else if (qm.KernelId != sessionState.queryKernelId) {
		// if the kernel in the query differs from the session kernel, reconnect
		logger.Debug("session kernel updated, reinitializing")
		oldKernel := sessionState.actualKernelId
		// if it was an owned kernel, and this was the last use, kill it
		killKernel := false
		if slices.Contains(d.createdKernels, oldKernel) {
			logger.Debug(fmt.Sprintf("kernel %v was created, checking if it should die", oldKernel))
			uses := 0
			for _, sessionState := range d.sessions {
				if sessionState.actualKernelId == oldKernel {
					uses += 1
				}
			}
			killKernel = (uses == 1)
			logger.Debug(fmt.Sprintf("uses=%v, killKernel=%v", uses, killKernel))
		} else {
			logger.Debug(fmt.Sprintf("kernel %v was NOT created, not killing", oldKernel))
		}
		sessionState.session.Quit()
		if killKernel {
			err  = d.httpClient.KillKernel(sessionState.actualKernelId)
			if err != nil {
				delete(d.sessions, *qm.Uuid)
				return backend.ErrDataResponse(backend.StatusBadRequest, fmt.Sprintf("session cleanup failure: %v", err.Error()))
			}
		}
		// update the kernelId and reconnecct
		sessionState, err = d.createSession(d.context, settings, &qm, logger)

		if err != nil {
			delete(d.sessions, *qm.Uuid)
			return backend.ErrDataResponse(backend.StatusBadRequest, fmt.Sprintf("session creation failure: %v", err.Error()))
		}

		d.sessions[*qm.Uuid] = sessionState
  } else {
		logger.Debug("session found")
	}

	if code != sessionState.code {
		logger.Debug(fmt.Sprintf("session code differs (%s vs %s), initializing", sessionState.code, code))
		err = sessionState.session.Initialize(code)
		if err != nil {
			delete(d.sessions, *qm.Uuid)
			return backend.ErrDataResponse(backend.StatusBadRequest, fmt.Sprintf("session creation failure: %v", err.Error()))
		}

		logger.Debug("Initialized")
		if settings.ImportStatements != nil {
			sessionState.session.Execute(*settings.ImportStatements)
		}
		sessionState.code = code
		d.sessions[*qm.Uuid] = sessionState
	}

	// got a session now
	var qb strings.Builder
	for _, v := range qm.Vars {
		qb.WriteString(v.Name)
		qb.WriteString(" = ")
		qb.WriteString(v.Value)
		qb.WriteString("\n")
	}
	qb.WriteString(code)
	queryText := qb.String()
	result, err := sessionState.session.Query(queryText)
	if err != nil {
		switch err.(type) {
		case jupyterclient.ErrorContent: {
			// @TODO if it's an ErrorContent, return it as {error:}
			return backend.ErrDataResponse(backend.StatusBadRequest, err.Error())
		}
		default: {
			// goroutines have been terminated - restart the session next query
			// @TODO may be too late to clean up here
			delete(d.sessions, *qm.Uuid)
			return backend.ErrDataResponse(backend.StatusBadRequest, err.Error())
		}
		}
	}

	if result.Val == nil {
		return backend.ErrDataResponse(backend.StatusBadRequest, "No result returned from query")
	}

	type pyfield struct {
		Name string `json:"name"`
		Values []json.RawMessage `json:"values"`
	}
	type pyframe struct {
		Name string `json:"name"`
		Data []pyfield `json:"data"`
	}

	// expect an array of frames
	var pyFrames []pyframe
	err = json.Unmarshal(*result.Val, &pyFrames)
	if err != nil {
		// but allow for a single frame?
		var pyFrame pyframe
		err = json.Unmarshal(*result.Val, &pyFrame)
		if err != nil {
			return backend.ErrDataResponse(backend.StatusBadRequest, fmt.Sprintf("result unmarshal: %v", err.Error()))
		}
		pyFrames = []pyframe{pyFrame}
	}

	for _, pyFrame := range pyFrames {
		frame := data.NewFrame(pyFrame.Name)
		if frame.Meta == nil {
			frame.Meta = &data.FrameMeta{}
		}
		frame.Meta.Custom = map[string]string{
			"stdout": result.Stdout,
			"stderr": result.Stderr,
		}
		for _, pyField := range pyFrame.Data {
			frame.Fields = append(frame.Fields, data.NewField(pyField.Name, nil, pyField.Values))
		}
		response.Frames = append(response.Frames, frame)
	}

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

	settings, err := unmarshalInstanceSettings(req.PluginContext.DataSourceInstanceSettings.JSONData)
	if err != nil {
		res.Status = backend.HealthStatusError
		res.Message = fmt.Sprintf("Unable to parse settings: %v", err)
		return res, nil
	}

	httpClient, err := settings.connectionStrategy.createHttpClient(settings)
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
