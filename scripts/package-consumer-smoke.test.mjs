import assert from 'node:assert/strict';
import {
  chmodSync,
  existsSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  readdirSync,
  renameSync,
  rmSync,
  symlinkSync,
  writeFileSync
} from 'node:fs';
import { tmpdir } from 'node:os';
import { basename, dirname, join } from 'node:path';
import test from 'node:test';
import { gzipSync } from 'node:zlib';

import { Header } from 'tar';

import { packageConsumerSmoke } from './package-consumer-smoke.mjs';

const archiveEntries = [
  { 'content': '# fixture\n', 'path': 'package/README.md', 'type': 'File' },
  { 'content': 'MIT\n', 'path': 'package/LICENSE', 'type': 'File' },
  { 'content': '# changes\n', 'path': 'package/CHANGELOG.md', 'type': 'File' },
  {
    'content': '{"name":"@fixture/archive","version":"1.0.0","type":"module"}\n',
    'path': 'package/package.json',
    'type': 'File'
  },
  { 'content': 'export {};\n', 'path': 'package/dist/index.d.ts', 'type': 'File' },
  { 'content': 'export const ok = true;\n', 'path': 'package/dist/index.js', 'type': 'File' }
];

const writeArchive = (path, entries) => {
  const blocks = [];
  for (const entry of entries) {
    const content = Buffer.from(entry.content ?? '');
    const header = new Header({
      'gid': 0,
      'linkpath': entry.linkpath,
      'mode': entry.mode ?? 0o644,
      'mtime': new Date(0),
      'path': entry.path,
      'size': content.length,
      'type': entry.type,
      'uid': 0
    });
    const headerBlock = Buffer.alloc(512);
    if (header.encode(headerBlock)) {
      throw new Error(`fixture path requires unsupported PAX header: ${entry.path}`);
    }
    blocks.push(headerBlock);
    if (content.length > 0) {
      const contentBlock = Buffer.alloc(Math.ceil(content.length / 512) * 512);
      content.copy(contentBlock);
      blocks.push(contentBlock);
    }
  }
  blocks.push(Buffer.alloc(1024));
  writeFileSync(path, gzipSync(Buffer.concat(blocks)));
};

const writeStage = (directory, name = '@fixture/archive') => {
  mkdirSync(join(directory, 'dist'), { 'recursive': true });
  writeFileSync(join(directory, 'README.md'), '# fixture\n');
  writeFileSync(join(directory, 'LICENSE'), 'MIT\n');
  writeFileSync(join(directory, 'CHANGELOG.md'), '# changes\n');
  writeFileSync(join(directory, 'dist', 'index.d.ts'), 'export {};\n');
  writeFileSync(join(directory, 'dist', 'index.js'), 'export const ok = true;\n');
  writeFileSync(join(directory, 'package.json'), `${JSON.stringify({
    name,
    'version': '1.0.0',
    'type': 'module',
    'exports': {
      '.': {
        'types': './dist/index.d.ts',
        'import': './dist/index.js'
      }
    },
    'files': ['dist', 'README.md', 'LICENSE', 'CHANGELOG.md']
  }, null, 2)}\n`);
};

test('offline npm pack and positive archive extraction preserve validated stage bytes', async () => {
  await packageConsumerSmoke.withTemporaryDirectory('iridis-positive-test-', async (root) => {
    const stage = join(root, 'stage');
    const archives = join(root, 'archives');
    const cache = join(root, 'cache');
    const extracted = join(root, 'extracted');
    mkdirSync(archives);
    writeStage(stage);
    const archive = packageConsumerSmoke.packArchive(stage, archives, cache);
    assert.equal(existsSync(archive), true);
    await packageConsumerSmoke.extractArchive(archive, extracted, stage, root);
    assert.equal(
      readFileSync(join(extracted, 'dist', 'index.js'), 'utf8'),
      readFileSync(join(stage, 'dist', 'index.js'), 'utf8')
    );
  });
});

