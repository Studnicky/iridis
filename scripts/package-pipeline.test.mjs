import assert from 'node:assert/strict';
import {
  existsSync,
  lstatSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  symlinkSync,
  writeFileSync
} from 'node:fs';
import { createRequire, syncBuiltinESMExports } from 'node:module';
import { tmpdir } from 'node:os';
import { dirname, join, win32 } from 'node:path';
import { test } from 'node:test';

import { packagePipeline } from './package-pipeline.mjs';

const mutableFileSystem = createRequire(import.meta.url)('node:fs');

const DEFAULT_EXPORTS = {
  '.': {
    'types': './dist/index.d.ts',
    'import': './dist/index.js'
  },
  './model': {
    'types': './dist/model/index.d.ts',
    'import': './dist/model/index.js'
  }
};

const FIXTURE_REPOSITORY_URL = 'git+https://github.com/fixture/workspace.git';

const BIN_FILES = {
  'src/main.ts': '#!/usr/bin/env node\nconsole.log(\'fixture\');\n',
  'dist/main.js': '#!/usr/bin/env node\nconsole.log(\'fixture\');\n',
  'dist/main.js.map': '{}\n',
  'dist/main.d.ts': 'export {};\n',
  'dist/main.d.ts.map': '{}\n'
};

const writeFixtureFile = (rootDirectory, relativePath, contents) => {
  const destination = join(rootDirectory, relativePath);
  mkdirSync(dirname(destination), { 'recursive': true });
  writeFileSync(destination, contents);
};

const createPackage = (rootDirectory, directoryName = 'core', options = {}) => {
  const packageDirectory = join(rootDirectory, 'packages', directoryName);
  const packageFiles = {
    'README.md': `# ${directoryName}\n`,
    'src/index.ts': 'export * from \'./model/index.ts\';\n',
    'src/model/index.ts': 'export const model = true;\n',
    'dist/index.js': options.indexJavaScript
      ?? "import '@fixture/runtime';\nexport * from './model/index.js';\n",
    'dist/index.js.map': '{}\n',
    'dist/index.d.ts': options.indexDeclaration
      ?? "import type {} from '@fixture/types';\nexport * from './model/index.ts';\n",
    'dist/index.d.ts.map': '{}\n',
    'dist/model/index.js': 'export const model = true;\n',
    'dist/model/index.js.map': '{}\n',
    'dist/model/index.d.ts': 'export declare const model = true;\n',
    'dist/model/index.d.ts.map': '{}\n'
  };
  const omitted = new Set(options.omittedFiles ?? []);
  for (const [relativePath, contents] of Object.entries(packageFiles)) {
    if (!omitted.has(relativePath)) {
      writeFixtureFile(packageDirectory, relativePath, contents);
    }
  }
  for (const [relativePath, contents] of Object.entries(options.extraFiles ?? {})) {
    writeFixtureFile(packageDirectory, relativePath, contents);
  }

  const manifest = {
    'name': `@fixture/${directoryName}`,
    'version': '1.0.0',
    'description': 'Fixture package',
    'type': 'module',
    'sideEffects': false,
    'exports': DEFAULT_EXPORTS,
    'files': ['src'],
    'scripts': { 'unsafe': 'echo never-stage-this' },
    'author': 'Test',
    'license': 'MIT',
    'repository': {
      'type': 'git',
      'url': FIXTURE_REPOSITORY_URL,
      'directory': `packages/${directoryName}`
    },
    'publishConfig': {
      'registry': 'https://npm.pkg.github.com',
      'access': 'public'
    },
    'dependencies': {
      '@fixture/runtime': '^1.0.0',
      '@fixture/types': '^1.0.0'
    },
    'devDependencies': { 'fixture-only': '^1.0.0' },
    ...options.manifest
  };
  writeFixtureFile(
    packageDirectory,
    'package.json',
    `${JSON.stringify(manifest, null, 2)}\n`
  );
  return packageDirectory;
};

