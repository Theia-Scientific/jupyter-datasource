import { DataSource } from '@theia/datasource';
import { errorLogger } from '@theia/utils';
import { useCallback, useMemo } from 'react';

/**
 * Use DataSource
 */
export const useDatasource = (datasource: DataSource) => {
  /**
   * List
   */
  const list = useCallback(async (path: string) => {
    try {
      return await datasource.getListing(path);
    } catch (e) {
      errorLogger.log(e);
      throw e;
    }
  }, [datasource]);

  return useMemo(
    () => ({
      list,
    }),
    [list]
  );
};
