import { renderHook } from '@testing-library/react';
import { testData, testUtils } from '@theia/__testUtils__';

import { useWebDavApi } from './useWebDavApi';

describe('useWebDavApi', () => {
  describe('list', () => {
    it('Should make request', async () => {
      const { result } = renderHook(() => useWebDavApi());

      await result.current.list('/123');

      expect(testUtils.backendSrvMock.get).toHaveBeenCalledWith('/123/');
    });

    it('Should log error', async () => {
      const error = {};
      testUtils.backendSrvMock.get.mockImplementationOnce(() => Promise.reject(error));
      const { result } = renderHook(() => useWebDavApi());

      const response = await result.current.list('/123').catch((e) => e);

      expect(response).toEqual(error);
    });
  });

  describe('move', () => {
    it('Should make request', async () => {
      const { result } = renderHook(() => useWebDavApi());

      await result.current.move('/111', '/222');

      expect(testUtils.backendSrvMock.fetch).toHaveBeenCalledWith({
        method: 'MOVE',
        url: '/111',
        headers: {
          destination: '/222',
          overwrite: 'F',
        },
      });
    });

    it('Should log error', async () => {
      const error = {};
      testUtils.backendSrvMock.fetch.mockImplementationOnce(() => testUtils.getErrorResponse(error));
      const { result } = renderHook(() => useWebDavApi());

      const response = await result.current.move('/111', '/222').catch((e) => e);

      expect(response).toEqual(error);
    });
  });

  describe('createDirectory', () => {
    it('Should make request', async () => {
      const { result } = renderHook(() => useWebDavApi());

      await result.current.createDirectory('/111');

      expect(testUtils.backendSrvMock.fetch).toHaveBeenCalledWith({
        method: 'MKCOL',
        url: '/111',
      });
    });

    it('Should log error', async () => {
      const error = {};
      testUtils.backendSrvMock.fetch.mockImplementationOnce(() => testUtils.getErrorResponse(error));
      const { result } = renderHook(() => useWebDavApi());

      const response = await result.current.createDirectory('/111').catch((e) => e);

      expect(response).toEqual(error);
    });
  });

  describe('upload', () => {
    it('Should make request', async () => {
      const { result } = renderHook(() => useWebDavApi());

      await result.current.upload('/111', testData.files.image);

      expect(testUtils.backendSrvMock.fetch).toHaveBeenCalledWith({
        method: 'PUT',
        url: '/111',
        data: testData.files.image,
        headers: {
          'Content-Type': testData.files.image.type,
        },
      });
    });

    it('Should log error', async () => {
      const error = {};
      testUtils.backendSrvMock.fetch.mockImplementationOnce(() => testUtils.getErrorResponse(error));
      const { result } = renderHook(() => useWebDavApi());

      const response = await result.current.upload('/111', testData.files.image).catch((e) => e);

      expect(response).toEqual(error);
    });
  });

  describe('Remove', () => {
    it('Should make request', async () => {
      const { result } = renderHook(() => useWebDavApi());

      await result.current.remove('/111');

      expect(testUtils.backendSrvMock.fetch).toHaveBeenCalledWith({
        method: 'DELETE',
        url: '/111',
        headers: {
          depth: 'infinity',
        },
      });
    });

    it('Should log error', async () => {
      const error = {};
      testUtils.backendSrvMock.fetch.mockImplementationOnce(() => testUtils.getErrorResponse(error));
      const { result } = renderHook(() => useWebDavApi());

      const response = await result.current.remove('/111').catch((e) => e);

      expect(response).toEqual(error);
    });
  });

  describe('exists', () => {
    it('Should make request', async () => {
      testUtils.backendSrvMock.fetch.mockImplementationOnce(() => testUtils.getResponse({}));

      const { result } = renderHook(() => useWebDavApi());

      const response = await result.current.exists('/123');

      expect(testUtils.backendSrvMock.fetch).toHaveBeenCalledWith({
        method: 'PROPFIND',
        url: '/123',
        showErrorAlert: false,
      });

      expect(response).toBeTruthy();
    });

    it('Should return false', async () => {
      testUtils.backendSrvMock.fetch.mockImplementationOnce(() => testUtils.getErrorResponse());
      const { result } = renderHook(() => useWebDavApi());

      const response = await result.current.exists('/123');

      expect(response).toBeFalsy();
    });
  });
});