test('archive extraction is pinned to a private snapshot when the caller path is replaced', async () => {
  await packageConsumerSmoke.withTemporaryDirectory('iridis-archive-snapshot-test-', async (root) => {
    const archives = join(root, 'archives');
    const cache = join(root, 'cache');
    const replacement = join(root, 'replacement.tgz');
    const stage = join(root, 'stage');
    const extracted = join(root, 'extracted');
    mkdirSync(archives);
    writeStage(stage);
    const archive = packageConsumerSmoke.packArchive(stage, archives, cache);
    const originalArchive = readFileSync(archive);
    writeArchive(replacement, archiveEntries.map((entry) => {
      return entry.path === 'package/dist/index.js'
        ? { ...entry, 'content': 'export const replaced = true;\n' }
        : entry;
    }));

    const extraction = packageConsumerSmoke.extractArchive(archive, extracted, stage, root);
    renameSync(replacement, archive);
    await extraction;

    assert.equal(
      readFileSync(join(extracted, 'dist', 'index.js'), 'utf8'),
      'export const ok = true;\n'
    );
    assert.notDeepEqual(readFileSync(archive), originalArchive);
  });
});

test('archive snapshot setup cleans private directories when the caller archive is unreadable', async (context) => {
  const cases = [
    { 'archiveName': 'missing.tgz', 'create': false, 'name': 'missing archive' },
    { 'archiveName': 'archive-directory', 'create': true, 'name': 'directory instead of archive' }
  ];
  for (const fixture of cases) {
    await context.test(fixture.name, async () => {
      await packageConsumerSmoke.withTemporaryDirectory('iridis-snapshot-cleanup-test-', async (root) => {
        const archive = join(root, fixture.archiveName);
        const stage = join(root, 'stage');
        const extracted = join(root, 'extracted');
        writeStage(stage);
        if (fixture.create) {
          mkdirSync(archive);
        }
        await assert.rejects(
          packageConsumerSmoke.extractArchive(archive, extracted, stage, root)
        );
        assert.deepEqual(
          readdirSync(root).filter((entry) => entry.startsWith('.archive-snapshot-')),
          []
        );
        assert.equal(existsSync(extracted), false);
      });
    });
  }
});

test('real malicious archives are rejected before extraction', async (context) => {
  const cases = [
    {
      'entry': { 'linkpath': 'README.md', 'path': 'package/link', 'type': 'SymbolicLink' },
      'name': 'symbolic link',
      'pattern': /unsupported archive entry type SymbolicLink/u
    },
    {
      'entry': { 'linkpath': 'package/README.md', 'path': 'package/link', 'type': 'Link' },
      'name': 'hard link',
      'pattern': /unsupported archive entry type Link/u
    },
    {
      'entry': { 'path': 'package/device', 'type': 'CharacterDevice' },
      'name': 'device',
      'pattern': /unsupported archive entry type CharacterDevice/u
    },
    {
      'entry': { 'content': 'duplicate', 'path': 'package/README.md', 'type': 'File' },
      'name': 'duplicate',
      'pattern': /duplicate archive entry/u
    },
    {
      'entry': { 'content': 'escape', 'path': 'package/../escape', 'type': 'File' },
      'name': 'traversal',
      'pattern': /unsafe archive entry/u
    },
    {
      'entry': { 'content': 'escape', 'path': '/package/escape', 'type': 'File' },
      'name': 'absolute path',
      'pattern': /unsafe archive entry/u
    }
  ];
  for (const fixture of cases) {
    await context.test(fixture.name, async () => {
      await packageConsumerSmoke.withTemporaryDirectory('iridis-malicious-test-', async (root) => {
        const archive = join(root, 'malicious.tgz');
        const stage = join(root, 'stage');
        const extracted = join(root, 'extracted');
        writeStage(stage);
        writeArchive(archive, [...archiveEntries, fixture.entry]);
        await assert.rejects(
          packageConsumerSmoke.extractArchive(archive, extracted, stage, root),
          fixture.pattern
        );
        assert.equal(existsSync(extracted), false);
      });
    });
  }
});

