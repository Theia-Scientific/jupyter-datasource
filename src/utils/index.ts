import { FetchError, isFetchError } from '@grafana/runtime';
import { ApiMessageType, ApiName } from '@theia/constants';
import { t } from '@grafana/i18n';
export * from './logger';

function getMessageTypeString(messageType: ApiMessageType): string {
  switch (messageType) {
    case ApiMessageType.FAILED: return t('apiRequestFailed', 'API Request failed');
    case ApiMessageType.SUBMITTED: return t('apiRequestSubmitted', 'API Request Submitted');
  }  
}

function getApiNameString(name: ApiName): string {
  switch (name) {
    case ApiName.CREATE_WEBDAV_CATEGORY: return t('createWebdavCategory', 'Create WebDav Category');
    case ApiName.GET_WEBDAV_FILES: return t('getWebdavFiles', 'Get WebDav Files')
    case ApiName.MOVE_WEBDAV_ITEM: return t('movingWebdavItem', 'Moving WebDav Item')
    case ApiName.REMOVE_WEBDAV_ITEM: return t('removingWebdavItem', 'Removing WebDav Item')
    case ApiName.RENAME_WEBDAV_FILE: return t('renameWebdavFile', 'Rename WebDav File');
    case ApiName.UPLOAD_FILE: return t('uploadFile', 'Upload File');
  }
}

/**
 * Get Api Message
 * @param name
 * @param messageType
 */
export const getApiMessage = (name: ApiName, messageType = ApiMessageType.FAILED): string => {
  const messageTypeString = getMessageTypeString(messageType);
  const apiNameString = getApiNameString(name);
  return t('apinamestringMessagetypestring', '{{apiNameString}}: {{messageTypeString}}', { apiNameString, messageTypeString });
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