const createFixture = (options) => {
  const rootDirectory = mkdtempSync(join(tmpdir(), 'iridis-package-pipeline-'));
  writeFixtureFile(rootDirectory, 'README.md', '# Workspace\n');
  writeFixtureFile(rootDirectory, 'LICENSE', 'MIT\n');
  writeFixtureFile(rootDirectory, 'CHANGELOG.md', '# Changelog\n');
  writeFixtureFile(rootDirectory, 'package.json', `${JSON.stringify({
    'name': '@fixture/workspace',
    'private': true,
    'version': '1.0.0',
    'workspaces': ['packages/*']
  }, null, 2)}\n`);
  createPackage(rootDirectory, 'core', options);
  return rootDirectory;
};

const removeFixture = (rootDirectory) => {
  rmSync(rootDirectory, { 'force': true, 'recursive': true });
};

const assertFixtureFails = (options, expected) => {
  const rootDirectory = createFixture(options);
  try {
    assert.throws(() => packagePipeline.prepare(['core'], rootDirectory), expected);
  } finally {
    removeFixture(rootDirectory);
  }
};

await test('rejects absolute relative paths including Windows cross-drive results', () => {
  const crossDrive = win32.relative('C:\\workspace\\package', 'D:\\outside\\artifact.js');
  assert.equal(win32.isAbsolute(crossDrive), true);
  assert.equal(packagePipeline.containsRelativePath(crossDrive), false);
  assert.equal(packagePipeline.containsRelativePath('..\\outside\\artifact.js'), false);
  assert.equal(packagePipeline.containsRelativePath('dist\\index.js'), true);
});

await test('preserves json-tology optional peer metadata in the lockfile', () => {
  const repositoryRoot = join(import.meta.dirname, '..');
  const lockfile = readFileSync(join(repositoryRoot, 'pnpm-lock.yaml'), 'utf8');
  const installedManifest = JSON.parse(readFileSync(
    join(repositoryRoot, 'packages/core/node_modules/@studnicky/json-tology/package.json'),
    'utf8'
  ));
  const versionKey = `'@studnicky/json-tology@${installedManifest.version}':`;
  const blockStart = lockfile.indexOf(`  ${versionKey}`);
  assert.ok(blockStart !== -1, `missing lockfile entry for ${versionKey}`);
  const nextEntryStart = lockfile.indexOf('\n  \'', blockStart + versionKey.length);
  const block = lockfile.slice(blockStart, nextEntryStart === -1 ? undefined : nextEntryStart);

  assert.match(block, /peerDependencies:\n\s+eyereasoner: \^21\.1\.9/u);
  assert.match(block, /peerDependenciesMeta:\n\s+eyereasoner:\n\s+optional: true/u);
  assert.deepEqual(installedManifest.peerDependencies, { 'eyereasoner': '^21.1.9' });
  assert.equal(installedManifest.peerDependenciesMeta?.eyereasoner?.optional, true);
});

await test('stages validated artifacts, assets, and a minimal manifest', () => {
  const rootDirectory = createFixture();
  try {
    const [publishDirectory] = packagePipeline.prepare(['core'], rootDirectory);
    const publishManifest = JSON.parse(
      readFileSync(join(publishDirectory, 'package.json'), 'utf8')
    );
    assert.deepEqual(publishManifest.exports, DEFAULT_EXPORTS);
    assert.deepEqual(publishManifest.publishConfig, {
      'registry': 'https://npm.pkg.github.com',
      'access': 'public'
    });
    assert.deepEqual(publishManifest.repository, {
      'type': 'git',
      'url': FIXTURE_REPOSITORY_URL,
      'directory': 'packages/core'
    });
    assert.equal(publishManifest.main, './dist/index.js');
    assert.equal(publishManifest.module, './dist/index.js');
    assert.equal(publishManifest.types, './dist/index.d.ts');
    assert.deepEqual(publishManifest.files, [
      'dist',
      'README.md',
      'LICENSE',
      'CHANGELOG.md'
    ]);
    assert.equal(Object.hasOwn(publishManifest, 'scripts'), false);
    assert.equal(Object.hasOwn(publishManifest, 'devDependencies'), false);
    assert.equal(existsSync(join(publishDirectory, 'dist/model/index.js')), true);
    assert.equal(existsSync(join(publishDirectory, 'src/index.ts')), false);
    assert.equal(readFileSync(join(publishDirectory, 'LICENSE'), 'utf8'), 'MIT\n');
  } finally {
    removeFixture(rootDirectory);
  }
});

