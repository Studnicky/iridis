/**
 * Unit tests for ConfigLoader — specifically the validator-backed validation.
 * Tests exercise the schema validation that replaced the hand-rolled typeof guards.
 */
import { test }                                     from 'node:test';
import assert                                        from 'node:assert/strict';
import { mkdtemp, rm, writeFile }                   from 'node:fs/promises';
import { join }                                      from 'node:path';
import { tmpdir }                                    from 'node:os';
import { ConfigLoader }                              from '@studnicky/iridis-cli';

async function loadJson(data: unknown): Promise<unknown> {
  const dir     = await mkdtemp(join(tmpdir(), 'iridis-cfg-test-'));
  const cfgPath = join(dir, 'config.json');
  try {
    await writeFile(cfgPath, JSON.stringify(data), 'utf-8');
    return await new ConfigLoader().load(cfgPath);
  } finally {
    await rm(dir, { 'recursive': true, 'force': true });
  }
}

async function expectValidationError(data: unknown, match: string): Promise<void> {
  await assert.rejects(
    () => loadJson(data),
    (err: unknown) => {
      assert.ok(err instanceof Error, `expected Error, got ${String(err)}`);
      assert.ok(
        err.message.includes(match),
        `expected error to contain "${match}", got: ${err.message}`,
      );
      return true;
    },
  );
}

// ---------------------------------------------------------------------------
// Happy path
// ---------------------------------------------------------------------------

test('ConfigLoader :: happy :: loads a valid config', async () => {
  const result = await loadJson({
    'input':    { 'colors': ['#8b5cf6'] },
    'pipeline': ['intake:hex', 'resolve:roles'],
    'output':   { 'directory': '/tmp', 'files': {} },
  });
  assert.ok(result !== null && typeof result === 'object');
});

// ---------------------------------------------------------------------------
// Validation failures — required properties
// ---------------------------------------------------------------------------

test('ConfigLoader :: unhappy :: rejects non-object config', async () => {
  await expectValidationError('not-an-object', 'Config invalid');
});

test('ConfigLoader :: unhappy :: rejects config missing input', async () => {
  await expectValidationError(
    { 'pipeline': ['intake:hex'], 'output': { 'directory': '/tmp', 'files': {} } },
    'Config invalid',
  );
});

test('ConfigLoader :: unhappy :: rejects config where input.colors is missing', async () => {
  await expectValidationError(
    { 'input': {}, 'pipeline': ['intake:hex'], 'output': { 'directory': '/tmp', 'files': {} } },
    'Config invalid',
  );
});

test('ConfigLoader :: unhappy :: rejects config where input.colors is empty array', async () => {
  await expectValidationError(
    { 'input': { 'colors': [] }, 'pipeline': ['intake:hex'], 'output': { 'directory': '/tmp', 'files': {} } },
    'Config invalid',
  );
});

test('ConfigLoader :: unhappy :: rejects config missing pipeline', async () => {
  await expectValidationError(
    { 'input': { 'colors': ['#ff0000'] }, 'output': { 'directory': '/tmp', 'files': {} } },
    'Config invalid',
  );
});

test('ConfigLoader :: unhappy :: rejects config missing output', async () => {
  await expectValidationError(
    { 'input': { 'colors': ['#ff0000'] }, 'pipeline': ['intake:hex'] },
    'Config invalid',
  );
});

test('ConfigLoader :: unhappy :: rejects config where output.directory is missing', async () => {
  await expectValidationError(
    {
      'input':    { 'colors': ['#ff0000'] },
      'pipeline': ['intake:hex'],
      'output':   { 'files': {} },
    },
    'Config invalid',
  );
});

test('ConfigLoader :: unhappy :: rejects config where output.files is missing', async () => {
  await expectValidationError(
    {
      'input':    { 'colors': ['#ff0000'] },
      'pipeline': ['intake:hex'],
      'output':   { 'directory': '/tmp' },
    },
    'Config invalid',
  );
});

test('ConfigLoader :: unhappy :: rejects config where pipeline is empty array', async () => {
  await expectValidationError(
    {
      'input':    { 'colors': ['#ff0000'] },
      'pipeline': [],
      'output':   { 'directory': '/tmp', 'files': {} },
    },
    'Config invalid',
  );
});
