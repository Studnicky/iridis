import type { MathPrimitiveInterface } from './math.ts';
import type { TaskInterface } from './pipeline.ts';

export interface PluginInterface {
  readonly name:    string;
  readonly version: string;
  tasks(): readonly TaskInterface[];
  math():  readonly MathPrimitiveInterface[];
}
