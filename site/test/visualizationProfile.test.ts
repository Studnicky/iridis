import assert from 'node:assert/strict';
import {
  mkdirSync, mkdtempSync, readFileSync, realpathSync, rmSync, symlinkSync, writeFileSync
} from 'node:fs';
import { tmpdir } from 'node:os';
import {
  isAbsolute, join, relative, resolve, sep
} from 'node:path';
import { test } from 'node:test';

import type { VisualizationProfileLimitsInterface } from './fixtures/VisualizationProfileLimitsInterface.ts';

import {
  VisualizationProfileBudget, VisualizationProfileOperation, VisualizationProfileStaticFile
} from '../visualization-profile.mjs';

await test('profile static files decode valid paths and remain contained under the public build', (context) => {
  const publicRoot = mkdtempSync(join(tmpdir(), 'iridis-profile-public-'));

  context.after(() => {
    rmSync(publicRoot, {
      'force': true,
      'recursive': true
    });
  });
  mkdirSync(join(publicRoot, 'assets'));
  writeFileSync(join(publicRoot, 'index.html'), 'index');
  writeFileSync(join(publicRoot, '404.html'), 'missing');
  writeFileSync(join(publicRoot, 'assets', 'hello world.js'), 'script');

  const index = VisualizationProfileStaticFile.resolve(publicRoot, '/');
  const asset = VisualizationProfileStaticFile.resolve(publicRoot, '/assets/hello%20world.js?cache=1');
  const missing = VisualizationProfileStaticFile.resolve(publicRoot, '/missing.html');

  assert.equal(index.filePath, realpathSync(join(publicRoot, 'index.html')));
  assert.equal(index.statusCode, 200);
  assert.equal(asset.filePath, realpathSync(join(publicRoot, 'assets', 'hello world.js')));
  assert.equal(asset.statusCode, 200);
  assert.equal(missing.filePath, realpathSync(join(publicRoot, '404.html')));
  assert.equal(missing.statusCode, 404);

  const results = [
    index,
    asset,
    missing
  ];
  const resultCount = results.length;

  for (let resultIndex = 0; resultIndex < resultCount; resultIndex += 1) {
    const result = results[resultIndex];

    if (result === undefined) {
      throw new Error('Profile result index must resolve');
    }
    const relativePath = relative(realpathSync(publicRoot), result.filePath);

    assert.equal(isAbsolute(relativePath), false);
    assert.equal(relativePath === '..' || relativePath.startsWith(`..${sep}`), false);
  }
});

await test('profile static files reject traversal, dot segments, escaped paths, and symlink escapes', (context) => {
  const publicRoot = mkdtempSync(join(tmpdir(), 'iridis-profile-public-'));
  const outsideRoot = mkdtempSync(join(tmpdir(), 'iridis-profile-outside-'));

  context.after(() => {
    rmSync(publicRoot, {
      'force': true,
      'recursive': true
    });
    rmSync(outsideRoot, {
      'force': true,
      'recursive': true
    });
  });
  writeFileSync(join(publicRoot, 'index.html'), 'index');
  writeFileSync(join(outsideRoot, 'secret.txt'), 'secret');
  symlinkSync(join(outsideRoot, 'secret.txt'), join(publicRoot, 'linked-secret.txt'));

  const rejectedPaths = [
    '/../secret.txt',
    '/./index.html',
    '/assets/%2e%2e/secret.txt',
    '/%2E%2E%2Fsecret.txt',
    '/%5csecret.txt',
    '/%252e%252e/secret.txt',
    '//etc/passwd'
  ];
  const rejectedPathCount = rejectedPaths.length;

  for (let pathIndex = 0; pathIndex < rejectedPathCount; pathIndex += 1) {
    const requestPath = rejectedPaths[pathIndex];

    if (requestPath === undefined) {
      throw new Error('Rejected path index must resolve');
    }
    assert.throws(() => {
      VisualizationProfileStaticFile.resolve(publicRoot, requestPath);
    }, TypeError);
  }

  assert.throws(
    () => {
      VisualizationProfileStaticFile.resolve(publicRoot, '/linked-secret.txt');
    },
    TypeError
  );
});

