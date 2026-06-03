package plugin

import (
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"net/http"
	"net/url"
	"slices"
	"strings"

	"github.com/Theia-Scientific/jupyter-datasource/pkg/jupyterclient"
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
	ConnectionType     string    `json:"connectionType"`
	AuthType           string    `json:"authType"`
	FetchRoute         *string   `json:"fetchRoute"`
	FetchMethod        *string   `json:"fetchMethod"`
	FetchToken         *string   `json:"fetchToken"`
	RawToken           *string   `json:"rawToken"`
	JupyterUrl         *string   `json:"jupyterUrl"`
	Prelude            *string   `json:"prelude"`
	Packages           *[]string `json:"packages"`
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
	session        jupyterclient.IJupyterSession
	queryKernelId  string
	actualKernelId string
	kernelTag      string
	code           string
}

//mockery:generate: true
type IJupyterSessionFactory interface {
	MakeJupyterSession(ctx context.Context, ci *jupyterclient.ConnectionInfo, logger jupyterclient.Logger) (jupyterclient.IJupyterSession, error)
}

type JupyterSessionFactory struct{}

func (_ JupyterSessionFactory) MakeJupyterSession(ctx context.Context, ci *jupyterclient.ConnectionInfo, logger jupyterclient.Logger) (jupyterclient.IJupyterSession, error) {
	return jupyterclient.MakeJupyterSession(ctx, ci, logger)
}

// Datasource is an example datasource which can respond to data queries, reports
// its health and has streaming skills.
type Datasource struct {
	settings       *InstanceSettings
	logger         log.Logger
	sessions       map[string]SessionState
	sessionFactory IJupyterSessionFactory
	createdKernels []string
	taggedKernels  map[string]string
	httpClient     jupyterclient.IJupyterHttpClient
	context        context.Context
	cancel         context.CancelFunc
}

var err404 = errors.New("Not found")
var errMissingPath = errors.New("missing 'path' argument on request")

func (p *Datasource) CallResource(ctx context.Context, req *backend.CallResourceRequest, sender backend.CallResourceResponseSender) error {
	response, err := p.callResource(req)
	if err == err404 {
		return sender.Send(&backend.CallResourceResponse{
			Status: http.StatusNotFound,
		})
	}

	if err != nil {
		return sender.Send(&backend.CallResourceResponse{
			Status: http.StatusInternalServerError,
			Body:   []byte(err.Error()),
		})
	}

	return sender.Send(&backend.CallResourceResponse{
		Status: http.StatusOK,
		Body:   response,
	})
}

func (p *Datasource) callResource(req *backend.CallResourceRequest) ([]byte, error) {
	p.logger.Debug(fmt.Sprintf("got a resource request for %+v", req.Path))
	switch req.Path {
	case "list":
		{
			u, err := url.Parse(req.URL)
			if err != nil {
				return nil, err
			}

			m, err := url.ParseQuery(u.RawQuery)
			if err != nil {
				return nil, err
			}

			pathArgs := m["path"]
			if len(pathArgs) == 0 {
				return nil, errMissingPath
			}

			path := strings.TrimLeft(pathArgs[len(pathArgs)-1], "/")
			entries, err := p.httpClient.GetListing(path)
			if err != nil {
				return nil, err
			}

			return json.Marshal(entries)
		}
	case "notebooks":
		{
			notebooks, err := p.httpClient.GetNotebooks()
			if err != nil {
				return nil, err
			}

			return json.Marshal(notebooks)
		}
	case "kernels":
		{
			kernels, err := p.httpClient.GetKernels()
			if err != nil {
				return nil, err
			}

			sessions, err := p.httpClient.GetSessions()
			if err != nil {
				return nil, err
			}

			for i, k := range kernels {
				for _, s := range sessions {
					if s.Kernel.Id == k.Id {
						kernels[i].NotebookPath = &s.Path
						break
					}
				}
			}

			return json.Marshal(kernels)
		}
	case "kernelspecs":
		{
			return p.httpClient.GetKernelSpecs()
		}
	default:
		{
		}
	}

	return nil, err404
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
			Token:   settings.FetchToken,
		}
		return jupyterclient.GetJupyterToken(&systemSettings)
	} else {
		return "", fmt.Errorf("Unknown auth type '%s'", settings.AuthType)
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
		settings:       settings,
		logger:         log.New(),
		sessions:       make(map[string]SessionState),
		sessionFactory: JupyterSessionFactory{},
		createdKernels: []string{},
		taggedKernels:  make(map[string]string),
		httpClient:     httpClient,
		context:        ctx,
		cancel:         cancel,
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
			_ = d.httpClient.KillKernel(sessionState.actualKernelId)
		}
	}
	d.cancel()
}

