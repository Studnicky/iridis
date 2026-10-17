import { JsonObject, JsonValue } from '@studnicky/types/node';
import assert from 'node:assert/strict';
import { readdirSync, readFileSync } from 'node:fs';
import { isBuiltin } from 'node:module';
import { dirname, extname, join, relative, resolve } from 'node:path';
import { test } from 'node:test';
import { fileURLToPath } from 'node:url';
import ts from 'typescript';

const ROOT_DIRECTORY = resolve(dirname(fileURLToPath(import.meta.url)), '../../../..');
const SHADCN_DIRECTORY = join(ROOT_DIRECTORY, 'packages/shadcn');

class PackageManifest {
  private static readonly dependencyFields = new Set(['dependencies', 'devDependencies', 'optionalDependencies', 'peerDependencies']);
  private constructor(public readonly name: string, public readonly dependencies: ReadonlySet<string>) {}

  private static addDependencies(path: string, field: string, value: JsonValue | null, dependencies: Set<string>): void {
    if (!JsonObject.is(value)) {throw new TypeError(`${path} ${field} must be an object`);}
    const entries = Object.entries(value);
    for (let index = 0; index < entries.length; index += 1) {
      const entry = entries[index];
      if (entry === undefined) {continue;}
      const [dependencyName, range] = entry;
      if (typeof range !== 'string') {throw new TypeError(`${path} ${field}.${dependencyName} must be a string`);}
      dependencies.add(dependencyName);
    }
  }

  public static parse(path: string): PackageManifest {
    const parsed = JsonValue.from(JSON.parse(readFileSync(path, 'utf8')));
    if (!JsonObject.is(parsed)) {throw new TypeError(`${path} must contain an object`);}
    let name: string | undefined;
    const dependencies = new Set<string>();
    const entries = Object.entries(parsed);
    for (let index = 0; index < entries.length; index += 1) {
      const entry = entries[index];
      if (entry === undefined) {continue;}
      const [field, value] = entry;
      if (field === 'name') {
        if (typeof value !== 'string') {throw new TypeError(`${path} name must be a string`);}
        name = value;
        continue;
      }
      if (PackageManifest.dependencyFields.has(field)) {PackageManifest.addDependencies(path, field, value, dependencies);}
    }
    if (name === undefined) {throw new TypeError(`${path} name must be defined`);}
    const result = new PackageManifest(name, dependencies);
    return result;
  }
}

class ShadcnTestDependencyBoundary {
  private static sourceFiles(directory: string): string[] {
    const files: string[] = [];
    const entries = readdirSync(directory, { 'withFileTypes': true });
    for (let index = 0; index < entries.length; index += 1) {
      const entry = entries[index];
      if (entry === undefined) {continue;}
      const path = join(directory, entry.name);
      if (entry.isDirectory()) {files.push(...ShadcnTestDependencyBoundary.sourceFiles(path));}
      else if (entry.isFile() && extname(entry.name) === '.ts') {files.push(path);}
    }
    return files;
  }

  private static packageName(specifier: string): string | undefined {
    if (specifier.startsWith('.') || specifier.startsWith('#') || isBuiltin(specifier)) {return undefined;}
    const segments = specifier.split('/');
    const result = specifier.startsWith('@') ? segments.slice(0, 2).join('/') : segments[0];
    return result;
  }

  private static typeDeclarationPackageName(packageName: string): string {
    if (!packageName.startsWith('@')) {return `@types/${packageName}`;}
    const [scope, name] = packageName.split('/');
    if (scope === undefined || name === undefined) {throw new TypeError(`Invalid scoped package name: ${packageName}`);}
    const result = `@types/${scope.slice(1)}__${name}`;
    return result;
  }

  private static recordViolation(statement: ts.Statement, path: string, declared: ReadonlySet<string>, violations: Set<string>): void {
    if (!ts.isImportDeclaration(statement) || !ts.isStringLiteral(statement.moduleSpecifier)) {return;}
    const packageName = ShadcnTestDependencyBoundary.packageName(statement.moduleSpecifier.text);
    if (packageName === undefined || declared.has(packageName)) {return;}
    const typeDeclarationPackage = ShadcnTestDependencyBoundary.typeDeclarationPackageName(packageName);
    const importClause = statement.importClause;
    const isTypeOnly = importClause !== undefined && ts.isTypeOnlyImportOrExportDeclaration(importClause);
    if (isTypeOnly && declared.has(typeDeclarationPackage)) {return;}
    violations.add(`${relative(SHADCN_DIRECTORY, path)} imports ${statement.moduleSpecifier.text}`);
  }

  public static undeclaredImports(): string[] {
    const rootManifest = PackageManifest.parse(join(ROOT_DIRECTORY, 'package.json'));
    const packageManifest = PackageManifest.parse(join(SHADCN_DIRECTORY, 'package.json'));
    const declared = new Set([packageManifest.name, rootManifest.name, ...packageManifest.dependencies, ...rootManifest.dependencies]);
    const violations = new Set<string>();
    const files = ShadcnTestDependencyBoundary.sourceFiles(join(SHADCN_DIRECTORY, 'tests'));
    for (let fileIndex = 0; fileIndex < files.length; fileIndex += 1) {
      const path = files[fileIndex];
      if (path === undefined) {continue;}
      const sourceFile = ts.createSourceFile(path, readFileSync(path, 'utf8'), ts.ScriptTarget.Latest, false);
      const statements = sourceFile.statements;
      for (let statementIndex = 0; statementIndex < statements.length; statementIndex += 1) {
        const statement = statements[statementIndex];
        if (statement === undefined) {continue;}
        ShadcnTestDependencyBoundary.recordViolation(statement, path, declared, violations);
      }
    }
    const result = [...violations].sort((left, right) => {const comparison = left.localeCompare(right); return comparison;});
    return result;
  }
}

await test('shadcn tests import only declared package dependencies', () => {
  assert.deepEqual(ShadcnTestDependencyBoundary.undeclaredImports(), []);
});
