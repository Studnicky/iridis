import assert from 'node:assert/strict';
import { test } from 'node:test';

import { AmbientStarfieldLoop } from '../app/components/layout/ambient/AmbientStarfieldLoop.ts';
import { VirtualLivingBackgroundEnvironment } from './fixtures/VirtualLivingBackgroundEnvironment.ts';

class LoopRun {
  public readonly environment = new VirtualLivingBackgroundEnvironment();

  public readonly loop: AmbientStarfieldLoop;

  public readonly paints: number[] = [];

  public constructor(frameMs: number) {
    this.loop = AmbientStarfieldLoop.create(this.environment, (timeMs) => {
      this.paints.push(timeMs);
    }, frameMs);
  }
}

class LoopTiming {
  public static readonly frameMs = 100;

  public static readonly span = 1000;
}

await test('starting paints once and then repaints at the configured cadence', () => {
  const run = new LoopRun(LoopTiming.frameMs);

  run.loop.start();

  assert.equal(run.paints.length, 1);

  run.environment.scheduler.advance(LoopTiming.span);

  const intervals = run.paints.slice(1).map((time, index) => {
    const interval = time - (run.paints[index] ?? 0);

    return interval;
  });

  assert.ok(run.paints.length >= 9);
  assert.ok(run.paints.length <= 12);
  assert.ok(intervals.every((interval) => {
    const sufficient = interval >= LoopTiming.frameMs;

    return sufficient;
  }));
});

await test('hiding the page stops the loop and showing it resumes the loop', () => {
  const run = new LoopRun(LoopTiming.frameMs);

  run.loop.start();
  run.environment.hide();
  const hidden = run.paints.length;

  run.environment.scheduler.advance(LoopTiming.span);

  assert.equal(run.paints.length, hidden);
  assert.equal(run.environment.scheduler.hasPending(), false);

  run.environment.show();
  run.environment.scheduler.advance(LoopTiming.span);

  assert.ok(run.paints.length > hidden + 1);
});

await test('a live reduced-motion change repaints once and stops, and allowing motion resumes', () => {
  const run = new LoopRun(LoopTiming.frameMs);

  run.loop.start();
  run.environment.scheduler.advance(LoopTiming.frameMs * 3);
  run.environment.reduceMotion();
  const settled = run.paints.length;

  run.environment.scheduler.advance(LoopTiming.span);

  assert.equal(run.paints.length, settled);
  assert.equal(run.environment.scheduler.hasPending(), false);

  run.environment.allowMotion();
  run.environment.scheduler.advance(LoopTiming.span);

  assert.ok(run.paints.length > settled + 1);
});

await test('stopping cancels the pending frame and ignores later environment changes', () => {
  const run = new LoopRun(LoopTiming.frameMs);

  run.loop.start();
  run.loop.stop();
  const stopped = run.paints.length;

  run.environment.hide();
  run.environment.show();
  run.environment.scheduler.advance(LoopTiming.span);

  assert.equal(run.paints.length, stopped);
  assert.equal(run.environment.scheduler.hasPending(), false);
});
