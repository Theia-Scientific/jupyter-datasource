import React, { ChangeEvent, useState, useEffect } from 'react';
import { InlineField, TextArea, Input, Combobox, ComboboxOption } from '@grafana/ui';
import { QueryEditorProps } from '@grafana/data';
import { DataSource } from '../datasource';
import { ConnectionType, KernelSpec, MyDataSourceOptions, MyQuery } from '../types';

type Props = QueryEditorProps<DataSource, MyQuery, MyDataSourceOptions>;

export function QueryEditor({ datasource, query, onChange, onRunQuery }: Props) {
  const { connectionType } = datasource.options;

  const onKernelIdChange = (selectableValue: ComboboxOption<string>) => {
    onChange({ ...query, kernelId: selectableValue.value });
  };

  const onKernelTypeChange = (event: ChangeEvent<HTMLInputElement>) => {
    onChange({ ...query, kernelType: event.target.value });
  };

  const onConnectionInfoChange = (event: ChangeEvent<HTMLTextAreaElement>) => {
    onChange({ ...query, connectionInfo: event.target.value });
  };

  const onNotebookChange = (selectableValue: ComboboxOption<string>) => {
    onChange({ ...query, notebook: selectableValue.value });
  };

  const onCodeChange = (event: ChangeEvent<HTMLTextAreaElement>) => {
    onChange({ ...query, code: event.target.value });
  };

  const onVariablesChange = (event: ChangeEvent<HTMLTextAreaElement>) => {
    onChange({ ...query, vars: event.target.value });
  };

  let [notebooks, setNotebooks] = useState<Array<ComboboxOption<string>>>([]);

  useEffect(() => {
    datasource.getNotebooks().then((response: string[]) => {
      let notebooks: Array<ComboboxOption<string>> = response.map((s) => ({
        label: s,
        value: s,
      }));
      const defaultOption = {label: "Literal code", description: "Enter code below", value: ''};
      notebooks.unshift(defaultOption);
      setNotebooks(notebooks);
      if (query.notebook === undefined) {
        onNotebookChange(defaultOption);
      }
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [datasource]);

  let [kernels, setKernels] = useState<Array<ComboboxOption<string>>>([]);

  useEffect(() => {
    datasource.getKernels().then((response: KernelSpec[]) => {
      let kernels: Array<ComboboxOption<string>> = response.map((ks) => ({
        label: `${ks.name} (${ks.id})`,
        value: ks.id,
      }));
      const defaultOption = {label: "New Kernel", description: "Start a new kernel", value: ''};
      kernels.unshift(defaultOption);
      setKernels(kernels);
      console.log(`kernels loaded. current kernel id: `, query.kernelId);
      if (query.kernelId === undefined) { 
        console.log("selecting default kernel option");
        onKernelIdChange(defaultOption);
      }
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [datasource]);

  return (
    <>
      { connectionType === ConnectionType.Auto &&
        <InlineField label="Kernel ID" labelWidth={16} tooltip="Kernel ID for executing query">
          <Combobox
            id="query-editor-kernel-id"
            options={kernels}
            onChange={onKernelIdChange}
            value={query.kernelId}
            width={40}
          />
        </InlineField>
      }
      { connectionType === ConnectionType.Auto &&
        <InlineField label="Kernel Type" labelWidth={16} tooltip="Kernel type (e.g. python3)">
          <Input
            id="query-editor-kernel-type"
            onChange={onKernelTypeChange}
            value={query.kernelType}
            placeholder="python3"
            width={40}
          />
        </InlineField>
      }
      { connectionType === ConnectionType.Info &&
        <InlineField label="Connection Info" labelWidth={16} tooltip="Connection file from Jupyterlab">
          <TextArea
            id="query-editor-connection-info"
            onChange={onConnectionInfoChange}
            value={query.connectionInfo}
            required
            placeholder="Enter connection info"
            width={40}
            rows={12}
          />
        </InlineField>
      }
      <InlineField label="Notebook" labelWidth={16} tooltip="Notebook to run">
        <Combobox
          id="query-editor-notebook"
          options={notebooks}
          onChange={onNotebookChange}
          value={query.notebook}
          width={40}
        />
      </InlineField>
      <InlineField label="Code" labelWidth={16} tooltip="Code to run">
        <TextArea
          id="query-editor-code"
          onChange={onCodeChange}
          value={query.code}
          required
          placeholder="Enter python code"
          width={40}
          rows={12}
        />
      </InlineField>
      <InlineField label="Variables" labelWidth={16} tooltip="Variables to bind">
        <TextArea
          id="query-editor-variables"
          onChange={onVariablesChange}
          value={query.vars}
          required
          placeholder="Enter python code (Grafana variables will be substituted)"
          width={40}
          rows={12}
        />
      </InlineField>
    </>
  );
}