await test('selects public packages by directory or package name', () => {
  const rootDirectory = createFixture();
  try {
    createPackage(rootDirectory, 'extra');
    packagePipeline.prepare(['@fixture/core'], rootDirectory);
    assert.equal(existsSync(join(rootDirectory, 'packages/core/.publish')), true);
    assert.equal(existsSync(join(rootDirectory, 'packages/extra/.publish')), false);
  } finally {
    removeFixture(rootDirectory);
  }
});

await test('uses the root README when a package README is absent', () => {
  const rootDirectory = createFixture({ 'omittedFiles': ['README.md'] });
  try {
    const [publishDirectory] = packagePipeline.prepare(['core'], rootDirectory);
    assert.equal(
      readFileSync(join(publishDirectory, 'README.md'), 'utf8'),
      '# Workspace\n'
    );
  } finally {
    removeFixture(rootDirectory);
  }
});

await test('rejects raw and non-conditional exports', () => {
  assertFixtureFails(
    { 'manifest': { 'exports': { '.': './src/index.ts' } } },
    /unsupported export shape/u
  );
  assertFixtureFails(
    {
      'manifest': {
        'exports': {
          '.': { 'types': './src/index.d.ts', 'import': './dist/index.js' }
        }
      }
    },
    /invalid types target/u
  );
});

await test('rejects a missing root export', () => {
  assertFixtureFails(
    {
      'manifest': {
        'exports': {
          './model': DEFAULT_EXPORTS['./model']
        }
      }
    },
    /missing root export/u
  );
});

await test('rejects missing and extra export conditions', () => {
  assertFixtureFails(
    { 'manifest': { 'exports': { '.': { 'import': './dist/index.js' } } } },
    /missing types target/u
  );
  assertFixtureFails(
    {
      'manifest': {
        'exports': {
          '.': {
            'types': './dist/index.d.ts',
            'import': './dist/index.js',
            'require': './dist/index.cjs'
          }
        }
      }
    },
    /unsupported export conditions/u
  );
});

await test('rejects malformed and traversing export targets', () => {
  assertFixtureFails(
    {
      'manifest': {
        'exports': {
          '.': { 'types': './dist/index.ts', 'import': './dist/index.js' }
        }
      }
    },
    /invalid types target/u
  );
  assertFixtureFails(
    {
      'manifest': {
        'exports': {
          '.': { 'types': './dist/index.d.ts', 'import': './dist/..\/index.js' }
        }
      }
    },
    /invalid import target/u
  );
});

await test('rejects missing and extra build artifacts', () => {
  assertFixtureFails(
    { 'omittedFiles': ['dist/model/index.js.map'] },
    /missing build artifacts/u
  );
  assertFixtureFails(
    { 'extraFiles': { 'dist/extra.js': 'export {};\n' } },
    /extra build artifacts/u
  );
});

await test('rejects unresolved relative imports', () => {
  assertFixtureFails(
    { 'indexJavaScript': "export * from './missing.js';\n" },
    /unresolved relative import/u
  );
});

await test('rejects escaping relative imports', () => {
  assertFixtureFails(
    { 'indexJavaScript': "export * from '../outside.js';\n" },
    /escaping relative import/u
  );
});

await test('rejects undeclared runtime and declaration packages', () => {
  assertFixtureFails(
    { 'indexJavaScript': "import '@fixture/undeclared';\nexport {};\n" },
    /undeclared runtime package/u
  );
  assertFixtureFails(
    { 'indexDeclaration': "import type {} from '@fixture/undeclared';\nexport {};\n" },
    /undeclared declaration package/u
  );
});

await test('requires root publishing assets', () => {
  const rootDirectory = createFixture();
  try {
    rmSync(join(rootDirectory, 'LICENSE'));
    assert.throws(
      () => packagePipeline.prepare(['core'], rootDirectory),
      /missing root LICENSE/u
    );
  } finally {
    removeFixture(rootDirectory);
  }
});

