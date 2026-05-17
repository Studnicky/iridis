/**
 * Histogram + algorithm-switchable extract integration.
 *
 * Drives gallery:histogram and gallery:extract through the engine so
 * the interaction between weighted records and the algorithm dispatch
 * is exercised end-to-end.
 */
import { describe, it } from 'node:test';
import assert           from 'node:assert/strict';

import { Engine }    from '@studnicky/iridis/engine';
import { coreTasks } from '@studnicky/iridis/tasks';
import { imagePlugin } from '@studnicky/iridis-image';

function freshEngine(): Engine {
  const engine = new Engine();
  for (const t of coreTasks)    engine.tasks.register(t);
  engine.adopt(imagePlugin);
  return engine;
}

function buildImageData(pixels: readonly [number, number, number][]): { 'data': Uint8ClampedArray; 'width': number; 'height': number } {
  const data = new Uint8ClampedArray(pixels.length * 4);
  for (let i = 0; i < pixels.length; i++) {
    const px = pixels[i];
    if (px === undefined) continue;
    const [r, g, b] = px;
    data[i * 4]     = r;
    data[i * 4 + 1] = g;
    data[i * 4 + 2] = b;
    data[i * 4 + 3] = 255;
  }
  return { 'data': data, 'width': pixels.length, 'height': 1 };
}

describe('ImagePlugin :: gallery:histogram', () => {
  it('emits one record per non-empty bin with weight = pixel count', async () => {
    const engine = freshEngine();
    engine.pipeline(['intake:imagePixels', 'gallery:histogram']);

    // 100 near-red, 50 near-green, 25 near-blue, all collapsing into 3 bins.
    const reds   = Array(100).fill(null).map<[number, number, number]>(() => [255,   0,   0]);
    const greens = Array(50 ).fill(null).map<[number, number, number]>(() => [  0, 255,   0]);
    const blues  = Array(25 ).fill(null).map<[number, number, number]>(() => [  0,   0, 255]);

    const state = await engine.run({
      'colors': [buildImageData([...reds, ...greens, ...blues])],
    });

    assert.strictEqual(state.colors.length, 3, 'three non-empty bins');
    const total = state.colors.reduce((s, r) => s + (r.hints?.weight ?? 0), 0);
    assert.strictEqual(total, 175, 'total weight equals pixel count');

    const meta = state.metadata['gallery'] as { 'histogram'?: { 'totalPixels': number; 'binCount': number; 'bins': readonly { 'weight': number }[] } } | undefined;
    assert.ok(meta?.histogram !== undefined);
    assert.strictEqual(meta.histogram.totalPixels, 175);
    assert.strictEqual(meta.histogram.binCount, 3);
    assert.strictEqual(meta.histogram.bins[0]?.weight, 100, 'bins sorted by weight descending');
  });

  it('skips fully-transparent pixels', async () => {
    const engine = freshEngine();
    engine.pipeline(['intake:imagePixels', 'gallery:histogram']);

    const data = new Uint8ClampedArray(8);
    data[0] = 255; data[1] = 0; data[2] = 0; data[3] = 255; // opaque red
    data[4] = 0;   data[5] = 0; data[6] = 0; data[7] = 0;   // transparent

    const state = await engine.run({
      'colors': [{ 'data': data, 'width': 2, 'height': 1 }],
    });

    assert.strictEqual(state.colors.length, 1);
    assert.strictEqual(state.colors[0]?.hints?.weight, 1);
  });
});

describe('ImagePlugin :: gallery:extract algorithm dispatch', () => {
  it("defaults to median-cut when algorithm is unset", async () => {
    const engine = freshEngine();
    engine.pipeline(['intake:imagePixels', 'gallery:histogram', 'gallery:extract']);

    const pixels: [number, number, number][] = [];
    for (let i = 0; i < 200; i++) pixels.push([255, 0, 0]);
    for (let i = 0; i < 50;  i++) pixels.push([0, 0, 255]);

    const state = await engine.run({
      'colors':   [buildImageData(pixels)],
      'metadata': { 'gallery': { 'k': 2 } },
    });
    assert.ok(state.colors.length <= 2);
  });

  it('produces ≤ K clusters with algorithm = delta-e', async () => {
    const engine = freshEngine();
    engine.pipeline(['intake:imagePixels', 'gallery:histogram', 'gallery:extract']);

    const pixels: [number, number, number][] = [];
    for (let i = 0; i < 80;  i++) pixels.push([200,  10,  10]);
    for (let i = 0; i < 80;  i++) pixels.push([210,  20,  20]);
    for (let i = 0; i < 80;  i++) pixels.push([ 10, 200,  10]);
    for (let i = 0; i < 80;  i++) pixels.push([ 10,  10, 200]);

    const state = await engine.run({
      'colors':   [buildImageData(pixels)],
      'metadata': { 'gallery': { 'k': 3, 'algorithm': 'delta-e' } },
    });

    assert.ok(state.colors.length <= 3, `≤ K=3 clusters, got ${state.colors.length}`);
    const totalW = state.colors.reduce((s, r) => s + (r.hints?.weight ?? 0), 0);
    assert.strictEqual(totalW, 320, 'total weight preserved through extract');
  });

  it('records the chosen algorithm in logs (round-trip via state.metadata.gallery)', async () => {
    const engine = freshEngine();
    engine.pipeline(['intake:imagePixels', 'gallery:histogram', 'gallery:extract']);

    const pixels: [number, number, number][] = [
      [255,   0,   0], [255,   0,   0], [255,   0,   0],
      [  0, 255,   0], [  0, 255,   0],
    ];
    const state = await engine.run({
      'colors':   [buildImageData(pixels)],
      'metadata': { 'gallery': { 'k': 2, 'algorithm': 'median-cut' } },
    });
    const meta = state.metadata['gallery'] as { 'algorithm'?: string; 'dominantColors'?: unknown[] } | undefined;
    assert.strictEqual(meta?.algorithm, 'median-cut');
    assert.ok(Array.isArray(meta.dominantColors));
    assert.ok((meta.dominantColors as unknown[]).length <= 2);
  });
});
