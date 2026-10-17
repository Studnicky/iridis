import assert from 'node:assert/strict';
import { resolve } from 'node:path';
import { test } from 'node:test';
import typescript from 'typescript';

class SchemaInterfaceTypeConsumerCompiler {
  static collectDefaultOptionalPropertyDiagnostics(): string[] {
    const compilerOptions = {
      'allowImportingTsExtensions': true,
      'exactOptionalPropertyTypes': false,
      'module':                     typescript.ModuleKind.ESNext,
      'moduleResolution':           typescript.ModuleResolutionKind.Bundler,
      'noEmit':                     true,
      'skipLibCheck':               true,
      'strict':                     true,
      'target':                     typescript.ScriptTarget.ES2023
    } satisfies typescript.CompilerOptions;
    const result = SchemaInterfaceTypeConsumerCompiler.collectDiagnosticMessages(compilerOptions);
    return result;
  }

  static collectExactOptionalPropertyDiagnostics(): string[] {
    const compilerOptions = {
      'allowImportingTsExtensions': true,
      'exactOptionalPropertyTypes': true,
      'module':                     typescript.ModuleKind.ESNext,
      'moduleResolution':           typescript.ModuleResolutionKind.Bundler,
      'noEmit':                     true,
      'skipLibCheck':               true,
      'strict':                     true,
      'target':                     typescript.ScriptTarget.ES2023
    } satisfies typescript.CompilerOptions;
    const result = SchemaInterfaceTypeConsumerCompiler.collectDiagnosticMessages(compilerOptions);
    return result;
  }

  private static collectDiagnosticMessages(compilerOptions: typescript.CompilerOptions): string[] {
    const fixturePath = resolve(import.meta.dirname, '../fixtures/RoleInterfaceTypeConsumer.ts');
    const program = typescript.createProgram([fixturePath], compilerOptions);
    const diagnostics = typescript.getPreEmitDiagnostics(program);
    const messages: string[] = [];
    for (let index = 0; index < diagnostics.length; index += 1) {
      const diagnostic = diagnostics[index];
      if (diagnostic !== undefined) {
        messages.push(typescript.flattenDiagnosticMessageText(diagnostic.messageText, '\n'));
      }
    }
    return messages;
  }
}

await test('schema-derived interfaces preserve explicit undefined across consumer compiler options', () => {
  assert.deepEqual(SchemaInterfaceTypeConsumerCompiler.collectDefaultOptionalPropertyDiagnostics(), []);
  assert.deepEqual(SchemaInterfaceTypeConsumerCompiler.collectExactOptionalPropertyDiagnostics(), []);
});
