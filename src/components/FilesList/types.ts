/**
 * WebDav Item Type
 */
export enum WebDavItemType {
  DIRECTORY = 'directory',
  FILE = 'file',
}

/**
 * Base WebDav Item
 */
interface BaseWebDavItem {
  /**
   * Name
   *
   * @type {string}
   */
  name: string;

  /**
   * Modified Time
   *
   * @type {string}
   */
  mtime: string;

  /**
   * Path
   *
   * @type {string}
   */
  path: string;

  /**
   * Relative Path
   *
   * @type {string}
   */
  relativePath: string;

  /**
   * URL
   *
   * @type {url}
   */
  url: string;
}

/**
 * WebDav File
 */
export type WebDavFile = BaseWebDavItem & {
  /**
   * Type
   *
   * @type {WebDavItemType.FILE}
   */
  type: WebDavItemType.FILE;

  /**
   * Size
   *
   * @type {number}
   */
  size: number;
};

/**
 * WebDav Directory
 */
export type WebDavDirectory = BaseWebDavItem & {
  /**
   * Type
   *
   * @type {WebDavItemType.DIRECTORY}
   */
  type: WebDavItemType.DIRECTORY;

  /**
   * Children
   *
   * @type {WebDavItem[]}
   */
  children?: WebDavItem[];
};

/**
 * WebDav Item
 */
export type WebDavItem = WebDavDirectory | WebDavFile;

/**
 * Add Mode
 */
export enum AddMode {
  NONE = '',
  FOLDER = 'folder',
  FILE = 'file',
}

/**
 * Sort
 * Keep -asc|desc in the end for parsing
 */
export enum Sort {
  LAST_MODIFIED_ASC = 'lastModified-asc',
  LAST_MODIFIED_DESC = 'lastModified-desc',
  NAME_ASC = 'name-asc',
  NAME_DESC = 'name-desc',
  SIZE_ASC = 'size-asc',
  SIZE_DESC = 'size-desc',
}
