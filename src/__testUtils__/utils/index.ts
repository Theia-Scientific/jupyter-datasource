import { Observable } from 'rxjs';

export const publishMock = jest.fn().mockImplementation(() => null);

export const dataSourceSrvMock = {
  get: jest.fn(() => Promise.resolve({})),
};

export const backendSrvMock = {
  fetch: jest.fn().mockImplementation(() => getResponse({})),
  get: jest.fn().mockImplementation(() => ({})),
};

export const getErrorResponse = (
  response: any = { statusText: 'error', data: { detail: 'error details' }, status: 400 }
) =>
  new Observable(() => {
    throw response;
  });

export const getResponse = (response: any) =>
  new Observable((subscriber) => {
    subscriber.next(response);
    subscriber.complete();
  });
