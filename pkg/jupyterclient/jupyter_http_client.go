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
		BasePath: strings.TrimRight(settings.BaseUrl, "/"),
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

func (jc *JupyterHttpClient) PostEmpty(path string) (*http.Request, error) {
  return jc.NewRequest(http.MethodPost, path, http.NoBody)
}

func (jc *JupyterHttpClient) PostBytes(path string, body []byte) (*http.Request, error) {
  return jc.NewRequest(http.MethodPost, path, bytes.NewReader(body))
}

func (jc *JupyterHttpClient) Delete(path string) (*http.Request, error) {
  return jc.NewRequest(http.MethodDelete, path, http.NoBody)
}

func (jc *JupyterHttpClient) GetSessions() ([]Session, error) {
  var sessions []Session

  req, err := jc.Get("jupyter/api/sessions")
  if err != nil {
    return sessions, err
  }
  res, err := http.DefaultClient.Do(req)
  if err != nil {
    return sessions, err
  }
  defer res.Body.Close()
  body, err := io.ReadAll(res.Body)
  if err != nil {
    return sessions, err
  }
  err = json.Unmarshal(body, &sessions)
  return sessions, err
}

func (jc *JupyterHttpClient) KillKernel(id string) error {
  req, err := jc.Delete(fmt.Sprintf("jupyter/api/kernels/%s", id))
  if err != nil {
    return err
  }
  res, err := http.DefaultClient.Do(req)
  defer res.Body.Close()
  return err
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

func (jc *JupyterHttpClient) GetKernelSpecs() ([]byte, error) {
  req, err := jc.Get("jupyter/api/kernelspecs")
  if err != nil {
    return nil, err
  }
  res, err := http.DefaultClient.Do(req)
  if err != nil {
    return nil, err
  }
  defer res.Body.Close()
  body, err := io.ReadAll(res.Body)
  return body, err
}

func (jc *JupyterHttpClient) GetListing(path string) ([]PathEntry, error) {
  var entry PathEntry

  req, err := jc.Get(fmt.Sprintf("jupyter/api/contents/%s", path))
  if err != nil {
    return []PathEntry{}, err
  }
  res, err := http.DefaultClient.Do(req)
  if err != nil {
    return []PathEntry{}, err
  }
  defer res.Body.Close()
  body, err := io.ReadAll(res.Body)
  if err != nil {
    return []PathEntry{}, err
  }
  err = json.Unmarshal(body, &entry)
	if entry.Content == nil {
    return []PathEntry{}, err
	}
  return *entry.Content, err
}


func (jc *JupyterHttpClient) GetNotebooks() ([]string, error) {
	rv := []string{}
	var recur func(string) error
	recur = func(path string) error {
		entries, err := jc.GetListing(path)
		if err != nil {
			return err
		}
		for _, entry := range(entries) {
			if entry.Type == "notebook" {
				rv = append(rv, entry.Path)
			} else if entry.Type == "directory" {
				err = recur(entry.Path)
				if err != nil {
					return err
				}
			}
		}
		return nil
	}
	err := recur("")
	return rv, err
}

func (jc *JupyterHttpClient) GetNotebook(path string) (string, error) {
  var notebook Notebook

  req, err := jc.Get(fmt.Sprintf("jupyter/api/contents/%s", path))
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
  err = json.Unmarshal(body, &notebook)
  if err != nil {
    return "", err
  }

	if notebook.Content == nil {
		return "", err
	}

	var buffer bytes.Buffer
	for _, cell := range(notebook.Content.Cells) {
		if cell.CellType == "code" {
			buffer.WriteString(cell.Source)
			buffer.WriteString("\n")
		}
	}

	return buffer.String(), nil
}

func (jc *JupyterHttpClient) CreateKernel(kernelType string) (KernelSpec, error) {
  var kernel KernelSpec

	type createKernelRequest struct {
		Name string `json:"name"`
	}
	ckr := createKernelRequest{Name:kernelType}
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

func (jc *JupyterHttpClient) Restart(id string) error {
	path := fmt.Sprintf("jupyter/api/kernels/%s/restart", id)
	req, err := jc.PostEmpty(path)
	if err != nil {
		return err
	}
	_, err = http.DefaultClient.Do(req)
	return err
}
