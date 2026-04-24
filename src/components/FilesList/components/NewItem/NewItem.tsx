import { Button, FileDropzone, IconButton, InlineField, InlineFieldRow, Input, useStyles2 } from '@grafana/ui';
import { TEST_IDS } from '@theia/constants';
import React, { useCallback, useEffect, useState } from 'react';

import { AddMode } from '../../types';
import { getStyles } from './NewItem.styles';

/**
 * Properties
 */
interface Props {
  /**
   * On Create Directory
   */
  onCreateDirectory: (name: string) => Promise<void>;

  /**
   * On Upload Files
   */
  onUploadFiles: (files: File[]) => Promise<void>;

  /**
   * Accept
   */
  accept?: string;

  /**
   * Mode
   */
  mode: AddMode;

  /**
   * Set Mode
   */
  setMode: (mode: AddMode) => void;
}

/**
 * New Item
 */
export const NewItem: React.FC<Props> = ({ onCreateDirectory, onUploadFiles, accept, mode, setMode }) => {
  /**
   * Styles
   */
  const styles = useStyles2(getStyles);

  /**
   * States
   */
  const [loading, setLoading] = useState(false);
  const [newFolder, setNewFolder] = useState('');

  /**
   * On Add Folder
   */
  const onAddFolder = useCallback(async () => {
    setLoading(true);

    await onCreateDirectory(newFolder);
    setLoading(false);
    setMode(AddMode.NONE);
  }, [newFolder, onCreateDirectory, setMode]);

  /**
   * On Cancel
   */
  const onCancel = useCallback(() => {
    setMode(AddMode.NONE);
  }, [setMode]);

  /**
   * On Add Files
   */
  const onAddFiles = useCallback(
    async (files: File[]) => {
      setLoading(true);

      await onUploadFiles(files);
      setLoading(false);
      setMode(AddMode.NONE);
    },
    [onUploadFiles, setMode]
  );

  /**
   * Clear folder name
   */
  useEffect(() => {
    setNewFolder('');
  }, [mode]);

  if (mode === AddMode.NONE) {
    return null;
  }

  return (
    <>
      {mode === AddMode.FILE && (
        <div className={styles.fileContainer}>
          <FileDropzone
            options={{
              multiple: false,
              accept,
              onDrop: (acceptedFiles: File[]) => {
                onAddFiles(acceptedFiles);
              },
            }}
            data-testid={TEST_IDS.filesList.fieldNewFile}
          />
          <Button
            icon="times"
            variant="secondary"
            fill="text"
            size="sm"
            onClick={onCancel}
            data-testid={TEST_IDS.filesList.buttonCancelAddFile}
          >
            {"Cancel"}
          </Button>
        </div>
      )}

      {mode === AddMode.FOLDER && (
        <div className={styles.folderContainer}>
          <InlineFieldRow>
            <InlineField grow={true}>
              <Input
                autoFocus={true}
                placeholder={"Specify Folder Name"}
                value={newFolder}
                onChange={(event) => setNewFolder(event.currentTarget.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && newFolder) {
                    onAddFolder();
                  }

                  if (e.key === 'Escape') {
                    onCancel();
                  }
                }}
                data-testid={TEST_IDS.filesList.fieldNewCategoryName}
              />
            </InlineField>
            <div className={styles.folderButton}>
              <IconButton
                name="times"
                disabled={loading}
                onClick={onCancel}
                data-testid={TEST_IDS.filesList.buttonCancelAddCategory}
                tooltip={"Cancel"}
              />
            </div>
            <div className={styles.folderButton}>
              <IconButton
                name={loading ? 'fa fa-spinner' : 'save'}
                disabled={loading || !newFolder}
                onClick={onAddFolder}
                data-testid={TEST_IDS.filesList.buttonSaveAddCategory}
                tooltip={"Add"}
              />
            </div>
          </InlineFieldRow>
        </div>
      )}
    </>
  );
};
