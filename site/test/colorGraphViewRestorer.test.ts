import assert from 'node:assert/strict';
import { test } from 'node:test';

import type { ColorGraphFrameSchedulerInterface } from '../app/components/content/viz/ColorGraphFrameSchedulerInterface.ts';
import type { ColorGraphViewTargetInterface } from '../app/components/content/viz/ColorGraphViewTargetInterface.ts';

import { ColorGraphViewRestorer } from '../app/components/content/viz/ColorGraphViewRestorer.ts';

/** A camera that lands an applied zoom a number of frames later, optionally landing a different value first. */
class LaggingCamera implements ColorGraphViewTargetInterface {
  public applied: number[] = [];

  public stuckAt: null | number = null;

  public zoom = 1;

  readonly #frames: VirtualFrames;

  readonly #lag: number;

  readonly #wrongFirst: null | number;

  public constructor(frames: VirtualFrames, lag: number, wrongFirst: null | number) {
    this.#frames = frames;
    this.#lag = lag;
    this.#wrongFirst = wrongFirst;
  }

  public applyZoom(zoom: number): void {
    const wrong = this.applied.length === 0 ? this.#wrongFirst : null;
    const landing = wrong ?? zoom;

    this.applied.push(zoom);
    if (this.stuckAt !== null) {
      this.zoom = this.stuckAt;
    } else if (this.#lag === 0) {
      this.zoom = landing;
    } else {
      this.#land(landing, this.#frames.frame + this.#lag);
    }
  }

  public readZoom(): number {
    return this.zoom;
  }

  #land(landing: number, atFrame: number): void {
    this.#frames.request(() => {
      if (this.#frames.frame >= atFrame) {
        this.zoom = landing;
      } else {
        this.#land(landing, atFrame);
      }
    });
  }
}

class RestoreExpectation {
  public static readonly zoom = 0.31;

  public static readonly wrongZoom = 0.2;

  public static readonly lag = 3;
}

class RestoreRun {
  public readonly camera: LaggingCamera;

  public readonly frames: VirtualFrames;

  public readonly restored: number[] = [];

  private constructor(frames: VirtualFrames, camera: LaggingCamera) {
    this.frames = frames;
    this.camera = camera;
  }

  public static start(lag: number, wrongFirst: null | number, zoom: number, stuckAt: null | number = null): RestoreRun {
    const frames = new VirtualFrames();
    const camera = new LaggingCamera(frames, lag, wrongFirst);
    const restorer = ColorGraphViewRestorer.create(camera, frames);
    const run = new RestoreRun(frames, camera);

    camera.stuckAt = stuckAt;
    restorer.start(zoom, (held) => {
      run.restored.push(held);
    });

    return run;
  }
}

class VirtualFrames implements ColorGraphFrameSchedulerInterface {
  public frame = 0;

  readonly #pending = new Map<number, () => void>();

  #next = 1;

  public cancel(handle: number): void {
    this.#pending.delete(handle);
  }

  public pendingCount(): number {
    const result = this.#pending.size;

    return result;
  }

  public request(run: () => void): number {
    const handle = this.#next;

    this.#next += 1;
    this.#pending.set(handle, run);

    return handle;
  }

  public step(): void {
    const due = [...this.#pending.values()];

    this.#pending.clear();
    this.frame += 1;
    due.forEach((run) => {
      run();
    });
  }
}

await test('restoration completes on the first frame when the camera holds the zoom immediately', () => {
  const run = RestoreRun.start(0, null, RestoreExpectation.zoom);

  assert.deepEqual(run.restored, []);

  run.frames.step();

  assert.deepEqual(run.restored, [RestoreExpectation.zoom]);
});

await test('restoration does not complete while the camera has not yet landed the zoom', () => {
  const run = RestoreRun.start(RestoreExpectation.lag, null, RestoreExpectation.zoom);

  run.frames.step();

  assert.deepEqual(run.restored, []);

  for (let index = 0; index < ColorGraphViewRestorer.maximumAttempts && run.restored.length === 0; index += 1) {
    run.frames.step();
  }

  assert.deepEqual(run.restored, [RestoreExpectation.zoom]);
  assert.equal(run.camera.zoom, RestoreExpectation.zoom);
});

await test('a camera that first lands a different zoom is corrected before completion', () => {
  const run = RestoreRun.start(0, RestoreExpectation.wrongZoom, RestoreExpectation.zoom);

  run.frames.step();

  assert.deepEqual(run.restored, []);
  assert.equal(run.camera.applied.length, 2);

  run.frames.step();

  assert.deepEqual(run.restored, [RestoreExpectation.zoom]);
  assert.equal(run.camera.zoom, RestoreExpectation.zoom);
});

await test('a camera that never holds the zoom completes after the attempt limit with the zoom it holds', () => {
  const run = RestoreRun.start(0, null, RestoreExpectation.zoom, RestoreExpectation.wrongZoom);

  for (let index = 0; index < ColorGraphViewRestorer.maximumAttempts + 2 && run.restored.length === 0; index += 1) {
    run.frames.step();
  }

  assert.deepEqual(run.restored, [RestoreExpectation.wrongZoom]);
  assert.equal(run.camera.applied.length, ColorGraphViewRestorer.maximumAttempts);
});

await test('cancelling stops the verification and leaves no pending frame', () => {
  const frames = new VirtualFrames();
  const camera = new LaggingCamera(frames, 0, null);
  const restorer = ColorGraphViewRestorer.create(camera, frames);
  const restored: number[] = [];

  restorer.start(RestoreExpectation.zoom, (held) => {
    restored.push(held);
  });
  restorer.cancel();
  frames.step();

  assert.deepEqual(restored, []);
  assert.equal(frames.pendingCount(), 0);
});