await test('preserves the previous stage when validation fails', () => {
  const rootDirectory = createFixture({
    'extraFiles': { '.publish/marker.txt': 'previous stage\n' }
  });
  try {
    writeFixtureFile(rootDirectory, 'packages/core/dist/extra.js', 'export {};\n');
    assert.throws(
      () => packagePipeline.prepare(['core'], rootDirectory),
      /extra build artifacts/u
    );
    assert.equal(
      readFileSync(join(rootDirectory, 'packages/core/.publish/marker.txt'), 'utf8'),
      'previous stage\n'
    );
  } finally {
    removeFixture(rootDirectory);
  }
});

await test('rejects missing, unknown, and duplicate package selections', () => {
  const rootDirectory = createFixture();
  try {
    assert.throws(
      () => packagePipeline.prepare([], rootDirectory),
      /provide at least one package/u
    );
    assert.throws(
      () => packagePipeline.prepare(['unknown'], rootDirectory),
      /unknown public package/u
    );
    assert.throws(
      () => packagePipeline.prepare(['core', '@fixture/core'], rootDirectory),
      /contains duplicates/u
    );
  } finally {
    removeFixture(rootDirectory);
  }
});

await test('parses multiline imports and exports without a regex fail-open path', () => {
  assertFixtureFails(
    {
      'indexJavaScript': [
        'import {',
        '  missing',
        '} from',
        "  '@fixture/undeclared';",
        'export {};',
        ''
      ].join('\n')
    },
    /undeclared runtime package/u
  );
  assertFixtureFails(
    {
      'indexJavaScript': [
        'export {',
        '  missing',
        '} from',
        "  '@fixture/undeclared';",
        ''
      ].join('\n')
    },
    /undeclared runtime package/u
  );
  assertFixtureFails(
    { 'indexJavaScript': 'import {\n' },
    /invalid generated module/u
  );
});

await test('parses import type and declaration import-type nodes', () => {
  assertFixtureFails(
    {
      'indexDeclaration': [
        'import type {',
        '  Missing',
        '} from',
        "  '@fixture/undeclared';",
        'export {};',
        ''
      ].join('\n')
    },
    /undeclared declaration package/u
  );
  assertFixtureFails(
    {
      'indexDeclaration': [
        "export type Missing = import('@fixture/undeclared').Missing;",
        ''
      ].join('\n')
    },
    /undeclared declaration package/u
  );
});

await test('parses dynamic imports and rejects nonliteral targets', () => {
  assertFixtureFails(
    { 'indexJavaScript': "await import('@fixture/undeclared');\nexport {};\n" },
    /undeclared runtime package/u
  );
  assertFixtureFails(
    {
      'indexJavaScript': [
        "const packageName = '@fixture/runtime';",
        'await import(packageName);',
        'export {};',
        ''
      ].join('\n')
    },
    /nonliteral dynamic import/u
  );
  assertFixtureFails(
    {
      'indexJavaScript': [
        "const suffix = 'runtime';",
        'await import(`@fixture/${suffix}`);',
        'export {};',
        ''
      ].join('\n')
    },
    /nonliteral dynamic import/u
  );
});

await test('rejects unsupported source extensions and non-TypeScript assets', () => {
  for (const sourcePath of [
    'src/view.tsx',
    'src/module.mts',
    'src/module.cts',
    'src/types.d.ts',
    'src/schema.json'
  ]) {
    assertFixtureFails(
      { 'extraFiles': { [sourcePath]: 'export {};\n' } },
      /current policy accepts only \.ts sources/u
    );
  }
});

await test('excludes only explicit operational metadata directories from source policy', () => {
  const rootDirectory = createFixture({
    'extraFiles': {
      'src/.claude/session.json': '{}\n',
      'src/.orchestration/state.json': '{}\n'
    }
  });
  try {
    packagePipeline.prepare(['core'], rootDirectory);
    assert.equal(existsSync(join(rootDirectory, 'packages/core/.publish')), true);
  } finally {
    removeFixture(rootDirectory);
  }
  assertFixtureFails(
    { 'extraFiles': { 'src/.arbitrary/state.json': '{}\n' } },
    /current policy accepts only \.ts sources/u
  );
  assertFixtureFails(
    { 'extraFiles': { 'src/assets.json': '{}\n' } },
    /current policy accepts only \.ts sources/u
  );
});

