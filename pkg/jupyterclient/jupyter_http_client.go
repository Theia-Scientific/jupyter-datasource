package jupyterclient

import (
	"bytes"
  "encoding/json"
  "fmt"
  "io"
  "net/http"
	"strings"
)

func MakeJupyterHttpClient(settings *JupyterServiceSettings) JupyterHttpClient {
  return JupyterHttpClient{
    AuthHeader: fmt.Sprintf("Bearer %s", settings.Token),
		BasePath: settings.BaseUrl,
	}
}

func (jc *JupyterHttpClient) NewRequest(method, path string, body io.Reader) (*http.Request, error) {
  req, err := http.NewRequest(method, fmt.Sprintf("%s/%s", jc.BasePath, path), body)
  if err != nil {
    return nil, err
  }
  req.Header.Add("Authorization", jc.AuthHeader)
  return req, nil
}

func (jc *JupyterHttpClient) Get(path string) (*http.Request, error) {
  return jc.NewRequest(http.MethodGet, path, http.NoBody)
}

func (jc *JupyterHttpClient) Post(path string, body string) (*http.Request, error) {
  return jc.NewRequest(http.MethodPost, path, strings.NewReader(body))
}

func (jc *JupyterHttpClient) PostBytes(path string, body []byte) (*http.Request, error) {
  return jc.NewRequest(http.MethodPost, path, bytes.NewReader(body))
}

func (jc *JupyterHttpClient) GetKernels() ([]KernelSpec, error) {
  var kernels []KernelSpec

  req, err := jc.Get("jupyter/api/kernels")
  if err != nil {
    return kernels, err
  }
  res, err := http.DefaultClient.Do(req)
  if err != nil {
    return kernels, err
  }
  defer res.Body.Close()
  body, err := io.ReadAll(res.Body)
  if err != nil {
    return kernels, err
  }
  err = json.Unmarshal(body, &kernels)
  return kernels, err
}

func (jc *JupyterHttpClient) CreateKernel(kernelType string) (KernelSpec, error) {
  var kernel KernelSpec

	type CreateKernelRequest struct {
		Name string `json:"name"`
	}
	ckr := CreateKernelRequest{Name:kernelType}
	post, err := json.Marshal(ckr)
  if err != nil {
    return kernel, err
  }

  req, err := jc.PostBytes("jupyter/api/kernels", post)
  if err != nil {
    return kernel, err
  }
  res, err := http.DefaultClient.Do(req)
  if err != nil {
    return kernel, err
  }
  defer res.Body.Close()
  body, err := io.ReadAll(res.Body)
  if err != nil {
    return kernel, err
  }
  err = json.Unmarshal(body, &kernel)
  return kernel, err
}

func (jc *JupyterHttpClient) SelectKernel() (KernelSpec, error) {
  kernels, err := jc.GetKernels()
  if err != nil {
    return KernelSpec{}, err
  }
  if len(kernels) == 0 {
    // create a kernel
    kernel, err := jc.CreateKernel("python3")
    if err != nil {
      return KernelSpec{}, err
    }
    return kernel, nil
  } else {
    // use the first kernel
    return kernels[0], nil
  }
}

func (jc *JupyterHttpClient) GetConnectionInfo(id string) (ConnectionInfo, error) {
  var connectionInfo ConnectionInfo
  path := fmt.Sprintf("jupyter/api/kernels/%s/connection", id)
  req, err := jc.Get(path)
  if err != nil {
    return connectionInfo, err
  }
  res, err := http.DefaultClient.Do(req)
  if err != nil {
    return connectionInfo, err
  }
  defer res.Body.Close()
  body, err := io.ReadAll(res.Body)
  if err != nil {
    return connectionInfo, err
  }
  err = json.Unmarshal(body, &connectionInfo)
  return connectionInfo, err
}
