import { RoleRelationshipGraphEntity } from '@studnicky/iridis';
import assert from 'node:assert/strict';
import { registerHooks } from 'node:module';
import { test } from 'node:test';
import { setTimeout } from 'node:timers/promises';

import type { WorkerEnvelopeEntity } from '../app/composables/entities/WorkerEnvelopeEntity.ts';
import type { WorkerHandlersInterface } from '../app/composables/interfaces/WorkerHandlersInterface.ts';
import type { PaletteResolutionClientInterface } from '../app/composables/paletteSession/interfaces/PaletteResolutionClientInterface.ts';
import type { PaletteResolutionClientProviderInterface } from '../app/composables/paletteSession/interfaces/PaletteResolutionClientProviderInterface.ts';

import { SchemaNameEntity } from '../app/composables/entities/SchemaNameEntity.ts';
import { WorkerReplyEntity } from '../app/composables/entities/WorkerReplyEntity.ts';
import { PaletteSessionRequest } from '../app/composables/paletteSession/PaletteSessionRequest.ts';
import { PaletteSessionVueComposition } from '../app/composables/paletteSession/PaletteSessionVueComposition.ts';
import { WorkerRequestClient } from '../app/composables/workerRequestClient.ts';
import { roleSchemaByName } from '../app/theme/RoleSchemaByName.ts';
import { LoopbackWorkerPort } from './fixtures/LoopbackWorkerPort.ts';
import * as NuxtImportsLoader from './fixtures/NuxtImportsLoader.mjs';

registerHooks(NuxtImportsLoader);

/** Gives the default schema's relationship group a second mode, since the shipped schemas declare only one; each test file runs in its own process. */
class AlternateModeSchema {
  public static readonly defaultModeId = 'default';
  public static readonly groupId = 'palette';
  public static readonly modeId = 'warm';

  public static install(): void {
    const pair = roleSchemaByName[SchemaNameEntity.defaultValue];
    [pair.dark, pair.light].forEach((definition) => {
      const base = definition.relationshipGraph;
      if (base !== undefined) {
        const groups = base.groups.map((group) => {
          const widened = {
            ...group,
            'modes': [...group.modes, { 'hueOffsets': [{ 'degrees': 30, 'variantId': 'default' }], 'id': AlternateModeSchema.modeId }]
          };
          return widened;
        });
        Reflect.set(definition, 'relationshipGraph', RoleRelationshipGraphEntity.intake({ 'groups': groups }));
      }
    });
  }
}

AlternateModeSchema.install();

class LoopbackProvider implements PaletteResolutionClientProviderInterface {
  public open(handlers: WorkerHandlersInterface): PaletteResolutionClientInterface {
    const result = new WorkerRequestClient(new LoopbackWorkerPort(), handlers);
    return result;
  }
}

/** A worker port whose schema-feasibility lane always answers with a failure. */
class FailingFeasibilityPort extends LoopbackWorkerPort {
  #reply: (data: unknown) => void = () => {};

  public override listen(onReply: (data: unknown) => void, onFailure: (message: string) => void): void {
    this.#reply = onReply;
    super.listen(onReply, onFailure);
  }

