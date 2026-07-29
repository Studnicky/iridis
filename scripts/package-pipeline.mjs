#!/usr/bin/env node

import { builtinModules } from 'node:module';
import {
  chmodSync,
  cpSync,
  lstatSync,
  mkdtempSync,
  readdirSync,
  readFileSync,
  realpathSync,
  renameSync,
  rmSync,
  writeFileSync
} from 'node:fs';
import {
  dirname,
  isAbsolute,
  join,
  posix,
  relative,
  resolve,
  sep,
  win32
} from 'node:path';
import { fileURLToPath } from 'node:url';

import ts from 'typescript';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const CONDITIONS = ['types', 'import'];
const DEPENDENCY_FIELDS = ['dependencies', 'optionalDependencies', 'peerDependencies'];
const GITHUB_PACKAGE_REGISTRY = 'https://npm.pkg.github.com';
const OPERATIONAL_METADATA_DIRECTORIES = new Set(['.claude', '.orchestration']);
const MANIFEST_FIELDS = [
  'name',
  'version',
  'description',
  'type',
  'sideEffects',
  'author',
  'license',
  'engines',
  'repository',
  'bugs',
  'homepage',
  'publishConfig',
  'dependencies',
  'optionalDependencies',
  'peerDependencies',
  'peerDependenciesMeta',
  'bin'
];
const BUILTINS = new Set(builtinModules.flatMap((name) => [name, `node:${name}`]));

const fail = (message) => {
  throw new Error(`package-pipeline: ${message}`);
};

const isRecord = (value) => {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
};

const pathStatsFor = (path) => {
  return lstatSync(path, { 'throwIfNoEntry': false });
};

const containsRelativePath = (pathFromParent) => {
  return pathFromParent !== '..'
    && !pathFromParent.startsWith('../')
    && !pathFromParent.startsWith('..\\')
    && !isAbsolute(pathFromParent)
    && !win32.isAbsolute(pathFromParent);
};

const isContained = (parent, child) => {
  return containsRelativePath(relative(parent, child));
};

const assertContainedRealPath = (parent, child, description) => {
  const parentRealPath = realpathSync(parent);
  const childRealPath = realpathSync(child);
  if (!isContained(parentRealPath, childRealPath)) {
    fail(`${description} escapes ${parent}`);
  }
  return childRealPath;
};

const assertSafeDirectory = (path, description, parent) => {
  const stats = pathStatsFor(path);
  if (stats === undefined) {
    fail(`missing ${description}: ${path}`);
  }
  if (stats.isSymbolicLink()) {
    fail(`symlink ${description}: ${path}`);
  }
  if (!stats.isDirectory()) {
    fail(`expected directory for ${description}: ${path}`);
  }
  if (parent !== undefined) {
    assertContainedRealPath(parent, path, description);
  }
  return realpathSync(path);
};

const assertSafeFile = (path, description, parent) => {
  const stats = pathStatsFor(path);
  if (stats === undefined) {
    fail(`missing ${description}: ${path}`);
  }
  if (stats.isSymbolicLink()) {
    fail(`symlink ${description}: ${path}`);
  }
  if (!stats.isFile()) {
    fail(`expected file for ${description}: ${path}`);
  }
  if (parent !== undefined) {
    assertContainedRealPath(parent, path, description);
  }
  return stats;
};

const listFiles = (directory, description) => {
  const rootRealPath = assertSafeDirectory(directory, description);
  const files = [];
  const visit = (currentDirectory, prefix) => {
    const entries = readdirSync(currentDirectory, { 'withFileTypes': true })
      .toSorted((left, right) => left.name.localeCompare(right.name));
    for (const entry of entries) {
      const path = join(currentDirectory, entry.name);
      const relativePath = prefix === '' ? entry.name : join(prefix, entry.name);
      const stats = pathStatsFor(path);
      if (stats === undefined) {
        fail(`filesystem entry disappeared while validating ${description}: ${path}`);
      }
      if (stats.isSymbolicLink()) {
        fail(`symlink in ${description}: ${path}`);
      }
      const realPath = realpathSync(path);
      if (!isContained(rootRealPath, realPath)) {
        fail(`filesystem entry escapes ${description}: ${path}`);
      }
      if (stats.isDirectory()) {
        visit(path, relativePath);
      } else if (stats.isFile()) {
        files.push(relativePath.split(sep).join('/'));
      } else {
        fail(`unsupported filesystem entry in ${description}: ${path}`);
      }
    }
  };
  visit(directory, '');
  return files;
};

