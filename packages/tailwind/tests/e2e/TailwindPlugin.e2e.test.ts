import { test } from 'node:test';

import { TailwindPluginScenarioSuite } from './tailwind-plugin/TailwindPluginScenarioSuite.ts';

await test('TailwindPlugin scenario matrix', (): void => {
  TailwindPluginScenarioSuite.run();
});
