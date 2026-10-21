import type { InferType } from '@studnicky/json-tology/types';

import { EntityCompiler } from '@studnicky/entity/node';
import { type ChildProcess, spawn } from 'node:child_process';
import { existsSync } from 'node:fs';
import { createServer } from 'node:net';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';

const SITE_ROOT = resolve(import.meta.dirname, '../..');
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

export class ProductionNitroServer {
  static isBuilt(): boolean {
    const result = existsSync(NITRO_SERVER);
    return result;
  }

  static hasExited(child: ChildProcess): boolean {
    const result = child.exitCode !== null || child.signalCode !== null;
    return result;
  }

  static async waitForExit(child: ChildProcess, timeoutMs: number): Promise<boolean> {
    if (ProductionNitroServer.hasExited(child)) {return true;}
    const result = await new Promise<boolean>((resolveExit) => {
      const onExit = (): void => {
        globalThis.clearTimeout(timer);
        resolveExit(true);
      };
      const timer = globalThis.setTimeout(() => {
        child.off('exit', onExit);
        resolveExit(ProductionNitroServer.hasExited(child));
      }, timeoutMs);
      child.once('exit', onExit);
    });
    return result;
  }

  static async stop(child: ChildProcess): Promise<void> {
    if (ProductionNitroServer.hasExited(child)) {return;}
    child.kill('SIGTERM');
    if (await ProductionNitroServer.waitForExit(child, 5_000)) {return;}
    child.kill('SIGKILL');
    if (!await ProductionNitroServer.waitForExit(child, 5_000)) {
      throw new Error(`Nitro child ${child.pid ?? 'unknown'} did not exit after SIGKILL.`);
    }
  }

  static async start(entrypoint: string = NITRO_SERVER): Promise<{ readonly 'child': ChildProcess; readonly 'origin': string }> {
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

      await import(${JSON.stringify(pathToFileURL(entrypoint).href)});
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
          child.off('message', onMessage);
        };
        const fail = (message: string, cause?: unknown): void => {
          cleanup();
          const output = `${standardOutput}\n${standardError}`.trim();
          const outputSuffix = output.length > 0 ? `\n${output}` : '';
          rejectPort(new Error(message + outputSuffix, { 'cause': cause }));
        };
        const onError = (error: Error): void => {fail('Nitro child failed to start.', error);};
        const onExit = (): void => {fail('Nitro child exited before listening.');};
        const onMessage = (message: unknown): void => {
          try {
            const listening = NitroListeningMessageEntity.intake(message);
            cleanup();
            resolvePort(listening.port);
          } catch (error) {
            fail('Nitro child sent an invalid listening message.', error);
          }
        };
        const timer = globalThis.setTimeout(() => {fail('Nitro child did not report its bound port within 15 seconds.');}, 15_000);
        child.once('error', onError);
        child.once('exit', onExit);
        child.once('message', onMessage);
      });
      const result = { 'child': child, 'origin': `http://127.0.0.1:${port}` };
      return result;
    } catch (error) {
      await ProductionNitroServer.stop(child);
      throw error;
    }
  }
}
