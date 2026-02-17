import React, { ChangeEvent } from 'react';
import { InlineField, Input, Select, TextArea } from '@grafana/ui';
import { DataSourcePluginOptionsEditorProps, SelectableValue } from '@grafana/data';
import { AuthType, ConnectionType, Method, MyDataSourceOptions, MySecureJsonData } from '../types';

interface Props extends DataSourcePluginOptionsEditorProps<MyDataSourceOptions, MySecureJsonData> {}

const METHOD_OPTIONS = [
  {label: "Get", value: Method.Get},
  {label: "Put", value: Method.Put},
];

const AUTH_OPTIONS = [
  {label: "None", value: AuthType.None, description: "No authentication"},
  {label: "Raw Token", value: AuthType.RawToken, description: "Enter a token directly"},
  {label: "Fetch", value: AuthType.Fetch, description: "Fetch a token from a web service"},
];

const CONN_OPTIONS = [
  {label: "Connection Info", value: ConnectionType.Info, description: "Paste JSON connection info directly"},
  {label: "Existing Kernel", value: ConnectionType.Existing, description: "Connect to a running kernel by ID"},
  {label: "New Kernel", value: ConnectionType.New, description: "Start a new kernel of a desired type"},
];

export function ConfigEditor(props: Props) {
  const { onOptionsChange, options } = props;
  const { jsonData } = options;

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

  const onAuthTypeChange = (selectableValue: SelectableValue<AuthType>) => {
    onOptionsChange({
      ...options,
      jsonData: {
        ...jsonData,
        authType: selectableValue.value ?? AuthType.None,
      },
    });
  };

  const onConnectionTypeChange = (selectableValue: SelectableValue<ConnectionType>) => {
    onOptionsChange({
      ...options,
      jsonData: {
        ...jsonData,
        connectionType: selectableValue.value ?? ConnectionType.Info,
      },
    });
  };

  const onConnectionInfoChange = (event: ChangeEvent<HTMLTextAreaElement>) => {
    onOptionsChange({
      ...options,
      jsonData: {
        ...jsonData,
        connectionInfo: event.target.value,
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

  const onKernelIdChange = (event: ChangeEvent<HTMLInputElement>) => {
    onOptionsChange({
      ...options,
      jsonData: {
        ...jsonData,
        existingKernelId: event.target.value,
      },
    });
  };

  const onKernelTypeChange = (event: ChangeEvent<HTMLInputElement>) => {
    onOptionsChange({
      ...options,
      jsonData: {
        ...jsonData,
        newKernelType: event.target.value,
      },
    });
  };

  const onInitCodeChange = (event: ChangeEvent<HTMLInputElement>) => {
    onOptionsChange({
      ...options,
      jsonData: {
        ...jsonData,
        initCode: event.target.value,
      },
    });
  };

  const onTeardownCodeChange = (event: ChangeEvent<HTMLInputElement>) => {
    onOptionsChange({
      ...options,
      jsonData: {
        ...jsonData,
        teardownCode: event.target.value,
      },
    });
  };

  return (
    <>
      <InlineField label="Auth Type" labelWidth={20} interactive tooltip={'Type of authentication'}>
        <Select
          id="config-editor-auth-type"
          options={AUTH_OPTIONS}
          onChange={onAuthTypeChange}
          value={jsonData.authType}
          width={40}
        />
      </InlineField>
      { jsonData.authType === AuthType.Fetch &&
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
      { jsonData.authType === AuthType.Fetch &&
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
      { jsonData.authType === AuthType.RawToken &&
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
      <InlineField label="Connection Type" labelWidth={20} interactive tooltip={'Type of connection'}>
        <Select
          id="config-editor-conn-type"
          options={CONN_OPTIONS}
          onChange={onConnectionTypeChange}
          value={jsonData.connectionType}
          width={40}
        />
      </InlineField>
      { jsonData.connectionType === ConnectionType.Info &&
        <InlineField label="ConnectionInfo" labelWidth={20} interactive tooltip={'JSON connection info, from a Jupyterlab connection file'}>
          <TextArea
            id="config-editor-conn-info"
            onChange={onConnectionInfoChange}
            value={jsonData.connectionInfo}
            placeholder="Enter JSON connection info"
            width={40}
            rows={12}
          />
        </InlineField>
      }
      { (jsonData.connectionType === ConnectionType.Existing || jsonData.connectionType === ConnectionType.New) &&
        <InlineField label="Jupyter URL" labelWidth={20} interactive tooltip={'URL to the Jupyterlab API instance'}>
          <Input
            id="config-editor-kernel-type"
            onChange={onJupyterUrlChange}
            value={jsonData.jupyterUrl}
            placeholder="Enter the Jupyterlab API URL"
            width={40}
          />
        </InlineField>
      }
      { jsonData.connectionType === ConnectionType.Existing &&
        <InlineField label="Kernel ID" labelWidth={20} interactive tooltip={'ID of running kernel to connect to'}>
          <Input
            id="config-editor-kernel-id"
            onChange={onKernelIdChange}
            value={jsonData.existingKernelId}
            placeholder="Enter the kernel ID"
            width={40}
          />
        </InlineField>
      }
      { jsonData.connectionType === ConnectionType.New &&
        <InlineField label="Kernel Type" labelWidth={20} interactive tooltip={'Type of new kernel to start'}>
          <Input
            id="config-editor-kernel-type"
            onChange={onKernelTypeChange}
            value={jsonData.newKernelType}
            placeholder="Enter the kernel type (e.g. python3)"
            width={40}
          />
        </InlineField>
      }

      <TextArea
        id="config-editor-init-code"
        onChange={onInitChange}
        value={jsonData.initCode || ''}
        required
        placeholder="Enter python initialization code"
        width={40}
        rows={12}
      />
      <TextArea
        id="config-editor-teardown-code"
        onChange={onTeardownCodeChange}
        value={jsonData.teardownCode || ''}
        required
        placeholder="Enter python teardown code"
        width={40}
        rows={12}
      />
    </>
  );
}
