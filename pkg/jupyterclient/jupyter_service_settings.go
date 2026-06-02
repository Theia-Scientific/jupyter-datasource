package jupyterclient

import (
	"fmt"
	"os"
)

type JupyterServiceSettings struct {
	BaseUrl string
	Token   string
}

type JupyterHttpClient struct {
	BasePath   string
	AuthHeader string
}

func DefaultJupyterServiceSettings() (*JupyterServiceSettings, error) {
	return &JupyterServiceSettings{
		BaseUrl: fmt.Sprintf("http://%s:%s", os.Getenv("JUPYTER_SERVICE_HOST"), os.Getenv("JUPYTER_SERVICE_PORT")),
		Token:   os.Getenv("JUPYTER_TOKEN"),
	}, nil
}