test('archive path pivot is rejected before extraction', async () => {
  await packageConsumerSmoke.withTemporaryDirectory('iridis-pivot-test-', async (root) => {
    const archive = join(root, 'pivot.tgz');
    const stage = join(root, 'stage');
    const extracted = join(root, 'extracted');
    writeStage(stage);
    writeArchive(archive, [
      ...archiveEntries,
      { 'content': 'file pivot', 'path': 'package/pivot', 'type': 'File' },
      { 'content': 'escape', 'path': 'package/pivot/child', 'type': 'File' }
    ]);
    await assert.rejects(
      packageConsumerSmoke.extractArchive(archive, extracted, stage, root),
      /archive path pivots/u
    );
    assert.equal(existsSync(extracted), false);
  });
});

test('archive extraction rejects bytes that differ from the validated stage', async () => {
  await packageConsumerSmoke.withTemporaryDirectory('iridis-evidence-test-', async (root) => {
    const archive = join(root, 'evidence.tgz');
    const stage = join(root, 'stage');
    const extracted = join(root, 'extracted');
    writeStage(stage);
    writeArchive(archive, archiveEntries);
    await assert.rejects(
      packageConsumerSmoke.extractArchive(archive, extracted, stage, root),
      /archive bytes differ from validated stage/u
    );
    assert.equal(existsSync(extracted), false);
  });
});

test('archive extraction rejects pre-existing, linked, and escaping destinations', async (context) => {
  await context.test('pre-existing empty directory', async () => {
    await packageConsumerSmoke.withTemporaryDirectory('iridis-existing-target-test-', async (root) => {
      const archive = join(root, 'archive.tgz');
      const stage = join(root, 'stage');
      const extracted = join(root, 'extracted');
      writeStage(stage);
      writeArchive(archive, archiveEntries);
      mkdirSync(extracted);
      await assert.rejects(
        packageConsumerSmoke.extractArchive(archive, extracted, stage, root),
        /archive extraction target already exists/u
      );
    });
  });

  await context.test('destination symlink', async () => {
    await packageConsumerSmoke.withTemporaryDirectory('iridis-linked-target-test-', async (root) => {
      const archive = join(root, 'archive.tgz');
      const stage = join(root, 'stage');
      const outside = join(root, 'outside');
      const extracted = join(root, 'extracted');
      writeStage(stage);
      writeArchive(archive, archiveEntries);
      mkdirSync(outside);
      symlinkSync(outside, extracted, 'dir');
      await assert.rejects(
        packageConsumerSmoke.extractArchive(archive, extracted, stage, root),
        /archive extraction target already exists/u
      );
      assert.deepEqual(readdirSync(outside), []);
    });
  });

  await context.test('destination outside private root', async () => {
    await packageConsumerSmoke.withTemporaryDirectory('iridis-escaping-target-test-', async (root) => {
      const archive = join(root, 'archive.tgz');
      const stage = join(root, 'stage');
      const extracted = join(dirname(root), `${basename(root)}-escape`);
      writeStage(stage);
      writeArchive(archive, archiveEntries);
      await assert.rejects(
        packageConsumerSmoke.extractArchive(archive, extracted, stage, root),
        /archive extraction target escapes private root/u
      );
      assert.equal(existsSync(extracted), false);
    });
  });
});