const readJson = (path) => {
  try {
    const value = JSON.parse(readFileSync(path, 'utf8'));
    if (!isRecord(value)) {
      fail(`expected an object in ${path}`);
    }
    return value;
  } catch (error) {
    if (error instanceof SyntaxError) {
      fail(`invalid JSON in ${path}: ${error.message}`);
    }
    throw error;
  }
};

const conditionalExport = (packageName, subpath, sourceExport) => {
  if (!isRecord(sourceExport)) {
    fail(`unsupported export shape for ${packageName} ${subpath}`);
  }
  for (const condition of CONDITIONS) {
    if (!Object.hasOwn(sourceExport, condition)) {
      fail(`missing ${condition} target for ${packageName} ${subpath}`);
    }
  }
  if (Object.keys(sourceExport).length !== CONDITIONS.length) {
    fail(`unsupported export conditions for ${packageName} ${subpath}`);
  }

  const publishExport = {};
  for (const condition of CONDITIONS) {
    const target = sourceExport[condition];
    const suffix = condition === 'types' ? '.d.ts' : '.js';
    if (
      typeof target !== 'string'
      || !target.startsWith('./dist/')
      || !target.endsWith(suffix)
      || target.includes('\\')
      || target !== `./${posix.normalize(target)}`
    ) {
      fail(`invalid ${condition} target for ${packageName} ${subpath}`);
    }
    publishExport[condition] = target;
  }
  return publishExport;
};

const publishExportsFor = (manifest) => {
  if (!isRecord(manifest.exports)) {
    fail(`missing package exports for ${manifest.name}`);
  }
  const publishExports = {};
  for (const [subpath, sourceExport] of Object.entries(manifest.exports)) {
    if (
      subpath !== '.'
      && (
        !subpath.startsWith('./')
        || subpath.includes('\\')
        || subpath !== `./${posix.normalize(subpath)}`
      )
    ) {
      fail(`invalid export subpath for ${manifest.name}: ${subpath}`);
    }
    publishExports[subpath] = conditionalExport(manifest.name, subpath, sourceExport);
  }
  if (!Object.hasOwn(publishExports, '.')) {
    fail(`missing root export for ${manifest.name}`);
  }
  return publishExports;
};

const assertExportFiles = (stageDirectory, packageName, publishExports) => {
  for (const [subpath, targets] of Object.entries(publishExports)) {
    for (const condition of CONDITIONS) {
      const target = targets[condition];
      const targetPath = join(stageDirectory, target);
      assertSafeFile(
        targetPath,
        `${condition} export target for ${packageName} ${subpath}`,
        stageDirectory
      );
    }
  }
};

const expectedArtifactsFor = (sourceDirectory, packageName) => {
  const sourceFiles = listFiles(sourceDirectory, `source tree for ${packageName}`)
    .filter((path) => {
      return !path.split('/').some((component) => {
        return OPERATIONAL_METADATA_DIRECTORIES.has(component);
      });
    });
  const unsupported = sourceFiles.filter((path) => {
    return !path.endsWith('.ts') || path.endsWith('.d.ts');
  });
  if (unsupported.length > 0) {
    fail(
      `unsupported source files for ${packageName}; current policy accepts only .ts sources: ${unsupported.join(', ')}`
    );
  }
  if (sourceFiles.length === 0) {
    fail(`no TypeScript source files in ${sourceDirectory}`);
  }
  return new Set(sourceFiles.flatMap((path) => {
    const stem = path.slice(0, -3);
    return [`${stem}.js`, `${stem}.js.map`, `${stem}.d.ts`, `${stem}.d.ts.map`];
  }));
};

