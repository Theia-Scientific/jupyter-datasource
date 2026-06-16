import { DataSourceInstanceSettings, CoreApp, ScopedVars } from '@grafana/data';
import { DataSourceWithBackend, getTemplateSrv } from '@grafana/runtime';

import { DEFAULT_QUERY, KernelSpec, KernelSpecResponse, MyQuery, MyDataSourceOptions, Notebook, PathEntry } from './types';

export class DataSource extends DataSourceWithBackend<MyQuery, MyDataSourceOptions> {
  options: MyDataSourceOptions;

  constructor(instanceSettings: DataSourceInstanceSettings<MyDataSourceOptions>) {
    super(instanceSettings);
    this.options = instanceSettings.jsonData;
  }

  getDefaultQuery(_: CoreApp): Partial<MyQuery> {
    return DEFAULT_QUERY;
  }

  applyTemplateVariables(query: MyQuery, scopedVars: ScopedVars) {
    // we *only* substitute variables in vars.  code gets left alone.
    const vars = (query.vars??[]).map(({name, value}) => ({name, value: getTemplateSrv().replace(value, scopedVars)}));
    return { ...query, vars };
  }

  filterQuery(query: MyQuery): boolean {
    // if no query has been provided, prevent the query from being executed
    return query.uuid !== undefined;
  }

  getNotebooks(): Promise<PathEntry[]> {
    return this.getResource('notebooks');
  }

  getNotebook(path: string): Promise<Notebook> {
    return this.getResource(`notebook?path=${path}`);
  }

  getListing(path: string): Promise<PathEntry[]> {
    return this.getResource(`list?path=${path}`);
  }

  getKernels(): Promise<KernelSpec[]> {
    return this.getResource('kernels');
  }

  getKernelSpecs(): Promise<KernelSpecResponse> {
    return this.getResource('kernelspecs');
  }
}
