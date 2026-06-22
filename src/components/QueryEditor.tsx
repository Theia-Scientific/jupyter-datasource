import { css } from '@emotion/css';
import React, { ChangeEvent, useState, useEffect } from 'react';
import { useLatest } from 'react-use';
import { Button, InlineField, InlineFieldRow, TextArea, Input, Combobox, ComboboxOption, CodeEditor} from '@grafana/ui';
import { QueryEditorProps } from '@grafana/data';
import { DataSource } from '../datasource';
import { ConnectionType, KernelSpec, KernelSpecResponse, MyDataSourceOptions, MyQuery, QueryFieldVariable } from '../types';
import { QueryFieldVariablesEditor } from './QueryFieldVariablesEditor';
import { NotebookRenderer } from './NotebookRenderer';
import { v4 as uuidv4 } from 'uuid';
import { FilesList } from './FilesList';
import { DEFAULT_QUERY, Notebook, PathEntryNotebook } from '@theia/types';
import { openJupyterLabNotebook } from '@theia/utils';
import { t } from '@grafana/i18n';

type Props = QueryEditorProps<DataSource, MyQuery, MyDataSourceOptions>;

function emptyNotebook(query: MyQuery) {
  return query.notebook === undefined || query.notebook === '';
}

const ENTER_CODE = "<enter code>";
const CHOOSE_NOTEBOOK = "<choose notebook>";

