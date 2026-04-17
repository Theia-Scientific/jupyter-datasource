import { getBackendSrv } from '@grafana/runtime';
import { errorLogger } from '@theia/utils';
import { useCallback, useMemo } from 'react';
import { lastValueFrom } from 'rxjs';

import { WebDavItem } from '../types';

/**
 * Use WebDav Api
 */
export const useWebDavApi = () => {
  /**
   * List
   */
  const list = useCallback(async (url: string) => {
    try {
      return await getBackendSrv().get<WebDavItem[]>(`${url}/`);
    } catch (e) {
      errorLogger.log(e);
      throw e;
    }
  }, []);

  /**
   * Move
   */
  const move = useCallback(async (url: string, newUrl: string) => {
    try {
      await lastValueFrom(
        getBackendSrv().fetch({
          method: 'MOVE',
          url,
          headers: {
            destination: newUrl,
            overwrite: 'F',
          },
        })
      );
    } catch (e) {
      errorLogger.log(e);
      throw e;
    }
  }, []);

  /**
   * Create Directory
   */
  const createDirectory = useCallback(async (url: string) => {
    try {
      await lastValueFrom(
        getBackendSrv().fetch({
          method: 'MKCOL',
          url,
        })
      );
    } catch (e) {
      errorLogger.log(e);
      throw e;
    }
  }, []);

  /**
   * Check if file exists
   */
  const exists = useCallback(async (url: string) => {
    try {
      await lastValueFrom(
        getBackendSrv().fetch({
          method: 'PROPFIND',
          url,
          showErrorAlert: false,
        })
      );

      return true;
    } catch (e) {
      errorLogger.log(e);
      return false;
    }
  }, []);

  /**
   * Upload
   */
  const upload = useCallback(async (url: string, file: File) => {
    try {
      await lastValueFrom(
        getBackendSrv().fetch({
          method: 'PUT',
          headers: {
            'Content-Type': file.type,
          },
          url,
          data: file,
        })
      );
    } catch (e) {
      errorLogger.log(e);
      throw e;
    }
  }, []);

  /**
   * Remove
   */
  const remove = useCallback(async (url: string) => {
    try {
      await lastValueFrom(
        getBackendSrv().fetch({
          method: 'DELETE',
          headers: {
            depth: 'infinity',
          },
          url,
        })
      );
    } catch (e) {
      errorLogger.log(e);
      throw e;
    }
  }, []);

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
