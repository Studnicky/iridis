import type { JSONSchema7Type } from 'json-schema';
import type { Dirent } from 'node:fs';

import { JsonObject, JsonValue } from '@studnicky/types/node';
import assert from 'node:assert/strict';
import { readdirSync, readFileSync } from 'node:fs';
import { isBuiltin } from 'node:module';
import { dirname, extname, join, relative, resolve } from 'node:path';
import { test } from 'node:test';
import { fileURLToPath } from 'node:url';
import ts from 'typescript';

const ROOT_DIRECTORY = resolve(dirname(fileURLToPath(import.meta.url)), '../../../..');
const MUI_DIRECTORY = join(ROOT_DIRECTORY, 'packages/mui');

class PackageManifest {
  private static readonly dependencyFields = new Set([
    'dependencies',
    'devDependencies',
    'optionalDependencies',
    'peerDependencies'
  ]);

  private constructor(
    public readonly name: string,
    public readonly dependencies: ReadonlySet<string>
  ) {}

  public static parse(path: string): PackageManifest {
    const candidate = JsonValue.from(JSON.parse(readFileSync(path, 'utf8')));
    const parsed = PackageManifest.normalizeObject(path, candidate);
    const name = PackageManifest.readName(path, parsed);
    const dependencies = PackageManifest.readDependencies(path, parsed);
    const manifest = new PackageManifest(name, dependencies);
    return manifest;
  }

  private static readName(path: string, parsed: Record<string, JSONSchema7Type>): string {
    const name = parsed.name;
    if (typeof name !== 'string') {
      throw new TypeError(`${path} name must be a string`);
    }
    return name;
  }

  private static readDependencies(path: string, parsed: Record<string, JSONSchema7Type>): Set<string> {
    const dependencies = new Set<string>();
    const entries = Object.entries(parsed);
    for (let index = 0; index < entries.length; index += 1) {
      const entry = entries[index];
      if (entry !== undefined && PackageManifest.dependencyFields.has(entry[0])) {
        PackageManifest.addDependencies(path, entry[0], entry[1], dependencies);
      }
    }
    return dependencies;
  }

  private static normalizeObject(path: string, value: JSONSchema7Type): Record<string, JSONSchema7Type> {
    if (!JsonObject.is(value)) {
      throw new TypeError(`${path} must contain an object`);
    }
    const entries = Object.entries(value);
    const normalized: (readonly [string, JSONSchema7Type])[] = [];
    for (let index = 0; index < entries.length; index += 1) {
      const entry = entries[index];
      if (entry !== undefined) {
        normalized.push([entry[0], JsonValue.from(entry[1])]);
      }
    }
    const result = JsonObject.fromEntries(normalized);
    return result;
  }

  private static addDependencies(path: string, field: string, value: JSONSchema7Type, dependencies: Set<string>): void {
    const dependenciesObject = PackageManifest.normalizeObject(`${path} ${field}`, value);
    const entries = Object.entries(dependenciesObject);
    for (let index = 0; index < entries.length; index += 1) {
      const entry = entries[index];
      if (entry === undefined) {continue;}
      const [dependencyName, range] = entry;
      if (typeof range !== 'string') {
        throw new TypeError(`${path} ${field}.${dependencyName} must be a string`);
      }
      dependencies.add(dependencyName);
    }
  }
}

class MuiTestDependencyBoundary {
  private static sourceFiles(directory: string): string[] {
    const files: string[] = [];
    const entries = readdirSync(directory, { 'withFileTypes': true });
    for (let index = 0; index < entries.length; index += 1) {
      const entry = entries[index];
      if (entry !== undefined) {
        MuiTestDependencyBoundary.addSourceFile(directory, entry, files);
      }
    }
    return files;
  }

  private static addSourceFile(directory: string, entry: Dirent<string>, files: string[]): void {
    const path = join(directory, entry.name);
    if (entry.isDirectory()) {
      files.push(...MuiTestDependencyBoundary.sourceFiles(path));
    } else if (entry.isFile() && extname(entry.name) === '.ts') {
      files.push(path);
    }
  }

  private static packageName(specifier: string): string | undefined {
    if (specifier.startsWith('.') || specifier.startsWith('#') || isBuiltin(specifier)) {
      return undefined;
    }
    const segments = specifier.split('/');
    const packageName = specifier.startsWith('@')
      ? segments.slice(0, 2).join('/')
      : segments[0];
    const result = packageName;
    return result;
  }

  private static typeDeclarationPackageName(packageName: string): string {
    if (!packageName.startsWith('@')) {
      return `@types/${packageName}`;
    }
    const [scope, name] = packageName.split('/');
    if (scope === undefined || name === undefined) {
      throw new TypeError(`Invalid scoped package name: ${packageName}`);
    }
    const declarationPackageName = `@types/${scope.slice(1)}__${name}`;
    return declarationPackageName;
  }

  public static undeclaredImports(): string[] {
    const declared = MuiTestDependencyBoundary.declaredPackages();
    const violations = new Set<string>();
    const files = MuiTestDependencyBoundary.sourceFiles(join(MUI_DIRECTORY, 'tests'));
    for (let index = 0; index < files.length; index += 1) {
      const path = files[index];
      if (path !== undefined) {
        MuiTestDependencyBoundary.inspectFile(path, declared, violations);
      }
    }
    const result = [...violations].sort(MuiTestDependencyBoundary.compareStrings);
    return result;
  }

  private static compareStrings(left: string, right: string): number {
    const result = left.localeCompare(right);
    return result;
  }

  private static declaredPackages(): Set<string> {
    const rootManifest = PackageManifest.parse(join(ROOT_DIRECTORY, 'package.json'));
    const packageManifest = PackageManifest.parse(join(MUI_DIRECTORY, 'package.json'));
    const declared = new Set([
      packageManifest.name,
      rootManifest.name,
      ...packageManifest.dependencies,
      ...rootManifest.dependencies
    ]);
    return declared;
  }

  private static inspectFile(path: string, declared: ReadonlySet<string>, violations: Set<string>): void {
    const sourceFile = ts.createSourceFile(path, readFileSync(path, 'utf8'), ts.ScriptTarget.Latest, false);
    const statements = sourceFile.statements;
    for (let index = 0; index < statements.length; index += 1) {
      const statement = statements[index];
      if (statement !== undefined) {
        MuiTestDependencyBoundary.inspectStatement(path, statement, declared, violations);
      }
    }
  }

  private static inspectStatement(path: string, statement: ts.Statement, declared: ReadonlySet<string>, violations: Set<string>): void {
    if (!ts.isImportDeclaration(statement) || !ts.isStringLiteral(statement.moduleSpecifier)) {
      return;
    }
    const packageName = MuiTestDependencyBoundary.packageName(statement.moduleSpecifier.text);
    if (packageName === undefined || declared.has(packageName)) {
      return;
    }
    const importClause = statement.importClause;
    const typeDeclarationPackage = MuiTestDependencyBoundary.typeDeclarationPackageName(packageName);
    if (importClause !== undefined && ts.isTypeOnlyImportDeclaration(importClause) && declared.has(typeDeclarationPackage)) {
      return;
    }
    violations.add(`${relative(MUI_DIRECTORY, path)} imports ${statement.moduleSpecifier.text}`);
  }
}

await test('mui tests import only declared package dependencies', () => {
  assert.deepEqual(MuiTestDependencyBoundary.undeclaredImports(), []);
});
