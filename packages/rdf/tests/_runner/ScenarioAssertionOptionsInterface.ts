/** Result presented to a scenario assertion after subject execution. */
export interface ScenarioAssertionOptionsInterface<TOutput> {
  readonly 'error':  Error | undefined;
  readonly 'output': TOutput | undefined;
}
