import React, { ChangeEvent } from 'react';
import { InlineField, Input, SecretInput } from '@grafana/ui';
import { DataSourcePluginOptionsEditorProps } from '@grafana/data';
import { MyDataSourceOptions, MySecureJsonData } from '../types';

interface Props extends DataSourcePluginOptionsEditorProps<MyDataSourceOptions, MySecureJsonData> {}

export function ConfigEditor(props: Props) {
  const { onOptionsChange, options } = props;
  const { jsonData, secureJsonFields, secureJsonData } = options;

  const onNotebookChange = (event: ChangeEvent<HTMLInputElement>) => {
    onOptionsChange({
      ...options,
      jsonData: {
        ...jsonData,
        notebook: event.target.value,
      },
    });
  };

  const onSystemUrlChange = (event: ChangeEvent<HTMLInputElement>) => {
    onOptionsChange({
      ...options,
      secureJsonData: {
        systemUrl: event.target.value,
      },
    });
  };

  const onResetSystemUrl = () => {
    onOptionsChange({
      ...options,
      secureJsonFields: {
        ...options.secureJsonFields,
        systemUrl: false,
      },
      secureJsonData: {
        ...options.secureJsonData,
        systemUrl: '',
      },
    });
  };

  const onJupyterUrlChange = (event: ChangeEvent<HTMLInputElement>) => {
    onOptionsChange({
      ...options,
      secureJsonData: {
        jupyterUrl: event.target.value,
      },
    });
  };

  const onResetJupyterUrl = () => {
    onOptionsChange({
      ...options,
      secureJsonFields: {
        ...options.secureJsonFields,
        jupyterUrl: false,
      },
      secureJsonData: {
        ...options.secureJsonData,
        jupyterUrl: '',
      },
    });
  };

  return (
    <>
      <InlineField label="Notebook" labelWidth={14} interactive tooltip={'Notebook that query should run in'}>
        <Input
          id="config-editor-notebook"
          onChange={onNotebookChange}
          value={jsonData.notebook}
          placeholder="Enter the notebook, e.g. Untitled.ipynb"
          width={40}
        />
      </InlineField>
      <InlineField label="System URL" labelWidth={14} interactive tooltip={'URL for system service (no terminal slash)'}>
        <SecretInput
          required
          id="config-editor-system-url"
          isConfigured={secureJsonFields.systemUrl}
          value={secureJsonData?.systemUrl}
          placeholder="Enter your System URL"
          width={40}
          onReset={onResetSystemUrl}
          onChange={onSystemUrlChange}
        />
      </InlineField>
      <InlineField label="Jupyter URL" labelWidth={14} interactive tooltip={'URL for Jupyter service (no terminal slash)'}>
        <SecretInput
          required
          id="config-editor-jupyter-url"
          isConfigured={secureJsonFields.jupyterUrl}
          value={secureJsonData?.jupyterUrl}
          placeholder="Enter your Jupyter URL"
          width={40}
          onReset={onResetJupyterUrl}
          onChange={onJupyterUrlChange}
        />
      </InlineField>
    </>
  );
}
