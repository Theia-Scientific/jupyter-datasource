jest.mock('@grafana/ui');

import { act, fireEvent, render, screen } from '@testing-library/react';
import { MyDataSourceOptions, MySecureJsonData, ConnectionType, AuthType } from '@theia/types';
import { TEST_IDS } from '@theia/constants';
import { DataSourceSettings } from '@grafana/data';
import React from 'react';
import { v4 as uuidv4 } from 'uuid';

import { QueryEditor } from './QueryEditor';

jest.mock('uuid');

describe('Query Editor', () => {
  const baseQuery = {
    uuid: 'k77MQ421TA649b78oqsJBO945x29Y9V7',
    kernelType: "python3",
    kernelId: "",
  };

  const mockDatasource = () => ({
    options: { connectionType: ConnectionType.Auto },

    getListing: jest.fn(async (_path) => [{
      type: 'notebook',
      size: 123,
      name: 'nb.ipynb',
      path: 'nb.ipynb',
      last_modified: '2026-05-06T15:09:47Z',
    }]),

    getKernels: jest.fn(async () => [{
      id: 'kernel_id',
      name: 'kernel_name',
      last_activity: '2026-05-06T15:09:47Z',
      execution_state: 'idle',
      connections: 1,
      notebook_path: 'nb.ipynb',
    }]),

    getKernelSpecs: jest.fn(async () => ({
      'default': 'python3',
      kernelspecs: {
        'python3': {
          name: 'python3',
          spec: {
            display_name: 'python3',
          },
        },
      },
    })),
  });

  const getComponent = ({query, datasource, onChange}) => {
    return <QueryEditor datasource={datasource} query={query} onChange={onChange} />;
  };

  const renderWithoutErrors = async (component: React.ReactElement) => {
    await act(async () => {
      await render(component);
    });
  };

  describe('without a uuid set', () => {
    const datasource = mockDatasource();
    const onChange = jest.fn();
    it('should set uuid', async () => {
      uuidv4.mockReturnValue('<uuid>');
      await renderWithoutErrors(getComponent({query: {}, datasource, onChange}));

      expect(uuidv4).toHaveBeenCalled();
      expect(onChange).toHaveBeenCalledWith(
        expect.objectContaining({
          uuid: '<uuid>',
        }),
      );
    });
  });

  describe('with a uuid set', () => {
    const datasource = mockDatasource();
    const onChange = jest.fn();
    it('should not set uuid', async () => {
      uuidv4.mockReturnValue('<uuid>');
      await renderWithoutErrors(getComponent({query: baseQuery, datasource, onChange}));

      expect(uuidv4).not.toHaveBeenCalled();
      expect(onChange).not.toHaveBeenCalledWith(
        expect.objectContaining({
          uuid: '<uuid>',
        }),
      );
    });
  });

  describe('with ConnectionType.Auto', () => {
    const datasource = {...mockDatasource(), connectionType: ConnectionType.Auto};
    const onChange = jest.fn();
    it('should show the right things', async () => {
      await renderWithoutErrors(getComponent({query: baseQuery, datasource, onChange}));

      expect(screen.queryByLabelText('Kernel ID')).toBeInTheDocument();
      expect(screen.queryByLabelText('Kernel Type')).toBeInTheDocument();
      expect(screen.queryByLabelText('Kernel Type')).toHaveRole('combobox');
      expect(screen.queryByLabelText('Connection Info')).not.toBeInTheDocument();
      expect(screen.queryByText('Variables')).toBeInTheDocument();
      expect(screen.queryByLabelText('Source')).toBeInTheDocument();
    });

    describe('with no notebook set', () => {
      const query = {...baseQuery, notebook: undefined};
      it('should show the code editor', async () => {
        await renderWithoutErrors(getComponent({query: baseQuery, datasource, onChange}));
        expect(screen.queryByLabelText('Source')).toBeInTheDocument();
        expect(screen.queryByTestId(TEST_IDS.filesList.root)).not.toBeInTheDocument();
        expect(screen.queryByText('Code')).toBeInTheDocument();
      });
    });

    describe('with a notebook set', () => {
      const query = {...baseQuery, notebook: 'nb.ipynb'};
      it('should not show the code editor', async () => {
        await renderWithoutErrors(getComponent({query, datasource, onChange}));
        expect(screen.queryByLabelText('Source')).toBeInTheDocument();
        expect(screen.queryByTestId(TEST_IDS.filesList.root)).not.toBeInTheDocument();
        expect(screen.queryByText('Code')).not.toBeInTheDocument();
      });
    });

    // @TODO figure out how to use fireEvent to pick the 'choose notebook'
    // option from the dropdown, do a rerender, and make sure that the
    // filetree is visible, and goes away again when you pick a notebook
  });
});
