import React, { ChangeEvent } from 'react';
import { Combobox, ComboboxOption, InlineField, Input, TextArea } from '@grafana/ui';
import { DataSourcePluginOptionsEditorProps } from '@grafana/data';
import { AuthType, ConnectionType, Method, MyDataSourceOptions, MySecureJsonData } from '../types';
import { t } from '@grafana/i18n';

interface Props extends DataSourcePluginOptionsEditorProps<MyDataSourceOptions, MySecureJsonData> {}

export function ConfigEditor(props: Props) {
  const { onOptionsChange, options } = props;
  const { jsonData } = options;

  const CONN_OPTIONS = [
    {label: t('enums.connOptions.automatic.name', 'Automatic'), value: ConnectionType.Auto, description: t('enums.connOptions.automatic.desc', 'Start or connect to a kernel via the Jupyterlab API')},
    {label: t('enums.connOptions.connectionInfo.name', 'Connection Info'), value: ConnectionType.Info, description: t('enums.connOptions.connectionInfo.desc', 'Paste JSON connection info directly')},
  ];

  const AUTH_OPTIONS = [
    {label: t('enums.authOptions.none.name', 'None'), value: AuthType.None, description: t('enums.authOptions.none.desc', 'No authentication')},
    {label: t('enums.authOptions.rawToken.name', 'Raw Token'), value: AuthType.RawToken, description: t('enums.authOptions.rawToken.desc', 'Enter a token directly')},
    {label: t('enums.authOptions.fetch.name', 'Fetch'), value: AuthType.Fetch, description: t('enums.authOptions.fetch.desc', 'Fetch a token from a web service')},
  ];

  const METHOD_OPTIONS = [
    {label: t('enums.methodOptions.get.name', 'Get'), value: Method.Get},
    {label: t('enums.methodOptions.put.name', 'Put'), value: Method.Put},
  ];

  const onConnectionTypeChange = (selectableValue: ComboboxOption<ConnectionType>) => {
    onOptionsChange({
      ...options,
      jsonData: {
        ...jsonData,
        connectionType: selectableValue.value,
      },
    });
  };

  const onAuthTypeChange = (selectableValue: ComboboxOption<AuthType>) => {
    onOptionsChange({
      ...options,
      jsonData: {
        ...jsonData,
        authType: selectableValue.value,
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

  const onMethodChange = (selectableValue: ComboboxOption<Method>) => {
    onOptionsChange({
      ...options,
      jsonData: {
        ...jsonData,
        fetchMethod: selectableValue.value,
      },
    });
  };

  const onFetchTokenChange = (event: ChangeEvent<HTMLInputElement>) => {
    onOptionsChange({
      ...options,
      jsonData: {
        ...jsonData,
        fetchToken: event.target.value,
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

  const onImportStatementsChange = (event: ChangeEvent<HTMLTextAreaElement>) => {
    const val = event.target.value;
    onOptionsChange({
      ...options,
      jsonData: {
        ...jsonData,
        importStatements: val.length > 0 ? val : undefined,
      },
    });
  }

  return (
    <>
      <InlineField label={t('connectionType', 'Connection Type')} labelWidth={20} interactive tooltip={t('typeOfConnection', 'Type of connection')}>
        <Combobox
          id="config-editor-conn-type"
          options={CONN_OPTIONS}
          onChange={onConnectionTypeChange}
          value={jsonData.connectionType}
          width={40}
        />
      </InlineField>
      { jsonData.connectionType === ConnectionType.Auto &&
        <InlineField label={t('authType', 'Auth Type')} labelWidth={20} interactive tooltip={t('typeOfAuthentication', 'Type of authentication')}>
          <Combobox
            id="config-editor-auth-type"
            options={AUTH_OPTIONS}
            onChange={onAuthTypeChange}
            value={jsonData.authType}
            width={40}
          />
        </InlineField>
      }
      { jsonData.connectionType === ConnectionType.Auto && jsonData.authType === AuthType.RawToken &&
        <InlineField label="Token" labelWidth={20} interactive tooltip={t('tokenForJupyterlabAuth', 'Token for Jupyterlab auth')}>
          <Input
            id="config-editor-raw-token"
            onChange={onRawTokenChange}
            value={jsonData.rawToken}
            placeholder={t('enterTheToken', 'Enter the token')}
            width={40}
          />
        </InlineField>
      }
      { jsonData.connectionType === ConnectionType.Auto && jsonData.authType === AuthType.Fetch &&
        <InlineField label={t('tokenUrl', 'Token URL')} labelWidth={20} interactive tooltip={t('urlToFetchTheJupyterlabTokenFrom', 'URL to fetch the Jupyterlab token from')}>
          <Input
            id="config-editor-route"
            onChange={onRouteChange}
            value={jsonData.fetchRoute}
            placeholder={t('enterTheTokenUrlEgHttplocalhosttokensjupyter', 'Enter the token URL, e.g. http://localhost/tokens/jupyter')}
            width={40}
          />
        </InlineField>
      }
      { jsonData.connectionType === ConnectionType.Auto && jsonData.authType === AuthType.Fetch &&
        <InlineField label="Method" labelWidth={20} interactive tooltip={t('httpMethodForFetchingTheJupyterlabToken', 'HTTP method for fetching the Jupyterlab token')}>
          <Combobox
            id="config-editor-method"
            options={METHOD_OPTIONS}
            onChange={onMethodChange}
            value={jsonData.fetchMethod}
            width={40}
          />
        </InlineField>
      }
      { jsonData.connectionType === ConnectionType.Auto && jsonData.authType === AuthType.Fetch &&
        <InlineField label={t('fetchToken', 'Fetch Token')} labelWidth={20} interactive tooltip={t('bearerTokenForFetchingTheJupyterlabToken', 'Bearer token for fetching the Jupyterlab token')}>
          <Input
            id="config-editor-fetch-token"
            onChange={onFetchTokenChange}
            value={jsonData.fetchToken}
            placeholder={t('enterTheBearerTokenForFetchingTheJupyterToken', 'Enter the Bearer token for fetching the Jupyter token')}
            width={40}
          />
        </InlineField>
      }
      { jsonData.connectionType === ConnectionType.Auto &&
        <InlineField label={t('jupyterlabUrl', 'Jupyterlab URL')} labelWidth={20} interactive tooltip={t('jupyterlabEndpointUrl', 'Jupyterlab endpoint URL')}>
          <Input
            id="config-jupyter-url"
            onChange={onJupyterUrlChange}
            value={jsonData.jupyterUrl}
            placeholder={t('enterTheJupyterlabUrlEgHttplocalhost8888', 'Enter the Jupyterlab URL, e.g. http://localhost:8888/')}
            width={40}
          />
        </InlineField>
        }
      <InlineField label={t('importStatements', 'Import Statements')} labelWidth={20} interactive tooltip={t('importStatementsToRunForEveryKernel', 'Import statements to run for every kernel')}>
        <TextArea
          style={{resize: 'both'}}
          id="config-import-statements"
          onChange={onImportStatementsChange}
          value={jsonData.importStatements || ""}
          placeholder={t('enterDefaultImportStatements', 'Enter default import statements')}
          rows={12}
          cols={80}
        />
      </InlineField>
    </>
  );
}
