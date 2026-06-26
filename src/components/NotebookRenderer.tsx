import React from 'react';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { materialDark as dark, materialLight as light } from 'react-syntax-highlighter/dist/esm/styles/prism';
import { marked } from 'marked';
import DOMPurify from 'dompurify';
import { Notebook } from '@theia/types';
import { useTheme2 } from '@grafana/ui';

interface Props {
  notebook: Notebook;
}

export function NotebookRenderer({notebook}: Props) {
  const theme = useTheme2();
  const style = theme.isLight ? light : dark;

  const cells = notebook.content.cells.map((cell, idx) => (
    cell.cell_type === 'code' ? (
      <SyntaxHighlighter
        language={'python'}
        key={idx}
        style={style}
        showLineNumbers={true}>
        {cell.source}
      </SyntaxHighlighter>
    ) : (
      <div key={idx} dangerouslySetInnerHTML={{__html:DOMPurify.sanitize(marked.parse(cell.source, {async: false}))}}>
      </div>
    )
  ))
  return <div>{cells}</div>;
}
