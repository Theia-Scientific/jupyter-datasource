import { Button } from '@grafana/ui';
import React from 'react';

import { QueryFieldVariable } from '../types';
import { QueryFieldVariableEditor } from './QueryFieldVariableEditor';
import { t } from '@grafana/i18n'

/**
 * Properties
 */
interface Props {
  /**
   * Value
   */
  value: QueryFieldVariable[];

  /**
   * Change
   */
  onChange: (value: QueryFieldVariable[]) => void;
}

/**
 * Query Field Filters
 */
export const QueryFieldVariablesEditor = ({
  value: variables,
  onChange,
}: Props) => {
  return (
    <div>
      {variables.map((variable, variableIndex) => (
        <QueryFieldVariableEditor
          key={variableIndex}
          value={variable}
          onChange={(value) => {
            onChange(variables.map((item, index) => (index === variableIndex ? value : item)));
          } }
          onDelete={() => {
            onChange(variables.filter((item, index) => index !== variableIndex));
          } } />
      ))}
      <Button
        onClick={() =>
          onChange(
            variables.concat({
              name: '',
              value: ''
            })
          )
        }
        icon="plus"
      >
        {t('addVariable', 'Add Variable')}
      </Button>
    </div>
  );
};
