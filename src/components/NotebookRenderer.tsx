import React from 'react';
import SyntaxHighlighter from 'react-syntax-highlighter';
import Markdown from 'react-markdown';
import { Notebook } from '@theia/types';

interface Props {
  notebook: Notebook;
}

export function NotebookRenderer({notebook}: Props) {
  const cells = notebook.content.cells.map((cell, idx) => (
    cell.cell_type === 'code' ? (
      <SyntaxHighlighter language={'python'} key={idx}>
        {cell.source}
      </SyntaxHighlighter>
    ) : (
      <Markdown key={idx}>
        {cell.source}
      </Markdown>
    )
  ))
  return <div>{cells}</div>;
}
