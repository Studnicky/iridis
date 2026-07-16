import { chromium } from 'playwright';
import { createServer } from 'node:http';
import { createReadStream, existsSync, statSync } from 'node:fs';
import { extname, resolve } from 'node:path';
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

async function runTarget(page, { name, selector, extraDelayMs = 400, scroll = false, durationMs = PROFILE_MS }) {
  const result = await page.evaluate(async ({ selector, durationMs, extraDelayMs, scroll }) => {
    const target = document.querySelector(selector);
    if (!target) {
      return { ok: false, reason: `selector not found: ${selector}` };
    }

    const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
    const profile = {
      frames: [],
      longTasks: [],
      mem: [],
      start: performance.now(),
    };

    if (scroll && target.scrollIntoView) {
      target.scrollIntoView({ block: 'center', behavior: 'instant' });
    }

    target.dispatchEvent(new Event('mouseenter', { bubbles: true }));

    let prev = performance.now();
    const tick = (ts) => {
      profile.frames.push(ts - prev);
      prev = ts;
      if (performance.now() - profile.start < durationMs) {
        requestAnimationFrame(tick);
      }
    };
    requestAnimationFrame(tick);

    if ('PerformanceObserver' in window) {
      try {
        const observer = new PerformanceObserver((list) => {
          for (const entry of list.getEntries()) {
            profile.longTasks.push({ duration: entry.duration, startTime: entry.startTime, name: entry.name });
          }
        });
        observer.observe({ type: 'longtask', buffered: true });
      } catch {
        // ignore
      }
    }

    const memTimer = setInterval(() => {
      if (performance.memory) {
        profile.mem.push({
          used: performance.memory.usedJSHeapSize,
          total: performance.memory.totalJSHeapSize,
          js: performance.memory.jsHeapSizeLimit,
        });
      }
    }, 200);

    const dispatchWheel = (deltaY) => {
      const rect = target.getBoundingClientRect();
      const x = rect.left + rect.width / 2;
      const y = rect.top + rect.height / 2;
      target.dispatchEvent(new WheelEvent('wheel', {
        bubbles: true,
        cancelable: true,
        deltaY,
        clientX: x,
        clientY: y,
      }));
    };

    const dispatchDrag = async () => {
      const rect = target.getBoundingClientRect();
      const startX = rect.left + rect.width / 2;
      const startY = rect.top + rect.height / 2;
      const moveX = startX + 24;
      const moveY = startY + 12;
      const base = {
        bubbles: true,
        cancelable: true,
        pointerId: 1,
        pointerType: 'mouse',
        button: 0,
      };

      target.dispatchEvent(new PointerEvent('pointerdown', { ...base, clientX: startX, clientY: startY }));
      target.dispatchEvent(new PointerEvent('pointermove', { ...base, clientX: moveX, clientY: moveY }));
      target.dispatchEvent(new PointerEvent('pointerup', { ...base, clientX: moveX, clientY: moveY }));
    };

    for (let i = 0; i < 12; i += 1) {
      dispatchWheel(-120);
      dispatchWheel(120);
      await dispatchDrag();
      await wait(32);
    }

    await wait(extraDelayMs);
    clearInterval(memTimer);

    const frames = profile.frames;
    const sorted = [...frames].sort((a, b) => a - b);
    const total = frames.reduce((acc, value) => acc + value, 0);
    const avg = frames.length ? total / frames.length : 0;

    return {
      ok: true,
      overlayText: target.querySelector('.cg-overlay')?.textContent?.trim() || null,
      frameCount: frames.length,
      avgMs: avg,
      maxMs: sorted.at(-1) ?? 0,
      p50Ms: sorted[Math.floor(frames.length * 0.5)] ?? 0,
      p90Ms: sorted[Math.floor(frames.length * 0.9)] ?? 0,
      p95Ms: sorted[Math.floor(frames.length * 0.95)] ?? 0,
      p99Ms: sorted[Math.floor(frames.length * 0.99)] ?? 0,
      longCount: profile.longTasks.length,
      longTotalMs: profile.longTasks.reduce((acc, item) => acc + item.duration, 0),
      long10MsOrMore: profile.longTasks.filter((x) => x.duration >= 10).length,
      memSamples: profile.mem.length,
      memStartMB: profile.mem[0] ? profile.mem[0].used / 1048576 : 0,
      memEndMB: profile.mem.at(-1) ? profile.mem.at(-1).used / 1048576 : 0,
      memPeakMB: profile.mem.reduce((acc, item) => Math.max(acc, item.total), 0) / 1048576,
      jsPeakMB: profile.mem.reduce((acc, item) => Math.max(acc, item.js), 0) / 1048576,
    };
  }, {
    selector,
    durationMs: 14000,
    extraDelayMs,
    scroll,
  });

  return { name, selector, ...result };
}

