import { readFile } from 'fs/promises';
import { CliConfigSchema } from './CliConfigSchema.ts';
import { validator }       from '@studnicky/iridis/model';
import type { CliConfigInterface } from './types/index.ts';

export class ConfigLoader {
  async load(path: string): Promise<CliConfigInterface> {
    const raw  = await readFile(path, 'utf-8');
    const data = JSON.parse(raw) as unknown;

    this.validate(data);

    return data as CliConfigInterface;
  }

  private validate(data: unknown): void {
    const result = validator.validate(CliConfigSchema, data);
    if (!result.valid) {
      const first = result.errors[0];
      throw new Error(
        `Config invalid — ${first !== undefined ? `${first.path}: ${first.message}` : 'unknown error'}`,
      );
    }
  }
}

export const configLoader = new ConfigLoader();
