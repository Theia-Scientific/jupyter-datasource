import { Sort } from './types';
import { PathEntryDirectory, PathEntryFile, PathEntry } from '@theia/types';
import { getPlainCategories, getSortedItems, getUpdatedTree } from './utils';

describe('Files List Utils', () => {
  const last_modified = '123';
  const size = 123;

  describe('getUpdatedTree', () => {
    it('Should update root tree', () => {
      const children: Array<Partial<PathEntry>> = [
        {
          type: 'directory',
          name: 'dir1',
          last_modified,
        },
        {
          type: 'directory',
          name: 'dir2',
          last_modified,
        },
        {
          type: 'notebook',
          name: 'file1.png',
          last_modified,
          size,
        },
      ];
      const tree: PathEntryDirectory = {
        name: 'Media',
        path: '/media',
        type: 'directory',
        last_modified: '123',
      };
      const result = getUpdatedTree(tree, tree, children as PathEntry[]);

      expect(result.children).toEqual(
        children.map((childItem) => ({
          ...childItem,
          path: `/media/${childItem.name}`,
        }))
      );
    });

    it('Should update nested tree', () => {
      const tree: PathEntryDirectory = {
        name: 'Media',
        path: '/media',
        type: 'directory',
        last_modified: '123',
        children: [
          {
            type: 'directory',
            name: 'dir1',
            path: '/media/dir1',
            last_modified,
            children: [
              {
                type: 'directory',
                name: 'dir2',
                last_modified,
                path: '/media/dir1/dir2',
              },
              {
                type: 'notebook',
                name: 'file2.png',
                path: '/media/dir1/file2.png',
                last_modified,
                size,
              },
            ],
          },
          {
            type: 'notebook',
            name: 'file1.png',
            path: '/media/file1.png',
            last_modified,
            size,
          },
        ],
      };

      const children: Array<Partial<PathEntry>> = [
        {
          type: 'notebook',
          name: 'file1.png',
          last_modified,
          size,
        },
        {
          type: 'notebook',
          name: 'file2.png',
          last_modified,
          size,
        },
      ];
      const result = getUpdatedTree(
        tree,
        (tree.children?.[0] as any).children[0],
        children as PathEntry[]
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
        type: 'directory',
        children: [
          {
            name: '1',
            path: '/0/1',
            type: 'directory',
            children: [
              {
                name: '1-1',
                path: '/0/1/1',
                type: 'directory',
              },
              {
                name: '1-2',
                path: '/0/1/2',
                type: 'directory',
              },
              {
                name: 'file.png',
                path: '/0/1/file.png',
                type: 'notebook',
              },
            ],
          },
          {
            name: '2',
            path: '/0/2',
            type: 'directory',
            children: [
              {
                name: '2-1',
                path: '/0/2/1',
                type: 'directory',
              },
              {
                name: '2-2',
                path: '/0/2/2',
                type: 'directory',
              },
            ],
          },
        ],
      };

      const result = getPlainCategories(tree as PathEntryDirectory);

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

  describe('getSortedItems', () => {
    const fileA: PathEntryFile = {
      name: 'a',
      size: 1,
      type: 'notebook',
      last_modified: '1/1/2022',
      path: '',
    };
    const fileZ: PathEntryFile = {
      name: 'z',
      size: 999,
      type: 'notebook',
      last_modified: '12/31/2022',
      path: '',
    };
    const categoryA: PathEntryDirectory = {
      type: 'directory',
      name: 'a',
      path: '',
      last_modified: '1/1/2022',
    };
    const categoryZ: PathEntryDirectory = {
      type: 'directory',
      name: 'z',
      path: '',
      last_modified: '12/31/2022',
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