  public override post(envelope: WorkerEnvelopeEntity.Type): void {
    if (envelope.message.kind === 'schema-feasibility') {
      const reply = WorkerReplyEntity.create({ 'failure': 'feasibility worker failure', 'id': envelope.id, 'kind': 'schema-feasibility' });
      queueMicrotask(() => { this.#reply(reply); });
    } else {
      super.post(envelope);
    }
  }
}

class FailingFeasibilityProvider implements PaletteResolutionClientProviderInterface {
  public open(handlers: WorkerHandlersInterface): PaletteResolutionClientInterface {
    const result = new WorkerRequestClient(new FailingFeasibilityPort(), handlers);
    return result;
  }
}

class RelationshipHarness {
  public static record(composition: PaletteSessionVueComposition): string[] {
    const statuses: string[] = [];
    composition.store.subscribe((model) => { statuses.push(model.feasibility.status); });
    return statuses;
  }

  public static async awaitSequence(statuses: readonly string[], expected: readonly string[]): Promise<void> {
    const deadline = Date.now() + 4_000;
    while (!statuses.join().includes(expected.join()) && Date.now() < deadline) {
      await setTimeout(5);
    }
    assert.ok(statuses.join().includes(expected.join()), `the lane publishes ${expected.join(' then ')}, saw ${statuses.join(' then ')}`);
  }

  public static async awaitReport(composition: PaletteSessionVueComposition): Promise<void> {
    const deadline = Date.now() + 4_000;
    while (composition.schemaFeasibilityReport.value === undefined && Date.now() < deadline) {
      await setTimeout(10);
    }
    assert.ok(composition.schemaFeasibilityReport.value !== undefined, 'a feasibility report arrives');
  }

  public static async browserSession(): Promise<PaletteSessionVueComposition> {
    Reflect.set(globalThis, 'window', {});
    const composition = PaletteSessionVueComposition.resolve({}, new LoopbackProvider());
    await composition.store.settled();
    return composition;
  }

  public static graphMode(composition: PaletteSessionVueComposition): string | undefined {
    const message = PaletteSessionRequest.palette(composition.readModel.value.input);
    const graph = message.kind === 'palette' ? message.request.relationshipGraph : undefined;
    const result = graph?.groups.find((group) => {
      const found = group.id === AlternateModeSchema.groupId;
      return found;
    })?.defaultMode;
    return result;
  }
}

await test('selecting a relationship mode applies it to the graph the session resolves against', async () => {
  const composition = PaletteSessionVueComposition.resolve({}, new LoopbackProvider());
  await composition.store.settled();
  const before = composition.paletteRevision.value;
  assert.deepEqual(composition.readModel.value.input.relationshipModes, []);
  assert.equal(RelationshipHarness.graphMode(composition), AlternateModeSchema.defaultModeId);

  await composition.selectRelationshipMode(AlternateModeSchema.groupId, AlternateModeSchema.modeId);

  assert.deepEqual(composition.readModel.value.input.relationshipModes, [{ 'groupId': AlternateModeSchema.groupId, 'modeId': AlternateModeSchema.modeId }]);
  assert.equal(RelationshipHarness.graphMode(composition), AlternateModeSchema.modeId);
  const exposed = composition.relationshipGraph.value?.groups.find((group) => {
    const found = group.id === AlternateModeSchema.groupId;
    return found;
  });
  assert.equal(exposed?.defaultMode, AlternateModeSchema.modeId);
  assert.ok(composition.paletteRevision.value > before, 'the changed graph resolves a new palette');
  assert.equal(composition.readModel.value.status, 'idle');
  await composition.dispose();
});

await test('reselecting a mode keeps one selection per group and a repeat resolves nothing', async () => {
  const composition = PaletteSessionVueComposition.resolve({}, new LoopbackProvider());
  await composition.selectRelationshipMode(AlternateModeSchema.groupId, AlternateModeSchema.modeId);
  const revision = composition.paletteRevision.value;
  await composition.selectRelationshipMode(AlternateModeSchema.groupId, AlternateModeSchema.modeId);
  assert.equal(composition.readModel.value.input.relationshipModes.length, 1);
  assert.equal(composition.paletteRevision.value, revision);
  await composition.selectRelationshipMode(AlternateModeSchema.groupId, AlternateModeSchema.defaultModeId);
  assert.deepEqual(composition.readModel.value.input.relationshipModes, [{ 'groupId': AlternateModeSchema.groupId, 'modeId': AlternateModeSchema.defaultModeId }]);
  assert.equal(RelationshipHarness.graphMode(composition), AlternateModeSchema.defaultModeId);
  await composition.dispose();
});

await test('a group or mode the schema graph does not declare is rejected without changing the session', async () => {
  const composition = PaletteSessionVueComposition.resolve({}, new LoopbackProvider());
  await composition.store.settled();
  const before = composition.readModel.value;
  await composition.selectRelationshipMode('no-such-group', AlternateModeSchema.modeId);
  await composition.selectRelationshipMode(AlternateModeSchema.groupId, 'no-such-mode');
  assert.equal(composition.readModel.value === before, true);
  assert.deepEqual(composition.readModel.value.input.relationshipModes, []);
  await composition.dispose();
});

await test('selecting a schema resets the relationship selection', async () => {
  const composition = PaletteSessionVueComposition.resolve({}, new LoopbackProvider());
  await composition.selectRelationshipMode(AlternateModeSchema.groupId, AlternateModeSchema.modeId);
  assert.equal(composition.readModel.value.input.relationshipModes.length, 1);
  await composition.dispatch({ 'interaction': 'palette.schema.select', 'payload': { 'schemaName': 'iridis-8' } });
  assert.deepEqual(composition.readModel.value.input.relationshipModes, []);
  assert.equal(composition.readModel.value.input.schemaName, 'iridis-8');
  await composition.dispose();
});

await test('the feasibility lane checks the schema after boot and again after a mode selection', async (context) => {
  context.after(() => { Reflect.set(globalThis, 'window', undefined); });
  const composition = await RelationshipHarness.browserSession();
  await RelationshipHarness.awaitReport(composition);
  const first = composition.schemaFeasibilityReport.value;
  assert.equal(composition.schemaFeasibilityChecking.value, false);
  const statuses = RelationshipHarness.record(composition);

  await composition.selectRelationshipMode(AlternateModeSchema.groupId, AlternateModeSchema.modeId);
  await RelationshipHarness.awaitSequence(statuses, ['checking', 'idle']);
  assert.equal(composition.schemaFeasibilityChecking.value, false);
  assert.ok(composition.schemaFeasibilityReport.value !== undefined);
  assert.deepEqual(composition.schemaFeasibilityReport.value, first);
  await composition.dispose();
});

await test('inputs outside the feasibility identity do not schedule a check', async (context) => {
  context.after(() => { Reflect.set(globalThis, 'window', undefined); });
  const composition = await RelationshipHarness.browserSession();
  await RelationshipHarness.awaitReport(composition);
  const report = composition.schemaFeasibilityReport.value;
  const statuses = RelationshipHarness.record(composition);
  await composition.dispatch({ 'interaction': 'palette.framing.select', 'payload': { 'framing': 'light' } });
  await composition.dispatch({ 'interaction': 'palette.color-space.select', 'payload': { 'colorSpace': 'displayP3' } });
  await setTimeout(350);
  assert.equal(statuses.includes('checking'), false);
  assert.deepEqual(composition.schemaFeasibilityReport.value, report);
  await composition.dispose();
});

await test('the server session schedules no feasibility check', async () => {
  const composition = PaletteSessionVueComposition.resolve({});
  await composition.store.settled();
  await setTimeout(250);
  assert.equal(composition.readModel.value.feasibility.status, 'idle');
  assert.equal(composition.schemaFeasibilityReport.value, undefined);
  await composition.dispose();
});

await test('a failed feasibility check is recorded on the lane and leaves the palette lane untouched', async (context) => {
  context.after(() => { Reflect.set(globalThis, 'window', undefined); });
  Reflect.set(globalThis, 'window', {});
  const composition = PaletteSessionVueComposition.resolve({}, new FailingFeasibilityProvider());
  await composition.store.settled();
  const statuses = RelationshipHarness.record(composition);
  await RelationshipHarness.awaitSequence(statuses, ['checking', 'failed']);
  assert.equal(composition.readModel.value.feasibility.error, 'feasibility worker failure');
  assert.equal(composition.readModel.value.status, 'idle');
  assert.equal(composition.schemaFeasibilityChecking.value, false);
  await composition.dispose();
});
