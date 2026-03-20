import React, { ChangeEvent } from 'react';
import { InlineField, Input, Select } from '@grafana/ui';
import { DataSourcePluginOptionsEditorProps, SelectableValue } from '@grafana/data';
import { AuthType, ConnectionType, Method, MyDataSourceOptions, MySecureJsonData } from '../types';

interface Props extends DataSourcePluginOptionsEditorProps<MyDataSourceOptions, MySecureJsonData> {}

const CONN_OPTIONS = [
  {label: "Automatic", value: ConnectionType.Auto, description: "Start or connect to a kernel via the Jupyterlab API"},
  {label: "Connection Info", value: ConnectionType.Info, description: "Paste JSON connection info directly"},
];

const AUTH_OPTIONS = [
  {label: "None", value: AuthType.None, description: "No authentication"},
  {label: "Raw Token", value: AuthType.RawToken, description: "Enter a token directly"},
  {label: "Fetch", value: AuthType.Fetch, description: "Fetch a token from a web service"},
];

const METHOD_OPTIONS = [
  {label: "Get", value: Method.Get},
  {label: "Put", value: Method.Put},
];

export function ConfigEditor(props: Props) {
  const { onOptionsChange, options } = props;
  const { jsonData } = options;

  const onConnectionTypeChange = (selectableValue: SelectableValue<ConnectionType>) => {
    onOptionsChange({
      ...options,
      jsonData: {
        ...jsonData,
        connectionType: selectableValue.value ?? ConnectionType.Info,
      },
    });
  };

  const onAuthTypeChange = (selectableValue: SelectableValue<AuthType>) => {
    onOptionsChange({
      ...options,
      jsonData: {
        ...jsonData,
        authType: selectableValue.value ?? AuthType.None,
      },
    });
  };

  const onRouteChange = (event: ChangeEvent<HTMLInputElement>) => {
    onOptionsChange({
      ...options,
      jsonData: {
        ...jsonData,
        fetchRoute: event.target.value,
      },
    });
  };

  const onMethodChange = (selectableValue: SelectableValue<Method>) => {
    onOptionsChange({
      ...options,
      jsonData: {
        ...jsonData,
        fetchMethod: selectableValue.value ?? Method.Get,
      },
    });
  };

  const onRawTokenChange = (event: ChangeEvent<HTMLInputElement>) => {
    onOptionsChange({
      ...options,
      jsonData: {
        ...jsonData,
        rawToken: event.target.value,
      },
    });
  };

  const onJupyterUrlChange = (event: ChangeEvent<HTMLInputElement>) => {
    onOptionsChange({
      ...options,
      jsonData: {
        ...jsonData,
        jupyterUrl: event.target.value,
      },
    });
  };

  return (
    <>
      <InlineField label="Connection Type" labelWidth={20} interactive tooltip={'Type of connection'}>
        <Select
          id="config-editor-conn-type"
          options={CONN_OPTIONS}
          onChange={onConnectionTypeChange}
          value={jsonData.connectionType}
          width={40}
        />
      </InlineField>
      { jsonData.connectionType === ConnectionType.Auto &&
        <InlineField label="Auth Type" labelWidth={20} interactive tooltip={'Type of authentication'}>
          <Select
            id="config-editor-auth-type"
            options={AUTH_OPTIONS}
            onChange={onAuthTypeChange}
            value={jsonData.authType}
            width={40}
          />
        </InlineField>
      }
      { jsonData.connectionType === ConnectionType.Auto && jsonData.authType === AuthType.RawToken &&
        <InlineField label="Token" labelWidth={20} interactive tooltip={'Token for Jupyterlab auth'}>
          <Input
            id="config-editor-raw-token"
            onChange={onRawTokenChange}
            value={jsonData.rawToken}
            placeholder="Enter the token"
            width={40}
          />
        </InlineField>
      }
      { jsonData.connectionType === ConnectionType.Auto && jsonData.authType === AuthType.Fetch &&
        <InlineField label="Token URL" labelWidth={20} interactive tooltip={'URL to fetch the Jupyterlab token from'}>
          <Input
            id="config-editor-route"
            onChange={onRouteChange}
            value={jsonData.fetchRoute}
            placeholder="Enter the token URL, e.g. http://localhost/tokens/jupyter"
            width={40}
          />
        </InlineField>
      }
      { jsonData.connectionType === ConnectionType.Auto && jsonData.authType === AuthType.Fetch &&
        <InlineField label="Method" labelWidth={20} interactive tooltip={'HTTP method for fetching the Jupyterlab token'}>
          <Select
            id="config-editor-method"
            options={METHOD_OPTIONS}
            onChange={onMethodChange}
            value={jsonData.fetchMethod}
            width={40}
          />
        </InlineField>
      }
      { jsonData.connectionType === ConnectionType.Auto &&
        <InlineField label="Jupyterlab URL" labelWidth={20} interactive tooltip={'Jupyterlab endpoint URL'}>
          <Input
            id="config-jupyter-url"
            onChange={onJupyterUrlChange}
            value={jsonData.jupyterUrl}
            placeholder="Enter the Jupyterlab URL, e.g. http://localhost:8888/"
            width={40}
          />
        </InlineField>
      }
    </>
  );
}
