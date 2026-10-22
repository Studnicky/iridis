import assert from 'node:assert/strict';
import { test } from 'node:test';

import type { WorkerEnvelopeEntity } from '../app/composables/entities/WorkerEnvelopeEntity.ts';
import type { WorkerHandlersInterface } from '../app/composables/interfaces/WorkerHandlersInterface.ts';
import type { WorkerPortInterface } from '../app/composables/interfaces/WorkerPortInterface.ts';

import { ExtractionSettingsEntity } from '../app/composables/entities/ExtractionSettingsEntity.ts';
import { ImageExtractionResultEntity } from '../app/composables/entities/ImageExtractionResultEntity.ts';
import { PaletteResolveRequestInterfaceTypeEntity } from '../app/composables/entities/PaletteResolveRequestInterfaceTypeEntity.ts';
import { PaletteSnapshotInterfaceTypeEntity } from '../app/composables/entities/PaletteSnapshotInterfaceTypeEntity.ts';
import { WorkerMessageEntity } from '../app/composables/entities/WorkerMessageEntity.ts';
import { WorkerReplyEntity } from '../app/composables/entities/WorkerReplyEntity.ts';
import { WorkerRequestClient } from '../app/composables/workerRequestClient.ts';
import { PaletteResolveFixture } from './fixtures/PaletteResolveFixture.ts';

class FakePort implements WorkerPortInterface {
  public readonly posted: WorkerEnvelopeEntity.Type[] = [];
  public terminated = false;
  public readonly transferred: ArrayBuffer[] = [];
  #onFailure: (message: string) => void = () => {};
  #onReply: (data: unknown) => void = () => {};

  public fail(message: string): void {
    this.#onFailure(message);
  }

  public ids(): number[] {
    const result = this.posted.map((envelope) => { return envelope.id; });
    return result;
  }

  public listen(onReply: (data: unknown) => void, onFailure: (message: string) => void): void {
    this.#onReply = onReply;
    this.#onFailure = onFailure;
  }

  public post(envelope: WorkerEnvelopeEntity.Type): void {
    this.posted.push(envelope);
  }

  public reply(data: unknown): void {
    this.#onReply(data);
  }

  public terminate(): void {
    this.terminated = true;
  }

  public transfer(pixels: ArrayBuffer): void {
    this.transferred.push(pixels);
  }
}

class RecordingHandlers implements WorkerHandlersInterface {
  public readonly accepted: WorkerEnvelopeEntity.Type[] = [];
  public readonly rejected: string[] = [];
  public readonly states: string[] = [];

  public accept(_reply: WorkerReplyEntity.Type, envelope: WorkerEnvelopeEntity.Type): void {
    this.accepted.push(envelope);
  }

  public busy(message: WorkerMessageEntity.Type): void {
    this.states.push(`busy:${message.kind}`);
  }

  public idle(message: WorkerMessageEntity.Type): void {
    this.states.push(`idle:${message.kind}`);
  }

  public reject(message: string): void {
    this.rejected.push(message);
  }
}

class ClientFixture {
  public readonly client: WorkerRequestClient;
  public readonly handlers = new RecordingHandlers();
  public readonly port = new FakePort();

  public constructor() {
    this.client = new WorkerRequestClient(this.port, this.handlers);
  }

  public static combine(): WorkerMessageEntity.Type {
    const result = WorkerMessageEntity.create({
      'colorSpace': 'srgb',
      'derivationConfig': PaletteResolveFixture.request().derivationConfig,
      'framing': 'dark',
      'hexes': ['#112233'],
      'kind': 'combine',
      'schemaName': 'iridis-8',
      'semanticHuesEnabled': true,
      'settings': ClientFixture.settings(),
      'strictness': 2
    });
    return result;
  }

  public static extract(imageId: string): WorkerMessageEntity.Type {
    const result = WorkerMessageEntity.create({ 'imageId': imageId, 'kind': 'extract', 'settings': ClientFixture.settings() });
    return result;
  }

  public static extractReply(id: number): WorkerReplyEntity.Type {
    const result = WorkerReplyEntity.create({
      'id': id,
      'kind': 'extract',
      'result': ImageExtractionResultEntity.create({ 'candidates': [], 'dominantColorRecords': [{ 'hex': '#112233', 'weight': 1 }], 'histogram': [] })
    });
    return result;
  }

  public static palette(strictness: number): WorkerMessageEntity.Type {
    const request = PaletteResolveRequestInterfaceTypeEntity.create({ ...PaletteResolveFixture.request(), 'strictness': strictness });
    const result = WorkerMessageEntity.create({ 'kind': 'palette', 'request': request });
    return result;
  }