test('direct external dependencies resolve from their declaring package and validate ranges', async (context) => {
  const writeDependency = (directory, version) => {
    mkdirSync(directory, { 'recursive': true });
    writeFileSync(join(directory, 'package.json'), JSON.stringify({
      'name': 'nested-version',
      version
    }));
    writeFileSync(join(directory, 'index.js'), `export const version = ${JSON.stringify(version)};\n`);
  };

  await context.test('package-local dependency wins over workspace root', async () => {
    await packageConsumerSmoke.withTemporaryDirectory('iridis-nested-version-test-', async (root) => {
      const workspace = join(root, 'workspace');
      const packageDirectory = join(workspace, 'packages', 'a');
      const packageA = join(root, 'extracted', 'a');
      const consumer = join(root, 'consumer');
      const manifest = {
        'dependencies': { 'nested-version': '^2.0.0' },
        'name': '@fixture/a',
        'version': '1.0.0'
      };
      mkdirSync(packageDirectory, { 'recursive': true });
      mkdirSync(packageA, { 'recursive': true });
      mkdirSync(consumer);
      writeFileSync(join(packageDirectory, 'package.json'), JSON.stringify(manifest));
      writeFileSync(join(packageA, 'package.json'), JSON.stringify(manifest));
      writeDependency(join(workspace, 'node_modules', 'nested-version'), '1.0.0');
      writeDependency(join(packageDirectory, 'node_modules', 'nested-version'), '2.1.0');
      const record = { 'directoryName': 'a', manifest, packageDirectory };
      packageConsumerSmoke.installTarget(
        record,
        new Map([[manifest.name, record]]),
        new Map([[manifest.name, packageA]]),
        consumer
      );
      const installed = JSON.parse(readFileSync(
        join(consumer, 'node_modules', 'nested-version', 'package.json'),
        'utf8'
      ));
      assert.equal(installed.version, '2.1.0');
    });
  });

  await context.test('package-local mismatch is rejected instead of replaced by a root match', async () => {
    await packageConsumerSmoke.withTemporaryDirectory('iridis-range-mismatch-test-', async (root) => {
      const workspace = join(root, 'workspace');
      const packageDirectory = join(workspace, 'packages', 'a');
      const packageA = join(root, 'extracted', 'a');
      const consumer = join(root, 'consumer');
      const manifest = {
        'dependencies': { 'nested-version': '^2.0.0' },
        'name': '@fixture/a',
        'version': '1.0.0'
      };
      mkdirSync(packageDirectory, { 'recursive': true });
      mkdirSync(packageA, { 'recursive': true });
      mkdirSync(consumer);
      writeFileSync(join(packageDirectory, 'package.json'), JSON.stringify(manifest));
      writeFileSync(join(packageA, 'package.json'), JSON.stringify(manifest));
      writeDependency(join(workspace, 'node_modules', 'nested-version'), '2.1.0');
      writeDependency(join(packageDirectory, 'node_modules', 'nested-version'), '1.0.0');
      const record = { 'directoryName': 'a', manifest, packageDirectory };
      assert.throws(
        () => packageConsumerSmoke.installTarget(
          record,
          new Map([[manifest.name, record]]),
          new Map([[manifest.name, packageA]]),
          consumer
        ),
        /installed nested-version@1\.0\.0 does not satisfy \^2\.0\.0/u
      );
    });
  });
});

test('canonical npm package validation accepts valid leading-hyphen names', async (context) => {
  const validNames = ['-foo', '@-scope/pkg', '@scope/-pkg', 'buffer'];
  for (const dependencyName of validNames) {
    await context.test(dependencyName, async () => {
      await packageConsumerSmoke.withTemporaryDirectory('iridis-valid-package-name-test-', async (root) => {
        const packageDirectory = join(root, 'workspace', 'packages', 'a');
        const dependencyDirectory = join(
          packageDirectory,
          'node_modules',
          ...dependencyName.split('/')
        );
        const packageA = join(root, 'extracted', 'a');
        const consumer = join(root, 'consumer');
        const manifest = {
          'dependencies': { [dependencyName]: '^1.0.0' },
          'name': '@fixture/a',
          'version': '1.0.0'
        };
        for (const directory of [dependencyDirectory, packageA, consumer]) {
          mkdirSync(directory, { 'recursive': true });
        }
        writeFileSync(join(packageA, 'package.json'), JSON.stringify(manifest));
        writeFileSync(join(dependencyDirectory, 'package.json'), JSON.stringify({
          'name': dependencyName,
          'version': '1.0.0'
        }));
        const record = { 'directoryName': 'a', manifest, packageDirectory };

        packageConsumerSmoke.installTarget(
          record,
          new Map([[manifest.name, record]]),
          new Map([[manifest.name, packageA]]),
          consumer
        );
        assert.equal(
          existsSync(join(consumer, 'node_modules', ...dependencyName.split('/'), 'package.json')),
          true
        );
      });
    });
  }
});

