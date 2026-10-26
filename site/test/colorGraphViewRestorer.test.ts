import assert from 'node:assert/strict';
import { test } from 'node:test';

import type { ColorGraphViewTargetInterface } from '../app/components/content/viz/ColorGraphViewTargetInterface.ts';

import { ColorGraphViewRestorer } from '../app/components/content/viz/ColorGraphViewRestorer.ts';
import { VirtualFrameScheduler } from './fixtures/VirtualFrameScheduler.ts';

/** A camera that lands an applied zoom a number of frames later, optionally landing a different value first. */
class LaggingCamera implements ColorGraphViewTargetInterface {
  public applied: number[] = [];

  public stuckAt: null | number = null;

  public zoom = 1;

  readonly #frames: VirtualFrameScheduler;

  readonly #lagFrames: number;

  readonly #wrongFirst: null | number;

  #landing: null | { readonly 'atMs': number;
    readonly 'zoom': number; } = null;

  public constructor(frames: VirtualFrameScheduler, lagFrames: number, wrongFirst: null | number) {
    this.#frames = frames;
    this.#lagFrames = lagFrames;
    this.#wrongFirst = wrongFirst;
  }

  public applyZoom(zoom: number): void {
    const wrong = this.applied.length === 0 ? this.#wrongFirst : null;

    this.applied.push(zoom);
    if (this.stuckAt === null) {
      this.#landing ??= {
        'atMs': this.#frames.nowMs + this.#lagFrames * VirtualFrameScheduler.frameMs,
        'zoom': wrong ?? zoom
      };
    } else {
      this.zoom = this.stuckAt;
    }
  }

  public readZoom(): number {
    const landing = this.#landing;

    if (landing !== null && this.#frames.nowMs >= landing.atMs) {
      this.zoom = landing.zoom;
      this.#landing = null;
    }

    return this.zoom;
  }
}

class RestoreExpectation {
  public static readonly zoom = 0.31;

  public static readonly wrongZoom = 0.2;

  public static readonly lag = 3;
}

class RestoreRun {
  public readonly camera: LaggingCamera;

  public readonly frames: VirtualFrameScheduler;

  public readonly restored: number[] = [];

  private constructor(frames: VirtualFrameScheduler, camera: LaggingCamera) {
    this.frames = frames;
    this.camera = camera;
  }

  public static start(lag: number, wrongFirst: null | number, zoom: number, stuckAt: null | number = null): RestoreRun {
    const frames = new VirtualFrameScheduler();
    const camera = new LaggingCamera(frames, lag, wrongFirst);
    const restorer = ColorGraphViewRestorer.create(camera, frames);
    const run = new RestoreRun(frames, camera);

    camera.stuckAt = stuckAt;
    restorer.start(zoom, (held) => {
      run.restored.push(held);
    });

    return run;
  }

  public step(): void {
    this.frames.advance(VirtualFrameScheduler.frameMs);
  }
}

await test('restoration completes on the first frame when the camera holds the zoom immediately', () => {
  const run = RestoreRun.start(0, null, RestoreExpectation.zoom);

  assert.deepEqual(run.restored, []);

  run.step();

  assert.deepEqual(run.restored, [RestoreExpectation.zoom]);
});

await test('restoration does not complete while the camera has not yet landed the zoom', () => {
  const run = RestoreRun.start(RestoreExpectation.lag, null, RestoreExpectation.zoom);

  run.step();

  assert.deepEqual(run.restored, []);

  for (let index = 0; index < ColorGraphViewRestorer.maximumAttempts && run.restored.length === 0; index += 1) {
    run.step();
  }

  assert.deepEqual(run.restored, [RestoreExpectation.zoom]);
  assert.equal(run.camera.zoom, RestoreExpectation.zoom);
});

await test('a camera that first lands a different zoom is corrected before completion', () => {
  const run = RestoreRun.start(0, RestoreExpectation.wrongZoom, RestoreExpectation.zoom);

  run.step();

  assert.deepEqual(run.restored, []);
  assert.equal(run.camera.applied.length, 2);

  run.step();

  assert.deepEqual(run.restored, [RestoreExpectation.zoom]);
  assert.equal(run.camera.zoom, RestoreExpectation.zoom);
});

await test('a camera that never holds the zoom completes after the attempt limit with the zoom it holds', () => {
  const run = RestoreRun.start(0, null, RestoreExpectation.zoom, RestoreExpectation.wrongZoom);

  for (let index = 0; index < ColorGraphViewRestorer.maximumAttempts + 2 && run.restored.length === 0; index += 1) {
    run.step();
  }

  assert.deepEqual(run.restored, [RestoreExpectation.wrongZoom]);
  assert.equal(run.camera.applied.length, ColorGraphViewRestorer.maximumAttempts);
});

await test('cancelling stops the verification and leaves no pending frame', () => {
  const frames = new VirtualFrameScheduler();
  const camera = new LaggingCamera(frames, 0, null);
  const restorer = ColorGraphViewRestorer.create(camera, frames);
  const restored: number[] = [];

  restorer.start(RestoreExpectation.zoom, (held) => {
    restored.push(held);
  });
  restorer.cancel();
  frames.advance(VirtualFrameScheduler.frameMs);

  assert.deepEqual(restored, []);
  assert.equal(frames.hasPending(), false);
});
