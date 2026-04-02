import React, { ChangeEvent, useState, useEffect } from 'react';
import { useLatest } from 'react-use';
import { Button, InlineField, InlineFieldRow, TextArea, Input, Combobox, ComboboxOption, CodeEditor } from '@grafana/ui';
import { QueryEditorProps } from '@grafana/data';
import { DataSource } from '../datasource';
import { ConnectionType, KernelSpec, KernelSpecResponse, MyDataSourceOptions, MyQuery, QueryFieldVariable } from '../types';
import { QueryFieldVariablesEditor } from './QueryFieldVariablesEditor';

type Props = QueryEditorProps<DataSource, MyQuery, MyDataSourceOptions>;

export function QueryEditor({ datasource, query, onChange, onRunQuery }: Props) {
  const { connectionType } = datasource.options;

  // have to keep the latest version of query in a ref because the
  // Monaco code editor caches it for some reason at mount time:
  // https://github.com/grafana/grafana/issues/81687
  const latestQuery = useLatest(query);

  const onKernelIdChange = (selectableValue: ComboboxOption<string>) => {
    onChange({ ...query, kernelId: selectableValue.value });
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

  const onNotebookChange = (selectableValue: ComboboxOption<string>) => {
    onChange({ ...query, notebook: selectableValue.value });
  };

  const onCodeChange = (value: string) => {
    onChange({ ...latestQuery.current, code: value });
  };

  const onVariablesChange = (variables: QueryFieldVariable[]) => {
    onChange({ ...query, vars: variables });
  };

  let [notebooks, setNotebooks] = useState<Array<ComboboxOption<string>>>([]);
  if (notebooks.length > 0 && query.notebook === undefined) {
    onChange({...query, notebook: ''});
  }

  useEffect(() => {
    datasource.getNotebooks().then((response: string[]) => {
      let notebooks: Array<ComboboxOption<string>> = response.map((s) => ({
        label: s,
        value: s,
      }));
      const defaultOption = {label: "Literal code", description: "Enter code below", value: ''};
      notebooks.unshift(defaultOption);
      setNotebooks(notebooks);
    });
  }, [datasource]);

  let [kernels, setKernels] = useState<Array<ComboboxOption<string>>>([]);
  if (kernels.length > 0 && query.kernelId === undefined) {
    onChange({...query, kernelId: ''});
  }

  const refreshKernels = () => {
    datasource.getKernels().then((response: KernelSpec[]) => {
      let kernels: Array<ComboboxOption<string>> = response.map((ks) => ({
        label: `${ks.name} (${ks.id.slice(0,8)})`,
        value: ks.id,
      }));
      const defaultOption = {label: "New Kernel", description: "Start a new kernel", value: ''};
      kernels.unshift(defaultOption);
      setKernels(kernels);
    });
  };
  useEffect(refreshKernels, [datasource]);

  let [kernelTypes, setKernelTypes] = useState<Array<ComboboxOption<string>>>([]);
  let [defaultKernelType, setDefaultKernelType] = useState<string|undefined>(undefined);
  if (defaultKernelType !== undefined && query.kernelType === undefined) {
    onChange({...query, kernelType: defaultKernelType});
  }

  useEffect(() => {
    datasource.getKernelSpecs().then((response: KernelSpecResponse) => {
      let kernelTypes: Array<ComboboxOption<string>> =
        Object.entries(response.kernelspecs).map(([_, spec]) => ({
          label: spec.spec.display_name,
          value: spec.name
        }));
      setKernelTypes(kernelTypes);
      setDefaultKernelType(response.default);
    });
  }, [datasource]);

  return (
      <>
      { connectionType === ConnectionType.Auto &&
        <InlineFieldRow>
          <InlineField label="Kernel ID" labelWidth={16} tooltip="Kernel ID for executing query">
            <Combobox
              id="query-editor-kernel-id"
              options={kernels}
              onChange={onKernelIdChange}
              value={query.kernelId}
              width={40}
            />
          </InlineField>
          <Button aria-label="Refresh Kernels" icon="sync"onClick={refreshKernels} />
        </InlineFieldRow>
      }
      { connectionType === ConnectionType.Info &&
        <InlineField label="Kernel Type" labelWidth={16} tooltip="Kernel type (e.g. python3)">
          <Input
            id="query-editor-kernel-type-info"
            onChange={onKernelTypeChangeInfo}
            value={query.kernelType}
            placeholder="python3"
            width={40}
          />
        </InlineField>
      }
      { connectionType === ConnectionType.Auto &&
        <InlineField label="Kernel Type" labelWidth={16} tooltip="Kernel type (e.g. python3)">
          <Combobox
            id="query-editor-kernel-type-auto"
            options={kernelTypes}
            onChange={onKernelTypeChangeAuto}
            value={query.kernelType}
            width={40}
          />
        </InlineField>
      }
      { connectionType === ConnectionType.Info &&
        <InlineField label="Connection Info" labelWidth={16} tooltip="Connection file from Jupyterlab">
          <TextArea
            style={{resize: 'both'}}
            id="query-editor-connection-info"
            onChange={onConnectionInfoChange}
            value={query.connectionInfo}
            required
            placeholder="Enter connection info"
            rows={12}
            cols={80}
          />
        </InlineField>
      }
      <InlineField label="Variables" labelWidth={16} tooltip="Variables to bind">
        <QueryFieldVariablesEditor
          value={query.vars ?? []}
          onChange={onVariablesChange}
        />
      </InlineField>
      { connectionType === ConnectionType.Auto &&
        <InlineField label="Notebook" labelWidth={16} tooltip="Notebook to run">
          <Combobox
            id="query-editor-notebook"
            options={notebooks}
            onChange={onNotebookChange}
            value={query.notebook}
            width={40}
          />
        </InlineField>
      }
      { (connectionType === ConnectionType.Info || query.notebook === "" || query.notebook === undefined) &&
        <InlineField label="Code" labelWidth={16} tooltip="Code to run">
          <CodeEditor
            value={query.code}
            language="python"
            onChange={onCodeChange}
            width="80em"
            height="12em"
          />
        </InlineField>
      }
    </>
  );
}