await test('profile mounts generated assets beneath the declared Nuxt base path', (context) => {
  const publicRoot = mkdtempSync(join(tmpdir(), 'iridis-profile-public-'));

  context.after(() => {
    rmSync(publicRoot, {
      'force': true,
      'recursive': true
    });
  });
  writeFileSync(join(publicRoot, 'index.html'), '<a href="/iridis/_nuxt/app.js">entry</a>');

  const basePath = VisualizationProfileStaticFile.basePath(publicRoot);

  assert.equal(basePath, '/iridis/');
  assert.equal(VisualizationProfileStaticFile.mountedRequestPath(basePath, '/iridis/'), '/');
  assert.equal(VisualizationProfileStaticFile.mountedRequestPath(basePath, '/iridis/_nuxt/app.js?cache=1'), '/_nuxt/app.js');
  assert.equal(VisualizationProfileStaticFile.mountedRequestPath(basePath, '/outside/app.js'), undefined);
});

await test('profile samples the owned visual targets after graph teardown and drives real D-pad buttons', () => {
  const profileSource = readFileSync(resolve(import.meta.dirname, '../visualization-profile.mjs'), 'utf8');
  const graphTarget = "const graphSurface = '.cg-cosmos canvas';";
  const mermaidTarget = "const mermaidSurface = '.dag-mermaid-frame svg';";
  const graphTeardown = 'await deactivateGraph(page);';
  const realDpadActivation = 'await clickVisibleButton(scope, name);';

  assert.equal(profileSource.includes(graphTarget), true);
  assert.equal(profileSource.includes(mermaidTarget), true);
  assert.equal(profileSource.indexOf(graphTeardown) < profileSource.indexOf(mermaidTarget), true);
  assert.equal(profileSource.includes(realDpadActivation), true);
  assert.equal(profileSource.includes("['graph', '.cg-wrap']"), false);
  assert.equal(profileSource.includes("['mermaid', '.dag-mermaid-frame']"), false);
});


class ProfileFixture {
  static readonly classes = [
    ['mermaid', VisualizationProfileBudget.mermaid],
    ['graph', VisualizationProfileBudget.graphLive],
    ['graphIdle', VisualizationProfileBudget.graphIdle]
  ] as const;

  static within(name: string, limits: VisualizationProfileLimitsInterface): Record<string, unknown> {
    const result = {
      'avgMs': limits.maximumAverageFrameMs,
      'canvasElementCount': limits.maximumCanvasElements,
      'domElementCount': limits.maximumDomElements,
      'frameCount': VisualizationProfileBudget.minimumFrameCount,
      'longCount': limits.maximumLongTaskCount,
      'longTotalMs': limits.maximumLongTaskTotalMs,
      'maxMs': limits.maximumFrameMs,
      'name': name,
      'ok': true,
      'p90Ms': limits.maximumP90FrameMs
    };

    return result;
  }

  static assertRejectsEachMetric(name: string, limits: VisualizationProfileLimitsInterface): void {
    const cases = ProfileFixture.beyond(limits);

    for (let index = 0; index < cases.length; index += 1) {
      const entry = cases[index];

      if (entry !== undefined) {
        const target = { ...ProfileFixture.within(name, limits), ...entry[0] };

        assert.deepEqual(VisualizationProfileBudget.failures([target]), [`target=${name} ${entry[1]}`]);
      }
    }
  }

  static beyond(limits: VisualizationProfileLimitsInterface): readonly (readonly [Record<string, number>, string])[] {
    const result = [
      [
        { 'avgMs': limits.maximumAverageFrameMs + 1 },
        `avgMs=${String(limits.maximumAverageFrameMs + 1)} must be at most ${String(limits.maximumAverageFrameMs)}`
      ],
      [
        { 'p90Ms': limits.maximumP90FrameMs + 1 },
        `p90Ms=${String(limits.maximumP90FrameMs + 1)} must be at most ${String(limits.maximumP90FrameMs)}`
      ],
      [
        { 'maxMs': limits.maximumFrameMs + 1 },
        `maxMs=${String(limits.maximumFrameMs + 1)} must be at most ${String(limits.maximumFrameMs)}`
      ],
      [
        { 'longCount': limits.maximumLongTaskCount + 1 },
        `longCount=${String(limits.maximumLongTaskCount + 1)} must be at most ${String(limits.maximumLongTaskCount)}`
      ],
      [
        { 'longTotalMs': limits.maximumLongTaskTotalMs + 1 },
        `longTotalMs=${String(limits.maximumLongTaskTotalMs + 1)} must be at most ${String(limits.maximumLongTaskTotalMs)}`
      ],
      [
        { 'domElementCount': limits.maximumDomElements + 1 },
        `domElementCount=${String(limits.maximumDomElements + 1)} must be at most ${String(limits.maximumDomElements)}`
      ],
      [
        { 'canvasElementCount': limits.maximumCanvasElements + 1 },
        `canvasElementCount=${String(limits.maximumCanvasElements + 1)} must be at most ${String(limits.maximumCanvasElements)}`
      ],
      [
        { 'frameCount': VisualizationProfileBudget.minimumFrameCount - 1 },
        `frameCount=${String(VisualizationProfileBudget.minimumFrameCount - 1)} must be at least ${String(VisualizationProfileBudget.minimumFrameCount)}`
      ]
    ] as const;

    return result;
  }
}

