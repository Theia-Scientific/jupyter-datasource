import { act, fireEvent, render, screen, within } from '@testing-library/react';
import { testData } from '@theia/__testUtils__';
import { TEST_IDS } from '@theia/constants';
import { getJestSelectors } from '@volkovlabs/jest-selectors';
import React, { useMemo } from 'react';

import { FilesList } from './FilesList';
import { useDatasource } from './hooks/useDatasource';

/**
 * Props
 */
type Props = React.ComponentProps<typeof FilesList>;

/**
 * Mock api
 */
jest.mock('./hooks/useDatasource.ts');

describe('Files List', () => {
  /**
   * Selectors
   */
  const getSelectors = getJestSelectors(TEST_IDS.filesList);
  const selectors = getSelectors(screen);

  /**
   * Get Tested Component
   */
  const getComponent = (props: Partial<Props>) => {
    return <FilesList onSelectFile={jest.fn()} rootPath="/media" {...(props as any)} />;
  };

  /**
   * Render Without errors
   */
  const renderWithoutErrors = async (component: React.ReactElement) => {
    await act(async () => {
      await render(component);
    });
  };

  /**
   * Open category
   */
  const openCategory = async (path: string): Promise<ReturnType<typeof getSelectors>> => {
    /**
     * Check category presence
     */
    expect(selectors.category(false, path)).toBeInTheDocument();

    /**
     * Open
     */
    await act(async () => {
      fireEvent.click(selectors.category(false, path));
    });

    /**
     * Check if category opened
     */
    expect(selectors.categoryContent(false, path)).toBeInTheDocument();

    /**
     * Return category selectors
     */
    return getSelectors(within(selectors.categoryContent(false, path)));
  };

  it('Should render component', async () => {
    await renderWithoutErrors(getComponent({}));

    expect(selectors.root()).toBeInTheDocument();
    expect(selectors.errorMessage(true)).not.toBeInTheDocument();
  });

  it('Should show error', async () => {
    jest.mocked(useDatasource).mockImplementationOnce(() =>
      useMemo(
        () =>
          ({
            list: jest.fn(() => {
              throw testData.apiDatasource.apiError;
            }),
          }) as any,
        []
      )
    );
    await renderWithoutErrors(getComponent({}));

    expect(selectors.root()).toBeInTheDocument();
    expect(selectors.errorMessage()).toBeInTheDocument();

    /**
     * Close error
     */
    await act(async () => fireEvent.click(within(selectors.errorMessage()).getByLabelText('Close alert')));

    /**
     * Check if error closed
     */
    expect(selectors.errorMessage(true)).not.toBeInTheDocument();
  });

  it('Should show no files message', async () => {
    jest.mocked(useDatasource).mockImplementationOnce(() =>
      useMemo(
        () =>
          ({
            list: jest.fn(() => null),
          }) as any,
        []
      )
    );
    await renderWithoutErrors(getComponent({}));

    expect(selectors.root()).toBeInTheDocument();
    expect(selectors.noFilesMessage()).toBeInTheDocument();
  });

  it('Should render only root tree', async () => {
    await renderWithoutErrors(getComponent({}));

    expect(selectors.tree(false, testData.files.rootTree.path)).toBeInTheDocument();
    expect(selectors.category(false, testData.files.rootTree.content[0].path)).toBeInTheDocument();
    expect(selectors.file(false, testData.files.rootTree.content[1].path)).toBeInTheDocument();

    /**
     * Nested trees should not be rendered
     */
    expect(selectors.category(true, testData.files.dir1Tree.content[0].path)).not.toBeInTheDocument();
  });

  it('Should select file', async () => {
    const onSelectFile = jest.fn();
    await renderWithoutErrors(getComponent({ onSelectFile }));

    expect(selectors.file(false, testData.files.rootTree.content[1].path)).toBeInTheDocument();

    /**
     * Click on file
     */
    fireEvent.click(selectors.fileName(false, testData.files.rootTree.content[1].path));

    expect(onSelectFile).toHaveBeenCalledWith(
      expect.objectContaining({
        path: testData.files.rootTree.content[1].path,
      })
    );
  });

  it('Should load nested tree', async () => {
    await renderWithoutErrors(getComponent({}));

    const category = await openCategory(testData.files.rootTree.content[0].path);

    expect(category.file(false, testData.files.dir1Tree.content[0].path)).toBeInTheDocument();
  });

  it('Should change sorting', async () => {
    const onSelectFile = jest.fn();
    await renderWithoutErrors(getComponent({ onSelectFile }));

    expect(selectors.fieldSort()).toHaveValue("Name: A to Z");

    /**
     * Change sorting
     */
    await act(async () => fireEvent.change(selectors.fieldSort(), { target: { value: "Name: Z to A" } }));

    expect(selectors.fieldSort()).toHaveValue("Name: Z to A");
  });

  describe('Search', () => {
    it('Should filter only files', async () => {
      await renderWithoutErrors(getComponent({}));

      /**
       * Enable Search
       */
      await act(async () => fireEvent.click(selectors.buttonToggleSearching()));

      /**
       * Check if search enabled
       */
      expect(selectors.fieldSearch()).toBeInTheDocument();

      /**
       * Change Search
       */
      await act(async () => fireEvent.change(selectors.fieldSearch(), { target: { value: 'fi' } }));

      /**
       * Check if category is shown
       */
      expect(selectors.category(false, testData.files.rootTree.content[0].path)).toBeInTheDocument();

      /**
       * Check if file is found
       */
      expect(selectors.file(false, testData.files.rootTree.content[1].path)).toBeInTheDocument();

      /**
       * Change Search
       */
      await act(async () => fireEvent.change(selectors.fieldSearch(), { target: { value: '123__' } }));

      /**
       * Check if category is still shown
       */
      expect(selectors.category(false, testData.files.rootTree.content[0].path)).toBeInTheDocument();

      /**
       * Check if file is filtered
       */
      expect(selectors.file(true, testData.files.rootTree.content[1].path)).not.toBeInTheDocument();
    });

    it('Should be case insensitive', async () => {
      await renderWithoutErrors(getComponent({}));

      /**
       * Enable Search
       */
      await act(async () => fireEvent.click(selectors.buttonToggleSearching()));

      /**
       * Check if search enabled
       */
      expect(selectors.fieldSearch()).toBeInTheDocument();

      /**
       * Change Search
       */
      await act(async () => fireEvent.change(selectors.fieldSearch(), { target: { value: 'Fi' } }));

      /**
       * Check if file is found
       */
      expect(selectors.file(false, testData.files.rootTree.content[1].path)).toBeInTheDocument();
    });
  });

  describe('Expand/Collapse', () => {
    it('Should expand and collapse level', async () => {
      await renderWithoutErrors(getComponent({}));

      expect(selectors.buttonExpand()).toBeInTheDocument();

      /**
       * Expand next level
       */
      await act(async () => fireEvent.click(selectors.buttonExpand()));

      /**
       * Check if 2 level is expanded and loaded
       */
      expect(selectors.file(false, testData.files.dir1Tree.content[0].path)).toBeInTheDocument();

      /**
       * Collapse All
       */
      await act(async () => fireEvent.click(selectors.buttonCollapse()));

      /**
       * Check if 2 level is collapsed
       */
      expect(selectors.file(true, testData.files.dir1Tree.content[0].path)).not.toBeInTheDocument();
    });

    it('Should collapse all after refresh', async () => {
      await renderWithoutErrors(getComponent({}));

      expect(selectors.buttonExpand()).toBeInTheDocument();

      /**
       * Expand next level
       */
      await act(async () => fireEvent.click(selectors.buttonExpand()));

      /**
       * Check if 2 level is expanded
       */
      expect(selectors.file(false, testData.files.dir1Tree.content[0].path)).toBeInTheDocument();

      /**
       * Refresh
       */
      await act(async () => fireEvent.click(selectors.buttonRefresh()));

      /**
       * Check if 2 level is collapsed
       */
      expect(selectors.file(true, testData.files.dir1Tree.content[0].path)).not.toBeInTheDocument();
    });

    it('Should collapse all after item expanded manually', async () => {
      await renderWithoutErrors(getComponent({}));

      expect(selectors.buttonExpand()).toBeInTheDocument();

      /**
       * Expand item
       */
      await openCategory(testData.files.rootTree.content[0].path);

      /**
       * Check if 2 level is expanded
       */
      expect(selectors.file(false, testData.files.dir1Tree.content[0].path)).toBeInTheDocument();

      /**
       * Collapse All
       */
      await act(async () => fireEvent.click(selectors.buttonCollapse()));

      /**
       * Check if 2 level is collapsed
       */
      expect(selectors.file(true, testData.files.dir1Tree.content[0].path)).not.toBeInTheDocument();
    });
  });
});
