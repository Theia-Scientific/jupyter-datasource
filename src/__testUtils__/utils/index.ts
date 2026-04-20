import { Observable } from 'rxjs';

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
