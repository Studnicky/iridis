import { test } from 'node:test';

/** Executes typed scenario rows as independent node:test cases. */
export class ScenarioRunner<TInput, TOutput> {
  private readonly suite: string;
  private readonly subject: (input: TInput) => Promise<TOutput> | TOutput;

  constructor(suite: string, subject: (input: TInput) => Promise<TOutput> | TOutput) {
    this.suite = suite;
    this.subject = subject;
  }

  private static async execute<TInput, TOutput>(subject: (input: TInput) => Promise<TOutput> | TOutput, scenario: ScenarioRunner.ScenarioInterface<TInput, TOutput>): Promise<void> {
    let output: TOutput | undefined;
    let error: Error | undefined;
    try { output = await subject(scenario.input); } catch (errorValue) { error = errorValue instanceof Error ? errorValue : new Error(String(errorValue)); }
    const context = new ScenarioRunner.AssertionContext({ 'failure': error, 'output': output });
    await scenario.assertion(context);
  }

  async run(scenarios: readonly ScenarioRunner.ScenarioInterface<TInput, TOutput>[]): Promise<void> {
    const subject = this.subject;
    for (let index = 0; index < scenarios.length; index += 1) {
      const scenario = scenarios.at(index);
      if (scenario === undefined) {continue;}
      const selectedScenario = scenario;
      const name = [this.suite, selectedScenario.name].join(' :: ');
      async function registerScenario(): Promise<void> { await ScenarioRunner.execute(subject, selectedScenario); }
      await test(name, registerScenario);
    }
  }
}

export namespace ScenarioRunner {
  export class AssertionContext<TOutput> {
    private readonly failure: Error | undefined;
    private readonly outputValue: TOutput | undefined;
    constructor(result: { readonly 'failure': Error | undefined; readonly 'output': TOutput | undefined; }) { this.failure = result.failure; this.outputValue = result.output; }
    error(): Error | undefined { return this.failure; }
    output(): TOutput { if (this.outputValue === undefined) {throw new Error('Scenario did not produce output');} return this.outputValue; }
    result(): TOutput | undefined { return this.outputValue; }
  }

  export interface ScenarioInterface<TInput, TOutput> {
    readonly 'assertion': (context: AssertionContext<TOutput>) => void | Promise<void>;
    readonly 'input': TInput;
    readonly 'name': string;
  }
}
