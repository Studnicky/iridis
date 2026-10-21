import assert from 'node:assert/strict';
import { mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { test } from 'node:test';

import { ProductionNitroServer } from './fixtures/ProductionNitroServer.ts';

class FakeEntrypoint {
  static async create(context: { after(hook: () => Promise<void>): void }, source: string): Promise<string> {
    const directory = await mkdtemp(join(tmpdir(), 'nitro-fixture-'));
    context.after(async () => {await rm(directory, { 'force': true, 'recursive': true });});
    const entrypoint = join(directory, 'index.mjs');
    await writeFile(entrypoint, source);
    return entrypoint;
  }
}

class StartFailure {
  static async capture(entrypoint: string): Promise<Error> {
    try {
      await ProductionNitroServer.start(entrypoint);
    } catch (error) {
      if (error instanceof Error) {return error;}
      throw error;
    }
    throw new Error('start() resolved for an entrypoint that must fail.');
  }
}

await test('start rejects when the child reports a malformed listening message', async (context) => {
  const entrypoint = await FakeEntrypoint.create(context, `
    process.send({ port: 'not-a-port', type: 'nitro-listening' });
    setInterval(() => {}, 1_000);
  `);

  const failure = await StartFailure.capture(entrypoint);

  assert.ok(failure.message.includes('invalid listening message'), failure.message);
  assert.notEqual(failure.cause, undefined);
});

await test('start rejects when the child exits before listening', async (context) => {
  const entrypoint = await FakeEntrypoint.create(context, 'process.exit(3);');

  const failure = await StartFailure.capture(entrypoint);

  assert.ok(failure.message.includes('exited before listening'), failure.message);
});
