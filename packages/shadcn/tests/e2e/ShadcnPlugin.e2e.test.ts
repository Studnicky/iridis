import { shadcnPlugin } from '@studnicky/iridis-shadcn';
import assert from 'node:assert/strict';
import { test } from 'node:test';

import { ShadcnPluginScenarioSuite } from './shadcn-plugin/ShadcnPluginScenarioSuite.ts';

await ShadcnPluginScenarioSuite.run();

await test('ShadcnPlugin scenario suite registers the Shadcn plugin', () => {
  assert.strictEqual(shadcnPlugin.name, 'shadcn');
});