const assertExactArtifacts = (directory, packageName, expected) => {
  const actual = new Set(listFiles(directory, `artifacts for ${packageName}`));
  const missing = [...expected].filter((path) => !actual.has(path)).toSorted();
  const extra = [...actual].filter((path) => !expected.has(path)).toSorted();
  if (missing.length > 0) {
    fail(`missing build artifacts for ${packageName}: ${missing.join(', ')}`);
  }
  if (extra.length > 0) {
    fail(`extra build artifacts for ${packageName}: ${extra.join(', ')}`);
  }
  return actual;
};

const moduleSpecifierText = (node, artifactPath, construct) => {
  if (!ts.isStringLiteralLike(node)) {
    fail(`nonliteral ${construct} in ${artifactPath}`);
  }
  return node.text;
};

const importSpecifiersFor = (source, artifactPath, declaration) => {
  const scriptKind = declaration ? ts.ScriptKind.TS : ts.ScriptKind.JS;
  const sourceFile = ts.createSourceFile(
    artifactPath,
    source,
    ts.ScriptTarget.Latest,
    false,
    scriptKind
  );
  const [diagnostic] = sourceFile.parseDiagnostics;
  if (diagnostic !== undefined) {
    fail(
      `invalid generated module ${artifactPath}: ${ts.flattenDiagnosticMessageText(diagnostic.messageText, '\n')}`
    );
  }

  const specifiers = new Set();
  const visit = (node) => {
    if (ts.isImportDeclaration(node)) {
      specifiers.add(moduleSpecifierText(node.moduleSpecifier, artifactPath, 'import'));
    } else if (ts.isExportDeclaration(node) && node.moduleSpecifier !== undefined) {
      specifiers.add(moduleSpecifierText(node.moduleSpecifier, artifactPath, 'export'));
    } else if (
      ts.isImportEqualsDeclaration(node)
      && ts.isExternalModuleReference(node.moduleReference)
    ) {
      const expression = node.moduleReference.expression;
      if (expression === undefined) {
        fail(`missing external module reference in ${artifactPath}`);
      }
      specifiers.add(moduleSpecifierText(expression, artifactPath, 'external module import'));
    } else if (ts.isImportTypeNode(node)) {
      if (!ts.isLiteralTypeNode(node.argument)) {
        fail(`nonliteral declaration import type in ${artifactPath}`);
      }
      specifiers.add(
        moduleSpecifierText(node.argument.literal, artifactPath, 'declaration import type')
      );
    } else if (
      ts.isCallExpression(node)
      && node.expression.kind === ts.SyntaxKind.ImportKeyword
    ) {
      const [argument] = node.arguments;
      if (argument === undefined) {
        fail(`missing dynamic import target in ${artifactPath}`);
      }
      specifiers.add(moduleSpecifierText(argument, artifactPath, 'dynamic import'));
    }
    ts.forEachChild(node, visit);
  };
  visit(sourceFile);
  return [...specifiers];
};

const packageNameFor = (specifier) => {
  if (specifier.startsWith('@')) {
    return specifier.split('/').slice(0, 2).join('/');
  }
  return specifier.split('/')[0];
};

const assertRelativeImport = (distDirectory, artifactPath, specifier, declaration) => {
  if (specifier.includes('\\') || specifier.includes('?') || specifier.includes('#')) {
    fail(`invalid relative import in ${artifactPath}: ${specifier}`);
  }
  const rawTarget = resolve(dirname(artifactPath), specifier);
  if (!isContained(resolve(distDirectory), rawTarget)) {
    fail(`escaping relative import in ${artifactPath}: ${specifier}`);
  }
  let target = rawTarget;
  if (declaration && !target.endsWith('.d.ts')) {
    if (target.endsWith('.ts') || target.endsWith('.js')) {
      target = `${target.slice(0, -3)}.d.ts`;
    } else {
      fail(`unresolved relative import in ${artifactPath}: ${specifier}`);
    }
  } else if (!declaration && !target.endsWith('.js')) {
    fail(`unresolved relative import in ${artifactPath}: ${specifier}`);
  }
  const targetStats = pathStatsFor(target);
  if (targetStats === undefined) {
    fail(`unresolved relative import in ${artifactPath}: ${specifier}`);
  }
  if (targetStats.isSymbolicLink()) {
    fail(`symlink relative import in ${artifactPath}: ${specifier}`);
  }
  assertSafeFile(target, `relative import target in ${artifactPath}`, distDirectory);
};

