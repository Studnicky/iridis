import assert from 'node:assert/strict';
import { registerHooks } from 'node:module';
import { test } from 'node:test';
import { watch } from 'vue';

import type { WorkerReplyEntity } from '../app/composables/entities/WorkerReplyEntity.ts';
import type { EngineWorkerScopeInterface } from '../app/composables/interfaces/EngineWorkerScopeInterface.ts';

import { PaletteResolveRequestEntity } from '../app/composables/entities/PaletteResolveRequestEntity.ts';
import { WorkerEnvelopeEntity } from '../app/composables/entities/WorkerEnvelopeEntity.ts';
import { PaletteResolve } from '../app/composables/paletteResolve.ts';
import { IridisUiEvent } from '../app/composables/types/iridisUiEvent.ts';
import { EngineWorkerHost } from '../app/workers/EngineWorkerHost.ts';
import * as NuxtImportsLoader from './fixtures/NuxtImportsLoader.mjs';
import { PaletteResolveFixture } from './fixtures/PaletteResolveFixture.ts';

registerHooks(NuxtImportsLoader);

class FakeScope implements EngineWorkerScopeInterface {
  readonly #listeners: ((event: MessageEvent<unknown>) => void)[] = [];
  readonly #replyTo: (reply: WorkerReplyEntity.Type) => void;

  constructor(replyTo: (reply: WorkerReplyEntity.Type) => void) {this.#replyTo = replyTo;}

  addEventListener(_type: 'message', listener: (event: MessageEvent<unknown>) => void): void {
    this.#listeners.push(listener);
  }

  deliver(data: unknown): void {
    const event = new MessageEvent('message', { 'data': data, 'origin': '' });
    this.#listeners.forEach((listener) => {listener(event);});
  }

  postMessage(reply: WorkerReplyEntity.Type): void {
    this.#replyTo(reply);
  }
}

class PaletteTraffic {
  static readonly requests: PaletteResolveRequestEntity.Type[] = [];
  static readonly #byId = new Map<number, PaletteResolveRequestEntity.Type>();
  static readonly #waiters: { readonly 'accepts': (request: PaletteResolveRequestEntity.Type) => boolean; readonly 'resolve': () => void }[] = [];