  public static paletteReply(id: number): WorkerReplyEntity.Type {
    const result = WorkerReplyEntity.create({
      'id': id,
      'kind': 'palette',
      'snapshot': PaletteSnapshotInterfaceTypeEntity.create(PaletteResolveFixture.snapshot())
    });
    return result;
  }

  public static settings(): ExtractionSettingsEntity.Type {
    const result = ExtractionSettingsEntity.create({
      'algorithm': 'delta-e',
      'chromaRange': [[0, 0.5]],
      'deltaECap': 128,
      'harmonizeThreshold': 10,
      'histogramBits': 5,
      'k': 8,
      'lightnessRange': [[0, 1]]
    });
    return result;
  }

  public accepted(): string[] {
    const result = this.handlers.accepted.map((envelope) => { return `${envelope.message.kind}#${envelope.id}`; });
    return result;
  }
}

await test('a single request posts once and delivers its reply with the originating envelope', async () => {
  const fixture = new ClientFixture();

  const settled = fixture.client.request(ClientFixture.palette(0));
  assert.deepEqual(fixture.port.ids(), [1]);
  assert.deepEqual(fixture.handlers.states, ['busy:palette']);

  const reply = ClientFixture.paletteReply(1);
  fixture.port.reply(reply);
  assert.deepEqual(fixture.accepted(), ['palette#1']);
  assert.deepEqual(fixture.handlers.states, ['busy:palette', 'idle:palette']);
  assert.deepEqual(await settled, reply);
});

await test('latest wins: a busy lane holds only the newest request and the superseded reply is discarded', async () => {
  const fixture = new ClientFixture();

  const first = fixture.client.request(ClientFixture.palette(0));
  const second = fixture.client.request(ClientFixture.palette(1));
  const third = fixture.client.request(ClientFixture.palette(2));
  assert.deepEqual(fixture.port.ids(), [1]);
  assert.equal(await second, undefined, 'a waiting request replaced by a newer one never posts and settles undefined');

  fixture.port.reply(ClientFixture.paletteReply(1));
  assert.deepEqual(fixture.accepted(), []);
  assert.equal(await first, undefined, 'a superseded in-flight reply settles undefined');
  assert.deepEqual(fixture.port.ids(), [1, 3]);
  assert.deepEqual(fixture.handlers.states, ['busy:palette']);

  fixture.port.reply(ClientFixture.paletteReply(3));
  assert.deepEqual(fixture.accepted(), ['palette#3']);
  assert.notEqual(await third, undefined);
  assert.deepEqual(fixture.handlers.states, ['busy:palette', 'idle:palette']);
});

await test('lanes are independent: a newer extract supersedes only its own image and every lane delivers its newest reply', () => {
  const fixture = new ClientFixture();

  void fixture.client.request(ClientFixture.extract('img-a'));
  void fixture.client.request(ClientFixture.extract('img-b'));
  void fixture.client.request(ClientFixture.palette(0));
  void fixture.client.request(ClientFixture.extract('img-a'));
  assert.deepEqual(fixture.port.ids(), [1, 2, 3], 'each lane has one request in flight');

  fixture.port.reply(ClientFixture.extractReply(1));
  assert.deepEqual(fixture.accepted(), [], 'the superseded img-a reply is discarded');
  assert.deepEqual(fixture.port.ids(), [1, 2, 3, 4], 'the newest img-a request posts after the stale reply');

  fixture.port.reply(ClientFixture.extractReply(2));
  fixture.port.reply(ClientFixture.paletteReply(3));
  fixture.port.reply(ClientFixture.extractReply(4));
  assert.deepEqual(fixture.accepted(), ['extract#2', 'palette#3', 'extract#4']);
  const idles = fixture.handlers.states.filter((state) => {
    const isIdle = state.startsWith('idle');
    return isIdle;
  });
  assert.deepEqual(idles, ['idle:extract', 'idle:palette', 'idle:extract']);
});

await test('replies for ids that are not in flight are ignored', () => {
  const fixture = new ClientFixture();

  void fixture.client.request(ClientFixture.palette(0));
  void fixture.client.request(ClientFixture.palette(1));
  fixture.port.reply(ClientFixture.paletteReply(2));
  fixture.port.reply(ClientFixture.paletteReply(99));
  assert.deepEqual(fixture.accepted(), []);
  assert.deepEqual(fixture.port.ids(), [1]);

  fixture.port.reply(ClientFixture.paletteReply(1));
  fixture.port.reply(ClientFixture.paletteReply(2));
  fixture.port.reply(ClientFixture.paletteReply(2));
  assert.deepEqual(fixture.accepted(), ['palette#2']);
});

