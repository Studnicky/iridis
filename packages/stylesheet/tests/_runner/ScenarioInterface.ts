/**
 * One row of a scenario-matrix table driven by `ScenarioRunner`. Each
 * scenario carries its own input, an expected-outcome `assert` callback,
 * and a display label for its test-matrix row.
 */
export interface ScenarioInterface<TInput, TOutput> {
  assert(output: TOutput | undefined, ...result: [error: Error | undefined]): void | Promise<void>;
  readonly 'input': TInput;
  readonly 'kind':  string;
  readonly 'name':  string;
}
