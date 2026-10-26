import { chromium } from '@playwright/test';
import { createServer } from 'node:http';
import { createReadStream, existsSync, readFileSync, realpathSync, statSync } from 'node:fs';
import { extname, isAbsolute, relative, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';

const cliArgs = process.argv.slice(2);
const cliValue = (name, fallback) => {
  const prefix = `${name}=`;
  const match = cliArgs.find((arg) => arg.startsWith(prefix));
  if (match) {
    return match.slice(prefix.length);
  }
  return fallback;
};
const isDebug = new Set(cliArgs).has('--headful') || new Set(cliArgs).has('--headed') || new Set(cliArgs).has('--interactive');
const PROFILE_MS = Number(cliValue('--duration', process.env.IRIDIS_VIZ_PROFILE_MS ?? '14000'));
const DEBUG_WAIT_MS = Number(cliValue('--wait-ms', process.env.IRIDIS_VIZ_WAIT_MS ?? '0'));

const TARGET_SETTLE_MS = 900;
const IDLE_SUSPENSION_TIMEOUT_MS = 120000;

async function clickVisibleButton(scope, name) {
  const buttons = scope.getByRole('button', { 'exact': true, name });
  const buttonCount = await buttons.count();
  for (let index = 0; index < buttonCount; index += 1) {
    const button = buttons.nth(index);
    const canReceivePointer = await button.evaluate((element) => {
      const rect = element.getBoundingClientRect();
      if (rect.width === 0 || rect.height === 0) return false;
      const target = document.elementFromPoint(rect.left + rect.width / 2, rect.top + rect.height / 2);
      return target === element || element.contains(target);
    });
    if (canReceivePointer) {
      await button.click();
      return;
    }
  }
  throw new Error(`No active visible button named ${name}`);
}

async function pressDpadButtons(scope) {
  await scope.hover();
  for (const name of ['Zoom in', 'Pan left', 'Pan right', 'Fit to view']) {
    await clickVisibleButton(scope, name);
  }
}

async function selectCarouselFace(carousel, label) {
  const candidates = carousel.getByRole('button', { 'exact': true, 'name': label });
  const count = await candidates.count();
  if (count === 0) throw new Error(`Carousel face control is missing: ${label}`);
  await candidates.nth(count - 1).click({ 'force': true });
}

async function establishCommittedPalette(page) {
  const upload = page.locator('#upload');
  const removeSample = upload.getByRole('button', { 'exact': true, 'name': 'Remove Sample' });
  await upload.scrollIntoViewIfNeeded();
  if (await removeSample.isVisible()) {
    await clickVisibleButton(upload, 'Remove Sample');
  }
  await clickVisibleButton(upload, 'Try a sample');
  await page.locator('#combine').waitFor({ 'state': 'attached', 'timeout': 60000 });
  await removeSample.waitFor({ 'state': 'visible', 'timeout': 60000 });
}

async function activateReadyGraph(page) {
  const explore = page.locator('#explore');
  const carousel = explore.locator('.cyl');
  await carousel.scrollIntoViewIfNeeded();
  await selectCarouselFace(carousel, 'Color graph');
  const graph = explore.locator('.cg-wrap');
  await graph.waitFor({ 'state': 'visible', 'timeout': 60000 });
  await graph.locator('.cg-overlay').waitFor({ 'state': 'detached', 'timeout': 60000 });
  await graph.locator('.cg-cosmos canvas').waitFor({ 'state': 'visible', 'timeout': 60000 });
  await explore.locator('.cg-wrap[data-graph-state="settled"]').waitFor({ 'state': 'attached', 'timeout': 60000 });
  // Pointer input on the graph restarts its idle countdown, so a slow machine cannot suspend it before the sample.
  await graph.locator('.cg-cosmos').hover();
}

async function deactivateGraph(page) {
  const explore = page.locator('#explore');
  const carousel = explore.locator('.cyl');
  await selectCarouselFace(carousel, 'Roles table');
  await page.waitForFunction(() => document.querySelector('.cg-cosmos canvas') === null, undefined, { 'timeout': 60000 });
  await page.evaluate(() => new Promise((resolveFrame) => {
    requestAnimationFrame(() => { requestAnimationFrame(resolveFrame); });
  }));
}

async function awaitIdleSuspension(page) {
  await page.locator('#explore .cg-wrap[data-graph-state="suspended"]').waitFor({ 'state': 'attached', 'timeout': IDLE_SUSPENSION_TIMEOUT_MS });
}

async function waitForSettledTarget(page, selector) {
  const target = page.locator(selector).first();
  await target.waitFor({ 'state': 'visible', 'timeout': 60000 });
  await target.scrollIntoViewIfNeeded();
  await page.evaluate((targetSelector) => {
    const element = document.querySelector(targetSelector);
    if (element === null) throw new Error(`Profile target disappeared: ${targetSelector}`);
    const rect = element.getBoundingClientRect();
    if (rect.width <= 0 || rect.height <= 0) {
      throw new Error(`Profile target has no rendered area: ${targetSelector}`);
    }
    return new Promise((resolveFrame) => {
      requestAnimationFrame(() => { requestAnimationFrame(resolveFrame); });
    });
  }, selector);
  await page.waitForTimeout(TARGET_SETTLE_MS);
}

async function driveSurface(page, selector) {
  const target = page.locator(selector).first();
  const bounds = await target.boundingBox();
  if (bounds === null) throw new Error(`No bounds for active interaction target: ${selector}`);
  const x = bounds.x + bounds.width / 2;
  const y = bounds.y + bounds.height / 2;
  await page.mouse.move(x, y);
  for (let index = 0; index < 8; index += 1) {
    await page.mouse.wheel(0, -120);
    await page.mouse.wheel(0, 120);
    await page.mouse.move(x, y);
    await page.mouse.down();
    await page.mouse.move(x + 24, y + 12, { 'steps': 2 });
    await page.mouse.up();
  }
}

async function startTargetProfile(page, selector, sessionId) {
  return page.evaluate(({ selector: targetSelector, sessionId: profileSessionId }) => {
    const target = document.querySelector(targetSelector);
    if (target === null) {
      return { 'ok': false, 'reason': `selector not found: ${targetSelector}` };
    }

    const profile = {
      'frames': [],
      'longTasks': [],
      'mem': [],
      'start': performance.now(),
    };
    let active = true;
    let frameHandle = 0;
    let previous = profile.start;
    const tick = (timestamp) => {
      profile.frames.push(timestamp - previous);
      previous = timestamp;
      if (active) frameHandle = requestAnimationFrame(tick);
    };
    frameHandle = requestAnimationFrame(tick);

    let observer;
    if ('PerformanceObserver' in window) {
      try {
        observer = new PerformanceObserver((list) => {
          for (const entry of list.getEntries()) {
            profile.longTasks.push({ 'duration': entry.duration, 'name': entry.name, 'startTime': entry.startTime });
          }
        });
        observer.observe({ 'type': 'longtask' });
      } catch {
        // The profile remains valid in engines that do not expose long tasks.
      }
    }

    const memoryTimer = setInterval(() => {
      if (performance.memory) {
        profile.mem.push({
          'js': performance.memory.jsHeapSizeLimit,
          'total': performance.memory.totalJSHeapSize,
          'used': performance.memory.usedJSHeapSize,
        });
      }
    }, 200);

    window[profileSessionId] = () => {
      active = false;
      cancelAnimationFrame(frameHandle);
      clearInterval(memoryTimer);
      observer?.disconnect();
      const frames = profile.frames;
      const sorted = [...frames].sort((a, b) => a - b);
      const total = frames.reduce((accumulator, value) => accumulator + value, 0);
      const average = frames.length === 0 ? 0 : total / frames.length;
      const targetRoot = target.closest('.cg-wrap') ?? target.closest('.dag-mermaid-frame') ?? target;
      const memorySamples = profile.mem;
      const result = {
        'avgMs': average,
        'canvasElementCount': document.getElementsByTagName('canvas').length,
        'domElementCount': document.getElementsByTagName('*').length,
        'frameCount': frames.length,
        'jsPeakMB': memorySamples.reduce((accumulator, item) => Math.max(accumulator, item.js), 0) / 1048576,
        'longCount': profile.longTasks.length,
        'longTotalMs': profile.longTasks.reduce((accumulator, item) => accumulator + item.duration, 0),
        'maxMs': sorted.at(-1) ?? 0,
        'memEndMB': memorySamples.at(-1) ? memorySamples.at(-1).used / 1048576 : 0,
        'memPeakMB': memorySamples.reduce((accumulator, item) => Math.max(accumulator, item.total), 0) / 1048576,
        'memSamples': memorySamples.length,
        'memStartMB': memorySamples[0] ? memorySamples[0].used / 1048576 : 0,
        'ok': true,
        'overlayText': targetRoot.querySelector('.cg-overlay')?.textContent?.trim() || null,
        'p50Ms': sorted[Math.floor(frames.length * 0.5)] ?? 0,
        'p90Ms': sorted[Math.floor(frames.length * 0.9)] ?? 0,
        'p95Ms': sorted[Math.floor(frames.length * 0.95)] ?? 0,
        'p99Ms': sorted[Math.floor(frames.length * 0.99)] ?? 0,
      };
      delete window[profileSessionId];
      return result;
    };
    return { 'ok': true };
  }, { 'selector': selector, sessionId });
}

async function stopTargetProfile(page, sessionId) {
  return page.evaluate((profileSessionId) => {
    const finish = window[profileSessionId];
    if (typeof finish !== 'function') {
      return { 'ok': false, 'reason': 'profile session unavailable' };
    }
    return finish();
  }, sessionId);
}

async function runTarget(page, { interaction, name, selector, durationMs = PROFILE_MS }) {
  await waitForSettledTarget(page, selector);
  const sessionId = `__iridisVisualizationProfile${globalThis.crypto.randomUUID()}`;
  const started = await startTargetProfile(page, selector, sessionId);
  if (!started.ok) return { name, selector, ...started };

  const startTime = Date.now();
  await interaction();
  const remainingDuration = Math.max(0, durationMs - (Date.now() - startTime));
  if (remainingDuration > 0) await page.waitForTimeout(remainingDuration);
  const result = await stopTargetProfile(page, sessionId);
  return { name, selector, ...result };
}

const scriptDir = resolve(fileURLToPath(new URL('.', import.meta.url)));
const root = resolve(scriptDir, '.output/public');

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.gif': 'image/gif',
  '.woff2': 'font/woff2',
  '.woff': 'font/woff',
  '.ttf': 'font/ttf',
  '.ico': 'image/x-icon',
  '.txt': 'text/plain',
};