  static nextReplyTo(accepts: (request: PaletteResolveRequestEntity.Type) => boolean): Promise<void> {
    const result = new Promise<void>((resolve) => { PaletteTraffic.#waiters.push({ 'accepts': accepts, 'resolve': resolve }); });
    return result;
  }

  static record(envelope: WorkerEnvelopeEntity.Type): void {
    if (envelope.message.kind === 'palette') {
      PaletteTraffic.requests.push(envelope.message.request);
      PaletteTraffic.#byId.set(envelope.id, envelope.message.request);
    }
  }

  static replied(id: number): void {
    const request = PaletteTraffic.#byId.get(id);
    const waiting = PaletteTraffic.#waiters.splice(0);
    for (let index = 0; index < waiting.length; index += 1) {
      const waiter = waiting[index];
      if (waiter !== undefined) {
        if (request !== undefined && waiter.accepts(request)) {
          waiter.resolve();
        } else {
          PaletteTraffic.#waiters.push(waiter);
        }
      }
    }
  }

  static reset(): void {
    PaletteTraffic.requests.length = 0;
    PaletteTraffic.#byId.clear();
    PaletteTraffic.#waiters.length = 0;
  }
}

class PairRequirements {
  static count(pairs: readonly { readonly 'requiredTrichromat': number }[], requirement: number): number {
    let matches = 0;
    for (let index = 0; index < pairs.length; index += 1) {
      if (pairs[index]?.requiredTrichromat === requirement) {matches += 1;}
    }
    return matches;
  }
}

class FakeWorker {
  readonly #messageListeners: ((event: { readonly 'data': unknown }) => void)[] = [];
  readonly #scope: FakeScope;

  constructor() {
    this.#scope = new FakeScope((reply) => {
      const cloned = structuredClone(reply);
      queueMicrotask(() => {
        this.#messageListeners.forEach((listener) => {listener({ 'data': cloned });});
        if (reply.kind === 'palette') {PaletteTraffic.replied(reply.id);}
      });
    });
    EngineWorkerHost.start(this.#scope);
  }

  addEventListener(type: string, listener: (event: { readonly 'data': unknown }) => void): void {
    if (type === 'message') {this.#messageListeners.push(listener);}
  }

  postMessage(data: unknown, transfer: Transferable[] = []): void {
    const message = structuredClone(data, { 'transfer': transfer });
    if (WorkerEnvelopeEntity.validate(message)) {PaletteTraffic.record(message);}
    queueMicrotask(() => {this.#scope.deliver(message);});
  }

  terminate(): void {}
}

class FakeImage {
  crossOrigin = '';
  naturalHeight = 2;
  naturalWidth = 2;
  onerror: (() => void) | null = null;
  onload: (() => void) | null = null;

  constructor() {
    queueMicrotask(() => {this.onload?.();});
  }
}

class FakeClassList {
  add(): void {}
  remove(): void {}
  toggle(): boolean {return true;}
}

class FakeCanvasContext {
  drawImage(): void {}

  getImageData(): { readonly 'data': Uint8ClampedArray } {
    return { 'data': new Uint8ClampedArray([94, 53, 177, 255, 255, 255, 255, 255, 0, 0, 0, 255, 94, 53, 177, 255]) };
  }
}

class FakeCanvas {
  height = 0;
  width = 0;

  getContext(): FakeCanvasContext {return new FakeCanvasContext();}
}

class FakeDocument {
  readonly documentElement = {
    'classList': new FakeClassList(),
    'dataset':   {},
    'style':     { 'setProperty': function setProperty(): void {} }
  };

  createElement(tagName: string): FakeCanvas {
    if (tagName !== 'canvas') {throw new TypeError(`Unexpected element request: ${tagName}`);}
    return new FakeCanvas();
  }

  getElementById(): null {return null;}
}

class Session {
  static async open(context: { readonly 'mock': { readonly 'timers': { enable(options: { readonly 'apis': readonly 'setTimeout'[] }): void } } }) {
    context.mock.timers.enable({ 'apis': ['setTimeout'] });
    PaletteTraffic.reset();
    Reflect.set(globalThis, 'iridisTestNuxtApp', {});
    Reflect.set(globalThis, 'window', {});
    Reflect.set(globalThis, 'document', new FakeDocument());
    Reflect.set(globalThis, 'Image', FakeImage);
    Reflect.set(globalThis, 'Worker', FakeWorker);
    const { useIridis } = await import('../app/composables/useIridis.ts');
    const state = useIridis();
    await Session.until(function bootResolved(): boolean {
      const resolved = state.paletteRevision.value >= 1;
      return resolved;
    }, state);
    return state;
  }

  static until(isReady: () => boolean, state: Awaited<ReturnType<typeof Session.open>>): Promise<void> {
    const result = new Promise<void>((resolve) => {
      const stop = watch([state.paletteRevision, state.cvdMode, state.nonMandatoryLevel, state.contrastStrictness], () => {
        if (isReady()) {
          stop();
          resolve();
        }
      }, { 'flush': 'sync' });
      if (isReady()) {
        stop();
        resolve();
      }
    });
    return result;
  }

  static async resolveAfter(state: Awaited<ReturnType<typeof Session.open>>, event: IridisUiEvent, isApplied: () => boolean): Promise<PaletteResolveRequestEntity.Type> {
    const posted = PaletteTraffic.requests.length;
    state.send(event);
    await Session.until(isApplied, state);
    const replied = PaletteTraffic.nextReplyTo((request) => {
      const matches = request.cvdMode === state.cvdMode.value
        && request.nonMandatoryLevel === state.nonMandatoryLevel.value
        && request.strictness === state.contrastStrictness.value;
      return matches;
    });
    state.run();
    await replied;
    const request = PaletteTraffic.requests[posted];
    assert.ok(request !== undefined, 'the selection posts a palette request');
    return request;
  }
}

await test('the demo resolves with cvdMode nudge and nonMandatoryLevel AA until the author selects otherwise', async (context) => {
  const state = await Session.open(context);
  const first = PaletteTraffic.requests[0];

  assert.equal(state.cvdMode.value, 'nudge');
  assert.equal(state.nonMandatoryLevel.value, 'AA');
  assert.equal(first?.cvdMode, 'nudge');
  assert.equal(first?.nonMandatoryLevel, 'AA');
});

await test('the cvdMode and nonMandatoryLevel events reach the worker request and the resolved compliance report', async (context) => {
  const state = await Session.open(context);
  await Session.resolveAfter(state, IridisUiEvent.setContrastStrictness(1), () => {
    const applied = state.contrastStrictness.value === 1;
    return applied;
  });
  const baseline = state.contrastReport.value.compliance;
  assert.ok(baseline !== undefined);
  const baselineNonText = PairRequirements.count(baseline.pairs, 3);
  assert.ok(baselineNonText > 0, 'WCAG AAA with nonMandatoryLevel AA keeps 3:1 on non-text pairs');

  const revisionBefore = state.paletteRevision.value;
  const lifted = await Session.resolveAfter(state, IridisUiEvent.setNonMandatoryLevel('AAA'), () => {
    const applied = state.nonMandatoryLevel.value === 'AAA';
    return applied;
  });
  assert.equal(lifted.nonMandatoryLevel, 'AAA');
  assert.equal(lifted.cvdMode, 'nudge');
  const liftedReport = state.contrastReport.value.compliance;
  assert.ok(liftedReport !== undefined);
  assert.equal(PairRequirements.count(liftedReport.pairs, 3), 0, 'AAA lifts every 3:1 non-text pair');
  assert.equal(PairRequirements.count(liftedReport.pairs, 4.5), baselineNonText + PairRequirements.count(baseline.pairs, 4.5));
  assert.ok(state.paletteRevision.value > revisionBefore, 'the admitted palette advances the revision');

  const warned = await Session.resolveAfter(state, IridisUiEvent.setCvdMode('warn'), () => {
    const applied = state.cvdMode.value === 'warn';
    return applied;
  });
  assert.equal(warned.cvdMode, 'warn');
  assert.equal(warned.nonMandatoryLevel, 'AAA');
  assert.ok(state.paletteRevision.value > revisionBefore + 1, 'each admitted palette advances the revision');

  const enforced = await Session.resolveAfter(state, IridisUiEvent.setCvdMode('enforce'), () => {
    const applied = state.cvdMode.value === 'enforce';
    return applied;
  });
  assert.equal(enforced.cvdMode, 'enforce');
  assert.equal(enforced.nonMandatoryLevel, 'AAA');
  assert.ok(state.accessibilityBlockers.value.pairs.length > 0, 'enforce surfaces unresolved CVD evidence as blockers');
  assert.equal(state.paletteRevision.value, revisionBefore + 2, 'a palette with blockers is withheld, so the revision stays');
});

await test('the engine resolves CVD evidence according to the selected cvdMode', () => {
  const base = { ...PaletteResolveFixture.request(), 'schemaName': 'iridis-32', 'strictness': 2 } as const;
  const warn = PaletteResolve.run(PaletteResolveRequestEntity.create({ ...base, 'cvdMode': 'warn' }));
  const nudge = PaletteResolve.run(PaletteResolveRequestEntity.create({ ...base, 'cvdMode': 'nudge' }));
  const enforce = PaletteResolve.run(PaletteResolveRequestEntity.create({ ...base, 'cvdMode': 'enforce' }));

  assert.equal(warn.compliance?.cvdCompliant, true);
  assert.equal(nudge.compliance?.cvdCompliant, true);
  assert.equal(enforce.compliance?.cvdCompliant, false, 'enforce reports unresolved CVD evidence as non-compliant');
  assert.deepEqual(warn.roles, nudge.roles);
});