await test('validates internal workspace ranges use the workspace protocol', () => {
  const invalidRoot = createFixture({
    'manifest': {
      'peerDependencies': { '@fixture/extra': '*' }
    }
  });
  try {
    createPackage(invalidRoot, 'extra');
    assert.throws(
      () => packagePipeline.prepare(['core'], invalidRoot),
      /incompatible internal dependency range.*expected workspace:\*/u
    );
  } finally {
    removeFixture(invalidRoot);
  }

  const invalidDependencyRoot = createFixture({
    'manifest': {
      'dependencies': {
        '@fixture/extra': '*',
        '@fixture/runtime': '^1.0.0',
        '@fixture/types': '^1.0.0'
      },
      'peerDependencies': { '@fixture/extra': 'workspace:*' }
    }
  });
  try {
    createPackage(invalidDependencyRoot, 'extra');
    assert.throws(
      () => packagePipeline.prepare(['core'], invalidDependencyRoot),
      /incompatible internal dependency range.*expected workspace:\*/u
    );
  } finally {
    removeFixture(invalidDependencyRoot);
  }

  const validRoot = createFixture({
    'manifest': {
      'peerDependencies': { '@fixture/extra': 'workspace:*' }
    }
  });
  try {
    createPackage(validRoot, 'extra');
    packagePipeline.prepare(['core'], validRoot);
    assert.equal(existsSync(join(validRoot, 'packages/core/.publish')), true);
  } finally {
    removeFixture(validRoot);
  }
});

await test('rewrites workspace:* internal dependencies to the caret-pinned workspace version', () => {
  const rootDirectory = createFixture({
    'manifest': {
      'peerDependencies': { '@fixture/extra': 'workspace:*' }
    }
  });
  try {
    createPackage(rootDirectory, 'extra');
    const [publishDirectory] = packagePipeline.prepare(['core'], rootDirectory);
    const publishManifest = JSON.parse(
      readFileSync(join(publishDirectory, 'package.json'), 'utf8')
    );
    assert.deepEqual(publishManifest.peerDependencies, { '@fixture/extra': '^1.0.0' });
    assert.deepEqual(publishManifest.dependencies, {
      '@fixture/runtime': '^1.0.0',
      '@fixture/types': '^1.0.0'
    });
  } finally {
    removeFixture(rootDirectory);
  }
});

await test('falls back to the package README-style root CHANGELOG when a package has none', () => {
  const rootDirectory = createFixture();
  try {
    const [publishDirectory] = packagePipeline.prepare(['core'], rootDirectory);
    assert.equal(
      readFileSync(join(publishDirectory, 'CHANGELOG.md'), 'utf8'),
      '# Changelog\n'
    );
  } finally {
    removeFixture(rootDirectory);
  }
});

await test('prefers a package-owned CHANGELOG over the root fallback', () => {
  const rootDirectory = createFixture({
    'extraFiles': { 'CHANGELOG.md': '# core changelog\n' }
  });
  try {
    const [publishDirectory] = packagePipeline.prepare(['core'], rootDirectory);
    assert.equal(
      readFileSync(join(publishDirectory, 'CHANGELOG.md'), 'utf8'),
      '# core changelog\n'
    );
  } finally {
    removeFixture(rootDirectory);
  }
});

await test('requires lockstep versions and consistent GitHub release metadata', () => {
  assertFixtureFails(
    { 'manifest': { 'version': '1.0.1' } },
    /package version mismatch.*expected 1\.0\.0/u
  );
  assertFixtureFails(
    { 'manifest': { 'publishConfig': undefined } },
    /invalid GitHub Packages publishConfig/u
  );
  assertFixtureFails(
    {
      'manifest': {
        'repository': {
          'type': 'git',
          'url': FIXTURE_REPOSITORY_URL,
          'directory': 'packages/other'
        }
      }
    },
    /invalid repository metadata/u
  );

  const inconsistentRoot = createFixture();
  try {
    createPackage(inconsistentRoot, 'extra', {
      'manifest': {
        'repository': {
          'type': 'git',
          'url': 'git+https://github.com/fixture/other.git',
          'directory': 'packages/extra'
        }
      }
    });
    assert.throws(
      () => packagePipeline.prepare(['core'], inconsistentRoot),
      /inconsistent repository URL/u
    );
  } finally {
    removeFixture(inconsistentRoot);
  }
});

