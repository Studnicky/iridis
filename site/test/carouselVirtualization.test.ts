import type { InferType } from '@studnicky/json-tology/types';

import { chromium } from '@playwright/test';
import { EntityCompiler } from '@studnicky/entity/node';
import assert from 'node:assert/strict';
import { type ChildProcess, spawn } from 'node:child_process';
import { existsSync } from 'node:fs';
import { createServer } from 'node:net';
import { resolve } from 'node:path';
import { test } from 'node:test';
import { pathToFileURL } from 'node:url';

const SITE_ROOT = resolve(import.meta.dirname, '..');
const NITRO_SERVER = resolve(SITE_ROOT, '.output/server/index.mjs');

namespace NitroListeningMessageEntity {
  export const Schema = {
    'additionalProperties': false,
    'properties': {
      'port': { 'minimum': 1, 'type': 'integer' },
      'type': { 'const': 'nitro-listening', 'type': 'string' }
    },
    'required': ['port', 'type'],
    'type': 'object'
  } as const;

  export type Type = InferType<typeof Schema>;

  export const intake: ReturnType<typeof EntityCompiler.compileIntake<Type>> = EntityCompiler.compileIntake<Type>(Schema);
}

class CarouselVirtualizationHarness {
  static hasExited(child: ChildProcess): boolean {
    const result = child.exitCode !== null || child.signalCode !== null;
    return result;
  }

  static async waitForExit(child: ChildProcess, timeoutMs: number): Promise<boolean> {
    if (CarouselVirtualizationHarness.hasExited(child)) {return true;}
    const result = await new Promise<boolean>((resolveExit) => {
      const onExit = (): void => {
        globalThis.clearTimeout(timer);
        resolveExit(true);
      };
      const timer = globalThis.setTimeout(() => {
        child.off('exit', onExit);
        resolveExit(CarouselVirtualizationHarness.hasExited(child));
      }, timeoutMs);
      child.once('exit', onExit);
    });
    return result;
  }

  static async stopNitro(child: ChildProcess): Promise<void> {
    if (CarouselVirtualizationHarness.hasExited(child)) {return;}
    child.kill('SIGTERM');
    if (await CarouselVirtualizationHarness.waitForExit(child, 5_000)) {return;}
    child.kill('SIGKILL');
    if (!await CarouselVirtualizationHarness.waitForExit(child, 5_000)) {
      throw new Error(`Nitro child ${child.pid ?? 'unknown'} did not exit after SIGKILL.`);
    }
  }

  static async startNitro(): Promise<{ readonly 'child': ChildProcess; readonly 'origin': string }> {
    const requestedPort = await new Promise<number>((resolvePort, rejectPort) => {
      const server = createServer();
      server.once('error', rejectPort);
      server.once('listening', () => {
        const address = server.address();
        if (address === null || typeof address === 'string') {
          server.close();
          rejectPort(new Error('Ephemeral port allocation did not return a TCP address.'));
          return;
        }
        const port = address.port;
        server.close((error) => {
          if (error !== undefined) {rejectPort(error); return;}
          resolvePort(port);
        });
      });
      server.listen(0, '127.0.0.1');
    });
    const child = spawn(process.execPath, ['--input-type=module', '--eval', `
      import { Server } from 'node:net';

      const originalListen = Server.prototype.listen;
      Server.prototype.listen = function (...argumentsList) {
        const server = this;
        server.once('listening', () => {
          const address = server.address();
          if (address !== null && typeof address !== 'string' && typeof process.send === 'function') {
            process.send({ port: address.port, type: 'nitro-listening' });
          }
        });
        return Reflect.apply(originalListen, server, argumentsList);
      };

      await import(${JSON.stringify(pathToFileURL(NITRO_SERVER).href)});
    `], {
      'cwd': SITE_ROOT,
      'env': { ...process.env, 'HOST': '127.0.0.1', 'NITRO_PORT': String(requestedPort), 'NODE_ENV': 'production', 'PORT': String(requestedPort) },
      'stdio': ['ignore', 'pipe', 'pipe', 'ipc']
    });
    let standardOutput = '';
    let standardError = '';
    child.stdout?.setEncoding('utf8');
    child.stderr?.setEncoding('utf8');
    child.stdout?.on('data', (chunk: string) => {standardOutput += chunk;});
    child.stderr?.on('data', (chunk: string) => {standardError += chunk;});

    try {
      const port = await new Promise<number>((resolvePort, rejectPort) => {
        const cleanup = (): void => {
          globalThis.clearTimeout(timer);
          child.off('error', onError);
          child.off('exit', onExit);
        };
        const fail = (message: string, cause?: unknown): void => {
          cleanup();
          const output = `${standardOutput}\n${standardError}`.trim();
          const outputSuffix = output.length > 0 ? `\n${output}` : '';
          rejectPort(new Error(message + outputSuffix, { 'cause': cause }));
        };
        const onError = (error: Error): void => {fail('Nitro child failed to start.', error);};
        const onExit = (): void => {fail('Nitro child exited before listening.');};
        const timer = globalThis.setTimeout(() => {fail('Nitro child did not report its bound port within 15 seconds.');}, 15_000);
        child.once('error', onError);
        child.once('exit', onExit);
        child.once('message', (message) => {
          const listening = NitroListeningMessageEntity.intake(message);
          cleanup();
          resolvePort(listening.port);
        });
      });
      const result = { 'child': child, 'origin': `http://127.0.0.1:${port}` };
      return result;
    } catch (error) {
      await CarouselVirtualizationHarness.stopNitro(child);
      throw error;
    }
  }
}

