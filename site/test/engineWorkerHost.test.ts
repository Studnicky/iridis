import assert from 'node:assert/strict';
import { test } from 'node:test';

import type { EngineWorkerScopeInterface } from '../app/composables/interfaces/EngineWorkerScopeInterface.ts';

import { ExtractionSettingsEntity } from '../app/composables/entities/ExtractionSettingsEntity.ts';
import { WorkerEnvelopeEntity } from '../app/composables/entities/WorkerEnvelopeEntity.ts';
import { WorkerMessageEntity } from '../app/composables/entities/WorkerMessageEntity.ts';
import { WorkerReplyEntity } from '../app/composables/entities/WorkerReplyEntity.ts';
import { EngineWorkerHost } from '../app/workers/EngineWorkerHost.ts';
import { PaletteResolveFixture } from './fixtures/PaletteResolveFixture.ts';

class HostScope implements EngineWorkerScopeInterface {
  public readonly replies: WorkerReplyEntity.Type[] = [];
  readonly #listeners: ((event: MessageEvent<unknown>) => void)[] = [];

  public addEventListener(_type: 'message', listener: (event: MessageEvent<unknown>) => void): void {
    this.#listeners.push(listener);
  }

  public deliver(data: unknown, origin = ''): void {
    const event = new MessageEvent('message', { 'data': data, 'origin': origin });
    this.#listeners.forEach((listener) => { listener(event); });
  }

  public postMessage(reply: WorkerReplyEntity.Type): void {
    this.replies.push(reply);
  }
}

class HostFixture {
  public readonly scope = new HostScope();
  #sequence = 0;

  public constructor() {
    EngineWorkerHost.start(this.scope);
  }

  public static settings(): ExtractionSettingsEntity.Type {
    const result = ExtractionSettingsEntity.create({
      'algorithm': 'median-cut',
      'chromaRange': [[0, 0.5]],
      'deltaECap': 128,
      'harmonizeThreshold': 10,
      'histogramBits': 5,
      'k': 4,
      'lightnessRange': [[0, 1]]
    });
    return result;
  }

  public static pixels(): ArrayBuffer {
    const rgba = [94, 53, 177, 255, 255, 255, 255, 255, 0, 0, 0, 255, 94, 53, 177, 255];
    const result = new Uint8ClampedArray(rgba).buffer;
    return result;
  }

  public send(message: WorkerMessageEntity.Type): number {
    this.#sequence += 1;
    this.scope.deliver(WorkerEnvelopeEntity.create({ 'id': this.#sequence, 'message': message }));
    return this.#sequence;
  }

  public upload(imageId: string): void {
    this.scope.deliver(HostFixture.pixels());
    this.send(WorkerMessageEntity.create({ 'height': 2, 'imageId': imageId, 'kind': 'pixels', 'width': 2 }));
  }
}

await test('worker message and reply unions survive a JSON round trip and reject unknown kinds', () => {
  const message = WorkerMessageEntity.create({ 'imageId': 'img-a', 'kind': 'extract', 'settings': HostFixture.settings() });
  const reply = WorkerReplyEntity.create({ 'failure': 'nope', 'id': 3, 'kind': 'combine' });

  assert.deepEqual(WorkerMessageEntity.intake(JSON.parse(JSON.stringify(message))), message);
  assert.deepEqual(WorkerReplyEntity.intake(JSON.parse(JSON.stringify(reply))), reply);
  assert.throws(() => { WorkerMessageEntity.intake({ 'imageId': 'img-a', 'kind': 'decode' }); });
  assert.throws(() => { WorkerReplyEntity.intake({ 'id': 1, 'kind': 'decode' }); });
});

await test('the host extracts an uploaded image in the worker and answers a failure once the image is released', () => {
  const fixture = new HostFixture();
  fixture.upload('img-a');
  assert.equal(fixture.scope.replies.length, 0, 'pixels commands answer nothing');

  const extractId = fixture.send(WorkerMessageEntity.create({ 'imageId': 'img-a', 'kind': 'extract', 'settings': HostFixture.settings() }));
  const extracted = fixture.scope.replies.at(-1);
  assert.equal(extracted?.kind, 'extract');
  assert.equal(extracted?.id, extractId);
  assert.equal(extracted?.failure, undefined);
  assert.ok(extracted?.kind === 'extract' && (extracted.result?.dominantColorRecords.length ?? 0) > 0);

  fixture.send(WorkerMessageEntity.create({ 'imageId': 'img-a', 'kind': 'release' }));
  const releasedId = fixture.send(WorkerMessageEntity.create({ 'imageId': 'img-a', 'kind': 'extract', 'settings': HostFixture.settings() }));
  const released = fixture.scope.replies.at(-1);
  assert.equal(released?.id, releasedId);
  assert.equal(String(released?.failure).includes('no pixels'), true, 'an extract without worker-held pixels fails');
});

await test('the host combines weighted hexes into seeds and resolves a palette request through the same message path', () => {
  const fixture = new HostFixture();
  const request = PaletteResolveFixture.request();

  fixture.send(WorkerMessageEntity.create({
    'colorSpace': request.colorSpace,
    'cvdMode': request.cvdMode,
    'enableStrictCompliance': request.enableStrictCompliance,
    'framing': request.framing,
    'hexes': ['#7c3aed', '#7c3aed', '#06b6d4', '#101820'],
    'kind': 'combine',
    'nonMandatoryLevel': request.nonMandatoryLevel,
    'schemaName': request.schemaName,
    'settings': HostFixture.settings(),
    'strictness': request.strictness
  }));
  const combined = fixture.scope.replies.at(-1);
  assert.equal(combined?.kind, 'combine');
  assert.ok(combined?.kind === 'combine' && (combined.result?.extracted.length ?? 0) > 0);

  fixture.send(WorkerMessageEntity.create({ 'kind': 'palette', 'request': request }));
  const resolved = fixture.scope.replies.at(-1);
  assert.equal(resolved?.kind, 'palette');
  assert.ok(resolved?.kind === 'palette' && resolved.snapshot !== undefined);
});

await test('the host analyzes schema feasibility on its independent worker message path', () => {
  const fixture = new HostFixture();
  const request = PaletteResolveFixture.request();
  const id = fixture.send(WorkerMessageEntity.create({ 'kind': 'schema-feasibility', 'request': request }));
  const reply = fixture.scope.replies.at(-1);

  assert.equal(reply?.id, id);
  assert.equal(reply?.kind, 'schema-feasibility');
  assert.ok(reply?.kind === 'schema-feasibility' && (reply.report?.pairs.length ?? 0) > 0);
});

await test('the host ignores messages whose origin is not its owner', () => {
  const fixture = new HostFixture();

  fixture.scope.deliver(WorkerEnvelopeEntity.create({
    'id': 1,
    'message': WorkerMessageEntity.create({ 'imageId': 'img-a', 'kind': 'extract', 'settings': HostFixture.settings() })
  }), 'https://example.test');

  assert.equal(fixture.scope.replies.length, 0);
});