test('invalid dependency names are rejected before package destination construction', async (context) => {
  const invalidNames = [
    '../escape',
    '/absolute',
    '@scope',
    '@/package',
    '@scope/../escape',
    '@scope//package',
    '@scope/package/extra',
    '.hidden',
    'Uppercase',
    'node_modules',
    'favicon.ico',
    'a~b'
  ];

  for (const dependencyName of invalidNames) {
    await context.test(JSON.stringify(dependencyName), async () => {
      await packageConsumerSmoke.withTemporaryDirectory('iridis-package-name-test-', async (root) => {
        const packageDirectory = join(root, 'workspace', 'packages', 'a');
        const packageA = join(root, 'extracted', 'a');
        const consumer = join(root, 'consumer');
        const manifest = {
          'dependencies': { [dependencyName]: '^1.0.0' },
          'name': '@fixture/a',
          'version': '1.0.0'
        };
        for (const directory of [packageDirectory, packageA, consumer]) {
          mkdirSync(directory, { 'recursive': true });
        }
        writeFileSync(join(packageA, 'package.json'), JSON.stringify(manifest));
        const record = { 'directoryName': 'a', manifest, packageDirectory };

        assert.throws(
          () => packageConsumerSmoke.installTarget(
            record,
            new Map([[manifest.name, record]]),
            new Map([[manifest.name, packageA]]),
            consumer
          ),
          /invalid npm package name/u
        );
        assert.equal(existsSync(join(consumer, 'escape')), false);
        assert.equal(existsSync(join(root, 'escape')), false);
      });
    });
  }
});

test('the closest installed dependency candidate cannot fall through to an ancestor', async (context) => {
  const cases = [
    {
      'name': 'missing package.json',
      'pattern': /closest installed dependency candidate has no package\.json/u,
      'writeManifest': undefined
    },
    {
      'name': 'invalid package.json',
      'pattern': /closest installed dependency candidate has invalid package\.json/u,
      'writeManifest': '{'
    },
    {
      'name': 'name mismatch',
      'pattern': /closest installed dependency candidate has name other-name, expected closest-only/u,
      'writeManifest': JSON.stringify({ 'name': 'other-name', 'version': '2.0.0' })
    },
    {
      'name': 'version mismatch',
      'pattern': /installed closest-only@1\.0\.0 does not satisfy \^2\.0\.0/u,
      'writeManifest': JSON.stringify({ 'name': 'closest-only', 'version': '1.0.0' })
    }
  ];

  for (const fixture of cases) {
    await context.test(fixture.name, async () => {
      await packageConsumerSmoke.withTemporaryDirectory('iridis-closest-candidate-test-', async (root) => {
        const workspace = join(root, 'workspace');
        const packageDirectory = join(workspace, 'packages', 'a');
        const localDependency = join(packageDirectory, 'node_modules', 'closest-only');
        const ancestorDependency = join(workspace, 'node_modules', 'closest-only');
        const packageA = join(root, 'extracted', 'a');
        const consumer = join(root, 'consumer');
        const manifest = {
          'dependencies': { 'closest-only': '^2.0.0' },
          'name': '@fixture/a',
          'version': '1.0.0'
        };
        for (const directory of [localDependency, ancestorDependency, packageA, consumer]) {
          mkdirSync(directory, { 'recursive': true });
        }
        writeFileSync(join(packageA, 'package.json'), JSON.stringify(manifest));
        writeFileSync(join(ancestorDependency, 'package.json'), JSON.stringify({
          'name': 'closest-only',
          'version': '2.0.0'
        }));
        if (fixture.writeManifest !== undefined) {
          writeFileSync(join(localDependency, 'package.json'), fixture.writeManifest);
        }
        const record = { 'directoryName': 'a', manifest, packageDirectory };

        assert.throws(
          () => packageConsumerSmoke.installTarget(
            record,
            new Map([[manifest.name, record]]),
            new Map([[manifest.name, packageA]]),
            consumer
          ),
          fixture.pattern
        );
      });
    });
  }
});

