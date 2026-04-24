import { Alert, Button, ButtonGroup, Combobox, ConfirmModal, InlineField, InlineSwitch, Input, Modal, useStyles2 } from '@grafana/ui';
import { BASE_WEB_DAV_URL, TEST_IDS } from '@theia/constants';
import React, { useCallback, useEffect, useMemo, useState } from 'react';

import { TreeLevel } from './components/TreeLevel';
import { SORT_OPTIONS } from './constants';
import { getStyles } from './FilesList.styles';
import { useFilesList, useTreeExpand } from './hooks';
import { AddMode, Sort, WebDavDirectory, WebDavFile, WebDavItem, WebDavItemType } from './types';
import { getPlainCategories } from './utils';
import type { DataSource } from '@theia/datasource';

function formatErrorItems(errorItems: WebDavItem[]): string {
  const joinedErrorItems = errorItems.map((item) => `/${item.relativePath}`).join(', ');
  return `Error while accomplishing operation for: ${joinedErrorItems}`;
}

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
            tooltip={"Refresh"}
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
            tooltip={"Expand"}
            data-testid={TEST_IDS.filesList.buttonExpand}
          />
          <Button
            icon="angle-double-up"
            variant="secondary"
            onClick={onCollapseAll}
            tooltip={"Collapse All"}
            data-testid={TEST_IDS.filesList.buttonCollapse}
          />
          <Button
            icon="filter"
            variant="secondary"
            fill={isSearchEnabled ? 'outline' : 'solid'}
            tooltip={"Filter"}
            data-testid={TEST_IDS.filesList.buttonToggleSearching}
            onClick={() => {
              setIsSearchEnabled((isSearchEnabled) => !isSearchEnabled);
              setSearch('');
            }}
          />
        </ButtonGroup>

        <InlineField label={"Sort By"}>
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
            label={`Analyze on Upload: ${startAnalyzeOnUpload ? 'On' : 'Off'}`}
            showLabel={true}
            value={startAnalyzeOnUpload}
            onChange={(event) => onToggleAnalyze(event.currentTarget.checked)}
            data-testid={TEST_IDS.filesList.toggleAnalyzeOnUpload}
          />
        )}
        {isSearchEnabled && (
          <InlineField label={"Filter"}>
            <Input
              autoFocus={true}
              value={search}
              onChange={(event) => setSearch(event.currentTarget.value)}
              data-testid={TEST_IDS.filesList.fieldSearch}
              placeholder={"File name contains"}
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
            {errorItems.length > 0 && formatErrorItems(errorItems)}
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
              title={"Move Selected Items"}
              isOpen={true}
              onDismiss={onCloseModal}
              data-testid={TEST_IDS.filesList.modalMoving}
            >
              <InlineField label={"Category to move"}>
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
                  {"Cancel"}
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
                  {"Move"}
                </Button>
              </Modal.ButtonRow>
            </Modal>
          )}
          {modal === ModalName.REMOVE && (
            <ConfirmModal
              isOpen={true}
              title={"Remove Selected Items"}
              body={"Please confirm to delete selected items."}
              confirmText={
                removing ? "Removing..." : "Remove"
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
          title={"Remove"}
          body={`Please confirm to delete ${removingItem.name}.`}
          confirmText={
            removing
              ? "Removing..."
              : "Remove"
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