const dependencyEntriesFor = (manifest) => {
  const dependencies = [];
  for (const field of DEPENDENCY_FIELDS) {
    const values = manifest[field];
    if (values === undefined) {
      continue;
    }
    if (!isRecord(values)) {
      fail(`invalid ${field} for ${manifest.name}`);
    }
    for (const [name, range] of Object.entries(values)) {
      if (typeof range !== 'string') {
        fail(`invalid dependency range for ${manifest.name} -> ${name}`);
      }
      dependencies.push([name, range]);
    }
  }
  return dependencies;
};

const assertInternalDependencyRanges = (manifest, workspaceVersions) => {
  for (const [name, range] of dependencyEntriesFor(manifest)) {
    const workspaceVersion = workspaceVersions.get(name);
    if (workspaceVersion === undefined || name === manifest.name) {
      continue;
    }
    if (range !== 'workspace:*') {
      fail(
        `incompatible internal dependency range for ${manifest.name} -> ${name}: expected workspace:*`
      );
    }
  }
};

const assertReleaseContract = (rootDirectory, packages) => {
  const workspaceManifestPath = join(rootDirectory, 'package.json');
  assertSafeFile(workspaceManifestPath, 'workspace manifest', rootDirectory);
  const workspaceManifest = readJson(workspaceManifestPath);
  if (typeof workspaceManifest.version !== 'string') {
    fail('workspace manifest requires a version');
  }

  let repositoryUrl;
  for (const packageRecord of packages) {
    const { directoryName, manifest } = packageRecord;
    if (manifest.version !== workspaceManifest.version) {
      fail(
        `package version mismatch for ${manifest.name}: expected ${workspaceManifest.version}`
      );
    }

    if (
      !isRecord(manifest.publishConfig)
      || manifest.publishConfig.registry !== GITHUB_PACKAGE_REGISTRY
      || manifest.publishConfig.access !== 'public'
    ) {
      fail(`invalid GitHub Packages publishConfig for ${manifest.name}`);
    }

    if (
      !isRecord(manifest.repository)
      || manifest.repository.type !== 'git'
      || typeof manifest.repository.url !== 'string'
      || manifest.repository.url.length === 0
      || manifest.repository.directory !== `packages/${directoryName}`
    ) {
      fail(`invalid repository metadata for ${manifest.name}`);
    }
    repositoryUrl ??= manifest.repository.url;
    if (manifest.repository.url !== repositoryUrl) {
      fail(`inconsistent repository URL for ${manifest.name}`);
    }
  }
};

const assertDependencyClosure = (distDirectory, packageName, manifest, artifacts) => {
  const declared = new Set(dependencyEntriesFor(manifest).map(([name]) => name));
  for (const artifact of artifacts) {
    if (!artifact.endsWith('.js') && !artifact.endsWith('.d.ts')) {
      continue;
    }
    const artifactPath = join(distDirectory, artifact);
    const declaration = artifact.endsWith('.d.ts');
    const source = readFileSync(artifactPath, 'utf8');
    for (const specifier of importSpecifiersFor(source, artifactPath, declaration)) {
      if (specifier.startsWith('.')) {
        assertRelativeImport(distDirectory, artifactPath, specifier, declaration);
      } else {
        const dependencyName = packageNameFor(specifier);
        if (
          dependencyName !== packageName
          && !BUILTINS.has(specifier)
          && !BUILTINS.has(dependencyName)
          && !declared.has(dependencyName)
        ) {
          const kind = declaration ? 'declaration' : 'runtime';
          fail(`undeclared ${kind} package in ${artifactPath}: ${dependencyName}`);
        }
      }
    }
  }
};

