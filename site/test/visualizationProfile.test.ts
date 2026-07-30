import assert from 'node:assert/strict';
import { mkdirSync, mkdtempSync, realpathSync, rmSync, symlinkSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { isAbsolute, join, relative, sep } from 'node:path';
import { test } from 'node:test';

import { VisualizationProfileStaticFile } from '../visualization-profile.mjs';

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
    if (result.filePath === undefined) { throw new Error('Fixture paths must resolve to files'); }
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
