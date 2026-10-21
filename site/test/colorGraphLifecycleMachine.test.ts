import assert from 'node:assert/strict';
import { test } from 'node:test';

import { ColorGraphLifecycleEvent } from '../app/components/content/viz/ColorGraphLifecycleEvent.ts';
import { ColorGraphLifecycleMachine } from '../app/components/content/viz/ColorGraphLifecycleMachine.ts';

class LifecycleRun {
  static variants(events: readonly ColorGraphLifecycleEvent[]): string[] {
    const machine = ColorGraphLifecycleMachine.create();
    let state = machine.getInitialState();
    const visited = [state.variant];

    for (let index = 0; index < events.length; index += 1) {
      state = machine.reduce(state, events[index]!).state;
      visited.push(state.variant);
    }

    return visited;
  }
}

await test('a graph moves from idle through device ready, final fit, and settled', () => {
  const visited = LifecycleRun.variants([
    ColorGraphLifecycleEvent.constructed(),
    ColorGraphLifecycleEvent.deviceReady(),
    ColorGraphLifecycleEvent.fitArmed(),
    ColorGraphLifecycleEvent.fitSettled()
  ]);

  assert.deepEqual(visited, ['idle', 'constructing', 'ready', 'fitting', 'settled']);
});

await test('a settled graph zooms and settles again on each zoom end', () => {
  const visited = LifecycleRun.variants([
    ColorGraphLifecycleEvent.constructed(),
    ColorGraphLifecycleEvent.deviceReady(),
    ColorGraphLifecycleEvent.fitArmed(),
    ColorGraphLifecycleEvent.fitSettled(),
    ColorGraphLifecycleEvent.zoomed(),
    ColorGraphLifecycleEvent.zoomEnded()
  ]);

  assert.deepEqual(visited, ['idle', 'constructing', 'ready', 'fitting', 'settled', 'zooming', 'settled']);
});

await test('zoom events while fitting leave the fit in progress', () => {
  const visited = LifecycleRun.variants([
    ColorGraphLifecycleEvent.constructed(),
    ColorGraphLifecycleEvent.deviceReady(),
    ColorGraphLifecycleEvent.fitArmed(),
    ColorGraphLifecycleEvent.zoomed(),
    ColorGraphLifecycleEvent.zoomEnded()
  ]);

  assert.deepEqual(visited, ['idle', 'constructing', 'ready', 'fitting', 'fitting', 'fitting']);
});

await test('a fit armed before the device is ready is ignored', () => {
  const visited = LifecycleRun.variants([
    ColorGraphLifecycleEvent.constructed(),
    ColorGraphLifecycleEvent.fitArmed(),
    ColorGraphLifecycleEvent.fitSettled()
  ]);

  assert.deepEqual(visited, ['idle', 'constructing', 'constructing', 'constructing']);
});

await test('destroying a graph mid-fit returns to idle and a replacement starts clean', () => {
  const visited = LifecycleRun.variants([
    ColorGraphLifecycleEvent.constructed(),
    ColorGraphLifecycleEvent.deviceReady(),
    ColorGraphLifecycleEvent.fitArmed(),
    ColorGraphLifecycleEvent.destroyed(),
    ColorGraphLifecycleEvent.fitSettled(),
    ColorGraphLifecycleEvent.constructed()
  ]);

  assert.deepEqual(visited, ['idle', 'constructing', 'ready', 'fitting', 'idle', 'idle', 'constructing']);
});