const rewriteWorkspaceRanges = (values, workspaceVersions) => {
  const rewritten = {};
  for (const [name, range] of Object.entries(values)) {
    if (range !== 'workspace:*') {
      rewritten[name] = range;
      continue;
    }
    const workspaceVersion = workspaceVersions.get(name);
    if (workspaceVersion === undefined) {
      fail(`workspace:* dependency is not a known workspace package: ${name}`);
    }
    rewritten[name] = `^${workspaceVersion}`;
  }
  return rewritten;
};

const publishManifestFor = (manifest, publishExports, workspaceVersions) => {
  const publishManifest = {};
  for (const field of MANIFEST_FIELDS) {
    if (Object.hasOwn(manifest, field)) {
      publishManifest[field] = manifest[field];
    }
  }
  for (const field of DEPENDENCY_FIELDS) {
    if (Object.hasOwn(publishManifest, field)) {
      publishManifest[field] = rewriteWorkspaceRanges(publishManifest[field], workspaceVersions);
    }
  }
  const rootExport = publishExports['.'];
  publishManifest.main = rootExport.import;
  publishManifest.module = rootExport.import;
  publishManifest.types = rootExport.types;
  publishManifest.exports = publishExports;
  publishManifest.files = ['dist', 'README.md', 'LICENSE', 'CHANGELOG.md'];
  return publishManifest;
};

const binEntriesFor = (manifest) => {
  if (manifest.bin === undefined) {
    return [];
  }
  if (typeof manifest.bin === 'string') {
    return [[manifest.name, manifest.bin]];
  }
  if (!isRecord(manifest.bin)) {
    fail(`invalid bin declaration for ${manifest.name}`);
  }
  return Object.entries(manifest.bin);
};

const assertBinTargets = (stageDirectory, manifest, artifacts) => {
  for (const [command, target] of binEntriesFor(manifest)) {
    if (
      typeof target !== 'string'
      || !target.startsWith('./dist/')
      || !target.endsWith('.js')
      || target.endsWith('.d.ts')
      || target.includes('\\')
      || target !== `./${posix.normalize(target)}`
    ) {
      fail(`invalid bin target for ${manifest.name} ${command}`);
    }
    const artifact = target.slice('./dist/'.length);
    if (!artifacts.has(artifact)) {
      fail(`missing bin artifact for ${manifest.name} ${command}: ${target}`);
    }
    const targetPath = join(stageDirectory, target);
    const stats = assertSafeFile(
      targetPath,
      `bin target for ${manifest.name} ${command}`,
      join(stageDirectory, 'dist')
    );
    chmodSync(targetPath, (stats.mode & 0o777) | 0o111);
    if ((lstatSync(targetPath).mode & 0o111) === 0) {
      fail(`non-executable bin target for ${manifest.name} ${command}: ${target}`);
    }
  }
};

const discoverPublicPackages = (rootDirectory) => {
  assertSafeDirectory(rootDirectory, 'workspace root');
  const packagesDirectory = join(rootDirectory, 'packages');
  assertSafeDirectory(packagesDirectory, 'packages directory', rootDirectory);
  const packages = [];
  for (const entry of readdirSync(packagesDirectory, { 'withFileTypes': true })) {
    if (entry.isSymbolicLink()) {
      fail(`symlink package root: ${join(packagesDirectory, entry.name)}`);
    }
    if (!entry.isDirectory()) {
      continue;
    }
    const packageDirectory = join(packagesDirectory, entry.name);
    assertSafeDirectory(packageDirectory, `package root ${entry.name}`, packagesDirectory);
    const manifestPath = join(packageDirectory, 'package.json');
    if (pathStatsFor(manifestPath) === undefined) {
      continue;
    }
    assertSafeFile(manifestPath, `manifest for ${entry.name}`, packageDirectory);
    const manifest = readJson(manifestPath);
    if (manifest.private === true) {
      continue;
    }
    if (typeof manifest.name !== 'string' || typeof manifest.version !== 'string') {
      fail(`public package requires name and version: ${manifestPath}`);
    }
    packages.push({
      'directoryName': entry.name,
      manifest,
      packageDirectory
    });
  }
  const sortedPackages = packages.toSorted((left, right) => {
    return left.directoryName.localeCompare(right.directoryName);
  });
  assertReleaseContract(rootDirectory, sortedPackages);
  return sortedPackages;
};

