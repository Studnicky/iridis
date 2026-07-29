import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { mkdirSync, mkdtempSync, readFileSync, readdirSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { test } from 'node:test';

import { packagePublisher } from './package-publish.mjs';

const VERSION = '1.2.3';
const REPOSITORY_URL = 'git+https://github.com/fixture/workspace.git';
const BUILD_SCRIPT_ALLOWLIST = [
  '@parcel/watcher',
  'better-sqlite3',
  'esbuild',
  'fsevents',
  'unrs-resolver',
  'vue-demi'
];
const WORKSPACE_ROOT = join(import.meta.dirname, '..');
const WORKSPACE_MANIFEST = JSON.parse(readFileSync(
  join(WORKSPACE_ROOT, 'package.json'),
  'utf8'
));
const PACKAGE_MANIFESTS = readdirSync(join(WORKSPACE_ROOT, 'packages'), { 'withFileTypes': true })
  .filter((entry) => entry.isDirectory())
  .map((entry) => {
    const relativePath = join('packages', entry.name, 'package.json');
    const manifest = JSON.parse(readFileSync(join(WORKSPACE_ROOT, relativePath), 'utf8'));
    return { manifest, relativePath };
  });

const runCli = (arguments_, environment = {}) => {
  const inheritedEnvironment = Object.fromEntries(
    Object.entries(process.env).filter(([name]) => name !== 'NODE_AUTH_TOKEN')
  );
  return spawnSync(process.execPath, [
    join(import.meta.dirname, 'package-publish.mjs'),
    ...arguments_
  ], {
    'cwd': join(import.meta.dirname, '..'),
    'encoding': 'utf8',
    'env': { ...inheritedEnvironment, ...environment },
    'stdio': ['ignore', 'pipe', 'pipe'],
    'windowsHide': true
  });
};

const digest = (algorithm, contents) => {
  return `${algorithm}-${createHash(algorithm).update(contents).digest('base64')}`;
};

const writeFixtureFile = (rootDirectory, relativePath, contents) => {
  const destination = join(rootDirectory, relativePath);
  mkdirSync(dirname(destination), { 'recursive': true });
  writeFileSync(destination, contents);
};

const manifestFor = (directoryName, dependencies = {}) => {
  return {
    'name': `@fixture/${directoryName}`,
    'version': VERSION,
    'type': 'module',
    'repository': {
      'type': 'git',
      'url': REPOSITORY_URL,
      'directory': `packages/${directoryName}`
    },
    'publishConfig': {
      'registry': 'https://npm.pkg.github.com',
      'access': 'public'
    },
    dependencies
  };
};

const createPackage = (rootDirectory, directoryName, dependencies = {}) => {
  const manifest = manifestFor(directoryName, dependencies);
  const contents = `${JSON.stringify(manifest, null, 2)}\n`;
  writeFixtureFile(rootDirectory, `packages/${directoryName}/package.json`, contents);
  writeFixtureFile(rootDirectory, `packages/${directoryName}/.publish/package.json`, contents);
};

const createFixture = () => {
  const rootDirectory = mkdtempSync(join(tmpdir(), 'iridis-package-publish-'));
  writeFixtureFile(rootDirectory, 'package.json', `${JSON.stringify({
    'name': '@fixture/workspace',
    'private': true,
    'version': VERSION,
    'workspaces': ['packages/*']
  }, null, 2)}\n`);
  createPackage(rootDirectory, 'core');
  createPackage(rootDirectory, 'plugin', { '@fixture/core': `^${VERSION}` });
  createPackage(rootDirectory, 'cli', { '@fixture/plugin': `^${VERSION}` });
  return rootDirectory;
};

const createBundle = (rootDirectory) => {
  const bundleDirectory = join(rootDirectory, 'release-bundle');
  const body = Buffer.from('# Fixture release\n\nComplete release notes.\n');
  const packages = ['core', 'plugin', 'cli'].map((directoryName) => {
    const contents = Buffer.from(`archive:${directoryName}:${VERSION}\n`);
    const archive = `packages/fixture-${directoryName}-${VERSION}.tgz`;
    writeFixtureFile(bundleDirectory, archive, contents);
    return {
      archive,
      'integrity': digest('sha512', contents),
      'name': `@fixture/${directoryName}`,
      'version': VERSION
    };
  });
  writeFixtureFile(bundleDirectory, 'release-body.md', body);
  writeFixtureFile(bundleDirectory, 'release-plan.json', `${JSON.stringify({
    'packageCount': packages.length,
    packages,
    'releaseBody': {
      'integrity': digest('sha256', body),
      'path': 'release-body.md'
    },
    'schemaVersion': 1,
    'version': VERSION
  }, null, 2)}\n`);
  return { bundleDirectory, packages };
};

class FixturePackager {
  pack(packageRecord, archivesDirectory) {
    const archive = join(archivesDirectory, `${packageRecord.directoryName}.tgz`);
    writeFileSync(archive, `packed:${packageRecord.name}:${packageRecord.version}\n`);
    return archive;
  }
}

class RecordingPublisher {
  constructor({ existing = new Map(), failingPublish, failingQuery } = {}) {
    this.existing = new Map(existing);
    this.failingPublish = failingPublish;
    this.failingQuery = failingQuery;
    this.publishCalls = [];
    this.queryCalls = [];
  }

  integrityFor(packageRecord) {
    this.queryCalls.push(packageRecord.name);
    if (packageRecord.name === this.failingQuery) {
      throw new Error(`injected query failure for ${packageRecord.name}`);
    }
    return this.existing.get(packageRecord.name);
  }

  publish(packageRecord) {
    this.publishCalls.push(packageRecord.name);
    if (packageRecord.name === this.failingPublish) {
      throw new Error(`injected publish failure for ${packageRecord.name}`);
    }
    this.existing.set(packageRecord.name, packageRecord.integrity);
  }
}

await test('CLI accepts the canonical manifest-verification arguments', () => {
  const result = runCli([
    '--verify-manifests',
    '--expected-version',
    WORKSPACE_MANIFEST.version
  ]);
  assert.equal(result.status, 0, result.stderr);
  assert.deepEqual(JSON.parse(result.stdout), { 'verifiedManifests': 18 });
});

await test('CLI rejects missing canonical publish-bundle arguments before publication', () => {
  const missingVersion = runCli(['--publish-bundle']);
  assert.equal(missingVersion.status, 1);
  assert.match(missingVersion.stderr, /provide --expected-version VALUE exactly once/u);

  const missingBundle = runCli([
    '--publish-bundle',
    '--expected-version',
    WORKSPACE_MANIFEST.version
  ], { 'NODE_AUTH_TOKEN': 'fixture-token' });
  assert.equal(missingBundle.status, 1);
  assert.match(missingBundle.stderr, /provide --bundle VALUE exactly once/u);
});

await test('CLI recognizes complete publish-bundle arguments without invoking a registry', () => {
  const result = runCli([
    '--publish-bundle',
    '--expected-version',
    WORKSPACE_MANIFEST.version,
    '--bundle',
    'release-bundle'
  ]);
  assert.equal(result.status, 1);
  assert.match(result.stderr, /NODE_AUTH_TOKEN is required/u);
  assert.doesNotMatch(result.stderr, /provide --/u);
});

await test('CLI and all workspace manifests expose no direct-publication bypass', () => {
  const result = runCli([
    '--publish',
    '--expected-version',
    WORKSPACE_MANIFEST.version,
    '--bundle',
    'release-bundle'
  ], { 'NODE_AUTH_TOKEN': 'fixture-token' });
  assert.equal(result.status, 1);
  assert.match(result.stderr, /select exactly one release operation/u);

  assert.equal(PACKAGE_MANIFESTS.length, 19);
  const manifests = [
    { 'manifest': WORKSPACE_MANIFEST, 'relativePath': 'package.json' },
    ...PACKAGE_MANIFESTS
  ];
  for (const { manifest, relativePath } of manifests) {
    const scripts = manifest.scripts ?? {};
    assert.equal(Object.hasOwn(scripts, 'packages:publish:github'), false, relativePath);
    assert.equal(Object.hasOwn(scripts, 'publish:github'), false, relativePath);
    for (const [scriptName, command] of Object.entries(scripts)) {
      if (typeof command !== 'string' || !/\bnpm\s+publish\b/u.test(command)) { continue; }
      assert.match(
        command,
        /\bnpm\s+publish\b[^\n]*\s--dry-run(?:\s|$)/u,
        `${relativePath} script ${scriptName} invokes npm publish without --dry-run`
      );
    }
  }
});

await test('root README package inventory matches the enforced consumer smoke constants', () => {
  const readme = readFileSync(join(import.meta.dirname, '../README.md'), 'utf8');
  const smoke = readFileSync(join(import.meta.dirname, 'package-consumer-smoke.mjs'), 'utf8');
  const sourceMatch = smoke.match(/const EXPECTED_SOURCES = (\d+);/u);
  const artifactMatch = smoke.match(/const EXPECTED_ARTIFACTS = (\d+);/u);
  assert.ok(sourceMatch !== null);
  assert.ok(artifactMatch !== null);
  const sources = Number(sourceMatch[1]);
  const artifacts = Number(artifactMatch[1]);
  assert.equal(
    readme.includes(
      `emits ${artifacts.toLocaleString('en-US')} artifacts from ${sources} TypeScript sources`
    ),
    true
  );
  assert.doesNotMatch(readme, /1,284 artifacts|321 TypeScript sources/u);
});

await test('root manifest pins the complete build-script allowlist without wildcards', () => {
  assert.deepEqual(WORKSPACE_MANIFEST.pnpm?.onlyBuiltDependencies, BUILD_SCRIPT_ALLOWLIST);
  assert.equal(
    WORKSPACE_MANIFEST.pnpm.onlyBuiltDependencies.every((entry) => {
      return /^(?:@[^/*]+\/[^@*]+|[^@*]+)$/u.test(entry);
    }),
    true
  );
});

await test('plans every staged package in dependency-first order', () => {
  const rootDirectory = createFixture();
  try {
    assert.deepEqual(
      packagePublisher.plan(VERSION, rootDirectory, 3).map(({ name }) => name),
      ['@fixture/core', '@fixture/plugin', '@fixture/cli']
    );
  } finally {
    rmSync(rootDirectory, { 'force': true, 'recursive': true });
  }
});

await test('rejects workspace, count, source, and staged-manifest drift before publication', () => {
  const rootDirectory = createFixture();
  try {
    assert.throws(
      () => packagePublisher.plan(VERSION, rootDirectory, 18),
      /expected 18 public packages, found 3/u
    );
    assert.throws(
      () => packagePublisher.plan('1.2.4', rootDirectory, 3),
      /workspace manifest mismatch.*expected 1\.2\.4/u
    );
    const sourceManifest = manifestFor('core');
    sourceManifest.version = '1.2.2';
    writeFixtureFile(
      rootDirectory,
      'packages/core/package.json',
      `${JSON.stringify(sourceManifest, null, 2)}\n`
    );
    assert.throws(
      () => packagePublisher.plan(VERSION, rootDirectory, 3),
      /package version mismatch.*expected 1\.2\.3/u
    );
    writeFixtureFile(
      rootDirectory,
      'packages/core/package.json',
      `${JSON.stringify(manifestFor('core'), null, 2)}\n`
    );
    const invalidStage = manifestFor('plugin', { '@fixture/core': `^${VERSION}` });
    invalidStage.version = '1.2.2';
    writeFixtureFile(
      rootDirectory,
      'packages/plugin/.publish/package.json',
      `${JSON.stringify(invalidStage, null, 2)}\n`
    );
    assert.throws(
      () => packagePublisher.plan(VERSION, rootDirectory, 3),
      /staged manifest mismatch/u
    );
  } finally {
    rmSync(rootDirectory, { 'force': true, 'recursive': true });
  }
});

await test('prepares dependency-ordered archives and binds the complete release body by digest', () => {
  const rootDirectory = createFixture();
  const releaseBodyPath = join(rootDirectory, 'body.md');
  const bundleDirectory = join(rootDirectory, 'bundle');
  writeFileSync(releaseBodyPath, '# Complete release\n');
  try {
    const packages = packagePublisher.prepareBundle(
      VERSION,
      releaseBodyPath,
      bundleDirectory,
      rootDirectory,
      new FixturePackager(),
      3
    );
    assert.deepEqual(
      packages.map(({ name }) => name),
      ['@fixture/core', '@fixture/plugin', '@fixture/cli']
    );
    const loaded = packagePublisher.loadBundle(VERSION, bundleDirectory, 3);
    assert.deepEqual(
      loaded.packages.map(({ name }) => name),
      ['@fixture/core', '@fixture/plugin', '@fixture/cli']
    );
    assert.equal(readFileSync(loaded.releaseBody, 'utf8'), '# Complete release\n');
  } finally {
    rmSync(rootDirectory, { 'force': true, 'recursive': true });
  }
});

await test('full rerun skips all packages only when every registry integrity matches', () => {
  const rootDirectory = mkdtempSync(join(tmpdir(), 'iridis-package-rerun-'));
  const { bundleDirectory, packages } = createBundle(rootDirectory);
  const publisher = new RecordingPublisher({
    'existing': new Map(packages.map((packageRecord) => {
      return [packageRecord.name, packageRecord.integrity];
    }))
  });
  try {
    const result = packagePublisher.publishBundle(VERSION, bundleDirectory, publisher, 3);
    assert.deepEqual(result.published, []);
    assert.deepEqual(result.skipped, ['@fixture/core', '@fixture/plugin', '@fixture/cli']);
    assert.deepEqual(result.verified, ['@fixture/core', '@fixture/plugin', '@fixture/cli']);
    assert.deepEqual(publisher.publishCalls, []);
  } finally {
    rmSync(rootDirectory, { 'force': true, 'recursive': true });
  }
});

await test('partial resume skips matching versions and publishes missing packages dependency-first', () => {
  const rootDirectory = mkdtempSync(join(tmpdir(), 'iridis-package-resume-'));
  const { bundleDirectory, packages } = createBundle(rootDirectory);
  const publisher = new RecordingPublisher({
    'existing': new Map([[packages[0].name, packages[0].integrity]])
  });
  try {
    const result = packagePublisher.publishBundle(VERSION, bundleDirectory, publisher, 3);
    assert.deepEqual(result.skipped, ['@fixture/core']);
    assert.deepEqual(result.published, ['@fixture/plugin', '@fixture/cli']);
    assert.deepEqual(publisher.publishCalls, ['@fixture/plugin', '@fixture/cli']);
  } finally {
    rmSync(rootDirectory, { 'force': true, 'recursive': true });
  }
});

await test('registry integrity mismatch fails closed before any package publication', () => {
  const rootDirectory = mkdtempSync(join(tmpdir(), 'iridis-package-mismatch-'));
  const { bundleDirectory } = createBundle(rootDirectory);
  const publisher = new RecordingPublisher({
    'existing': new Map([['@fixture/plugin', 'sha512-registry-mismatch']])
  });
  try {
    assert.throws(
      () => packagePublisher.publishBundle(VERSION, bundleDirectory, publisher, 3),
      /registry integrity mismatch for @fixture\/plugin@1\.2\.3/u
    );
    assert.deepEqual(publisher.publishCalls, []);
  } finally {
    rmSync(rootDirectory, { 'force': true, 'recursive': true });
  }
});

await test('registry query failure aborts preflight before any package publication', () => {
  const rootDirectory = mkdtempSync(join(tmpdir(), 'iridis-package-query-failure-'));
  const { bundleDirectory } = createBundle(rootDirectory);
  const publisher = new RecordingPublisher({ 'failingQuery': '@fixture/plugin' });
  try {
    assert.throws(
      () => packagePublisher.publishBundle(VERSION, bundleDirectory, publisher, 3),
      /injected query failure/u
    );
    assert.deepEqual(publisher.publishCalls, []);
  } finally {
    rmSync(rootDirectory, { 'force': true, 'recursive': true });
  }
});

await test('publish failure stops dependency-ordered publication immediately', () => {
  const rootDirectory = mkdtempSync(join(tmpdir(), 'iridis-package-publish-failure-'));
  const { bundleDirectory, packages } = createBundle(rootDirectory);
  const publisher = new RecordingPublisher({
    'existing': new Map([[packages[0].name, packages[0].integrity]]),
    'failingPublish': '@fixture/plugin'
  });
  try {
    assert.throws(
      () => packagePublisher.publishBundle(VERSION, bundleDirectory, publisher, 3),
      /injected publish failure/u
    );
    assert.deepEqual(publisher.publishCalls, ['@fixture/plugin']);
  } finally {
    rmSync(rootDirectory, { 'force': true, 'recursive': true });
  }
});

await test('release body integrity is validated before any registry query or publish', () => {
  const rootDirectory = mkdtempSync(join(tmpdir(), 'iridis-package-body-failure-'));
  const { bundleDirectory } = createBundle(rootDirectory);
  const publisher = new RecordingPublisher();
  writeFileSync(join(bundleDirectory, 'release-body.md'), '# Replaced body\n');
  try {
    assert.throws(
      () => packagePublisher.publishBundle(VERSION, bundleDirectory, publisher, 3),
      /release body integrity mismatch/u
    );
    assert.deepEqual(publisher.queryCalls, []);
    assert.deepEqual(publisher.publishCalls, []);
  } finally {
    rmSync(rootDirectory, { 'force': true, 'recursive': true });
  }
});

await test('release workflow extracts only the literal version section and stops at its boundary', () => {
  const workflow = readFileSync(
    join(import.meta.dirname, '../.github/workflows/release.yml'),
    'utf8'
  );
  const programMatch = workflow.match(
    /awk -v v="\$RELEASE_VERSION" '\n([\s\S]*?)\n\s+' packages\/core\/CHANGELOG\.md > release-section\.md/u
  );
  assert.ok(programMatch !== null);

  const rootDirectory = mkdtempSync(join(tmpdir(), 'iridis-release-changelog-'));
  const changelogPath = join(rootDirectory, 'CHANGELOG.md');
  writeFileSync(changelogPath, [
    '## 0.11.0-rc.1',
    '',
    'Adversarial section.',
    '',
    '## 0.11.0',
    '',
    'Literal release section.',
    '',
    '## 0.10.0',
    '',
    'Following release section.',
    ''
  ].join('\n'));
  try {
    const result = spawnSync('awk', [
      '-v',
      'v=0.11.0',
      programMatch[1],
      changelogPath
    ], {
      'encoding': 'utf8',
      'stdio': ['ignore', 'pipe', 'pipe'],
      'windowsHide': true
    });
    assert.equal(result.status, 0, result.stderr);
    assert.equal(result.stdout, '\nLiteral release section.\n\n');
    assert.doesNotMatch(result.stdout, /Adversarial|Following/u);
  } finally {
    rmSync(rootDirectory, { 'force': true, 'recursive': true });
  }
});

await test('release workflow isolates read-only preparation from write-only publication', () => {
  const workflow = readFileSync(
    join(import.meta.dirname, '../.github/workflows/release.yml'),
    'utf8'
  );
  assert.match(workflow, /prepare:\n\s+permissions:\n\s+contents: read\n\s+packages: read/u);
  assert.match(workflow, /publish:\n\s+needs: prepare\n\s+permissions:\n\s+contents: write\n\s+packages: write/u);
  assert.match(workflow, /RELEASE_TAG_INPUT: \$\{\{ inputs\.tag \}\}/u);
  assert.match(workflow, /RELEASE_REF: \$\{\{ github\.ref \}\}/u);
  assert.match(workflow, /\^v\[0-9\]\+\\\.\[0-9\]\+\\\.\[0-9\]\+\$/u);
  assert.doesNotMatch(workflow, /TAG=['"]?\$\{\{/u);
  assert.doesNotMatch(workflow, /VERSION=['"]?\$\{\{/u);
  assert.match(workflow, /--verify-manifests/u);
  assert.match(
    workflow,
    /npm install --global npm@11\.18\.0 --ignore-scripts --registry https:\/\/registry\.npmjs\.org/u
  );
  assert.match(workflow, /test "\$\(npm --version\)" = "11\.18\.0"/u);

  const installNpmIndex = workflow.indexOf('npm install --global npm@11.18.0');
  const installIndex = workflow.indexOf('run: pnpm install --frozen-lockfile');
  const verifyIndex = workflow.indexOf('run: pnpm run packages:verify');
  const stageIndex = workflow.indexOf('run: pnpm run packages:stage');
  const bodyIndex = workflow.indexOf('- name: Compose release body');
  const bundleIndex = workflow.indexOf('--prepare-bundle');
  const uploadIndex = workflow.indexOf('actions/upload-artifact@');
  const publishJobIndex = workflow.indexOf('\n  publish:');
  const publishNpmIndex = workflow.indexOf('- name: Use pinned publication npm');
  const downloadIndex = workflow.indexOf('actions/download-artifact@');
  const publishIndex = workflow.indexOf('--publish-bundle');
  const releaseIndex = workflow.indexOf('- name: Create or update release');
  assert.equal(
    installNpmIndex < installIndex
      && installIndex < verifyIndex
      && verifyIndex < stageIndex
      && stageIndex < bodyIndex
      && bodyIndex < bundleIndex
      && bundleIndex < uploadIndex
      && uploadIndex < publishJobIndex
      && publishJobIndex < publishNpmIndex
      && publishNpmIndex < downloadIndex
      && downloadIndex < publishIndex
      && publishIndex < releaseIndex,
    true
  );

  const installStepStart = workflow.indexOf('- name: Install dependencies');
  const installStepEnd = workflow.indexOf('\n      - ', installStepStart + 1);
  const installStep = workflow.slice(installStepStart, installStepEnd);
  assert.equal(installStepStart >= 0 && installStepEnd > installStepStart, true);
  assert.match(installStep, /run: pnpm install --frozen-lockfile/u);
  assert.doesNotMatch(
    installStep,
    /--allow-scripts|--dangerously-allow-all-scripts|--ignore-scripts/u
  );

  const publishJob = workflow.slice(publishJobIndex);
  const publishNpmStepStart = publishJob.indexOf('- name: Use pinned publication npm');
  const publishNpmStepEnd = publishJob.indexOf('\n      - ', publishNpmStepStart + 1);
  const publishNpmStep = publishJob.slice(publishNpmStepStart, publishNpmStepEnd);
  assert.match(
    publishNpmStep,
    /npm install --global npm@11\.18\.0 --ignore-scripts --registry https:\/\/registry\.npmjs\.org/u
  );
  assert.match(publishNpmStep, /test "\$\(npm --version\)" = "11\.18\.0"/u);
  assert.doesNotMatch(publishNpmStep, /NODE_AUTH_TOKEN|GITHUB_TOKEN|github\.token|secrets\./u);
  const publishJobWithoutNpmBootstrap = publishJob.replace(publishNpmStep, '');
  assert.doesNotMatch(
    publishJobWithoutNpmBootstrap,
    /actions\/checkout|npm ci|npm install|pnpm install|packages:verify|packages:stage/u
  );
  const actionPins = [...workflow.matchAll(/uses: ([^@\s]+)@([0-9a-f]{40})\s+# (v[^\s]+)/gu)]
    .map((match) => match.slice(1));
  assert.deepEqual(actionPins, [
    ['actions/checkout', '34e114876b0b11c390a56381ad16ebd13914f8d5', 'v4.3.1'],
    ['pnpm/action-setup', 'a7487c7e89a18df4991f7f222e4898a00d66ddda', 'v4.1.0'],
    ['actions/setup-node', '249970729cb0ef3589644e2896645e5dc5ba9c38', 'v6.5.0'],
    ['actions/upload-artifact', 'ea165f8d65b6e75b540449e92b4886f43607fa02', 'v4.6.2'],
    ['actions/setup-node', '249970729cb0ef3589644e2896645e5dc5ba9c38', 'v6.5.0'],
    ['actions/download-artifact', 'd3f86a106a0bac45b974a628896c90dbdf5c8093', 'v4.3.0']
  ]);
});

await test('publish job pins npm before registry access without exposing publication credentials', () => {
  const workflow = readFileSync(
    join(import.meta.dirname, '../.github/workflows/release.yml'),
    'utf8'
  );
  const publishJob = workflow.slice(workflow.indexOf('\n  publish:'));
  const npmStepStart = publishJob.indexOf('- name: Use pinned publication npm');
  const npmStepEnd = publishJob.indexOf('\n      - ', npmStepStart + 1);
  const npmStep = publishJob.slice(npmStepStart, npmStepEnd);
  assert.equal(npmStepStart >= 0 && npmStepEnd > npmStepStart, true);
  assert.match(
    npmStep,
    /npm install --global npm@11\.18\.0 --ignore-scripts --registry https:\/\/registry\.npmjs\.org/u
  );
  assert.match(npmStep, /test "\$\(npm --version\)" = "11\.18\.0"/u);
  assert.doesNotMatch(npmStep, /NODE_AUTH_TOKEN|GITHUB_TOKEN|github\.token|secrets\./u);
  assert.equal(npmStepStart < publishJob.indexOf('--publish-bundle'), true);
});