await test('profile budget accepts every target exactly at its class limits', () => {
  const report = [
    ProfileFixture.within('mermaid', VisualizationProfileBudget.mermaid),
    ProfileFixture.within('mermaidDpad', VisualizationProfileBudget.mermaid),
    ProfileFixture.within('graph', VisualizationProfileBudget.graphLive),
    ProfileFixture.within('graphDpad', VisualizationProfileBudget.graphLive),
    ProfileFixture.within('graphIdle', VisualizationProfileBudget.graphIdle)
  ];

  assert.deepEqual(VisualizationProfileBudget.failures(report), []);
});

await test('profile budget rejects each metric one step beyond its limit for each class', () => {
  ProfileFixture.classes.forEach(([name, limits]) => {
    ProfileFixture.assertRejectsEachMetric(name, limits);
  });
});

await test('a target is judged against its own class', () => {
  const liveLoad = ProfileFixture.within('graph', VisualizationProfileBudget.graphLive);
  const idleLoad = { ...liveLoad, 'name': 'graphIdle' };
  const mermaidLoad = { ...liveLoad, 'name': 'mermaid' };

  assert.deepEqual(VisualizationProfileBudget.failures([liveLoad]), []);
  assert.equal(VisualizationProfileBudget.failures([idleLoad]).length > 0, true);
  assert.equal(VisualizationProfileBudget.failures([mermaidLoad]).length > 0, true);
  assert.equal(VisualizationProfileBudget.limitsFor('graphDpad'), VisualizationProfileBudget.graphLive);
  assert.equal(VisualizationProfileBudget.limitsFor('graphIdle'), VisualizationProfileBudget.graphIdle);
  assert.equal(VisualizationProfileBudget.limitsFor('mermaidDpad'), VisualizationProfileBudget.mermaid);
});

await test('the idle graph class matches the mermaid class except for frame-time bounds within whole vsync steps', () => {
  const strict = VisualizationProfileBudget.mermaid;
  const idle = VisualizationProfileBudget.graphIdle;
  const live = VisualizationProfileBudget.graphLive;
  const averageAllowance = idle.maximumAverageFrameMs - strict.maximumAverageFrameMs;
  const p90Allowance = idle.maximumP90FrameMs - strict.maximumP90FrameMs;

  assert.ok(averageAllowance >= 0);
  assert.ok(averageAllowance <= VisualizationProfileBudget.vsyncStepMs);
  assert.ok(p90Allowance >= 0);
  assert.ok(p90Allowance <= 2 * VisualizationProfileBudget.vsyncStepMs);
  assert.ok(idle.maximumFrameMs <= strict.maximumFrameMs);
  assert.ok(idle.maximumLongTaskCount <= strict.maximumLongTaskCount);
  assert.ok(idle.maximumLongTaskTotalMs <= strict.maximumLongTaskTotalMs);
  assert.ok(idle.maximumDomElements <= strict.maximumDomElements);
  assert.ok(idle.maximumCanvasElements <= strict.maximumCanvasElements);
  assert.equal(live.maximumDomElements, strict.maximumDomElements);
  assert.equal(live.maximumCanvasElements, strict.maximumCanvasElements);
  assert.ok(live.maximumAverageFrameMs >= idle.maximumAverageFrameMs);
  assert.ok(live.maximumLongTaskCount >= strict.maximumLongTaskCount);
});

await test('an unknown target class is an error', () => {
  const report = [ProfileFixture.within('unknownTarget', VisualizationProfileBudget.mermaid)];

  assert.throws(() => {
    VisualizationProfileBudget.failures(report);
  }, { 'name': 'RangeError' });
});

await test('profile budget rejects a target whose metric is not a finite number', () => {
  const report = [{
    ...ProfileFixture.within('graph', VisualizationProfileBudget.graphLive),
    'avgMs': Number.NaN
  }];

  assert.deepEqual(VisualizationProfileBudget.failures(report), [`target=graph avgMs=NaN must be at most ${String(VisualizationProfileBudget.graphLive.maximumAverageFrameMs)}`]);
});

