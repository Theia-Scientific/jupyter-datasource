import { Alert, Button, ButtonGroup, Combobox, ConfirmModal, InlineField, InlineSwitch, Input, Modal, useStyles2 } from '@grafana/ui';
import { BASE_WEB_DAV_URL, TEST_IDS } from '@theia/constants';
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';

import { TreeLevel } from './components/TreeLevel';
import { SORT_OPTIONS } from './constants';
import { getStyles } from './FilesList.styles';
import { useFilesList, useTreeExpand } from './hooks';
import { AddMode, Sort, WebDavDirectory, WebDavFile, WebDavItem, WebDavItemType } from './types';
import { getPlainCategories } from './utils';
import type { DataSource } from '@theia/datasource';

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

  /**
   * Upload File
   */
  uploadFile?: (category: WebDavDirectory, file: File) => Promise<void>;

  /**
   * Accept
   *
   * @type {string}
   */
  accept?: string;

  /**
   * Download
   */
  download?: boolean;

  /**
   * Edit
   *
   * @type {boolean}
   */
  edit?: boolean;

  /**
   * Select
   *
   * @type {boolean}
   */
  select?: boolean;

  /**
   * Action Button
   *
   * @type {string}
   */
  actionButton?: string;

  /**
   * Analyze Toggle
   *
   * @type {boolean}
   */
  showAnalyzeToggle?: boolean;

  /**
   * Start Analyze on Upload
   *
   * @type {boolean}
   */
  startAnalyzeOnUpload?: boolean;

  /**
   * On Toggle Analyze
   */
  onToggleAnalyze?: (state: boolean) => Promise<void>;
}

/**
 * Modal Name
 */
enum ModalName {
  NONE = 'none',
  MOVE = 'move',
  REMOVE = 'remove',
  SINGLE_REMOVE = 'singleRemove',
}

/**
 * Files List
 */
