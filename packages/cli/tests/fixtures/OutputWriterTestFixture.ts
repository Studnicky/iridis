import type { CliConfigInterface } from '@studnicky/iridis-cli/types';
import type { PaletteStateInterface } from '@studnicky/iridis/model';

import { InputInterfaceTypeEntity, RuntimeOptionsInterfaceTypeEntity } from '@studnicky/iridis';
import { CliConfigEntity } from '@studnicky/iridis-cli';
import { JsonValue } from '@studnicky/types/node';
import { mkdtemp } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

/** Provides admitted CLI configuration and palette state fixtures for OutputWriter tests. */
export class OutputWriterTestFixture {
  static async createDirectory(): Promise<string> {
    const directory = await mkdtemp(join(tmpdir(), 'iridis-out-'));
    return directory;
  }

  static state(): PaletteStateInterface {
    const input = InputInterfaceTypeEntity.create({ 'colors': [] });
    const runtime = RuntimeOptionsInterfaceTypeEntity.create({});
    const result: PaletteStateInterface = {
      'colors': [],
      'input': input,
      'metadata': {},
      'outputs': { 'stylesheet:cssVars': 'content' },
      'roles': {},
      'runtime': runtime,
      'variants': {}
    };
    return result;
  }

  static config(directory: string, filename: string): CliConfigInterface {
    const document = JsonValue.from({
      'input': { 'colors': ['#000000'] },
      'output': { 'directory': directory, 'files': { 'stylesheet:cssVars': filename } },
      'pipeline': ['x']
    });
    const result = CliConfigEntity.intake(document);
    return result;
  }
}
