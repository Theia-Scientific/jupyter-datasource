import { testUtils } from '@theia/__testUtils__';

const actual = jest.requireActual('@grafana/runtime');

module.exports = {
  ...actual,
  getTemplateSrv: jest.fn(() => ({
    replace: jest.fn((v) => v),
    getVariables: jest.fn(() => [{ name: 'var1' }]),
  })),
  getDataSourceSrv: jest.fn(() => testUtils.dataSourceSrvMock as any),
  getBackendSrv: jest.fn(() => testUtils.backendSrvMock as any),
  getAppEvents: jest.fn(() => ({
    publish: testUtils.publishMock,
  })),
  locationService: {
    partial: jest.fn(),
    getSearch: jest.fn(() => new URLSearchParams()),
    reload: jest.fn(),
  },
};
