import { FetchError, isFetchError } from '@grafana/runtime';
import { AuthType, MyDataSourceOptions, MyQuery } from '@theia/types';
import { openWindow, getWindowLocation } from './window';
export * from './logger';

/**
 * Is Api Error
 */
export const isApiError = (error: unknown): error is FetchError => {
  return isFetchError(error);
};

function jupyterLabUrl(jsonData: MyDataSourceOptions, path: string) {
  const url = URL.parse(jsonData.jupyterUrl) ?? {};
  if (["localhost", "127.0.0.1", "::1"].includes(url.hostname)) {
    url.hostname = getWindowLocation().hostname;
  }
  url.pathname = url.pathname.replace(/\/$/,'') +
      '/../lab' + path;
  url.search =
    (jsonData.authType === AuthType.RawToken
      ? `?token=${jsonData.rawToken}`
      : '');
  return url.href;
}

export function openJupyterLab(options: MyDataSourceOptions) {
  openWindow(jupyterLabUrl(options, ''));
};

export function openJupyterLabNotebook(options: MyDataSourceOptions, {notebook}: MyQuery) {
  openWindow(jupyterLabUrl(options, `/tree/${notebook}`));
};
