import { DataSourceJsonData } from '@grafana/data';
import { DataQuery } from '@grafana/schema';

export interface MyQuery extends DataQuery {
  code: string;
}

export const DEFAULT_QUERY: Partial<MyQuery> = {
  code: "[12+34, 56+78]",
};

export interface DataPoint {
  Time: number;
  Value: number;
}

export interface DataSourceResponse {
  datapoints: DataPoint[];
}

export enum Method {
  Get = "GET",
  Put = "PUT",
}

export enum AuthType {
  None = "NONE",
  RawToken = "RAW",
  Fetch = "FETCH",
}

export enum ConnectionType {
  Info = "INFO",
  Existing = "EXISTING",
  New = "NEW",
}

/**
 * These are options configured for each DataSource instance
 */
export interface MyDataSourceOptions extends DataSourceJsonData {
  authType: AuthType;
  rawToken?: string;
  fetchRoute?: string;
  fetchMethod?: Method;
  connectionType: ConnectionType;
  connectionInfo?: string;
  jupyterUrl?: string;
  existingKernelId?: string;
  newKernelType?: string;
  initCode?: string;
  teardownCode?: string;
}

/**
 * Value that is used in the backend, but never sent over HTTP to the frontend
 */
export interface MySecureJsonData {
}
