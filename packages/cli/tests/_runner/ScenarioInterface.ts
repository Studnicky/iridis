interface ScenarioAssertionOptionsInterface<TOutput> {
  readonly 'error'?: Error;
  readonly 'output'?: TOutput;
}

/** One row of a {@link import('./ScenarioRunner.ts').ScenarioRunner} coverage matrix. */
export interface ScenarioInterface<TInput, TOutput> {
  assert(options: ScenarioAssertionOptionsInterface<TOutput>): void | Promise<void>;
  readonly 'input': TInput;
  readonly 'name': string;
}
