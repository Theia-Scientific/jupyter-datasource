import { Sort, WebDavDirectory, WebDavFile, WebDavItem, WebDavItemType } from './types';

/**
 * Get Updated Tree
 * @param tree
 * @param updatedTree
 * @param children
 * @param baseUrl
 */
export const getUpdatedTree = <TTree extends WebDavItem>(
  tree: TTree,
  updatedTree: WebDavDirectory,
  children: WebDavItem[],
  baseUrl: string
): TTree => {
  if (tree.path === updatedTree.path) {
    return {
      ...tree,
      children: children?.map((childItem) => ({
        ...childItem,
        path: `${tree.path}/${childItem.name}`,
        relativePath: `${tree.relativePath ? tree.relativePath + '/' : ''}${childItem.name}`,
        url: `${baseUrl}${tree.path}/${childItem.name}`,
      })),
    };
  }

  if (tree.type === WebDavItemType.DIRECTORY) {
    return {
      ...tree,
      children: tree.children?.map((childItem) => getUpdatedTree(childItem, updatedTree, children, baseUrl)),
    };
  }

  return tree;
};

/**
 * Get Plain Categories
 * @param tree
 */
export const getPlainCategories = (tree: WebDavDirectory): WebDavDirectory[] => {
  const list = [];
  const queue: WebDavItem[] = [tree];

  while (queue.length) {
    const item = queue.shift();
    if (!item || item.type === WebDavItemType.FILE) {
      continue;
    }

    const { children, ...category } = item;

    list.push(category);
    queue.unshift(...(children || []));
  }

  return list;
};

/**
 * Get Valid Folder Name
 * @param folderName
 */
export const getValidFolderName = (folderName: string) => {
  const withoutSpaces = folderName.trim();

  return withoutSpaces.replaceAll('/', '');
};

/**
 * Get Sorted Items
 */
export const getSortedItems = (items: WebDavItem[] | undefined, sort: Sort) => {
  if (!items) {
    return [];
  }

  const result = [...items];

  const parsedSort = sort.split('-');
  const sortDir = parsedSort[parsedSort.length - 1] as 'asc' | 'desc';

  /**
   * Diff for asc or desc order
   */
  const diff = sortDir === 'asc' ? -1 : 1;

  /**
   * Value key for sorting
   */
  let key: keyof WebDavFile = 'name';

  if (sort === Sort.LAST_MODIFIED_ASC || sort === Sort.LAST_MODIFIED_DESC) {
    key = 'mtime';
  }
  if (sort === Sort.SIZE_ASC || sort === Sort.SIZE_DESC) {
    key = 'size';
  }

  /**
   * Sort
   */
  result.sort((a, b) => {
    /**
     * Sort only the same item types
     */
    if (a.type !== b.type) {
      return 0;
    }

    if (a.type === WebDavItemType.DIRECTORY || b.type === WebDavItemType.DIRECTORY) {
      /**
       * Sort Directories only by name
       */
      if (key === 'name') {
        return a[key] < b[key] ? diff : -diff;
      }

      return 0;
    }

    /**
     * Sort by last modified date
     */
    if (key === 'mtime') {
      const valueA = new Date(a[key]).valueOf();
      const valueB = new Date(b[key]).valueOf();

      return valueA < valueB ? diff : -diff;
    }

    return a[key] < b[key] ? diff : -diff;
  });

  return result;
};
