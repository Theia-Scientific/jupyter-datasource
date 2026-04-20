import { FetchError, isFetchError } from '@grafana/runtime';
import { ApiMessageType, ApiName } from '@theia/constants';
import { t } from 'i18next';

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
 * Logger
 */
const createLogger = (name: string, logType: 'log' | 'error' | 'warn' = 'log') => {
  return {
    log: (...args: unknown[]) => {
      // eslint-disable-next-line no-console
      const logCommand = console[logType];
      logCommand(`[${name}]: ${args}`);
    },
  };
};

export const errorLogger = createLogger('Error', 'error');

/**
 * Export constants to use in one import
 */
export { ApiName };
