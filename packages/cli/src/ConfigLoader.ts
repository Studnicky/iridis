import { CliExitError }    from '@studnicky/errors';
import { Validator }       from '@studnicky/iridis/model';
import { JsonTology }      from '@studnicky/json-tology';
import { readFile } from 'fs/promises';

import type { CliConfigInterface } from './interfaces/CliConfigInterface.ts';

import { CliConfigSchema } from './CliConfigSchema.ts';
import { CliConfigEntity } from './entities/CliConfigEntity.ts';

export class ConfigLoader {
  private readonly validator = new Validator();

  async load(path: string): Promise<CliConfigInterface> {
    const raw  = await readFile(path, 'utf-8');
    this.validate(raw);

    const data = JsonTology.instantiate(CliConfigSchema, JSON.parse(raw));

    if (!CliConfigEntity.validate(data)) {
      const error = new CliExitError(1);
      error.message = 'Config invalid: schema validation failed';
      throw error;
    }

    return {
      'enableCapacitor':  data.enableCapacitor,
      'enableContrast':   data.enableContrast,
      'enableImage':      data.enableImage,
      'enableRdf':        data.enableRdf,
      'enableStylesheet': data.enableStylesheet,
      'enableTailwind':   data.enableTailwind,
      'enableVscode':     data.enableVscode,
      'input':            data.input,
      'output':           data.output,
      'pipeline':         data.pipeline
    };
  }

  private validate(raw: string): void {
    const result = this.validator.validate(CliConfigEntity.Schema, JSON.parse(raw));
    if (!result.valid) {
      const first = result.errors[0];
      const error = new CliExitError(1);
      error.message = `Config invalid: ${first !== undefined ? `${first.path}: ${first.message}` : 'unknown error'}`;
      throw error;
    }
  }
}