await test('carousel leaves a distant graph uninstantiated and mounts it only after selection', { 'timeout': 120_000 }, async (context) => {
  assert.ok(existsSync(NITRO_SERVER), 'The production Nitro entrypoint is required; run through the site test script.');
  const { 'child': nitro, 'origin': origin } = await CarouselVirtualizationHarness.startNitro();
  context.after(async () => {await CarouselVirtualizationHarness.stopNitro(nitro);});

  const browser = await chromium.launch({ 'headless': true });
  context.after(async () => {await browser.close();});
  const page = await browser.newPage({ 'reducedMotion': 'reduce', 'viewport': { 'height': 900, 'width': 1280 } });
  await page.goto(origin, { 'waitUntil': 'networkidle' });

  await page.waitForFunction(() => {
    const result = document.querySelector('#explore .cyl-scene') !== null;
    return result;
  });
  await page.evaluate(() => {document.querySelector('#explore')?.scrollIntoView();});
  const explore = page.locator('#explore');
  const dormant = await explore.evaluate((section) => {
    const placeholder = section.querySelector<HTMLElement>('.cyl-placeholder[data-cyl-key="colorGraph"]');
    return {
      'canvasCount': placeholder?.querySelectorAll('canvas').length ?? -1,
      'graphCount': placeholder?.querySelectorAll('.cg-canvas').length ?? -1,
      'hasPlaceholder': placeholder !== null
    };
  });
  assert.deepEqual(dormant, { 'canvasCount': 0, 'graphCount': 0, 'hasPlaceholder': true });

  await explore.getByRole('button', { 'exact': true, 'name': 'Color graph' }).click();
  await page.waitForFunction(() => {
    const graphCard = document.querySelector<HTMLElement>('#explore .cyl-face.active .cyl-card[data-cyl-key="colorGraph"]');
    const result = graphCard !== null && graphCard.querySelector('.cg-canvas') !== null && graphCard.querySelectorAll('canvas').length > 0;
    return result;
  });
  const promoted = await explore.evaluate((section) => {
    const graphCard = section.querySelector<HTMLElement>('.cyl-face.active .cyl-card[data-cyl-key="colorGraph"]');
    return {
      'canvasCount': graphCard?.querySelectorAll('canvas').length ?? 0,
      'graphCount': graphCard?.querySelectorAll('.cg-canvas').length ?? 0,
      'placeholderCount': section.querySelectorAll('.cyl-placeholder[data-cyl-key="colorGraph"]').length
    };
  });
  assert.equal(promoted.placeholderCount, 0);
  assert.ok(promoted.graphCount > 0, JSON.stringify(promoted));
  assert.ok(promoted.canvasCount > 0, JSON.stringify(promoted));

  await explore.getByRole('button', { 'exact': true, 'name': 'Roles table' }).click();
  await page.waitForFunction(() => {
    const result = document.querySelector('#explore .cyl-placeholder[data-cyl-key="colorGraph"]') !== null;
    return result;
  });
  const unmounted = await explore.evaluate((section) => {
    const placeholder = section.querySelector<HTMLElement>('.cyl-placeholder[data-cyl-key="colorGraph"]');
    return {
      'canvasCount': placeholder?.querySelectorAll('canvas').length ?? -1,
      'graphCount': placeholder?.querySelectorAll('.cg-canvas').length ?? -1,
      'hasPlaceholder': placeholder !== null
    };
  });
  assert.deepEqual(unmounted, { 'canvasCount': 0, 'graphCount': 0, 'hasPlaceholder': true });
});