await test('profile budget skips targets that did not run', () => {
  const report = [{
    'name': 'graph',
    'ok': false,
    'reason': 'selector not found'
  }];

  assert.deepEqual(VisualizationProfileBudget.failures(report), []);
});

await test('profile waits for the settled graph state before sampling', () => {
  const profileSource = readFileSync(resolve(import.meta.dirname, '../visualization-profile.mjs'), 'utf8');

  assert.equal(profileSource.includes('data-graph-state="settled"'), true);
});

await test('profile CLI runs only when Node invokes its resolved entry module', () => {
  const modulePath = resolve(import.meta.dirname, '../visualization-profile.mjs');
  const moduleUrl = new URL('../visualization-profile.mjs', import.meta.url).href;

  assert.equal(VisualizationProfileOperation.isEntrypoint([
    '/usr/local/bin/node',
    modulePath
  ], moduleUrl), true);
  assert.equal(VisualizationProfileOperation.isEntrypoint([
    '/usr/local/bin/node',
    'site/other-script.mjs'
  ], moduleUrl), false);
  assert.equal(VisualizationProfileOperation.isEntrypoint(['/usr/local/bin/node'], moduleUrl), false);
});

await test('profile CLI entrypoint is recognised through a symlinked path', (context) => {
  const linkRoot = mkdtempSync(join(tmpdir(), 'iridis-profile-link-'));

  context.after(() => {
    rmSync(linkRoot, {
      'force': true,
      'recursive': true
    });
  });
  const modulePath = resolve(import.meta.dirname, '../visualization-profile.mjs');
  const linkedPath = join(linkRoot, 'linked-profile.mjs');

  symlinkSync(modulePath, linkedPath);
  const moduleUrl = new URL('../visualization-profile.mjs', import.meta.url).href;

  assert.equal(VisualizationProfileOperation.isEntrypoint([
    '/usr/local/bin/node',
    linkedPath
  ], moduleUrl), true);
  assert.equal(VisualizationProfileOperation.isEntrypoint([
    '/usr/local/bin/node',
    join(linkRoot, 'missing.mjs')
  ], moduleUrl), false);
});

await test('profile samples the idle graph only after the suspended state', () => {
  const profileSource = readFileSync(resolve(import.meta.dirname, '../visualization-profile.mjs'), 'utf8');
  const suspended = profileSource.indexOf('await awaitIdleSuspension(page);');
  const idleTarget = profileSource.indexOf("'name': 'graphIdle'");

  assert.equal(profileSource.includes('data-graph-state="suspended"'), true);
  assert.equal(suspended > 0, true);
  assert.equal(suspended < idleTarget, true);
});

class ScaleScenario {
  public static readonly scale = 3;

  public static within(name: string, limits: VisualizationProfileLimitsInterface): Record<string, unknown> {
    const result = {
      'avgMs': limits.maximumAverageFrameMs * ScaleScenario.scale,
      'canvasElementCount': limits.maximumCanvasElements,
      'domElementCount': limits.maximumDomElements,
      'frameCount': VisualizationProfileBudget.minimumFrameCount,
      'longCount': limits.maximumLongTaskCount,
      'longTotalMs': limits.maximumLongTaskTotalMs * ScaleScenario.scale,
      'maxMs': limits.maximumFrameMs * ScaleScenario.scale,
      'name': name,
      'ok': true,
      'p90Ms': limits.maximumP90FrameMs * ScaleScenario.scale
    };

    return result;
  }
}

await test('a scale of one reproduces the unscaled limits exactly', () => {
  assert.equal(VisualizationProfileBudget.limitsFor('mermaid', 1), VisualizationProfileBudget.mermaid);
  assert.equal(VisualizationProfileBudget.limitsFor('graph'), VisualizationProfileBudget.graphLive);
});

await test('a scaled budget accepts frame metrics exactly at the scaled limit and rejects one step beyond', () => {
  const limits = VisualizationProfileBudget.mermaid;
  const accepted = ScaleScenario.within('mermaid', limits);
  const beyond = [
    { 'avgMs': limits.maximumAverageFrameMs * ScaleScenario.scale + 1 },
    { 'p90Ms': limits.maximumP90FrameMs * ScaleScenario.scale + 1 },
    { 'maxMs': limits.maximumFrameMs * ScaleScenario.scale + 1 },
    { 'longTotalMs': limits.maximumLongTaskTotalMs * ScaleScenario.scale + 1 }
  ];

  assert.deepEqual(VisualizationProfileBudget.failures([accepted], ScaleScenario.scale), []);
  beyond.forEach((override) => {
    const failures = VisualizationProfileBudget.failures([{ ...accepted, ...override }], ScaleScenario.scale);

    assert.equal(failures.length, 1);
    assert.equal(failures[0]?.includes(`x scale ${ScaleScenario.scale.toFixed(2)}`), true);
  });
  assert.equal(VisualizationProfileBudget.failures([accepted]).length > 0, true);
});

