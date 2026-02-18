import React, { ChangeEvent } from 'react';
import { InlineField, Stack, TextArea } from '@grafana/ui';
import { QueryEditorProps } from '@grafana/data';
import { DataSource } from '../datasource';
import { MyDataSourceOptions, MyQuery } from '../types';

type Props = QueryEditorProps<DataSource, MyQuery, MyDataSourceOptions>;

export function QueryEditor({ query, onChange, onRunQuery }: Props) {
  const onCodeChange = (event: ChangeEvent<HTMLTextAreaElement>) => {
    onChange({ ...query, code: event.target.value });
  };

  const onVariablesChange = (event: ChangeEvent<HTMLTextAreaElement>) => {
    onChange({ ...query, vars: event.target.value });
  };

  return (
    <Stack gap={0}>
      <InlineField label="Code" labelWidth={16} tooltip="Code to run">
        <TextArea
          id="query-editor-code"
          onChange={onCodeChange}
          value={query.code || ''}
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
          value={query.vars || ''}
          required
          placeholder="Enter python code"
          width={40}
          rows={12}
        />
      </InlineField>
    </Stack>
  );
}
