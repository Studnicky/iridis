import type { PluginSchemaContributionInterfaceType } from '../types/plugin.ts';
import type { TaskInterface } from './TaskInterface.ts';

export interface PluginInterface {
  readonly 'name':    string;
  schemas?(): PluginSchemaContributionInterfaceType;
  tasks(): readonly TaskInterface[];
  readonly 'version': string;
}
