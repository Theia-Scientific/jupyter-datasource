import { DataSourceJsonData } from '@grafana/data';
import { DataQuery } from '@grafana/schema';

export interface MyQuery extends DataQuery {
  code: string;
  vars: string;
}

export const DEFAULT_QUERY: Partial<MyQuery> = {
  code: `base = datetime.datetime.now(timezone("EST"))
timestamps = [(base - datetime.timedelta(seconds=i)).isoformat() for i in range(RANGE_MAX)]
values0 = [random.random() * RANGE_MAX for i in range(RANGE_MAX)]
values1 = [random.random() * RANGE_MAX for i in range(RANGE_MAX)]

JSON([
    {"name": "time", "values": timestamps},
    {"name": "values0", "values": values0},
    {"name": "values1", "values": values1}
])`,
  vars: `RANGE_MAX = 1000
`,
};

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
