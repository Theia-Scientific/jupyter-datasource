import { DataSourceInstanceSettings, CoreApp, ScopedVars } from '@grafana/data';
import { DataSourceWithBackend, getTemplateSrv } from '@grafana/runtime';

import { KernelSpec, KernelSpecResponse, MyQuery, MyDataSourceOptions, DEFAULT_QUERY, PathEntry } from './types';

import { v4 as uuidv4 } from 'uuid';

export class DataSource extends DataSourceWithBackend<MyQuery, MyDataSourceOptions> {
  options: MyDataSourceOptions;

  constructor(instanceSettings: DataSourceInstanceSettings<MyDataSourceOptions>) {
    super(instanceSettings);
    this.options = instanceSettings.jsonData;
  }

  getDefaultQuery(_: CoreApp): Partial<MyQuery> {
    return { ...DEFAULT_QUERY, uuid: uuidv4() };
  }

  applyTemplateVariables(query: MyQuery, scopedVars: ScopedVars) {
    const vars = (query.vars??[]).map(({name, value}) => ({name, value: getTemplateSrv().replace(value, scopedVars)}));
    const code = getTemplateSrv().replace(query.code, scopedVars);
    return { ...query, vars, code };
  }

  filterQuery(query: MyQuery): boolean {
    // if no query has been provided, prevent the query from being executed
    return true;
  }

  getNotebooks(): Promise<PathEntry[]> {
    return this.getResource('/notebooks');
  }

  getListing(path: string): Promise<PathEntry[]> {
    return this.getResource(`/list?path=${path}`);
  }

  getKernels(): Promise<KernelSpec[]> {
    return this.getResource('/kernels');
  }

  getKernelSpecs(): Promise<KernelSpecResponse> {
    return this.getResource('/kernelspecs');
  }
}
