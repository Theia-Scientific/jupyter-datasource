import { Sort } from './types';
import { PathEntry, PathEntryDirectory, PathEntryNotebook } from '@theia/types';

/**
 * Get Updated Tree
 * @param tree
 * @param updatedTree
 * @param content
 */
export const getUpdatedTree = <TTree extends PathEntry>(
  tree: TTree,
  updatedTree: PathEntryDirectory,
  content: PathEntry[]
): TTree => {
  if (tree.path === updatedTree.path) {
    return {
      ...tree,
      content: content?.map((childItem) => ({
        ...childItem,
        path: `${tree.path}/${childItem.name}`,
      })),
    };
  }

  if (tree.type === 'directory') {
    return {
      ...tree,
      content: tree.content?.map((childItem) => getUpdatedTree(childItem, updatedTree, content)),
    };
  }

  return tree;
};

/**
 * Get Plain Categories
 * @param tree
 */
export const getPlainCategories = (tree: PathEntryDirectory): PathEntryDirectory[] => {
  const list = [];
  const queue: PathEntry[] = [tree];

  while (queue.length) {
    const item = queue.shift();
    if (!item || item.type === 'notebook') {
      continue;
    }

    const { content, ...category } = item;

    list.push(category);
    queue.unshift(...(content || []));
  }

  return list;
};

/**
 * Get Sorted Items
 */
export const getSortedItems = (items: PathEntry[] | undefined, sort: Sort) => {
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
  let key: keyof PathEntryNotebook = 'name';

  if (sort === Sort.LAST_MODIFIED_ASC || sort === Sort.LAST_MODIFIED_DESC) {
    key = 'last_modified';
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

    if (a.type === 'directory' || b.type === 'directory') {
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
    if (key === 'last_modified') {
      const valueA = new Date(a[key]).valueOf();
      const valueB = new Date(b[key]).valueOf();

      return valueA < valueB ? diff : -diff;
    }

    return a[key] < b[key] ? diff : -diff;
  });

  // finally, sort putting folders first
  result.sort((a,b) => {
    if (a.type === b.type) { return 0; }
    if (a.type === 'directory' && b.type === 'notebook') {
      return -1;
    } else {
      // only remaining possibility is (notebook, directory)
      return 1;
    }
  });

  return result;
};