await test('counts, DOM and canvases ignore the scale', () => {
  const limits = VisualizationProfileBudget.graphLive;
  const scaled: VisualizationProfileLimitsInterface = VisualizationProfileBudget.limitsFor('graph', ScaleScenario.scale);

  assert.equal(scaled.maximumLongTaskCount, limits.maximumLongTaskCount);
  assert.equal(scaled.maximumDomElements, limits.maximumDomElements);
  assert.equal(scaled.maximumCanvasElements, limits.maximumCanvasElements);
  assert.equal(scaled.maximumAverageFrameMs, limits.maximumAverageFrameMs * ScaleScenario.scale);
});

await test('a scale below one is clamped to one and a scale that is not finite is an error', () => {
  assert.equal(VisualizationProfileBudget.limitsFor('mermaid', 0.2), VisualizationProfileBudget.mermaid);
  assert.throws(() => { VisualizationProfileBudget.limitsFor('mermaid', Number.NaN); }, { 'name': 'RangeError' });
});

await test('the environment scale is the frame floor in vsync steps, never below one, and rejects a bad calibration', () => {
  const step = VisualizationProfileBudget.vsyncStepMs;

  assert.equal(VisualizationProfileBudget.environmentScale(step), 1);
  assert.equal(VisualizationProfileBudget.environmentScale(step / 2), 1);
  assert.equal(VisualizationProfileBudget.environmentScale(step * ScaleScenario.scale), ScaleScenario.scale);
  assert.throws(() => { VisualizationProfileBudget.environmentScale(Number.NaN); }, { 'name': 'RangeError' });
  assert.throws(() => { VisualizationProfileBudget.environmentScale(Number.POSITIVE_INFINITY); }, { 'name': 'RangeError' });
  assert.throws(() => { VisualizationProfileBudget.environmentScale(0); }, { 'name': 'RangeError' });
});

class StubSteps {
  public readonly calls: string[] = [];

  readonly #floorAverageFrameMs: number;

  readonly #report: Record<string, unknown>[];

  public constructor(floorAverageFrameMs: number, report: Record<string, unknown>[]) {
    this.#floorAverageFrameMs = floorAverageFrameMs;
    this.#report = report;
  }

  public calibrate(): Promise<number> {
    this.calls.push('calibrate');
    const result = Promise.resolve(this.#floorAverageFrameMs);

    return result;
  }

  public report(): void {
    this.calls.push('report');
  }

  public scenes(scale: number): Promise<Record<string, unknown>[]> {
    this.calls.push(`scenes@${scale.toFixed(2)}`);
    const result = Promise.resolve(this.#report);

    return result;
  }
}

await test('calibration runs before the scenes and the scenes are judged against the calibrated scale', async () => {
  const limits = VisualizationProfileBudget.mermaid;
  const steps = new StubSteps(
    VisualizationProfileBudget.vsyncStepMs * ScaleScenario.scale,
    [ScaleScenario.within('mermaid', limits)]
  );

  const outcome = await VisualizationProfileOperation.execute(steps);

  assert.deepEqual(steps.calls, ['calibrate', `scenes@${ScaleScenario.scale.toFixed(2)}`, 'report']);
  assert.equal(outcome.scale, ScaleScenario.scale);
});

await test('a scene beyond the scaled limit fails the profile', async () => {
  const limits = VisualizationProfileBudget.mermaid;
  const slow = { ...ScaleScenario.within('mermaid', limits), 'avgMs': limits.maximumAverageFrameMs * ScaleScenario.scale + 1 };
  const steps = new StubSteps(VisualizationProfileBudget.vsyncStepMs * ScaleScenario.scale, [slow]);

  await assert.rejects(VisualizationProfileOperation.execute(steps), { 'name': 'Error' });
});

await test('a non-finite calibration stops the profile before the scenes', async () => {
  const steps = new StubSteps(Number.NaN, []);

  await assert.rejects(VisualizationProfileOperation.execute(steps), { 'name': 'RangeError' });
  assert.deepEqual(steps.calls, ['calibrate']);
});