func (d *Datasource) UpdateDatasourceFromQuery(req *backend.QueryDataRequest) error {
	d.logger.Debug("updating instance settings")

	settings, err := unmarshalInstanceSettings(req.PluginContext.DataSourceInstanceSettings.JSONData)
	if err != nil {
		return err
	}

	d.settings = settings
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
		response.Responses[q.RefID] = d.query(ctx, q)
	}

	return response, nil
}

type Var struct {
	Name  string `json:"name"`
	Value string `json:"value"`
}

type queryModel struct {
	Uuid           *string `json:"uuid"`
	KernelId       string  `json:"kernelId"`
	KernelTag      string  `json:"kernelTag"`
	KernelType     string  `json:"kernelType"`
	ConnectionInfo *string `json:"connectionInfo"`
	Notebook       string  `json:"notebook"`
	Code           string  `json:"code"`
	Vars           []Var   `json:"vars"`
}

type WrappedLogger struct {
	logger log.Logger
}

func (wrapped WrappedLogger) Log(s string) {
	wrapped.logger.Debug(s)
}

func (d *Datasource) createSession(pctx context.Context, settings *InstanceSettings, qm *queryModel) (SessionState, error) {
	return settings.connectionStrategy.createSession(
		d, pctx, settings, qm)
}

func (d *Datasource) kernelIdRefCount(kernelId string) int {
	uses := 0
	for _, sessionState := range d.sessions {
		if sessionState.actualKernelId == kernelId {
			uses += 1
		}
	}
	return uses
}

func (d *Datasource) findOrCreateSession(settings *InstanceSettings, qm *queryModel) (SessionState, bool, error) {
	var err error
	created := false
	sessionState, foundSession := d.sessions[*qm.Uuid]

	d.logger.Debug(fmt.Sprintf("query uuid: %v", *qm.Uuid))
	d.logger.Debug(fmt.Sprintf("foundSession=%v, qm.KernelId=%v, sessionState.queryKernelId=%v, sessionState.actualKernelId=%v",
		foundSession, qm.KernelId, sessionState.queryKernelId, sessionState.actualKernelId))
	if !foundSession {
		d.logger.Debug("session not found, creating")
		sessionState, err = d.createSession(d.context, settings, qm)
		d.logger.Debug(fmt.Sprintf("d.CreateSession: %+v, %+v", sessionState, err))
		if err != nil {
			return SessionState{}, created, errors.New(fmt.Sprintf("session creation failure: %v", err.Error()))
		}

		created = true
		d.sessions[*qm.Uuid] = sessionState
	} else if qm.KernelId != sessionState.queryKernelId || qm.KernelTag != sessionState.kernelTag {
		// if the kernel in the query differs from the session kernel,
		// OR the tag in the query differs from the session tag, reconnect
		d.logger.Debug("session kernel updated, reinitializing")
		oldKernel := sessionState.actualKernelId
		// if it was an owned kernel, and this was the last use, kill it
		killKernel := false
		if slices.Contains(d.createdKernels, oldKernel) {
			d.logger.Debug(fmt.Sprintf("checking if kernel %v should die", oldKernel))
			uses := d.kernelIdRefCount(oldKernel)
			if qm.KernelId == oldKernel {
				// we're switching from 'new kernel' to this very kernel. this
				// counts as a use.  don't kill it.
				uses += 1
			}

			killKernel = (uses == 1)
			d.logger.Debug(fmt.Sprintf("uses=%v, killKernel=%v", uses, killKernel))
		} else {
			d.logger.Debug(fmt.Sprintf("kernel %v was NOT created, not killing", oldKernel))
		}
		sessionState.session.Quit()
		if killKernel {
			// if this was a tagged kernel, remove the tag
			if sessionState.kernelTag != "" {
				delete(d.taggedKernels, sessionState.kernelTag)
			}
			err := d.httpClient.KillKernel(sessionState.actualKernelId)
			if err != nil {
				delete(d.sessions, *qm.Uuid)
				return SessionState{}, created, errors.New(fmt.Sprintf("session cleanup failure: %v", err.Error()))
			}
		}
		// update the kernelId and reconnect
		sessionState, err = d.createSession(d.context, settings, qm)
		d.logger.Debug(fmt.Sprintf("d.CreateSession: %+v, %+v", sessionState, err))

		if err != nil {
			delete(d.sessions, *qm.Uuid)
			return SessionState{}, created, errors.New(fmt.Sprintf("session creation failure: %v", err.Error()))
		}

		created = true
		d.sessions[*qm.Uuid] = sessionState
	} else {
		d.logger.Debug("session found")
	}

	return sessionState, created, nil
}

