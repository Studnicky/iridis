import type { JSONSchema7Type } from 'json-schema';

import { JsonObject, JsonValue } from '@studnicky/types/node';
import assert from 'node:assert/strict';
import { readdirSync, readFileSync } from 'node:fs';
import { isBuiltin } from 'node:module';
import { dirname, extname, join, relative, resolve } from 'node:path';
import { test } from 'node:test';
import { fileURLToPath } from 'node:url';
import ts from 'typescript';

const ROOT_DIRECTORY = resolve(dirname(fileURLToPath(import.meta.url)), '../../../..');
const STYLESHEET_DIRECTORY = join(ROOT_DIRECTORY, 'packages/stylesheet');

class PackageManifest {
  private static readonly dependencyFields = [
    'dependencies',
    'devDependencies',
    'optionalDependencies',
    'peerDependencies'
  ];

  private constructor(
    public readonly name: string,
    public readonly dependencies: ReadonlySet<string>
  ) {}

  private static addDependencyField(path: string, field: string, value: JSONSchema7Type, dependencies: Set<string>): void {
    if (!JsonObject.is(value)) {
      throw new TypeError(`${path} ${field} must be an object`);
    }
    const entries = Object.entries(value);
    for (let index = 0; index < entries.length; index += 1) {
      const entry = entries.at(index);
      if (entry === undefined) {
        continue;
      }
      const dependencyName = entry.at(0);
      const range = entry.at(1);
      if (typeof dependencyName !== 'string' || typeof range !== 'string') {
        throw new TypeError(`${path} ${field} entries must map names to string ranges`);
      }
      dependencies.add(dependencyName);
    }
  }

  private static readName(path: string, parsed: JsonObject): string {
    const entries = Object.entries(parsed);
    for (let index = 0; index < entries.length; index += 1) {
      const entry = entries.at(index);
      const value = JsonValue.from(entry?.at(1));
      if (entry?.at(0) === 'name' && typeof value === 'string') {
        const result = value;
        return result;
      }
    }
    throw new TypeError(`${path} name must be a string`);
  }

  private static readDependencies(path: string, parsed: JsonObject): ReadonlySet<string> {
    const dependencies = new Set<string>();
    const fields = PackageManifest.dependencyFields;
    const entries = Object.entries(parsed);
    for (let index = 0; index < fields.length; index += 1) {
      const field = fields.at(index);
      if (field === undefined) {
        continue;
      }
      for (let entryIndex = 0; entryIndex < entries.length; entryIndex += 1) {
        const entry = entries.at(entryIndex);
        if (entry?.at(0) === field) {
          const value = JsonValue.from(entry.at(1));
          PackageManifest.addDependencyField(path, field, value, dependencies);
        }
      }
    }
    return dependencies;
  }

  public static parse(path: string): PackageManifest {
    const parsed = JsonValue.from(JSON.parse(readFileSync(path, 'utf8')));
    if (!JsonObject.is(parsed)) {
      throw new TypeError(`${path} must contain an object`);
    }
    const name = PackageManifest.readName(path, parsed);
    const dependencies = PackageManifest.readDependencies(path, parsed);
    const result = new PackageManifest(name, dependencies);
    return result;
  }
}

class StylesheetTestDependencyBoundary {
  private static sourceFiles(directory: string): string[] {
    const files: string[] = [];
    const entries = readdirSync(directory, { 'withFileTypes': true });
    for (let index = 0; index < entries.length; index += 1) {
      const entry = entries.at(index);
      if (entry === undefined) {
        continue;
      }
      const path = join(directory, entry.name);
      if (entry.isDirectory()) {
        files.push(...StylesheetTestDependencyBoundary.sourceFiles(path));
      } else if (entry.isFile() && extname(entry.name) === '.ts') {
        files.push(path);
      }
    }
    return files;
  }

  private static packageName(specifier: string): string | undefined {
    if (specifier.startsWith('.') || specifier.startsWith('#') || isBuiltin(specifier)) {
      return undefined;
    }
    const segments = specifier.split('/');
    const result = specifier.startsWith('@')
      ? segments.slice(0, 2).join('/')
      : segments.at(0);
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
    const result = `@types/${scope.slice(1)}__${name}`;
    return result;
  }

  private static inspectImports(path: string, declared: ReadonlySet<string>, violations: Set<string>): void {
    const sourceFile = ts.createSourceFile(path, readFileSync(path, 'utf8'), ts.ScriptTarget.Latest, false);
    const statements = sourceFile.statements;
    for (let index = 0; index < statements.length; index += 1) {
      const statement = statements.at(index);
      if (statement === undefined || !ts.isImportDeclaration(statement) || !ts.isStringLiteral(statement.moduleSpecifier)) {
        continue;
      }
      const packageName = StylesheetTestDependencyBoundary.packageName(statement.moduleSpecifier.text);
      if (packageName === undefined || declared.has(packageName)) {
        continue;
      }
      const typeDeclarationPackage = StylesheetTestDependencyBoundary.typeDeclarationPackageName(packageName);
      const importClause = statement.importClause;
      if (importClause !== undefined
        && ts.isTypeOnlyImportOrExportDeclaration(importClause)
        && declared.has(typeDeclarationPackage)) {
        continue;
      }
      violations.add(`${relative(STYLESHEET_DIRECTORY, path)} imports ${statement.moduleSpecifier.text}`);
    }
  }

  public static undeclaredImports(): string[] {
    const rootManifest = PackageManifest.parse(join(ROOT_DIRECTORY, 'package.json'));
    const packageManifest = PackageManifest.parse(join(STYLESHEET_DIRECTORY, 'package.json'));
    const declared = new Set([
      packageManifest.name,
      rootManifest.name,
      ...packageManifest.dependencies,
      ...rootManifest.dependencies
    ]);
    const violations = new Set<string>();
    const testDirectory = join(STYLESHEET_DIRECTORY, 'tests');
    const paths = StylesheetTestDependencyBoundary.sourceFiles(testDirectory);
    for (let index = 0; index < paths.length; index += 1) {
      const path = paths.at(index);
      if (path !== undefined) {
        StylesheetTestDependencyBoundary.inspectImports(path, declared, violations);
      }
    }
    const result = [...violations].sort((left, right) => {
      const comparison = left.localeCompare(right);
      return comparison;
    });
    return result;
  }
}

await test('stylesheet tests import only declared package dependencies', () => {
  assert.deepEqual(StylesheetTestDependencyBoundary.undeclaredImports(), []);
});
