import { CliExitError } from '@studnicky/errors/node';
import { JsonValue } from '@studnicky/types/node';
import { readFile } from 'fs/promises';

import type { CliConfigInterface } from './interfaces/CliConfigInterface.ts';

import { CliConfigEntity } from './entities/CliConfigEntity.ts';

export class ConfigLoader {
  async load(path: string): Promise<CliConfigInterface> {
    const raw = await readFile(path, 'utf-8');
    const document = JsonValue.from(JSON.parse(raw));

    if (!CliConfigEntity.validate(document)) {
      const error = new CliExitError(1);
      error.message = 'Config invalid: schema validation failed';
      throw error;
    }

    const config = CliConfigEntity.intake(document);
    return config;
  }
}
