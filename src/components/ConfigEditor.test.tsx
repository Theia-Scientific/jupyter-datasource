import { act, fireEvent, render, screen } from '@testing-library/react';
import { MyDataSourceOptions, MySecureJsonData, ConnectionType, AuthType } from '@theia/types';
import { DataSourceSettings } from '@grafana/data';
import React from 'react';

import { ConfigEditor } from './ConfigEditor';

describe('Config Editor', () => {
  const getComponent = (opts: MyDataSourceOptions, onOptionsChange=jest.fn()) => {
    const options: DataSourceSettings<MyDataSourceOptions, MySecureJsonData> = {
      jsonData: opts,
    } as unknown as DataSourceSettings<MyDataSourceOptions, MySecureJsonData>;

    return <ConfigEditor onOptionsChange={onOptionsChange} options={options} />;
  };

  const renderWithoutErrors = async (component: React.ReactElement) => {
    await act(async () => {
      await render(component);
    });
  };

  const baseOpts: MyDataSourceOptions = {
    connectionType: ConnectionType.Info,
    authType: AuthType.None,
    fetchRoute: undefined,
    fetchMethod: undefined,
    fetchToken: undefined,
    rawToken: undefined,
    jupyterUrl: undefined,
    prelude: undefined,
    packages: [],
  };

  describe('with ConnectionType.Info', () => {
    const infoOpts = { ...baseOpts, connectionType: ConnectionType.Info };
    it('Should render component with the appropriate options', async () => {
      await renderWithoutErrors(getComponent(infoOpts));

      // expected
      expect(screen.queryByLabelText('Connection Type')).toBeInTheDocument();
      expect(screen.queryByText('Packages')).toBeInTheDocument();
      expect(screen.queryByLabelText('Prelude')).toBeInTheDocument();

      // unexpected
      expect(screen.queryByLabelText('Auth Type')).not.toBeInTheDocument();
      expect(screen.queryByLabelText('Token')).not.toBeInTheDocument();
      expect(screen.queryByLabelText('Token URL')).not.toBeInTheDocument();
      expect(screen.queryByLabelText('Method')).not.toBeInTheDocument();
      expect(screen.queryByLabelText('Fetch Token')).not.toBeInTheDocument();
      expect(screen.queryByLabelText('JupyterLab URL')).not.toBeInTheDocument();
    });
  });

  describe('with ConnectionType.Auto', () => {
    const autoOpts = { ...baseOpts, connectionType: ConnectionType.Auto };

    it('Should render component with the appropriate options', async () => {
      await renderWithoutErrors(getComponent(autoOpts));

      // expected
      expect(screen.queryByLabelText('Connection Type')).toBeInTheDocument();
      expect(screen.queryByLabelText('Auth Type')).toBeInTheDocument();
      expect(screen.queryByText('Packages')).toBeInTheDocument();
      expect(screen.queryByLabelText('Prelude')).toBeInTheDocument();
      expect(screen.queryByLabelText('JupyterLab URL')).toBeInTheDocument();

      // unexpected
      expect(screen.queryByLabelText('Token')).not.toBeInTheDocument();
      expect(screen.queryByLabelText('Token URL')).not.toBeInTheDocument();
      expect(screen.queryByLabelText('Method')).not.toBeInTheDocument();
      expect(screen.queryByLabelText('Fetch Token')).not.toBeInTheDocument();
    });

    describe('with AuthType.RawToken', () => {
      const rawOpts = { ...autoOpts, authType: AuthType.RawToken };

      it('Should render component with the appropriate options', async () => {
        await renderWithoutErrors(getComponent(rawOpts));

        // expected
        expect(screen.queryByLabelText('Connection Type')).toBeInTheDocument();
        expect(screen.queryByLabelText('Auth Type')).toBeInTheDocument();
        expect(screen.queryByText('Packages')).toBeInTheDocument();
        expect(screen.queryByLabelText('Prelude')).toBeInTheDocument();
        expect(screen.queryByLabelText('JupyterLab URL')).toBeInTheDocument();
        expect(screen.queryByLabelText('Token')).toBeInTheDocument();

        // unexpected
        expect(screen.queryByLabelText('Token URL')).not.toBeInTheDocument();
        expect(screen.queryByLabelText('Method')).not.toBeInTheDocument();
        expect(screen.queryByLabelText('Fetch Token')).not.toBeInTheDocument();
      });
    });

    describe('with AuthType.Fetch', () => {
      const fetchOpts = { ...autoOpts, authType: AuthType.Fetch };

      it('Should render component with the appropriate options', async () => {
        await renderWithoutErrors(getComponent(fetchOpts));

        // expected
        expect(screen.queryByLabelText('Connection Type')).toBeInTheDocument();
        expect(screen.queryByLabelText('Auth Type')).toBeInTheDocument();
        expect(screen.queryByText('Packages')).toBeInTheDocument();
        expect(screen.queryByLabelText('Prelude')).toBeInTheDocument();
        expect(screen.queryByLabelText('JupyterLab URL')).toBeInTheDocument();
        expect(screen.queryByLabelText('Token URL')).toBeInTheDocument();
        expect(screen.queryByLabelText('Method')).toBeInTheDocument();
        expect(screen.queryByLabelText('Fetch Token')).toBeInTheDocument();

        // unexpected
        expect(screen.queryByLabelText('Token')).not.toBeInTheDocument();
      });
    });
  });

  describe('Packages', () => {
    it('Should start empty', async () => {
      await renderWithoutErrors(getComponent(baseOpts));
      expect(screen.queryByPlaceholderText('numpy==2.4.4')).not.toBeInTheDocument();
    });

    it('Should add an empty package', async () => {
      const onOptionsChange = jest.fn();
      await renderWithoutErrors(getComponent(baseOpts, onOptionsChange));
      await fireEvent.click(screen.getByText('Add Package'));
      expect(onOptionsChange).toHaveBeenCalledWith(
        expect.objectContaining({
          jsonData: expect.objectContaining({
            packages: [""],
          })
        })
      );
    });

    describe('with some packages', () => {
      const packOpts = {...baseOpts, packages: [
        "milk",
        "eggs",
        "fruit salad",
      ]};

      it('should render all packages', async () => {
        await renderWithoutErrors(getComponent(packOpts));
        expect(screen.queryByDisplayValue('milk')).toBeInTheDocument();
        expect(screen.queryByDisplayValue('eggs')).toBeInTheDocument();
        expect(screen.queryByDisplayValue('fruit salad')).toBeInTheDocument();
      });

      it('should remove first', async () => {
        const onOptionsChange = jest.fn();
        await renderWithoutErrors(getComponent(packOpts, onOptionsChange));
        const removeButtons = screen.getAllByLabelText('Remove Package');
        expect(removeButtons.length).toEqual(3);
        await fireEvent.click(removeButtons[0]);
        expect(onOptionsChange).toHaveBeenCalledWith(
          expect.objectContaining({
            jsonData: expect.objectContaining({
              packages: ['eggs', 'fruit salad'],
            })
          })
        );
      });

      it('should remove middle', async () => {
        const onOptionsChange = jest.fn();
        await renderWithoutErrors(getComponent(packOpts, onOptionsChange));
        const removeButtons = screen.getAllByLabelText('Remove Package');
        expect(removeButtons.length).toEqual(3);
        await fireEvent.click(removeButtons[1]);
        expect(onOptionsChange).toHaveBeenCalledWith(
          expect.objectContaining({
            jsonData: expect.objectContaining({
              packages: ['milk', 'fruit salad'],
            })
          })
        );
      });
    });
  });
});
