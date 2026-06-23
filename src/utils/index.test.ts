import { AuthType, ConnectionType, DEFAULT_QUERY, MyQuery } from '@theia/types';
import { getJupyterLabUrl, getJupyterLabNotebookUrl, getWindowLocation } from '@theia/utils';

const options = {
  connectionType: ConnectionType.Info,
  authType: AuthType.None,
  jupyterUrl: 'http://jupyter.hamburger.edu:8888/api',
  packages: []
};

const query = {
  ...DEFAULT_QUERY,
  uuid: 'whatever',
} as MyQuery;

describe('getJupyterLabUrl', () => {
  it('should resolve to ../lab relative to the jupyter URL', async () => {
    expect(getJupyterLabUrl(options)).toEqual('http://jupyter.hamburger.edu:8888/lab');
  });

  describe('with a token', () => {
    it('should include the token parameter', async () => {
      expect(getJupyterLabUrl({
        ...options,
        authType: AuthType.RawToken,
        rawToken: 'potato salad',
      })).toEqual('http://jupyter.hamburger.edu:8888/lab?token=potato+salad');
    });
  });
});

describe('getJupyterLabNotebookUrl', () => {
  const notebookQuery = {
    ...query,
    notebook: 'MasterControl.ipynb',
  };

  it('should resolve to ../lab/tree/notebook relative to the jupyter URL', async () => {
    expect(getJupyterLabNotebookUrl(options, notebookQuery))
      .toEqual('http://jupyter.hamburger.edu:8888/lab/tree/MasterControl.ipynb');
  });

  describe('when jupyterUrl is localhost', () => {
    const localhostOptions = {
      ...options,
      jupyterUrl: 'http://localhost:8888/jupyter/api',
    }
    it('should use hostname from window.location', async () => {
      jest.mocked(getWindowLocation).mockImplementation(() => 'http://jupyter.hamburger.edu:3000/');
      expect(getJupyterLabNotebookUrl(localhostOptions, notebookQuery))
        .toEqual('http://jupyter.hamburger.edu:8888/jupyter/lab/tree/MasterControl.ipynb');
    });
  });

  describe('when jupyterUrl is malformed', () => {
    const malformedOptions = {
      ...options,
      jupyterUrl: 'not a URL at all',
    }
    it('should return null', async () => {
      expect(getJupyterLabNotebookUrl(malformedOptions, notebookQuery))
        .toEqual(null);
    });
  });
});

