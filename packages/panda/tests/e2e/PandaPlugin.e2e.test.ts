import { test } from 'node:test';

import { PandaPluginScenarioSuite } from './fixtures/PandaPluginScenarioSuite.ts';

await test('PandaPlugin scenario matrix', async (): Promise<void> => {
  await PandaPluginScenarioSuite.run();
});
