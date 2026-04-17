import { testData } from '@theia/__testUtils__';
import { useMemo } from 'react';

export const useWebDavApi = jest.fn(() =>
  useMemo(
    () => ({
      list: jest.fn((url) => {
        if (/media$/.test(url)) {
          return testData.files.rootTree.children;
        }

        return testData.files.dir1Tree.children;
      }),
      get: jest.fn(() => testData.files.image),
      rename: jest.fn(() => Promise.resolve()),
      createDirectory: jest.fn(() => Promise.resolve()),
      upload: jest.fn(() => Promise.resolve()),
      remove: jest.fn(() => Promise.resolve()),
    }),
    []
  )
);
