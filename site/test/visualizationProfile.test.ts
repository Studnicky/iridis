import assert from 'node:assert/strict';
import { mkdirSync, mkdtempSync, readFileSync, realpathSync, rmSync, symlinkSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { isAbsolute, join, relative, resolve, sep } from 'node:path';
import { test } from 'node:test';

import { VisualizationProfileBudget, VisualizationProfileOperation, VisualizationProfileStaticFile } from '../visualization-profile.mjs';

await test('profile static files decode valid paths and remain contained under the public build', (context) => {
  const publicRoot = mkdtempSync(join(tmpdir(), 'iridis-profile-public-'));
  context.after(() => { rmSync(publicRoot, { 'force': true, 'recursive': true }); });
  mkdirSync(join(publicRoot, 'assets'));
  writeFileSync(join(publicRoot, 'index.html'), 'index');
  writeFileSync(join(publicRoot, '404.html'), 'missing');
  writeFileSync(join(publicRoot, 'assets', 'hello world.js'), 'script');

  const index = VisualizationProfileStaticFile.resolve(publicRoot, '/');
  const asset = VisualizationProfileStaticFile.resolve(publicRoot, '/assets/hello%20world.js?cache=1');
  const missing = VisualizationProfileStaticFile.resolve(publicRoot, '/missing.html');

  assert.equal(index.filePath, realpathSync(join(publicRoot, 'index.html')));
  assert.equal(index.statusCode, 200);
  assert.equal(asset.filePath, realpathSync(join(publicRoot, 'assets', 'hello world.js')));
  assert.equal(asset.statusCode, 200);
  assert.equal(missing.filePath, realpathSync(join(publicRoot, '404.html')));
  assert.equal(missing.statusCode, 404);

  const results = [index, asset, missing];
  const resultCount = results.length;
  for (let resultIndex = 0; resultIndex < resultCount; resultIndex += 1) {
    const result = results[resultIndex];
    if (result === undefined) { throw new Error('Profile result index must resolve'); }
    const relativePath = relative(realpathSync(publicRoot), result.filePath);
    assert.equal(isAbsolute(relativePath), false);
    assert.equal(relativePath === '..' || relativePath.startsWith(`..${sep}`), false);
  }
});

await test('profile static files reject traversal, dot segments, escaped paths, and symlink escapes', (context) => {
  const publicRoot = mkdtempSync(join(tmpdir(), 'iridis-profile-public-'));
  const outsideRoot = mkdtempSync(join(tmpdir(), 'iridis-profile-outside-'));
  context.after(() => {
    rmSync(publicRoot, { 'force': true, 'recursive': true });
    rmSync(outsideRoot, { 'force': true, 'recursive': true });
  });
  writeFileSync(join(publicRoot, 'index.html'), 'index');
  writeFileSync(join(outsideRoot, 'secret.txt'), 'secret');
  symlinkSync(join(outsideRoot, 'secret.txt'), join(publicRoot, 'linked-secret.txt'));

  const rejectedPaths = [
    '/../secret.txt',
    '/./index.html',
    '/assets/%2e%2e/secret.txt',
    '/%2E%2E%2Fsecret.txt',
    '/%5csecret.txt',
    '/%252e%252e/secret.txt',
    '//etc/passwd'
  ];
  const rejectedPathCount = rejectedPaths.length;
  for (let pathIndex = 0; pathIndex < rejectedPathCount; pathIndex += 1) {
    const requestPath = rejectedPaths[pathIndex];
    if (requestPath === undefined) { throw new Error('Rejected path index must resolve'); }
    assert.throws(() => { VisualizationProfileStaticFile.resolve(publicRoot, requestPath); }, TypeError);
  }

  assert.throws(
    () => { VisualizationProfileStaticFile.resolve(publicRoot, '/linked-secret.txt'); },
    TypeError
  );
});

await test('profile mounts generated assets beneath the declared Nuxt base path', (context) => {
  const publicRoot = mkdtempSync(join(tmpdir(), 'iridis-profile-public-'));
  context.after(() => { rmSync(publicRoot, { 'force': true, 'recursive': true }); });
  writeFileSync(join(publicRoot, 'index.html'), '<a href="/iridis/_nuxt/app.js">entry</a>');

  const basePath = VisualizationProfileStaticFile.basePath(publicRoot);
  assert.equal(basePath, '/iridis/');
  assert.equal(VisualizationProfileStaticFile.mountedRequestPath(basePath, '/iridis/'), '/');
  assert.equal(VisualizationProfileStaticFile.mountedRequestPath(basePath, '/iridis/_nuxt/app.js?cache=1'), '/_nuxt/app.js');
  assert.equal(VisualizationProfileStaticFile.mountedRequestPath(basePath, '/outside/app.js'), undefined);
});

await test('profile samples the owned visual targets after graph teardown and drives real D-pad buttons', () => {
  const profileSource = readFileSync(resolve(import.meta.dirname, '../visualization-profile.mjs'), 'utf8');
  const graphTarget = "const graphSurface = '.cg-cosmos canvas';";
  const mermaidTarget = "const mermaidSurface = '.dag-mermaid-frame svg';";
  const graphTeardown = 'await deactivateGraph(page);';
  const realDpadActivation = 'await clickVisibleButton(scope, name);';

  assert.equal(profileSource.includes(graphTarget), true);
  assert.equal(profileSource.includes(mermaidTarget), true);
  assert.equal(profileSource.indexOf(graphTeardown) < profileSource.indexOf(mermaidTarget), true);
  assert.equal(profileSource.includes(realDpadActivation), true);
  assert.equal(profileSource.includes("['graph', '.cg-wrap']"), false);
  assert.equal(profileSource.includes("['mermaid', '.dag-mermaid-frame']"), false);
});


await test('profile budget accepts the frame series a software-rendered headless browser sustains', () => {
  const report = [
    { 'avgMs': 143.25, 'frameCount': 83, 'maxMs': 350.1, 'name': 'graph', 'ok': true, 'p90Ms': 183.4 },
    { 'avgMs': 154.54, 'frameCount': 23, 'maxMs': 250, 'name': 'graphDpad', 'ok': true, 'p90Ms': 183.3 },
    { 'avgMs': 104.12, 'frameCount': 88, 'maxMs': 150.1, 'name': 'mermaid', 'ok': true, 'p90Ms': 150 }
  ];

  assert.deepEqual(VisualizationProfileBudget.failures(report), []);
});

await test('profile budget rejects a frozen or barely sampled target', () => {
  const report = [{
    'avgMs': 900,
    'frameCount': 3,
    'maxMs': 4000,
    'name': 'graph',
    'ok': true,
    'p90Ms': 1200
  }];

  assert.deepEqual(VisualizationProfileBudget.failures(report), [
    'target=graph frameCount=3 must be at least 5',
    'target=graph fps=1.1111111111111112 must be at least 2',
    'target=graph avgMs=900 must be at most 600',
    'target=graph maxMs=4000 must be at most 2000',
    'target=graph p90Ms=1200 must be at most 800'
  ]);
});


await test('profile CLI runs only when Node invokes its resolved entry module', () => {
  const modulePath = resolve(import.meta.dirname, '../visualization-profile.mjs');
  const moduleUrl = new URL('../visualization-profile.mjs', import.meta.url).href;

  assert.equal(VisualizationProfileOperation.isEntrypoint(['/usr/local/bin/node', modulePath], moduleUrl), true);
  assert.equal(VisualizationProfileOperation.isEntrypoint(['/usr/local/bin/node', 'site/other-script.mjs'], moduleUrl), false);
  assert.equal(VisualizationProfileOperation.isEntrypoint(['/usr/local/bin/node'], moduleUrl), false);
});

await test('profile CLI entrypoint is recognised through a symlinked path', (context) => {
  const linkRoot = mkdtempSync(join(tmpdir(), 'iridis-profile-link-'));
  context.after(() => { rmSync(linkRoot, { 'force': true, 'recursive': true }); });
  const modulePath = resolve(import.meta.dirname, '../visualization-profile.mjs');
  const linkedPath = join(linkRoot, 'linked-profile.mjs');
  symlinkSync(modulePath, linkedPath);
  const moduleUrl = new URL('../visualization-profile.mjs', import.meta.url).href;

  assert.equal(VisualizationProfileOperation.isEntrypoint(['/usr/local/bin/node', linkedPath], moduleUrl), true);
  assert.equal(VisualizationProfileOperation.isEntrypoint(['/usr/local/bin/node', join(linkRoot, 'missing.mjs')], moduleUrl), false);
});
