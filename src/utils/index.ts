import { FetchError, isFetchError } from '@grafana/runtime';
export * from './logger';

/**
 * Is Api Error
 */
export const isApiError = (error: unknown): error is FetchError => {
  return isFetchError(error);
};
