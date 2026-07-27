import { css } from '@emotion/css';
import React, { useMemo, ChangeEvent } from 'react';
import { Button, Checkbox, CodeEditor, Combobox, ComboboxOption, InlineField, InlineFieldRow, Input } from '@grafana/ui';
import { DataSourcePluginOptionsEditorProps } from '@grafana/data';
import { AuthType, ConnectionType, MyDataSourceOptions, MySecureJsonData } from '../types';
import { getJupyterLabUrl, openWindow } from '../utils';
import { t } from '@grafana/i18n';

interface Props extends DataSourcePluginOptionsEditorProps<MyDataSourceOptions, MySecureJsonData> {}

export function ConfigEditor(props: Props) {
  const { onOptionsChange, options } = props;
  const { jsonData } = options;

  const CONN_OPTIONS = useMemo(() => [
    {label: t('enums.connOptions.automatic.name', 'Automatic'), value: ConnectionType.Auto, description: t('enums.connOptions.automatic.desc', 'Start or connect to a kernel via the JupyterLab API')},
    {label: t('enums.connOptions.connectionInfo.name', 'Connection Info'), value: ConnectionType.Info, description: t('enums.connOptions.connectionInfo.desc', 'Paste JSON connection info directly')},
  ], []);

  const AUTH_OPTIONS = useMemo(() => [
    {label: t('enums.authOptions.none.name', 'None'), value: AuthType.None, description: t('enums.authOptions.none.desc', 'No authentication')},
    {label: t('enums.authOptions.rawToken.name', 'Raw Token'), value: AuthType.RawToken, description: t('enums.authOptions.rawToken.desc', 'Enter a token directly')},
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

  const onPreludeChange = (val: string) => {
    onOptionsChange({
      ...options,
      jsonData: {
        ...jsonData,
        prelude: val.length > 0 ? val : undefined,
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
        <InlineField label={t('configEditor.rawToken.label', 'Token')} labelWidth={20} interactive tooltip={t('configEditor.rawToken.tooltip', 'Token for JupyterLab auth')}>
          <Input
            id="config-editor-raw-token"
            onChange={onRawTokenChange}
            value={jsonData.rawToken}
            placeholder={t('configEditor.rawToken.placeholder', 'Enter the token')}
            width={40}
          />
        </InlineField>
      }
      { jsonData.connectionType === ConnectionType.Auto &&
        <InlineFieldRow>
          <InlineField label={t('configEditor.jupyterUrl.label', 'JupyterLab URL')} labelWidth={20} interactive tooltip={t('configEditor.jupyterUrl.tooltip', 'JupyterLab endpoint URL')}>
            <Input
              id="config-jupyter-url"
              onChange={onJupyterUrlChange}
              value={jsonData.jupyterUrl}
              placeholder={t('configEditor.jupyterUrl.placeholder', 'Enter the JupyterLab URL, e.g. http://localhost:8888/')}
              width={40}
            />
          </InlineField>
        <Button
          disabled={getJupyterLabUrl(options.jsonData) === null}
          onClick={() => openWindow(getJupyterLabUrl(options.jsonData))}>
          {t('configEditor.openJupyterLab.buttonText', 'Open JupyterLab')}
        </Button>
        </InlineFieldRow>
        }
      { jsonData.connectionType === ConnectionType.Auto &&
        <InlineFieldRow>
          <InlineField label={t('configEditor.insecureSkipVerify.label', 'Allow Insecure HTTPS')} labelWidth={20} interactive tooltip={t('configEditor.insecureSkipVerify.tooltip', 'Ignore TLS cert errors when connecting to JupyterLab API')}>
            <Checkbox
              id="config-jupyter-insecure-skip-verify"
              onClick={(event) => onOptionsChange({
                ...options,
                jsonData: {
                  ...jsonData,
                  insecureSkipVerify: event.currentTarget.checked,
                },
              })}
              checked={jsonData.insecureSkipVerify}
            />
          </InlineField>
        </InlineFieldRow>
      }
      <InlineField label={t('configEditor.packages.label', 'Packages')} labelWidth={20} interactive tooltip={t('configEditor.packages.tooltip', 'Packages to install for every kernel')}>
      <>
      { (jsonData.packages||[]).map((pkg, index) => (
        <InlineFieldRow key={index}>
          <Input
            id={`config-editor-packages-${index}`}
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
      <InlineField label={t('configEditor.prelude.label', 'Prelude')} labelWidth={20} interactive tooltip={t('configEditor.prelude.tooltip', 'Code to run at start for every kernel')}>
        <CodeEditor
          value={jsonData.prelude ?? ""}
          language="python"
          onChange={onPreludeChange}
          containerStyles={css`overflow: hidden; resize: both; width: 80em; height: 25em`}
          showLineNumbers={true}
        />
      </InlineField>
    </>
  );
}
