package jupyterclient

import (
	"net/http"
)

type JupyterServiceSettings struct {
	BaseUrl string
	Token   string
}

type JupyterHttpClient struct {
	BasePath   string
	AuthHeader string
	Client     *http.Client
}
