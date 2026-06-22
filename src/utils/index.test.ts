import { AuthType } from '@theia/types';
import { openJupyterLab, openJupyterLabNotebook } from '@theia/utils';
import { openWindow, getWindowLocation} from '@theia/utils/window';

describe('openJupyterLab', () => {
  it('Should open to ../lab relative to the jupyter URL', async () => {
    openJupyterLab({
      jupyterUrl: 'http://jupyter.hamburger.edu:8888/api',
    });
    expect(openWindow).toHaveBeenCalledWith('http://jupyter.hamburger.edu:8888/lab');
  });

  it('should include the token parameter', async () => {
    openJupyterLab({
      jupyterUrl: 'http://jupyter.hamburger.edu:8888/api',
      authType: AuthType.RawToken,
      rawToken: 'potato salad',
    });
    expect(openWindow).toHaveBeenCalledWith('http://jupyter.hamburger.edu:8888/lab?token=potato%20salad');
  });
});

describe('openJupyterLabNotebook', () => {
  it('Should open to ../lab/tree/notebook relative to the jupyter URL', async () => {
    openJupyterLabNotebook({
      jupyterUrl: 'http://jupyter.hamburger.edu:8888/api',
    }, {
      notebook: 'MasterControl.ipynb',
    });
    expect(openWindow).toHaveBeenCalledWith('http://jupyter.hamburger.edu:8888/lab/tree/MasterControl.ipynb');
  });

  it('Should use hostname from window.location if jupyterUrl is localhost', async () => {
    getWindowLocation.mockImplementation(() => URL.parse('http://jupyter.hamburger.edu:3000/'));
    openJupyterLabNotebook({
      jupyterUrl: 'http://localhost:8888/jupyter/api',
    }, {
      notebook: 'MasterControl.ipynb',
    });
    expect(openWindow).toHaveBeenCalledWith('http://jupyter.hamburger.edu:8888/jupyter/lab/tree/MasterControl.ipynb');
  });
});

