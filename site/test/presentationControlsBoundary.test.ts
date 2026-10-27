import assert from 'node:assert/strict';
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { registerHooks } from 'node:module';
import { join } from 'node:path';
import { test } from 'node:test';
import { fileURLToPath } from 'node:url';

import * as NuxtImportsLoader from './fixtures/NuxtImportsLoader.mjs';

registerHooks(NuxtImportsLoader);

const composables = fileURLToPath(new URL('../app/composables', import.meta.url));
const controlsDirectory = join(composables, 'presentationControls');
class SourceTree {
  public static readonly browserGlobals = ['localStorage', 'document.', 'window.'];
  public static readonly exportForms = ['export type ', 'export interface ', 'export class '];
  public static readonly movedNames = [
    'RoleSortKeyType',
    'CvdTypeRegistry',
    'cvdPreviewTypes',
    'roleSortKeys',
    'sortedRoleContrastRows',
    'diagramScale',
    'diagramIsExpanded',
    'useNavigationTargets'
  ];
  public static readonly paletteDependencies = ['useIridis', 'workerRequestClient', 'browserWorkerPort', 'paletteResolve', 'paletteSession', 'WorkerMessageEntity'];

  public static files(directory: string): string[] {
    const found: string[] = [];
    const names = readdirSync(directory);
    for (let index = 0; index < names.length; index += 1) {
      const path = join(directory, names[index] ?? '');
      if (statSync(path).isDirectory()) {
        found.push(...SourceTree.files(path));
      } else {
        found.push(path);
      }
    }
    return found;
  }

  public static referencing(paths: readonly string[], needles: readonly string[]): string[] {
    const hits: string[] = [];
    for (let pathIndex = 0; pathIndex < paths.length; pathIndex += 1) {
      const path = paths[pathIndex] ?? '';
      const source = readFileSync(path, 'utf8');
      for (let needleIndex = 0; needleIndex < needles.length; needleIndex += 1) {
        const needle = needles[needleIndex] ?? '';
        if (source.includes(needle)) {
          hits.push(`${path} references ${needle}`);
        }
      }
    }
    return hits;
  }
}

await test('the presentation store never depends on palette resolution or the worker client', () => {
  const files = SourceTree.files(controlsDirectory);
  assert.ok(files.length > 0);
  assert.deepEqual(SourceTree.referencing(files, SourceTree.paletteDependencies), []);
});

await test('browser persistence lives only in the preferences bridge', () => {
  const files = SourceTree.files(controlsDirectory).filter((path) => {
    const retained = path.endsWith('PresentationPreferencesBridge.ts') === false;
    return retained;
  });
  assert.deepEqual(SourceTree.referencing(files, SourceTree.browserGlobals), []);
});

await test('useIridis no longer owns display-only state or exports the moved types', async () => {
  const path = join(composables, 'useIridis.ts');
  assert.deepEqual(SourceTree.referencing([path], SourceTree.movedNames), []);
  assert.deepEqual(SourceTree.referencing([path], SourceTree.exportForms), []);
  assert.throws(() => {
    statSync(join(composables, 'types', 'roleSortKeyType.ts'));
  });

  const { useIridis } = await import('../app/composables/useIridis.ts');
  const state = useIridis();
  assert.equal('cvdPreviewTypes' in state, false);
  assert.equal('roleSortKeys' in state, false);
  assert.equal('sortedRoleContrastRows' in state, false);
});
