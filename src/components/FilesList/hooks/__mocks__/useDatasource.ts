import { testData } from '@theia/__testUtils__';
import { useMemo } from 'react';

export const useDatasource = jest.fn(() =>
  useMemo(
    () => ({
      list: jest.fn((url) => {
        if (/media$/.test(url)) {
          return testData.files.rootTree.children;
        }

        return testData.files.dir1Tree.children;
      }),
    }),
    []
  )
);
