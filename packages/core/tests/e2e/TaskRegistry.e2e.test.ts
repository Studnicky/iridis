/** Task registry public behavior through the current core source contracts. */
import { test } from 'node:test';

import { TaskRegistryHarness } from './task-registry/TaskRegistryHarness.ts';

await test('TaskRegistry preserves registration, hook, replacement, lifecycle, and error contracts', () => {
  TaskRegistryHarness.verify();
});
