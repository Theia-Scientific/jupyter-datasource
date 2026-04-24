/**
 * Api Name
 */
export enum ApiName {
  CREATE_WEBDAV_CATEGORY = 'createWebDavCategory',
  GET_WEBDAV_FILES = 'getWebDavFiles',
  MOVE_WEBDAV_ITEM = 'moveWebDavItem',
  REMOVE_WEBDAV_ITEM = 'removeWebDavItem',
  RENAME_WEBDAV_FILE = 'renameWebDavFile',
  UPLOAD_FILE = 'uploadFile',
}

/**
 * Api Message Type
 */
export enum ApiMessageType {
  FAILED = 'failed',
  SUBMITTED = 'submitted',
}
