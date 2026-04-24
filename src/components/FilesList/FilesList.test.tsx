import { act, fireEvent, render, screen, within } from '@testing-library/react';
import { testData } from '@theia/__testUtils__';
import { TEST_IDS } from '@theia/constants';
import { getJestSelectors } from '@volkovlabs/jest-selectors';
import React, { useMemo } from 'react';

import { FilesList } from './FilesList';
import { useWebDavApi } from './hooks/useWebDavApi';

/**
 * Props
 */
type Props = React.ComponentProps<typeof FilesList>;

/**
 * Mock api
 */
jest.mock('./hooks/useWebDavApi.ts');

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
   * Create WebDav hook mock
   */
  const createWebDavMock = () => ({
    list: jest.fn((url) => {
      if (/media$/.test(url)) {
        return testData.files.rootTree.children;
      }

      return testData.files.dir1Tree.children;
    }),
    move: jest.fn(),
    createDirectory: jest.fn(),
    upload: jest.fn(),
    remove: jest.fn(),
  });

  /**
   * Select Item
   */
  const selectItem = async (path: string) => {
    /**
     * Check if item can be checked
     */
    const itemCheckbox = selectors.itemCheckbox(false, path);
    expect(itemCheckbox).toBeInTheDocument();
    expect(itemCheckbox).not.toBeDisabled();
    expect(itemCheckbox).not.toBeChecked();

    /**
     * Select item
     */
    await act(async () => fireEvent.click(itemCheckbox));

    /**
     * Check if item checked
     */
    expect(itemCheckbox).toBeChecked();
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
    jest.mocked(useWebDavApi).mockImplementationOnce(() =>
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
    jest.mocked(useWebDavApi).mockImplementationOnce(() =>
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
    expect(selectors.category(false, testData.files.rootTree.children[0].path)).toBeInTheDocument();
    expect(selectors.file(false, testData.files.rootTree.children[1].path)).toBeInTheDocument();

    /**
     * Nested trees should not be rendered
     */
    expect(selectors.category(true, testData.files.dir1Tree.children[0].path)).not.toBeInTheDocument();
  });

  it('Should select file', async () => {
    const onSelectFile = jest.fn();
    await renderWithoutErrors(getComponent({ onSelectFile }));

    expect(selectors.file(false, testData.files.rootTree.children[1].path)).toBeInTheDocument();

    /**
     * Click on file
     */
    fireEvent.click(selectors.fileName(false, testData.files.rootTree.children[1].path));

    expect(onSelectFile).toHaveBeenCalledWith(
      expect.objectContaining({
        path: testData.files.rootTree.children[1].path,
      })
    );
  });

  it('Should select file by play button', async () => {
    const onSelectFile = jest.fn();
    await renderWithoutErrors(getComponent({ onSelectFile }));

    expect(selectors.file(false, testData.files.rootTree.children[1].path)).toBeInTheDocument();

    /**
     * Click on file
     */
    const fileSelectors = getSelectors(within(selectors.file(false, testData.files.rootTree.children[1].path)));
    fireEvent.click(fileSelectors.buttonFilePlay());

    expect(onSelectFile).toHaveBeenCalledWith(
      expect.objectContaining({
        path: testData.files.rootTree.children[1].path,
      })
    );
  });

  it('Should load nested tree', async () => {
    await renderWithoutErrors(getComponent({}));

    const category = await openCategory(testData.files.rootTree.children[0].path);

    expect(category.file(false, testData.files.dir1Tree.children[0].path)).toBeInTheDocument();
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

  describe('Renaming', () => {
    it('Should update file name', async () => {
      const webDAVMock = createWebDavMock();
      jest.mocked(useWebDavApi).mockImplementation(() => webDAVMock as any);

      await renderWithoutErrors(getComponent({}));

      /**
       * File to edit
       */
      const file = selectors.file(false, testData.files.rootTree.children[1].path);
      expect(file).toBeInTheDocument();

      /**
       * File selectors
       */
      const fileSelectors = getSelectors(within(file));
      expect(fileSelectors.buttonFileStartEdit()).toBeInTheDocument();

      /**
       * Start Edit
       */
      await act(async () => fireEvent.click(fileSelectors.buttonFileStartEdit()));

      expect(fileSelectors.fieldFileName()).toBeInTheDocument();

      /**
       * Change Name
       */
      await act(async () => fireEvent.change(fileSelectors.fieldFileName(), { target: { value: 'a123.png' } }));

      /**
       * Save Edit
       */
      expect(fileSelectors.buttonFileSaveEdit()).toBeInTheDocument();
      expect(fileSelectors.buttonFileSaveEdit()).not.toBeDisabled();

      await act(async () => fireEvent.click(fileSelectors.buttonFileSaveEdit()));

      /**
       * Check if move was called
       */
      expect(webDAVMock.move).toHaveBeenCalledWith(
        expect.stringContaining(testData.files.rootTree.children[1].path),
        expect.stringContaining('a123.png')
      );
    });

    it('Should update file name by enter', async () => {
      const webDAVMock = createWebDavMock();
      jest.mocked(useWebDavApi).mockImplementation(() => webDAVMock as any);

      await renderWithoutErrors(getComponent({}));

      /**
       * File to edit
       */
      const file = selectors.file(false, testData.files.rootTree.children[1].path);
      expect(file).toBeInTheDocument();

      /**
       * File selectors
       */
      const fileSelectors = getSelectors(within(file));
      expect(fileSelectors.buttonFileStartEdit()).toBeInTheDocument();

      /**
       * Start Edit
       */
      await act(async () => fireEvent.click(fileSelectors.buttonFileStartEdit()));

      expect(fileSelectors.fieldFileName()).toBeInTheDocument();

      /**
       * Change Name
       */
      await act(async () => fireEvent.change(fileSelectors.fieldFileName(), { target: { value: 'a123.png' } }));

      /**
       * Press Enter
       */
      await act(async () => fireEvent.keyDown(selectors.fieldFileName(), { key: 'Enter' }));

      /**
       * Check if move was called
       */
      expect(webDAVMock.move).toHaveBeenCalledWith(
        expect.stringContaining(testData.files.rootTree.children[1].path),
        expect.stringContaining('a123.png')
      );
    });

    it('Should not update empty file name', async () => {
      const webDAVMock = createWebDavMock();
      jest.mocked(useWebDavApi).mockImplementation(() => webDAVMock as any);

      await renderWithoutErrors(getComponent({}));

      /**
       * File to edit
       */
      const file = selectors.file(false, testData.files.rootTree.children[1].path);
      expect(file).toBeInTheDocument();

      /**
       * File selectors
       */
      const fileSelectors = getSelectors(within(file));
      expect(fileSelectors.buttonFileStartEdit()).toBeInTheDocument();

      /**
       * Start Edit
       */
      await act(async () => fireEvent.click(fileSelectors.buttonFileStartEdit()));

      expect(fileSelectors.fieldFileName()).toBeInTheDocument();

      /**
       * Change Name
       */
      await act(async () => fireEvent.change(fileSelectors.fieldFileName(), { target: { value: '' } }));

      /**
       * Save Edit
       */
      expect(fileSelectors.buttonFileSaveEdit()).toBeInTheDocument();
      expect(fileSelectors.buttonFileSaveEdit()).not.toBeDisabled();

      await act(async () => fireEvent.click(fileSelectors.buttonFileSaveEdit()));

      /**
       * Check if move was not called
       */
      expect(webDAVMock.move).not.toHaveBeenCalled();

      /**
       * Edit should be canceled
       */
      expect(fileSelectors.buttonFileStartEdit()).toBeInTheDocument();
    });

    it('Should show update file name error', async () => {
      const webDAVMock = createWebDavMock();
      webDAVMock.move.mockImplementation(() => Promise.reject(testData.apiDatasource.apiError));
      jest.mocked(useWebDavApi).mockImplementation(() => webDAVMock as any);

      await renderWithoutErrors(getComponent({}));

      /**
       * File to edit
       */
      const file = selectors.file(false, testData.files.rootTree.children[1].path);
      expect(file).toBeInTheDocument();

      /**
       * File selectors
       */
      const fileSelectors = getSelectors(within(file));
      expect(fileSelectors.buttonFileStartEdit()).toBeInTheDocument();

      /**
       * Start Edit
       */
      await act(async () => fireEvent.click(fileSelectors.buttonFileStartEdit()));

      expect(fileSelectors.fieldFileName()).toBeInTheDocument();

      /**
       * Change Name
       */
      await act(async () => fireEvent.change(fileSelectors.fieldFileName(), { target: { value: 'a123.png' } }));

      /**
       * Save Edit
       */
      expect(fileSelectors.buttonFileSaveEdit()).toBeInTheDocument();
      expect(fileSelectors.buttonFileSaveEdit()).not.toBeDisabled();

      await act(async () => fireEvent.click(fileSelectors.buttonFileSaveEdit()));

      expect(selectors.errorMessage()).toBeInTheDocument();
    });

    it('Should cancel file edit', async () => {
      const webDAVMock = createWebDavMock();
      jest.mocked(useWebDavApi).mockImplementation(() => webDAVMock as any);

      await renderWithoutErrors(getComponent({}));

      /**
       * File to edit
       */
      const file = selectors.file(false, testData.files.rootTree.children[1].path);
      expect(file).toBeInTheDocument();

      /**
       * File selectors
       */
      const fileSelectors = getSelectors(within(file));
      expect(fileSelectors.buttonFileStartEdit()).toBeInTheDocument();

      /**
       * Start Edit
       */
      await act(async () => fireEvent.click(fileSelectors.buttonFileStartEdit()));

      expect(fileSelectors.fieldFileName()).toBeInTheDocument();

      /**
       * Change Name
       */
      await act(async () => fireEvent.change(fileSelectors.fieldFileName(), { target: { value: 'a123.png' } }));

      /**
       * Cancel Edit
       */
      expect(fileSelectors.buttonFileCancelEdit()).toBeInTheDocument();
      expect(fileSelectors.buttonFileCancelEdit()).not.toBeDisabled();

      await act(async () => fireEvent.click(fileSelectors.buttonFileCancelEdit()));

      /**
       * Check if move was not called
       */
      expect(webDAVMock.move).not.toHaveBeenCalled();
    });

    it('Should cancel file edit by escape button', async () => {
      const webDAVMock = createWebDavMock();
      jest.mocked(useWebDavApi).mockImplementation(() => webDAVMock as any);

      await renderWithoutErrors(getComponent({}));

      /**
       * File to edit
       */
      const file = selectors.file(false, testData.files.rootTree.children[1].path);
      expect(file).toBeInTheDocument();

      /**
       * File selectors
       */
      const fileSelectors = getSelectors(within(file));
      expect(fileSelectors.buttonFileStartEdit()).toBeInTheDocument();

      /**
       * Start Edit
       */
      await act(async () => fireEvent.click(fileSelectors.buttonFileStartEdit()));

      expect(fileSelectors.fieldFileName()).toBeInTheDocument();

      /**
       * Change Name
       */
      await act(async () => fireEvent.change(fileSelectors.fieldFileName(), { target: { value: 'a123.png' } }));

      /**
       * Press Escape
       */
      await act(async () => fireEvent.keyDown(fileSelectors.fieldFileName(), { key: 'Escape' }));

      /**
       * Check if move was not called
       */
      expect(webDAVMock.move).not.toHaveBeenCalled();
    });

    it('Should update category name', async () => {
      const webDAVMock = createWebDavMock();
      jest.mocked(useWebDavApi).mockImplementation(() => webDAVMock as any);

      await renderWithoutErrors(getComponent({}));

      /**
       * Category to edit
       */
      const category = selectors.category(false, testData.files.rootTree.children[0].path);
      expect(category).toBeInTheDocument();

      /**
       * Category selectors
       */
      const categorySelectors = getSelectors(within(category));
      expect(categorySelectors.buttonCategoryStartEdit()).toBeInTheDocument();

      /**
       * Start Edit
       */
      await act(async () => fireEvent.click(categorySelectors.buttonCategoryStartEdit()));

      expect(categorySelectors.fieldCategoryName()).toBeInTheDocument();

      /**
       * Start Edit should not expand content
       */
      expect(categorySelectors.categoryContent(true, testData.files.rootTree.children[0].path)).not.toBeInTheDocument();

      /**
       * Change Name
       */
      await act(async () => fireEvent.change(categorySelectors.fieldCategoryName(), { target: { value: 'a123' } }));

      /**
       * Save Edit
       */
      expect(categorySelectors.buttonCategorySaveEdit()).toBeInTheDocument();
      expect(categorySelectors.buttonCategorySaveEdit()).not.toBeDisabled();

      await act(async () => fireEvent.click(categorySelectors.buttonCategorySaveEdit()));

      /**
       * Check if move was called
       */
      expect(webDAVMock.move).toHaveBeenCalledWith(
        expect.stringContaining(testData.files.rootTree.children[0].path),
        expect.stringContaining('a123/')
      );
    });

    it('Should not update with invalid category name', async () => {
      const webDAVMock = createWebDavMock();
      jest.mocked(useWebDavApi).mockImplementation(() => webDAVMock as any);

      await renderWithoutErrors(getComponent({}));

      /**
       * Category to edit
       */
      const category = selectors.category(false, testData.files.rootTree.children[0].path);
      expect(category).toBeInTheDocument();

      /**
       * Category selectors
       */
      const categorySelectors = getSelectors(within(category));
      expect(categorySelectors.buttonCategoryStartEdit()).toBeInTheDocument();

      /**
       * Start Edit
       */
      await act(async () => fireEvent.click(categorySelectors.buttonCategoryStartEdit()));

      expect(categorySelectors.fieldCategoryName()).toBeInTheDocument();

      /**
       * Start Edit should not expand content
       */
      expect(categorySelectors.categoryContent(true, testData.files.rootTree.children[0].path)).not.toBeInTheDocument();

      /**
       * Change to invalid Name
       */
      await act(async () => fireEvent.change(categorySelectors.fieldCategoryName(), { target: { value: '   /  ' } }));

      /**
       * Save Edit
       */
      expect(categorySelectors.buttonCategorySaveEdit()).toBeInTheDocument();
      expect(categorySelectors.buttonCategorySaveEdit()).not.toBeDisabled();

      await act(async () => fireEvent.click(categorySelectors.buttonCategorySaveEdit()));

      /**
       * Check if move was not called
       */
      expect(webDAVMock.move).not.toHaveBeenCalled();
    });

    it('Should update category name by enter ', async () => {
      const webDAVMock = createWebDavMock();
      jest.mocked(useWebDavApi).mockImplementation(() => webDAVMock as any);

      await renderWithoutErrors(getComponent({}));

      /**
       * Category to edit
       */
      const category = selectors.category(false, testData.files.rootTree.children[0].path);
      expect(category).toBeInTheDocument();

      /**
       * Category selectors
       */
      const categorySelectors = getSelectors(within(category));
      expect(categorySelectors.buttonCategoryStartEdit()).toBeInTheDocument();

      /**
       * Start Edit
       */
      await act(async () => fireEvent.click(categorySelectors.buttonCategoryStartEdit()));

      expect(categorySelectors.fieldCategoryName()).toBeInTheDocument();

      /**
       * Start Edit should not expand content
       */
      expect(categorySelectors.categoryContent(true, testData.files.rootTree.children[0].path)).not.toBeInTheDocument();

      /**
       * Change Name
       */
      await act(async () => fireEvent.change(categorySelectors.fieldCategoryName(), { target: { value: 'a123' } }));

      /**
       * Press Enter
       */
      await act(async () => fireEvent.keyDown(categorySelectors.fieldCategoryName(), { key: 'Enter' }));

      /**
       * Check if move was called
       */
      expect(webDAVMock.move).toHaveBeenCalledWith(
        expect.stringContaining(testData.files.rootTree.children[0].path),
        expect.stringContaining('a123/')
      );
    });

    it('Should cancel category edit', async () => {
      const webDAVMock = createWebDavMock();
      jest.mocked(useWebDavApi).mockImplementation(() => webDAVMock as any);

      await renderWithoutErrors(getComponent({}));

      /**
       * Category to edit
       */
      const category = selectors.category(false, testData.files.rootTree.children[0].path);
      expect(category).toBeInTheDocument();

      /**
       * Category selectors
       */
      const categorySelectors = getSelectors(within(category));
      expect(categorySelectors.buttonCategoryStartEdit()).toBeInTheDocument();

      /**
       * Start Edit
       */
      await act(async () => fireEvent.click(categorySelectors.buttonCategoryStartEdit()));

      expect(categorySelectors.fieldCategoryName()).toBeInTheDocument();

      /**
       * Change Name
       */
      await act(async () => fireEvent.change(categorySelectors.fieldCategoryName(), { target: { value: 'a123' } }));

      /**
       * Cancel Edit
       */
      expect(categorySelectors.buttonCategoryCancelEdit()).toBeInTheDocument();
      expect(categorySelectors.buttonCategoryCancelEdit()).not.toBeDisabled();

      await act(async () => fireEvent.click(categorySelectors.buttonCategoryCancelEdit()));

      /**
       * Check if move was not called
       */
      expect(webDAVMock.move).not.toHaveBeenCalled();
    });

    it('Should cancel category edit by escape', async () => {
      const webDAVMock = createWebDavMock();
      jest.mocked(useWebDavApi).mockImplementation(() => webDAVMock as any);

      await renderWithoutErrors(getComponent({}));

      /**
       * Category to edit
       */
      const category = selectors.category(false, testData.files.rootTree.children[0].path);
      expect(category).toBeInTheDocument();

      /**
       * Category selectors
       */
      const categorySelectors = getSelectors(within(category));
      expect(categorySelectors.buttonCategoryStartEdit()).toBeInTheDocument();

      /**
       * Start Edit
       */
      await act(async () => fireEvent.click(categorySelectors.buttonCategoryStartEdit()));

      expect(categorySelectors.fieldCategoryName()).toBeInTheDocument();

      /**
       * Change Name
       */
      await act(async () => fireEvent.change(categorySelectors.fieldCategoryName(), { target: { value: 'a123' } }));

      /**
       * Press Escape
       */

      await act(async () => fireEvent.keyDown(categorySelectors.fieldCategoryName(), { key: 'Escape' }));

      /**
       * Check if move was not called
       */
      expect(webDAVMock.move).not.toHaveBeenCalled();
    });
  });

  describe('Add category', () => {
    it('Should add new category', async () => {
      const webDAVMock = createWebDavMock();
      jest.mocked(useWebDavApi).mockImplementation(() => webDAVMock as any);

      await renderWithoutErrors(getComponent({}));

      /**
       * Open category
       */
      const categorySelectors = await openCategory(testData.files.rootTree.children[0].path);
      const categoryHeaderSelectors = getSelectors(
        within(selectors.category(false, testData.files.rootTree.children[0].path))
      );

      /**
       * Check if able to add category
       */
      expect(categoryHeaderSelectors.buttonAddCategory()).toBeInTheDocument();
      expect(categoryHeaderSelectors.buttonAddCategory()).not.toBeDisabled();

      /**
       * Start adding category
       */
      await act(async () => fireEvent.click(categoryHeaderSelectors.buttonAddCategory()));

      /**
       * Set new category name
       */
      expect(categorySelectors.fieldNewCategoryName()).toBeInTheDocument();
      await act(async () => fireEvent.change(categorySelectors.fieldNewCategoryName(), { target: { value: '123' } }));

      /**
       * Add new category
       */
      expect(categorySelectors.buttonSaveAddCategory()).not.toBeDisabled();
      await act(async () => fireEvent.click(categorySelectors.buttonSaveAddCategory()));

      /**
       * Check if new category was created
       */
      expect(webDAVMock.createDirectory).toHaveBeenCalledWith(expect.stringContaining('123/'));

      /**
       * Check if form closed
       */
      expect(categorySelectors.fieldNewCategoryName(true)).not.toBeInTheDocument();
    });

    it('Should not add new category with invalid name', async () => {
      const webDAVMock = createWebDavMock();
      jest.mocked(useWebDavApi).mockImplementation(() => webDAVMock as any);

      await renderWithoutErrors(getComponent({}));

      /**
       * Open category
       */
      const categorySelectors = await openCategory(testData.files.rootTree.children[0].path);
      const categoryHeaderSelectors = getSelectors(
        within(selectors.category(false, testData.files.rootTree.children[0].path))
      );

      /**
       * Check if able to add category
       */
      expect(categoryHeaderSelectors.buttonAddCategory()).toBeInTheDocument();
      expect(categoryHeaderSelectors.buttonAddCategory()).not.toBeDisabled();

      /**
       * Start adding category
       */
      await act(async () => fireEvent.click(categoryHeaderSelectors.buttonAddCategory()));

      /**
       * Set new category name
       */
      expect(categorySelectors.fieldNewCategoryName()).toBeInTheDocument();
      await act(async () => fireEvent.change(categorySelectors.fieldNewCategoryName(), { target: { value: ' / ' } }));

      /**
       * Add new category
       */
      expect(categorySelectors.buttonSaveAddCategory()).not.toBeDisabled();
      await act(async () => fireEvent.click(categorySelectors.buttonSaveAddCategory()));

      /**
       * Check if new category was not created
       */
      expect(webDAVMock.createDirectory).not.toHaveBeenCalled();
    });

    it('Should show add new category error', async () => {
      const webDAVMock = createWebDavMock();
      webDAVMock.createDirectory.mockRejectedValue(testData.apiDatasource.apiError);
      jest.mocked(useWebDavApi).mockImplementation(() => webDAVMock as any);

      await renderWithoutErrors(getComponent({}));

      /**
       * Open category
       */
      const categorySelectors = await openCategory(testData.files.rootTree.children[0].path);
      const categoryHeaderSelectors = getSelectors(
        within(selectors.category(false, testData.files.rootTree.children[0].path))
      );

      /**
       * Check if able to add category
       */
      expect(categoryHeaderSelectors.buttonAddCategory()).toBeInTheDocument();
      expect(categoryHeaderSelectors.buttonAddCategory()).not.toBeDisabled();

      /**
       * Start adding category
       */
      await act(async () => fireEvent.click(categoryHeaderSelectors.buttonAddCategory()));

      /**
       * Set new category name
       */
      expect(categorySelectors.fieldNewCategoryName()).toBeInTheDocument();
      await act(async () => fireEvent.change(categorySelectors.fieldNewCategoryName(), { target: { value: 'abc3' } }));

      /**
       * Add new category
       */
      expect(categorySelectors.buttonSaveAddCategory()).not.toBeDisabled();
      await act(async () => fireEvent.click(categorySelectors.buttonSaveAddCategory()));

      /**
       * Check if error shown
       */
      expect(selectors.errorMessage()).toBeInTheDocument();
    });

    it('Should add new category by enter', async () => {
      const webDAVMock = createWebDavMock();
      jest.mocked(useWebDavApi).mockImplementation(() => webDAVMock as any);

      await renderWithoutErrors(getComponent({}));

      /**
       * Open category
       */
      const categorySelectors = await openCategory(testData.files.rootTree.children[0].path);
      const categoryHeaderSelectors = getSelectors(
        within(selectors.category(false, testData.files.rootTree.children[0].path))
      );

      /**
       * Check if able to add category
       */
      expect(categoryHeaderSelectors.buttonAddCategory()).toBeInTheDocument();
      expect(categoryHeaderSelectors.buttonAddCategory()).not.toBeDisabled();

      /**
       * Start adding category
       */
      await act(async () => fireEvent.click(categoryHeaderSelectors.buttonAddCategory()));

      /**
       * Set new category name
       */
      expect(categorySelectors.fieldNewCategoryName()).toBeInTheDocument();
      await act(async () => fireEvent.change(categorySelectors.fieldNewCategoryName(), { target: { value: '123' } }));

      /**
       * Press Enter
       */
      await act(async () => fireEvent.keyDown(categorySelectors.fieldNewCategoryName(), { key: 'Enter' }));

      /**
       * Check if new category was created
       */
      expect(webDAVMock.createDirectory).toHaveBeenCalledWith(expect.stringContaining('123/'));

      /**
       * Check if form closed
       */
      expect(categorySelectors.fieldNewCategoryName(true)).not.toBeInTheDocument();
    });

    it('Should cancel add category', async () => {
      const webDAVMock = createWebDavMock();
      jest.mocked(useWebDavApi).mockImplementation(() => webDAVMock as any);

      await renderWithoutErrors(getComponent({}));

      /**
       * Open category
       */
      const categorySelectors = await openCategory(testData.files.rootTree.children[0].path);
      const categoryHeaderSelectors = getSelectors(
        within(selectors.category(false, testData.files.rootTree.children[0].path))
      );

      /**
       * Check if able to add category
       */
      expect(categoryHeaderSelectors.buttonAddCategory()).toBeInTheDocument();
      expect(categoryHeaderSelectors.buttonAddCategory()).not.toBeDisabled();

      /**
       * Start adding category
       */
      await act(async () => fireEvent.click(categoryHeaderSelectors.buttonAddCategory()));

      /**
       * Set new category name
       */
      expect(categorySelectors.fieldNewCategoryName()).toBeInTheDocument();
      await act(async () => fireEvent.change(categorySelectors.fieldNewCategoryName(), { target: { value: '123' } }));

      /**
       * Cancel add category
       */
      await act(async () => fireEvent.click(categorySelectors.buttonCancelAddCategory()));

      /**
       * Check if new category not created
       */
      expect(webDAVMock.createDirectory).not.toHaveBeenCalled();

      /**
       * Check if form closed
       */
      expect(categorySelectors.fieldNewCategoryName(true)).not.toBeInTheDocument();
    });

    it('Should cancel add category by Escape', async () => {
      const webDAVMock = createWebDavMock();
      jest.mocked(useWebDavApi).mockImplementation(() => webDAVMock as any);

      await renderWithoutErrors(getComponent({}));

      /**
       * Open category
       */
      const categorySelectors = await openCategory(testData.files.rootTree.children[0].path);
      const categoryHeaderSelectors = getSelectors(
        within(selectors.category(false, testData.files.rootTree.children[0].path))
      );

      /**
       * Check if able to add category
       */
      expect(categoryHeaderSelectors.buttonAddCategory()).toBeInTheDocument();
      expect(categoryHeaderSelectors.buttonAddCategory()).not.toBeDisabled();

      /**
       * Start adding category
       */
      await act(async () => fireEvent.click(categoryHeaderSelectors.buttonAddCategory()));

      /**
       * Set new category name
       */
      expect(categorySelectors.fieldNewCategoryName()).toBeInTheDocument();
      await act(async () => fireEvent.change(categorySelectors.fieldNewCategoryName(), { target: { value: '123' } }));

      /**
       * Press Escape
       */
      await act(async () => fireEvent.keyDown(categorySelectors.fieldNewCategoryName(), { key: 'Escape' }));

      /**
       * Check if new category not created
       */
      expect(webDAVMock.createDirectory).not.toHaveBeenCalled();

      /**
       * Check if form closed
       */
      expect(categorySelectors.fieldNewCategoryName(true)).not.toBeInTheDocument();
    });

    it('Should clear category name', async () => {
      const webDAVMock = createWebDavMock();
      jest.mocked(useWebDavApi).mockImplementation(() => webDAVMock as any);

      await renderWithoutErrors(getComponent({}));

      /**
       * Open category
       */
      const categorySelectors = await openCategory(testData.files.rootTree.children[0].path);
      const categoryHeaderSelectors = getSelectors(
        within(selectors.category(false, testData.files.rootTree.children[0].path))
      );

      /**
       * Check if able to add category
       */
      expect(categoryHeaderSelectors.buttonAddCategory()).toBeInTheDocument();
      expect(categoryHeaderSelectors.buttonAddCategory()).not.toBeDisabled();

      /**
       * Start adding category
       */
      await act(async () => fireEvent.click(categoryHeaderSelectors.buttonAddCategory()));

      /**
       * Set new category name
       */
      expect(categorySelectors.fieldNewCategoryName()).toBeInTheDocument();
      await act(async () => fireEvent.change(categorySelectors.fieldNewCategoryName(), { target: { value: '123' } }));

      /**
       * Add new category
       */
      expect(categorySelectors.buttonSaveAddCategory()).not.toBeDisabled();
      await act(async () => fireEvent.click(categorySelectors.buttonSaveAddCategory()));

      /**
       * Check if new category was created
       */
      expect(webDAVMock.createDirectory).toHaveBeenCalledWith(expect.stringContaining('123/'));

      /**
       * Check if form closed
       */
      expect(categorySelectors.fieldNewCategoryName(true)).not.toBeInTheDocument();

      /**
       * Start adding category
       */
      await act(async () => fireEvent.click(categoryHeaderSelectors.buttonAddCategory()));

      /**
       * Check if category name cleaned
       */
      expect(categorySelectors.fieldNewCategoryName()).toBeInTheDocument();
      expect(categorySelectors.fieldNewCategoryName()).toHaveValue('');
    });
  });

  describe('Add File', () => {
    it('Should add new file', async () => {
      const webDAVMock = createWebDavMock();
      jest.mocked(useWebDavApi).mockImplementation(() => webDAVMock as any);

      await renderWithoutErrors(getComponent({}));

      /**
       * Open category
       */
      const categorySelectors = await openCategory(testData.files.rootTree.children[0].path);
      const categoryHeaderSelectors = getSelectors(
        within(selectors.category(false, testData.files.rootTree.children[0].path))
      );

      /**
       * Check if able to add file
       */
      expect(categoryHeaderSelectors.buttonAddFile()).toBeInTheDocument();
      expect(categoryHeaderSelectors.buttonAddFile()).not.toBeDisabled();

      /**
       * Start adding file
       */
      await act(async () => fireEvent.click(categoryHeaderSelectors.buttonAddFile()));

      /**
       * Upload Files
       */
      expect(categorySelectors.fieldNewFile()).toBeInTheDocument();
      await act(async () =>
        fireEvent.change(selectors.fieldNewFile(), {
          target: {
            files: [testData.files.image],
          },
        })
      );

      /**
       * Check if new file uploaded
       */
      expect(webDAVMock.upload).toHaveBeenCalledWith(
        expect.stringContaining(testData.files.image.name),
        expect.any(File)
      );

      /**
       * Check if form closed
       */
      expect(categorySelectors.fieldNewFile(true)).not.toBeInTheDocument();
    });

    it('Should call upload file', async () => {
      const uploadFile = jest.fn();

      await renderWithoutErrors(getComponent({ uploadFile }));

      /**
       * Open category
       */
      const categorySelectors = await openCategory(testData.files.rootTree.children[0].path);
      const categoryHeaderSelectors = getSelectors(
        within(selectors.category(false, testData.files.rootTree.children[0].path))
      );

      /**
       * Check if able to add file
       */
      expect(categoryHeaderSelectors.buttonAddFile()).toBeInTheDocument();
      expect(categoryHeaderSelectors.buttonAddFile()).not.toBeDisabled();

      /**
       * Start adding file
       */
      await act(async () => fireEvent.click(categoryHeaderSelectors.buttonAddFile()));

      /**
       * Upload Files
       */
      expect(categorySelectors.fieldNewFile()).toBeInTheDocument();
      await act(async () =>
        fireEvent.change(selectors.fieldNewFile(), {
          target: {
            files: [testData.files.image],
          },
        })
      );

      /**
       * Check if new file uploaded
       */
      expect(uploadFile).toHaveBeenCalledWith(
        expect.objectContaining({
          path: testData.files.rootTree.children[0].path,
        }),
        expect.any(File)
      );

      /**
       * Check if form closed
       */
      expect(categorySelectors.fieldNewFile(true)).not.toBeInTheDocument();
    });

    it('Should show add new file error', async () => {
      const webDAVMock = createWebDavMock();
      webDAVMock.upload.mockRejectedValue(testData.apiDatasource.apiError);
      jest.mocked(useWebDavApi).mockImplementation(() => webDAVMock as any);

      await renderWithoutErrors(getComponent({}));

      /**
       * Open category
       */
      const categorySelectors = await openCategory(testData.files.rootTree.children[0].path);
      const categoryHeaderSelectors = getSelectors(
        within(selectors.category(false, testData.files.rootTree.children[0].path))
      );

      /**
       * Check if able to add file
       */
      expect(categoryHeaderSelectors.buttonAddFile()).toBeInTheDocument();
      expect(categoryHeaderSelectors.buttonAddFile()).not.toBeDisabled();

      /**
       * Start adding file
       */
      await act(async () => fireEvent.click(categoryHeaderSelectors.buttonAddFile()));

      /**
       * Upload Files
       */
      expect(categorySelectors.fieldNewFile()).toBeInTheDocument();
      await act(async () =>
        fireEvent.change(selectors.fieldNewFile(), {
          target: {
            files: [testData.files.image],
          },
        })
      );

      /**
       * Check if error shown
       */
      expect(selectors.errorMessage()).toBeInTheDocument();

      /**
       * Check if form closed
       */
      expect(categorySelectors.fieldNewFile(true)).not.toBeInTheDocument();
    });

    it('Should cancel add new file', async () => {
      const webDAVMock = createWebDavMock();
      jest.mocked(useWebDavApi).mockImplementation(() => webDAVMock as any);

      await renderWithoutErrors(getComponent({}));

      /**
       * Open category
       */
      const categorySelectors = await openCategory(testData.files.rootTree.children[0].path);
      const categoryHeaderSelectors = getSelectors(
        within(selectors.category(false, testData.files.rootTree.children[0].path))
      );

      /**
       * Check if able to add file
       */
      expect(categoryHeaderSelectors.buttonAddFile()).toBeInTheDocument();
      expect(categoryHeaderSelectors.buttonAddFile()).not.toBeDisabled();

      /**
       * Start adding file
       */
      await act(async () => fireEvent.click(categoryHeaderSelectors.buttonAddFile()));

      /**
       * Cancel adding file
       */
      expect(categorySelectors.buttonCancelAddFile()).toBeInTheDocument();
      await act(async () => fireEvent.click(categorySelectors.buttonCancelAddFile()));

      /**
       * Check if form closed
       */
      expect(categorySelectors.fieldNewFile(true)).not.toBeInTheDocument();
    });
  });

  describe('Add Root category', () => {
    it('Should add new category', async () => {
      const webDAVMock = createWebDavMock();
      jest.mocked(useWebDavApi).mockImplementation(() => webDAVMock as any);

      await renderWithoutErrors(getComponent({}));

      /**
       * Check if able to add category
       */
      expect(selectors.buttonAddRootCategory()).toBeInTheDocument();
      expect(selectors.buttonAddRootCategory()).not.toBeDisabled();

      /**
       * Start adding category
       */
      await act(async () => fireEvent.click(selectors.buttonAddRootCategory()));

      /**
       * Set new category name
       */
      expect(selectors.fieldNewCategoryName()).toBeInTheDocument();
      await act(async () => fireEvent.change(selectors.fieldNewCategoryName(), { target: { value: '123' } }));

      /**
       * Add new category
       */
      expect(selectors.buttonSaveAddCategory()).not.toBeDisabled();
      await act(async () => fireEvent.click(selectors.buttonSaveAddCategory()));

      /**
       * Check if new category was created
       */
      expect(webDAVMock.createDirectory).toHaveBeenCalledWith(expect.stringContaining('123/'));

      /**
       * Check if form closed
       */
      expect(selectors.fieldNewCategoryName(true)).not.toBeInTheDocument();
    });
  });

  describe('Add Root File', () => {
    it('Should add new file', async () => {
      const webDAVMock = createWebDavMock();
      jest.mocked(useWebDavApi).mockImplementation(() => webDAVMock as any);

      await renderWithoutErrors(getComponent({}));

      /**
       * Check if able to add file
       */
      expect(selectors.buttonAddRootFile()).toBeInTheDocument();
      expect(selectors.buttonAddRootFile()).not.toBeDisabled();

      /**
       * Start adding file
       */
      await act(async () => fireEvent.click(selectors.buttonAddRootFile()));

      /**
       * Upload Files
       */
      expect(selectors.fieldNewFile()).toBeInTheDocument();
      await act(async () =>
        fireEvent.change(selectors.fieldNewFile(), {
          target: {
            files: [testData.files.image],
          },
        })
      );

      /**
       * Check if new file uploaded
       */
      expect(webDAVMock.upload).toHaveBeenCalledWith(
        expect.stringContaining(testData.files.image.name),
        expect.any(File)
      );

      /**
       * Check if form closed
       */
      expect(selectors.fieldNewFile(true)).not.toBeInTheDocument();
    });
  });

  describe('Moving', () => {
    it('Should move items', async () => {
      const webDAVMock = createWebDavMock();
      jest.mocked(useWebDavApi).mockImplementation(() => webDAVMock as any);

      await renderWithoutErrors(getComponent({}));

      /**
       * Select category and file
       */
      await selectItem(testData.files.rootTree.children[0].path);
      await selectItem(testData.files.rootTree.children[1].path);

      /**
       * Check if items can be moved
       */
      expect(selectors.buttonStartMoving()).toBeInTheDocument();

      /**
       * Open Moving Modal
       */
      await act(async () => fireEvent.click(selectors.buttonStartMoving()));

      /**
       * Set move to path
       */
      expect(selectors.fieldMoveToPath()).toBeInTheDocument();
      await act(async () =>
        fireEvent.change(selectors.fieldMoveToPath(), { target: { value: testData.files.rootTree.path } })
      );

      /**
       * Move
       */
      expect(selectors.buttonSaveMoving()).toBeInTheDocument();
      expect(selectors.buttonSaveMoving()).not.toBeDisabled();
      await act(async () => fireEvent.click(selectors.buttonSaveMoving()));

      /**
       * Check if items moved
       */
      expect(webDAVMock.move).toHaveBeenCalledWith(
        expect.stringContaining(testData.files.rootTree.children[0].path),
        expect.stringContaining(testData.files.rootTree.path)
      );
      expect(webDAVMock.move).toHaveBeenCalledWith(
        expect.stringContaining(testData.files.rootTree.children[1].path),
        expect.stringContaining(testData.files.rootTree.path)
      );

      /**
       * Check if move state reset
       */
      expect(selectors.fieldMoveToPath(true)).not.toBeInTheDocument();
      expect(selectors.buttonStartMoving(true)).not.toBeInTheDocument();
    });

    it('Should show unmoved items in error', async () => {
      const webDAVMock = createWebDavMock();
      webDAVMock.move.mockRejectedValue(testData.apiDatasource.apiError);
      jest.mocked(useWebDavApi).mockImplementation(() => webDAVMock as any);

      await renderWithoutErrors(getComponent({}));

      /**
       * Select item
       */
      await selectItem(testData.files.rootTree.children[0].path);

      /**
       * Check if item can be moved
       */
      expect(selectors.buttonStartMoving()).toBeInTheDocument();

      /**
       * Open Moving Modal
       */
      await act(async () => fireEvent.click(selectors.buttonStartMoving()));

      /**
       * Set move to path
       */
      expect(selectors.fieldMoveToPath()).toBeInTheDocument();
      await act(async () =>
        fireEvent.change(selectors.fieldMoveToPath(), { target: { value: testData.files.rootTree.path } })
      );

      /**
       * Move
       */
      expect(selectors.buttonSaveMoving()).toBeInTheDocument();
      expect(selectors.buttonSaveMoving()).not.toBeDisabled();
      await act(async () => fireEvent.click(selectors.buttonSaveMoving()));

      /**
       * Check error shown
       */
      expect(selectors.errorMessage()).toBeInTheDocument();
      expect(selectors.errorMessage()).toHaveTextContent(testData.files.rootTree.children[0].relativePath);
    });

    it('Should cancel moving items', async () => {
      const webDAVMock = createWebDavMock();
      webDAVMock.move.mockRejectedValue(testData.apiDatasource.apiError);
      jest.mocked(useWebDavApi).mockImplementation(() => webDAVMock as any);

      await renderWithoutErrors(getComponent({}));

      /**
       * Select item
       */
      await selectItem(testData.files.rootTree.children[0].path);

      /**
       * Check if item can be moved
       */
      expect(selectors.buttonStartMoving()).toBeInTheDocument();

      /**
       * Open Moving Modal
       */
      await act(async () => fireEvent.click(selectors.buttonStartMoving()));

      /**
       * Check modal is shown
       */
      expect(selectors.modalMoving()).toBeInTheDocument();

      /**
       * Click on cancel button
       */
      await act(async () => fireEvent.click(selectors.buttonCancelMoving()));

      /**
       * Check if move modal closed and selected items are kept
       */
      expect(selectors.modalMoving(true)).not.toBeInTheDocument();
      expect(selectors.buttonStartMoving()).toBeInTheDocument();

      /**
       * Open Moving Modal
       */
      await act(async () => fireEvent.click(selectors.buttonStartMoving()));

      /**
       * Dismiss modal
       */
      await act(async () => fireEvent.click(within(selectors.modalMoving()).getByTestId('dismiss')));

      /**
       * Check if modal closed
       */
      expect(selectors.modalMoving(true)).not.toBeInTheDocument();
    });

    it('Should deselect children if parent selected', async () => {
      await renderWithoutErrors(getComponent({}));

      /**
       * Open Category
       */
      const category = testData.files.rootTree.children[0];
      await act(async () => fireEvent.click(selectors.category(false, category.path)));

      /**
       * Check if category opened
       */
      expect(selectors.categoryContent(false, category.path)).toBeInTheDocument();

      /**
       * Select children items
       */
      await selectItem(testData.files.dir1Tree.children[0].path);
      await selectItem(testData.files.dir1Tree.children[1].path);

      /**
       * Select parent item
       */
      await selectItem(testData.files.dir1Tree.path);

      /**
       * Unselect parent item
       */
      await act(async () => fireEvent.click(selectors.itemCheckbox(false, testData.files.dir1Tree.path)));

      /**
       * Children should be unselected
       */
      expect(selectors.itemCheckbox(false, testData.files.dir1Tree.children[0].path)).not.toBeChecked();
      expect(selectors.itemCheckbox(false, testData.files.dir1Tree.children[1].path)).not.toBeChecked();
    });
  });

  describe('Removing', () => {
    it('Should remove items', async () => {
      const webDAVMock = createWebDavMock();
      jest.mocked(useWebDavApi).mockImplementation(() => webDAVMock as any);

      await renderWithoutErrors(getComponent({}));

      /**
       * Select category and file
       */
      await selectItem(testData.files.rootTree.children[0].path);
      await selectItem(testData.files.rootTree.children[1].path);

      /**
       * Check if items can be moved
       */
      expect(selectors.buttonStartRemoving()).toBeInTheDocument();

      /**
       * Open Removing Modal
       */
      await act(async () => fireEvent.click(selectors.buttonStartRemoving()));
      const confirmModal = selectors.confirmDeleteModal();
      expect(confirmModal).toBeInTheDocument();

      /**
       * Remove
       */
      const confirmButton = within(confirmModal).getByTestId('confirm');
      expect(confirmButton).toBeInTheDocument();
      expect(confirmButton).not.toBeDisabled();
      await act(async () => fireEvent.click(confirmButton));

      /**
       * Check if items removed
       */
      expect(webDAVMock.remove).toHaveBeenCalledWith(expect.stringContaining(testData.files.rootTree.children[0].path));
      expect(webDAVMock.remove).toHaveBeenCalledWith(expect.stringContaining(testData.files.rootTree.children[1].path));

      /**
       * Check if remove state reset
       */
      expect(selectors.confirmDeleteModal(true)).not.toBeInTheDocument();
      expect(selectors.buttonStartRemoving(true)).not.toBeInTheDocument();
    });

    it('Should cancel removing items', async () => {
      const webDAVMock = createWebDavMock();
      jest.mocked(useWebDavApi).mockImplementation(() => webDAVMock as any);

      await renderWithoutErrors(getComponent({}));

      /**
       * Select category and file
       */
      await selectItem(testData.files.rootTree.children[0].path);
      await selectItem(testData.files.rootTree.children[1].path);

      /**
       * Check if items can be moved
       */
      expect(selectors.buttonStartRemoving()).toBeInTheDocument();

      /**
       * Open Removing Modal
       */
      await act(async () => fireEvent.click(selectors.buttonStartRemoving()));
      const confirmModal = selectors.confirmDeleteModal();
      expect(confirmModal).toBeInTheDocument();

      /**
       * Cancel removing
       */
      const cancelButton = within(confirmModal).getByTestId('dismiss');
      expect(cancelButton).toBeInTheDocument();
      expect(cancelButton).not.toBeDisabled();
      await act(async () => fireEvent.click(cancelButton));

      /**
       * Check if items not removed
       */
      expect(webDAVMock.remove).not.toHaveBeenCalled();

      /**
       * Check if remove state is kept
       */
      expect(selectors.confirmDeleteModal(true)).not.toBeInTheDocument();
      expect(selectors.buttonStartRemoving()).toBeInTheDocument();
    });

    it('Should show removing errors', async () => {
      const webDAVMock = createWebDavMock();
      webDAVMock.remove.mockRejectedValue(testData.apiDatasource.apiError);
      jest.mocked(useWebDavApi).mockImplementation(() => webDAVMock as any);

      await renderWithoutErrors(getComponent({}));

      /**
       * Select category and file
       */
      await selectItem(testData.files.rootTree.children[0].path);
      await selectItem(testData.files.rootTree.children[1].path);

      /**
       * Check if items can be moved
       */
      expect(selectors.buttonStartRemoving()).toBeInTheDocument();

      /**
       * Open Removing Modal
       */
      await act(async () => fireEvent.click(selectors.buttonStartRemoving()));
      const confirmModal = selectors.confirmDeleteModal();
      expect(confirmModal).toBeInTheDocument();

      /**
       * Remove
       */
      const confirmButton = within(confirmModal).getByTestId('confirm');
      expect(confirmButton).toBeInTheDocument();
      expect(confirmButton).not.toBeDisabled();
      await act(async () => fireEvent.click(confirmButton));

      /**
       * Check if items tried to remove
       */
      expect(webDAVMock.remove).toHaveBeenCalled();

      /**
       * Check if remove state reset
       */
      expect(selectors.confirmDeleteModal(true)).not.toBeInTheDocument();
      expect(selectors.buttonStartRemoving(true)).not.toBeInTheDocument();

      /**
       * Check error presence
       */
      expect(selectors.errorMessage()).toBeInTheDocument();
      expect(selectors.errorMessage()).toHaveTextContent(testData.files.rootTree.children[0].relativePath);
      expect(selectors.errorMessage()).toHaveTextContent(testData.files.rootTree.children[1].relativePath);
    });
  });

  describe('Single Removing', () => {
    it('Should remove file', async () => {
      const webDAVMock = createWebDavMock();
      jest.mocked(useWebDavApi).mockImplementation(() => webDAVMock as any);

      await renderWithoutErrors(getComponent({}));

      const file = selectors.file(false, testData.files.rootTree.children[1].path);
      expect(file).toBeInTheDocument();

      /**
       * File Selectors
       */
      const fileSelectors = getSelectors(within(file));

      /**
       * Open Single Removing
       */
      await act(async () => fireEvent.click(fileSelectors.buttonDeleteFile()));
      const confirmModal = selectors.confirmItemDeleteModal();
      expect(confirmModal).toBeInTheDocument();

      /**
       * Remove
       */
      const confirmButton = within(confirmModal).getByTestId('confirm');
      expect(confirmButton).toBeInTheDocument();
      expect(confirmButton).not.toBeDisabled();
      await act(async () => fireEvent.click(confirmButton));

      /**
       * Check if item removed
       */
      expect(webDAVMock.remove).toHaveBeenCalledWith(expect.stringContaining(testData.files.rootTree.children[1].path));

      /**
       * Check if remove state reset
       */
      expect(selectors.confirmItemDeleteModal(true)).not.toBeInTheDocument();
    });

    it('Should remove category', async () => {
      const webDAVMock = createWebDavMock();
      jest.mocked(useWebDavApi).mockImplementation(() => webDAVMock as any);

      await renderWithoutErrors(getComponent({}));

      const category = selectors.category(false, testData.files.rootTree.children[0].path);
      expect(category).toBeInTheDocument();

      /**
       * Category Selectors
       */
      const categorySelectors = getSelectors(within(category));

      /**
       * Open Single Removing
       */
      await act(async () => fireEvent.click(categorySelectors.buttonDeleteCategory()));
      const confirmModal = selectors.confirmItemDeleteModal();
      expect(confirmModal).toBeInTheDocument();

      /**
       * Remove
       */
      const confirmButton = within(confirmModal).getByTestId('confirm');
      expect(confirmButton).toBeInTheDocument();
      expect(confirmButton).not.toBeDisabled();
      await act(async () => fireEvent.click(confirmButton));

      /**
       * Check if item removed
       */
      expect(webDAVMock.remove).toHaveBeenCalledWith(expect.stringContaining(testData.files.rootTree.children[0].path));

      /**
       * Check if remove state reset
       */
      expect(selectors.confirmItemDeleteModal(true)).not.toBeInTheDocument();
    });

    it('Should cancel removing item', async () => {
      const webDAVMock = createWebDavMock();
      jest.mocked(useWebDavApi).mockImplementation(() => webDAVMock as any);

      await renderWithoutErrors(getComponent({}));

      const file = selectors.file(false, testData.files.rootTree.children[1].path);
      expect(file).toBeInTheDocument();

      /**
       * File Selectors
       */
      const fileSelectors = getSelectors(within(file));

      /**
       * Open Single Removing
       */
      await act(async () => fireEvent.click(fileSelectors.buttonDeleteFile()));
      const confirmModal = selectors.confirmItemDeleteModal();
      expect(confirmModal).toBeInTheDocument();

      /**
       * Cancel removing
       */
      const cancelButton = within(confirmModal).getByTestId('dismiss');
      expect(cancelButton).toBeInTheDocument();
      expect(cancelButton).not.toBeDisabled();
      await act(async () => fireEvent.click(cancelButton));

      /**
       * Check if items not removed
       */
      expect(webDAVMock.remove).not.toHaveBeenCalled();

      /**
       * Check if modal closed
       */
      expect(selectors.confirmItemDeleteModal(true)).not.toBeInTheDocument();
    });

    it('Should show removing errors', async () => {
      const webDAVMock = createWebDavMock();
      webDAVMock.remove.mockRejectedValue(testData.apiDatasource.apiError);
      jest.mocked(useWebDavApi).mockImplementation(() => webDAVMock as any);

      await renderWithoutErrors(getComponent({}));

      const file = selectors.file(false, testData.files.rootTree.children[1].path);
      expect(file).toBeInTheDocument();

      /**
       * File Selectors
       */
      const fileSelectors = getSelectors(within(file));

      /**
       * Open Single Removing
       */
      await act(async () => fireEvent.click(fileSelectors.buttonDeleteFile()));
      const confirmModal = selectors.confirmItemDeleteModal();
      expect(confirmModal).toBeInTheDocument();

      /**
       * Remove
       */
      const confirmButton = within(confirmModal).getByTestId('confirm');
      expect(confirmButton).toBeInTheDocument();
      expect(confirmButton).not.toBeDisabled();
      await act(async () => fireEvent.click(confirmButton));

      /**
       * Check if items tried to remove
       */
      expect(webDAVMock.remove).toHaveBeenCalled();

      /**
       * Check if remove state reset
       */
      expect(selectors.confirmItemDeleteModal(true)).not.toBeInTheDocument();

      /**
       * Check error presence
       */
      expect(selectors.errorMessage()).toBeInTheDocument();
      expect(selectors.errorMessage()).toHaveTextContent(testData.files.rootTree.children[1].relativePath);
    });
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
      expect(selectors.category(false, testData.files.rootTree.children[0].path)).toBeInTheDocument();

      /**
       * Check if file is found
       */
      expect(selectors.file(false, testData.files.rootTree.children[1].path)).toBeInTheDocument();

      /**
       * Change Search
       */
      await act(async () => fireEvent.change(selectors.fieldSearch(), { target: { value: '123__' } }));

      /**
       * Check if category is still shown
       */
      expect(selectors.category(false, testData.files.rootTree.children[0].path)).toBeInTheDocument();

      /**
       * Check if file is filtered
       */
      expect(selectors.file(true, testData.files.rootTree.children[1].path)).not.toBeInTheDocument();
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
      expect(selectors.file(false, testData.files.rootTree.children[1].path)).toBeInTheDocument();
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
      expect(selectors.file(false, testData.files.dir1Tree.children[0].path)).toBeInTheDocument();

      /**
       * Collapse All
       */
      await act(async () => fireEvent.click(selectors.buttonCollapse()));

      /**
       * Check if 2 level is collapsed
       */
      expect(selectors.file(true, testData.files.dir1Tree.children[0].path)).not.toBeInTheDocument();
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
      expect(selectors.file(false, testData.files.dir1Tree.children[0].path)).toBeInTheDocument();

      /**
       * Refresh
       */
      await act(async () => fireEvent.click(selectors.buttonRefresh()));

      /**
       * Check if 2 level is collapsed
       */
      expect(selectors.file(true, testData.files.dir1Tree.children[0].path)).not.toBeInTheDocument();
    });

    it('Should collapse all after item expanded manually', async () => {
      await renderWithoutErrors(getComponent({}));

      expect(selectors.buttonExpand()).toBeInTheDocument();

      /**
       * Expand item
       */
      await openCategory(testData.files.rootTree.children[0].path);

      /**
       * Check if 2 level is expanded
       */
      expect(selectors.file(false, testData.files.dir1Tree.children[0].path)).toBeInTheDocument();

      /**
       * Collapse All
       */
      await act(async () => fireEvent.click(selectors.buttonCollapse()));

      /**
       * Check if 2 level is collapsed
       */
      expect(selectors.file(true, testData.files.dir1Tree.children[0].path)).not.toBeInTheDocument();
    });
  });
});
