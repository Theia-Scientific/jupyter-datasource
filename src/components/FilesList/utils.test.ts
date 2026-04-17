import { BASE_WEB_DAV_URL } from '@theia/constants';

import { Sort, WebDavDirectory, WebDavFile, WebDavItem, WebDavItemType } from './types';
import { getPlainCategories, getSortedItems, getUpdatedTree, getValidFolderName } from './utils';

describe('Files List Utils', () => {
  const mtime = '123';
  const size = 123;

  describe('getUpdatedTree', () => {
    it('Should update root tree', () => {
      const children: Array<Partial<WebDavItem>> = [
        {
          type: WebDavItemType.DIRECTORY,
          name: 'dir1',
          mtime,
        },
        {
          type: WebDavItemType.DIRECTORY,
          name: 'dir2',
          mtime,
        },
        {
          type: WebDavItemType.FILE,
          name: 'file1.png',
          mtime,
          size,
        },
      ];
      const tree: WebDavDirectory = {
        name: 'Media',
        path: '/media',
        relativePath: '',
        url: `${BASE_WEB_DAV_URL}/media`,
        type: WebDavItemType.DIRECTORY,
        mtime: '123',
      };
      const result = getUpdatedTree(tree, tree, children as WebDavItem[], BASE_WEB_DAV_URL);

      expect(result.children).toEqual(
        children.map((childItem) => ({
          ...childItem,
          path: `/media/${childItem.name}`,
          relativePath: `${childItem.name}`,
          url: `${BASE_WEB_DAV_URL}/media/${childItem.name}`,
        }))
      );
    });

    it('Should update nested tree', () => {
      const tree: WebDavDirectory = {
        name: 'Media',
        path: '/media',
        relativePath: '',
        url: `${BASE_WEB_DAV_URL}/media`,
        type: WebDavItemType.DIRECTORY,
        mtime: '123',
        children: [
          {
            type: WebDavItemType.DIRECTORY,
            name: 'dir1',
            path: '/media/dir1',
            relativePath: 'dir1',
            url: `${BASE_WEB_DAV_URL}/media/dir1`,
            mtime,
            children: [
              {
                type: WebDavItemType.DIRECTORY,
                name: 'dir2',
                mtime,
                path: '/media/dir1/dir2',
                relativePath: 'dir1/dir2',
                url: `${BASE_WEB_DAV_URL}/media/dir1/dir2`,
              },
              {
                type: WebDavItemType.FILE,
                name: 'file2.png',
                path: '/media/dir1/file2.png',
                relativePath: 'dir1/file2.png',
                url: `${BASE_WEB_DAV_URL}/media/dir1/file2.png`,
                mtime,
                size,
              },
            ],
          },
          {
            type: WebDavItemType.FILE,
            name: 'file1.png',
            path: '/media/file1.png',
            relativePath: 'file1.png',
            url: `${BASE_WEB_DAV_URL}/media/file1.png`,
            mtime,
            size,
          },
        ],
      };

      const children: Array<Partial<WebDavItem>> = [
        {
          type: WebDavItemType.FILE,
          name: 'file1.png',
          mtime,
          size,
        },
        {
          type: WebDavItemType.FILE,
          name: 'file2.png',
          mtime,
          size,
        },
      ];
      const result = getUpdatedTree(
        tree,
        (tree.children?.[0] as any).children[0],
        children as WebDavItem[],
        BASE_WEB_DAV_URL
      );

      expect(result).toEqual({
        ...tree,
        children: expect.arrayContaining([
          {
            ...(tree.children as any)[0],
            children: expect.arrayContaining([
              {
                ...(tree.children as any)[0].children[0],
                children: children.map((childItem) => ({
                  ...childItem,
                  path: `/media/dir1/dir2/${childItem.name}`,
                  relativePath: `dir1/dir2/${childItem.name}`,
                  url: `${BASE_WEB_DAV_URL}/media/dir1/dir2/${childItem.name}`,
                })),
              },
            ]),
          },
          (tree.children as any)[1],
        ]),
      });
    });
  });

  describe('getPlainCategories', () => {
    it('Should return all categories', () => {
      const tree = {
        name: '0',
        path: '/0',
        type: WebDavItemType.DIRECTORY,
        children: [
          {
            name: '1',
            path: '/0/1',
            type: WebDavItemType.DIRECTORY,
            children: [
              {
                name: '1-1',
                path: '/0/1/1',
                type: WebDavItemType.DIRECTORY,
              },
              {
                name: '1-2',
                path: '/0/1/2',
                type: WebDavItemType.DIRECTORY,
              },
              {
                name: 'file.png',
                path: '/0/1/file.png',
                type: WebDavItemType.FILE,
              },
            ],
          },
          {
            name: '2',
            path: '/0/2',
            type: WebDavItemType.DIRECTORY,
            children: [
              {
                name: '2-1',
                path: '/0/2/1',
                type: WebDavItemType.DIRECTORY,
              },
              {
                name: '2-2',
                path: '/0/2/2',
                type: WebDavItemType.DIRECTORY,
              },
            ],
          },
        ],
      };

      const result = getPlainCategories(tree as WebDavDirectory);

      expect(result).toHaveLength(7);
      expect(result).toEqual([
        expect.objectContaining({
          name: '0',
        }),
        expect.objectContaining({
          name: '1',
        }),
        expect.objectContaining({
          name: '1-1',
        }),
        expect.objectContaining({
          name: '1-2',
        }),
        expect.objectContaining({
          name: '2',
        }),
        expect.objectContaining({
          name: '2-1',
        }),
        expect.objectContaining({
          name: '2-2',
        }),
      ]);
    });
  });

  describe('getValidFolderName', () => {
    it('Should trim spaces', () => {
      expect(getValidFolderName(' abc  ')).toEqual('abc');
    });
    it('Should remove slashes', () => {
      expect(getValidFolderName('/abc/123')).toEqual('abc123');
    });
  });

  describe('getSortedItems', () => {
    const fileA: WebDavFile = {
      name: 'a',
      size: 1,
      type: WebDavItemType.FILE,
      mtime: '1/1/2022',
      path: '',
      relativePath: '',
      url: '',
    };
    const fileZ: WebDavFile = {
      name: 'z',
      size: 999,
      type: WebDavItemType.FILE,
      mtime: '12/31/2022',
      path: '',
      relativePath: '',
      url: '',
    };
    const categoryA: WebDavDirectory = {
      type: WebDavItemType.DIRECTORY,
      name: 'a',
      path: '',
      relativePath: '',
      mtime: '1/1/2022',
      url: '',
    };
    const categoryZ: WebDavDirectory = {
      type: WebDavItemType.DIRECTORY,
      name: 'z',
      path: '',
      relativePath: '',
      mtime: '12/31/2022',
      url: '',
    };

    it('Should sort by name: a to z', () => {
      expect(getSortedItems([categoryZ, categoryA, fileZ, fileA], Sort.NAME_ASC)).toEqual([
        categoryA,
        categoryZ,
        fileA,
        fileZ,
      ]);
    });

    it('Should sort by name: z to a', () => {
      expect(getSortedItems([categoryA, categoryZ, fileA, fileZ], Sort.NAME_DESC)).toEqual([
        categoryZ,
        categoryA,
        fileZ,
        fileA,
      ]);
    });

    it('Should sort by size: smallest', () => {
      expect(getSortedItems([categoryZ, categoryA, fileZ, fileA], Sort.SIZE_ASC)).toEqual([
        categoryZ,
        categoryA,
        fileA,
        fileZ,
      ]);
    });

    it('Should sort by size: biggest', () => {
      expect(getSortedItems([categoryA, categoryZ, fileA, fileZ], Sort.SIZE_DESC)).toEqual([
        categoryA,
        categoryZ,
        fileZ,
        fileA,
      ]);
    });

    it('Should sort by modified: newest', () => {
      expect(getSortedItems([categoryZ, categoryA, fileZ, fileA], Sort.LAST_MODIFIED_ASC)).toEqual([
        categoryZ,
        categoryA,
        fileA,
        fileZ,
      ]);
    });

    it('Should sort by modified: oldest', () => {
      expect(getSortedItems([categoryA, categoryZ, fileA, fileZ], Sort.LAST_MODIFIED_DESC)).toEqual([
        categoryA,
        categoryZ,
        fileZ,
        fileA,
      ]);
    });

    it('Should work if array is not specified', () => {
      expect(getSortedItems(undefined, Sort.NAME_DESC)).toEqual([]);
    });
  });
});
