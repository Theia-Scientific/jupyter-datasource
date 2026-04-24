import { cx } from '@emotion/css';
import { Alert, Spinner, useStyles2, useTheme2 } from '@grafana/ui';
import { TEST_IDS } from '@theia/constants';
import React, { useCallback, useEffect, useMemo } from 'react';

import { Sort, WebDavDirectory, WebDavFile, WebDavItem, WebDavItemType } from '../../types';
import { getSortedItems } from '../../utils';
import { CategoryItem } from '../CategoryItem';
import { FileItem } from '../FileItem';
import { getStyles } from './TreeLevel.styles';

/**
 * Properties
 */
interface Props {
  /**
   * Tree
   *
   * @type {WebDavDirectory}
   */
  tree: WebDavDirectory;

  /**
   * Loading Path
   *
   * @type {string[]}
   */
  loadingPath: string[];

  /**
   * Load Tree
   *
   * @type {Function}
   */
  loadTree: (item: WebDavDirectory) => void;

  /**
   * On Select File
   *
   * @type {Function}
   */
  onSelectFile: (item: WebDavFile) => void;

  /**
   * On Change Name
   *
   * @type {Function}
   */
  onChangeName: (item: WebDavItem, newName: string) => Promise<boolean>;

  /**
   * Depth
   *
   * @type {number}
   */
  depth?: number;

  /**
   * On Set Item Selection
   */
  onSetItemSelection: (item: WebDavItem, selected: boolean) => void;

  /**
   * Is Parent Selected
   *
   * @type {boolean}
   */
  isParentSelected?: boolean;

  /**
   * Is Selected
   */
  isSelected: (item: WebDavItem) => boolean;

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
   * Sort
   *
   * @type {Sort}
   */
  sort: Sort;

  /**
   * Search Query
   *
   * @type {string}
   */
  searchQuery: string;

  /**
   * Is Item Expanded
   */
  isItemExpanded: (item: WebDavDirectory) => boolean;

  /**
   * Set Item Expanded
   */
  onSetItemExpanded: (item: WebDavDirectory, isExpanded: boolean) => void;

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
   * Action Button
   *
   * @type {string}
   */
  actionButton?: string;
}

/**
 * Tree Level
 */
export const TreeLevel: React.FC<Props> = ({
  tree,
  loadingPath,
  loadTree,
  onSelectFile,
  depth = 0,
  onChangeName,
  onSetItemSelection,
  isParentSelected = false,
  isSelected,
  accept,
  onCreateCategory,
  onUploadFiles,
  sort,
  searchQuery,
  isItemExpanded,
  onSetItemExpanded,
  download,
  edit,
  select,
  actionButton,
}) => {
  /**
   * Styles and Theme
   */
  const styles = useStyles2(getStyles);
  const theme = useTheme2();

  /**
   * Deselect children on parent selection
   */
  useEffect(() => {
    if (isParentSelected && tree.children?.length) {
      tree.children.forEach((item) => {
        if (isSelected(item)) {
          onSetItemSelection(item, false);
        }
      });
    }
  }, [isParentSelected, isSelected, onSetItemSelection, tree.children, tree.children?.length]);

  /**
   * On Change Item Name
   */
  const onChangeItemName = useCallback(
    async (item: WebDavItem, name: string) => {
      const isUpdated = await onChangeName(item, name);

      if (isUpdated && tree) {
        loadTree(tree);
      }
    },
    [loadTree, onChangeName, tree]
  );

  /**
   * Filtered Items
   */
  const filteredItems = useMemo(() => {
    if (!tree.children) {
      return [];
    }

    if (!searchQuery) {
      return tree.children;
    }

    const normalizedQuery = searchQuery.toLowerCase().trim();

    return tree.children.filter((item) => {
      if (item.type === WebDavItemType.DIRECTORY) {
        return true;
      }

      return item.name.toLowerCase().includes(normalizedQuery);
    });
  }, [searchQuery, tree.children]);

  /**
   * Sort Items
   */
  const items = useMemo(() => {
    return getSortedItems(filteredItems, sort);
  }, [sort, filteredItems]);

  return (
    <div
      style={{ paddingLeft: theme.spacing(depth) }}
      data-testid={TEST_IDS.filesList.tree(tree.path)}
      className={cx({
        [styles.rootLevel]: depth === 0,
      })}
    >
      {loadingPath.includes(tree.path) ? (
        <Spinner className={styles.spinner} />
      ) : (
        <>
          {items.length > 0 ? (
            items.map((item) => (
              <div
                key={item.name}
                className={cx(styles.item, {
                  [styles.directory]: item.type === WebDavItemType.DIRECTORY,
                })}
              >
                {item.type === WebDavItemType.DIRECTORY ? (
                  <CategoryItem
                    item={item}
                    loadTree={loadTree}
                    accept={accept}
                    onChangeName={onChangeItemName}
                    onCreateCategory={onCreateCategory}
                    onUploadFiles={onUploadFiles}
                    isExpanded={isItemExpanded(item)}
                    isLoading={loadingPath.includes(item.path)}
                    onExpand={onSetItemExpanded}
                    edit={edit}
                  >
                    <TreeLevel
                      tree={item}
                      loadingPath={loadingPath}
                      loadTree={loadTree}
                      onSelectFile={onSelectFile}
                      accept={accept}
                      depth={depth + 1}
                      onChangeName={onChangeName}
                      onCreateCategory={onCreateCategory}
                      onUploadFiles={onUploadFiles}
                      onSetItemSelection={onSetItemSelection}
                      isParentSelected={isParentSelected || isSelected(item)}
                      isSelected={isSelected}
                      sort={sort}
                      searchQuery={searchQuery}
                      isItemExpanded={isItemExpanded}
                      onSetItemExpanded={onSetItemExpanded}
                      download={download}
                      edit={edit}
                      select={select}
                      actionButton={actionButton}
                    />
                  </CategoryItem>
                ) : (
                  <FileItem
                    item={item}
                    onClickItem={onSelectFile}
                  />
                )}
              </div>
            ))
          ) : (
            <Alert severity="info" title="" data-testid={TEST_IDS.filesList.noFilesMessage}>
              {"No Files"}
            </Alert>
          )}
        </>
      )}
    </div>
  );
};
