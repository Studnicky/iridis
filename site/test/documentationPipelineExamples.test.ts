import { coreTasks, Engine } from '@studnicky/iridis';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { test } from 'node:test';
import ts from 'typescript';

import { categoryW3cRoleSchema } from '../app/examples/vueCapacitor/categoryW3cRoleSchema.ts';
import { DocumentationPipelineFixture } from './fixtures/DocumentationPipelineFixture.ts';

await test('public pipeline code fences resolve source roles before family expansion', async () => {
  for (const relativePath of DocumentationPipelineFixture.DOCUMENTS) {
    const markdown = await readFile(new URL(relativePath, import.meta.url), 'utf8');
    let pipelineFenceCount = 0;

    for (const match of markdown.matchAll(DocumentationPipelineFixture.FENCED_CODE_PATTERN)) {
      const language = match[1];
      const source = match[2];
      if (language === undefined || source === undefined) {
        throw new Error(`Malformed fenced code match in ${relativePath}.`);
      }

      if (language === 'ts') {
        const result = ts.transpileModule(source, {
          'compilerOptions': { 'target': ts.ScriptTarget.ESNext },
          'fileName': `${relativePath}.ts`,
          'reportDiagnostics': true
        });
        const syntaxErrors: string[] = [];
        for (const diagnostic of result.diagnostics ?? []) {
          if (diagnostic.category === ts.DiagnosticCategory.Error) {
            syntaxErrors.push(ts.flattenDiagnosticMessageText(diagnostic.messageText, '\n'));
          }
        }
        assert.deepEqual(
          syntaxErrors,
          [],
          `${relativePath} contains invalid TypeScript`
        );
      } else {
        assert.doesNotThrow(() => {JSON.parse(source);}, `${relativePath} contains invalid JSON`);
      }

      const resolveIndex = source.indexOf('resolve:roles');
      const expandIndex = source.indexOf('expand:family');
      if (resolveIndex >= 0 && expandIndex >= 0) {
        pipelineFenceCount += 1;
        assert.equal(
          resolveIndex < expandIndex,
          true,
          `${relativePath} expands derived roles before resolving their sources`
        );
      }
    }

    assert.equal(pipelineFenceCount > 0, true, `${relativePath} has no canonical pipeline fence`);
  }
});

await test('canonical resolve and expand prefix produces the derived onAccent role', () => {
  const engine = new Engine();
  for (const task of coreTasks) {
    engine.tasks.register(task);
  }
  engine.pipeline(['intake:any', 'resolve:roles', 'expand:family']);

  const state = engine.run({
    'bypass': undefined,
    'colors': ['#8B5CF6'],
    'contrast': undefined,
    'emit': undefined,
    'maxColors': undefined,
    'metadata': undefined,
    'roles': categoryW3cRoleSchema,
    'runtime': undefined
  });

  assert.equal(state.roles.onAccent?.hex.startsWith('#'), true);
});