const browser = await chromium.launch({ headless: !isDebug });
const scriptDir = resolve(fileURLToPath(new URL('.', import.meta.url)));
const root = resolve(scriptDir, '.output/public');
if (!existsSync(root) || !statSync(root).isDirectory()) {
  throw new Error(`Static build not found at ${root}. Run: npm run generate`);
}

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

const server = createServer((req, res) => {
  const path = req.url ? req.url.split('?')[0] : '/';
  const normalized = path === '/' ? '/index.html' : path;
  const filePath = resolve(root, `.${normalized}`);
  const candidate = existsSync(filePath) ? filePath : resolve(root, '404.html');
  const finalPath = existsSync(candidate) ? candidate : resolve(root, 'index.html');
  const stat = existsSync(finalPath) ? statSync(finalPath) : null;

  if (!stat || stat.isDirectory()) {
    res.statusCode = 404;
    res.end('not found');
    return;
  }

  res.statusCode = candidate === finalPath ? 200 : 404;
  res.setHeader('Content-Type', MIME[extname(finalPath)] || 'application/octet-stream');
  createReadStream(finalPath).pipe(res);
});
await new Promise((resolveServer) => {
  server.listen(3001, '127.0.0.1', resolveServer);
});

const page = await browser.newPage({ viewport: { width: 1680, height: 1100 } });
const report = [];
try {
  await page.goto('http://127.0.0.1:3001/', { waitUntil: 'domcontentloaded', timeout: 60000 });
  await page.waitForTimeout(3000);

  for (const [name, selector] of [
    ['graph', '.cg-wrap'],
    ['mermaid', '.dag-mermaid-frame'],
    ['graphDpad', '.dagonizer-dpad-wrap'],
    ['mermaidDpad', '.dag-mermaid-dpad-wrap'],
  ]) {
    report.push(await runTarget(page, { name, selector, extraDelayMs: 2500, scroll: true }));
  }

  if (isDebug && DEBUG_WAIT_MS > 0) {
    await page.waitForTimeout(DEBUG_WAIT_MS);
  }
  await page.close();
} finally {
  await browser.close();
  await new Promise((resolveServer) => server.close(resolveServer));
}

for (const item of report) {
  if (!item.ok) {
    console.log(`target=${item.name} ok=false reason=${item.reason}`);
    continue;
  }

  const fps = item.avgMs ? (1000 / item.avgMs) : 0;
  console.log(
    `target=${item.name} frameCount=${item.frameCount} avgMs=${item.avgMs.toFixed(2)} fps=${fps.toFixed(1)} max=${item.maxMs.toFixed(2)} p90=${item.p90Ms.toFixed(2)} p95=${item.p95Ms.toFixed(2)} p99=${item.p99Ms.toFixed(2)} long=${item.longCount}/${item.long10MsOrMore} mem=${item.memStartMB.toFixed(1)}=>${item.memEndMB.toFixed(1)} peak=${item.memPeakMB.toFixed(1)} jsPeak=${item.jsPeakMB.toFixed(1)} overlay=${item.overlayText ?? 'n/a'}`,
  );
}
