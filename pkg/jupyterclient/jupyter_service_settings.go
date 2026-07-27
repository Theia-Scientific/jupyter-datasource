package jupyterclient

import (
	"net/http"
)

type JupyterServiceSettings struct {
	BaseUrl            string
	Token              string
	InsecureSkipVerify bool
}

type JupyterHttpClient struct {
	BasePath   string
	AuthHeader string
	Client     *http.Client
}
