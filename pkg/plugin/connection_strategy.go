package plugin

import (
	"fmt"

	"github.com/Theia-Scientific/jupyter-datasource/pkg/jupyterclient"
)

type ConnectionStrategy interface {
	createHttpClient(settings *InstanceSettings) (*jupyterclient.JupyterHttpClient, error)
	// createSession()
	// querySomething()
}

type ConnectionStrategyInfo struct {}

func (c ConnectionStrategyInfo) createHttpClient(settings *InstanceSettings) (*jupyterclient.JupyterHttpClient, error) {
	return nil, nil
}

type ConnectionStrategyAuto struct {}

func (c ConnectionStrategyAuto) createHttpClient(settings *InstanceSettings) (*jupyterclient.JupyterHttpClient, error) {
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
