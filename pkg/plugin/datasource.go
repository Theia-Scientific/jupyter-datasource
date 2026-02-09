package plugin

import (
	"context"
	"encoding/json"
	"fmt"
	"time"

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
	_ backend.QueryDataHandler      = (*Datasource)(nil)
	_ backend.CheckHealthHandler    = (*Datasource)(nil)
	_ instancemgmt.InstanceDisposer = (*Datasource)(nil)
)

type InstanceSettings struct {
	AuthType         string  `json:"authType"`
	RawToken         *string `json:"rawToken"`
	FetchRoute       *string `json:"fetchRoute"`
	FetchMethod      *string `json:"fetchMethod"`
	ConnectionType   string  `json:"connectionType"`
	ConnectionInfo   *string `json:"connectionInfo"`
	JupyterUrl       *string `json:"jupyterUrl"`
	ExistingKernelId *string `json:"existingKernelId"`
	NewKernelType    *string `json:"newKernelType"`
}

func MakeDatasource(ci *jupyterclient.ConnectionInfo) (*Datasource, error) {
	session, err := jupyterclient.MakeJupyterSession(ci)
	if err != nil {
		return nil, err
	}
	return &Datasource{session: session}, nil
}

// NewDatasource creates a new datasource instance.
func NewDatasource(_ context.Context, instanceSettings backend.DataSourceInstanceSettings) (instancemgmt.Instance, error) {
	var settings InstanceSettings
	err := json.Unmarshal(instanceSettings.JSONData, &settings)
	if err != nil {
		return nil, err
	}

	var jupyterToken string
	if settings.AuthType == "NONE" {
		jupyterToken = ""
	} else if settings.AuthType == "RAW" {
		if settings.RawToken == nil {
			return nil, fmt.Errorf("Raw token auth selected, but no rawToken supplied")
		}
		jupyterToken = *settings.RawToken
	} else if settings.AuthType == "FETCH" {
		if settings.FetchRoute == nil {
			return nil, fmt.Errorf("Fetch auth selected, but no fetchRoute supplied")
		}
		if settings.FetchMethod == nil {
			return nil, fmt.Errorf("Fetch auth selected, but no fetchMethod supplied")
		}
		systemSettings := jupyterclient.SystemServiceSettings{
			BaseUrl: *settings.FetchRoute,
			Method:  *settings.FetchMethod,
		}
		jupyterToken, err = jupyterclient.GetJupyterToken(&systemSettings)
		if err != nil {
			return nil, err
		}
	} else {
		return nil, fmt.Errorf("Unknown auth type '%s'", settings.AuthType)
	}

	// @TODO if we fail to connect return an error here
	if settings.ConnectionType == "INFO" {
		if settings.ConnectionInfo == nil {
			return nil, fmt.Errorf("Info connection type selected, but no connectionInfo supplied")
		}
		var ci jupyterclient.ConnectionInfo
		err = json.Unmarshal([]byte(*settings.ConnectionInfo), &ci)
		if err != nil {
			return nil, err
		}
		return MakeDatasource(&ci)
	} else {
		if settings.JupyterUrl == nil {
			return nil, fmt.Errorf("Existing or New Kernel connection type selected, but no jupyterUrl supplied")
		}
		jupyterSettings := &jupyterclient.JupyterServiceSettings{
			BaseUrl: *settings.JupyterUrl,
			Token:   jupyterToken,
		}
		httpClient := jupyterclient.MakeJupyterHttpClient(jupyterSettings)

		if settings.ConnectionType == "EXISTING" {
			if settings.ExistingKernelId == nil {
				return nil, fmt.Errorf("Existing Kernel connection type selected, but no existingKernelId supplied")
			}
			ci, err := httpClient.GetConnectionInfo(*settings.ExistingKernelId)
			if err != nil {
				return nil, err
			}
			return MakeDatasource(&ci)
		} else if settings.ConnectionType == "NEW" {
			if settings.NewKernelType == nil {
				return nil, fmt.Errorf("New Kernel connection type selected, but no newKernelType supplied")
			}
			kernel, err := httpClient.CreateKernel(*settings.NewKernelType)
			if err != nil {
				return nil, err
			}
			ci, err := httpClient.GetConnectionInfo(kernel.Id)
			if err != nil {
				return nil, err
			}
			return MakeDatasource(&ci)
		}
	}

	return nil, fmt.Errorf("Unknown connection type '%s'", settings.ConnectionType)
}

// Datasource is an example datasource which can respond to data queries, reports
// its health and has streaming skills.
type Datasource struct {
	session *jupyterclient.JupyterSession
}

// Dispose here tells plugin SDK that plugin wants to clean up resources when a new instance
// created. As soon as datasource settings change detected by SDK old datasource instance will
// be disposed and a new one will be created using NewSampleDatasource factory function.
func (d *Datasource) Dispose() {
	d.session.Quit()
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

type queryModel struct {
	Code string `json:"code"`
}

func (d *Datasource) query(_ context.Context, pCtx backend.PluginContext, query backend.DataQuery) backend.DataResponse {
	logger := log.New()
	logger.Error(fmt.Sprintf("grafana query: %+v\n", string(query.JSON)))

	var response backend.DataResponse

	// Unmarshal the JSON into our queryModel.
	var qm queryModel
	err := json.Unmarshal(query.JSON, &qm)
	if err != nil {
		return backend.ErrDataResponse(backend.StatusBadRequest, fmt.Sprintf("json unmarshal: %v", err.Error()))
	}

	result := d.session.Query(qm.Code)
	logger.Error(fmt.Sprintf("jupyter query: '%s' -> '%s'\n", qm.Code, result))

	var values []float64
	err = json.Unmarshal([]byte(result), &values)
	if err != nil {
		return backend.ErrDataResponse(backend.StatusBadRequest, fmt.Sprintf("result unmarshal: %v", err.Error()))
	}
	logger.Error(fmt.Sprintf("unmarshaled: '%s' -> %+v\n", result, values))

	// create data frame response.
	// For an overview on data frames and how grafana handles them:
	// https://grafana.com/developers/plugin-tools/introduction/data-frames
	frame := data.NewFrame("response")

	// add fields.
	frame.Fields = append(frame.Fields,
		data.NewField("time", nil, []time.Time{query.TimeRange.From, query.TimeRange.To}),
		data.NewField("value", nil, values),
	)

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
		res.Message = "Unable to load settings"
		return res, nil
	}

	return &backend.CheckHealthResult{
		Status:  backend.HealthStatusOk,
		Message: "Data source is working",
	}, nil
}
