import { BASE_WEB_DAV_URL } from '@theia/constants';
import { isApiError } from '@theia/utils';
import { useCallback, useEffect, useState } from 'react';

import { WebDavDirectory } from '../types';
import { getUpdatedTree } from '../utils';
import { useDatasource } from './useDatasource';
import type { DataSource } from '@theia/datasource';
import { t } from '@grafana/i18n';

/**
 * Use Files List
 */
export const useFilesList = ({
  rootItem,
  datasource,
}: {
  rootItem: WebDavDirectory;
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
          setError(e.message || t('useFilesList.loadTree.error', 'List notebooks: API request failed'));
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
    clearError,
    refresh,
  };
};
