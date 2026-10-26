import assert from 'node:assert/strict';
import { test } from 'node:test';

import type { ColorGraphMountHostInterface } from '../app/components/content/viz/ColorGraphMountHostInterface.ts';

import { ColorGraphLifecycleEvent } from '../app/components/content/viz/ColorGraphLifecycleEvent.ts';
import { ColorGraphMountController } from '../app/components/content/viz/ColorGraphMountController.ts';

class FakeGraph {
  public readonly serial: number;

  public constructor(serial: number) {
    this.serial = serial;
  }
}

class FakeSnapshot {
  public readonly serial: number;

  public constructor(serial: number) {
    this.serial = serial;
  }
}

class FakeHost implements ColorGraphMountHostInterface<FakeGraph, FakeSnapshot> {
  public readonly presented: (FakeSnapshot | null)[] = [];
  public constructFailures = 0;
  public constructed = 0;
  public disposed = 0;
  public rejections = 0;
  public snapshotsAvailable = true;

  public capture(handle: FakeGraph): FakeSnapshot | null {
    const result = this.snapshotsAvailable ? new FakeSnapshot(handle.serial) : null;

    return result;
  }

  public construct(): FakeGraph {
    if (this.constructFailures > 0) {
      this.constructFailures -= 1;
      throw new Error('WebGL2 unavailable');
    }
    this.constructed += 1;
    const result = new FakeGraph(this.constructed);

    return result;
  }

  public dispose(): void {
    this.disposed += 1;
  }

  public liveCount(): number {
    const result = this.constructed - this.disposed;

    return result;
  }

  public presentSnapshot(snapshot: FakeSnapshot | null): void {
    this.presented.push(snapshot);
  }

  public reportRejection(): void {
    this.rejections += 1;
  }
}

class MountedGraph {
  /** Resolves after every queued lifecycle event has been reduced. */
  static async drain(): Promise<void> {
    await new Promise<void>((resolve) => {
      setImmediate(resolve);
    });
  }

  static async ready(controller: ColorGraphMountController<FakeGraph, FakeSnapshot>): Promise<void> {
    controller.signal(ColorGraphLifecycleEvent.deviceReady());
    await MountedGraph.drain();
  }

  static async settled(controller: ColorGraphMountController<FakeGraph, FakeSnapshot>): Promise<void> {
    await MountedGraph.ready(controller);
    controller.signal(ColorGraphLifecycleEvent.fitArmed());
    controller.signal(ColorGraphLifecycleEvent.fitSettled());
    await MountedGraph.drain();
  }
}

await test('an active face mounts one live graph and a repeated activation reuses it', async () => {
  const host = new FakeHost();
  const controller = ColorGraphMountController.create(host);

  const first = controller.mount();
  const second = controller.mount();

  await MountedGraph.drain();

  assert.equal(first, second);
  assert.equal(host.constructed, 1);
  assert.equal(host.liveCount(), 1);
  assert.equal(controller.getState().variant, 'constructing');
});

await test('an inactive face takes a snapshot, disposes the graph, and shows the snapshot', async () => {
  const host = new FakeHost();
  const controller = ColorGraphMountController.create(host);

  controller.mount();
  await MountedGraph.settled(controller);
  controller.suspend();
  await MountedGraph.drain();

  assert.equal(host.liveCount(), 0);
  assert.equal(host.presented.length, 1);
  assert.equal(host.presented[0]?.serial, 1);
  assert.equal(controller.getState().variant, 'suspended');
});

await test('a face that deactivates before its device is ready disposes without a snapshot', async () => {
  const host = new FakeHost();
  const controller = ColorGraphMountController.create(host);

  controller.mount();
  controller.suspend();
  await MountedGraph.drain();

  assert.equal(host.liveCount(), 0);
  assert.deepEqual(host.presented, [null]);
  assert.equal(controller.getState().variant, 'idle');
});

await test('a failed capture leaves no snapshot and returns the machine to idle', async () => {
  const host = new FakeHost();
  const controller = ColorGraphMountController.create(host);

  host.snapshotsAvailable = false;
  controller.mount();
  await MountedGraph.settled(controller);
  controller.suspend();
  await MountedGraph.drain();

  assert.equal(host.liveCount(), 0);
  assert.equal(controller.getState().variant, 'idle');
});

