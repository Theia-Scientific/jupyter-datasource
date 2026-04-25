import { DataSource } from '@theia/datasource';
import { errorLogger } from '@theia/utils';
import { PathEntry } from '@theia/types';
import { WebDavItem, WebDavItemType } from '../types';
import { useCallback, useMemo } from 'react';

// temporarily, we're gonna adapt PathEntry to WebDavItem
// to avoid having to change a ton of the source
const webDavItemOfPathEntry = (entry: PathEntry): WebDavItem => {
  const base = {
    name: entry.name,
    mtime: entry.last_modified,
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
      size: entry.size,
    };
  }
};

/**
 * Use DataSource
 */
export const useDatasource = (datasource: DataSource) => {
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
  }, [datasource]);

  return useMemo(
    () => ({
      list,
    }),
    [list]
  );
};
