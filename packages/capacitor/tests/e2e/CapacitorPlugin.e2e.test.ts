import { test } from 'node:test';

import { CapacitorPluginScenarioSuite } from './capacitor-plugin/CapacitorPluginScenarioSuite.ts';

await test('CapacitorPlugin scenario matrix', async () => {
  await CapacitorPluginScenarioSuite.run();
});