const releaseOrder = (rootDirectory = ROOT) => {
  const packages = discoverPublicPackages(rootDirectory);
  const packageNames = new Set(packages.map(({ manifest }) => manifest.name));
  const pending = new Map(packages.map((packageRecord) => {
    const dependencies = new Set(dependencyEntriesFor(packageRecord.manifest)
      .map(([name]) => name)
      .filter((name) => packageNames.has(name)));
    return [packageRecord.manifest.name, { dependencies, packageRecord }];
  }));
  const ordered = [];

  while (pending.size > 0) {
    const ready = [...pending.values()]
      .filter(({ dependencies }) => {
        return [...dependencies].every((name) => !pending.has(name));
      })
      .toSorted((left, right) => {
        return left.packageRecord.manifest.name.localeCompare(right.packageRecord.manifest.name);
      });
    if (ready.length === 0) {
      fail(`cyclic internal package dependencies: ${[...pending.keys()].toSorted().join(', ')}`);
    }
    for (const { packageRecord } of ready) {
      pending.delete(packageRecord.manifest.name);
      ordered.push(packageRecord);
    }
  }

  return ordered;
};

const selectPackages = (rootDirectory, selectors) => {
  if (!Array.isArray(selectors) || selectors.length === 0) {
    fail('provide at least one package directory or package name');
  }
  const publicPackages = discoverPublicPackages(rootDirectory);
  const selected = selectors.map((selector) => {
    const packageRecord = publicPackages.find((candidate) => {
      return candidate.directoryName === selector || candidate.manifest.name === selector;
    });
    if (packageRecord === undefined) {
      fail(`unknown public package: ${selector}`);
    }
    return packageRecord;
  });
  if (new Set(selected.map(({ packageDirectory }) => packageDirectory)).size !== selected.length) {
    fail('package subset contains duplicates');
  }
  const workspaceVersions = new Map(publicPackages.map(({ manifest }) => {
    return [manifest.name, manifest.version];
  }));
  return { selected, workspaceVersions };
};

const assertOptionalStage = (publishDirectory, packageDirectory, packageName) => {
  if (pathStatsFor(publishDirectory) === undefined) {
    return false;
  }
  assertSafeDirectory(
    publishDirectory,
    `existing publish stage for ${packageName}`,
    packageDirectory
  );
  listFiles(publishDirectory, `existing publish stage for ${packageName}`);
  return true;
};

const stageInputsFor = (packageRecord, rootDirectory, workspaceVersions) => {
  const { manifest, packageDirectory } = packageRecord;
  assertInternalDependencyRanges(manifest, workspaceVersions);
  const sourceDirectory = join(packageDirectory, 'src');
  const distDirectory = join(packageDirectory, 'dist');
  assertSafeDirectory(sourceDirectory, `source root for ${manifest.name}`, packageDirectory);
  assertSafeDirectory(distDirectory, `dist root for ${manifest.name}`, packageDirectory);
  const expectedArtifacts = expectedArtifactsFor(sourceDirectory, manifest.name);
  const sourceArtifacts = assertExactArtifacts(
    distDirectory,
    manifest.name,
    expectedArtifacts
  );
  const packageReadme = join(packageDirectory, 'README.md');
  const rootReadme = join(rootDirectory, 'README.md');
  const readmePath = pathStatsFor(packageReadme) === undefined ? rootReadme : packageReadme;
  assertSafeFile(
    readmePath,
    `README for ${manifest.name}`,
    readmePath === packageReadme ? packageDirectory : rootDirectory
  );
  const packageChangelog = join(packageDirectory, 'CHANGELOG.md');
  const rootChangelog = join(rootDirectory, 'CHANGELOG.md');
  const changelogPath = pathStatsFor(packageChangelog) === undefined ? rootChangelog : packageChangelog;
  assertSafeFile(
    changelogPath,
    `CHANGELOG for ${manifest.name}`,
    changelogPath === packageChangelog ? packageDirectory : rootDirectory
  );
  const licensePath = join(rootDirectory, 'LICENSE');
  assertSafeFile(licensePath, 'root LICENSE', rootDirectory);
  const publishExports = publishExportsFor(manifest);
  const publishManifest = publishManifestFor(manifest, publishExports, workspaceVersions);
  const manifestContents = `${JSON.stringify(publishManifest, null, 2)}\n`;
  const publishDirectory = join(packageDirectory, '.publish');
  assertOptionalStage(publishDirectory, packageDirectory, manifest.name);
  return {
    ...packageRecord,
    changelogPath,
    distDirectory,
    expectedArtifacts,
    licensePath,
    manifestContents,
    publishDirectory,
    publishExports,
    publishManifest,
    readmePath,
    sourceArtifacts,
    sourceDirectory
  };
};

