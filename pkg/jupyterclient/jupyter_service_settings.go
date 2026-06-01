package jupyterclient

import (
	"fmt"
	"io"
	"net/http"
	"os"
)

type SystemServiceSettings struct {
	BaseUrl string
	Method  string
	Token   *string
}

func DefaultSystemServiceSettings() *SystemServiceSettings {
	return &SystemServiceSettings{
		BaseUrl: fmt.Sprintf("http://%s:%s/tokens/jupyter", os.Getenv("SYSTEM_SERVICE_HOST"), os.Getenv("SYSTEM_SERVICE_PORT")),
		Method:  "PUT",
	}
}

type JupyterServiceSettings struct {
	BaseUrl string
	Token   string
}

type JupyterHttpClient struct {
	BasePath   string
	AuthHeader string
}

func GetJupyterToken(systemServiceSettings *SystemServiceSettings) (string, error) {
	req, err := http.NewRequest(systemServiceSettings.Method, systemServiceSettings.BaseUrl, http.NoBody)
	if err != nil {
		return "", err
	}
	if systemServiceSettings.Token != nil {
		req.Header.Add("Authorization", fmt.Sprintf("Bearer %s", *systemServiceSettings.Token))
	}
	res, err := http.DefaultClient.Do(req)
	if err != nil {
		return "", err
	}
	defer res.Body.Close()
	body, err := io.ReadAll(res.Body)
	if err != nil {
		return "", err
	}
	return string(body), nil
}

func DefaultJupyterServiceSettings(systemServiceSettings *SystemServiceSettings) (*JupyterServiceSettings, error) {
	tok, ok := os.LookupEnv("jupyter_token")
	if !ok {
		var err error
		tok, err = GetJupyterToken(systemServiceSettings)
		if err != nil {
			return nil, err
		}
	}
	return &JupyterServiceSettings{
		BaseUrl: fmt.Sprintf("http://%s:%s", os.Getenv("JUPYTER_SERVICE_HOST"), os.Getenv("JUPYTER_SERVICE_PORT")),
		Token:   tok,
	}, nil
}
