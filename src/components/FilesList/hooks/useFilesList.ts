import { isApiError } from '@theia/utils';
import { useCallback, useEffect, useState } from 'react';

import { PathEntryDirectory } from '@theia/types';
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
  rootItem: PathEntryDirectory;
  datasource: DataSource;
}) => {
  /**
   * States
   */
  const [tree, setTree] = useState<PathEntryDirectory>(rootItem);
  const [loadingPath, setLoadingPath] = useState([rootItem.path]);
  const [error, setError] = useState('');

  /**
   * Datasource Api
   */
  const api = useDatasource(datasource);

  /**
   * Load Tree
   */
  const loadTree = useCallback(
    async (item: PathEntryDirectory) => {
      const path = item.path;

      try {
        /**
         * Set Loading
         */
        setLoadingPath((paths) => paths.concat(path));

        /**
         * Update Children
         */
        const children = await api.list(path);
        setTree((tree) => getUpdatedTree(tree, item, children) as PathEntryDirectory);
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
