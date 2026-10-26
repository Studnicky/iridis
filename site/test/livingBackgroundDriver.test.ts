/**
 * Deterministic coverage for the fixed-step ambient drift: a virtual frame
 * scheduler drives LivingBackgroundDriver and AmbientFieldPainter without a DOM.
 */

import assert from 'node:assert/strict';
import { test } from 'node:test';

import { AmbientFieldPainter } from '../app/components/layout/ambient/AmbientFieldPainter.ts';
import { LIVING_BACKGROUND } from '../app/composables/constants/LivingBackgroundConstants.ts';
import { LivingBackgroundHarness } from './fixtures/LivingBackgroundHarness.ts';
import { LIVING_BACKGROUND_VIEWS } from './fixtures/LivingBackgroundViews.ts';
import { RecordingCanvasContext } from './fixtures/RecordingCanvasContext.ts';
import { RootStyleSpy } from './fixtures/RootStyleSpy.ts';
import { TestPatterns } from './fixtures/TestPatterns.ts';
import { VirtualFrameScheduler } from './fixtures/VirtualFrameScheduler.ts';

await test('drift advances the painted colours over frames', () => {
  const harness = new LivingBackgroundHarness();
  harness.driver.start();
  harness.environment.scheduler.advance(VirtualFrameScheduler.frameMs);
  const first = harness.frames[0]!;
  harness.environment.scheduler.advance(LIVING_BACKGROUND.CYCLE_MS / 2);
  const later = harness.frames.at(-1)!;

  assert.ok(later.animationMs > first.animationMs);
  assert.notDeepEqual(later.tokens, first.tokens);
});

await test('drift stays continuous across cycle boundaries', () => {
  const harness = new LivingBackgroundHarness();
  const totalMs = LIVING_BACKGROUND.CYCLE_MS * 2.5;
  harness.driver.start();
  harness.environment.scheduler.advance(totalMs);

  assert.equal(harness.recorder.frames.length, Math.floor((totalMs - VirtualFrameScheduler.frameMs) / LIVING_BACKGROUND.STEP_MS));
  for (let index = 1; index < harness.frames.length; index += 1) {
    assert.ok(harness.frames[index]!.animationMs >= harness.frames[index - 1]!.animationMs);
  }
});

await test('history records one sample per fixed step regardless of display frame rate', () => {
  const harness = new LivingBackgroundHarness();
  const totalMs = 1000;
  harness.driver.start();
  harness.environment.scheduler.advance(totalMs);

  assert.equal(harness.recorder.frames.length, Math.floor((totalMs - VirtualFrameScheduler.frameMs) / LIVING_BACKGROUND.STEP_MS));
  assert.ok(harness.frames.length > harness.recorder.frames.length);
});

await test('a stalled frame catches up by a bounded number of samples', () => {
  const harness = new LivingBackgroundHarness();
  harness.driver.start();
  harness.environment.scheduler.advance(VirtualFrameScheduler.frameMs);
  const before = harness.recorder.frames.length;
  harness.environment.scheduler.nowMs += 60000;
  harness.environment.scheduler.advance(VirtualFrameScheduler.frameMs);

  assert.ok(harness.recorder.frames.length - before <= LIVING_BACKGROUND.STEP_LIMIT_PER_FRAME);
});

await test('the loop never writes CSS variables to the document root', () => {
  const spy = new RootStyleSpy();
  spy.install();
  try {
    const harness = new LivingBackgroundHarness();
    harness.driver.start();
    harness.environment.scheduler.advance(LIVING_BACKGROUND.CYCLE_MS * 1.5);
    assert.ok(harness.frames.length > 0);
    assert.deepEqual(spy.writes, []);
    document.documentElement.style.setProperty('--probe', '#000000');
    assert.deepEqual(spy.writes, ['--probe']);
  } finally {
    spy.restore();
  }
});

await test('reduced motion renders one static frame and schedules nothing', () => {
  const harness = new LivingBackgroundHarness();
  harness.environment.reduceMotion();
  harness.driver.start();
  harness.environment.scheduler.advance(2000);

  assert.equal(harness.frames.length, 1);
  assert.equal(harness.frames[0]!.animationMs, 0);
  assert.equal(harness.environment.scheduler.hasPending(), false);
  assert.equal(harness.recorder.frames.length, 0);
});

