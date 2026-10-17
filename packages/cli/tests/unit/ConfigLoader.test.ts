import type { JsonObject } from '@studnicky/types/node';

import { ConfigLoader } from '@studnicky/iridis-cli';
import assert from 'node:assert/strict';
import { mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { test } from 'node:test';

class ConfigLoaderTestFixture {
  static async createDirectory(): Promise<string> {
    const directory = await mkdtemp(join(tmpdir(), 'iridis-cli-config-'));
    return directory;
  }

  static base(directory: string): JsonObject {
    const result: JsonObject = {
      'input': { 'colors': ['#8b5cf6'] },
      'output': { 'directory': directory, 'files': {} },
      'pipeline': ['intake:hex']
    };
    return result;
  }

  static async write(directory: string, document: JsonObject | readonly string[] | string | null): Promise<string> {
    const path = join(directory, 'config.json');
    await writeFile(path, JSON.stringify(document), 'utf8');
    return path;
  }
}

await test('ConfigLoader admits canonical configuration and preserves optional values', async () => {
  const directory = await ConfigLoaderTestFixture.createDirectory();
  try {
    const document: JsonObject = {
      ...ConfigLoaderTestFixture.base(join(directory, 'output')),
      'enableCapacitor': true,
      'enableContrast': true,
      'enableImage': true,
      'enableRdf': true,
      'enableStylesheet': true,
      'enableTailwind': true,
      'enableVscode': true,
      'input': {
        'colors': ['#8b5cf6', '#ec4899'],
        'contrast': {
          'algorithm': 'wcag21',
          'cvdCorrect': true,
          'extra': [{
            'algorithm': 'wcag21',
            'background': 'canvas',
            'foreground': 'text',
            'minimumContrastRatio': 4.5
          }],
          'level': 'AAA'
        },
        'metadata': { 'category': 'müzik', 'theme': 'dark' }
      },
      'output': {
        'directory': join(directory, 'お出力'),
        'files': {
          'stylesheet:cssVars': 'theme.css',
          'vscode:themeJson': 'theme.json'
        }
      },
      'pipeline': ['intake:hex', 'resolve:roles']
    };
    const path = await ConfigLoaderTestFixture.write(directory, document);
    const config = await new ConfigLoader().load(path);
    assert.deepEqual(config.input.colors, ['#8b5cf6', '#ec4899']);
    assert.equal(config.input.contrast?.extra?.[0]?.minimumContrastRatio, 4.5);
    assert.equal(config.input.metadata?.category, 'müzik');
    assert.equal(config.output.directory, join(directory, 'お出力'));
    assert.equal(config.output.files['vscode:themeJson'], 'theme.json');
    assert.equal(config.enableCapacitor, true);
    assert.equal(config.enableVscode, true);
  } finally {
    await rm(directory, { 'force': true, 'recursive': true });
  }
});

await test('ConfigLoader uses the canonical input boundary, including empty color collections', async () => {
  const directory = await ConfigLoaderTestFixture.createDirectory();
  try {
    const document: JsonObject = {
      'input': { 'colors': [] },
      'output': { 'directory': directory, 'files': {} },
      'pipeline': ['intake:hex']
    };
    const path = await ConfigLoaderTestFixture.write(directory, document);
    const config = await new ConfigLoader().load(path);
    assert.deepEqual(config.input.colors, []);
  } finally {
    await rm(directory, { 'force': true, 'recursive': true });
  }
});

await test('ConfigLoader rejects each missing required configuration boundary', async () => {
  const directory = await ConfigLoaderTestFixture.createDirectory();
  try {
    const documents: JsonObject[] = [
      { 'output': { 'directory': directory, 'files': {} }, 'pipeline': ['intake:hex'] },
      { 'input': { 'colors': ['#8b5cf6'] }, 'output': { 'directory': directory, 'files': {} } },
      { 'input': { 'colors': ['#8b5cf6'] }, 'pipeline': ['intake:hex'] },
      { 'input': {}, 'output': { 'directory': directory, 'files': {} }, 'pipeline': ['intake:hex'] },
      { 'input': { 'colors': ['#8b5cf6'] }, 'output': { 'files': {} }, 'pipeline': ['intake:hex'] },
      { 'input': { 'colors': ['#8b5cf6'] }, 'output': { 'directory': directory }, 'pipeline': ['intake:hex'] }
    ];
    for (let index = 0; index < documents.length; index += 1) {
      const document = documents[index];
      if (document === undefined) {
        throw new Error('The required-boundary fixture is incomplete.');
      }
      const path = join(directory, `missing-${index}.json`);
      await writeFile(path, JSON.stringify(document), 'utf8');
      await assert.rejects(new ConfigLoader().load(path), (error: Error) => {
        const isExpected = error.message.includes('Config invalid');
        return isExpected;
      });
    }
  } finally {
    await rm(directory, { 'force': true, 'recursive': true });
  }
});

await test('ConfigLoader rejects wrong JSON types and undeclared top-level fields', async () => {
  const directory = await ConfigLoaderTestFixture.createDirectory();
  try {
    const documents: JsonObject[] = [
      { 'input': { 'colors': '#8b5cf6' }, 'output': { 'directory': directory, 'files': {} }, 'pipeline': ['intake:hex'] },
      { 'input': { 'colors': ['#8b5cf6'] }, 'output': { 'directory': 42, 'files': {} }, 'pipeline': ['intake:hex'] },
      { 'input': { 'colors': ['#8b5cf6'] }, 'output': { 'directory': directory, 'files': 'theme.css' }, 'pipeline': ['intake:hex'] },
      { 'input': { 'colors': ['#8b5cf6'] }, 'output': { 'directory': directory, 'files': {} }, 'pipeline': 'intake:hex' },
      { ...ConfigLoaderTestFixture.base(directory), 'enableStylesheet': 'yes' },
      { ...ConfigLoaderTestFixture.base(directory), 'unrecognized': true }
    ];
    for (let index = 0; index < documents.length; index += 1) {
      const document = documents[index];
      if (document === undefined) {
        throw new Error('The JSON-type fixture is incomplete.');
      }
      const path = join(directory, `invalid-type-${index}.json`);
      await writeFile(path, JSON.stringify(document), 'utf8');
      await assert.rejects(new ConfigLoader().load(path), (error: Error) => {
        const isExpected = error.message.includes('Config invalid');
        return isExpected;
      });
    }
  } finally {
    await rm(directory, { 'force': true, 'recursive': true });
  }
});

await test('ConfigLoader admits minimumContrastRatio and rejects the retired minRatio wire key', async () => {
  const directory = await ConfigLoaderTestFixture.createDirectory();
  try {
    const canonical: JsonObject = {
      ...ConfigLoaderTestFixture.base(directory),
      'input': {
        'colors': ['#8b5cf6'],
        'contrast': {
          'extra': [{
            'background': 'canvas',
            'foreground': 'text',
            'minimumContrastRatio': 4.5
          }]
        }
      }
    };
    const canonicalPath = await ConfigLoaderTestFixture.write(directory, canonical);
    const admitted = await new ConfigLoader().load(canonicalPath);
    assert.equal(admitted.input.contrast?.extra?.[0]?.minimumContrastRatio, 4.5);
    const retired: JsonObject = {
      ...ConfigLoaderTestFixture.base(directory),
      'input': {
        'colors': ['#8b5cf6'],
        'contrast': {
          'extra': [{
            'background': 'canvas',
            'foreground': 'text',
            'minRatio': 4.5
          }]
        }
      }
    };
    const retiredPath = join(directory, 'retired-key.json');
    await writeFile(retiredPath, JSON.stringify(retired), 'utf8');
    await assert.rejects(new ConfigLoader().load(retiredPath), (error: Error) => {
      const isExpected = error.message.includes('Config invalid');
      return isExpected;
    });
  } finally {
    await rm(directory, { 'force': true, 'recursive': true });
  }
});

await test('ConfigLoader reports missing files, malformed JSON, and non-object roots', async () => {
  const directory = await ConfigLoaderTestFixture.createDirectory();
  try {
    await assert.rejects(new ConfigLoader().load(join(directory, 'missing.json')), (error: Error) => {
      const isExpected = error.message.includes('ENOENT') || error.message.includes('no such file');
      return isExpected;
    });
    const malformedPath = join(directory, 'malformed.json');
    await writeFile(malformedPath, '{ not json }', 'utf8');
    await assert.rejects(new ConfigLoader().load(malformedPath), (error: Error) => {
      const isExpected = error.message.includes('JSON') || error.message.includes('Unexpected');
      return isExpected;
    });
    const roots: (readonly string[] | string | null)[] = ['not-an-object', null, ['input', 'output']];
    for (let index = 0; index < roots.length; index += 1) {
      const root = roots[index];
      const path = join(directory, `root-${index}.json`);
      await writeFile(path, JSON.stringify(root), 'utf8');
      await assert.rejects(new ConfigLoader().load(path), (error: Error) => {
        const isExpected = error.message.includes('Config invalid');
        return isExpected;
      });
    }
  } finally {
    await rm(directory, { 'force': true, 'recursive': true });
  }
});
