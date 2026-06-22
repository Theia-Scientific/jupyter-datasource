import { AuthType, ConnectionType, DEFAULT_QUERY, MyQuery } from '@theia/types';
import { openJupyterLab, openJupyterLabNotebook } from '@theia/utils';
import { openWindow, getWindowLocation } from '@theia/utils/window';



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

describe('openJupyterLab', () => {
  it('Should open to ../lab relative to the jupyter URL', async () => {
    openJupyterLab(options);
    expect(openWindow).toHaveBeenCalledWith('http://jupyter.hamburger.edu:8888/lab');
  });

  it('should include the token parameter', async () => {
    openJupyterLab({
      ...options,
      authType: AuthType.RawToken,
      rawToken: 'potato salad',
    });
    expect(openWindow).toHaveBeenCalledWith('http://jupyter.hamburger.edu:8888/lab?token=potato%20salad');
  });
});

describe('openJupyterLabNotebook', () => {
  it('Should open to ../lab/tree/notebook relative to the jupyter URL', async () => {
    openJupyterLabNotebook(options, {
      ...query,
      notebook: 'MasterControl.ipynb',
    });
    expect(openWindow).toHaveBeenCalledWith('http://jupyter.hamburger.edu:8888/lab/tree/MasterControl.ipynb');
  });

  it('Should use hostname from window.location if jupyterUrl is localhost', async () => {
    jest.mocked(getWindowLocation).mockImplementation(() => 'http://jupyter.hamburger.edu:3000/');
    openJupyterLabNotebook(options, {
      ...query,
      notebook: 'MasterControl.ipynb',
    });
    expect(openWindow).toHaveBeenCalledWith('http://jupyter.hamburger.edu:8888/jupyter/lab/tree/MasterControl.ipynb');
  });
});