const assertSameBytes = (sourcePath, stagePath, description) => {
  if (!readFileSync(sourcePath).equals(readFileSync(stagePath))) {
    fail(`staged bytes differ for ${description}`);
  }
};

const assertExactStageContents = (inputs, stageDirectory, stageArtifacts) => {
  const stageFiles = new Set(listFiles(stageDirectory, `temporary stage for ${inputs.manifest.name}`));
  const expectedFiles = new Set([
    ...[...stageArtifacts].map((path) => `dist/${path}`),
    'README.md',
    'LICENSE',
    'CHANGELOG.md',
    'package.json'
  ]);
  if (
    expectedFiles.size !== stageFiles.size
    || [...expectedFiles].some((path) => !stageFiles.has(path))
  ) {
    fail(`staged files differ from validated files for ${inputs.manifest.name}`);
  }
  for (const artifact of inputs.sourceArtifacts) {
    assertSameBytes(
      join(inputs.distDirectory, artifact),
      join(stageDirectory, 'dist', artifact),
      `${inputs.manifest.name} dist/${artifact}`
    );
  }
  assertSameBytes(inputs.readmePath, join(stageDirectory, 'README.md'), 'README.md');
  assertSameBytes(inputs.licensePath, join(stageDirectory, 'LICENSE'), 'LICENSE');
  assertSameBytes(inputs.changelogPath, join(stageDirectory, 'CHANGELOG.md'), 'CHANGELOG.md');
  if (readFileSync(join(stageDirectory, 'package.json'), 'utf8') !== inputs.manifestContents) {
    fail(`staged bytes differ for ${inputs.manifest.name} package.json`);
  }
};

