import { FetchError, isFetchError } from '@grafana/runtime';
import { AuthType, MyDataSourceOptions, MyQuery } from '@theia/types';
import { getWindowLocation } from './window';
export * from './logger';
export * from './window';

/**
 * Is Api Error
 */
export const isApiError = (error: unknown): error is FetchError => {
  return isFetchError(error);
};

function jupyterLabUrl(jsonData: MyDataSourceOptions, path: string): string | null {
  try {
    const url = new URL(jsonData.jupyterUrl ?? '');
    if (["localhost", "127.0.0.1", "::1"].includes(url.hostname)) {
      url.hostname = new URL(getWindowLocation()).hostname;
    }
    url.pathname = url.pathname.replace(/\/$/,'') +
      '/../lab' + path;
    if (jsonData.authType === AuthType.RawToken && jsonData.rawToken !== '') {
      url.searchParams.append('token', jsonData.rawToken!);
    }

    return url.href;
  } catch {}
  return null;
}

export function getJupyterLabUrl(options: MyDataSourceOptions): string | null {
  return jupyterLabUrl(options, '');
};

export function getJupyterLabNotebookUrl(options: MyDataSourceOptions, {notebook}: MyQuery): string | null {
  return jupyterLabUrl(options, `/tree/${notebook}`);
};
