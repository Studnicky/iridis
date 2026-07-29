import { JsonObject, JsonValue } from '@studnicky/types';
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
    const parsed = JsonValue.from(JSON.parse(readFileSync(path, 'utf8')));
    if (!JsonObject.is(parsed)) {
      throw new TypeError(`${path} must contain an object`);
    }

    let name: string | undefined;
    const dependencies = new Set<string>();
    for (const [field, value] of Object.entries(parsed)) {
      if (field === 'name') {
        if (typeof value !== 'string') {
          throw new TypeError(`${path} name must be a string`);
        }
        name = value;
      }
      if (!PackageManifest.dependencyFields.has(field)) {
        continue;
      }
      if (value === null || typeof value !== 'object' || Array.isArray(value)) {
        throw new TypeError(`${path} ${field} must be an object`);
      }
      for (const [dependencyName, range] of Object.entries(value)) {
        if (typeof range !== 'string') {
          throw new TypeError(`${path} ${field}.${dependencyName} must be a string`);
        }
        dependencies.add(dependencyName);
      }
    }
    if (name === undefined) {
      throw new TypeError(`${path} name must be defined`);
    }
    return new PackageManifest(name, dependencies);
  }
}

class MuiTestDependencyBoundary {
  private static sourceFiles(directory: string): string[] {
    const files: string[] = [];
    for (const entry of readdirSync(directory, { 'withFileTypes': true })) {
      const path = join(directory, entry.name);
      if (entry.isDirectory()) {
        files.push(...MuiTestDependencyBoundary.sourceFiles(path));
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
    return specifier.startsWith('@')
      ? segments.slice(0, 2).join('/')
      : segments[0];
  }

  public static undeclaredImports(): string[] {
    const rootManifest = PackageManifest.parse(join(ROOT_DIRECTORY, 'package.json'));
    const packageManifest = PackageManifest.parse(join(MUI_DIRECTORY, 'package.json'));
    const declared = new Set([
      packageManifest.name,
      rootManifest.name,
      ...packageManifest.dependencies,
      ...rootManifest.dependencies
    ]);
    const violations = new Set<string>();
    const testDirectory = join(MUI_DIRECTORY, 'tests');
    for (const path of MuiTestDependencyBoundary.sourceFiles(testDirectory)) {
      const imports = ts.preProcessFile(readFileSync(path, 'utf8'), true, true).importedFiles;
      for (const imported of imports) {
        const packageName = MuiTestDependencyBoundary.packageName(imported.fileName);
        if (packageName !== undefined && !declared.has(packageName)) {
          violations.add(`${relative(MUI_DIRECTORY, path)} imports ${imported.fileName}`);
        }
      }
    }
    return [...violations].sort();
  }
}

await test('mui tests import only declared package dependencies', () => {
  assert.deepEqual(MuiTestDependencyBoundary.undeclaredImports(), []);
});
