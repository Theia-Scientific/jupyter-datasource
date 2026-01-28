package jupyterclient

import (
	"fmt"
	"io"
	"log"
  "net/http"
	"os"
)

type JupyterServiceSettings struct {
	Host string
	Port string
	Token string
}

type JupyterHttpClient struct {
  BasePath string
  AuthHeader string
}

func GetJupyterToken(systemServiceSettings *SystemServiceSettings) string {
  url := fmt.Sprintf("http://%s:%s/tokens/jupyter", systemServiceSettings.Host, systemServiceSettings.Port)
  fmt.Printf("getting jupyter token... ");
  req, err := http.NewRequest(http.MethodPut, url, http.NoBody)
  if err != nil {
    log.Fatal(err)
  }
  res, err := http.DefaultClient.Do(req)
  if err != nil {
    log.Fatal(err)
  }
  defer res.Body.Close()
  body, err := io.ReadAll(res.Body)
  if err != nil {
    log.Fatal(err)
  }
  fmt.Printf("%s\n", string(body));
  return string(body)
}

func DefaultJupyterServiceSettings(systemServiceSettings *SystemServiceSettings) JupyterServiceSettings {
	return JupyterServiceSettings{
		Host: os.Getenv("JUPYTER_SERVICE_HOST"),
		Port: os.Getenv("JUPYTER_SERVICE_PORT"),
		Token: GetJupyterToken(systemServiceSettings),
	}
}

