import { DataSourceJsonData } from '@grafana/data';
import { DataQuery } from '@grafana/schema';

export interface MyQuery extends DataQuery {
  uuid?: string;
  kernelId: string;
  kernelType: string;
  connectionInfo?: string;
  notebook: string;
  code: string;
  vars: QueryFieldVariable[];
}

/**
 * Query Field Variable
 */
export interface QueryFieldVariable {
  /**
   * Variable
   */
  name: string | '';

  /**
   * Value
   *
   * @type {string}
   */
  value: string;
}

export const DEFAULT_QUERY: Partial<MyQuery> = {
  uuid: undefined,
  kernelId: undefined,
  kernelType: 'python3',
  connectionInfo: undefined,
  notebook: undefined,
  vars: [
    { name: 'RANGE_MAX', value: '1000' },
    { name: 'FREQ0', value: '7' },
    { name: 'FREQ1', value: '13' },
    { name: 'TZ', value: '"$__timezone"' },
  ],
  code: `%pip install pytz

import datetime
import random

from pytz import timezone
from math import sin, cos, pi

base = datetime.datetime.now(timezone(TZ))

timestamps = [(base - datetime.timedelta(seconds=i)).isoformat() for i in range(RANGE_MAX)]
sine_wave = [sin(i/RANGE_MAX * FREQ0 * pi) for i in range(RANGE_MAX)]
cosine_wave = [cos(i/RANGE_MAX * FREQ1 * pi) for i in range(RANGE_MAX)]

JSON([
  {"name": "frame", "data": [
    {"name": "time", "values": timestamps},
    {"name": "sine", "values": sine_wave},
    {"name": "cosine", "values": cosine_wave}
  ]},
])`,
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
  fetchToken?: string;
  rawToken?: string;
  jupyterUrl?: string;
  importStatements?: string;
  packages: string[];
}

export interface KernelSpec {
  id: string;
  name: string;
  last_activity: string;
  execution_state: string;
  connections: number;
  notebook_path?: number;
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

interface PathEntryBase {
  name: string;
  path: string;
  last_modified: string;
}

export type PathEntryNotebook = PathEntryBase & {
  type: 'notebook';
  size: number;
};

export type PathEntryDirectory = PathEntryBase & {
  type: 'directory';
  content?: PathEntry[];
}

export type PathEntry = PathEntryNotebook | PathEntryDirectory;

/**
 * Value that is used in the backend, but never sent over HTTP to the frontend
 */
export interface MySecureJsonData {
}
