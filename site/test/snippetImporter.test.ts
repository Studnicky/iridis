import assert from 'node:assert/strict';
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { test } from 'node:test';

import { snippetImporter } from '../app/build/SnippetImporter.ts';

class SnippetTestFixture {
  readonly #fixtureRoot: string;
  readonly #repositoryRoot: string;

  constructor() {
    this.#fixtureRoot = mkdtempSync(join(tmpdir(), 'iridis-snippets-'));
    this.#repositoryRoot = join(this.#fixtureRoot, 'repository');
    mkdirSync(this.#repositoryRoot, { 'recursive': true });
  }

  cleanup(): void {
    rmSync(this.#fixtureRoot, { 'force': true, 'recursive': true });
  }

  repositoryRoot(): string {
    return this.#repositoryRoot;
  }

  writeSibling(relativePath: string, source: string): string {
    const absolutePath = join(this.#fixtureRoot, relativePath);
    mkdirSync(dirname(absolutePath), { 'recursive': true });
    writeFileSync(absolutePath, source, 'utf-8');
    return absolutePath;
  }

  write(relativePath: string, source: string): void {
    const absolutePath = join(this.#repositoryRoot, relativePath);
    mkdirSync(dirname(absolutePath), { 'recursive': true });
    writeFileSync(absolutePath, source, 'utf-8');
  }
}

await test('resolves a whole TypeScript file into a fenced code block', () => {
  const fixture = new SnippetTestFixture();
  try {
    fixture.write('example.ts', 'export const answer = 42;\n');
    const resolved = snippetImporter.resolve('Before\n<<< @/example.ts\nAfter', fixture.repositoryRoot());

    assert.equal(resolved, 'Before\n```ts\nexport const answer = 42;\n```\nAfter');
  } finally {
    fixture.cleanup();
  }
});

await test('resolves valid nested repository paths', () => {
  const fixture = new SnippetTestFixture();
  try {
    fixture.write('examples/nested/example.ts', 'export const nested = true;\n');
    const resolved = snippetImporter.resolve(
      '<<< @/examples/nested/example.ts',
      fixture.repositoryRoot()
    );

    assert.equal(resolved, '```ts\nexport const nested = true;\n```');
  } finally {
    fixture.cleanup();
  }
});

await test('rejects parent traversal before reading outside the repository', () => {
  const fixture = new SnippetTestFixture();
  try {
    assert.throws(
      () => {
        snippetImporter.resolve('<<< @/../../outside.ts', fixture.repositoryRoot());
      },
      new Error('SnippetImporter: source path must remain inside repository root')
    );
  } finally {
    fixture.cleanup();
  }
});

await test('rejects sibling-prefix, encoded, alternate-separator, and absolute escapes', () => {
  const fixture = new SnippetTestFixture();
  try {
    const absoluteSiblingPath = fixture.writeSibling(
      'repository-sibling/secret.ts',
      'host secret must not be read'
    );
    const directives = [
      '<<< @/../repository-sibling/secret.ts',
      '<<< @/%2e%2e%2frepository-sibling%2fsecret.ts',
      '<<< @/..\\repository-sibling\\secret.ts',
      `<<< @/${absoluteSiblingPath}`
    ];

    for (const directive of directives) {
      assert.throws(
        () => {
          snippetImporter.resolve(directive, fixture.repositoryRoot());
        },
        new Error('SnippetImporter: source path must remain inside repository root')
      );
    }
  } finally {
    fixture.cleanup();
  }
});

await test('extracts and dedents a named source region', () => {
  const fixture = new SnippetTestFixture();
  try {
    fixture.write(
      'region.ts',
      [
        '// #region sample',
        '  const value = 1;',
        '    return value;',
        '// #endregion sample'
      ].join('\n')
    );
    const resolved = snippetImporter.resolve('<<< @/region.ts#sample', fixture.repositoryRoot());

    assert.equal(resolved, '```ts\nconst value = 1;\n  return value;\n```');
  } finally {
    fixture.cleanup();
  }
});

await test('maps every supported file extension to its fenced language', () => {
  const fixture = new SnippetTestFixture();
  try {
    fixture.write('sample.json', '{}');
    fixture.write('sample.md', '# Heading');
    fixture.write('sample.mjs', 'export default 1;');
    fixture.write('sample.ts', 'export const value = 1;');
    fixture.write('sample.vue', '<template />');
    fixture.write('sample.yaml', 'value: one');
    fixture.write('sample.yml', 'value: two');
    const markdown = [
      '<<< @/sample.json',
      '<<< @/sample.md',
      '<<< @/sample.mjs',
      '<<< @/sample.ts',
      '<<< @/sample.vue',
      '<<< @/sample.yaml',
      '<<< @/sample.yml'
    ].join('\n');
    const resolved = snippetImporter.resolve(markdown, fixture.repositoryRoot());

    assert.equal(
      resolved,
      [
        '```json\n{}\n```',
        '```md\n# Heading\n```',
        '```js\nexport default 1;\n```',
        '```ts\nexport const value = 1;\n```',
        '```vue\n<template />\n```',
        '```yaml\nvalue: one\n```',
        '```yaml\nvalue: two\n```'
      ].join('\n')
    );
  } finally {
    fixture.cleanup();
  }
});

await test('uses the text language for an unknown file extension', () => {
  const fixture = new SnippetTestFixture();
  try {
    fixture.write('sample.custom', 'plain source');
    const resolved = snippetImporter.resolve('<<< @/sample.custom', fixture.repositoryRoot());

    assert.equal(resolved, '```text\nplain source\n```');
  } finally {
    fixture.cleanup();
  }
});

await test('resolves multiple directives while preserving surrounding markdown', () => {
  const fixture = new SnippetTestFixture();
  try {
    fixture.write('first.ts', 'const first = true;');
    fixture.write('second.ts', 'const second = true;');
    const resolved = snippetImporter.resolve(
      '# Examples\n\n<<< @/first.ts\n\nBetween\n\n<<< @/second.ts\n\nDone',
      fixture.repositoryRoot()
    );

    assert.equal(
      resolved,
      '# Examples\n\n```ts\nconst first = true;\n```\nBetween\n\n```ts\nconst second = true;\n```\nDone'
    );
  } finally {
    fixture.cleanup();
  }
});

await test('leaves markdown without directives unchanged', () => {
  const fixture = new SnippetTestFixture();
  try {
    const markdown = '# Heading\n\nOrdinary content.';
    const resolved = snippetImporter.resolve(markdown, fixture.repositoryRoot());

    assert.equal(resolved, markdown);
  } finally {
    fixture.cleanup();
  }
});

await test('reports the missing region and relative source path', () => {
  const fixture = new SnippetTestFixture();
  try {
    fixture.write('region.ts', 'export const value = 1;');

    assert.throws(
      () => {
        snippetImporter.resolve('<<< @/region.ts#missing', fixture.repositoryRoot());
      },
      (error: unknown) => {
        assert.ok(error instanceof Error);
        assert.equal(error.message, 'SnippetImporter: region "missing" not found in region.ts');
        return true;
      }
    );
  } finally {
    fixture.cleanup();
  }
});
