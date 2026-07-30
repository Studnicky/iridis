#!/usr/bin/env node

import { spawnSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import {
  cpSync,
  existsSync,
  lstatSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  readdirSync,
  realpathSync,
  rmSync,
  statSync,
  writeFileSync
} from 'node:fs';
import { builtinModules } from 'node:module';
import { tmpdir } from 'node:os';
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
import { fileURLToPath, pathToFileURL } from 'node:url';

import { satisfies, validRange } from 'semver';
import { extract as extractTar, list as listTar } from 'tar';
import typescript from 'typescript';
import validatePackageName from 'validate-npm-package-name';

import { packagePipeline } from './package-pipeline.mjs';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const EXPECTED_PACKAGES = 18;
const EXPECTED_SOURCES = 324;
const EXPECTED_ARTIFACTS = 1296;
const EXPECTED_EXPORTS = 42;
const METADATA_FILES = ['README.md', 'LICENSE', 'CHANGELOG.md', 'package.json'];
const DEPENDENCY_FIELDS = ['dependencies', 'optionalDependencies', 'peerDependencies'];
const WORKSPACE_RANGE = 'workspace:*';
const ARCHIVE_ENTRY_TYPES = new Set(['Directory', 'File', 'OldFile']);
const NPM_COMMAND = process.platform === 'win32' ? 'npm.cmd' : 'npm';

const fail = (message) => {
  throw new Error(`package-consumer-smoke: ${message}`);
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

const containsPath = (parent, child) => {
  const pathFromParent = relative(resolve(parent), resolve(child));
  return pathFromParent !== ''
    && pathFromParent !== '..'
    && !pathFromParent.startsWith(`..${sep}`)
    && !isAbsolute(pathFromParent)
    && !win32.isAbsolute(pathFromParent);
};

const containsOrMatchesPath = (parent, child) => {
  return resolve(parent) === resolve(child) || containsPath(parent, child);
};

const assertValidPackageName = (name) => {
  if (typeof name !== 'string') {
    fail(`invalid npm package name: ${String(name)}`);
  }
  const validation = validatePackageName(name);
  const validExistingCorePackage = validation.validForOldPackages === true
    && builtinModules.includes(name);
  if (validation.validForNewPackages !== true && !validExistingCorePackage) {
    const reasons = [...(validation.errors ?? []), ...(validation.warnings ?? [])].join('; ');
    fail(`invalid npm package name: ${name}${reasons === '' ? '' : ` (${reasons})`}`);
  }
  return name;
};

const packageDestinationFor = (nodeModulesDirectory, name) => {
  const packageName = assertValidPackageName(name);
  const destination = resolve(nodeModulesDirectory, ...packageName.split('/'));
  if (!containsPath(nodeModulesDirectory, destination)) {
    fail(`package destination escapes node_modules: ${packageName}`);
  }
  return destination;
};

const listFiles = (directory) => {
  return readdirSync(directory, { 'withFileTypes': true }).flatMap((entry) => {
    const path = join(directory, entry.name);
    if (entry.isSymbolicLink()) {
      fail(`symlink in isolated package tree: ${path}`);
    }
    if (entry.isDirectory()) {
      return listFiles(path);
    }
    if (!entry.isFile()) {
      fail(`special file in isolated package tree: ${path}`);
    }
    return [path];
  });
};

const isolatedEnvironment = (overrides = {}) => {
  return {
    ...process.env,
    'NODE_OPTIONS': '',
    'NODE_PATH': '',
    'npm_config_ignore_scripts': 'true',
    'npm_config_offline': 'true',
    ...overrides
  };
};

const runCommand = (command, args, options = {}) => {
  const timeout = options.timeout ?? 20_000;
  const expectedStatus = options.expectedStatus ?? 0;
  const result = spawnSync(command, args, {
    'cwd': options.cwd ?? ROOT,
    'encoding': 'utf8',
    'env': options.env ?? isolatedEnvironment(),
    'maxBuffer': 64 * 1024 * 1024,
    timeout,
    'windowsHide': true
  });
  if (result.error?.code === 'ETIMEDOUT') {
    fail(`${command} ${args.join(' ')} timed out after ${timeout}ms`);
  }
  if (result.error !== undefined || result.status !== expectedStatus) {
    const details = [result.stdout, result.stderr, result.error?.message]
      .filter((value) => typeof value === 'string' && value.trim() !== '')
      .join('\n');
    fail(`${command} ${args.join(' ')} failed${details === '' ? '' : `\n${details}`}`);
  }
  return options.output === 'stderr' ? result.stderr : result.stdout;
};

const withTemporaryDirectory = async (prefix, operation, baseDirectory = tmpdir()) => {
  mkdirSync(baseDirectory, { 'recursive': true });
  const directory = mkdtempSync(join(baseDirectory, prefix));
  try {
    return await operation(directory);
  } finally {
    rmSync(directory, { 'force': true, 'maxRetries': 3, 'recursive': true, 'retryDelay': 25 });
  }
};

const packageRecordsFor = (rootDirectory) => {
  const packagesDirectory = join(rootDirectory, 'packages');
  const records = readdirSync(packagesDirectory, { 'withFileTypes': true })
    .filter((entry) => {
      return entry.isDirectory() && existsSync(join(packagesDirectory, entry.name, 'package.json'));
    })
    .map((entry) => {
      const packageDirectory = join(packagesDirectory, entry.name);
      return {
        'directoryName': entry.name,
        'manifest': readJson(join(packageDirectory, 'package.json')),
        packageDirectory
      };
    })
    .filter(({ manifest }) => manifest.private !== true)
    .toSorted((left, right) => left.directoryName.localeCompare(right.directoryName));
  if (records.length !== EXPECTED_PACKAGES) {
    fail(`expected ${EXPECTED_PACKAGES} public packages, found ${records.length}`);
  }
  return records;
};

const packageNameFor = (specifier) => {
  return specifier.startsWith('@')
    ? specifier.split('/').slice(0, 2).join('/')
    : specifier.split('/')[0];
};

const consumerSpecifier = (packageName, subpath) => {
  return subpath === '.' ? packageName : `${packageName}${subpath.slice(1)}`;
};

const archivePathFor = (entry) => {
  const rawPath = entry.path;
  if (
    typeof rawPath !== 'string'
    || rawPath === ''
    || rawPath.includes('\\')
    || isAbsolute(rawPath)
    || win32.isAbsolute(rawPath)
    || rawPath !== posix.normalize(rawPath)
  ) {
    fail(`unsafe archive entry: ${String(rawPath)}`);
  }
  const segments = rawPath.endsWith('/')
    ? rawPath.slice(0, -1).split('/')
    : rawPath.split('/');
  if (
    segments[0] !== 'package'
    || segments.some((segment) => segment === '' || segment === '.' || segment === '..')
  ) {
    fail(`unsafe archive entry: ${rawPath}`);
  }
  return segments.join('/');
};

const validateArchiveEntry = (entry, entryTypes) => {
  const path = archivePathFor(entry);
  if (!ARCHIVE_ENTRY_TYPES.has(entry.type)) {
    fail(`unsupported archive entry type ${entry.type}: ${path}`);
  }
  if (typeof entry.linkpath === 'string' && entry.linkpath !== '') {
    fail(`archive link entry rejected: ${path}`);
  }
  if (entryTypes.has(path)) {
    fail(`duplicate archive entry: ${path}`);
  }
  const segments = path.split('/');
  for (let index = 1; index < segments.length; index += 1) {
    const ancestor = segments.slice(0, index).join('/');
    const ancestorType = entryTypes.get(ancestor);
    if (ancestorType !== undefined && ancestorType !== 'Directory') {
      fail(`archive path pivots through ${ancestor}: ${path}`);
    }
  }
  if (
    entry.type !== 'Directory'
    && [...entryTypes.keys()].some((candidate) => candidate.startsWith(`${path}/`))
  ) {
    fail(`archive path replaces parent with file: ${path}`);
  }
  if (path.endsWith('.ts') && !path.endsWith('.d.ts')) {
    fail(`raw TypeScript in archive: ${path}`);
  }
  entryTypes.set(path, entry.type);
  return path;
};

const inspectArchive = async (archive) => {
  const entryTypes = new Map();
  let validationError;
  await listTar({
    'file': archive,
    'maxDecompressionRatio': 100,
    'onReadEntry': (entry) => {
      if (validationError === undefined) {
        try {
          validateArchiveEntry(entry, entryTypes);
        } catch (error) {
          validationError = error;
        }
      }
    },
    'strict': true
  });
  if (validationError !== undefined) {
    throw validationError;
  }
  if (entryTypes.size === 0) {
    fail('archive contains no entries');
  }
  for (const metadata of METADATA_FILES) {
    if (!entryTypes.has(`package/${metadata}`)) {
      fail(`archive missing ${metadata}`);
    }
  }
  return entryTypes.size;
};

const evidenceFor = (directory) => {
  return new Map(listFiles(directory).map((path) => {
    const packagePath = relative(directory, path).split(sep).join('/');
    const bytes = readFileSync(path);
    return [packagePath, {
      'hash': createHash('sha256').update(bytes).digest('hex'),
      'size': bytes.length
    }];
  }));
};

const assertMatchingEvidence = (stageDirectory, extractedDirectory) => {
  const staged = evidenceFor(stageDirectory);
  const extracted = evidenceFor(extractedDirectory);
  if (staged.size !== extracted.size) {
    fail(`archive evidence count differs: staged=${staged.size}, extracted=${extracted.size}`);
  }
  for (const [path, expected] of staged) {
    const actual = extracted.get(path);
    if (
      actual === undefined
      || actual.hash !== expected.hash
      || actual.size !== expected.size
    ) {
      fail(`archive bytes differ from validated stage: ${path}`);
    }
  }
  return extracted.size;
};

const assertNewExtractionDestination = (privateRoot, destination) => {
  const rootStats = lstatSync(privateRoot, { 'throwIfNoEntry': false });
  if (rootStats === undefined || !rootStats.isDirectory() || rootStats.isSymbolicLink()) {
    fail(`archive private root is not a real directory: ${privateRoot}`);
  }
  if (!containsPath(privateRoot, destination)) {
    fail(`archive extraction target escapes private root: ${destination}`);
  }
  if (lstatSync(destination, { 'throwIfNoEntry': false }) !== undefined) {
    fail(`archive extraction target already exists: ${destination}`);
  }
  const realRoot = realpathSync(privateRoot);
  const realParent = realpathSync(dirname(destination));
  if (!containsOrMatchesPath(realRoot, realParent)) {
    fail(`archive extraction target resolves outside private root: ${destination}`);
  }
};

const extractArchive = async (archive, destination, stageDirectory, privateRoot) => {
  assertNewExtractionDestination(privateRoot, destination);
  let snapshotDirectory;
  let destinationCreated = false;
  try {
    snapshotDirectory = mkdtempSync(join(realpathSync(privateRoot), '.archive-snapshot-'));
    const snapshot = join(snapshotDirectory, 'package.tgz');
    writeFileSync(snapshot, readFileSync(archive), { 'flag': 'wx', 'mode': 0o400 });
    const archiveHash = createHash('sha256').update(readFileSync(snapshot)).digest('hex');
    const entries = await inspectArchive(snapshot);
    const inspectedHash = createHash('sha256').update(readFileSync(snapshot)).digest('hex');
    if (archiveHash !== inspectedHash) {
      fail(`private archive snapshot changed during inspection: ${snapshot}`);
    }
    assertNewExtractionDestination(privateRoot, destination);
    mkdirSync(destination);
    destinationCreated = true;
    await extractTar({
      'cwd': destination,
      'file': snapshot,
      'maxDecompressionRatio': 100,
      'maxDepth': 128,
      'noMtime': true,
      'preserveOwner': false,
      'preservePaths': false,
      'strict': true,
      'strip': 1,
      'unlink': true
    });
    const extractedHash = createHash('sha256').update(readFileSync(snapshot)).digest('hex');
    if (archiveHash !== extractedHash) {
      fail(`private archive snapshot changed during extraction: ${snapshot}`);
    }
    assertMatchingEvidence(stageDirectory, destination);
    return entries;
  } catch (error) {
    if (destinationCreated) {
      rmSync(destination, { 'force': true, 'recursive': true });
    }
    throw error;
  } finally {
    if (snapshotDirectory !== undefined) {
      rmSync(snapshotDirectory, { 'force': true, 'recursive': true });
    }
  }
};

const validatePackageLayout = (packageDirectory, manifest, expectedArtifacts) => {
  for (const metadata of METADATA_FILES) {
    const path = join(packageDirectory, metadata);
    if (!existsSync(path) || !statSync(path).isFile()) {
      fail(`package ${manifest.name} missing ${metadata}`);
    }
  }
  if (!isRecord(manifest.exports)) {
    fail(`package ${manifest.name} has no exports`);
  }
  for (const [subpath, targets] of Object.entries(manifest.exports)) {
    if (!isRecord(targets) || Object.keys(targets).join(',') !== 'types,import') {
      fail(`package ${manifest.name} has invalid export conditions for ${subpath}`);
    }
    for (const condition of ['types', 'import']) {
      const target = targets[condition];
      if (typeof target !== 'string' || !existsSync(join(packageDirectory, target))) {
        fail(`package ${manifest.name} missing ${condition} target for ${subpath}`);
      }
    }
  }
  const files = listFiles(packageDirectory);
  const rawTypeScript = files.filter((path) => path.endsWith('.ts') && !path.endsWith('.d.ts'));
  if (rawTypeScript.length > 0) {
    fail(`package ${manifest.name} contains raw TypeScript`);
  }
  const artifacts = files.filter((path) => {
    return relative(join(packageDirectory, 'dist'), path).split(sep)[0] !== '..';
  });
  if (artifacts.length !== expectedArtifacts) {
    fail(`package ${manifest.name} expected ${expectedArtifacts} artifacts, found ${artifacts.length}`);
  }
  return artifacts.length;
};

const validateTotals = (totals) => {
  const expected = {
    'archives': EXPECTED_PACKAGES,
    'artifacts': EXPECTED_ARTIFACTS,
    'exports': EXPECTED_EXPORTS,
    'packages': EXPECTED_PACKAGES,
    'sources': EXPECTED_SOURCES
  };
  for (const [field, value] of Object.entries(expected)) {
    if (totals[field] !== value) {
      fail(`expected ${field}=${value}, found ${String(totals[field])}`);
    }
  }
  return totals;
};

const dependencyEntriesFor = (manifest) => {
  const entries = [];
  for (const field of DEPENDENCY_FIELDS) {
    const dependencies = manifest[field] ?? {};
    if (!isRecord(dependencies)) {
      fail(`invalid ${field} for ${manifest.name}`);
    }
    for (const [name, range] of Object.entries(dependencies)) {
      assertValidPackageName(name);
      if (typeof range !== 'string' || (range !== WORKSPACE_RANGE && validRange(range) === null)) {
        fail(`invalid ${field} range for ${manifest.name}: ${name}=${String(range)}`);
      }
      const optional = field === 'optionalDependencies'
        || (field === 'peerDependencies' && manifest.peerDependenciesMeta?.[name]?.optional === true);
      entries.push({
        field,
        name,
        optional,
        range
      });
    }
  }
  return entries;
};

const assertDependencyVersion = (name, range, manifest, resolverDirectory) => {
  if (
    manifest.name !== name
    || typeof manifest.name !== 'string'
    || typeof manifest.version !== 'string'
    || (range !== WORKSPACE_RANGE && !satisfies(manifest.version, range))
  ) {
    fail(
      `installed ${name}@${String(manifest.version)} does not satisfy ${range} for ${resolverDirectory}`
    );
  }
};

const installedPackageFor = (name, range, resolverDirectory) => {
  assertValidPackageName(name);
  let current = resolve(resolverDirectory);
  while (true) {
    const candidate = packageDestinationFor(join(current, 'node_modules'), name);
    const candidateStats = lstatSync(candidate, { 'throwIfNoEntry': false });
    if (candidateStats !== undefined) {
      if (!candidateStats.isDirectory() && !candidateStats.isSymbolicLink()) {
        fail(`closest installed dependency candidate is not a directory: ${candidate}`);
      }
      const manifestPath = join(candidate, 'package.json');
      if (!existsSync(manifestPath)) {
        fail(`closest installed dependency candidate has no package.json: ${candidate}`);
      }
      let candidateManifest;
      try {
        candidateManifest = readJson(manifestPath);
      } catch (error) {
        fail(`closest installed dependency candidate has invalid package.json: ${candidate}\n${errorMessageFor(error)}`);
      }
      if (candidateManifest.name !== name) {
        fail(
          `closest installed dependency candidate has name ${String(candidateManifest.name)}, expected ${name}: ${candidate}`
        );
      }
      const source = realpathSync(candidate);
      const manifest = readJson(join(source, 'package.json'));
      assertDependencyVersion(name, range, manifest, resolverDirectory);
      return source;
    }
    const parent = dirname(current);
    if (parent === current) {
      return undefined;
    }
    current = parent;
  }
};

const copyPackage = (source, target) => {
  const sourceRoot = realpathSync(source);
  mkdirSync(dirname(target), { 'recursive': true });
  cpSync(sourceRoot, target, {
    'dereference': true,
    'filter': (sourcePath) => {
      const sourceRelativePath = relative(sourceRoot, sourcePath);
      if (
        sourceRelativePath === '..'
        || sourceRelativePath.startsWith(`..${sep}`)
        || isAbsolute(sourceRelativePath)
        || win32.isAbsolute(sourceRelativePath)
      ) {
        fail(`package copy escaped source path: ${sourcePath}`);
      }
      if (sourceRelativePath.split(sep)[0] === 'node_modules') {
        return false;
      }
      const realSourcePath = realpathSync(sourcePath);
      if (!containsOrMatchesPath(sourceRoot, realSourcePath)) {
        fail(`package copy link escapes source root: ${sourcePath}`);
      }
      return true;
    },
    'recursive': true
  });
  listFiles(target);
};

const copyExternalClosure = (
  dependency,
  resolverDirectory,
  targetNodeModules,
  installed
) => {
  const source = installedPackageFor(dependency.name, dependency.range, resolverDirectory);
  if (source === undefined) {
    if (dependency.optional) {
      return;
    }
    fail(`missing installed external dependency ${dependency.name} for ${resolverDirectory}`);
  }
  const target = packageDestinationFor(targetNodeModules, dependency.name);
  const previousSource = installed.get(target);
  if (previousSource !== undefined) {
    if (previousSource !== source) {
      fail(`conflicting isolated dependency versions for ${dependency.name}`);
    }
    return;
  }
  installed.set(target, source);
  copyPackage(source, target);
  const manifest = readJson(join(source, 'package.json'));
  for (const dependency of dependencyEntriesFor(manifest)) {
    const dependencyNodeModules = dependency.field === 'peerDependencies'
      ? targetNodeModules
      : join(target, 'node_modules');
    copyExternalClosure(
      dependency,
      source,
      dependencyNodeModules,
      installed
    );
  }
};

const installTarget = (
  targetRecord,
  recordsByName,
  extractedByName,
  consumerDirectory
) => {
  const nodeModulesDirectory = join(consumerDirectory, 'node_modules');
  mkdirSync(nodeModulesDirectory, { 'recursive': true });
  const installedInternal = new Set();
  const installedExternal = new Map();
  const queue = [targetRecord.manifest.name];
  while (queue.length > 0) {
    const name = queue.shift();
    if (typeof name !== 'string' || installedInternal.has(name)) {
      continue;
    }
    const record = recordsByName.get(name);
    const source = extractedByName.get(name);
    if (record === undefined || source === undefined) {
      fail(`missing packed internal dependency ${name}`);
    }
    copyPackage(source, packageDestinationFor(nodeModulesDirectory, name));
    installedInternal.add(name);
    for (const dependency of dependencyEntriesFor(record.manifest)) {
      if (recordsByName.has(dependency.name)) {
        const internalSource = extractedByName.get(dependency.name);
        if (internalSource === undefined) {
          fail(`missing packed internal dependency ${dependency.name}`);
        }
        const internalManifest = readJson(join(internalSource, 'package.json'));
        assertDependencyVersion(
          dependency.name,
          dependency.range,
          internalManifest,
          record.packageDirectory
        );
        queue.push(dependency.name);
      } else {
        copyExternalClosure(
          dependency,
          record.packageDirectory,
          nodeModulesDirectory,
          installedExternal
        );
      }
    }
  }
  listFiles(nodeModulesDirectory);
  return {
    'externalPackages': installedExternal.size,
    'internalPackages': installedInternal.size
  };
};

const writeConsumer = (consumerDirectory, specifiers) => {
  const imports = specifiers.map((specifier, index) => {
    return `import * as module${index} from ${JSON.stringify(specifier)};`;
  });
  const identifiers = specifiers.map((_, index) => `module${index}`);
  writeFileSync(
    join(consumerDirectory, 'consumer.ts'),
    `${imports.join('\n')}\n\nexport const importedModules = [${identifiers.join(', ')}];\n`
  );
  writeFileSync(
    join(consumerDirectory, 'isolation-hooks.mjs'),
    `${[
      "import { realpathSync } from 'node:fs';",
      "import { registerHooks } from 'node:module';",
      "import { dirname, isAbsolute, relative, sep, win32 } from 'node:path';",
      "import { fileURLToPath } from 'node:url';",
      '',
      'const CONSUMER_ROOT = realpathSync(dirname(fileURLToPath(import.meta.url)));',
      'const isContained = (path) => {',
      '  const pathFromRoot = relative(CONSUMER_ROOT, path);',
      "  return pathFromRoot === ''",
      "    || (pathFromRoot !== '..'",
      '      && !pathFromRoot.startsWith(`..${sep}`)',
      '      && !isAbsolute(pathFromRoot)',
      '      && !win32.isAbsolute(pathFromRoot));',
      '};',
      '',
      'registerHooks({',
      '  resolve(specifier, context, nextResolve) {',
      '    const resolution = nextResolve(specifier, context);',
      "    if (resolution.url.startsWith('node:')) {",
      '      return resolution;',
      '    }',
      "    if (!resolution.url.startsWith('file:')) {",
      '      throw new Error(`runtime resolution uses unsupported URL: ${resolution.url}`);',
      '    }',
      '    const resolvedPath = realpathSync(fileURLToPath(resolution.url));',
      '    if (!isContained(resolvedPath)) {',
      '      throw new Error(`runtime resolution escaped isolated root: ${resolvedPath}`);',
      '    }',
      '    return resolution;',
      '  }',
      '});',
      ''
    ].join('\n')}`
  );
  writeFileSync(
    join(consumerDirectory, 'consumer.mjs'),
    `${imports.join('\n')}\n\nconsole.log(JSON.stringify({ "imports": ${identifiers.length} }));\n`
  );
  writeFileSync(
    join(consumerDirectory, 'package.json'),
    `${JSON.stringify({ 'private': true, 'type': 'module' }, null, 2)}\n`
  );
  writeFileSync(
    join(consumerDirectory, 'tsconfig.json'),
    `${JSON.stringify({
      'compilerOptions': {
        'exactOptionalPropertyTypes': true,
        'lib': ['ES2023'],
        'module': 'NodeNext',
        'moduleResolution': 'NodeNext',
        'noEmit': true,
        'noUncheckedIndexedAccess': true,
        'skipLibCheck': false,
        'strict': true,
        'target': 'ES2023',
        'typeRoots': ['./node_modules/@types'],
        'types': []
      },
      'files': ['consumer.ts']
    }, null, 2)}\n`
  );
};

const assertIsolatedTypeScriptResolution = (consumerDirectory) => {
  const consumerRoot = realpathSync(consumerDirectory);
  const configPath = join(consumerRoot, 'tsconfig.json');
  const config = typescript.readConfigFile(configPath, typescript.sys.readFile);
  if (config.error !== undefined) {
    fail(`TypeScript could not read isolated consumer config: ${configPath}`);
  }
  const parsed = typescript.parseJsonConfigFileContent(
    config.config,
    typescript.sys,
    consumerRoot,
    undefined,
    configPath
  );
  const program = typescript.createProgram({
    'options': parsed.options,
    'rootNames': parsed.fileNames
  });
  for (const sourceFile of program.getSourceFiles()) {
    if (program.isSourceFileDefaultLibrary(sourceFile)) {
      continue;
    }
    const resolvedPath = realpathSync(sourceFile.fileName);
    if (!containsOrMatchesPath(consumerRoot, resolvedPath)) {
      fail(`TypeScript resolution escaped isolated consumer root: ${resolvedPath}`);
    }
  }
};

const errorMessageFor = (error) => {
  return error instanceof Error ? error.message : String(error);
};

const verifyConsumer = (consumerDirectory, specifiers, typescript) => {
  writeConsumer(consumerDirectory, specifiers);
  const failures = [];
  try {
    runCommand(process.execPath, [
      typescript,
      '--project',
      'tsconfig.json'
    ], {
      'cwd': consumerDirectory,
      'timeout': 60_000
    });
    assertIsolatedTypeScriptResolution(consumerDirectory);
  } catch (error) {
    failures.push(`TypeScript: ${errorMessageFor(error)}`);
  }

  let runtimeImports;
  try {
    const runtimeOutput = runCommand(process.execPath, [
      '--import',
      pathToFileURL(join(consumerDirectory, 'isolation-hooks.mjs')).href,
      'consumer.mjs'
    ], {
      'cwd': consumerDirectory,
      'timeout': 30_000
    });
    const runtime = JSON.parse(runtimeOutput);
    runtimeImports = runtime.imports;
  } catch (error) {
    failures.push(`Runtime: ${errorMessageFor(error)}`);
  }

  if (failures.length > 0) {
    fail(`isolated consumer verification failed\n${failures.join('\n')}`);
  }
  if (runtimeImports !== specifiers.length) {
    fail(`expected ${specifiers.length} runtime imports, found ${String(runtimeImports)}`);
  }
  return runtimeImports;
};

const verifyCli = (nodeModulesDirectory, record, consumerDirectory) => {
  const installedDirectory = packageDestinationFor(nodeModulesDirectory, record.manifest.name);
  const installedManifest = readJson(join(installedDirectory, 'package.json'));
  const target = installedManifest.bin?.iridis;
  if (typeof target !== 'string' || !target.startsWith('./dist/')) {
    fail('invalid CLI bin target');
  }
  const executable = resolve(installedDirectory, target);
  if (!containsPath(installedDirectory, executable) || !existsSync(executable)) {
    fail('CLI bin target escapes or is missing');
  }
  const firstLine = readFileSync(executable, 'utf8').split(/\r?\n/u)[0];
  if (firstLine !== '#!/usr/bin/env node') {
    fail('CLI bin is missing its Node shebang');
  }
  if (process.platform !== 'win32' && (statSync(executable).mode & 0o111) === 0) {
    fail('CLI bin is not executable');
  }
  const output = runCommand(process.execPath, [executable], {
    'cwd': consumerDirectory,
    'expectedStatus': 1,
    'output': 'stderr',
    'timeout': 20_000
  });
  if (!output.includes('Usage:')) {
    fail('CLI help output is missing Usage:');
  }
  return target;
};

const packArchive = (publishDirectory, archivesDirectory, cacheDirectory) => {
  const packOutput = runCommand(NPM_COMMAND, [
    'pack',
    publishDirectory,
    '--pack-destination',
    archivesDirectory,
    '--json',
    '--cache',
    cacheDirectory,
    '--ignore-scripts',
    '--offline'
  ], {
    'env': isolatedEnvironment({
      'npm_config_cache': cacheDirectory,
      'npm_config_registry': 'http://127.0.0.1:9/'
    }),
    'timeout': 60_000
  });
  const result = JSON.parse(packOutput);
  const packed = Array.isArray(result) ? result[0] : undefined;
  if (!isRecord(packed) || typeof packed.filename !== 'string') {
    fail(`npm pack returned no archive for ${publishDirectory}`);
  }
  const archive = resolve(archivesDirectory, packed.filename);
  if (!containsPath(archivesDirectory, archive) || !existsSync(archive)) {
    fail(`npm pack returned an unsafe archive path: ${packed.filename}`);
  }
  return archive;
};

const stage = (rootDirectory = ROOT) => {
  const records = packageRecordsFor(rootDirectory);
  return packagePipeline.prepare(
    records.map(({ directoryName }) => directoryName),
    rootDirectory
  );
};

const smoke = async (rootDirectory = ROOT) => {
  const records = packageRecordsFor(rootDirectory);
  const recordsByName = new Map(records.map((record) => [record.manifest.name, record]));
  const sourceCount = records.reduce((total, { packageDirectory }) => {
    return total + listFiles(join(packageDirectory, 'src')).filter((path) => {
      return path.endsWith('.ts') && !path.endsWith('.d.ts');
    }).length;
  }, 0);
  const publishDirectories = stage(rootDirectory);
  return withTemporaryDirectory('iridis-consumer-', async (temporaryDirectory) => {
    const archivesDirectory = join(temporaryDirectory, 'archives');
    const cacheDirectory = join(temporaryDirectory, 'npm-cache');
    const extractedDirectory = join(temporaryDirectory, 'extracted');
    const consumersDirectory = join(temporaryDirectory, 'consumers');
    mkdirSync(archivesDirectory, { 'recursive': true });
    mkdirSync(extractedDirectory, { 'recursive': true });
    mkdirSync(consumersDirectory, { 'recursive': true });

    let artifactCount = 0;
    let exportCount = 0;
    const archives = [];
    const extractedByName = new Map();
    for (const [index, record] of records.entries()) {
      const publishDirectory = publishDirectories[index];
      if (publishDirectory === undefined) {
        fail(`missing publish stage for ${record.manifest.name}`);
      }
      const stagedManifest = readJson(join(publishDirectory, 'package.json'));
      const expectedArtifacts = listFiles(join(record.packageDirectory, 'src'))
        .filter((path) => path.endsWith('.ts') && !path.endsWith('.d.ts'))
        .length * 4;
      artifactCount += validatePackageLayout(
        publishDirectory,
        stagedManifest,
        expectedArtifacts
      );
      exportCount += Object.keys(stagedManifest.exports).length;
      const archive = packArchive(publishDirectory, archivesDirectory, cacheDirectory);
      const installedDirectory = join(extractedDirectory, record.directoryName);
      await extractArchive(
        archive,
        installedDirectory,
        publishDirectory,
        temporaryDirectory
      );
      validatePackageLayout(installedDirectory, stagedManifest, expectedArtifacts);
      archives.push(archive);
      extractedByName.set(stagedManifest.name, installedDirectory);
    }

    const actualArchives = readdirSync(archivesDirectory)
      .filter((path) => path.endsWith('.tgz'));
    if (actualArchives.length !== archives.length) {
      fail(`expected ${archives.length} archive files, found ${actualArchives.length}`);
    }

    let cli;
    let runtimeImports = 0;
    let externalPackages = 0;
    for (const record of records) {
      const consumerDirectory = join(consumersDirectory, record.directoryName);
      mkdirSync(consumerDirectory, { 'recursive': true });
      const closure = installTarget(
        record,
        recordsByName,
        extractedByName,
        consumerDirectory
      );
      externalPackages += closure.externalPackages;
      const extracted = extractedByName.get(record.manifest.name);
      if (extracted === undefined) {
        fail(`missing extracted target ${record.manifest.name}`);
      }
      const installedManifest = readJson(join(extracted, 'package.json'));
      const specifiers = Object.keys(installedManifest.exports).map((subpath) => {
        return consumerSpecifier(installedManifest.name, subpath);
      });
      const typescript = join(rootDirectory, 'node_modules', 'typescript', 'bin', 'tsc');
      runtimeImports += verifyConsumer(consumerDirectory, specifiers, typescript);
      if (record.manifest.name === '@studnicky/iridis-cli') {
        cli = verifyCli(join(consumerDirectory, 'node_modules'), record, consumerDirectory);
      }
    }

    if (runtimeImports !== EXPECTED_EXPORTS) {
      fail(`expected ${EXPECTED_EXPORTS} isolated runtime imports, found ${runtimeImports}`);
    }
    const totals = validateTotals({
      'archives': archives.length,
      'artifacts': artifactCount,
      'exports': exportCount,
      'packages': records.length,
      'sources': sourceCount
    });
    return {
      ...totals,
      cli,
      'consumerRoots': records.length,
      externalPackages,
      runtimeImports,
      'typecheck': 'strict isolated NodeNext'
    };
  });
};

export const packageConsumerSmoke = Object.freeze({
  extractArchive,
  installTarget,
  packArchive,
  'run': smoke,
  runCommand,
  stage,
  validatePackageLayout,
  validateTotals,
  verifyConsumer,
  verifyCli,
  withTemporaryDirectory
});

if (import.meta.main) {
  if (process.argv[2] === '--stage') {
    console.log(JSON.stringify({ 'staged': packageConsumerSmoke.stage().length }));
  } else {
    console.log(JSON.stringify(await packageConsumerSmoke.run(), null, 2));
  }
}
