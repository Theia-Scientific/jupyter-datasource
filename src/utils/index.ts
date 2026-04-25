import { FetchError, isFetchError } from '@grafana/runtime';
import { t } from '@grafana/i18n';
export * from './logger';

/**
 * Is Api Error
 */
export const isApiError = (error: unknown): error is FetchError => {
  return isFetchError(error);
};
