import assert from 'node:assert/strict';
import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { test } from 'node:test';

import type { WorkerHandlersInterface } from '../app/composables/interfaces/WorkerHandlersInterface.ts';
import type { PaletteResolutionClientInterface } from '../app/composables/paletteSession/interfaces/PaletteResolutionClientInterface.ts';
import type { PaletteResolutionClientProviderInterface } from '../app/composables/paletteSession/interfaces/PaletteResolutionClientProviderInterface.ts';

import { PaletteSessionComposition } from '../app/composables/paletteSession/PaletteSessionComposition.ts';
import { WorkerRequestClient } from '../app/composables/workerRequestClient.ts';
import { LoopbackWorkerPort } from './fixtures/LoopbackWorkerPort.ts';

class LoopbackProvider implements PaletteResolutionClientProviderInterface {
  public open(handlers: WorkerHandlersInterface): PaletteResolutionClientInterface {
    const result = new WorkerRequestClient(new LoopbackWorkerPort(), handlers);
    return result;
  }
}

class CompositionHarness {
  static readonly commands = [
    { 'interaction': 'palette.schema.select', 'payload': { 'schemaName': 'iridis-8' } },
    { 'interaction': 'palette.seed.set', 'payload': { 'hex': '#7c3aed', 'index': 0 } },
    { 'interaction': 'palette.seed.role.assign', 'payload': { 'index': 0, 'role': 'brand' } },
    { 'interaction': 'palette.strict-compliance.select', 'payload': { 'enableStrictCompliance': true } },
    { 'interaction': 'palette.framing.select', 'payload': { 'framing': 'light' } }
  ];

  static files(directory: string): string[] {
    const found: string[] = [];
    const entries = readdirSync(directory, { 'withFileTypes': true });
    for (let index = 0; index < entries.length; index += 1) {
      const entry = entries[index];
      if (entry?.isDirectory() === true) {
        found.push(...CompositionHarness.files(join(directory, entry.name)));
      } else if (entry?.name.endsWith('.ts') === true) {
        found.push(join(directory, entry.name));
      }
    }
    return found;
  }
}

await test('two Nuxt apps hold independent sessions and one app resolves one session', async () => {
  const first = {};
  const second = {};
  const firstStore = PaletteSessionComposition.resolve(first);
  const secondStore = PaletteSessionComposition.resolve(second);
  assert.notStrictEqual(firstStore, secondStore);
  assert.equal(PaletteSessionComposition.resolve(first) === firstStore, true);
  await Promise.all([firstStore.settled(), secondStore.settled()]);
  firstStore.publishIntent(firstStore.createIntent({ 'interaction': 'palette.framing.select', 'payload': { 'framing': 'light' } }));
  await firstStore.settled();
  assert.equal(firstStore.readModel().input.framing, 'light');
  assert.equal(secondStore.readModel().input.framing, 'dark');
  assert.equal(secondStore.readModel().revision, 0);
  await Promise.all([PaletteSessionComposition.release(first), PaletteSessionComposition.release(second)]);
});

await test('the server path yields the same read model as the worker path', async () => {
  const server = PaletteSessionComposition.resolve({});
  const client = PaletteSessionComposition.resolve({}, new LoopbackProvider());
  await Promise.all([server.settled(), client.settled()]);
  for (let index = 0; index < CompositionHarness.commands.length; index += 1) {
    server.publishIntent(server.createIntent(CompositionHarness.commands[index]));
    client.publishIntent(client.createIntent(CompositionHarness.commands[index]));
  }
  await Promise.all([server.settled(), client.settled()]);
  assert.equal(server.readModel().status, 'idle');
  assert.ok(server.readModel().resolved !== undefined);
  assert.deepEqual(server.readModel(), client.readModel());
  await Promise.all([server.dispose(), client.dispose()]);
});

await test('nothing in the palette session imports useIridis', () => {
  const files = CompositionHarness.files(join(import.meta.dirname, '..', 'app', 'composables', 'paletteSession'));
  assert.ok(files.length > 0);
  for (let index = 0; index < files.length; index += 1) {
    const source = readFileSync(files[index] ?? '', 'utf8');
    assert.equal(source.includes('useIridis'), false, files[index]);
  }
});
