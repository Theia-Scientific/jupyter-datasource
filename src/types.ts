import { DataSourceJsonData } from '@grafana/data';
import { DataQuery } from '@grafana/schema';

export interface MyQuery extends DataQuery {
  uuid: string;
  kernelId: string;
  kernelTag: string;
  kernelType: string;
  connectionInfo: string;
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
  kernelId: '',
  kernelTag: '',
  kernelType: 'python3',
  connectionInfo: '',
  notebook: '',
  vars: [
    { name: 'RANGE_MAX', value: '1000' },
    { name: 'FREQ0', value: '7' },
    { name: 'FREQ1', value: '13' },
    { name: 'TZ', value: '$__timezone' },
  ],
  code: `%pip install pytz

import datetime
import random

from pytz import timezone
from math import sin, cos, pi

range_max = GF_VARS.int("RANGE_MAX", 1000)
freq0 = GF_VARS.float("FREQ0", 7)
freq1 = GF_VARS.float("FREQ1", 13)
tz = GF_VARS.str("TZ", "America/Los_Angeles")

base = datetime.datetime.now(timezone(tz))

timestamps = [(base - datetime.timedelta(seconds=i)).isoformat() for i in range(range_max)]
sine_wave = [sin(i/range_max * freq0 * pi) for i in range(range_max)]
cosine_wave = [cos(i/range_max * freq1 * pi) for i in range(range_max)]

create_frame("frame", [
  {"name": "time", "values": timestamps},
  {"name": "sine", "values": sine_wave},
  {"name": "cosine", "values": cosine_wave}
])
`};

export enum AuthType {
  None = "NONE",
  RawToken = "RAW",
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
  rawToken?: string;
  jupyterUrl?: string;
  prelude?: string;
  packages: string[];
  insecureSkipVerify: bool;
}

export interface KernelSpec {
  id: string;
  name: string;
  last_activity: string;
  execution_state: string;
  connections: number;
  notebook_path?: string;
}

export interface KernelSpecification {
  name: string;
  spec: {
    display_name: string;
  };
  // we get the following in the response and could potentially
  // render it in the editor:
  // resources: {
  //   "logo-svg": string
  // };
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
};

export type PathEntry = PathEntryNotebook | PathEntryDirectory;

interface NotebookCell {
  cell_type: 'code' | 'markdown';
  source: string;
}

export type Notebook = PathEntryNotebook & {
  content: { cells: NotebookCell[] };
};

/**
 * Value that is used in the backend, but never sent over HTTP to the frontend
 */
export interface MySecureJsonData {
}

