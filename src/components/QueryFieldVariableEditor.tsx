import { Button, InlineField, InlineFieldRow, Input } from '@grafana/ui';
import { QueryFieldVariable } from '../types';
import React from 'react';
import { t } from '@grafana/i18n';

/**
 * Properties
 */
interface QueryFieldVariableEditorProps {
  /**
   * Value
   *
   * @type {QueryFieldVariable}
   */
  value: QueryFieldVariable;

  /**
   * Change
   */
  onChange: (value: QueryFieldVariable) => void;

  /**
   * Delete
   */
  onDelete: () => void;
}

/**
 * Query Field Filter Editor
 */
export const QueryFieldVariableEditor = ({
  value,
  onChange,
  onDelete,
}: QueryFieldVariableEditorProps) => {

  return (
    <InlineFieldRow>
      <InlineField label={t('variableEditor.variable.label', 'Variable')}>
        <Input
          value={value.name}
          onChange={(event) => {
            onChange({
              ...value,
              name: event.currentTarget.value,
            });
          }}
        />
      </InlineField>
      =
      <InlineField grow={true}>
        <Input
          value={value.value}
          onChange={(event) => {
            onChange({
              ...value,
              value: event.currentTarget.value,
            });
          }}
        />
      </InlineField>
      <Button icon="trash-alt" aria-label={t('variableEditor.delete.label', 'Delete Variable')} variant="destructive" onClick={onDelete} />
    </InlineFieldRow>
  );
};
