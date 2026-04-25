import { Alert, Button, ButtonGroup, Combobox, InlineField, Input, useStyles2 } from '@grafana/ui';
import { BASE_WEB_DAV_URL, TEST_IDS } from '@theia/constants';
import React, { useEffect, useMemo, useState } from 'react';

import { TreeLevel } from './components/TreeLevel';
import { getStyles } from './FilesList.styles';
import { useFilesList, useTreeExpand } from './hooks';
import { Sort, WebDavDirectory, WebDavFile, WebDavItemType } from './types';
import { getPlainCategories } from './utils';
import type { DataSource } from '@theia/datasource';
import { t } from '@grafana/i18n'

/**
 * Properties
 */
interface Props {
  /**
   * Datasource
   */
  datasource: DataSource;

  /**
   * On Select File
   */
  onSelectFile: (item: WebDavFile) => void;

  /**
   * Root Path
   *
   * @type {string}
   */
  rootPath: string;
}

/**
 * Files List
 */
export const FilesList: React.FC<Props> = ({
  datasource,
  onSelectFile,
  rootPath,
}) => {
  /**
   * Styles
   */
  const styles = useStyles2(getStyles);

  const SORT_OPTIONS = useMemo(() => [
    {
      label: t('enums.sortOptions.nameAsc', 'Name: A to Z'),
      value: Sort.NAME_ASC,
    },
    {
      label: t('enums.sortOptions.nameDesc', 'Name: Z to A'),
      value: Sort.NAME_DESC,
    },
    {
      label: t('enums.sortOptions.lastModifiedAsc', 'Modified: oldest'),
      value: Sort.LAST_MODIFIED_ASC,
    },
    {
      label: t('enums.sortOptions.lastModifiedDesc', 'Modified: newest'),
      value: Sort.LAST_MODIFIED_DESC,
    },
    {
      label: t('enums.sortOptions.sizeAsc', 'Size: smallest'),
      value: Sort.SIZE_ASC,
    },
    {
      label: t('enums.sortOptions.sizeDesc', 'Size: biggest'),
      value: Sort.SIZE_DESC,
    },
  ], []);

  /**
   * States
   */
  const [isSearchEnabled, setIsSearchEnabled] = useState(false);

  /**
   * Sorting State
   */
  const [sort, setSort] = useState(Sort.NAME_ASC);

  /**
   * Search State
   */
  const [search, setSearch] = useState('');

  /**
   * Root Item
   */
  const rootItem: WebDavDirectory = useMemo(
    () => ({
      name: '',
      path: rootPath,
      relativePath: '',
      mtime: '',
      type: WebDavItemType.DIRECTORY,
      url: `${BASE_WEB_DAV_URL}${rootPath}`,
    }),
    [rootPath]
  );

  /**
   * Files List Data
   */
  const {
    tree,
    loadTree,
    loadingPath,
    error,
    clearError,
    refresh,
  } = useFilesList({
    rootItem,
    datasource,
  });

  /**
   * Categories List
   */
  const categoriesList = useMemo(() => {
    return getPlainCategories(tree);
  }, [tree]);

  /**
   * Tree Expand
   */
  const { onExpandAll, onCollapseAll, isItemExpanded, onSetItemExpanded } = useTreeExpand(categoriesList);

  /**
   * Collapse all on refresh
   */
  useEffect(() => {
    if (loadingPath.includes(rootItem.path)) {
      onCollapseAll();
    }
  }, [loadingPath, onCollapseAll, rootItem.path]);

  return (
    <div className={styles.root}>
      <div className={styles.header}>
        <ButtonGroup>
          <Button
            onClick={refresh}
            tooltip={t('filesList.refresh.tooltip', 'Refresh')}
            icon="sync"
            disabled={!!loadingPath.length}
            size="md"
            variant="secondary"
            data-testid={TEST_IDS.filesList.buttonRefresh}
          />
          <Button
            icon="angle-double-down"
            variant="secondary"
            onClick={onExpandAll}
            tooltip={t('filesList.expand.tooltip', 'Expand')}
            data-testid={TEST_IDS.filesList.buttonExpand}
          />
          <Button
            icon="angle-double-up"
            variant="secondary"
            onClick={onCollapseAll}
            tooltip={t('filesList.collapseAll.tooltip', 'Collapse All')}
            data-testid={TEST_IDS.filesList.buttonCollapse}
          />
          <Button
            icon="filter"
            variant="secondary"
            fill={isSearchEnabled ? 'outline' : 'solid'}
            tooltip={t('filesList.filter.tooltip', 'Filter')}
            data-testid={TEST_IDS.filesList.buttonToggleSearching}
            onClick={() => {
              setIsSearchEnabled((isSearchEnabled) => !isSearchEnabled);
              setSearch('');
            }}
          />
        </ButtonGroup>

        <InlineField label={t('filesList.sortBy.label', 'Sort By')}>
          <Combobox
            onChange={(opt) => {
              setSort(opt.value ?? Sort.NAME_ASC);
            }}
            options={SORT_OPTIONS}
            value={sort}
            data-testid={TEST_IDS.filesList.fieldSort}
          />
        </InlineField>
        {isSearchEnabled && (
          <InlineField label={t('filesList.search.label', 'Filter')}>
            <Input
              autoFocus={true}
              value={search}
              onChange={(event) => setSearch(event.currentTarget.value)}
              data-testid={TEST_IDS.filesList.fieldSearch}
              placeholder={t('filesList.search.placeholder', 'File name contains')}
            />
          </InlineField>
        )}
      </div>
      <div className={styles.list} data-testid={TEST_IDS.filesList.root}>
        {error && (
          <Alert
            className={styles.error}
            title={error}
            data-testid={TEST_IDS.filesList.errorMessage}
            onRemove={clearError}
            >
          </Alert>
        )}
        <TreeLevel
          tree={tree}
          loadingPath={loadingPath}
          loadTree={loadTree}
          onSelectFile={onSelectFile}
          sort={sort}
          searchQuery={search}
          isItemExpanded={isItemExpanded}
          onSetItemExpanded={onSetItemExpanded}
        />
      </div>
    </div>
  );
};
