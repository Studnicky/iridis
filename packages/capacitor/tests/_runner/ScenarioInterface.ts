/** One row of a scenario matrix driven by `ScenarioRunner`. */
export interface ScenarioInterface<TInput, TOutput> {
  assert(...result: [output: TOutput | undefined, error: Error | undefined]): void | Promise<void>;
  readonly 'input': TInput;
  readonly 'kind':  string;
  readonly 'name':  string;
}
