jest.mock('@grafana/ui');

import { act, fireEvent, render, screen } from '@testing-library/react';
import { type DataSource } from '@theia/datasource';
import { AuthType, ConnectionType, MyQuery } from '@theia/types';
import { TEST_IDS } from '@theia/constants';
import React from 'react';
import { v4 as uuidv4 } from 'uuid';

import { QueryEditor } from './QueryEditor';

jest.mock('uuid');

describe('Query Editor', () => {
  const baseQuery: MyQuery = {
    uuid: 'k77MQ421TA649b78oqsJBO945x29Y9V7',
    kernelType: "python3",
    kernelTag: "",
    connectionInfo: "",
    kernelId: "",
    notebook: "",
    code: "", 
    vars: [], 
    refId: 'A'
  };

  const mockDatasource = () => ({
    options: {
      connectionType: ConnectionType.Auto,
      authType: AuthType.None,
      packages: [],
    },

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

  const getComponent = ({query, datasource, onChange, onRunQuery}: {query: MyQuery, datasource: any, onChange?: () => void, onRunQuery?: () => void}) => {
    return <QueryEditor datasource={datasource as DataSource} query={query} onChange={onChange ?? jest.fn()} onRunQuery={onRunQuery ?? jest.fn()}/>;
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
      const uuidv4mock = jest.mocked(uuidv4);
      // The uuid module lies about its return types - it says that v4 returns a Uint8Array,
      // but in fact it only returns that if you provide a buf parameter, which we don't.
      // By default, it returns a string.  So we have to lie to the typechecker here.
      uuidv4mock.mockReturnValue('<uuid>' as unknown as Uint8Array);
      const query = {...baseQuery, uuid: undefined} as any as MyQuery;
      await renderWithoutErrors(getComponent({query, datasource, onChange}));

      expect(uuidv4mock).toHaveBeenCalled();
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
      const uuidv4mock = jest.mocked(uuidv4);
      // same lie, see above.
      uuidv4mock.mockReturnValue('<uuid>' as unknown as Uint8Array);
      await renderWithoutErrors(getComponent({query: baseQuery, datasource, onChange}));

      expect(uuidv4mock).not.toHaveBeenCalled();
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

      expect(screen.queryByText('Run Query')).toBeInTheDocument();
      expect(screen.queryByLabelText('Kernel ID')).toBeInTheDocument();
      expect(screen.queryByLabelText('Kernel Tag')).toBeInTheDocument();
      expect(screen.queryByLabelText('Kernel Type')).toBeInTheDocument();
      expect(screen.queryByLabelText('Kernel Type')).toHaveRole('combobox');
      expect(screen.queryByLabelText('Connection Info')).not.toBeInTheDocument();
      expect(screen.queryByText('Variables')).toBeInTheDocument();
      expect(screen.queryByLabelText('Source')).toBeInTheDocument();
    });

    describe('with a kernelId set', () => {
      const datasource = mockDatasource();
      const query = {...baseQuery, kernelId: 'candycorn'};
      it('should not show kernel tag', async () => {
        await renderWithoutErrors(getComponent({query, datasource, onChange}));
        expect(screen.queryByLabelText('Kernel Tag')).not.toBeInTheDocument();
      })
    })

    describe('with no notebook set', () => {
      const datasource = mockDatasource();
      const query = {...baseQuery, notebook: ''};
      it('should show the code editor', async () => {
        await renderWithoutErrors(getComponent({query, datasource, onChange}));
        expect(screen.queryByLabelText('Source')).toBeInTheDocument();
        expect(screen.queryByTestId(TEST_IDS.filesList.root)).not.toBeInTheDocument();
        expect(screen.queryByText('Code')).toBeInTheDocument();
      });
    });

    describe('with a notebook set', () => {
      const datasource = mockDatasource();
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

  describe('Run Query', () => {
    const datasource = mockDatasource();
    const onRunQuery = jest.fn();
    it('should run the query', async () => {
      await renderWithoutErrors(getComponent({query: baseQuery, datasource, onRunQuery}));
      fireEvent.click(await screen.findByText('Run Query'));
      expect(onRunQuery).toHaveBeenCalled();
    });
  });
});
