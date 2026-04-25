import { cx } from '@emotion/css';
import { Alert, Spinner, useStyles2, useTheme2 } from '@grafana/ui';
import { TEST_IDS } from '@theia/constants';
import React, { useMemo } from 'react';

import { Sort, WebDavDirectory, WebDavFile, WebDavItemType } from '../../types';
import { getSortedItems } from '../../utils';
import { CategoryItem } from '../CategoryItem';
import { FileItem } from '../FileItem';
import { getStyles } from './TreeLevel.styles';
import { t } from '@grafana/i18n';

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
   * Depth
   *
   * @type {number}
   */
  depth?: number;

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
  sort,
  searchQuery,
  isItemExpanded,
  onSetItemExpanded,
}) => {
  /**
   * Styles and Theme
   */
  const styles = useStyles2(getStyles);
  const theme = useTheme2();

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
                    isExpanded={isItemExpanded(item)}
                    isLoading={loadingPath.includes(item.path)}
                    onExpand={onSetItemExpanded}
                  >
                    <TreeLevel
                      tree={item}
                      loadingPath={loadingPath}
                      loadTree={loadTree}
                      onSelectFile={onSelectFile}
                      depth={depth + 1}
                      sort={sort}
                      searchQuery={searchQuery}
                      isItemExpanded={isItemExpanded}
                      onSetItemExpanded={onSetItemExpanded}
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
              {t('treeLevel.noFiles', 'No Files')}
            </Alert>
          )}
        </>
      )}
    </div>
  );
};
