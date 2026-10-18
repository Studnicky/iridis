import { OutputWriter } from '@studnicky/iridis-cli';
import assert from 'node:assert/strict';
import { readdir, readFile, rm } from 'node:fs/promises';
import { join } from 'node:path';
import { test } from 'node:test';

import { OutputWriterTestFixture } from '../fixtures/OutputWriterTestFixture.ts';

await test('OutputWriter rejects a traversal filename before writing', async () => {
  const directory = await OutputWriterTestFixture.createDirectory();
  try {
    await assert.rejects(
      new OutputWriter().write(
        OutputWriterTestFixture.state(),
        OutputWriterTestFixture.config(directory, '../../../../etc/passwd')
      ),
      (error: Error) => {
        const isExpected = error.message.includes('escapes the configured output directory');
        return isExpected;
      }
    );
    const entries = await readdir(directory);
    assert.deepStrictEqual(entries, []);
  } finally {
    await rm(directory, { 'force': true, 'recursive': true });
  }
});

await test('OutputWriter rejects an absolute filename before writing', async () => {
  const directory = await OutputWriterTestFixture.createDirectory();
  try {
    await assert.rejects(
      new OutputWriter().write(
        OutputWriterTestFixture.state(),
        OutputWriterTestFixture.config(directory, '/etc/hostname')
      ),
      (error: Error) => {
        const isExpected = error.message.includes('escapes the configured output directory');
        return isExpected;
      }
    );
    const entries = await readdir(directory);
    assert.deepStrictEqual(entries, []);
  } finally {
    await rm(directory, { 'force': true, 'recursive': true });
  }
});

await test('OutputWriter writes a contained flat filename', async () => {
  const directory = await OutputWriterTestFixture.createDirectory();
  try {
    const written = await new OutputWriter().write(
      OutputWriterTestFixture.state(),
      OutputWriterTestFixture.config(directory, 'theme.css')
    );
    assert.deepStrictEqual(written, [join(directory, 'theme.css')]);
    const content = await readFile(join(directory, 'theme.css'), 'utf-8');
    assert.strictEqual(content, 'content');
  } finally {
    await rm(directory, { 'force': true, 'recursive': true });
  }
});

await test('OutputWriter writes a contained nested filename', async () => {
  const directory = await OutputWriterTestFixture.createDirectory();
  try {
    const written = await new OutputWriter().write(
      OutputWriterTestFixture.state(),
      OutputWriterTestFixture.config(directory, 'nested/file.css')
    );
    assert.deepStrictEqual(written, [join(directory, 'nested', 'file.css')]);
    const content = await readFile(join(directory, 'nested', 'file.css'), 'utf-8');
    assert.strictEqual(content, 'content');
  } finally {
    await rm(directory, { 'force': true, 'recursive': true });
  }
});
