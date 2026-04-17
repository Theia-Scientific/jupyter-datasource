import { formattedValueToString, getValueFormat } from '@grafana/data';
import { Card, IconButton, InlineField, InlineFieldRow, Input, TagList, useStyles2 } from '@grafana/ui';
import { TEST_IDS } from '@theia/constants';
import React, { useCallback, useState } from 'react';
import { useTranslation } from 'react-i18next';

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

  /**
   * On Change Name
   * @param item
   * @param name
   */
  onChangeName: (item: WebDavFile, name: string) => Promise<void>;

  /**
   * Download
   *
   * @type {boolean}
   */
  download: boolean;

  /**
   * Edit
   *
   * @type {boolean}
   */
  edit: boolean;

  /**
   * Select
   *
   * @type {boolean}
   */
  select: boolean;

  /**
   * On Remove
   */
  onRemove: (file: WebDavFile) => void;

  /**
   * Action Button
   *
   * @type {string}
   */
  actionButton?: string;
}

/**
 * File Item
 */
export const FileItem: React.FC<Props> = ({
  item,
  onClickItem,
  onChangeName,
  download,
  onRemove,
  edit,
  select,
  actionButton,
}) => {
  /**
   * Styles
   */
  const styles = useStyles2(getStyles);

  /**
   * Translation
   */
  const { t } = useTranslation();

  /**
   * States
   */
  const [name, setName] = useState(item.name);
  const [isEdit, setIsEdit] = useState(false);
  const [updating, setUpdating] = useState(false);

  /**
   * On Save Name
   */
  const onSaveName = useCallback(async () => {
    if (item.name !== name) {
      setUpdating(true);
      await onChangeName(item, name);
    }

    setUpdating(false);
    setIsEdit(false);
  }, [item, name, onChangeName]);

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
        onClick={() => {
          if (select) {
            onClickItem(item);
          }
        }}
      >
        <Card.Heading aria-label={TEST_IDS.filesList.fileName(item.path)}>{item.name}</Card.Heading>
        <Card.Tags>
          <TagList tags={tags} />
        </Card.Tags>
        <Card.Meta>{meta}</Card.Meta>
        <Card.Actions>
          {isEdit && (
            <InlineFieldRow onClick={(event) => event.stopPropagation()}>
              <InlineField grow>
                <Input
                  autoFocus={true}
                  value={name}
                  onChange={(event) => setName(event.currentTarget.value)}
                  data-testid={TEST_IDS.filesList.fieldFileName}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && name) {
                      onSaveName();
                    }

                    if (e.key === 'Escape') {
                      setIsEdit(false);
                    }
                  }}
                  placeholder={t('filesList.file.namePlaceholder')}
                />
              </InlineField>
              <div className={styles.editActions} onClick={(event) => event.stopPropagation()}>
                <IconButton
                  name="times"
                  disabled={updating}
                  onClick={() => setIsEdit(false)}
                  size="lg"
                  data-testid={TEST_IDS.filesList.buttonFileCancelEdit}
                  tooltip={t('filesList.file.cancelButton')}
                  variant="secondary"
                />
                <IconButton
                  name={updating ? 'fa fa-spinner' : 'save'}
                  disabled={updating}
                  size="lg"
                  onClick={onSaveName}
                  data-testid={TEST_IDS.filesList.buttonFileSaveEdit}
                  tooltip={t('filesList.file.saveButton')}
                  variant="secondary"
                />
              </div>
            </InlineFieldRow>
          )}
        </Card.Actions>

        <Card.SecondaryActions className={styles.cardButton}>
          <IconButton
            name="play"
            tooltip={actionButton || t('filesList.file.playButton')}
            onClick={() => {
              onClickItem(item);
            }}
            data-testid={TEST_IDS.filesList.buttonFilePlay}
            disabled={!select}
          />
          {download && (
            <a
              href={item.url}
              target="_blank"
              rel="noopener noreferrer"
              download
              data-testid={TEST_IDS.filesList.buttonDownload}
            >
              <IconButton name="download-alt" tooltip={t('filesList.file.downloadButton')} />
            </a>
          )}

          {!isEdit && (
            <IconButton
              name="edit"
              tooltip={t('filesList.file.renameButton')}
              onClick={() => {
                setIsEdit(true);
                setName(item.name);
              }}
              data-testid={TEST_IDS.filesList.buttonFileStartEdit}
              disabled={!edit}
            />
          )}

          <IconButton
            name="trash-alt"
            tooltip={t('filesList.file.deleteButton')}
            data-testid={TEST_IDS.filesList.buttonDeleteFile}
            onClick={() => onRemove(item)}
            disabled={!edit}
          />
        </Card.SecondaryActions>
      </Card>
    </div>
  );
};
