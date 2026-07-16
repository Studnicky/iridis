const debugHost = '[::1]';
const debugPort = 9222;
const pageUrl = process.env.PAGE_URL ?? 'http://localhost:3000/';
const PROFILE_MS = 22000;
const TARGET_MODE = process.env.TARGET_MODE ?? 'auto';

async function resolveCdPPageSocket() {
  const response = await fetch(`http://${debugHost}:${debugPort}/json/new?${encodeURIComponent(pageUrl)}`, {
    method: 'PUT',
  });
  const payload = await response.json();
  if (!payload?.webSocketDebuggerUrl) {
    throw new Error('Could not create CDP page socket');
  }
  return payload.webSocketDebuggerUrl;
}

function connectWebSocket(url) {
  const ws = new WebSocket(url);

  return new Promise((resolve, reject) => {
    ws.addEventListener('open', () => resolve(ws), { once: true });
    ws.addEventListener('error', reject, { once: true });
  }).then((socket) => {
    let nextId = 1;
    const waiters = new Map();

    const send = (method, params = {}) => {
      const id = nextId;
      nextId += 1;

      return new Promise((resolve, reject) => {
        const timer = setTimeout(() => {
          waiters.delete(id);
          reject(new Error(`CDP timeout for ${method}`));
        }, 30000);

        waiters.set(id, (error, result) => {
          clearTimeout(timer);
          if (error) reject(error);
          else resolve(result);
        });

        socket.send(JSON.stringify({ id, method, params }));
      });
    };

    socket.addEventListener('message', (event) => {
      const data = JSON.parse(String(event.data));
      if (!data.id || !waiters.has(data.id)) return;
      const waiter = waiters.get(data.id);
      waiters.delete(data.id);
      if (data.error) {
        waiter(new Error(data.error.message || JSON.stringify(data.error)), null);
      } else {
        waiter(null, data.result);
      }
    });

    const close = async () => {
      socket.close();
    };

    return { socket, send, close };
  });
}