func (d *Datasource) query(pctx context.Context, query backend.DataQuery) backend.DataResponse {
	d.logger.Debug(fmt.Sprintf("grafana query: %+v\n", string(query.JSON)))

	var response backend.DataResponse

	// Unmarshal the JSON into our queryModel.
	var qm queryModel
	err := json.Unmarshal(query.JSON, &qm)
	if err != nil {
		return backend.ErrDataResponse(backend.StatusBadRequest, fmt.Sprintf("json unmarshal: %v", err.Error()))
	}

	d.logger.Debug(fmt.Sprintf("got query: %v", qm))

	// first, find/create the session
	if qm.Uuid == nil {
		return backend.ErrDataResponse(backend.StatusBadRequest, fmt.Sprintf("query missing uuid"))
	}

	sessionState, newSession, err := d.findOrCreateSession(d.settings, &qm)
	d.logger.Debug(fmt.Sprintf("d.findOrCreateSession: %+v, %+v", sessionState, err))
	if err != nil {
		return backend.ErrDataResponse(backend.StatusBadRequest, err.Error())
	}

	code, err := d.settings.connectionStrategy.fetchCode(d, d.settings, &qm)
	if err != nil {
		return backend.ErrDataResponse(backend.StatusBadRequest, fmt.Sprintf("err fetching notebook %s: %v", qm.Notebook, err.Error()))
	}

	if code != sessionState.code || newSession {
		d.logger.Debug(fmt.Sprintf("session code differs (%s vs %s), initializing", sessionState.code, code))
		d.logger.Debug(fmt.Sprintf("d.settings: %+v", d.settings))
		d.logger.Debug(fmt.Sprintf("sessionState: %+v", sessionState))
		err = sessionState.session.Initialize(d.settings.Packages, code)
		if err != nil {
			delete(d.sessions, *qm.Uuid)
			return backend.ErrDataResponse(backend.StatusBadRequest, fmt.Sprintf("session creation failure: %v", err.Error()))
		}

		d.logger.Debug("Initialized")
		if d.settings.Prelude != nil {
			d.logger.Debug(fmt.Sprintf("Executing prelude: %s", *d.settings.Prelude))
			res, err := sessionState.session.Execute(*d.settings.Prelude)
			d.logger.Debug(fmt.Sprintf("prelude executed: res=%+v, err=%+v", res, err))
			if err != nil {
				return backend.ErrDataResponse(backend.StatusBadRequest, err.Error())
			}
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
		case jupyterclient.ErrorContent:
			{
				// @TODO if it's an ErrorContent, return it as {error:}
				return backend.ErrDataResponse(backend.StatusBadRequest, err.Error())
			}
		default:
			{
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
		Name   string            `json:"name"`
		Values []json.RawMessage `json:"values"`
	}
	type pyframe struct {
		Name string    `json:"name"`
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
func (d *Datasource) CheckHealth(pctx context.Context, req *backend.CheckHealthRequest) (res *backend.CheckHealthResult, resErr error) {
	res = &backend.CheckHealthResult{Status: backend.HealthStatusError}
	resErr = nil

	settings, err := unmarshalInstanceSettings(req.PluginContext.DataSourceInstanceSettings.JSONData)
	if err != nil {
		res.Message = fmt.Sprintf("Unable to parse settings: %v", err)
		return
	}

	httpClient, err := settings.connectionStrategy.createHttpClient(settings)
	if err != nil {
		res.Message = fmt.Sprintf("Unable to create JupyterHttpClient: %v", err)
		return
	}

	if httpClient != nil {
		_, err = httpClient.GetKernels()
		if err != nil {
			res.Message = fmt.Sprintf("Unable to browse kernels: %v", err)
			return
		}

		if (settings.Packages != nil && len(*settings.Packages) > 0) ||
			(settings.Prelude != nil && *settings.Prelude != "") {
			ks, err := httpClient.CreateKernel("python3")
			if err != nil {
				res.Message = fmt.Sprintf("Unable to create a kernel: %v", err)
				return
			}
			defer func() {
				err = httpClient.KillKernel(ks.Id)
				if err != nil {
					res.Message = fmt.Sprintf("Unable to kill test kernel: %v", err)
				}
			}()

			ci, err := d.httpClient.GetConnectionInfo(ks.Id)
			if err != nil {
				res.Message = fmt.Sprintf("Unable to get ConnectionInfo: %v", err)
				return
			}

			wrapped := WrappedLogger{logger: d.logger}
			session, err := d.sessionFactory.MakeJupyterSession(pctx, &ci, wrapped)
			if err != nil {
				res.Message = fmt.Sprintf("Unable to create session: %v", err)
				return
			}
			defer session.Quit()

			code := ""
			if settings.Prelude != nil {
				code = *settings.Prelude
			}
			err = session.Initialize(settings.Packages, code)
			if err != nil {
				res.Message = fmt.Sprintf("Unable to initialize session: %v", err)
				return
			}

			_, err = session.Execute(code)
			if err != nil {
				res.Message = fmt.Sprintf("Unable to execute prelude: %v", err)
				return
			}
		}
	}

	return &backend.CheckHealthResult{
		Status:  backend.HealthStatusOk,
		Message: "Data source is working",
	}, nil
}
