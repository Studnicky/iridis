import assert from 'node:assert/strict';
import { test } from 'node:test';

import { buildColorGraphBuffers } from '../app/components/content/graph/buildColorGraphBuffers.ts';
import { ColorGraphCategoryVisibility } from '../app/components/content/graph/ColorGraphCategoryVisibility.ts';
import { CameraControls } from '../app/components/content/viz/CameraControls.ts';
import { ModalController } from '../app/components/content/viz/ModalController.ts';
import { viewerActionsModel } from '../app/components/content/viz/viewerActionsModel.ts';
import { ViewportStatus } from '../app/components/content/viz/ViewportStatus.ts';
import { RoleMathOrigin } from '../app/composables/types/roleMathOrigin.ts';

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

class ColorGraphRoleFixture {
  public readonly algorithmInfo = null;
  public readonly c = 0;
  public readonly candidates: [] = [];
  public readonly clamp = null;
  public readonly compliance = 'pass';
  public readonly def = undefined;
  public readonly h = 0;
  public readonly l = 0;
  public readonly pinnedSeedHex = null;
  public readonly ratio = 1;

  public constructor(
    public readonly hex: string,
    public readonly name: string,
    public readonly origin: typeof RoleMathOrigin.Direct,
    public readonly parentRole: string | undefined
  ) {}
}

await test('palette colour revisions reuse graph geometry while refreshing visible values', () => {
  const visible = new ColorGraphCategoryVisibility();
  const first = buildColorGraphBuffers.build([
    new ColorGraphRoleFixture('#102030', 'background', RoleMathOrigin.Direct, undefined),
    new ColorGraphRoleFixture('#405060', 'keyword', RoleMathOrigin.Derived, 'background')
  ], visible);
  const second = buildColorGraphBuffers.build([
    new ColorGraphRoleFixture('#203040', 'background', RoleMathOrigin.Direct, undefined),
    new ColorGraphRoleFixture('#506070', 'keyword', RoleMathOrigin.Derived, 'background')
  ], visible);

  assert.strictEqual(second.positions, first.positions);
  assert.equal(second.structureKey, first.structureKey);
  assert.notDeepEqual(second.colors, first.colors);
  assert.equal(second.meta[0]?.hex, '#203040');
  assert.equal(second.meta[1]?.hex, '#506070');
});

await test('role lineage revisions replace graph geometry', () => {
  const visible = new ColorGraphCategoryVisibility();
  const first = buildColorGraphBuffers.build([
    new ColorGraphRoleFixture('#102030', 'background', RoleMathOrigin.Direct, undefined),
    new ColorGraphRoleFixture('#405060', 'keyword', RoleMathOrigin.Derived, 'background')
  ], visible);
  const second = buildColorGraphBuffers.build([
    new ColorGraphRoleFixture('#102030', 'background', RoleMathOrigin.Direct, undefined),
    new ColorGraphRoleFixture('#405060', 'keyword', RoleMathOrigin.Direct, undefined)
  ], visible);

  assert.notStrictEqual(second.positions, first.positions);
  assert.notStrictEqual(second.links, first.links);
  assert.notEqual(second.structureKey, first.structureKey);
});

await test('parent-only graph revisions require one structural apply across a coalesced palette revision', () => {
  const visible = new ColorGraphCategoryVisibility();
  const initial = buildColorGraphBuffers.build([
    new ColorGraphRoleFixture('#102030', 'background', RoleMathOrigin.Direct, undefined),
    new ColorGraphRoleFixture('#405060', 'keyword', RoleMathOrigin.Derived, 'background'),
    new ColorGraphRoleFixture('#708090', 'string', RoleMathOrigin.Direct, undefined)
  ], visible);
  const parentRevision = buildColorGraphBuffers.build([
    new ColorGraphRoleFixture('#102030', 'background', RoleMathOrigin.Direct, undefined),
    new ColorGraphRoleFixture('#405060', 'keyword', RoleMathOrigin.Derived, 'string'),
    new ColorGraphRoleFixture('#708090', 'string', RoleMathOrigin.Direct, undefined)
  ], visible);
  const paletteRevision = buildColorGraphBuffers.build([
    new ColorGraphRoleFixture('#203040', 'background', RoleMathOrigin.Direct, undefined),
    new ColorGraphRoleFixture('#506070', 'keyword', RoleMathOrigin.Derived, 'string'),
    new ColorGraphRoleFixture('#8090a0', 'string', RoleMathOrigin.Direct, undefined)
  ], visible);

  assert.notEqual(parentRevision.structureKey, initial.structureKey);
  assert.notDeepEqual(parentRevision.links, initial.links);
  assert.equal(paletteRevision.structureKey, parentRevision.structureKey);
  assert.strictEqual(paletteRevision.positions, parentRevision.positions);
  assert.equal(buildColorGraphBuffers.requiresStructuralApply(initial.structureKey, paletteRevision), true);
  assert.equal(buildColorGraphBuffers.requiresStructuralApply(paletteRevision.structureKey, paletteRevision), false);
});
