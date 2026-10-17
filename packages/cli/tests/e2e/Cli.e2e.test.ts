import { Cli, ConfigLoader, PluginResolver } from '@studnicky/iridis-cli';
import { JsonObject, JsonValue } from '@studnicky/types/node';
import assert from 'node:assert/strict';
import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { test } from 'node:test';

class CliE2eFixture {
  static async createDirectory(): Promise<string> {
    const directory = await mkdtemp(join(tmpdir(), 'iridis-cli-e2e-'));
    return directory;
  }

  static config(directory: string, colors: readonly string[], files: Record<string, string>): JsonObject {
    const result: JsonObject = {
      'enableStylesheet': true,
      'input': { 'colors': [...colors] },
      'output': { 'directory': directory, 'files': files },
      'pipeline': ['intake:hex', 'resolve:roles', 'emit:cssVars']
    };
    return result;
  }

  static async writeConfig(directory: string, document: JsonObject): Promise<string> {
    const path = join(directory, 'iridis.config.json');
    await writeFile(path, JSON.stringify(document), 'utf8');
    return path;
  }
}

await test('CLI runs a canonical stylesheet configuration and writes its declared output', async () => {
  const directory = await CliE2eFixture.createDirectory();
  try {
    const outputDirectory = join(directory, 'output');
    const configPath = await CliE2eFixture.writeConfig(
      directory,
      CliE2eFixture.config(outputDirectory, ['#8b5cf6'], { 'stylesheet:cssVars': 'theme.json' })
    );
    const result = await new Cli().run(configPath);
    assert.equal(result.outputsWritten.length, 1);
    const outputPath = result.outputsWritten[0];
    if (outputPath === undefined) {
      throw new Error('CLI did not report its written output path.');
    }
    assert.equal(outputPath, join(outputDirectory, 'theme.json'));
    const content = await readFile(outputPath, 'utf8');
    assert.ok(content.includes(':root'));
  } finally {
    await rm(directory, { 'force': true, 'recursive': true });
  }
});

await test('CLI accepts an intake-only pipeline with no declared outputs', async () => {
  const directory = await CliE2eFixture.createDirectory();
  try {
    const document: JsonObject = {
      'input': { 'colors': ['#8b5cf6'] },
      'output': { 'directory': join(directory, 'output'), 'files': {} },
      'pipeline': ['intake:hex']
    };
    const configPath = await CliE2eFixture.writeConfig(directory, document);
    const result = await new Cli().run(configPath);
    assert.deepEqual(result.outputsWritten, []);
    assert.equal(result.state.colors.length, 1);
  } finally {
    await rm(directory, { 'force': true, 'recursive': true });
  }
});

await test('CLI rejects declared slots that no pipeline task writes before output', async () => {
  const directory = await CliE2eFixture.createDirectory();
  try {
    const configPath = await CliE2eFixture.writeConfig(
      directory,
      CliE2eFixture.config(join(directory, 'output'), ['#8b5cf6'], { 'ghost:slot': 'missing.json' })
    );
    await assert.rejects(new Cli().run(configPath), (error: Error) => {
      const isExpected = error.message.includes('Config error') && error.message.includes('ghost:slot');
      return isExpected;
    });
  } finally {
    await rm(directory, { 'force': true, 'recursive': true });
  }
});

await test('CLI reports missing, invalid JSON, and schema-invalid configuration files', async () => {
  const directory = await CliE2eFixture.createDirectory();
  try {
    const missing = join(directory, 'missing.json');
    await assert.rejects(new Cli().run(missing), (error: Error) => {
      const isExpected = error.message.includes('ENOENT') || error.message.includes('no such file');
      return isExpected;
    });
    const malformed = join(directory, 'malformed.json');
    await writeFile(malformed, '{{ not json }}', 'utf8');
    await assert.rejects(new Cli().run(malformed), (error: Error) => {
      const isExpected = error.message.includes('JSON') || error.message.includes('Unexpected');
      return isExpected;
    });
    const invalid = join(directory, 'invalid.json');
    await writeFile(invalid, JSON.stringify({ 'input': { 'colors': ['#8b5cf6'] } }), 'utf8');
    await assert.rejects(new Cli().run(invalid), (error: Error) => {
      const isExpected = error.message.includes('Config invalid');
      return isExpected;
    });
  } finally {
    await rm(directory, { 'force': true, 'recursive': true });
  }
});

await test('CLI rejects invalid color input and unknown pipeline task names', async () => {
  const directory = await CliE2eFixture.createDirectory();
  try {
    const invalidColor = await CliE2eFixture.writeConfig(
      directory,
      CliE2eFixture.config(join(directory, 'color-output'), ['oklch(50% 0.2 270)'], {})
    );
    await assert.rejects(new Cli().run(invalidColor), (error: Error) => {
      const isExpected = error.message.includes('intake:hex') && error.message.includes('index 0');
      return isExpected;
    });
    const unknownTask = await CliE2eFixture.writeConfig(
      directory,
      {
        'input': { 'colors': ['#8b5cf6'] },
        'output': { 'directory': join(directory, 'task-output'), 'files': {} },
        'pipeline': ['intake:hex', 'does-not-exist:ghost']
      }
    );
    await assert.rejects(new Cli().run(unknownTask), (error: Error) => {
      const isExpected = error.message.includes('not registered') || error.message.includes('ghost');
      return isExpected;
    });
  } finally {
    await rm(directory, { 'force': true, 'recursive': true });
  }
});

await test('PluginResolver resolves requested plugins and ignores false or absent flags', async () => {
  const resolver = new PluginResolver();
  const stylesheet = await resolver.resolve({ 'enableStylesheet': true });
  assert.equal(stylesheet.length, 1);
  assert.equal(stylesheet[0]?.name, 'stylesheet');
  const none = await resolver.resolve({ 'enableStylesheet': false });
  assert.deepEqual(none, []);
});

await test('ConfigLoader returns admitted canonical colors from an on-disk document', async () => {
  const directory = await CliE2eFixture.createDirectory();
  try {
    const configPath = await CliE2eFixture.writeConfig(
      directory,
      CliE2eFixture.config(join(directory, 'output'), ['#8b5cf6', '#ec4899', '#10b981'], {})
    );
    const config = await new ConfigLoader().load(configPath);
    const document = JsonValue.from(JSON.parse(await readFile(configPath, 'utf8')));
    if (!JsonObject.is(document)) {
      throw new Error('The written configuration must be a JSON object.');
    }
    assert.deepEqual(config.input.colors, ['#8b5cf6', '#ec4899', '#10b981']);
    assert.equal(document.pipeline !== undefined, true);
  } finally {
    await rm(directory, { 'force': true, 'recursive': true });
  }
});
