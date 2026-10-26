import assert from 'node:assert/strict';
import { test } from 'node:test';

import { buildColorGraphConfig } from '../app/components/content/graph/buildColorGraphConfig.ts';
import { buildColorGraphViewModel } from '../app/components/content/graph/buildColorGraphViewModel.ts';

class CallbackRecorder {
  public readonly tick = (): void => { this.calls.push('tick'); };

  public readonly zoom = (): void => { this.calls.push('zoom'); };

  public readonly zoomEnd = (): void => { this.calls.push('zoomEnd'); };

  public readonly calls: string[] = [];
}

class ConfigFixture {
  public static readonly background: [number, number, number, number] = [0.1, 0.2, 0.3, 1];

  public static build(recorder: CallbackRecorder): ReturnType<typeof buildColorGraphConfig.build> {
    const result = buildColorGraphConfig.build(ConfigFixture.background, recorder.tick, recorder.zoom, recorder.zoomEnd);

    return result;
  }
}

await test('the library init fit is disabled so a restored view is not overridden', () => {
  assert.equal(ConfigFixture.build(new CallbackRecorder()).fitViewOnInit, false);
});

await test('the configuration carries the theme background, space size and interaction toggles', () => {
  const config = ConfigFixture.build(new CallbackRecorder());

  assert.deepEqual(config.backgroundColor, ConfigFixture.background);
  assert.equal(config.spaceSize, buildColorGraphViewModel.spaceSize);
  assert.equal(config.enableDrag, true);
  assert.equal(config.enableRightClickRepulsion, true);
});

await test('the simulation is tuned for the seeded hub and leaf layout', () => {
  const config = ConfigFixture.build(new CallbackRecorder());

  assert.equal(config.simulationLinkDistance, 260);
  assert.equal(config.simulationLinkSpring, 0.15);
  assert.equal(config.simulationRepulsion, 8);
  assert.equal(config.simulationGravity, 0.02);
  assert.equal(config.simulationDecay, 12_000);
});

await test('the supplied callbacks are the ones the library receives', () => {
  const recorder = new CallbackRecorder();
  const config = ConfigFixture.build(recorder);

  assert.equal(config.onSimulationTick, recorder.tick);
  assert.equal(config.onZoom, recorder.zoom);
  assert.equal(config.onZoomEnd, recorder.zoomEnd);
});
