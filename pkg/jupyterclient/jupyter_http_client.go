package jupyterclient

import (
	"bytes"
	"crypto/tls"
	"encoding/json"
	"errors"
	"fmt"
	"io"
	"net/http"
	"strings"
)

//mockery:generate: true
type IJupyterHttpClient interface {
	GetSessions() ([]Session, error)
	KillKernel(id string) error
	GetKernels() ([]KernelSpec, error)
	GetKernelSpecs() ([]byte, error)
	GetListing(path string) ([]PathEntry, error)
	GetNotebooks() ([]PathEntry, error)
	GetNotebook(path string) (Notebook, error)
	CreateKernel(kernelType string) (KernelSpec, error)
	SelectKernel() (KernelSpec, error)
	GetConnectionInfo(id string) (ConnectionInfo, error)
	Restart(id string) error
}

func MakeJupyterHttpClient(settings *JupyterServiceSettings) IJupyterHttpClient {
	return &JupyterHttpClient{
		AuthHeader: fmt.Sprintf("Bearer %s", settings.Token),
		BasePath:   strings.TrimRight(settings.BaseUrl, "/"),
		Client: &http.Client{
			Transport: &http.Transport{
				TLSClientConfig: &tls.Config{
					InsecureSkipVerify: settings.InsecureSkipVerify,
				},
			},
		},
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

func (jc *JupyterHttpClient) requestBody(req *http.Request) (io.ReadCloser, error) {
	res, err := jc.Client.Do(req)
	if err != nil {
		return nil, err
	}
	if res.StatusCode < 200 || res.StatusCode >= 300 {
		return res.Body, errors.New(res.Status)
	}
	return res.Body, err
}

func (jc *JupyterHttpClient) requestBytes(req *http.Request) ([]byte, error) {
	body, err := jc.requestBody(req)
	if body != nil {
		defer body.Close()
	}
	if err != nil {
		return []byte{}, err
	}
	return io.ReadAll(body)
}

func (jc *JupyterHttpClient) requestJSON(req *http.Request, val any) error {
	bytes, err := jc.requestBytes(req)
	if err != nil {
		return err
	}
	err = json.Unmarshal(bytes, val)
	if err != nil {
		return errors.New(fmt.Sprintf("Can't unmarshal from '%s'", string(bytes)))
	}
	return nil
}

func (jc *JupyterHttpClient) request(req *http.Request) error {
	body, err := jc.requestBody(req)
	if body != nil {
		defer body.Close()
	}
	return err
}

func (jc *JupyterHttpClient) GetSessions() ([]Session, error) {
	var sessions []Session
	req, err := jc.Get("sessions")
	if err != nil {
		return sessions, err
	}
	err = jc.requestJSON(req, &sessions)
	return sessions, err
}

func (jc *JupyterHttpClient) KillKernel(id string) error {
	req, err := jc.Delete(fmt.Sprintf("kernels/%s", id))
	if err != nil {
		return err
	}
	return jc.request(req)
}

func (jc *JupyterHttpClient) GetKernels() ([]KernelSpec, error) {
	var kernels []KernelSpec
	req, err := jc.Get("kernels")
	if err != nil {
		return kernels, err
	}
	err = jc.requestJSON(req, &kernels)
	return kernels, err
}

func (jc *JupyterHttpClient) GetKernelSpecs() ([]byte, error) {
	req, err := jc.Get("kernelspecs")
	if err != nil {
		return []byte{}, err
	}
	return jc.requestBytes(req)
}

func (jc *JupyterHttpClient) GetListing(path string) ([]PathEntry, error) {
	var entry PathEntry
	req, err := jc.Get(fmt.Sprintf("contents/%s", path))
	if err != nil {
		return []PathEntry{}, err
	}
	err = jc.requestJSON(req, &entry)
	if err != nil {
		return []PathEntry{}, err
	}
	return *entry.Content, err
}

func (jc *JupyterHttpClient) GetNotebooks() ([]PathEntry, error) {
	var recur func(string) ([]PathEntry, error)
	recur = func(path string) ([]PathEntry, error) {
		entries, err := jc.GetListing(path)
		if err != nil {
			return entries, err
		}
		for i := range entries {
			if entries[i].Type == "directory" {
				subdir, err := recur(entries[i].Path)
				entries[i].Content = &subdir
				if err != nil {
					return entries, err
				}
			}
		}
		return entries, nil
	}
	return recur("")
}

func (jc *JupyterHttpClient) GetNotebook(path string) (Notebook, error) {
	var notebook Notebook
	req, err := jc.Get(fmt.Sprintf("contents/%s", strings.TrimLeft(path, "/")))
	if err != nil {
		return notebook, err
	}
	err = jc.requestJSON(req, &notebook)
	return notebook, err
}

func (jc *JupyterHttpClient) CreateKernel(kernelType string) (KernelSpec, error) {
	var kernel KernelSpec
	type createKernelRequest struct {
		Name string `json:"name"`
	}
	ckr := createKernelRequest{Name: kernelType}
	post, err := json.Marshal(ckr)
	if err != nil {
		return kernel, err
	}

	req, err := jc.PostBytes("kernels", post)
	if err != nil {
		return kernel, err
	}
	err = jc.requestJSON(req, &kernel)
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
	req, err := jc.Get(fmt.Sprintf("kernels/%s/connection", id))
	if err != nil {
		return connectionInfo, err
	}
	err = jc.requestJSON(req, &connectionInfo)
	return connectionInfo, err
}

func (jc *JupyterHttpClient) Restart(id string) error {
	req, err := jc.PostEmpty(fmt.Sprintf("kernels/%s/restart", id))
	if err != nil {
		return err
	}
	return jc.request(req)
}
