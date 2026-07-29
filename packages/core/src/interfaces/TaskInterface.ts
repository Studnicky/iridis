import type { TaskManifestInterfaceType } from '../types/pipeline.ts';
import type { PaletteStateInterface } from './PaletteStateInterface.ts';
import type { PipelineContextInterface } from './PipelineContextInterface.ts';

export interface TaskInterface {
  readonly 'manifest': TaskManifestInterfaceType | undefined;
  readonly 'name':     string;
  run(state: PaletteStateInterface, ctx: PipelineContextInterface): void;
}
