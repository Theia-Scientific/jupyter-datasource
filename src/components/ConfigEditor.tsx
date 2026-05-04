import React, { useMemo, ChangeEvent } from 'react';
import { Button, Combobox, ComboboxOption, InlineField, InlineFieldRow, Input, TextArea } from '@grafana/ui';
import { DataSourcePluginOptionsEditorProps } from '@grafana/data';
import { AuthType, ConnectionType, Method, MyDataSourceOptions, MySecureJsonData } from '../types';
import { t } from '@grafana/i18n';

interface Props extends DataSourcePluginOptionsEditorProps<MyDataSourceOptions, MySecureJsonData> {}

export function ConfigEditor(props: Props) {
  const { onOptionsChange, options } = props;
  const { jsonData } = options;

  const CONN_OPTIONS = useMemo(() => [
    {label: t('enums.connOptions.automatic.name', 'Automatic'), value: ConnectionType.Auto, description: t('enums.connOptions.automatic.desc', 'Start or connect to a kernel via the Jupyterlab API')},
    {label: t('enums.connOptions.connectionInfo.name', 'Connection Info'), value: ConnectionType.Info, description: t('enums.connOptions.connectionInfo.desc', 'Paste JSON connection info directly')},
  ], []);

  const AUTH_OPTIONS = useMemo(() => [
    {label: t('enums.authOptions.none.name', 'None'), value: AuthType.None, description: t('enums.authOptions.none.desc', 'No authentication')},
    {label: t('enums.authOptions.rawToken.name', 'Raw Token'), value: AuthType.RawToken, description: t('enums.authOptions.rawToken.desc', 'Enter a token directly')},
    {label: t('enums.authOptions.fetch.name', 'Fetch'), value: AuthType.Fetch, description: t('enums.authOptions.fetch.desc', 'Fetch a token from a web service')},
  ], []);

  const METHOD_OPTIONS = useMemo(() => [
    {label: t('enums.methodOptions.get.name', 'Get'), value: Method.Get},
    {label: t('enums.methodOptions.put.name', 'Put'), value: Method.Put},
  ], []);

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
      <InlineField label={t('configEditor.connectionType.label', 'Connection Type')} labelWidth={20} interactive tooltip={t('configEditor.connectionType.tooltip', 'Type of connection')}>
        <Combobox
          id="config-editor-conn-type"
          options={CONN_OPTIONS}
          onChange={onConnectionTypeChange}
          value={jsonData.connectionType}
          width={40}
        />
      </InlineField>
      { jsonData.connectionType === ConnectionType.Auto &&
        <InlineField label={t('configEditor.authType.label', 'Auth Type')} labelWidth={20} interactive tooltip={t('configEditor.authType.tooltip', 'Type of authentication')}>
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
        <InlineField label={t('configEditor.rawToken.label', 'Token')} labelWidth={20} interactive tooltip={t('configEditor.rawToken.tooltip', 'Token for Jupyterlab auth')}>
          <Input
            id="config-editor-raw-token"
            onChange={onRawTokenChange}
            value={jsonData.rawToken}
            placeholder={t('configEditor.rawToken.placeholder', 'Enter the token')}
            width={40}
          />
        </InlineField>
      }
      { jsonData.connectionType === ConnectionType.Auto && jsonData.authType === AuthType.Fetch &&
        <InlineField label={t('configEditor.tokenUrl.label', 'Token URL')} labelWidth={20} interactive tooltip={t('configEditor.tokenUrl.tooltip', 'URL to fetch the Jupyterlab token from')}>
          <Input
            id="config-editor-route"
            onChange={onRouteChange}
            value={jsonData.fetchRoute}
            placeholder={t('configEditor.tokenUrl.placeholder', 'Enter the token URL, e.g. http://localhost/tokens/jupyter')}
            width={40}
          />
        </InlineField>
      }
      { jsonData.connectionType === ConnectionType.Auto && jsonData.authType === AuthType.Fetch &&
        <InlineField label={t('configEditor.tokenMethod.label', 'Method')} labelWidth={20} interactive tooltip={t('configEditor.tokenMethod.tooltip', 'HTTP method for fetching the Jupyterlab token')}>
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
        <InlineField label={t('configEditor.fetchToken.label', 'Fetch Token')} labelWidth={20} interactive tooltip={t('configEditor.fetchToken.tooltip', 'Bearer token for fetching the Jupyterlab token')}>
          <Input
            id="config-editor-fetch-token"
            onChange={onFetchTokenChange}
            value={jsonData.fetchToken}
            placeholder={t('configEditor.fetchToken.placeholder', 'Enter the Bearer token for fetching the Jupyter token')}
            width={40}
          />
        </InlineField>
      }
      { jsonData.connectionType === ConnectionType.Auto &&
        <InlineField label={t('configEditor.jupyterUrl.label', 'Jupyterlab URL')} labelWidth={20} interactive tooltip={t('configEditor.jupyterUrl.tooltip', 'Jupyterlab endpoint URL')}>
          <Input
            id="config-jupyter-url"
            onChange={onJupyterUrlChange}
            value={jsonData.jupyterUrl}
            placeholder={t('configEditor.jupyterUrl.placeholder', 'Enter the Jupyterlab URL, e.g. http://localhost:8888/')}
            width={40}
          />
        </InlineField>
        }
      <InlineField label={t('configEditor.packages.label', 'Packages')} labelWidth={20} interactive tooltip={t('configEditor.packages.tooltip', 'Packages to install for every kernel')}>
      <>
      { (jsonData.packages||[]).map((pkg, index) => (
        <InlineFieldRow key={index}>
          <Input
            id={`config-editor-packages-{i}`}
            onChange={(event: ChangeEvent<HTMLInputElement>) =>
              onOptionsChange({
                ...options,
                jsonData: {
                  ...jsonData,
                  packages: jsonData.packages.map((el,i) => (
                    index === i ? event.target.value : el
                  ))
                },
              })
            }
            value={pkg}
            placeholder={t('configEditor.packages.placeholder', 'numpy==2.4.4')}
            width={40}
          />
          <Button
            icon="minus"
            aria-label={t('configEditor.packages.remove', 'Remove Package')}
            variant="destructive"
            onClick={() => onOptionsChange({
                ...options,
                jsonData: {
                  ...jsonData,
                  packages: jsonData.packages.slice(0,index).concat(jsonData.packages.slice(index+1))
                },
              })
            }
          />
        </InlineFieldRow>
      )) }
      <Button
        onClick={() =>
          onOptionsChange({
            ...options,
            jsonData: {
              ...jsonData,
              packages: (jsonData.packages||[]).concat([''])
            },
          })
        }
        icon="plus"
      >
        {t('configEditor.packages.add', 'Add Package')}
      </Button>
    </>
      </InlineField>
      <InlineField label={t('configEditor.importStatements.label', 'Import Statements')} labelWidth={20} interactive tooltip={t('configEditor.importStatements.tooltip', 'Import statements to run for every kernel')}>
        <TextArea
          style={{resize: 'both'}}
          id="config-import-statements"
          onChange={onImportStatementsChange}
          value={jsonData.importStatements || ""}
          placeholder={t('configEditor.importStatements.placeholder', 'Enter default import statements')}
          rows={12}
          cols={80}
        />
      </InlineField>
    </>
  );
}
