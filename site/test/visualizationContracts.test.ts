import assert from 'node:assert/strict';
import { test } from 'node:test';

import { CameraControls } from '../app/components/content/viz/CameraControls.ts';
import { ModalController } from '../app/components/content/viz/ModalController.ts';
import { viewerActionsModel } from '../app/components/content/viz/viewerActionsModel.ts';
import { ViewportStatus } from '../app/components/content/viz/ViewportStatus.ts';

class CameraControlFixture {
  public readonly directions: string[] = [];

  public centre(): void {}

  public fit(): void {}

  public pan(direction: string): void {
    this.directions.push(direction);
  }

  public zoomIn(): void {}

  public zoomOut(): void {}
}

await test('visualization controls resolve commands and modes through canonical boundaries', async () => {
  const fixture = new CameraControlFixture();
  const controls = CameraControls.create(fixture, 'inline');

  const state = controls.state();
  assert.equal(state.mode, 'inline');
  assert.equal(state.items[0]?.action, 'zoom-in');
  await controls.press('pan-up');
  assert.deepEqual(fixture.directions, ['up']);
  assert.throws(() => { controls.setMode('expanded'); });
  await assert.rejects(async () => { await controls.press('unregistered'); });
});

await test('viewer actions, viewport status, and modal close reasons retain finite contracts', () => {
  const action = viewerActionsModel.create('clear');
  assert.equal(action.id, 'clear');
  assert.equal(action.tone, 'danger');
  assert.throws(() => { viewerActionsModel.create('remove'); });

  const status = ViewportStatus.create({ 'mode': 'modal', 'zoomLevel': 1.25 });
  assert.equal(status.mode, 'modal');
  assert.equal(status.canFit, true);
  assert.equal(status.canPan, true);
  assert.equal(status.hint, 'drag · wheel');

  const modal = new ModalController();
  assert.equal(modal.open(), true);
  assert.equal(modal.onBackdropPress(), true);
  assert.throws(() => { modal.close('dismiss'); });
});
