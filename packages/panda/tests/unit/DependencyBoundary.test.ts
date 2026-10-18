import { JsonObject, JsonValue } from '@studnicky/types/node';
import assert from 'node:assert/strict';
import { readdirSync, readFileSync } from 'node:fs';
import { isBuiltin } from 'node:module';
import { dirname, extname, join, relative, resolve } from 'node:path';
import { test } from 'node:test';
import { fileURLToPath } from 'node:url';
import ts from 'typescript';

const ROOT_DIRECTORY = resolve(dirname(fileURLToPath(import.meta.url)), '../../../..');
const PANDA_DIRECTORY = join(ROOT_DIRECTORY, 'packages/panda');

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

  private static dependencyNames(
    value: ReturnType<typeof JsonValue.from>,
    field: string,
    path: string
  ): ReadonlySet<string> {
    if (!JsonObject.is(value)) {
      throw new TypeError(`${path} ${field} must be an object`);
    }
    const dependencies = new Set<string>();
    const entries = Object.entries(value);
    for (let index = 0; index < entries.length; index += 1) {
      const [dependencyName, range] = entries[index]!;
      if (typeof range !== 'string') {
        throw new TypeError(`${path} ${field}.${dependencyName} must be a string`);
      }
      dependencies.add(dependencyName);
    }
    return dependencies;
  }

  private static mergeDependencies(
    target: Set<string>,
    source: ReadonlySet<string>
  ): void {
    const iterator = source.values();
    let next = iterator.next();
    while (next.done === false) {
      target.add(next.value);
      next = iterator.next();
    }
  }

  private static nameFrom(
    value: ReturnType<typeof JsonValue.from> | undefined,
    path: string
  ): string {
    if (value === undefined) {
      throw new TypeError(`${path} name must be defined`);
    }
    if (typeof value !== 'string') {
      throw new TypeError(`${path} name must be a string`);
    }
    return value;
  }

  public static parse(path: string): PackageManifest {
    const parsed = JsonValue.from(JSON.parse(readFileSync(path, 'utf8')));
    if (!JsonObject.is(parsed)) {
      throw new TypeError(`${path} must contain an object`);
    }
    const name = PackageManifest.nameFrom(parsed.name, path);
    const dependencies = new Set<string>();
    const entries = Object.entries(parsed);
    for (let index = 0; index < entries.length; index += 1) {
      const [field, value] = entries[index]!;
      if (PackageManifest.dependencyFields.has(field)) {
        const fieldDependencies = PackageManifest.dependencyNames(value, field, path);
        PackageManifest.mergeDependencies(dependencies, fieldDependencies);
      }
    }
    return new PackageManifest(name, dependencies);
  }
}

class PandaTestDependencyBoundary {
  private static sourceFiles(directory: string): string[] {
    const files: string[] = [];
    const entries = readdirSync(directory, { 'withFileTypes': true });
    for (let index = 0; index < entries.length; index += 1) {
      const entry = entries[index]!;
      const path = join(directory, entry.name);
      if (entry.isDirectory()) {
        files.push(...PandaTestDependencyBoundary.sourceFiles(path));
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
    const packageName = specifier.startsWith('@')
      ? segments.slice(0, 2).join('/')
      : segments[0]!;
    return packageName;
  }

  public static undeclaredImports(): string[] {
    const rootManifest = PackageManifest.parse(join(ROOT_DIRECTORY, 'package.json'));
    const packageManifest = PackageManifest.parse(join(PANDA_DIRECTORY, 'package.json'));
    const declared = new Set([
      packageManifest.name,
      rootManifest.name,
      ...packageManifest.dependencies,
      ...rootManifest.dependencies
    ]);
    const violations = new Set<string>();
    const testDirectory = join(PANDA_DIRECTORY, 'tests');
    const sourceFiles = PandaTestDependencyBoundary.sourceFiles(testDirectory);
    for (let fileIndex = 0; fileIndex < sourceFiles.length; fileIndex += 1) {
      const path = sourceFiles[fileIndex]!;
      const imports = ts.preProcessFile(readFileSync(path, 'utf8'), true, true).importedFiles;
      for (let importIndex = 0; importIndex < imports.length; importIndex += 1) {
        const imported = imports[importIndex]!;
        const packageName = PandaTestDependencyBoundary.packageName(imported.fileName);
        if (packageName !== undefined && !declared.has(packageName)) {
          violations.add(`${relative(PANDA_DIRECTORY, path)} imports ${imported.fileName}`);
        }
      }
    }
    const result = [...violations].sort((left, right) => {
      const comparison = left.localeCompare(right);
      return comparison;
    });
    return result;
  }
}

await test('panda tests import only declared package dependencies', () => {
  assert.deepEqual(PandaTestDependencyBoundary.undeclaredImports(), []);
});
