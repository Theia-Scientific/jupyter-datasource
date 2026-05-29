package plugin

import (
	"context"
	"encoding/json"
	"fmt"

	"github.com/Theia-Scientific/jupyter-datasource/pkg/jupyterclient"
)

// uses internal types (queryModel); we can't mock this
//mockery:generate: false
type ConnectionStrategy interface {
	createHttpClient(settings *InstanceSettings) (jupyterclient.IJupyterHttpClient, error)
	createSession(d *Datasource, pctx context.Context, settings *InstanceSettings, qm *queryModel) (SessionState, error)
	fetchCode(d *Datasource, settings *InstanceSettings, qm *queryModel) (string, error)
}

type ConnectionStrategyInfo struct {}

func (_ ConnectionStrategyInfo) createHttpClient(settings *InstanceSettings) (jupyterclient.IJupyterHttpClient, error) {
	return nil, nil
}

func (_ ConnectionStrategyInfo) createSession(d *Datasource, pctx context.Context, settings *InstanceSettings, qm *queryModel) (SessionState, error) {
	wrapped := WrappedLogger{logger: d.logger}

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

func (_ ConnectionStrategyInfo) fetchCode(d *Datasource, settings *InstanceSettings, qm *queryModel) (string, error) {
	return qm.Code, nil
}

type ConnectionStrategyAuto struct {}

func (_ ConnectionStrategyAuto) createHttpClient(settings *InstanceSettings) (jupyterclient.IJupyterHttpClient, error) {
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
	return client, nil
}

func (_ ConnectionStrategyAuto) createSession(d *Datasource, pctx context.Context, settings *InstanceSettings, qm *queryModel) (SessionState, error) {
	wrapped := WrappedLogger{logger: d.logger}

	sessionFromKernelId := func(kernelId string) (SessionState, error) {
		ci, err := d.httpClient.GetConnectionInfo(kernelId)
		if err != nil {
			return SessionState{}, err
		}

		session, err := jupyterclient.MakeJupyterSession(pctx, &ci, wrapped)
		return SessionState{session: session, queryKernelId: qm.KernelId, actualKernelId: kernelId, kernelTag: qm.KernelTag}, err
	}

	if qm.KernelId != "" {
		d.logger.Debug(fmt.Sprintf("given kernelId %v", qm.KernelId))
		return sessionFromKernelId(qm.KernelId)
	}

	if kernelId := d.taggedKernels[qm.KernelTag]; kernelId != "" {
		d.logger.Debug(fmt.Sprintf("given kernelTag %v, found kernelId %v", qm.KernelTag, kernelId))
		return sessionFromKernelId(kernelId)
	}

	// either no kernel tag, or no kernel created yet for this tag, so: create one!
	kt := qm.KernelType
	if kt == "" {
		kt = "python3"
	}
	d.logger.Debug(fmt.Sprintf("creating kernel of type '%v'", kt))
	// create a kernel of qm.KernelType
	ks, err := d.httpClient.CreateKernel(kt)
	if err != nil {
		return SessionState{}, err
	}

	d.logger.Debug(fmt.Sprintf("kernel created, id %v", ks.Id))
	d.createdKernels = append(d.createdKernels, ks.Id)
	ci, err := d.httpClient.GetConnectionInfo(ks.Id)
	if err != nil {
		return SessionState{}, err
	}

	d.logger.Debug(fmt.Sprintf("got ConnectionInfo: %v", ci))
	session, err := jupyterclient.MakeJupyterSession(pctx, &ci, wrapped)

	// if we're creating a tagged kernel, record an entry for it
	if qm.KernelTag != "" {
		d.taggedKernels[qm.KernelTag] = ks.Id
	}

	return SessionState{session: session, queryKernelId: qm.KernelId, actualKernelId: ks.Id, kernelTag: qm.KernelTag}, err
}	

func (_ ConnectionStrategyAuto) fetchCode(d *Datasource, settings *InstanceSettings, qm *queryModel) (string, error) {
	if qm.Notebook != "" {
		return d.httpClient.GetNotebook(qm.Notebook)
	} else {
		return qm.Code, nil
	}
}

