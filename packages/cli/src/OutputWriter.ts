import type { PaletteStateInterface } from '@studnicky/iridis/model';

import { ModuleError } from '@studnicky/errors';
import { mkdir, writeFile } from 'fs/promises';
import { dirname, isAbsolute, relative, resolve, win32 } from 'path';

import type { CliConfigInterface } from './interfaces/CliConfigInterface.ts';

export class OutputWriter {
  async write(state: PaletteStateInterface, config: CliConfigInterface): Promise<readonly string[]> {
    const configuredDirectory = config.output.directory;

    if (configuredDirectory.indexOf('\0') !== -1) {
      throw ModuleError.create('configured output directory contains an embedded null byte', {
        'context':  { 'directory': configuredDirectory },
        'scenario': 'VALIDATION'
      });
    }

    await mkdir(configuredDirectory, { 'recursive': true });

    const directory = resolve(configuredDirectory);
    const written: string[] = [];

    for (const [key, filename] of Object.entries(config.output.files)) {
      // User-supplied config keys are arbitrary strings mapping to plugin output slots.
      // Cast is safe: missing slots produce undefined → serialized as "undefined".
      const outputs = state.outputs;
      const value   = outputs[key];
      const content = typeof value === 'string' ? value : JSON.stringify(value, null, 2);
      const target  = OutputWriter.assertContainedTarget(directory, filename, key);

      await mkdir(dirname(target), { 'recursive': true });
      await writeFile(target, content, 'utf-8');
      written.push(target);
    }

    return written;
  }

  /**
   * Resolves `filename` against `directory` and rejects the result unless
   * it stays contained within `directory`. `filename` is untrusted config
   * content: a value like `'../../../../etc/passwd'` or an absolute path
   * would otherwise let the resolved target escape the configured output
   * directory.
   *
   * The target file does not exist yet (it's about to be written), so
   * containment is checked via path-resolution semantics rather than
   * `realpath` — `directory` is resolved once via `path.resolve` (a purely
   * lexical normalization, no filesystem access) and every candidate
   * target is resolved against that same base and confirmed to be a
   * descendant of it, using the same `relative()` + reject-`..`/absolute
   * check used elsewhere in this repo (see `scripts/package-pipeline.mjs`'s
   * `isContained`/`containsRelativePath`).
   */
  private static assertContainedTarget(directory: string, filename: string, slot: string): string {
    if (filename.indexOf('\0') !== -1) {
      throw ModuleError.create(
        `output file '${filename}' for slot '${slot}' contains an embedded null byte`,
        {
          'context':  { 'directory': directory, 'filename': filename, 'slot': slot },
          'scenario': 'VALIDATION'
        }
      );
    }

    const target = resolve(directory, filename);

    if (!OutputWriter.isContained(directory, target)) {
      throw ModuleError.create(
        `output file '${filename}' for slot '${slot}' escapes the configured output directory`,
        {
          'context':  { 'directory': directory, 'filename': filename, 'slot': slot },
          'scenario': 'VALIDATION'
        }
      );
    }

    return target;
  }

  private static isContained(parent: string, child: string): boolean {
    const pathFromParent = relative(parent, child);
    return pathFromParent !== '..'
      && !pathFromParent.startsWith('../')
      && !pathFromParent.startsWith('..\\')
      && !isAbsolute(pathFromParent)
      && !win32.isAbsolute(pathFromParent);
  }
}
