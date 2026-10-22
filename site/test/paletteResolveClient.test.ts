import assert from 'node:assert/strict';
import { test } from 'node:test';

import type { PaletteResolveEnvelopeInterfaceTypeEntity } from '../app/composables/entities/PaletteResolveEnvelopeInterfaceTypeEntity.ts';
import type { PaletteResolveHandlersInterface } from '../app/composables/interfaces/PaletteResolveHandlersInterface.ts';
import type { PaletteResolvePortInterface } from '../app/composables/interfaces/PaletteResolvePortInterface.ts';

import { PaletteResolveReplyInterfaceTypeEntity } from '../app/composables/entities/PaletteResolveReplyInterfaceTypeEntity.ts';
import { PaletteResolveRequestInterfaceTypeEntity } from '../app/composables/entities/PaletteResolveRequestInterfaceTypeEntity.ts';
import { PaletteSnapshotInterfaceTypeEntity } from '../app/composables/entities/PaletteSnapshotInterfaceTypeEntity.ts';
import { PaletteResolveClient } from '../app/composables/paletteResolveClient.ts';
import { PaletteResolveFixture } from './fixtures/PaletteResolveFixture.ts';

class FakePort implements PaletteResolvePortInterface {
  public readonly posted: PaletteResolveEnvelopeInterfaceTypeEntity.Type[] = [];
  public terminated = false;
  #onFailure: (message: string) => void = () => {};
  #onReply: (data: unknown) => void = () => {};

  public fail(message: string): void {
    this.#onFailure(message);
  }

  public listen(onReply: (data: unknown) => void, onFailure: (message: string) => void): void {
    this.#onReply = onReply;
    this.#onFailure = onFailure;
  }

  public post(envelope: PaletteResolveEnvelopeInterfaceTypeEntity.Type): void {
    this.posted.push(envelope);
  }

  public reply(data: unknown): void {
    this.#onReply(data);
  }

  public terminate(): void {
    this.terminated = true;
  }
}

class RecordingHandlers implements PaletteResolveHandlersInterface {
  public readonly accepted: PaletteResolveRequestInterfaceTypeEntity.Type[] = [];
  public readonly rejected: string[] = [];
  public readonly states: string[] = [];

  public accept(_snapshot: PaletteSnapshotInterfaceTypeEntity.Type, request: PaletteResolveRequestInterfaceTypeEntity.Type): void {
    this.accepted.push(request);
  }

  public reject(message: string): void {
    this.rejected.push(message);
  }

  public busy(): void {
    this.states.push('busy');
  }

  public idle(): void {
    this.states.push('idle');
  }
}

class ClientFixture {
  public readonly client: PaletteResolveClient;
  public readonly handlers = new RecordingHandlers();
  public readonly port = new FakePort();

  public constructor() {
    this.client = new PaletteResolveClient(this.port, this.handlers);
  }

  public static request(strictness: number): PaletteResolveRequestInterfaceTypeEntity.Type {
    const result = PaletteResolveRequestInterfaceTypeEntity.create({ ...PaletteResolveFixture.request(), 'strictness': strictness });
    return result;
  }

  public static snapshotReply(id: number): PaletteResolveReplyInterfaceTypeEntity.Type {
    const result = PaletteResolveReplyInterfaceTypeEntity.create({
      'id': id,
      'snapshot': PaletteSnapshotInterfaceTypeEntity.create(PaletteResolveFixture.snapshot())
    });
    return result;
  }
}

await test('a single request posts once and delivers its snapshot with the originating request', () => {
  const fixture = new ClientFixture();
  const request = ClientFixture.request(0);

  fixture.client.request(request);
  assert.deepEqual(fixture.port.posted.map((envelope) => { return envelope.id; }), [1]);
  assert.deepEqual(fixture.handlers.states, ['busy']);

  fixture.port.reply(ClientFixture.snapshotReply(1));
  assert.deepEqual(fixture.handlers.accepted, [request]);
  assert.deepEqual(fixture.handlers.states, ['busy', 'idle']);
});

