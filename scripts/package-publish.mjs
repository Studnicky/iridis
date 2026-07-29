#!/usr/bin/env node

import { spawnSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import {
  copyFileSync,
  lstatSync,
  mkdirSync,
  readFileSync,
  writeFileSync
} from 'node:fs';
import { basename, dirname, isAbsolute, join, relative, resolve, sep, win32 } from 'node:path';
import { fileURLToPath } from 'node:url';

import { packagePipeline } from './package-pipeline.mjs';

const SCRIPT_DIRECTORY = dirname(fileURLToPath(import.meta.url));
const ROOT = join(SCRIPT_DIRECTORY, '..');
const EXPECTED_PACKAGE_COUNT = 18;
const GITHUB_PACKAGE_REGISTRY = 'https://npm.pkg.github.com';
const NPM_COMMAND = process.platform === 'win32' ? 'npm.cmd' : 'npm';
const RELEASE_BODY_FILE = 'release-body.md';
const RELEASE_PLAN_FILE = 'release-plan.json';
const PACKAGE_NAME_PATTERN = /^@[a-z0-9][a-z0-9._-]*\/[a-z0-9][a-z0-9._-]*$/u;
const PACKAGE_ARCHIVE_PATTERN = /^packages\/[a-z0-9][a-z0-9._-]*\.tgz$/u;
const SHA256_INTEGRITY_PATTERN = /^sha256-[A-Za-z0-9+/]+={0,2}$/u;
const SHA512_INTEGRITY_PATTERN = /^sha512-[A-Za-z0-9+/]+={0,2}$/u;

const fail = (message) => {
  throw new Error(`package-publish: ${message}`);
};

const isRecord = (value) => {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
};

const readJson = (path) => {
  const value = JSON.parse(readFileSync(path, 'utf8'));
  if (!isRecord(value)) {
    fail(`expected JSON object in ${path}`);
  }
  return value;
};

const assertVersion = (version) => {
  if (!/^\d+\.\d+\.\d+$/u.test(version)) {
    fail(`invalid expected version: ${version}`);
  }
};

const digest = (algorithm, contents) => {
  return `${algorithm}-${createHash(algorithm).update(contents).digest('base64')}`;
};

const containsPath = (rootDirectory, candidate) => {
  const pathFromRoot = relative(resolve(rootDirectory), resolve(candidate));
  return pathFromRoot === ''
    || (
      pathFromRoot !== '..'
      && !pathFromRoot.startsWith(`..${sep}`)
      && !isAbsolute(pathFromRoot)
      && !win32.isAbsolute(pathFromRoot)
    );
};

const assertRegularFile = (path, description) => {
  const stats = lstatSync(path, { 'throwIfNoEntry': false });
  if (stats === undefined || !stats.isFile() || stats.isSymbolicLink()) {
    fail(`${description} is not a safe regular file: ${path}`);
  }
};

const verifyManifests = (
  expectedVersion,
  rootDirectory = ROOT,
  expectedPackageCount = EXPECTED_PACKAGE_COUNT
) => {
  assertVersion(expectedVersion);
  const workspaceManifest = readJson(join(rootDirectory, 'package.json'));
  if (workspaceManifest.version !== expectedVersion) {
    fail(`workspace manifest mismatch: expected ${expectedVersion}`);
  }
  const packageRecords = packagePipeline.releaseOrder(rootDirectory);
  if (packageRecords.length !== expectedPackageCount) {
    fail(`expected ${expectedPackageCount} public packages, found ${packageRecords.length}`);
  }
  for (const packageRecord of packageRecords) {
    if (packageRecord.manifest.version !== expectedVersion) {
      fail(
        `source manifest mismatch for ${packageRecord.manifest.name}: expected ${expectedVersion}`
      );
    }
  }
  return packageRecords;
};

const assertPublishDirectory = (packageRecord, expectedVersion) => {
  const publishDirectory = join(packageRecord.packageDirectory, '.publish');
  const stats = lstatSync(publishDirectory, { 'throwIfNoEntry': false });
  if (stats === undefined || !stats.isDirectory() || stats.isSymbolicLink()) {
    fail(`missing safe publish stage for ${packageRecord.manifest.name}`);
  }
  const stagedManifest = readJson(join(publishDirectory, 'package.json'));
  if (
    stagedManifest.name !== packageRecord.manifest.name
    || stagedManifest.version !== expectedVersion
  ) {
    fail(`staged manifest mismatch for ${packageRecord.manifest.name}@${expectedVersion}`);
  }
  if (
    stagedManifest.publishConfig?.registry !== GITHUB_PACKAGE_REGISTRY
    || stagedManifest.publishConfig?.access !== 'public'
  ) {
    fail(`staged GitHub Packages metadata mismatch for ${packageRecord.manifest.name}`);
  }
  return {
    'directoryName': packageRecord.directoryName,
    'name': packageRecord.manifest.name,
    publishDirectory,
    'version': expectedVersion
  };
};

const plan = (
  expectedVersion,
  rootDirectory = ROOT,
  expectedPackageCount = EXPECTED_PACKAGE_COUNT
) => {
  return verifyManifests(expectedVersion, rootDirectory, expectedPackageCount).map(
    (packageRecord) => {
      return assertPublishDirectory(packageRecord, expectedVersion);
    }
  );
};

class NpmPackager {
  pack(packageRecord, archivesDirectory, rootDirectory) {
    const result = spawnSync(NPM_COMMAND, [
      'pack',
      packageRecord.publishDirectory,
      '--pack-destination',
      archivesDirectory,
      '--json',
      '--ignore-scripts'
    ], {
      'cwd': rootDirectory,
      'encoding': 'utf8',
      'stdio': ['ignore', 'pipe', 'pipe'],
      'windowsHide': true
    });
    if (result.error !== undefined || result.status !== 0) {
      fail(`npm pack failed for ${packageRecord.name}@${packageRecord.version}`);
    }
    let output;
    try {
      output = JSON.parse(result.stdout);
    } catch {
      fail(`npm pack returned invalid JSON for ${packageRecord.name}@${packageRecord.version}`);
    }
    const packed = Array.isArray(output) ? output[0] : undefined;
    if (!isRecord(packed) || typeof packed.filename !== 'string') {
      fail(`npm pack returned no archive for ${packageRecord.name}@${packageRecord.version}`);
    }
    const archive = resolve(archivesDirectory, packed.filename);
    if (!containsPath(archivesDirectory, archive)) {
      fail(`npm pack returned an unsafe archive path for ${packageRecord.name}`);
    }
    assertRegularFile(archive, `packed archive for ${packageRecord.name}`);
    return archive;
  }
}

const assertReleaseBody = (releaseBodyPath) => {
  assertRegularFile(releaseBodyPath, 'release body');
  const contents = readFileSync(releaseBodyPath);
  if (contents.toString('utf8').trim() === '') {
    fail('release body is empty');
  }
  return contents;
};

const prepareBundle = (
  expectedVersion,
  releaseBodyPath,
  bundleDirectory,
  rootDirectory = ROOT,
  packager = new NpmPackager(),
  expectedPackageCount = EXPECTED_PACKAGE_COUNT
) => {
  const releasePlan = plan(expectedVersion, rootDirectory, expectedPackageCount);
  const releaseBody = assertReleaseBody(releaseBodyPath);
  const existingBundle = lstatSync(bundleDirectory, { 'throwIfNoEntry': false });
  if (existingBundle !== undefined) {
    fail(`release bundle target already exists: ${bundleDirectory}`);
  }
  const archivesDirectory = join(bundleDirectory, 'packages');
  const scriptsDirectory = join(bundleDirectory, 'scripts');
  mkdirSync(archivesDirectory, { 'recursive': true });
  mkdirSync(scriptsDirectory);

  const packages = releasePlan.map((packageRecord) => {
    const archive = packager.pack(packageRecord, archivesDirectory, rootDirectory);
    if (!containsPath(archivesDirectory, archive)) {
      fail(`packager returned an unsafe archive path for ${packageRecord.name}`);
    }
    assertRegularFile(archive, `packed archive for ${packageRecord.name}`);
    return {
      'archive': `packages/${basename(archive)}`,
      'integrity': digest('sha512', readFileSync(archive)),
      'name': packageRecord.name,
      'version': packageRecord.version
    };
  });

  writeFileSync(join(bundleDirectory, RELEASE_BODY_FILE), releaseBody);
  writeFileSync(join(bundleDirectory, RELEASE_PLAN_FILE), `${JSON.stringify({
    'packageCount': packages.length,
    packages,
    'releaseBody': {
      'integrity': digest('sha256', releaseBody),
      'path': RELEASE_BODY_FILE
    },
    'schemaVersion': 1,
    'version': expectedVersion
  }, null, 2)}\n`);
  copyFileSync(join(SCRIPT_DIRECTORY, 'package-pipeline.mjs'), join(scriptsDirectory, 'package-pipeline.mjs'));
  copyFileSync(fileURLToPath(import.meta.url), join(scriptsDirectory, 'package-publish.mjs'));
  return packages;
};

const bundlePath = (bundleDirectory, relativePath, description) => {
  if (
    typeof relativePath !== 'string'
    || relativePath === ''
    || relativePath.split('/').some((segment) => segment === '' || segment === '.' || segment === '..')
  ) {
    fail(`invalid ${description} path in release plan`);
  }
  const path = resolve(bundleDirectory, ...relativePath.split('/'));
  if (!containsPath(bundleDirectory, path)) {
    fail(`${description} path escapes release bundle`);
  }
  assertRegularFile(path, description);
  return path;
};

const loadBundle = (
  expectedVersion,
  bundleDirectory,
  expectedPackageCount = EXPECTED_PACKAGE_COUNT
) => {
  assertVersion(expectedVersion);
  const bundleStats = lstatSync(bundleDirectory, { 'throwIfNoEntry': false });
  if (bundleStats === undefined || !bundleStats.isDirectory() || bundleStats.isSymbolicLink()) {
    fail(`missing safe release bundle: ${bundleDirectory}`);
  }
  const releasePlan = readJson(join(bundleDirectory, RELEASE_PLAN_FILE));
  if (
    releasePlan.schemaVersion !== 1
    || releasePlan.version !== expectedVersion
    || releasePlan.packageCount !== expectedPackageCount
    || !Array.isArray(releasePlan.packages)
    || releasePlan.packages.length !== expectedPackageCount
  ) {
    fail(`release plan mismatch for ${expectedVersion}`);
  }
  if (
    !isRecord(releasePlan.releaseBody)
    || releasePlan.releaseBody.path !== RELEASE_BODY_FILE
    || typeof releasePlan.releaseBody.integrity !== 'string'
    || !SHA256_INTEGRITY_PATTERN.test(releasePlan.releaseBody.integrity)
  ) {
    fail('release plan has invalid release body metadata');
  }
  const releaseBody = bundlePath(
    bundleDirectory,
    releasePlan.releaseBody.path,
    'release body'
  );
  const releaseBodyContents = assertReleaseBody(releaseBody);
  if (digest('sha256', releaseBodyContents) !== releasePlan.releaseBody.integrity) {
    fail('release body integrity mismatch');
  }

  const names = new Set();
  const packages = releasePlan.packages.map((packageRecord) => {
    if (
      !isRecord(packageRecord)
      || typeof packageRecord.name !== 'string'
      || !PACKAGE_NAME_PATTERN.test(packageRecord.name)
      || packageRecord.version !== expectedVersion
      || typeof packageRecord.integrity !== 'string'
      || !SHA512_INTEGRITY_PATTERN.test(packageRecord.integrity)
      || typeof packageRecord.archive !== 'string'
      || !PACKAGE_ARCHIVE_PATTERN.test(packageRecord.archive)
    ) {
      fail('release plan contains invalid package metadata');
    }
    if (names.has(packageRecord.name)) {
      fail(`release plan contains duplicate package ${packageRecord.name}`);
    }
    names.add(packageRecord.name);
    const archive = bundlePath(bundleDirectory, packageRecord.archive, 'package archive');
    if (digest('sha512', readFileSync(archive)) !== packageRecord.integrity) {
      fail(`local archive integrity mismatch for ${packageRecord.name}@${expectedVersion}`);
    }
    return {
      archive,
      'integrity': packageRecord.integrity,
      'name': packageRecord.name,
      'version': packageRecord.version
    };
  });
  return { packages, releaseBody };
};

const npmErrorCode = (result) => {
  for (const output of [result.stdout, result.stderr]) {
    if (typeof output !== 'string' || output.trim() === '') {
      continue;
    }
    try {
      const parsed = JSON.parse(output);
      if (isRecord(parsed) && isRecord(parsed.error) && typeof parsed.error.code === 'string') {
        return parsed.error.code;
      }
    } catch {
      continue;
    }
  }
  return undefined;
};

class NpmPublisher {
  integrityFor(packageRecord, rootDirectory) {
    const result = spawnSync(NPM_COMMAND, [
      'view',
      `${packageRecord.name}@${packageRecord.version}`,
      'dist.integrity',
      '--json',
      '--registry',
      GITHUB_PACKAGE_REGISTRY,
      '--ignore-scripts'
    ], {
      'cwd': rootDirectory,
      'encoding': 'utf8',
      'env': {
        ...process.env,
        'npm_config_registry': GITHUB_PACKAGE_REGISTRY
      },
      'stdio': ['ignore', 'pipe', 'pipe'],
      'windowsHide': true
    });
    // Report what npm actually said. A bare "npm view failed" gives a release
    // operator nothing to act on and hides whether npm could not be spawned
    // at all, exited non-zero, or answered with an error code.
    if (result.error !== undefined) {
      fail(`npm view could not run for ${packageRecord.name}@${packageRecord.version}: ${result.error.message}`);
    }
    if (result.status !== 0) {
      if (npmErrorCode(result) === 'E404') {
        return undefined;
      }
      const detail = [result.stderr, result.stdout]
        .filter((stream) => typeof stream === 'string' && stream.trim() !== '')
        .join('\n')
        .trim();
      fail(
        `npm view failed for ${packageRecord.name}@${packageRecord.version}`
        + ` (exit ${String(result.status)}, code ${String(npmErrorCode(result) ?? 'unknown')})`
        + (detail === '' ? '' : `:\n${detail}`)
      );
    }
    let integrity;
    try {
      integrity = JSON.parse(result.stdout);
    } catch {
      fail(`npm view returned invalid JSON for ${packageRecord.name}@${packageRecord.version}`);
    }
    if (typeof integrity !== 'string' || integrity === '') {
      fail(`npm view returned invalid integrity for ${packageRecord.name}@${packageRecord.version}`);
    }
    return integrity;
  }

  publish(packageRecord, rootDirectory) {
    const result = spawnSync(NPM_COMMAND, [
      'publish',
      packageRecord.archive,
      '--registry',
      GITHUB_PACKAGE_REGISTRY,
      '--ignore-scripts'
    ], {
      'cwd': rootDirectory,
      'env': {
        ...process.env,
        'npm_config_registry': GITHUB_PACKAGE_REGISTRY
      },
      'stdio': 'inherit',
      'windowsHide': true
    });
    if (result.error !== undefined || result.status !== 0) {
      fail(`npm publish failed for ${packageRecord.name}@${packageRecord.version}`);
    }
  }
}

const publishBundle = (
  expectedVersion,
  bundleDirectory,
  publisher = new NpmPublisher(),
  expectedPackageCount = EXPECTED_PACKAGE_COUNT
) => {
  const release = loadBundle(expectedVersion, bundleDirectory, expectedPackageCount);
  const unpublished = [];
  const skipped = [];
  for (const packageRecord of release.packages) {
    const publishedIntegrity = publisher.integrityFor(packageRecord, bundleDirectory);
    if (publishedIntegrity === undefined) {
      unpublished.push(packageRecord);
      continue;
    }
    if (publishedIntegrity !== packageRecord.integrity) {
      fail(`registry integrity mismatch for ${packageRecord.name}@${packageRecord.version}`);
    }
    skipped.push(packageRecord.name);
  }

  const published = [];
  for (const packageRecord of unpublished) {
    publisher.publish(packageRecord, bundleDirectory);
    const publishedIntegrity = publisher.integrityFor(packageRecord, bundleDirectory);
    if (publishedIntegrity !== packageRecord.integrity) {
      fail(`published integrity mismatch for ${packageRecord.name}@${packageRecord.version}`);
    }
    published.push(packageRecord.name);
  }
  return {
    published,
    skipped,
    'verified': release.packages.map(({ name }) => name)
  };
};

const argumentValue = (arguments_, name) => {
  const indexes = arguments_.flatMap((argument, index) => {
    return argument === name ? [index] : [];
  });
  if (
    indexes.length !== 1
    || indexes[0] === arguments_.length - 1
    || arguments_[indexes[0] + 1]?.startsWith('--') === true
  ) {
    fail(`provide ${name} VALUE exactly once`);
  }
  return arguments_[indexes[0] + 1];
};

export const packagePublisher = Object.freeze({
  loadBundle,
  plan,
  prepareBundle,
  publishBundle,
  verifyManifests
});

if (import.meta.main) {
  const arguments_ = process.argv.slice(2);
  const modes = ['--prepare-bundle', '--publish-bundle', '--verify-manifests']
    .filter((mode) => arguments_.includes(mode));
  if (modes.length !== 1) {
    fail('select exactly one release operation');
  }
  const expectedVersion = argumentValue(arguments_, '--expected-version');
  if (modes[0] === '--verify-manifests') {
    const records = packagePublisher.verifyManifests(expectedVersion);
    console.log(JSON.stringify({ 'verifiedManifests': records.length }));
  } else if (modes[0] === '--prepare-bundle') {
    const packages = packagePublisher.prepareBundle(
      expectedVersion,
      argumentValue(arguments_, '--release-body'),
      argumentValue(arguments_, '--bundle')
    );
    console.log(JSON.stringify({ 'bundled': packages.length }));
  } else {
    if (typeof process.env.NODE_AUTH_TOKEN !== 'string' || process.env.NODE_AUTH_TOKEN.trim() === '') {
      fail('NODE_AUTH_TOKEN is required');
    }
    const result = packagePublisher.publishBundle(
      expectedVersion,
      argumentValue(arguments_, '--bundle')
    );
    console.log(JSON.stringify(result));
  }
}
