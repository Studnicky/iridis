import { test } from 'node:test';

import { RdfPluginScenarioSuite } from './rdf-plugin/RdfPluginScenarioSuite.ts';

await test('RdfPlugin scenario matrix', async (): Promise<void> => {
  await RdfPluginScenarioSuite.run();
});