const createStage = (packageRecord, rootDirectory, workspaceVersions) => {
  const inputs = stageInputsFor(packageRecord, rootDirectory, workspaceVersions);
  const temporaryDirectory = mkdtempSync(join(inputs.packageDirectory, '.publish.next-'));
  try {
    assertSafeDirectory(
      temporaryDirectory,
      `temporary stage root for ${inputs.manifest.name}`,
      inputs.packageDirectory
    );
    cpSync(inputs.distDirectory, join(temporaryDirectory, 'dist'), { 'recursive': true });
    cpSync(inputs.readmePath, join(temporaryDirectory, 'README.md'));
    cpSync(inputs.licensePath, join(temporaryDirectory, 'LICENSE'));
    cpSync(inputs.changelogPath, join(temporaryDirectory, 'CHANGELOG.md'));
    writeFileSync(join(temporaryDirectory, 'package.json'), inputs.manifestContents);

    const stageDistDirectory = join(temporaryDirectory, 'dist');
    assertSafeDirectory(
      stageDistDirectory,
      `temporary dist root for ${inputs.manifest.name}`,
      temporaryDirectory
    );
    const stageArtifacts = assertExactArtifacts(
      stageDistDirectory,
      inputs.manifest.name,
      inputs.expectedArtifacts
    );
    assertExportFiles(temporaryDirectory, inputs.manifest.name, inputs.publishExports);
    assertDependencyClosure(
      stageDistDirectory,
      inputs.manifest.name,
      inputs.manifest,
      stageArtifacts
    );
    assertBinTargets(temporaryDirectory, inputs.publishManifest, stageArtifacts);
    assertSafeFile(
      join(temporaryDirectory, 'README.md'),
      `staged README for ${inputs.manifest.name}`,
      temporaryDirectory
    );
    assertSafeFile(
      join(temporaryDirectory, 'LICENSE'),
      `staged LICENSE for ${inputs.manifest.name}`,
      temporaryDirectory
    );
    assertSafeFile(
      join(temporaryDirectory, 'CHANGELOG.md'),
      `staged CHANGELOG for ${inputs.manifest.name}`,
      temporaryDirectory
    );
    assertSafeFile(
      join(temporaryDirectory, 'package.json'),
      `staged manifest for ${inputs.manifest.name}`,
      temporaryDirectory
    );
    assertExactStageContents(inputs, temporaryDirectory, stageArtifacts);
    return { inputs, temporaryDirectory };
  } catch (error) {
    rmSync(temporaryDirectory, { 'force': true, 'recursive': true });
    throw error;
  }
};

const cleanupTemporaryStages = (stages) => {
  for (const stage of stages) {
    rmSync(stage.temporaryDirectory, { 'force': true, 'recursive': true });
  }
};

const replaceStages = (stages) => {
  const replacements = [];
  try {
    for (const [index, stage] of stages.entries()) {
      const { inputs } = stage;
      const backupDirectory = `${inputs.publishDirectory}.previous-${process.pid}-${index}`;
      if (pathStatsFor(backupDirectory) !== undefined) {
        fail(`backup path already exists: ${backupDirectory}`);
      }
      const hadPrevious = assertOptionalStage(
        inputs.publishDirectory,
        inputs.packageDirectory,
        inputs.manifest.name
      );
      assertSafeDirectory(
        stage.temporaryDirectory,
        `validated temporary stage for ${inputs.manifest.name}`,
        inputs.packageDirectory
      );
      if (hadPrevious) {
        renameSync(inputs.publishDirectory, backupDirectory);
      }
      try {
        renameSync(stage.temporaryDirectory, inputs.publishDirectory);
      } catch (error) {
        if (hadPrevious) {
          renameSync(backupDirectory, inputs.publishDirectory);
        }
        throw error;
      }
      replacements.push({ backupDirectory, hadPrevious, inputs });
    }
  } catch (error) {
    for (const replacement of replacements.toReversed()) {
      rmSync(replacement.inputs.publishDirectory, { 'force': true, 'recursive': true });
      if (replacement.hadPrevious) {
        renameSync(replacement.backupDirectory, replacement.inputs.publishDirectory);
      }
    }
    cleanupTemporaryStages(stages);
    throw error;
  }
  for (const replacement of replacements) {
    if (replacement.hadPrevious) {
      rmSync(replacement.backupDirectory, { 'force': true, 'recursive': true });
    }
  }
};

const prepare = (selectors, rootDirectory = ROOT) => {
  const { selected, workspaceVersions } = selectPackages(rootDirectory, selectors);
  const stages = [];
  try {
    for (const packageRecord of selected) {
      stages.push(createStage(packageRecord, rootDirectory, workspaceVersions));
    }
  } catch (error) {
    cleanupTemporaryStages(stages);
    throw error;
  }
  replaceStages(stages);
  return stages.map(({ inputs }) => inputs.publishDirectory);
};

export const packagePipeline = Object.freeze({ containsRelativePath, prepare, releaseOrder });

if (import.meta.main) {
  const selectors = process.argv.slice(2);
  const publishDirectories = packagePipeline.prepare(selectors);
  for (const publishDirectory of publishDirectories) {
    console.log(`package-pipeline: wrote ${relative(ROOT, publishDirectory)}`);
  }
}
