import { BASE_WEB_DAV_URL } from '@theia/constants';
import { ApiName, getApiMessage, isApiError } from '@theia/utils';
import { useCallback, useEffect, useState } from 'react';

import { WebDavDirectory, WebDavItem, WebDavItemType } from '../types';
import { getUpdatedTree, getValidFolderName } from '../utils';
import { useDatasource } from './useDatasource';
import type { DataSource } from '@theia/datasource';

/**
 * Use Files List
 */
export const useFilesList = ({
  rootItem,
  uploadFile,
  datasource,
}: {
  rootItem: WebDavDirectory;
  uploadFile?: (category: WebDavDirectory, file: File) => Promise<void>;
  datasource: DataSource;
}) => {
  /**
   * States
   */
  const [tree, setTree] = useState<WebDavDirectory>(rootItem);
  const [loadingPath, setLoadingPath] = useState([rootItem.path]);
  const [error, setError] = useState('');

  /**
   * WebDav Api
   */
  const api = useDatasource(datasource);

  /**
   * Load Tree
   */
  const loadTree = useCallback(
    async (item: WebDavDirectory) => {
      const path = item.path;

      try {
        /**
         * Set Loading
         */
        setLoadingPath((paths) => paths.concat(path));

        /**
         * Update Children
         */
        const children = await api.list(`${BASE_WEB_DAV_URL}${path}`);
        setTree((tree) => getUpdatedTree(tree, item, children, BASE_WEB_DAV_URL) as WebDavDirectory);
      } catch (e) {
        if (isApiError(e)) {
          setError(e.message || getApiMessage(ApiName.GET_WEBDAV_FILES));
        }
      }

      /**
       * Reset Loading
       */
      setLoadingPath((paths) => paths.filter((item) => item !== path));
    },
    [api]
  );

  /**
   * On Change Name
   */
  const onChangeName = useCallback(
    async (item: WebDavItem, newName: string) => {
      const validName = item.type === WebDavItemType.DIRECTORY ? getValidFolderName(newName) : newName;

      if (!validName) {
        return false;
      }

      /**
       * Base Path
       */
      const basePath = item.path.split('/').filter((segment, index, array) => index < array.length - 1);

      try {
        /**
         * We have to add a trailing slash for directories
         */
        const trailingSlash = item.type === WebDavItemType.DIRECTORY ? '/' : '';
        await api.move(
          `${BASE_WEB_DAV_URL}${item.path}${trailingSlash}`,
          `${[...basePath, validName].join('/')}${trailingSlash}`
        );
        return true;
      } catch (e: unknown) {
        if (isApiError(e)) {
          setError(e.message || getApiMessage(ApiName.RENAME_WEBDAV_FILE));
        }
        return false;
      }
    },
    [api]
  );

  /**
   * On Create Directory
   */
  const onCreateDirectory = useCallback(
    async (item: WebDavDirectory, folderName: string) => {
      const validFolderName = getValidFolderName(folderName);

      if (!validFolderName) {
        return false;
      }

      try {
        await api.createDirectory(`${BASE_WEB_DAV_URL}${item.path}/${validFolderName}/`);
        return true;
      } catch (e: unknown) {
        if (isApiError(e)) {
          setError(e.message || getApiMessage(ApiName.CREATE_WEBDAV_CATEGORY));
        }
        return false;
      }
    },
    [api]
  );

  /**
   * On Upload File
   */
  const onUploadFile = useCallback(
    async (item: WebDavDirectory, file: File) => {
      try {
        if (uploadFile) {
          await uploadFile(item, file);
        } else {
          await api.upload(`${BASE_WEB_DAV_URL}${item.path}/${file.name}`, file);
        }
        return true;
      } catch (e: unknown) {
        if (isApiError(e)) {
          setError(e.message || getApiMessage(ApiName.UPLOAD_FILE));
        }
        return false;
      }
    },
    [api, uploadFile]
  );

  /**
   * On Move
   */
  const onMove = useCallback(
    async (item: WebDavItem, toPath: string) => {
      try {
        /**
         * We have to add a trailing slash for directories
         */
        const trailingSlash = item.type === WebDavItemType.DIRECTORY ? '/' : '';
        await api.move(`${BASE_WEB_DAV_URL}${item.path}${trailingSlash}`, `${toPath}/${item.name}${trailingSlash}`);
        return true;
      } catch (e) {
        if (isApiError(e)) {
          setError(e.message || getApiMessage(ApiName.MOVE_WEBDAV_ITEM));
        }
        return false;
      }
    },
    [api]
  );

  /**
   * On Remove
   */
  const onRemove = useCallback(
    async (item: WebDavItem) => {
      try {
        /**
         * We have to add a trailing slash for directories
         */
        const trailingSlash = item.type === WebDavItemType.DIRECTORY ? '/' : '';
        await api.remove(`${BASE_WEB_DAV_URL}${item.path}${trailingSlash}`);
        return true;
      } catch (e: unknown) {
        if (isApiError(e)) {
          setError(e.message || getApiMessage(ApiName.REMOVE_WEBDAV_ITEM));
        }
        return false;
      }
    },
    [api]
  );

  /**
   * Clear Error
   */
  const clearError = useCallback(() => {
    setError('');
  }, []);

  /**
   * Refresh
   */
  const refresh = useCallback(() => {
    setTree(rootItem);
    loadTree(rootItem);
  }, [loadTree, rootItem]);

  /**
   * Load Initial Tree
   */
  useEffect(() => {
    const getData = async () => {
      await loadTree(rootItem);
    };

    getData();
  }, [loadTree, rootItem]);

  return {
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
  };
};