await test('lifting reduced motion starts the drift', () => {
  const harness = new LivingBackgroundHarness();
  harness.environment.reduceMotion();
  harness.driver.start();
  harness.environment.allowMotion();
  harness.environment.scheduler.advance(1000);

  assert.ok(harness.frames.length > 1);
  assert.ok(harness.recorder.frames.length > 0);
});

await test('a hidden tab pauses the loop and resumes without a time jump', () => {
  const harness = new LivingBackgroundHarness();
  harness.driver.start();
  harness.environment.scheduler.advance(500);
  harness.environment.hide();
  const pausedFrames = harness.frames.length;
  const pausedSamples = harness.recorder.frames.length;
  const pausedAnimationMs = harness.frames.at(-1)!.animationMs;
  harness.environment.scheduler.advance(5000);

  assert.equal(harness.environment.scheduler.hasPending(), false);
  assert.equal(harness.frames.length, pausedFrames);
  assert.equal(harness.recorder.frames.length, pausedSamples);

  harness.environment.show();
  harness.environment.scheduler.advance(500);
  assert.ok(harness.frames.length > pausedFrames);
  assert.ok(harness.frames.at(-1)!.animationMs - pausedAnimationMs < 1000);
});

await test('stop cancels the pending frame and ignores later environment changes', () => {
  const harness = new LivingBackgroundHarness();
  harness.driver.start();
  harness.environment.scheduler.advance(200);
  harness.driver.stop();
  const frameCount = harness.frames.length;
  harness.environment.hide();
  harness.environment.show();
  harness.environment.scheduler.advance(500);

  assert.equal(harness.frames.length, frameCount);
  assert.equal(harness.environment.scheduler.hasPending(), false);
});

await test('the drift waits for the engine palette and starts once it resolves', () => {
  const harness = new LivingBackgroundHarness();
  harness.views = [];
  harness.driver.start();
  harness.environment.scheduler.advance(500);
  assert.equal(harness.frames.length, 0);
  assert.equal(harness.recorder.frames.length, 0);

  harness.views = LIVING_BACKGROUND_VIEWS;
  harness.environment.scheduler.advance(500);
  assert.ok(harness.frames.length > 0);
  assert.ok(harness.recorder.frames.length > 0);
});

await test('a committed palette repaints the static frame under reduced motion', () => {
  const harness = new LivingBackgroundHarness();
  harness.views = [];
  harness.environment.reduceMotion();
  harness.driver.start();
  assert.equal(harness.frames.length, 0);

  harness.views = LIVING_BACKGROUND_VIEWS;
  harness.driver.paletteCommitted();
  assert.equal(harness.frames.length, 1);
  harness.driver.repaint();
  assert.equal(harness.frames.length, 2);
});

await test('the painter draws one glow per blob from the frame tokens and moves them over time', () => {
  const harness = new LivingBackgroundHarness();
  const blobs = AmbientFieldPainter.buildBlobs(4);
  harness.driver.start();
  harness.environment.scheduler.advance(VirtualFrameScheduler.frameMs);
  const tokens = harness.frames[0]!.tokens;

  const first = new RecordingCanvasContext();
  AmbientFieldPainter.paint(first, 400, 300, tokens, 0, blobs);
  const second = new RecordingCanvasContext();
  AmbientFieldPainter.paint(second, 400, 300, tokens, 4000, blobs);

  assert.equal(blobs.length, 4);
  assert.equal(first.fillRects.length, blobs.length);
  assert.equal(first.clears, 1);
  assert.notDeepEqual(first.fillRects, second.fillRects);
  assert.ok(first.stops.length > 0);
  for (let index = 0; index < first.stops.length; index += 1) {
    assert.match(first.stops[index]!, TestPatterns.HEX_WITH_ALPHA);
  }
});

await test('the painter skips blobs whose tokens are absent', () => {
  const context = new RecordingCanvasContext();
  AmbientFieldPainter.paint(context, 400, 300, {}, 0, AmbientFieldPainter.buildBlobs(3));

  assert.equal(context.fillRects.length, 0);
  assert.equal(context.clears, 1);
});