await test('reactivating a suspended face mounts a new graph and releasing the snapshot clears it', async () => {
  const host = new FakeHost();
  const controller = ColorGraphMountController.create(host);

  controller.mount();
  await MountedGraph.settled(controller);
  controller.suspend();
  controller.mount();
  await MountedGraph.drain();

  assert.equal(controller.getState().variant, 'constructing');
  assert.equal(host.liveCount(), 1);

  controller.releaseSnapshot();

  assert.equal(host.presented.at(-1), null);
  assert.equal(host.presented.filter((entry) => {
    const present = entry !== null;

    return present;
  }).length, 1);
});

await test('rapid face changes never leave more than one live graph', async () => {
  const host = new FakeHost();
  const controller = ColorGraphMountController.create(host);
  const toggles = 25;

  for (let index = 0; index < toggles; index += 1) {
    controller.mount();
    assert.ok(host.liveCount() <= 1, `live graphs after mount ${String(index)}: ${String(host.liveCount())}`);
    if (index % 2 === 0) {
      await MountedGraph.settled(controller);
    }
    controller.suspend();
    assert.equal(host.liveCount(), 0);
  }
  controller.mount();

  assert.equal(host.liveCount(), 1);
  assert.equal(host.constructed, toggles + 1);

  controller.dispose();
  await MountedGraph.drain();

  assert.equal(host.liveCount(), 0);
  assert.equal(controller.getState().variant, 'idle');
});

await test('a failed construction returns to idle and the next activation retries', async () => {
  const host = new FakeHost();
  const controller = ColorGraphMountController.create(host);

  host.constructFailures = 1;

  assert.throws(() => { controller.mount(); }, { 'message': 'WebGL2 unavailable' });
  await MountedGraph.drain();

  assert.equal(host.liveCount(), 0);
  assert.equal(controller.getState().variant, 'idle');

  controller.mount();

  assert.equal(host.liveCount(), 1);
});

await test('suspending and disposing cancel every scheduled timer on a virtual clock', (context) => {
  context.mock.timers.enable({ 'apis': ['setTimeout'] });
  const host = new FakeHost();
  const controller = ColorGraphMountController.create(host);
  let fired = 0;
  const count = (): void => { fired += 1; };

  controller.mount();
  controller.schedule('fit', 250, count);
  controller.schedule('fit', 500, count);
  controller.schedule('zoomIdle', 250, count);

  assert.equal(controller.pendingTimerCount(), 3);

  context.mock.timers.tick(250);

  assert.equal(fired, 2);
  assert.equal(controller.pendingTimerCount(), 1);

  controller.suspend();

  assert.equal(controller.pendingTimerCount(), 0);

  context.mock.timers.tick(10_000);

  assert.equal(fired, 2);

  controller.mount();
  controller.schedule('fit', 100, count);
  controller.dispose();
  context.mock.timers.tick(10_000);

  assert.equal(controller.pendingTimerCount(), 0);
  assert.equal(fired, 2);
});

await test('cancelling one timer group leaves the others scheduled', (context) => {
  context.mock.timers.enable({ 'apis': ['setTimeout'] });
  const host = new FakeHost();
  const controller = ColorGraphMountController.create(host);
  const fired: string[] = [];

  controller.schedule('fit', 100, () => { fired.push('fit'); });
  controller.schedule('zoomIdle', 100, () => { fired.push('zoomIdle'); });
  controller.cancel('fit');
  context.mock.timers.tick(100);

  assert.deepEqual(fired, ['zoomIdle']);
  assert.equal(controller.pendingTimerCount(), 0);
});

await test('lifecycle events are delivered without rejections', async () => {
  const host = new FakeHost();
  const controller = ColorGraphMountController.create(host);

  controller.mount();
  await MountedGraph.settled(controller);
  controller.suspend();
  controller.dispose();
  await MountedGraph.drain();

  assert.equal(host.rejections, 0);
});
