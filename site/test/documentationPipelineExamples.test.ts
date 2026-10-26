import { coreTasks, Engine, InputEntity } from '@studnicky/iridis';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { test } from 'node:test';
import ts from 'typescript';

import { categoryW3cRoleSchema } from '../app/examples/vueCapacitor/categoryW3cRoleSchema.ts';
import { DocumentationPipelineFixture } from './fixtures/DocumentationPipelineFixture.ts';

class DocumentationPipelineHarness {
  static assertTypescriptFence(source: string, relativePath: string): void {
    const result = ts.transpileModule(source, {
      'compilerOptions': { 'target': ts.ScriptTarget.ESNext },
      'fileName': `${relativePath}.ts`,
      'reportDiagnostics': true
    });
    const syntaxErrors: string[] = [];
    const diagnostics = result.diagnostics ?? [];
    for (let index = 0; index < diagnostics.length; index += 1) {
      const diagnostic = diagnostics[index]!;
      if (diagnostic.category === ts.DiagnosticCategory.Error) {
        syntaxErrors.push(ts.flattenDiagnosticMessageText(diagnostic.messageText, '\n'));
      }
    }
    assert.deepEqual(syntaxErrors, [], `${relativePath} contains invalid TypeScript`);
  }

  static pipelineFenceResolvesRelationships(source: string, relativePath: string): boolean {
    const resolveIndex = source.indexOf('resolve:roles');
    const deriveIndex = source.indexOf('derive:roleRelations');
    if (resolveIndex < 0 || deriveIndex < 0) {return false;}
    assert.equal(resolveIndex < deriveIndex, true, `${relativePath} resolves relationships before their sources`);
    return true;
  }

  static async assertDocumentationPipeline(relativePath: string): Promise<void> {
    const markdown = await readFile(new URL(relativePath, import.meta.url), 'utf8');
    let pipelineFenceCount = 0;
    for (const match of markdown.matchAll(DocumentationPipelineFixture.FENCED_CODE_PATTERN)) {
      const language = match[1];
      const source = match[2];
      if (language === undefined || source === undefined) {
        throw new Error(`Malformed fenced code match in ${relativePath}.`);
      }
      if (language === 'ts') {
        DocumentationPipelineHarness.assertTypescriptFence(source, relativePath);
      } else {
        assert.doesNotThrow(() => {JSON.parse(source);}, `${relativePath} contains invalid JSON`);
      }
      if (DocumentationPipelineHarness.pipelineFenceResolvesRelationships(source, relativePath) === true) {pipelineFenceCount += 1;}
    }
    assert.equal(pipelineFenceCount > 0, true, `${relativePath} has no canonical pipeline fence`);
  }
}

await test('public pipeline code fences resolve source roles before relationships', async () => {
  const documents = DocumentationPipelineFixture.DOCUMENTS;
  for (let index = 0; index < documents.length; index += 1) {
    await DocumentationPipelineHarness.assertDocumentationPipeline(documents[index]!);
  }
});

await test('canonical resolve and relationship prefix produces the derived onAccent role', () => {
  const engine = new Engine();
  for (let index = 0; index < coreTasks.length; index += 1) {
    engine.tasks.register(coreTasks[index]!);
  }
  engine.pipeline(['intake:any', 'resolve:roles', 'derive:roleRelations']);

  const state = engine.run(InputEntity.create({
    'colors': ['#8B5CF6'],
    'roles': categoryW3cRoleSchema
  }));

  assert.equal(state.roles.onAccent?.hex.startsWith('#'), true);
});