export class VisualizationProfileStaticFile {
  static basePath(publicRoot) {
    const index = this.resolve(publicRoot, '/');
    if (index.filePath === undefined) {
      throw new Error('Generated static app has no index.html');
    }
    const html = readFileSync(index.filePath, 'utf8');
    const basePath = /["'](\/(?:[^"'?#/]+\/)*)_nuxt\//u.exec(html)?.[1];
    if (basePath === undefined) {
      throw new Error('Could not derive the generated Nuxt base path');
    }
    return basePath;
  }

  static mountedRequestPath(basePath, requestUrl) {
    const rawPath = (requestUrl ?? '/').split(/[?#]/u)[0] ?? '/';
    const baseRoot = basePath.length === 1 ? basePath : basePath.slice(0, -1);
    if (rawPath === baseRoot) return '/';
    if (!rawPath.startsWith(basePath)) return undefined;
    return `/${rawPath.slice(basePath.length)}`;
  }

  static resolve(publicRoot, requestUrl) {
    const canonicalRoot = realpathSync(publicRoot);
    const rawPath = (requestUrl ?? '/').split(/[?#]/u)[0] ?? '/';
    if (!rawPath.startsWith('/') || rawPath.includes('\\') || rawPath.includes('\0')) {
      throw new TypeError('Invalid static request path');
    }
    if (/%(?:2f|5c)/iu.test(rawPath)) {
      throw new TypeError('Escaped path separators are not allowed');
    }

    let decodedPath;
    try {
      decodedPath = decodeURIComponent(rawPath);
    } catch {
      throw new TypeError('Static request path is not valid URI encoding');
    }

    let decodedAgain;
    try {
      decodedAgain = decodeURIComponent(decodedPath);
    } catch {
      throw new TypeError('Static request path contains nested URI encoding');
    }
    if (decodedAgain !== decodedPath || decodedPath.includes('\\') || decodedPath.includes('\0')) {
      throw new TypeError('Static request path contains an escaped path');
    }

    const pathSegments = decodedPath.split('/');
    if (pathSegments.some((segment) => segment === '.' || segment === '..')) {
      throw new TypeError('Static request path contains a dot segment');
    }

    const relativeRequestPath = decodedPath === '/' ? 'index.html' : decodedPath.slice(1);
    const requestedPath = resolve(canonicalRoot, relativeRequestPath);
    this.#assertContained(canonicalRoot, requestedPath);
    const requestedFile = this.#existingFile(canonicalRoot, requestedPath);
    if (requestedFile !== undefined) {
      return { 'filePath': requestedFile, 'statusCode': 200 };
    }

    for (const fallbackName of ['404.html', 'index.html']) {
      const fallbackPath = resolve(canonicalRoot, fallbackName);
      const fallbackFile = this.#existingFile(canonicalRoot, fallbackPath);
      if (fallbackFile !== undefined) {
        return { 'filePath': fallbackFile, 'statusCode': 404 };
      }
    }

    return { 'filePath': undefined, 'statusCode': 404 };
  }

  static #assertContained(publicRoot, candidatePath) {
    const relativePath = relative(publicRoot, candidatePath);
    if (relativePath === '..' || relativePath.startsWith(`..${sep}`) || isAbsolute(relativePath)) {
      throw new TypeError('Static request path escapes the public build directory');
    }
  }

  static #existingFile(publicRoot, candidatePath) {
    if (!existsSync(candidatePath) || statSync(candidatePath).isDirectory()) { return undefined; }
    const canonicalFile = realpathSync(candidatePath);
    this.#assertContained(publicRoot, canonicalFile);
    return canonicalFile;
  }
}

export class VisualizationProfileBudget {
  static minimumFrameCount = 5;

  /** One display refresh at 60 Hz; frame times land on multiples of it. */
  static vsyncStepMs = 1000 / 60;

  /** Scenes without live WebGL. */
  static mermaid = Object.freeze({
    'maximumAverageFrameMs': 30,
    'maximumCanvasElements': 4,
    'maximumDomElements': 7000,
    'maximumFrameMs': 150,
    'maximumLongTaskCount': 1,
    'maximumLongTaskTotalMs': 75,
    'maximumP90FrameMs': 40,
  });

  /** The live software-rendered WebGL graph; bounds regressions while the graph is drawing. */
  static graphLive = Object.freeze({
    'maximumAverageFrameMs': 60,
    'maximumCanvasElements': 4,
    'maximumDomElements': 7000,
    'maximumFrameMs': 250,
    'maximumLongTaskCount': 30,
    'maximumLongTaskTotalMs': 2500,
    'maximumP90FrameMs': 100,
  });

  /** The graph after idle suspension: the strict limits, with an average that allows for the carousel face the idle graph sits on. */
  static graphIdle = Object.freeze({
    'maximumAverageFrameMs': 36,
    'maximumCanvasElements': 4,
    'maximumDomElements': 7000,
    'maximumFrameMs': 150,
    'maximumLongTaskCount': 1,
    'maximumLongTaskTotalMs': 75,
    'maximumP90FrameMs': 60,
  });

  static classByTarget = new Map([
    ['graph', 'graphLive'],
    ['graphDpad', 'graphLive'],
    ['graphIdle', 'graphIdle'],
    ['mermaid', 'mermaid'],
    ['mermaidDpad', 'mermaid'],
  ]);

  /** The scale that stretches the frame-time limits to the machine: its CPU-bound calibration frame time in vsync steps, never below one. */
  static environmentScale(floorAverageFrameMs) {
    if (!Number.isFinite(floorAverageFrameMs) || floorAverageFrameMs <= 0) {
      throw new RangeError('Visualization profile calibration is not a positive finite frame time: ' + floorAverageFrameMs);
    }
    return Math.max(1, floorAverageFrameMs / this.vsyncStepMs);
  }

  /**
   * @param {string} targetName
   * @param {number} [scale]
   * @returns {Readonly<{ maximumAverageFrameMs: number, maximumCanvasElements: number, maximumDomElements: number, maximumFrameMs: number, maximumLongTaskCount: number, maximumLongTaskTotalMs: number, maximumP90FrameMs: number }>}
   */
  static limitsFor(targetName, scale = 1) {
    const className = this.classByTarget.get(targetName);
    if (className === undefined) {
      throw new RangeError('Unknown visualization profile target: ' + targetName);
    }
    return this.scaledLimits(this[className], scale);
  }

  /** Average, p90, max frame and long-task total scale with the machine; counts, DOM and canvases do not. */
  static scaledLimits(limits, scale) {
    if (!Number.isFinite(scale)) {
      throw new RangeError('Visualization profile scale is not finite: ' + scale);
    }
    const effective = Math.max(1, scale);
    if (effective === 1) {
      return limits;
    }
    return Object.freeze({
      ...limits,
      'maximumAverageFrameMs': limits.maximumAverageFrameMs * effective,
      'maximumFrameMs': limits.maximumFrameMs * effective,
      'maximumLongTaskTotalMs': limits.maximumLongTaskTotalMs * effective,
      'maximumP90FrameMs': limits.maximumP90FrameMs * effective,
    });
  }

  static failures(report, scale = 1) {
    const failures = [];
    const effective = Math.max(1, scale);
    for (const item of report) {
      if (!item.ok) continue;
      const base = this.limitsFor(item.name);
      const limits = this.limitsFor(item.name, scale);
      const checks = [
        ['frameCount', item.frameCount, this.minimumFrameCount, 'at least', this.minimumFrameCount],
        ['avgMs', item.avgMs, limits.maximumAverageFrameMs, 'at most', base.maximumAverageFrameMs],
        ['p90Ms', item.p90Ms, limits.maximumP90FrameMs, 'at most', base.maximumP90FrameMs],
        ['maxMs', item.maxMs, limits.maximumFrameMs, 'at most', base.maximumFrameMs],
        ['longCount', item.longCount, limits.maximumLongTaskCount, 'at most', base.maximumLongTaskCount],
        ['longTotalMs', item.longTotalMs, limits.maximumLongTaskTotalMs, 'at most', base.maximumLongTaskTotalMs],
        ['domElementCount', item.domElementCount, limits.maximumDomElements, 'at most', base.maximumDomElements],
        ['canvasElementCount', item.canvasElementCount, limits.maximumCanvasElements, 'at most', base.maximumCanvasElements],
      ];
      for (const [metric, value, limit, direction, unscaled] of checks) {
        const passes = Number.isFinite(value) && (direction === 'at least' ? value >= limit : value <= limit);
        if (!passes) {
          const detail = limit === unscaled ? '' : ' (limit ' + unscaled + ' x scale ' + effective.toFixed(2) + ')';
          failures.push('target=' + item.name + ' ' + metric + '=' + value + ' must be ' + direction + ' ' + limit + detail);
        }
      }
    }
    return failures;
  }
}

export class VisualizationProfileCalibration {
  /** Canvas fills per calibration frame; sized to occupy most of one vsync on a developer machine. */
  static fillsPerFrame = 24000;

  /** Average frame time of a fixed CPU-bound page (canvas fills plus one forced layout read per frame) in the same browser and viewport. */
  static async sample(browser, durationMs) {
    const page = await browser.newPage({ 'viewport': { 'height': 1100, 'width': 1680 } });
    try {
      await page.setContent('<!doctype html><html><body><canvas id="c" width="640" height="480"></canvas><div id="d">x</div></body></html>');
      return await page.evaluate(({ fills, sampleMs }) => new Promise((resolveSample) => {
        const context = document.getElementById('c').getContext('2d', { willReadFrequently: true });
        const probe = document.getElementById('d');
        const frames = [];
        let previous = performance.now();
        const start = previous;
        let sink = 0;
        const tick = (timestamp) => {
          for (let index = 0; index < fills; index += 1) {
            context.fillStyle = 'rgb(' + (index % 256) + ',' + ((index * 7) % 256) + ',' + ((index * 13) % 256) + ')';
            context.fillRect((index * 17) % 600, (index * 31) % 440, 40, 40);
          }
          sink += context.getImageData(0, 0, 1, 1).data[0];
          probe.style.width = (100 + (frames.length % 50)) + 'px';
          sink += probe.offsetWidth;
          frames.push(timestamp - previous);
          previous = timestamp;
          if (timestamp - start < sampleMs) {
            requestAnimationFrame(tick);
          } else {
            const measured = frames.slice(1);
            resolveSample(measured.reduce((total, value) => total + value, 0) / Math.max(1, measured.length) + sink * 0);
          }
        };
        requestAnimationFrame(tick);
      }), { 'fills': VisualizationProfileCalibration.fillsPerFrame, 'sampleMs': durationMs });
    } finally {
      await page.close();
    }
  }
}

export class VisualizationProfileOperation {
  static isEntrypoint(argv, moduleUrl) {
    const entryPath = argv[1];
    return entryPath !== undefined && existsSync(entryPath)
      && realpathSync(entryPath) === realpathSync(fileURLToPath(moduleUrl));
  }

  static async run() {
    if (!existsSync(root) || !statSync(root).isDirectory()) {
      throw new Error(`Static build not found at ${root}. Run: npm run generate`);
    }

    const basePath = VisualizationProfileStaticFile.basePath(root);
    const browser = await chromium.launch({ 'headless': !isDebug });
    const server = createServer((request, response) => {
      const mountedRequestPath = VisualizationProfileStaticFile.mountedRequestPath(basePath, request.url);
      if (mountedRequestPath === undefined) {
        response.statusCode = 404;
        response.end('not found');
        return;
      }
      let staticFile;
      try {
        staticFile = VisualizationProfileStaticFile.resolve(root, mountedRequestPath);
      } catch {
        response.statusCode = 400;
        response.end('invalid request path');
        return;
      }

      if (staticFile.filePath === undefined) {
        response.statusCode = 404;
        response.end('not found');
        return;
      }

      response.statusCode = staticFile.statusCode;
      response.setHeader('Content-Type', MIME[extname(staticFile.filePath)] || 'application/octet-stream');
      createReadStream(staticFile.filePath).pipe(response);
    });

    const report = [];
    const steps = {
      'calibrate': () => VisualizationProfileCalibration.sample(browser, PROFILE_MS),
      'report': (report, floorAverageFrameMs, scale) => {
        console.log(`calibration floorAvgMs=${floorAverageFrameMs.toFixed(2)} environmentScale=${scale.toFixed(2)}`);
        VisualizationProfileOperation.print(report);
      },
      'scenes': async () => {
        const report = [];
        try {
          await new Promise((resolveServer) => {
            server.listen(0, '127.0.0.1', resolveServer);
          });
          const address = server.address();
          if (address === null || typeof address === 'string') {
            throw new TypeError('Profile server did not bind an IP socket');
          }

          const page = await browser.newPage({ 'viewport': { 'height': 1100, 'width': 1680 } });
          await page.goto(`http://127.0.0.1:${address.port}${basePath}`, { 'timeout': 60000, 'waitUntil': 'domcontentloaded' });
          await establishCommittedPalette(page);
          await activateReadyGraph(page);

          const graphSurface = '.cg-cosmos canvas';
          const graphDpad = '.cg-wrap .dagonizer-dpad-wrap';
          report.push(await runTarget(page, {
            'interaction': () => driveSurface(page, graphSurface),
            'name': 'graph',
            'selector': graphSurface,
          }));
          report.push(await runTarget(page, {
            'interaction': () => pressDpadButtons(page.locator(graphDpad)),
            'name': 'graphDpad',
            'selector': graphDpad + ' .dagonizer-dpad-btn[aria-label="Zoom in"]',
          }));

          await awaitIdleSuspension(page);
          report.push(await runTarget(page, {
            'interaction': () => Promise.resolve(),
            'name': 'graphIdle',
            'selector': '.cg-snapshot canvas',
          }));

          await deactivateGraph(page);

          const mermaidSurface = '.dag-mermaid-frame svg';
          const mermaidDpad = '.dag-mermaid-frame .dag-mermaid-dpad-wrap';
          report.push(await runTarget(page, {
            'interaction': () => driveSurface(page, mermaidSurface),
            'name': 'mermaid',
            'selector': mermaidSurface,
          }));
          report.push(await runTarget(page, {
            'interaction': () => pressDpadButtons(page.locator(mermaidDpad)),
            'name': 'mermaidDpad',
            'selector': mermaidDpad + ' .dagonizer-dpad-btn[aria-label="Zoom in"]',
          }));

          if (isDebug && DEBUG_WAIT_MS > 0) {
            await page.waitForTimeout(DEBUG_WAIT_MS);
          }
          await page.close();
        } finally {
          await browser.close();
          if (server.listening) {
            await new Promise((resolveServer) => { server.close(resolveServer); });
          }
        }
        return report;
      },
    };
    await VisualizationProfileOperation.execute(steps);
  }

  /** Runs calibration, then the scenes, then judges the report against the scaled budget. Phases are injectable. */
  static async execute(steps) {
    const floorAverageFrameMs = await steps.calibrate();
    const scale = VisualizationProfileBudget.environmentScale(floorAverageFrameMs);
    const report = await steps.scenes(scale);
    steps.report(report, floorAverageFrameMs, scale);
    const missingTargets = report.filter((item) => !item.ok);
    if (missingTargets.length > 0) {
      throw new Error(`Visualization profile targets missing: ${missingTargets.map((item) => item.name).join(', ')}`);
    }
    const budgetFailures = VisualizationProfileBudget.failures(report, scale);
    if (budgetFailures.length > 0) {
      throw new Error(`Visualization profile budget exceeded:\n${budgetFailures.join('\n')}`);
    }
    return { floorAverageFrameMs, report, scale };
  }

  static print(report) {
    for (const item of report) {
      if (!item.ok) {
        console.log(`target=${item.name} ok=false reason=${item.reason}`);
        continue;
      }

      const fps = item.avgMs ? (1000 / item.avgMs) : 0;
      console.log(
        `target=${item.name} frameCount=${item.frameCount} avgMs=${item.avgMs.toFixed(2)} fps=${fps.toFixed(1)} max=${item.maxMs.toFixed(2)} p90=${item.p90Ms.toFixed(2)} p95=${item.p95Ms.toFixed(2)} p99=${item.p99Ms.toFixed(2)} long=${item.longCount}/${item.longTotalMs.toFixed(0)}ms dom=${item.domElementCount} canvases=${item.canvasElementCount} mem=${item.memStartMB.toFixed(1)}=>${item.memEndMB.toFixed(1)} peak=${item.memPeakMB.toFixed(1)} jsPeak=${item.jsPeakMB.toFixed(1)} overlay=${item.overlayText ?? 'n/a'}`,
      );
    }
  }
}

if (VisualizationProfileOperation.isEntrypoint(process.argv, import.meta.url)) {
  await VisualizationProfileOperation.run();
}
