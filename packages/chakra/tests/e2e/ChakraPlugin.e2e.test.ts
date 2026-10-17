import { test } from 'node:test';

import { ChakraPluginScenarioSuite } from './fixtures/ChakraPluginScenarioSuite.ts';

await test('ChakraPlugin scenario matrix', async (): Promise<void> => {
  await ChakraPluginScenarioSuite.run();
});
