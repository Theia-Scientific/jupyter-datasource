import React, { ChangeEvent } from 'react';
import { InlineField, TextArea, Input, Select } from '@grafana/ui';
import { QueryEditorProps, SelectableValue } from '@grafana/data';
import { DataSource } from '../datasource';
import { ConnectionType, MyDataSourceOptions, MyQuery } from '../types';

type Props = QueryEditorProps<DataSource, MyQuery, MyDataSourceOptions>;

export function QueryEditor({ datasource, query, onChange, onRunQuery }: Props) {
  const { connectionType } = datasource.options;

  const onKernelIdChange = (selectableValue: SelectableValue<string>) => {
    onChange({ ...query, kernelId: selectableValue.value });
  };

  const onKernelTypeChange = (event: ChangeEvent<HTMLInputElement>) => {
    onChange({ ...query, kernelType: event.target.value });
  };

  const onConnectionInfoChange = (event: ChangeEvent<HTMLTextAreaElement>) => {
    onChange({ ...query, connectionInfo: event.target.value });
  };

  const onNotebookChange = (selectableValue: SelectableValue<string>) => {
    onChange({ ...query, notebook: selectableValue.value });
  };

  const onCodeChange = (event: ChangeEvent<HTMLTextAreaElement>) => {
    onChange({ ...query, code: event.target.value });
  };

  const onVariablesChange = (event: ChangeEvent<HTMLTextAreaElement>) => {
    onChange({ ...query, vars: event.target.value });
  };

  // @TEMP
  let kernels = [
    {label: "New Kernel", description: "Start a new kernel"},
    {label: "python3 (foo)", value: 'foo'},
    {label: "python3 (bar)", value: 'bar'},
  ];

  let notebooks = [
    {label: "Literal code", description: "Enter code below"},
    {label: "Examples/untitled.ipynb", value: "Examples/untitled.ipynb"},
    {label: "Examples/database.ipynb", value: "Examples/database.ipynb"},
  ];

  return (
    <>
      { connectionType === ConnectionType.Auto &&
        <InlineField label="Kernel ID" labelWidth={16} tooltip="Kernel ID for executing query">
          <Select
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
        <Select
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