test('internal archive dependency versions must satisfy declared ranges', async () => {
  await packageConsumerSmoke.withTemporaryDirectory('iridis-internal-range-test-', async (root) => {
    const packageA = join(root, 'extracted', 'a');
    const packageB = join(root, 'extracted', 'b');
    const packageADirectory = join(root, 'workspace', 'packages', 'a');
    const packageBDirectory = join(root, 'workspace', 'packages', 'b');
    const consumer = join(root, 'consumer');
    const manifestA = {
      'dependencies': { '@fixture/b': '^2.0.0' },
      'name': '@fixture/a',
      'version': '1.0.0'
    };
    const manifestB = { 'name': '@fixture/b', 'version': '1.0.0' };
    for (const directory of [packageA, packageB, packageADirectory, packageBDirectory, consumer]) {
      mkdirSync(directory, { 'recursive': true });
    }
    writeFileSync(join(packageA, 'package.json'), JSON.stringify(manifestA));
    writeFileSync(join(packageB, 'package.json'), JSON.stringify(manifestB));
    const recordA = {
      'directoryName': 'a',
      'manifest': manifestA,
      'packageDirectory': packageADirectory
    };
    const recordB = {
      'directoryName': 'b',
      'manifest': manifestB,
      'packageDirectory': packageBDirectory
    };
    assert.throws(
      () => packageConsumerSmoke.installTarget(
        recordA,
        new Map([[manifestA.name, recordA], [manifestB.name, recordB]]),
        new Map([[manifestA.name, packageA], [manifestB.name, packageB]]),
        consumer
      ),
      /installed @fixture\/b@1\.0\.0 does not satisfy \^2\.0\.0/u
    );
  });
});

test('dependency copying rejects a descendant symlink outside the package realpath', async () => {
  await packageConsumerSmoke.withTemporaryDirectory('iridis-copy-link-test-', async (root) => {
    const packageDirectory = join(root, 'workspace', 'packages', 'a');
    const dependencyDirectory = join(packageDirectory, 'node_modules', 'linked-dependency');
    const packageA = join(root, 'extracted', 'a');
    const outside = join(root, 'outside');
    const consumer = join(root, 'consumer');
    const manifest = {
      'dependencies': { 'linked-dependency': '^1.0.0' },
      'name': '@fixture/a',
      'version': '1.0.0'
    };
    for (const directory of [dependencyDirectory, packageA, outside, consumer]) {
      mkdirSync(directory, { 'recursive': true });
    }
    writeFileSync(join(packageA, 'package.json'), JSON.stringify(manifest));
    writeFileSync(join(dependencyDirectory, 'package.json'), JSON.stringify({
      'name': 'linked-dependency',
      'version': '1.0.0'
    }));
    writeFileSync(join(outside, 'secret.txt'), 'must not be copied');
    symlinkSync(outside, join(dependencyDirectory, 'payload'), 'dir');
    const record = { 'directoryName': 'a', manifest, packageDirectory };
    assert.throws(
      () => packageConsumerSmoke.installTarget(
        record,
        new Map([[manifest.name, record]]),
        new Map([[manifest.name, packageA]]),
        consumer
      ),
      /package copy link escapes source root/u
    );
    assert.equal(
      existsSync(join(consumer, 'node_modules', 'linked-dependency', 'payload', 'secret.txt')),
      false
    );
  });
});

