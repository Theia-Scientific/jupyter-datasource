import { formattedValueToString, getValueFormat } from '@grafana/data';
import { Card, TagList, useStyles2 } from '@grafana/ui';
import { TEST_IDS } from '@theia/constants';
import React from 'react';

import { WebDavFile } from '../../types';
import { getStyles } from './FileItem.styles';

/**
 * Properties
 */
interface Props {
  /**
   * Item
   *
   * @type {WebDavFile}
   */
  item: WebDavFile;

  /**
   * On Click Item
   *
   * @type {Function}
   */
  onClickItem: (item: WebDavFile) => void;
}

/**
 * File Item
 */
export const FileItem: React.FC<Props> = ({
  item,
  onClickItem,
}) => {
  /**
   * Styles
   */
  const styles = useStyles2(getStyles);

  /**
   * Meta
   */
  const meta = [];
  if (item.mtime) {
    meta.push(`Last modified at ${new Date(item.mtime).toLocaleString()}`);
  }

  /**
   * Tags
   */
  const tags = [];
  if (item.size) {
    tags.push(formattedValueToString(getValueFormat('decbytes')(item.size)));
  }

  return (
    <div className={styles.cardContainer} data-testid={TEST_IDS.filesList.file(item.path)}>
      <Card
        className={styles.card}
        style={{ minHeight: 58 }}
        onClick={() => onClickItem(item)}
      >
        <Card.Heading aria-label={TEST_IDS.filesList.fileName(item.path)}>{item.name}</Card.Heading>
        <Card.Tags>
          <TagList tags={tags} />
        </Card.Tags>
        <Card.Meta>{meta}</Card.Meta>
      </Card>
    </div>
  );
};
