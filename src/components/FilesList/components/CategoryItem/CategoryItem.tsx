import { Icon, IconButton, Input, useStyles2 } from '@grafana/ui';
import { TEST_IDS } from '@theia/constants';
import React, { useCallback, useEffect, useState } from 'react';

import { AddMode, WebDavDirectory } from '../../types';
import { CategoryCollapse } from '../CategoryCollapse';
import { NewItem } from '../NewItem';
import { getStyles } from './CategoryItem.styles';

/**
 * Properties
 */
interface Props {
  /**
   * Item
   *
   * @type {WebDavDirectory}
   */
  item: WebDavDirectory;

  /**
   * Children
   *
   * @type {React.ReactElement}
   */
  children: React.ReactElement;

  /**
   * On Change Name
   * @param item
   * @param name
   */
  onChangeName: (item: WebDavDirectory, name: string) => Promise<void>;

  /**
   * Load Tree
   * @param item
   */
  loadTree: (item: WebDavDirectory) => void;

  /**
   * Accept
   *
   * @type {string}
   */
  accept?: string;

  /**
   * On Create Category
   */
  onCreateCategory: (category: WebDavDirectory, name: string) => Promise<void>;

  /**
   * On Upload Files
   */
  onUploadFiles: (category: WebDavDirectory, files: File[]) => Promise<void>;

  /**
   * Is Expanded
   *
   * @type {boolean}
   */
  isExpanded: boolean;

  /**
   * Is Loading
   *
   * @type {boolean}
   */
  isLoading: boolean;

  /**
   * On Expand
   */
  onExpand: (item: WebDavDirectory, isExpanded: boolean) => void;

  /**
   * On Remove
   */
  onRemove: (item: WebDavDirectory) => void;

  /**
   * Edit
   *
   * @type {boolean}
   */
  edit: boolean;
}

/**
 * Category Item
 */
export const CategoryItem: React.FC<Props> = ({
  item,
  children,
  onChangeName,
  loadTree,
  accept,
  onCreateCategory,
  onUploadFiles,
  isExpanded,
  isLoading,
  onExpand,
  onRemove,
  edit,
}) => {
  /**
   * Styles
   */
  const styles = useStyles2(getStyles);

  /**
   * States
   */
  const [updating, setUpdating] = useState(false);
  const [isEdit, setIsEdit] = useState(false);
  const [name, setName] = useState(item.name);
  const [addMode, setAddMode] = useState(AddMode.NONE);

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
   * Add Category
   */
  const addCategory = useCallback(
    (name: string) => {
      return onCreateCategory(item, name);
    },
    [item, onCreateCategory]
  );

  /**
   * Add Files
   */
  const addFiles = useCallback(
    (files: File[]) => {
      return onUploadFiles(item, files);
    },
    [item, onUploadFiles]
  );

  /**
   * Load Children
   */
  useEffect(() => {
    if (isExpanded && !item.children && !isLoading) {
      loadTree(item);
    }
  }, [isExpanded, isLoading, item, loadTree]);

  return (
    <CategoryCollapse
      title={
        <div className={styles.titleContainer}>
          <div className={styles.icon}>
            <Icon name={isExpanded ? 'folder-open' : 'folder'} />
          </div>
          <div className={styles.name} onClick={(event) => event.stopPropagation()}>
            {isEdit ? (
              <>
                <Input
                  autoFocus={true}
                  width={50}
                  value={name}
                  onChange={(event) => {
                    setName(event.currentTarget.value);
                  }}
                  data-testid={TEST_IDS.filesList.fieldCategoryName}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && name) {
                      onSaveName();
                    }

                    if (e.key === 'Escape') {
                      setIsEdit(false);
                    }
                  }}
                  placeholder={"Specify Folder Name"}
                />
                <IconButton
                  onClick={() => {
                    setIsEdit(false);
                  }}
                  name="times"
                  className={styles.editAction}
                  size="lg"
                  disabled={updating}
                  data-testid={TEST_IDS.filesList.buttonCategoryCancelEdit}
                  tooltip={"Cancel"}
                />
                <IconButton
                  disabled={updating}
                  onClick={onSaveName}
                  name={updating ? 'fa fa-spinner' : 'save'}
                  className={styles.editAction}
                  size="lg"
                  data-testid={TEST_IDS.filesList.buttonCategorySaveEdit}
                  tooltip={"Save"}
                />
              </>
            ) : (
              <div className={styles.text}>
                <span>{item.name}</span>
              </div>
            )}
          </div>
        </div>
      }
    actions={<></>}
      isOpen={isExpanded}
      className={styles.wrapper}
      contentClassName={styles.content}
      onToggle={(isOpen) => onExpand(item, isOpen)}
      headerTestId={TEST_IDS.filesList.category(item.path)}
      contentTestId={TEST_IDS.filesList.categoryContent(item.path)}
    >
      <>
        <NewItem
          onCreateDirectory={addCategory}
          onUploadFiles={addFiles}
          accept={accept}
          mode={addMode}
          setMode={setAddMode}
        />
        {children}
      </>
    </CategoryCollapse>
  );
};
