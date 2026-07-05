package jupyterclient

type JupyterServiceSettings struct {
	BaseUrl string
	Token   string
}

type JupyterHttpClient struct {
	BasePath   string
	AuthHeader string
}
