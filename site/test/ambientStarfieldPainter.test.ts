import assert from 'node:assert/strict';
import { test } from 'node:test';

import type { AmbientStarContextInterface } from '../app/components/layout/ambient/AmbientStarContextInterface.ts';
import type { AmbientStarLayerInterface } from '../app/components/layout/ambient/AmbientStarLayerInterface.ts';

import { AmbientStarfieldPainter } from '../app/components/layout/ambient/AmbientStarfieldPainter.ts';

class RecordingStarContext implements AmbientStarContextInterface {
  public arcs: number[][] = [];
  public moves = 0;
  public paths = 0;
  public clears = 0;
  public fills = 0;
  public fillStyle: CanvasGradient | CanvasPattern | string = '';
  public globalAlpha = 1;
  public shadowBlur = 0;
  public shadowColor = '';

  public arc(x: number, y: number, radius: number): void {
    this.arcs.push([x, y, radius]);
  }

  public beginPath(): void {
    this.paths += 1;
  }

  public clearRect(): void {
    this.clears += 1;
  }

  public fill(): void {
    this.fills += 1;
  }

  public moveTo(): void {
    this.moves += 1;
  }
}

class StarLayerFixture {
  static readonly speed = 1;

  static layer(rotateSeconds: number): AmbientStarLayerInterface {
    const result = {
      'blurPx': 1,
      'color': 'rgb(1 2 3)',
      'diameterPx': 3,
      'dots': [{ 'x': 100, 'y': 50 }, { 'x': 50, 'y': 50 }],
      'rotateSeconds': rotateSeconds,
      'twinkleDelaySeconds': 0,
      'twinkleSeconds': 4
    };

    return result;
  }
}

await test('twinkle opacity swings between the dim and bright opacity over one cycle', () => {
  const layer = StarLayerFixture.layer(200);
  const dim = AmbientStarfieldPainter.twinkleOpacity(layer, 0, StarLayerFixture.speed);
  const bright = AmbientStarfieldPainter.twinkleOpacity(layer, 2000, StarLayerFixture.speed);
  const next = AmbientStarfieldPainter.twinkleOpacity(layer, 4000, StarLayerFixture.speed);

  assert.ok(Math.abs(dim - AmbientStarfieldPainter.dimOpacity) < 1e-9);
  assert.ok(Math.abs(bright - AmbientStarfieldPainter.brightOpacity) < 1e-9);
  assert.ok(Math.abs(next - dim) < 1e-9);
});

await test('a faster theme speed shortens the twinkle cycle', () => {
  const layer = StarLayerFixture.layer(200);

  assert.ok(Math.abs(AmbientStarfieldPainter.twinkleOpacity(layer, 1000, 2) - AmbientStarfieldPainter.brightOpacity) < 1e-9);
});

await test('a negative rotation duration turns the layer the other way', () => {
  const forward = AmbientStarfieldPainter.rotation(StarLayerFixture.layer(200), 50_000, StarLayerFixture.speed);
  const reverse = AmbientStarfieldPainter.rotation(StarLayerFixture.layer(-200), 50_000, StarLayerFixture.speed);

  assert.ok(forward > 0);
  assert.ok(Math.abs(forward + reverse) < 1e-9);
  assert.ok(Math.abs(forward - Math.PI / 2) < 1e-9);
});

await test('painting clears once and draws one dot per placement, rotated about the canvas centre', () => {
  const context = new RecordingStarContext();
  const layer = StarLayerFixture.layer(200);

  AmbientStarfieldPainter.paint(context, 200, 100, [layer], 0, StarLayerFixture.speed);

  assert.equal(context.clears, 1);
  assert.equal(context.fills, 1);
  assert.equal(context.paths, 1);
  assert.equal(context.moves, layer.dots.length);
  assert.equal(context.arcs.length, layer.dots.length);
  assert.deepEqual(context.arcs[0], [200, 50, 1.5]);
  assert.deepEqual(context.arcs[1], [100, 50, 1.5]);
  assert.equal(context.shadowBlur, 1);
  assert.equal(context.fillStyle, 'rgb(1 2 3)');
});

await test('a quarter turn moves an off-centre dot onto the vertical axis', () => {
  const context = new RecordingStarContext();
  const layer = StarLayerFixture.layer(200);

  AmbientStarfieldPainter.paint(context, 200, 100, [layer], 50_000, StarLayerFixture.speed);
  const [x, y] = context.arcs[0] ?? [];

  assert.ok(Math.abs((x ?? 0) - 100) < 1e-6);
  assert.ok(Math.abs((y ?? 0) - 150) < 1e-6);
});
