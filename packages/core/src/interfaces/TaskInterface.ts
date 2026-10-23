import type { TaskManifestEntity } from '../entities/TaskManifestEntity.ts';
import type { PaletteStateInterface } from './PaletteStateInterface.ts';
import type { PipelineContextInterface } from './PipelineContextInterface.ts';

export interface TaskInterface {
  readonly 'manifest': TaskManifestEntity.Type | undefined;
  readonly 'name':     string;
  run(state: PaletteStateInterface, ctx: PipelineContextInterface): void;
}