test('target isolation does not mask an undeclared dependency from an unrelated package', async () => {
  await packageConsumerSmoke.withTemporaryDirectory('iridis-mask-test-', async (root) => {
    const workspace = join(root, 'workspace');
    const extracted = join(root, 'extracted');
    const consumer = join(root, 'consumer');
    const packageA = join(extracted, 'a');
    const packageB = join(extracted, 'b');
    const maskedDependency = join(workspace, 'node_modules', 'mask-only');
    for (const directory of [packageA, packageB, maskedDependency, consumer]) {
      mkdirSync(directory, { 'recursive': true });
    }
    writeFileSync(join(packageA, 'package.json'), JSON.stringify({
      'name': '@fixture/a',
      'version': '1.0.0',
      'type': 'module',
      'exports': './index.js'
    }));
    writeFileSync(join(packageA, 'index.js'), "import 'mask-only'; export const value = true;\n");
    writeFileSync(join(packageB, 'package.json'), JSON.stringify({
      'name': '@fixture/b',
      'version': '1.0.0',
      'dependencies': { 'mask-only': '1.0.0' }
    }));
    writeFileSync(join(maskedDependency, 'package.json'), JSON.stringify({
      'name': 'mask-only',
      'version': '1.0.0',
      'type': 'module',
      'exports': './index.js'
    }));
    writeFileSync(join(maskedDependency, 'index.js'), 'export const masked = true;\n');
    const records = [
      {
        'directoryName': 'a',
        'manifest': readFileSync(join(packageA, 'package.json'), 'utf8'),
        'packageDirectory': join(workspace, 'packages', 'a')
      },
      {
        'directoryName': 'b',
        'manifest': readFileSync(join(packageB, 'package.json'), 'utf8'),
        'packageDirectory': join(workspace, 'packages', 'b')
      }
    ].map((record) => ({ ...record, 'manifest': JSON.parse(record.manifest) }));
    mkdirSync(records[0].packageDirectory, { 'recursive': true });
    mkdirSync(records[1].packageDirectory, { 'recursive': true });
    const recordsByName = new Map(records.map((record) => [record.manifest.name, record]));
    const extractedByName = new Map([
      ['@fixture/a', packageA],
      ['@fixture/b', packageB]
    ]);
    packageConsumerSmoke.installTarget(
      records[0],
      recordsByName,
      extractedByName,
      consumer
    );
    assert.equal(existsSync(join(consumer, 'node_modules', 'mask-only')), false);
    writeFileSync(join(consumer, 'package.json'), '{"type":"module"}\n');
    writeFileSync(join(consumer, 'consumer.mjs'), "import '@fixture/a';\n");
    assert.throws(
      () => packageConsumerSmoke.runCommand(process.execPath, ['consumer.mjs'], {
        'cwd': consumer
      }),
      /Cannot find package 'mask-only'/u
    );
  });
});

test('type and runtime resolution both reject an ancestor node_modules outside the consumer root', async () => {
  await packageConsumerSmoke.withTemporaryDirectory('iridis-ancestor-resolution-test-', async (root) => {
    const ancestor = join(root, 'outside-workspace');
    const consumer = join(ancestor, 'consumer');
    const dependency = join(ancestor, 'node_modules', 'ancestor-only');
    for (const directory of [consumer, dependency]) {
      mkdirSync(directory, { 'recursive': true });
    }
    writeFileSync(join(dependency, 'package.json'), JSON.stringify({
      'exports': {
        '.': {
          'import': './index.js',
          'types': './index.d.ts'
        }
      },
      'name': 'ancestor-only',
      'type': 'module',
      'version': '1.0.0'
    }));
    writeFileSync(join(dependency, 'index.d.ts'), 'export declare const escaped: true;\n');
    writeFileSync(join(dependency, 'index.js'), 'export const escaped = true;\n');
    const typescript = join(process.cwd(), 'node_modules', 'typescript', 'bin', 'tsc');

    assert.throws(
      () => packageConsumerSmoke.verifyConsumer(consumer, ['ancestor-only'], typescript),
      (error) => {
        if (!(error instanceof Error)) {
          return false;
        }
        assert.match(error.message, /TypeScript: .*resolution escaped isolated consumer root/su);
        assert.match(error.message, /Runtime: .*runtime resolution escaped isolated root/su);
        return true;
      }
    );
  });
});

