import { FetchError, isFetchError } from '@grafana/runtime';
import { ApiMessageType, ApiName } from '@theia/constants';
import { t } from 'i18next';
export * from './logger';

/**
 * Get Api Message
 * @param name
 * @param messageType
 */
export const getApiMessage = (name: ApiName, messageType = ApiMessageType.FAILED): string => {
  return t(`messages.api.${messageType}`, { name: t(`messages.api.names.${name}`) });
};

/**
 * Is Api Error
 */
export const isApiError = (error: unknown): error is FetchError => {
  return isFetchError(error);
};

/**
 * Export constants to use in one import
 */
export { ApiName };