await test('a failure reply for the newest request is rejected and idles its lane', async () => {
  const fixture = new ClientFixture();

  const settled = fixture.client.request(ClientFixture.palette(0));
  fixture.port.reply(WorkerReplyEntity.create({ 'failure': 'engine failed', 'id': 1, 'kind': 'palette' }));

  assert.deepEqual(fixture.handlers.rejected, ['engine failed']);
  assert.deepEqual(fixture.accepted(), []);
  assert.deepEqual(fixture.handlers.states, ['busy:palette', 'idle:palette']);
  assert.equal(await settled, undefined);
});

await test('a failure reply for a superseded request is dropped and the newest request still resolves', () => {
  const fixture = new ClientFixture();

  void fixture.client.request(ClientFixture.palette(0));
  void fixture.client.request(ClientFixture.palette(1));
  fixture.port.reply(WorkerReplyEntity.create({ 'failure': 'stale failure', 'id': 1, 'kind': 'palette' }));
  assert.deepEqual(fixture.handlers.rejected, []);

  fixture.port.reply(ClientFixture.paletteReply(2));
  assert.deepEqual(fixture.accepted(), ['palette#2']);
});

await test('a port failure rejects every newest in-flight request and advances waiting ones', () => {
  const single = new ClientFixture();
  void single.client.request(ClientFixture.palette(0));
  void single.client.request(ClientFixture.extract('img-a'));
  single.port.fail('worker crashed');
  assert.deepEqual(single.handlers.rejected, ['worker crashed', 'worker crashed']);
  assert.deepEqual(single.handlers.states, ['busy:palette', 'busy:extract', 'idle:palette', 'idle:extract']);

  const queued = new ClientFixture();
  void queued.client.request(ClientFixture.palette(0));
  void queued.client.request(ClientFixture.palette(1));
  queued.port.fail('worker crashed');
  assert.deepEqual(queued.handlers.rejected, []);
  assert.deepEqual(queued.port.ids(), [1, 2]);
});

await test('a malformed reply is rejected as a failure of the in-flight request', () => {
  const fixture = new ClientFixture();

  void fixture.client.request(ClientFixture.palette(0));
  fixture.port.reply({ 'id': 'one' });

  assert.equal(fixture.handlers.rejected.length, 1);
  assert.deepEqual(fixture.accepted(), []);
});

await test('pixels transfer their buffer ahead of the command, take no lane, and release cancels the image lane', async () => {
  const fixture = new ClientFixture();
  const buffer = new ArrayBuffer(16);

  await fixture.client.request(WorkerMessageEntity.create({ 'height': 2, 'imageId': 'img-a', 'kind': 'pixels', 'width': 2 }), buffer);
  assert.deepEqual(fixture.port.transferred, [buffer]);
  assert.equal(fixture.port.posted[0]?.message.kind, 'pixels');
  assert.equal(fixture.client.holdsPixels('img-a'), true);
  assert.deepEqual(fixture.handlers.states, []);

  const settled = fixture.client.request(ClientFixture.extract('img-a'));
  await fixture.client.request(WorkerMessageEntity.create({ 'imageId': 'img-a', 'kind': 'release' }));
  assert.equal(fixture.client.holdsPixels('img-a'), false);
  assert.equal(fixture.port.posted.at(-1)?.message.kind, 'release');

  fixture.port.reply(ClientFixture.extractReply(2));
  assert.deepEqual(fixture.accepted(), [], 'the in-flight reply of a released image is discarded');
  assert.equal(await settled, undefined);
  assert.deepEqual(fixture.handlers.states, ['busy:extract', 'idle:extract']);
});

await test('cancelCombine discards the in-flight combine reply and idles the lane', async () => {
  const fixture = new ClientFixture();

  const settled = fixture.client.request(ClientFixture.combine());
  fixture.client.cancelCombine();
  fixture.port.reply(WorkerReplyEntity.create({ 'id': 1, 'kind': 'combine' }));

  assert.deepEqual(fixture.accepted(), []);
  assert.equal(await settled, undefined);
  assert.deepEqual(fixture.handlers.states, ['busy:combine', 'idle:combine']);
});

await test('dispose terminates the port, idles every active lane, settles pending requests, and ignores later traffic', async () => {
  const fixture = new ClientFixture();

  const settled = fixture.client.request(ClientFixture.palette(0));
  void fixture.client.request(ClientFixture.extract('img-a'));
  fixture.client.dispose();
  assert.equal(fixture.port.terminated, true);
  assert.deepEqual(fixture.handlers.states, ['busy:palette', 'busy:extract', 'idle:palette', 'idle:extract']);
  assert.equal(await settled, undefined);

  fixture.port.reply(ClientFixture.paletteReply(1));
  const after = await fixture.client.request(ClientFixture.palette(1));
  assert.equal(after, undefined);
  assert.deepEqual(fixture.accepted(), []);
  assert.deepEqual(fixture.port.ids(), [1, 2]);
});
