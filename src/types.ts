import { DataSourceJsonData } from '@grafana/data';
import { DataQuery } from '@grafana/schema';

export interface MyQuery extends DataQuery {
  kernelId: string;
  kernelType: string;
  connectionInfo?: string;
  notebook: string;
  code: string;
  vars: string;
}

export const DEFAULT_QUERY: Partial<MyQuery> = {
  kernelId: undefined,
  kernelType: 'python3',
  connectionInfo: undefined,
  notebook: undefined,
  code: `%pip install pytz

import datetime
import random
from pytz import timezone
from IPython.display import JSON
from math import sin, cos, pi
base = datetime.datetime.now(timezone(TZ))
timestamps = [(base - datetime.timedelta(seconds=i)).isoformat() for i in range(RANGE_MAX)]
values0 = [sin(i/RANGE_MAX * FREQ0 * pi) for i in range(RANGE_MAX)]
values1 = [cos(i/RANGE_MAX * FREQ1 * pi) for i in range(RANGE_MAX)]

JSON([
    {"name": "time", "values": timestamps},
    {"name": "values0", "values": values0},
    {"name": "values1", "values": values1}
])`,
  vars: `RANGE_MAX = 1000
FREQ0 = 7
FREQ1 = 13
TZ = "$__timezone"
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
  Auto = "AUTO",
}

/**
 * These are options configured for each DataSource instance
 */
export interface MyDataSourceOptions extends DataSourceJsonData {
  connectionType: ConnectionType;
  authType: AuthType;
  fetchRoute?: string;
  fetchMethod?: Method;
  rawToken?: string;
  jupyterUrl?: string;
}

export interface KernelSpec {
  id: string;
  name: string;
  last_activity: string;
  execution_state: string;
  connections: number;
}

export interface KernelSpecification {
  name: string;
  spec: {
    display_name: string;
  };
  resources: {
    "logo-svg": string
  };
}

export interface KernelSpecResponse {
  default: string;
  kernelspecs: { [key: string]: KernelSpecification };
}

/**
 * Value that is used in the backend, but never sent over HTTP to the frontend
 */
export interface MySecureJsonData {
}