test('TypeScript isolation rejects triple-slash path escapes while allowing local types and libs', async () => {
  await packageConsumerSmoke.withTemporaryDirectory('iridis-reference-resolution-test-', async (root) => {
    const consumer = join(root, 'consumer');
    const dependency = join(consumer, 'node_modules', 'reference-host');
    const localTypes = join(consumer, 'node_modules', '@types', 'local-types');
    const outsideDeclaration = join(root, 'outside.d.ts');
    for (const directory of [consumer, dependency, localTypes]) {
      mkdirSync(directory, { 'recursive': true });
    }
    writeFileSync(join(dependency, 'package.json'), JSON.stringify({
      'exports': {
        '.': {
          'import': './index.js',
          'types': './index.d.ts'
        }
      },
      'name': 'reference-host',
      'type': 'module',
      'version': '1.0.0'
    }));
    writeFileSync(
      join(dependency, 'index.d.ts'),
      [
        '/// <reference lib="dom" />',
        '/// <reference types="local-types" />',
        '/// <reference path="../../../outside.d.ts" />',
        'export declare const referenceHost: true;',
        ''
      ].join('\n')
    );
    writeFileSync(join(dependency, 'index.js'), 'export const referenceHost = true;\n');
    writeFileSync(join(localTypes, 'package.json'), JSON.stringify({
      'name': '@types/local-types',
      'types': './index.d.ts',
      'version': '1.0.0'
    }));
    writeFileSync(join(localTypes, 'index.d.ts'), 'declare const localType: true;\n');
    writeFileSync(outsideDeclaration, 'declare const escapedReference: true;\n');
    const typescript = join(process.cwd(), 'node_modules', 'typescript', 'bin', 'tsc');

    assert.throws(
      () => packageConsumerSmoke.verifyConsumer(consumer, ['reference-host'], typescript),
      (error) => {
        if (!(error instanceof Error)) {
          return false;
        }
        assert.match(error.message, /TypeScript: .*resolution escaped isolated consumer root/su);
        assert.doesNotMatch(error.message, /Runtime:/u);
        return true;
      }
    );
  });
});

test('command timeout terminates a stalled child', () => {
  assert.throws(
    () => packageConsumerSmoke.runCommand(
      process.execPath,
      ['-e', 'setInterval(() => {}, 1000)'],
      { 'timeout': 25 }
    ),
    /timed out after 25ms/u
  );
});

test('temporary directory cleanup runs after failure', async () => {
  let createdDirectory;
  await assert.rejects(
    packageConsumerSmoke.withTemporaryDirectory('iridis-cleanup-test-', async (directory) => {
      createdDirectory = directory;
      writeFileSync(join(directory, 'evidence'), 'temporary');
      throw new Error('fixture failure');
    }),
    /fixture failure/u
  );
  assert.equal(typeof createdDirectory, 'string');
  assert.equal(existsSync(createdDirectory), false);
});

test('CLI validation uses Node, checks the shebang, and accepts the usage contract', async () => {
  await packageConsumerSmoke.withTemporaryDirectory('iridis-cli-test-', async (root) => {
    const nodeModules = join(root, 'node_modules');
    const installed = join(nodeModules, '@fixture', 'cli');
    const executable = join(installed, 'dist', 'main.js');
    mkdirSync(join(installed, 'dist'), { 'recursive': true });
    writeFileSync(join(installed, 'package.json'), JSON.stringify({
      'name': '@fixture/cli',
      'type': 'module',
      'bin': { 'iridis': './dist/main.js' }
    }));
    writeFileSync(
      executable,
      "#!/usr/bin/env node\nprocess.stderr.write('Usage: fixture <config>\\n'); process.exit(1);\n"
    );
    if (process.platform !== 'win32') {
      chmodSync(executable, 0o755);
    }
    assert.equal(
      packageConsumerSmoke.verifyCli(
        nodeModules,
        { 'manifest': { 'name': '@fixture/cli' } },
        root
      ),
      './dist/main.js'
    );
  });
});

test('package layout validation rejects a missing export target', () => {
  const root = mkdtempSync(join(tmpdir(), 'iridis-layout-test-'));
  try {
    writeStage(root);
    rmSync(join(root, 'dist', 'index.js'));
    assert.throws(
      () => packageConsumerSmoke.validatePackageLayout(root, {
        'name': '@fixture/archive',
        'exports': {
          '.': {
            'types': './dist/index.d.ts',
            'import': './dist/index.js'
          }
        }
      }, 2),
      /missing import target/u
    );
  } finally {
    rmSync(root, { 'force': true, 'recursive': true });
  }
});

test('total validation rejects incomplete archive coverage', () => {
  assert.throws(
    () => packageConsumerSmoke.validateTotals({
      'archives': 17,
      'artifacts': 1284,
      'exports': 42,
      'packages': 18,
      'sources': 321
    }),
    /expected archives=18, found 17/u
  );
});