export function QueryEditor({ datasource, query, onChange, onRunQuery }: Props) {
  const { connectionType } = datasource.options;

  // have to keep the latest version of query in a ref because the
  // Monaco code editor caches it for some reason at mount time:
  // https://github.com/grafana/grafana/issues/81687
  const latestQuery = useLatest(query);

  // give every query a uuid (and defaults for all its props)
  useEffect(() => {
    if (query.uuid === undefined) {
      // The uuid module lies about its return types - it says that v4 returns a Uint8Array,
      // but in fact it only returns that if you provide a buf parameter, which we don't.
      // By default, it returns a string.  So we have to lie to the typechecker here.
      onChange({...DEFAULT_QUERY, ...query, uuid: uuidv4() as unknown as string })
    }
  }, [query, onChange]);

  const onKernelIdChange = (selectableValue: ComboboxOption<string>) => {
    onChange({ ...query, kernelId: selectableValue.value });
  };

  const onKernelTagChange = (event: ChangeEvent<HTMLInputElement>) => {
    onChange({ ...query, kernelTag: event.target.value });
  };

  const onKernelTypeChangeInfo = (event: ChangeEvent<HTMLInputElement>) => {
    onChange({ ...query, kernelType: event.target.value });
  };

  const onKernelTypeChangeAuto = (selectableValue: ComboboxOption<string>) => {
    onChange({ ...query, kernelType: selectableValue.value });
  };

  const onConnectionInfoChange = (event: ChangeEvent<HTMLTextAreaElement>) => {
    onChange({ ...query, connectionInfo: event.target.value });
  };

  const onCodeChange = (value: string) => {
    onChange({ ...latestQuery.current, code: value });
  };

  const onVariablesChange = (variables: QueryFieldVariable[]) => {
    onChange({ ...query, vars: variables });
  };

  let [kernels, setKernels] = useState<Array<ComboboxOption<string>>>([]);
  const refreshKernels = () => {
    datasource.getKernels().then((response: KernelSpec[]) => {
      const labelForSpec = (ks: KernelSpec): string => {
        const opts = { ...ks, id: ks.id.slice(0,8) };
        if (!!ks.notebook_path) {
          return t('queryEditor.kernelFormat.notebook', '{{name}} ({{id}}) [{{-notebook_path}}]', opts);
        } else {
          return t('queryEditor.kernelFormat.base', '{{name}} ({{id}})', opts);
        }
      };
      let kernels: Array<ComboboxOption<string>> = response.map((ks) => ({
        label: labelForSpec(ks),
        value: ks.id,
      }));
      const defaultOption = {
        label: t('queryEditor.newKernel.label', 'New Kernel'),
        description: t('queryEditor.newKernel.desc', 'Start a new kernel'),
        value: ''
      };
      kernels.unshift(defaultOption);
      setKernels(kernels);
    });
  };
  useEffect(refreshKernels, [datasource]);

  let [kernelTypes, setKernelTypes] = useState<Array<ComboboxOption<string>>>([]);
  useEffect(() => {
    datasource.getKernelSpecs().then((response: KernelSpecResponse) => {
      let kernelTypes: Array<ComboboxOption<string>> =
        Object.entries(response.kernelspecs).map(([_, spec]) => ({
          label: spec.spec.display_name,
          value: spec.name
        }));
      setKernelTypes(kernelTypes);
    });
  }, [datasource]);

  // css style to allow the Monaco editor to be handle-resized
  const containerStyle = css`overflow: hidden; resize: both; width: 80em; height: 25em`;

  const sources = [
    { label: t('queryEditor.source.code', 'Enter code below...'), value: ENTER_CODE },
    { label: t('queryEditor.source.notebook', 'Choose notebook below...'), value: CHOOSE_NOTEBOOK },
  ];
  const [source, setSource] = useState(() => emptyNotebook(query) ? ENTER_CODE : query.notebook);
  const [notebookContent, setNotebookContent] = useState<Notebook|undefined>(undefined);
  const setSourceAndUpdateNotebookContent = (source: string) => {
    setSource(source);
    if (source !== ENTER_CODE && source !== CHOOSE_NOTEBOOK) {
      datasource.getNotebook(source).then((content) => {
        console.log("notebook content: ", content);
        setNotebookContent(content);
      });
    } else {
      setNotebookContent(undefined);
    }
  };

  const onSelectFile = (f: PathEntryNotebook) => {
    setSourceAndUpdateNotebookContent(f.path);
    onChange({ ...query, notebook: f.path });
  };

  const runQueryButton = (
    <>
      <div style={{display: "block", flexGrow: 1}} />
      <Button icon="play" variant="primary" size="sm" onClick={() => onRunQuery()}>
        {t('queryEditor.runQuery.label', 'Run Query')}
      </Button>
    </>
  );

  const isAuto = (connectionType === ConnectionType.Auto);
  const isInfo = (connectionType === ConnectionType.Info);
  const kernelIdUnspecified = (query.kernelId === '');
  const notebookSource = (source === CHOOSE_NOTEBOOK);
  const codeSource = (source === ENTER_CODE);

  return (
    <>
      { isAuto &&
        <InlineFieldRow>
          <InlineField label={t('queryEditor.kernelId.label', 'Kernel ID')} labelWidth={16} tooltip={t('queryEditor.kernelId.tooltip', 'Kernel ID for executing query')}>
              <Combobox
                id="query-editor-kernel-id"
                options={kernels}
                onChange={onKernelIdChange}
                value={query.kernelId}
                width={40}
              />
            </InlineField>
          <Button aria-label={t('queryEditor.refreshKernels.label', 'Refresh Kernels')} icon="sync" onClick={refreshKernels} />
          {runQueryButton}
        </InlineFieldRow>
      }
      { isAuto && kernelIdUnspecified &&
        <InlineField label={t('queryEditor.kernelTag.label', 'Kernel Tag')} labelWidth={16} tooltip={t('queryEditor.kernelTag.tooltip', 'Kernel Tag for sharing kernel among queries')}>
          <Input
            id="query-editor-kernel-tag"
            onChange={onKernelTagChange}
            value={query.kernelTag}
            width={40}
          />
        </InlineField>
      }
      { isInfo &&
        <InlineFieldRow>
          <InlineField label={t('queryEditor.kernelType.label', 'Kernel Type')} labelWidth={16} tooltip={t('queryEditor.kernelType.tooltip', 'Kernel type (e.g. python3)')}>
            <Input
              id="query-editor-kernel-type-info"
              onChange={onKernelTypeChangeInfo}
              value={query.kernelType}
              placeholder="python3"
              width={40}
            />
          </InlineField>
          {runQueryButton}
        </InlineFieldRow>
      }
      { isAuto &&
        <InlineField label={t('queryEditor.kernelType.label', 'Kernel Type')} labelWidth={16} tooltip={t('queryEditor.kernelType.tooltip', 'Kernel type (e.g. python3)')}>
          <Combobox
            id="query-editor-kernel-type-auto"
            options={kernelTypes}
            onChange={onKernelTypeChangeAuto}
            value={query.kernelType}
            width={40}
          />
        </InlineField>
      }
      { isInfo &&
        <InlineField label={t('queryEditor.connectionInfo.label', 'Connection Info')} labelWidth={16} tooltip={t('queryEditor.connectionInfo.tooltip', 'Connection file from JupyterLab')}>
          <TextArea
            style={{resize: 'both'}}
            id="query-editor-connection-info"
            onChange={onConnectionInfoChange}
            value={query.connectionInfo}
            required
            placeholder={t('queryEditor.connectionInfo.placeholder', 'Enter connection info')}
            rows={12}
            cols={80}
          />
        </InlineField>
      }
      <InlineField label={t('queryEditor.variables.label', 'Variables')} labelWidth={16} tooltip={t('queryEditor.variables.tooltip', 'Variables to bind')}>
        <QueryFieldVariablesEditor
          value={query.vars ?? []}
          onChange={onVariablesChange}
        />
      </InlineField>
      { isAuto &&
        <InlineFieldRow>
          <InlineField label={t('queryEditor.source.label', 'Source')} labelWidth={16} tooltip={t('queryEditor.source.tooltip', 'Pick notebook or literal code')}>
            <Combobox
              id="query-editor-source"
              options={sources}
              onChange={(opt) => setSourceAndUpdateNotebookContent(opt.value)}
              value={source}
              width={40}
            />
          </InlineField>
          { !emptyNotebook(query) &&
            <Button onClick={() => openJupyterLabNotebook(datasource.options, query)}>{t('configEditor.openNotebook.buttonText', 'Open in JupyterLab')}</Button>
          }
        </InlineFieldRow>
      }
      { isAuto && notebookSource &&
        <FilesList
          datasource={datasource}
          onSelectFile={onSelectFile}
          rootPath=""
        />
      }
      { isAuto && !emptyNotebook(query) && notebookContent && 
        <NotebookRenderer notebook={notebookContent} />
      }
      { isAuto && !emptyNotebook(query) && !notebookContent &&
        <p>loading notebook...</p>
      }
      { (isInfo || codeSource) &&
        <InlineField label={t('queryEditor.code.label', 'Code')} labelWidth={16} tooltip={t('queryEditor.code.tooltip', 'Code to run')}>
          <CodeEditor
            value={query.code}
            language="python"
            onChange={onCodeChange}
            containerStyles={containerStyle}
            showLineNumbers={true}
          />
        </InlineField>
      }
    </>
  );
}
