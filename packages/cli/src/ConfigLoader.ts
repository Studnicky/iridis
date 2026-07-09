import { CliExitError }    from '@studnicky/errors';
import { Validator }       from '@studnicky/iridis/model';
import { readFile } from 'fs/promises';

import type { CliConfigInterface } from './types/index.ts';

import { CliConfigSchema } from './CliConfigSchema.ts';

export class ConfigLoader {
  private readonly validator = new Validator();

  async load(path: string): Promise<CliConfigInterface> {
    const raw  = await readFile(path, 'utf-8');
    const data = JSON.parse(raw) as unknown;

    this.validate(data);

    return data as CliConfigInterface;
  }

  private validate(data: unknown): void {
    const result = this.validator.validate(CliConfigSchema, data);
    if (!result.valid) {
      const first = result.errors[0];
      const error = new CliExitError(1);
      error.message = `Config invalid: ${first !== undefined ? `${first.path}: ${first.message}` : 'unknown error'}`;
      throw error;
    }
  }
}
