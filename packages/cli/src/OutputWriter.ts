import { mkdir, writeFile } from 'fs/promises';
import { join } from 'path';
import type { PaletteStateInterface } from '@studnicky/iridis/model';
import type { CliConfigInterface } from './types/index.ts';

export class OutputWriter {
  async write(state: PaletteStateInterface, config: CliConfigInterface): Promise<readonly string[]> {
    await mkdir(config.output.directory, { 'recursive': true });

    const written: string[] = [];

    for (const [key, filename] of Object.entries(config.output.files)) {
      // User-supplied config keys are arbitrary strings mapping to plugin output slots.
      // Cast is safe: missing slots produce undefined → serialized as "undefined".
      const outputs = state.outputs as Record<string, unknown>;
      const value   = outputs[key];
      const content = typeof value === 'string' ? value : JSON.stringify(value, null, 2);
      const target  = join(config.output.directory, filename);

      await writeFile(target, content, 'utf-8');
      written.push(target);
    }

    return written;
  }
}
