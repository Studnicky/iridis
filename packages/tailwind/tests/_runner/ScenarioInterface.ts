import type { ScenarioKindType } from './ScenarioKindType.ts';

/**
 * One row of a scenario-matrix table driven by `ScenarioRunner`. Each
 * scenario carries its own input, an expected-outcome `assert` callback,
 * and a `kind` classification (`happy` | `edge` | `unhappy`).
 */
export interface ScenarioInterface<TInput, TOutput> {
  assert(output: TOutput | undefined, error: Error | undefined): void | Promise<void>;
  readonly 'input': TInput;
  readonly 'kind':  ScenarioKindType;
  readonly 'name':  string;
}
