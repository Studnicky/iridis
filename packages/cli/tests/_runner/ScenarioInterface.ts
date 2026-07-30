import type { ScenarioKindType } from './ScenarioKindType.ts';

/** One row of a {@link import('./ScenarioRunner.ts').ScenarioRunner} coverage matrix. */
export interface ScenarioInterface<TInput, TOutput> {
  assert(output: TOutput | undefined, error: Error | undefined): void | Promise<void>;
  readonly 'input': TInput;
  readonly 'kind':  ScenarioKindType;
  readonly 'name':  string;
}
