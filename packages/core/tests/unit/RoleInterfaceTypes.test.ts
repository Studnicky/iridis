import assert from 'node:assert/strict';
import { resolve } from 'node:path';
import { test } from 'node:test';
import typescript from 'typescript';

class SchemaInterfaceTypeConsumerCompiler {
  static collectDiagnosticMessages(exactOptionalPropertyTypes: boolean): string[] {
    const fixturePath = resolve(import.meta.dirname, '../fixtures/RoleInterfaceTypeConsumer.ts');
    const compilerOptions = {
      'allowImportingTsExtensions': true,
      'exactOptionalPropertyTypes': exactOptionalPropertyTypes,
      'module':                     typescript.ModuleKind.ESNext,
      'moduleResolution':           typescript.ModuleResolutionKind.Bundler,
      'noEmit':                     true,
      'skipLibCheck':               true,
      'strict':                     true,
      'target':                     typescript.ScriptTarget.ES2023
    } satisfies typescript.CompilerOptions;
    const program = typescript.createProgram([fixturePath], compilerOptions);
    const messages: string[] = [];
    for (const diagnostic of typescript.getPreEmitDiagnostics(program)) {
      messages.push(typescript.flattenDiagnosticMessageText(diagnostic.messageText, '\n'));
    }
    return messages;
  }
}

await test('schema-derived interfaces preserve explicit undefined across consumer compiler options', () => {
  assert.deepEqual(SchemaInterfaceTypeConsumerCompiler.collectDiagnosticMessages(false), []);
  assert.deepEqual(SchemaInterfaceTypeConsumerCompiler.collectDiagnosticMessages(true), []);
});
