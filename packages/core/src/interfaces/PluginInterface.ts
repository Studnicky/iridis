import type { PluginSchemaContributionInterfaceEntity } from '../entities/PluginSchemaContributionInterfaceEntity.ts';
import type { TaskInterface } from './TaskInterface.ts';

export interface PluginInterface {
  readonly 'name':    string;
  schemas?(): PluginSchemaContributionInterfaceEntity.Type;
  tasks(): readonly TaskInterface[];
  readonly 'version': string;
}
