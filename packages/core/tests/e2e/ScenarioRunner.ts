import { test } from 'node:test';
import assert from 'node:assert/strict';

export interface ScenarioInterface<TInput, TOutput> {
  readonly 'name':  string;
  readonly 'kind':  'happy' | 'edge' | 'unhappy';
  readonly 'input': TInput;
  assert(output: TOutput | undefined, error: unknown): void | Promise<void>;
}

export class ScenarioRunner<TInput, TOutput> {
  constructor(
    private readonly suite: string,
    private readonly subject: (input: TInput) => Promise<TOutput> | TOutput,
  ) {}

  run(scenarios: readonly ScenarioInterface<TInput, TOutput>[]): void {
    for (const sc of scenarios) {
      test(`${this.suite} :: ${sc.kind} :: ${sc.name}`, async () => {
        let output: TOutput | undefined;
        let error: unknown;
        try { output = await this.subject(sc.input); }
        catch (e) { error = e; }
        await sc.assert(output, error);
      });
    }
  }
}

export { assert };
