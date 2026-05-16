const actual = jest.requireActual('@grafana/ui');

import React from 'react';
import { omit } from 'lodash';

module.exports = {
  ...actual,
  // monaco appears to be untestable
  CodeEditor: (props: any) => (<actual.TextArea {...(omit(props, 'containerStyles', 'showLineNumbers') as any)} />),
};
