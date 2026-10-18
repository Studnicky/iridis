/** Result delivered to a Tailwind scenario assertion. */
export interface ScenarioAssertionOptionsInterface<TOutput> {
  readonly 'error':  Error | undefined;
  readonly 'output': TOutput | undefined;
}