(async () => {
  const wsUrl = await resolveCdPPageSocket();
  const cdp = await connectWebSocket(wsUrl);

  try {
    await cdp.send('Runtime.enable');
    await cdp.send('Page.enable');

    const profileExpression = `(() => {
      const PROFILE_MS = ${PROFILE_MS};
      const TARGET_MODE = ${JSON.stringify(TARGET_MODE)};
      const wait = (ms) => new Promise((r) => setTimeout(r, ms));
      const findRoot = () => document.querySelector('.dag-mermaid-frame')
        ?? document.querySelector('.cg-wrap')
        ?? document.querySelector('.dagonizer-mermaid')
        ?? document.querySelector('.vp-doc');
      let root = findRoot();
      let cx = 0;
      let cy = 0;
      let frameRect = { left: 0, top: 0, width: 0, height: 0 };
      const profile = {
        frames: [],
        longTasks: [],
        mem: [],
        start: performance.now(),
      };
      window.__profile = profile;

      let prev = performance.now();
      function tick(ts) {
        profile.frames.push(ts - prev);
        prev = ts;
        if (performance.now() - profile.start < PROFILE_MS) {
          requestAnimationFrame(tick);
        }
      }
      requestAnimationFrame(tick);

      if ('PerformanceObserver' in window) {
        try {
          const ob = new PerformanceObserver((list) => {
            for (const entry of list.getEntries()) {
              profile.longTasks.push({ d: entry.duration, t: entry.startTime });
            }
          });
          ob.observe({ type: 'longtask', buffered: true });
        } catch {}
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

      const dispatchWheel = (target, x, y, deltaY) => {
        target.dispatchEvent(new WheelEvent('wheel', {
          bubbles: true,
          cancelable: true,
          deltaY,
          clientX: x,
          clientY: y,
        }));
      };

      const dispatchPointerDrag = (target, startX, startY, endX, endY) => {
        target.dispatchEvent(new PointerEvent('pointerdown', {
          bubbles: true,
          cancelable: true,
          pointerId: 1,
          pointerType: 'mouse',
          button: 0,
          clientX: startX,
          clientY: startY,
        }));
        target.dispatchEvent(new PointerEvent('pointermove', {
          bubbles: true,
          cancelable: true,
          pointerId: 1,
          pointerType: 'mouse',
          button: 0,
          clientX: endX,
          clientY: endY,
        }));
        target.dispatchEvent(new PointerEvent('pointerup', {
          bubbles: true,
          cancelable: true,
          pointerId: 1,
          pointerType: 'mouse',
          button: 0,
          clientX: endX,
          clientY: endY,
        }));
      };

      const dispatchClick = (button) => {
        if (button === undefined || button === null || button.disabled) return;
        button.dispatchEvent(new MouseEvent('mousedown', { bubbles: true, cancelable: true, button: 0, clientX: cx, clientY: cy }));
        button.dispatchEvent(new MouseEvent('mouseup', { bubbles: true, cancelable: true, button: 0, clientX: cx, clientY: cy }));
        button.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true, button: 0, clientX: cx, clientY: cy }));
      };

      const activateColorGraph = () => {
        const decks = [...document.querySelectorAll('.cyl')];
        const targetDeck = decks.find((deck) => {
          return [...deck.querySelectorAll('.cyl-dot')]
            .some((dot) => dot.textContent?.trim().toLowerCase() === 'color graph');
        });
        if (!targetDeck) return false;

        const targetBtn = [...targetDeck.querySelectorAll('.cyl-dot')]
          .find((dot) => dot.textContent?.trim().toLowerCase() === 'color graph');
        if (targetBtn) {
          targetBtn.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true }));
          return true;
        }
        return false;
      };

      const activateMermaidPage = () => {
        const candidates = [
          ...document.querySelectorAll('button'),
          ...document.querySelectorAll('summary'),
          ...document.querySelectorAll('.cyl-dot'),
          ...document.querySelectorAll('[role="button"]'),
          ...document.querySelectorAll('h2'),
          ...document.querySelectorAll('h3'),
        ];
        const target = candidates.find((node) => {
          const text = (node?.textContent ?? '').toLowerCase();
          return text.includes('four stages') || text.includes('the four stages');
        });
        if (!target) return false;
        if (typeof target.scrollIntoView === 'function') {
          target.scrollIntoView({ block: 'center' });
        }
        target.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true }));
        return true;
      };

      const waitForViewport = async (timeoutMs) => {
        const endAt = performance.now() + timeoutMs;
        while (performance.now() < endAt) {
          window.scrollTo(0, document.body.scrollHeight);
          await wait(150);
          if (document.querySelector('.cg-wrap, .dag-mermaid-frame, .dagonizer-mermaid')) {
            return;
          }
        }
      };

      const resolveTargetRoot = () => {
        if (TARGET_MODE === 'mermaid') {
          return document.querySelector('.dag-mermaid-frame') ?? document.querySelector('.dagonizer-mermaid');
        }
        if (TARGET_MODE === 'graph') {
          return document.querySelector('.cg-wrap');
        }
        return findRoot();
      };

      return (async () => {
        for (let i = 0; i < 4; i += 1) {
          if (TARGET_MODE === 'graph') await waitForViewport(500);
          if (TARGET_MODE === 'graph' && document.querySelector('.cg-wrap') === null) {
            const switched = activateColorGraph();
            if (switched) {
              await wait(500);
            }
            await wait(300);
          }

          if (TARGET_MODE === 'mermaid' && document.querySelector('.dag-mermaid-frame') === null && document.querySelector('.dagonizer-mermaid') === null) {
            const switched = activateMermaidPage();
            if (switched) {
              await wait(600);
            }
            await wait(300);
          }

          root = resolveTargetRoot();
          if (root) break;
          await wait(250);
        }

        if (!root && TARGET_MODE === 'auto') {
          root = findRoot();
        }

        if (!root) {
          for (let i = 0; i < 20; i += 1) {
            root = resolveTargetRoot();
            if (root) break;
            await wait(250);
          }
        }

        if (TARGET_MODE === 'graph' && document.querySelector('.cg-wrap') === null) {
          for (let attempt = 0; attempt < 16 && document.querySelector('.cg-wrap') === null; attempt += 1) {
            const switched = activateColorGraph();
            if (switched) {
              await wait(600);
            }
            await wait(300);
          }
        }

        if (!root) {
          return { ok: false, reason: 'No render target' };
        }

        const rect = root.getBoundingClientRect();
        frameRect = {
          left: rect.left,
          top: rect.top,
          width: rect.width,
          height: rect.height,
        };
        cx = frameRect.left + frameRect.width / 2;
        cy = frameRect.top + frameRect.height / 2;

        const isMermaid = !!document.querySelector('.dag-mermaid-frame');
        const hasGraph = !!document.querySelector('.cg-wrap');
        const zoomButton = Array.from(document.querySelectorAll('.dag-mermaid-dpad-btn, .dagonizer-dpad-btn')).find((node) => {
          const label = node?.getAttribute?.('title') ?? '';
          return label.includes('Zoom in');
        });

        await wait(1500);

        for (let i = 0; i < 8; i += 1) {
          dispatchWheel(root, cx, cy, -140);
          dispatchWheel(root, cx, cy, 120);
          if (isMermaid) {
            dispatchClick(zoomButton);
          }
          dispatchPointerDrag(root, cx, cy, cx + 80, cy + 24);
          await wait(35);
        }

        if (!isMermaid && hasGraph) {
          const fitButton = Array.from(document.querySelectorAll('.dagonizer-dpad-btn')).find((node) => {
            return (node?.getAttribute?.('title') ?? '').toLowerCase().includes('fit');
          });
          if (fitButton && TARGET_MODE !== 'mermaid') dispatchClick(fitButton);
          await wait(1000);
        }

        await wait(3000);
        clearInterval(memTimer);

        const frames = profile.frames;
        const sorted = [...frames].sort((a, b) => a - b);
        const total = frames.reduce((acc, value) => acc + value, 0);
        const avg = frames.length ? total / frames.length : 0;
        const long = profile.longTasks;

        return {
          ok: true,
          target: isMermaid ? 'mermaid' : (hasGraph ? 'graph' : 'other'),
          frameRect: {
            x: frameRect.left,
            y: frameRect.top,
            w: frameRect.width,
            h: frameRect.height,
            cx,
            cy,
          },
          profileMs: PROFILE_MS,
          frameCount: frames.length,
          avgMs: avg,
          maxMs: frames.length ? sorted.at(-1) : 0,
          p50Ms: frames.length ? sorted[Math.floor(frames.length * 0.50)] : 0,
          p90Ms: frames.length ? sorted[Math.floor(frames.length * 0.90)] : 0,
          p95Ms: frames.length ? sorted[Math.floor(frames.length * 0.95)] : 0,
          p99Ms: frames.length ? sorted[Math.floor(frames.length * 0.99)] : 0,
          longCount: long.length,
          long10MsOrMore: long.filter((entry) => entry.d >= 10).length,
          longTotalMs: long.reduce((acc, entry) => acc + entry.d, 0),
          memSamples: profile.mem.length,
          memUsedStartMB: profile.mem[0] ? profile.mem[0].used / 1048576 : 0,
          memUsedEndMB: profile.mem.at(-1) ? profile.mem.at(-1).used / 1048576 : 0,
          memPeakTotalMB: profile.mem.reduce((acc, item) => Math.max(acc, item.total), 0) / 1048576,
          memPeakJsHeapMB: profile.mem.reduce((acc, item) => Math.max(acc, item.js), 0) / 1048576,
          hasGraph,
          hasMermaid: isMermaid,
        };
      })();
    })()`;

    const runProfile = async () => cdp.send('Runtime.evaluate', {
      expression: profileExpression,
      awaitPromise: true,
      returnByValue: true,
    });

    let evaluation = null;
    try {
      evaluation = await runProfile();
    } catch (error) {
      console.error('profile-eval-failed', error?.message || String(error));
      console.log('retrying after transient execution-context teardown');
      await new Promise((resolve) => setTimeout(resolve, 250));
      evaluation = await runProfile();
    }

    if (evaluation?.result?.value?.ok === false) {
      console.error('profile-error', evaluation.result.value.reason);
      process.exit(1);
    }

    const response = evaluation?.result?.value;
    if (!response) {
      console.log('raw', JSON.stringify(evaluation));
      throw new Error('No payload from page profile script');
    }

    if (response.ok === false) {
      console.error('profile-error', response.reason);
      process.exit(1);
    }

    console.log('profiling', {
      target: response.target,
      frameRect: response.frameRect,
      frameCount: response.frameCount,
      durationMs: response.profileMs,
      avgMs: Number(response.avgMs.toFixed(2)),
      fps: response.avgMs ? Number((1000 / response.avgMs).toFixed(1)) : 0,
      maxMs: Number(response.maxMs.toFixed(2)),
      p50Ms: Number(response.p50Ms.toFixed(2)),
      p90Ms: Number(response.p90Ms.toFixed(2)),
      p95Ms: Number(response.p95Ms.toFixed(2)),
      p99Ms: Number(response.p99Ms.toFixed(2)),
      longTasks: response.longCount,
      long10msOrMore: response.long10MsOrMore,
      longTotalMs: Number(response.longTotalMs.toFixed(2)),
      hasGraph: response.hasGraph,
      hasMermaid: response.hasMermaid,
      memSamples: response.memSamples,
      memUsedStartMB: Number(response.memUsedStartMB.toFixed(1)),
      memUsedEndMB: Number(response.memUsedEndMB.toFixed(1)),
      memPeakTotalMB: Number(response.memPeakTotalMB.toFixed(1)),
      memPeakJsHeapMB: Number(response.memPeakJsHeapMB.toFixed(1)),
    });
  } finally {
    await cdp.close();
  }
})();