export const FilesList: React.FC<Props> = ({
  datasource,
  onSelectFile,
  rootPath,
  uploadFile,
  accept,
  download = false,
  edit = true,
  select = true,
  actionButton,
  showAnalyzeToggle = false,
  startAnalyzeOnUpload = true,
  onToggleAnalyze,
}) => {
  /**
   * Styles
   */
  const styles = useStyles2(getStyles);

  /**
   * States
   */
  const [selectedFiles, setSelectedFiles] = useState<WebDavFile[]>([]);
  const [selectedCategories, setSelectedCategories] = useState<WebDavDirectory[]>([]);
  const [errorItems, setErrorItems] = useState<WebDavItem[]>([]);
  const [modal, setModal] = useState(ModalName.NONE);
  const [addMode, setAddMode] = useState(AddMode.NONE);
  const [isSearchEnabled, setIsSearchEnabled] = useState(false);

  /**
   * Moving states
   */
  const [toPath, setToPath] = useState('');
  const [moving, setMoving] = useState(false);

  /**
   * Removing states
   */
  const [removing, setRemoving] = useState(false);
  const [removingItem, setRemovingItem] = useState<WebDavItem | null>(null);

  /**
   * Sorting State
   */
  const [sort, setSort] = useState(Sort.NAME_ASC);

  /**
   * Search State
   */
  const [search, setSearch] = useState('');

  /**
   * Translation
   */
  const { t } = useTranslation();

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
    onChangeName,
    onCreateDirectory,
    onUploadFile,
    onMove,
    clearError,
    refresh,
    onRemove,
  } = useFilesList({
    rootItem,
    uploadFile,
    datasource,
  });

  /**
   * Toggle File Selection
   */
  const onToggleFileSelection = useCallback((item: WebDavFile, selected: boolean) => {
    setSelectedFiles((files) => (selected ? files.concat(item) : files.filter((file) => file.path !== item.path)));
  }, []);

  /**
   * Toggle Category Selection
   */
  const onToggleCategorySelection = useCallback((item: WebDavDirectory, selected: boolean) => {
    setSelectedCategories((categories) =>
      selected ? categories.concat(item) : categories.filter((category) => category.path !== item.path)
    );
  }, []);

  /**
   * On Set Item Selection
   */
  const onSetItemSelection = useCallback(
    (item: WebDavItem, selected: boolean) => {
      if (item.type === WebDavItemType.DIRECTORY) {
        onToggleCategorySelection(item, selected);
      } else {
        onToggleFileSelection(item, selected);
      }
    },
    [onToggleCategorySelection, onToggleFileSelection]
  );

  /**
   * On Start Moving
   */
  const onStartMoving = useCallback(() => {
    setModal(ModalName.MOVE);
  }, []);

  /**
   * On Start Removing
   */
  const onStartRemoving = useCallback(() => {
    setModal(ModalName.REMOVE);
  }, []);

  /**
   * Categories List
   */
  const categoriesList = useMemo(() => {
    return getPlainCategories(tree);
  }, [tree]);

  /**
   * Is Selected
   */
  const isSelected = useCallback(
    (item: WebDavItem): boolean => {
      const selectedItems = item.type === WebDavItemType.FILE ? selectedFiles : selectedCategories;

      return selectedItems.some((selectedItem) => selectedItem.path === item.path);
    },
    [selectedCategories, selectedFiles]
  );

  /**
   * Move Categories Options
   */
  const moveCategoriesOptions = useMemo(() => {
    return categoriesList
      .filter((category) => !selectedCategories.some((selectedCategory) => selectedCategory.path === category.path))
      .map(({ path, relativePath }) => ({
        label: `/${relativePath}`,
        value: path,
      }));
  }, [categoriesList, selectedCategories]);

  /**
   * All Selected Items
   */
  const allSelectedItems = useMemo(() => {
    return [...selectedCategories, ...selectedFiles];
  }, [selectedCategories, selectedFiles]);

  /**
   * On Close Modal
   */
  const onCloseModal = useCallback(() => {
    setModal(ModalName.NONE);
  }, []);

  /**
   * On Move Items
   */
  const onMoveItems = useCallback(
    async (toPath: string) => {
      /**
       * Moving items
       */
      const movingResults = await Promise.all(allSelectedItems.map((item) => onMove(item, toPath)));

      /**
       * Find unmoved items
       */
      const movingErrors = allSelectedItems.filter((item, index) => !movingResults[index]);

      /**
       * Reset states
       */
      setErrorItems(movingErrors);
      setSelectedFiles([]);
      setSelectedCategories([]);

      /**
       * Refresh
       */
      refresh();
    },
    [allSelectedItems, onMove, refresh]
  );

  /**
   * On Remove Items
   */
  const onRemoveItems = useCallback(async () => {
    /**
     * Removing items
     */
    const removingResults = await Promise.all(allSelectedItems.map((item) => onRemove(item)));

    /**
     * Find not removed items
     */
    const removingErrors = allSelectedItems.filter((item, index) => !removingResults[index]);

    /**
     * Reset states
     */
    setErrorItems(removingErrors);
    setSelectedFiles([]);
    setSelectedCategories([]);

    /**
     * Refresh
     */
    refresh();
  }, [allSelectedItems, onRemove, refresh]);

  /**
   * On Remove Single Item
   */
  const onRemoveSingleItem = useCallback(
    async (item: WebDavItem) => {
      /**
       * Removing item
       */
      const removingResult = await onRemove(item);

      /**
       * Reset states
       */
      setErrorItems(removingResult ? [] : [item]);
      onSetItemSelection(item, false);
      setRemovingItem(null);

      /**
       * Refresh
       */
      refresh();
    },
    [onRemove, onSetItemSelection, refresh]
  );

  /**
   * On Add Directory
   */
  const onAddDirectory = useCallback(
    async (category: WebDavDirectory, name: string) => {
      const created = await onCreateDirectory(category, name);

      if (created) {
        loadTree(category);
      }
    },
    [loadTree, onCreateDirectory]
  );

  /**
   * On Upload Files
   */
  const onUploadFiles = useCallback(
    async (category: WebDavDirectory, files: File[]) => {
      const uploaded = await Promise.all(files.map((file) => onUploadFile(category, file))).then((results) =>
        results.some((result) => result)
      );

      if (uploaded) {
        loadTree(category);
      }
    },
    [loadTree, onUploadFile]
  );

  /**
   * On Start Item Removing
   */
  const onStartItemRemoving = useCallback((item: WebDavItem) => {
    setRemovingItem(item);
    setModal(ModalName.SINGLE_REMOVE);
  }, []);

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
            tooltip={t('filesList.refreshButton')}
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
            tooltip={t('filesList.expandButton')}
            data-testid={TEST_IDS.filesList.buttonExpand}
          />
          <Button
            icon="angle-double-up"
            variant="secondary"
            onClick={onCollapseAll}
            tooltip={t('filesList.collapseButton')}
            data-testid={TEST_IDS.filesList.buttonCollapse}
          />
          <Button
            icon="filter"
            variant="secondary"
            fill={isSearchEnabled ? 'outline' : 'solid'}
            tooltip={t('filesList.searchLabel')}
            data-testid={TEST_IDS.filesList.buttonToggleSearching}
            onClick={() => {
              setIsSearchEnabled((isSearchEnabled) => !isSearchEnabled);
              setSearch('');
            }}
          />
        </ButtonGroup>

        <InlineField label={t('filesList.sortLabel')}>
          <Combobox
            onChange={(opt) => {
              setSort(opt.value ?? Sort.NAME_ASC);
            }}
            options={SORT_OPTIONS}
            value={sort}
            data-testid={TEST_IDS.filesList.fieldSort}
          />
        </InlineField>
        {showAnalyzeToggle && onToggleAnalyze && (
          <InlineSwitch
            label={t('filesList.toggleAnalyzeLabel',  { state: startAnalyzeOnUpload ? 'On' : 'Off' })}
            showLabel={true}
            value={startAnalyzeOnUpload}
            onChange={(event) => onToggleAnalyze(event.currentTarget.checked)}
            data-testid={TEST_IDS.filesList.toggleAnalyzeOnUpload}
          />
        )}
        {isSearchEnabled && (
          <InlineField label={t('filesList.searchLabel')}>
            <Input
              autoFocus={true}
              value={search}
              onChange={(event) => setSearch(event.currentTarget.value)}
              data-testid={TEST_IDS.filesList.fieldSearch}
              placeholder={t('filesList.searchPlaceholder')}
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
            onRemove={() => {
              setErrorItems([]);
              clearError();
            }}
          >
            {errorItems.length > 0 &&
              t('filesList.errorItemsList', { list: errorItems.map((item) => `/${item.relativePath}`).join(', ') })}
          </Alert>
        )}
        <TreeLevel
          tree={tree}
          loadingPath={loadingPath}
          loadTree={loadTree}
          onSelectFile={onSelectFile}
          onChangeName={onChangeName}
          onSetItemSelection={onSetItemSelection}
          isSelected={isSelected}
          accept={accept}
          onUploadFiles={onUploadFiles}
          onCreateCategory={onAddDirectory}
          addMode={addMode}
          setAddMode={setAddMode}
          sort={sort}
          searchQuery={search}
          isItemExpanded={isItemExpanded}
          onSetItemExpanded={onSetItemExpanded}
          download={download}
          onRemove={onStartItemRemoving}
          edit={edit}
          select={select}
          actionButton={actionButton}
        />
      </div>
      {allSelectedItems.length > 0 && (
        <>
          {modal === ModalName.MOVE && (
            <Modal
              title={t('filesList.moveModal.title')}
              isOpen={true}
              onDismiss={onCloseModal}
              data-testid={TEST_IDS.filesList.modalMoving}
            >
              <InlineField label={t('filesList.moveModal.pathToLabel')}>
                <Combobox
                  onChange={(opt) => {
                    setToPath(opt.value || '');
                  }}
                  width={50}
                  value={toPath}
                  options={moveCategoriesOptions}
                  aria-label={TEST_IDS.filesList.fieldMoveToPath}
                />
              </InlineField>
              <Modal.ButtonRow>
                <Button variant="secondary" onClick={onCloseModal} data-testid={TEST_IDS.filesList.buttonCancelMoving}>
                  {t('filesList.moveModal.cancelButton')}
                </Button>
                <Button
                  variant="primary"
                  onClick={async () => {
                    setMoving(true);
                    await onMoveItems(toPath);
                    onCloseModal();
                    setMoving(false);
                    setToPath('');
                  }}
                  disabled={!toPath || moving}
                  icon={moving ? 'fa fa-spinner' : undefined}
                  data-testid={TEST_IDS.filesList.buttonSaveMoving}
                >
                  {t('filesList.moveModal.saveButton')}
                </Button>
              </Modal.ButtonRow>
            </Modal>
          )}
          {modal === ModalName.REMOVE && (
            <ConfirmModal
              isOpen={true}
              title={t('filesList.removeModal.title')}
              body={t('filesList.removeModal.body')}
              confirmText={
                removing ? t('filesList.removeModal.confirmButtonLoading') : t('filesList.removeModal.confirmButton')
              }
              onConfirm={async () => {
                setRemoving(true);
                await onRemoveItems();
                setRemoving(false);
                onCloseModal();
              }}
              onDismiss={onCloseModal}
              data-testid={TEST_IDS.filesList.confirmDeleteModal}
            />
          )}
        </>
      )}
      {modal === ModalName.SINGLE_REMOVE && removingItem && (
        <ConfirmModal
          isOpen={true}
          title={t('filesList.removeItemModal.title')}
          body={t('filesList.removeItemModal.body', { name: removingItem.name })}
          confirmText={
            removing
              ? t('filesList.removeItemModal.confirmButtonLoading')
              : t('filesList.removeItemModal.confirmButton')
          }
          onConfirm={async () => {
            setRemoving(true);
            await onRemoveSingleItem(removingItem);
            setRemoving(false);
            onCloseModal();
          }}
          onDismiss={onCloseModal}
          data-testid={TEST_IDS.filesList.confirmItemDeleteModal}
        />
      )}
    </div>
  );
};
