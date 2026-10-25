import { InputEntity } from '@studnicky/iridis';
import { imagePlugin } from '@studnicky/iridis-image';
import { Engine } from '@studnicky/iridis/engine';
import { coreTasks } from '@studnicky/iridis/tasks';
import assert from 'node:assert/strict';
import { test } from 'node:test';

class GalleryHistogramFixture {
  static engine(taskNames: string[]): Engine {
    const engine = new Engine();
    for (let index = 0; index < coreTasks.length; index += 1) {
      const task = coreTasks.at(index);
      if (task !== undefined) {engine.tasks.register(task);}
    }
    engine.adopt(imagePlugin);
    engine.pipeline(taskNames);
    return engine;
  }

  static imageData(pixels: readonly [number, number, number, number][]): { 'data': Uint8ClampedArray; 'height': number; 'width': number; } {
    const data = new Uint8ClampedArray(pixels.length * 4);
    for (let index = 0; index < pixels.length; index += 1) {
      const pixel = pixels.at(index);
      if (pixel === undefined) {continue;}
      data[index * 4] = pixel[0];
      data[index * 4 + 1] = pixel[1];
      data[index * 4 + 2] = pixel[2];
      data[index * 4 + 3] = pixel[3];
    }
    return { 'data': data, 'height': 1, 'width': pixels.length };
  }

  static run(pixels: readonly [number, number, number, number][], gallery?: Record<string, number | string>) {
    const input = InputEntity.create({
      'colors': [GalleryHistogramFixture.imageData(pixels)],
      ...(gallery === undefined ? {} : { 'metadata': { 'gallery': gallery } })
    });
    const engine = GalleryHistogramFixture.engine(['intake:imagePixels', 'gallery:histogram']);
    const result = engine.run(input);
    return result;
  }
}

await test('GalleryHistogram bins weighted primary pixels and records metadata', () => {
  const pixels: [number, number, number, number][] = [];
  for (let index = 0; index < 100; index += 1) {pixels.push([255, 0, 0, 255]);}
  for (let index = 0; index < 50; index += 1) {pixels.push([0, 255, 0, 255]);}
  for (let index = 0; index < 25; index += 1) {pixels.push([0, 0, 255, 255]);}
  const state = GalleryHistogramFixture.run(pixels);
  assert.strictEqual(state.colors.length, 3);
  const totalWeight = state.colors.reduce((total, color) => {
    const result = total + (color.hints?.weight ?? 0);
    return result;
  }, 0);
  assert.strictEqual(totalWeight, 175);
  assert.ok('gallery:histogram' in state.metadata);
});

await test('GalleryHistogram excludes fully transparent pixels', () => {
  const state = GalleryHistogramFixture.run([[255, 0, 0, 255], [0, 0, 0, 0]]);
  assert.strictEqual(state.colors.length, 1);
  assert.strictEqual(state.colors.at(0)?.hints?.weight, 1);
});

await test('GalleryHistogram handles an empty image without a null sentinel', () => {
  const state = GalleryHistogramFixture.run([]);
  assert.strictEqual(state.colors.length, 0);
});

await test('GalleryHistogram honors configured histogram precision at both bounds', () => {
  const pixels: [number, number, number, number][] = [[255, 0, 0, 255], [0, 255, 0, 255], [0, 0, 255, 255], [255, 255, 0, 255]];
  const lowPrecision = GalleryHistogramFixture.run(pixels, { 'histogramBits': 3 });
  const highPrecision = GalleryHistogramFixture.run(pixels, { 'histogramBits': 7 });
  assert.ok(lowPrecision.colors.length > 0);
  assert.ok(highPrecision.colors.length >= lowPrecision.colors.length);
});

await test('GalleryHistogram applies lightness and chroma filters', () => {
  const pixels: [number, number, number, number][] = [[0, 0, 0, 255], [255, 255, 255, 255], [255, 0, 0, 255]];
  const lightOnly = GalleryHistogramFixture.run(pixels, { 'lightnessMax': 1, 'lightnessMin': 0.9 });
  const neutralOnly = GalleryHistogramFixture.run(pixels, { 'chromaMax': 0.01, 'chromaMin': 0 });
  assert.ok(lightOnly.colors.length >= 1);
  assert.ok(neutralOnly.colors.length >= 1);
});

await test('GalleryHistogram feeds the extraction pipeline with bounded output', () => {
  const pixels: [number, number, number, number][] = [];
  for (let index = 0; index < 100; index += 1) {pixels.push([255, 0, 0, 255], [0, 255, 0, 255], [0, 0, 255, 255]);}
  const input = InputEntity.create({
    'colors': [GalleryHistogramFixture.imageData(pixels)],
    'metadata': { 'gallery': { 'algorithm': 'median-cut', 'k': 3 } }
  });
  const engine = GalleryHistogramFixture.engine(['intake:imagePixels', 'gallery:histogram', 'gallery:extract']);
  const state = engine.run(input);
  assert.ok(state.colors.length <= 3);
});