await test('latest wins: a busy worker holds only the newest request and the superseded reply is dropped', () => {
  const fixture = new ClientFixture();
  const newest = ClientFixture.request(2);

  fixture.client.request(ClientFixture.request(0));
  fixture.client.request(ClientFixture.request(1));
  fixture.client.request(newest);
  assert.deepEqual(fixture.port.posted.map((envelope) => { return envelope.id; }), [1]);

  fixture.port.reply(ClientFixture.snapshotReply(1));
  assert.deepEqual(fixture.handlers.accepted, []);
  assert.deepEqual(fixture.handlers.states, ['busy', 'busy', 'busy']);
  assert.deepEqual(fixture.port.posted.map((envelope) => { return envelope.id; }), [1, 3]);

  fixture.port.reply(ClientFixture.snapshotReply(3));
  assert.deepEqual(fixture.handlers.accepted, [newest]);
  assert.deepEqual(fixture.handlers.states.at(-1), 'idle');
});

await test('replies for ids that are not in flight are ignored', () => {
  const fixture = new ClientFixture();
  const first = ClientFixture.request(0);

  fixture.client.request(first);
  fixture.client.request(ClientFixture.request(1));
  fixture.port.reply(ClientFixture.snapshotReply(2));
  fixture.port.reply(ClientFixture.snapshotReply(99));
  assert.deepEqual(fixture.handlers.accepted, []);
  assert.deepEqual(fixture.port.posted.map((envelope) => { return envelope.id; }), [1]);

  fixture.port.reply(ClientFixture.snapshotReply(1));
  fixture.port.reply(ClientFixture.snapshotReply(2));
  fixture.port.reply(ClientFixture.snapshotReply(2));
  assert.equal(fixture.handlers.accepted.length, 1);
  const delivered: readonly PaletteResolveRequestInterfaceTypeEntity.Type[] = fixture.handlers.accepted;
  assert.equal(delivered[0]?.strictness, 1);
});

await test('a failure reply for the newest request is rejected and clears the resolving state', () => {
  const fixture = new ClientFixture();

  fixture.client.request(ClientFixture.request(0));
  fixture.port.reply(PaletteResolveReplyInterfaceTypeEntity.create({ 'failure': 'engine failed', 'id': 1 }));

  assert.deepEqual(fixture.handlers.rejected, ['engine failed']);
  assert.deepEqual(fixture.handlers.accepted, []);
  assert.deepEqual(fixture.handlers.states, ['busy', 'idle']);
});

await test('a failure reply for a superseded request is dropped and the newest request still resolves', () => {
  const fixture = new ClientFixture();
  const newest = ClientFixture.request(1);

  fixture.client.request(ClientFixture.request(0));
  fixture.client.request(newest);
  fixture.port.reply(PaletteResolveReplyInterfaceTypeEntity.create({ 'failure': 'stale failure', 'id': 1 }));
  assert.deepEqual(fixture.handlers.rejected, []);

  fixture.port.reply(ClientFixture.snapshotReply(2));
  assert.deepEqual(fixture.handlers.accepted, [newest]);
});

await test('a port failure rejects the in-flight newest request and advances a waiting one otherwise', () => {
  const single = new ClientFixture();
  single.client.request(ClientFixture.request(0));
  single.port.fail('worker crashed');
  assert.deepEqual(single.handlers.rejected, ['worker crashed']);
  assert.deepEqual(single.handlers.states, ['busy', 'idle']);

  const queued = new ClientFixture();
  queued.client.request(ClientFixture.request(0));
  queued.client.request(ClientFixture.request(1));
  queued.port.fail('worker crashed');
  assert.deepEqual(queued.handlers.rejected, []);
  assert.deepEqual(queued.port.posted.map((envelope) => { return envelope.id; }), [1, 2]);
});

await test('a malformed reply is rejected as a failure of the in-flight request', () => {
  const fixture = new ClientFixture();

  fixture.client.request(ClientFixture.request(0));
  fixture.port.reply({ 'id': 'one' });

  assert.equal(fixture.handlers.rejected.length, 1);
  assert.deepEqual(fixture.handlers.accepted, []);
});

await test('dispose terminates the port, clears the resolving state, and ignores later traffic', () => {
  const fixture = new ClientFixture();

  fixture.client.request(ClientFixture.request(0));
  fixture.client.dispose();
  assert.equal(fixture.port.terminated, true);
  assert.deepEqual(fixture.handlers.states, ['busy', 'idle']);

  fixture.port.reply(ClientFixture.snapshotReply(1));
  fixture.client.request(ClientFixture.request(1));
  assert.deepEqual(fixture.handlers.accepted, []);
  assert.deepEqual(fixture.port.posted.map((envelope) => { return envelope.id; }), [1]);
  assert.deepEqual(fixture.handlers.states, ['busy', 'idle']);
});