await test('derives a deterministic dependency-first release order', () => {
  const rootDirectory = createFixture();
  try {
    createPackage(rootDirectory, 'plugin', {
      'manifest': {
        'dependencies': {
          '@fixture/core': '^1.0.0',
          '@fixture/runtime': '^1.0.0',
          '@fixture/types': '^1.0.0'
        }
      }
    });
    createPackage(rootDirectory, 'consumer', {
      'manifest': {
        'peerDependencies': { '@fixture/plugin': '^1.0.0' }
      }
    });
    assert.deepEqual(
      packagePipeline.releaseOrder(rootDirectory).map(({ manifest }) => manifest.name),
      ['@fixture/core', '@fixture/plugin', '@fixture/consumer']
    );
  } finally {
    removeFixture(rootDirectory);
  }
});

await test('stages exact source bytes and rejects content mutation during copying', () => {
  const rootDirectory = createFixture();
  try {
    const [publishDirectory] = packagePipeline.prepare(['core'], rootDirectory);
    for (const path of [
      'dist/index.js',
      'dist/index.d.ts',
      'dist/model/index.js.map',
      'README.md',
      'LICENSE',
      'CHANGELOG.md'
    ]) {
      const sourcePath = path === 'README.md'
        ? join(rootDirectory, 'packages/core', path)
        : path.startsWith('dist/')
          ? join(rootDirectory, 'packages/core', path)
          : join(rootDirectory, path);
      assert.deepEqual(readFileSync(join(publishDirectory, path)), readFileSync(sourcePath));
    }
  } finally {
    removeFixture(rootDirectory);
  }

  const mutationRoot = createFixture();
  const originalCopy = mutableFileSystem.cpSync;
  mutableFileSystem.cpSync = (source, destination, options) => {
    originalCopy(source, destination, options);
    if (destination.includes('.publish.next-') && destination.endsWith('/dist')) {
      writeFileSync(join(destination, 'index.js'), 'export {};\n');
    }
  };
  syncBuiltinESMExports();
  try {
    assert.throws(
      () => packagePipeline.prepare(['core'], mutationRoot),
      /staged bytes differ.*dist\/index\.js/u
    );
  } finally {
    mutableFileSystem.cpSync = originalCopy;
    syncBuiltinESMExports();
    removeFixture(mutationRoot);
  }
});

await test('preserves every prior stage when a later package fails validation', () => {
  const rootDirectory = createFixture({
    'extraFiles': { '.publish/marker.txt': 'core previous\n' }
  });
  try {
    createPackage(rootDirectory, 'extra', {
      'extraFiles': {
        '.publish/marker.txt': 'extra previous\n',
        'dist/unexpected.js': 'export {};\n'
      }
    });
    assert.throws(
      () => packagePipeline.prepare(['core', 'extra'], rootDirectory),
      /extra build artifacts/u
    );
    assert.equal(
      readFileSync(join(rootDirectory, 'packages/core/.publish/marker.txt'), 'utf8'),
      'core previous\n'
    );
    assert.equal(
      readFileSync(join(rootDirectory, 'packages/extra/.publish/marker.txt'), 'utf8'),
      'extra previous\n'
    );
  } finally {
    removeFixture(rootDirectory);
  }
});

await test('rolls back every replacement when a later atomic rename fails', () => {
  const rootDirectory = createFixture({
    'extraFiles': { '.publish/marker.txt': 'core previous\n' }
  });
  createPackage(rootDirectory, 'extra', {
    'extraFiles': { '.publish/marker.txt': 'extra previous\n' }
  });
  const originalRename = mutableFileSystem.renameSync;
  let stageRenameCount = 0;
  mutableFileSystem.renameSync = (source, destination) => {
    if (source.includes('.publish.next-')) {
      stageRenameCount += 1;
      if (stageRenameCount === 2) {
        throw new Error('injected second replacement failure');
      }
    }
    return originalRename(source, destination);
  };
  syncBuiltinESMExports();
  try {
    assert.throws(
      () => packagePipeline.prepare(['core', 'extra'], rootDirectory),
      /injected second replacement failure/u
    );
    assert.equal(
      readFileSync(join(rootDirectory, 'packages/core/.publish/marker.txt'), 'utf8'),
      'core previous\n'
    );
    assert.equal(
      readFileSync(join(rootDirectory, 'packages/extra/.publish/marker.txt'), 'utf8'),
      'extra previous\n'
    );
  } finally {
    mutableFileSystem.renameSync = originalRename;
    syncBuiltinESMExports();
    removeFixture(rootDirectory);
  }
});

