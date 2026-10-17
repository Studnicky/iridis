/**
 * Scenario-matrix test runner.
 *
 * Drives a single subject-under-test through a table of scenarios and
 * emits one `node:test` test per row. Each scenario is classified by
 * `kind` (`happy` | `edge` | `unhappy`) and carries its own `assert`
 * callback so a single suite can hold the full coverage matrix for one
 * subject — happy paths, edges, illegal inputs — in one place.
 *
 * Yamete-style cell discipline applies: every test file defines one
 * subject, one runner, and one flat scenario table. Boilerplate (mocks,
 * fixture factories) sits above the table; the table itself is the
 * coverage map. Coordinate-tagged failure messages
 * (`[subject=X, kind=Y, scenario=Z]`) make any failure self-locating.
 */
import { test } from 'node:test';


export class ScenarioRunner<TInput, TOutput> {
  private readonly suite:   string;
  private readonly subject: (input: TInput) => Promise<TOutput> | TOutput;

  constructor(suite: string, subject: (input: TInput) => Promise<TOutput> | TOutput) {
    this.suite   = suite;
    this.subject = subject;
  }

  private static async execute<TInput, TOutput>(
    subject: (input: TInput) => Promise<TOutput> | TOutput,
    scenario: ScenarioRunner.ScenarioInterface<TInput, TOutput>
  ): Promise<void> {
    const contextAssertion = scenario.assertion;
    const legacyAssertion = scenario.assert;
    if (contextAssertion === undefined && legacyAssertion === undefined) {
      throw new Error('Scenario requires an assertion handler');
    }
    let output: TOutput | undefined;
    let error: Error | undefined;
    try {
      output = await subject(scenario.input);
    } catch (errorValue) {
      error = errorValue instanceof Error ? errorValue : new Error(String(errorValue));
    }
    const context = new ScenarioRunner.AssertionContext({ 'failure': error, 'output': output });
    if (contextAssertion !== undefined) {
      await contextAssertion(context);
      return;
    }
    if (legacyAssertion === undefined) {
      throw new Error('Scenario requires an assertion handler');
    }
    await legacyAssertion(output, error);
  }

  async run(scenarios: readonly ScenarioRunner.ScenarioInterface<TInput, TOutput>[]): Promise<void> {
    const subject = this.subject;
    for (let index = 0; index < scenarios.length; index += 1) {
      const scenario = scenarios.at(index);
      if (scenario === undefined) {
        continue;
      }
      const selectedScenario = scenario;
      const name = `${this.suite} :: ${selectedScenario.kind} :: ${selectedScenario.name}`;
      async function registerScenario(): Promise<void> {
        await ScenarioRunner.execute(subject, selectedScenario);
      }
      await test(name, registerScenario);
    }
  }
}

export namespace ScenarioRunner {
  export class AssertionContext<TOutput> {
    private readonly failure: Error | undefined;
    private readonly result: TOutput | undefined;

    constructor(result: { readonly 'failure': Error | undefined; readonly 'output': TOutput | undefined; }) {
      this.failure = result.failure;
      this.result = result.output;
    }

    error(): Error | undefined {
      return this.failure;
    }

    output(): TOutput {
      if (this.result === undefined) {
        throw new Error('Scenario did not produce output');
      }
      return this.result;
    }
  }

  export interface ScenarioInterface<TInput, TOutput> {
    assert?(...result: [output: TOutput | undefined, error: Error | undefined]): void | Promise<void>;
    readonly 'assertion'?: (context: AssertionContext<TOutput>) => void | Promise<void>;
    readonly 'input': TInput;
    readonly 'kind': string;
    readonly 'name': string;
  }
}
