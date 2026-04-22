import { DataSource } from '@theia/datasource';
import { errorLogger } from '@theia/utils';
import { PathEntry } from '@theia/types';
import { WebDavItem, WebDavItemType } from '../types';
import { useCallback, useMemo } from 'react';

/**
 * Use DataSource
 */
export const useDatasource = (datasource: DataSource) => {

  // temporarily, we're gonna adapt PathEntry to WebDavItem
  // to avoid having to change a ton of the source
  const webDavItemOfPathEntry = (entry: PathEntry): WebDavItem => {
    const base = {
      name: entry.name,
      mtime: "",
      path: entry.path,
      relativePath: "",
      url: "",
    };
    if (entry.type === 'directory') {
      return {
        ...base,
        type: WebDavItemType.DIRECTORY,
        children: entry.content?.map(webDavItemOfPathEntry),
      };
    } else {
      return {
        ...base,
        type: WebDavItemType.FILE,
        size: 123,
      };
    }
  };

  /**
   * List
   */
  const list = useCallback(async (path: string) => {
    try {
      const listing: PathEntry[] = await datasource.getListing(path);
      return listing.map(webDavItemOfPathEntry);
    } catch (e) {
      errorLogger.log(e);
      throw e;
    }
  }, []);

  const move = useCallback(async (_url: string, _newUrl: string) => {}, []);
  const createDirectory = useCallback(async (_url: string) => {}, []);
  const exists = useCallback(async (_url: string) => {}, []);
  const upload = useCallback(async (_url: string, _file: File) => {}, []);
  const remove = useCallback(async (_url: string) => {}, []);

  return useMemo(
    () => ({
      list,
      move,
      createDirectory,
      upload,
      remove,
      exists,
    }),
    [createDirectory, exists, list, move, remove, upload]
  );
};