await test('validates bin targets and sets executable mode in the stage', () => {
  const rootDirectory = createFixture({
    'extraFiles': BIN_FILES,
    'manifest': { 'bin': { 'fixture': './dist/main.js' } }
  });
  try {
    const sourceBin = join(rootDirectory, 'packages/core/dist/main.js');
    const [publishDirectory] = packagePipeline.prepare(['core'], rootDirectory);
    const stagedBin = join(publishDirectory, 'dist/main.js');
    assert.deepEqual(readFileSync(stagedBin), readFileSync(sourceBin));
    assert.equal(lstatSync(sourceBin).mode & 0o111, 0);
    assert.notEqual(lstatSync(stagedBin).mode & 0o111, 0);
  } finally {
    removeFixture(rootDirectory);
  }
});

await test('rejects raw, traversing, and missing bin targets', () => {
  assertFixtureFails(
    { 'manifest': { 'bin': { 'fixture': './src/main.ts' } } },
    /invalid bin target/u
  );
  assertFixtureFails(
    { 'manifest': { 'bin': { 'fixture': './dist\/..\/main.js' } } },
    /invalid bin target/u
  );
  assertFixtureFails(
    { 'manifest': { 'bin': { 'fixture': './dist/missing.js' } } },
    /missing bin artifact/u
  );
});

await test('rejects symlink package, source, dist, stage, and release-asset roots', () => {
  const packageRoot = createFixture();
  try {
    const linkedPackage = join(packageRoot, 'packages/linked');
    symlinkSync(join(packageRoot, 'packages/core'), linkedPackage, 'dir');
    assert.throws(
      () => packagePipeline.prepare(['core'], packageRoot),
      /symlink package root/u
    );
  } finally {
    removeFixture(packageRoot);
  }

  const sourceRoot = createFixture();
  try {
    const sourcePath = join(sourceRoot, 'packages/core/src');
    const outsideSource = join(sourceRoot, 'outside-source');
    rmSync(sourcePath, { 'recursive': true });
    mkdirSync(outsideSource);
    writeFixtureFile(outsideSource, 'index.ts', 'export {};\n');
    symlinkSync(outsideSource, sourcePath, 'dir');
    assert.throws(
      () => packagePipeline.prepare(['core'], sourceRoot),
      /symlink source root/u
    );
  } finally {
    removeFixture(sourceRoot);
  }

  const distRoot = createFixture();
  try {
    const distPath = join(distRoot, 'packages/core/dist');
    const outsideDist = join(distRoot, 'outside-dist');
    rmSync(distPath, { 'recursive': true });
    mkdirSync(outsideDist);
    symlinkSync(outsideDist, distPath, 'dir');
    assert.throws(
      () => packagePipeline.prepare(['core'], distRoot),
      /symlink dist root/u
    );
  } finally {
    removeFixture(distRoot);
  }

  const stageRoot = createFixture();
  try {
    const outsideStage = join(stageRoot, 'outside-stage');
    mkdirSync(outsideStage);
    symlinkSync(outsideStage, join(stageRoot, 'packages/core/.publish'), 'dir');
    assert.throws(
      () => packagePipeline.prepare(['core'], stageRoot),
      /symlink existing publish stage/u
    );
  } finally {
    removeFixture(stageRoot);
  }

  const assetRoot = createFixture();
  try {
    const licensePath = join(assetRoot, 'LICENSE');
    const outsideLicense = join(assetRoot, 'outside-license');
    rmSync(licensePath);
    writeFixtureFile(assetRoot, 'outside-license', 'MIT\n');
    symlinkSync(outsideLicense, licensePath, 'file');
    assert.throws(
      () => packagePipeline.prepare(['core'], assetRoot),
      /symlink root LICENSE/u
    );
  } finally {
    removeFixture(assetRoot);
  }
});
