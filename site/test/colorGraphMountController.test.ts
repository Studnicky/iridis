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

class FakeHost implements ColorGraphMountHostInterface<FakeGraph, FakeSnapshot> {
  public static readonly idleSuspendMs = 3000;

  public idleHandler: (() => void) | null = null;

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

  public idleElapsed(): void {
    this.idleHandler?.();
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

class FakeSnapshot {
  public readonly serial: number;

  public constructor(serial: number) {
    this.serial = serial;
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
  const controller = ColorGraphMountController.create(host, FakeHost.idleSuspendMs);

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
  const controller = ColorGraphMountController.create(host, FakeHost.idleSuspendMs);

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
  const controller = ColorGraphMountController.create(host, FakeHost.idleSuspendMs);

  controller.mount();
  controller.suspend();
  await MountedGraph.drain();

  assert.equal(host.liveCount(), 0);
  assert.deepEqual(host.presented, [null]);
  assert.equal(controller.getState().variant, 'idle');
});

await test('a failed capture leaves no snapshot and returns the machine to idle', async () => {
  const host = new FakeHost();
  const controller = ColorGraphMountController.create(host, FakeHost.idleSuspendMs);

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
  const controller = ColorGraphMountController.create(host, FakeHost.idleSuspendMs);

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
  const controller = ColorGraphMountController.create(host, FakeHost.idleSuspendMs);
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
  const controller = ColorGraphMountController.create(host, FakeHost.idleSuspendMs);

  host.constructFailures = 1;

  assert.throws(() => {
    controller.mount();
  }, { 'message': 'WebGL2 unavailable' });
  await MountedGraph.drain();

  assert.equal(host.liveCount(), 0);
  assert.equal(controller.getState().variant, 'idle');

  controller.mount();

  assert.equal(host.liveCount(), 1);
});

await test('suspending and disposing cancel every scheduled timer on a virtual clock', (context) => {
  context.mock.timers.enable({ 'apis': ['setTimeout'] });
  const host = new FakeHost();
  const controller = ColorGraphMountController.create(host, FakeHost.idleSuspendMs);
  let fired = 0;
  const count = (): void => {
    fired += 1;
  };

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
  const controller = ColorGraphMountController.create(host, FakeHost.idleSuspendMs);
  const fired: string[] = [];

  controller.schedule('fit', 100, () => {
    fired.push('fit');
  });
  controller.schedule('zoomIdle', 100, () => {
    fired.push('zoomIdle');
  });
  controller.cancel('fit');
  context.mock.timers.tick(100);

  assert.deepEqual(fired, ['zoomIdle']);
  assert.equal(controller.pendingTimerCount(), 0);
});

await test('lifecycle events are delivered without rejections', async () => {
  const host = new FakeHost();
  const controller = ColorGraphMountController.create(host, FakeHost.idleSuspendMs);

  controller.mount();
  await MountedGraph.settled(controller);
  controller.suspend();
  controller.dispose();
  await MountedGraph.drain();

  assert.equal(host.rejections, 0);
});

class IdleScenario {
  static async settledController(host: FakeHost): Promise<ColorGraphMountController<FakeGraph, FakeSnapshot>> {
    const controller = ColorGraphMountController.create(host, FakeHost.idleSuspendMs);

    host.idleHandler = () => {
      controller.suspendIdle();
    };
    controller.mount();
    await MountedGraph.settled(controller);

    return controller;
  }
}

await test('a settled graph without input suspends behind a snapshot once the idle interval elapses', async (context) => {
  context.mock.timers.enable({ 'apis': ['setTimeout'] });
  const host = new FakeHost();
  const controller = await IdleScenario.settledController(host);

  context.mock.timers.tick(FakeHost.idleSuspendMs - 1);

  assert.equal(host.liveCount(), 1);

  context.mock.timers.tick(1);
  await MountedGraph.drain();

  assert.equal(host.liveCount(), 0);
  assert.equal(host.presented.at(-1)?.serial, 1);
  assert.equal(controller.getState().variant, 'suspended');
  assert.equal(controller.pendingTimerCount(), 0);
});

await test('input before the idle interval elapses restarts the countdown', async (context) => {
  context.mock.timers.enable({ 'apis': ['setTimeout'] });
  const host = new FakeHost();
  const controller = await IdleScenario.settledController(host);

  context.mock.timers.tick(FakeHost.idleSuspendMs - 1);

  assert.equal(controller.noteActivity(), false);

  context.mock.timers.tick(FakeHost.idleSuspendMs - 1);

  assert.equal(host.liveCount(), 1);

  context.mock.timers.tick(1);
  await MountedGraph.drain();

  assert.equal(host.liveCount(), 0);
});

await test('input on an idle-suspended graph requests a mount and the new graph is the only live one', async (context) => {
  context.mock.timers.enable({ 'apis': ['setTimeout'] });
  const host = new FakeHost();
  const controller = await IdleScenario.settledController(host);

  context.mock.timers.tick(FakeHost.idleSuspendMs);
  await MountedGraph.drain();

  assert.equal(controller.noteActivity(), true);
  assert.equal(controller.noteActivity(), false);

  controller.mount();
  await MountedGraph.drain();

  assert.equal(host.liveCount(), 1);
  assert.equal(host.constructed, 2);
  assert.equal(controller.getState().variant, 'constructing');
});

await test('a face that deactivates after an idle suspension does not wake on input', async (context) => {
  context.mock.timers.enable({ 'apis': ['setTimeout'] });
  const host = new FakeHost();
  const controller = await IdleScenario.settledController(host);

  context.mock.timers.tick(FakeHost.idleSuspendMs);
  controller.suspend();

  assert.equal(controller.noteActivity(), false);
});

await test('rapid input and idle cycles leave one live graph and no timers after dispose', async (context) => {
  context.mock.timers.enable({ 'apis': ['setTimeout'] });
  const host = new FakeHost();
  const controller = await IdleScenario.settledController(host);
  const cycles = 30;

  for (let index = 0; index < cycles; index += 1) {
    context.mock.timers.tick(FakeHost.idleSuspendMs);
    assert.equal(host.liveCount(), 0);
    assert.equal(controller.noteActivity(), true);
    controller.mount();
    assert.equal(controller.pendingTimerCount(), 0);
    await MountedGraph.settled(controller);
    controller.noteActivity();
    controller.noteActivity();
    assert.equal(host.liveCount(), 1);
    assert.equal(controller.pendingTimerCount(), 1);
  }
  controller.dispose();
  context.mock.timers.tick(FakeHost.idleSuspendMs * 2);

  assert.equal(host.liveCount(), 0);
  assert.equal(controller.pendingTimerCount(), 0);
  assert.equal(host.constructed, cycles + 1);
});

await test('the idle interval does not run while the graph is constructing or fitting', async (context) => {
  context.mock.timers.enable({ 'apis': ['setTimeout'] });
  const host = new FakeHost();
  const controller = ColorGraphMountController.create(host, FakeHost.idleSuspendMs);

  host.idleHandler = () => {
    controller.suspendIdle();
  };
  controller.mount();
  controller.noteActivity();
  context.mock.timers.tick(FakeHost.idleSuspendMs * 2);

  assert.equal(host.liveCount(), 1);

  await MountedGraph.ready(controller);
  controller.signal(ColorGraphLifecycleEvent.fitArmed());
  await MountedGraph.drain();
  controller.noteActivity();
  context.mock.timers.tick(FakeHost.idleSuspendMs * 2);

  assert.equal(controller.getState().variant, 'fitting');
  assert.equal(host.liveCount(), 1);
  assert.equal(controller.pendingTimerCount(), 0);
});

await test('the idle interval is measured from entering settled', async (context) => {
  context.mock.timers.enable({ 'apis': ['setTimeout'] });
  const host = new FakeHost();
  const controller = ColorGraphMountController.create(host, FakeHost.idleSuspendMs);

  host.idleHandler = () => {
    controller.suspendIdle();
  };
  controller.mount();
  await MountedGraph.ready(controller);
  controller.signal(ColorGraphLifecycleEvent.fitArmed());
  await MountedGraph.drain();
  context.mock.timers.tick(FakeHost.idleSuspendMs * 5);
  controller.signal(ColorGraphLifecycleEvent.fitSettled());
  await MountedGraph.drain();
  context.mock.timers.tick(FakeHost.idleSuspendMs - 1);

  assert.equal(host.liveCount(), 1);

  context.mock.timers.tick(1);
  await MountedGraph.drain();

  assert.equal(host.liveCount(), 0);
  assert.equal(controller.getState().variant, 'suspended');
});

await test('leaving settled cancels the countdown and settling again restarts it', async (context) => {
  context.mock.timers.enable({ 'apis': ['setTimeout'] });
  const host = new FakeHost();
  const controller = await IdleScenario.settledController(host);

  assert.equal(controller.pendingTimerCount(), 1);
  context.mock.timers.tick(FakeHost.idleSuspendMs - 1);
  controller.signal(ColorGraphLifecycleEvent.zoomed());
  await MountedGraph.drain();

  assert.equal(controller.getState().variant, 'zooming');
  assert.equal(controller.pendingTimerCount(), 0);

  context.mock.timers.tick(FakeHost.idleSuspendMs * 2);

  assert.equal(host.liveCount(), 1);

  controller.signal(ColorGraphLifecycleEvent.zoomEnded());
  await MountedGraph.drain();
  context.mock.timers.tick(FakeHost.idleSuspendMs - 1);

  assert.equal(host.liveCount(), 1);

  context.mock.timers.tick(1);
  await MountedGraph.drain();

  assert.equal(host.liveCount(), 0);
});

await test('fit timers armed before a suspension never fire after the restored graph mounts', async (context) => {
  context.mock.timers.enable({ 'apis': ['setTimeout'] });
  const host = new FakeHost();
  const controller = await IdleScenario.settledController(host);
  const fired: string[] = [];

  controller.schedule('fit', 1200, () => { fired.push('fit'); });
  controller.schedule('fit', 1800, () => { fired.push('settleFallback'); });
  controller.suspend();
  controller.mount();
  await MountedGraph.settled(controller);
  context.mock.timers.tick(FakeHost.idleSuspendMs - 1);

  assert.deepEqual(fired, []);
  assert.equal(controller.getState().variant, 'settled');
  assert.equal(host.liveCount(), 1);
});
