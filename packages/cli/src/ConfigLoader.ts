import { readFile } from 'fs/promises';
import { CliConfigSchema } from './CliConfigSchema.ts';
import type { CliConfigInterface } from './types.ts';

export class ConfigLoader {
  async load(path: string): Promise<CliConfigInterface> {
    const raw  = await readFile(path, 'utf-8');
    const data = JSON.parse(raw) as unknown;

    this.validate(data);

    return data as CliConfigInterface;
  }

  private validate(data: unknown): void {
    if (typeof data !== 'object' || data === null) {
      throw new Error(`Config must be a JSON object (schema type: ${CliConfigSchema['type']})`);
    }

    const obj    = data as Record<string, unknown>;
    const input  = obj['input'];

    if (typeof input !== 'object' || input === null) {
      throw new Error('Config.input must be an object');
    }

    const inputObj = input as Record<string, unknown>;
    const colors   = inputObj['colors'];

    if (!Array.isArray(colors) || colors.length === 0) {
      throw new Error('Config.input.colors must be a non-empty array');
    }

    const pipeline = obj['pipeline'];

    if (!Array.isArray(pipeline) || pipeline.length === 0) {
      throw new Error('Config.pipeline must be a non-empty array of task names');
    }

    const output = obj['output'];

    if (typeof output !== 'object' || output === null) {
      throw new Error('Config.output must be an object');
    }

    const outputObj   = output as Record<string, unknown>;
    const directory   = outputObj['directory'];
    const files       = outputObj['files'];

    if (typeof directory !== 'string') {
      throw new Error('Config.output.directory must be a string');
    }

    if (typeof files !== 'object' || files === null) {
      throw new Error('Config.output.files must be an object');
    }
  }
}
