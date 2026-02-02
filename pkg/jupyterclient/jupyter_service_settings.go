package jupyterclient

import (
	"fmt"
	"io"
  "net/http"
	"os"
)

type SystemServiceSettings struct {
	BaseUrl string
}

func DefaultSystemServiceSettings() *SystemServiceSettings {
	return &SystemServiceSettings{
		BaseUrl: fmt.Sprintf("http://%s:%s", os.Getenv("SYSTEM_SERVICE_HOST"), os.Getenv("SYSTEM_SERVICE_PORT")),
	}
}

type JupyterServiceSettings struct {
	BaseUrl string
	Token string
}

type JupyterHttpClient struct {
  BasePath string
  AuthHeader string
}

func GetJupyterToken(systemServiceSettings *SystemServiceSettings) (string, error) {
  url := fmt.Sprintf("%s/tokens/jupyter", systemServiceSettings.BaseUrl)
  req, err := http.NewRequest(http.MethodPut, url, http.NoBody)
  if err != nil {
    return "", err
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
		Token: tok,
	}, nil
}

