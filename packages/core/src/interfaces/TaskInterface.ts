import type { TaskManifestInterfaceTypeEntity } from '../entities/TaskManifestInterfaceTypeEntity.ts';
import type { PaletteStateInterface } from './PaletteStateInterface.ts';
import type { PipelineContextInterface } from './PipelineContextInterface.ts';

export interface TaskInterface {
  readonly 'manifest': TaskManifestInterfaceTypeEntity.Type | undefined;
  readonly 'name':     string;
  run(state: PaletteStateInterface, ctx: PipelineContextInterface): void;
}
