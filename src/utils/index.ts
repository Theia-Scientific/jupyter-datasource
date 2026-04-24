import { FetchError, isFetchError } from '@grafana/runtime';
import { ApiMessageType, ApiName } from '@theia/constants';
export * from './logger';

function getMessageTypeString(messageType: ApiMessageType): string {
  switch (messageType) {
    case ApiMessageType.FAILED: return "API Request failed";
    case ApiMessageType.SUBMITTED: return "API Request Submitted";
  }  
}

function getApiNameString(name: ApiName): string {
  switch (name) {
    case ApiName.CREATE_WEBDAV_CATEGORY: return "Create WebDav Category";
    case ApiName.GET_WEBDAV_FILES: return "Get WebDav Files"
    case ApiName.MOVE_WEBDAV_ITEM: return "Moving WebDav Item"
    case ApiName.REMOVE_WEBDAV_ITEM: return "Removing WebDav Item"
    case ApiName.RENAME_WEBDAV_FILE: return "Rename WebDav File";
    case ApiName.UPLOAD_FILE: return "Upload File";
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
  return `${apiNameString}: ${messageTypeString}`;
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
