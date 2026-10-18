import { ValidationError } from '@studnicky/errors/node';
import { LOG_STATUS, LogBody } from '@studnicky/logger/node';

import type { ColorInputEntity } from '../../entities/ColorInputEntity.ts';
import type { ColorRecordInterfaceTypeEntity } from '../../entities/ColorRecordInterfaceTypeEntity.ts';
import type { PaletteStateInterface } from '../../interfaces/PaletteStateInterface.ts';
import type { PipelineContextInterface } from '../../interfaces/PipelineContextInterface.ts';
import type { RawImagePixelInputInterface } from '../../interfaces/RawImagePixelInputInterface.ts';
import type { TaskInterface } from '../../interfaces/TaskInterface.ts';

import { OklchInputEntity } from '../../entities/OklchInputEntity.ts';
import { TaskManifestInterfaceTypeEntity } from '../../entities/TaskManifestInterfaceTypeEntity.ts';
import { colorRecordFactory } from '../../math/ColorRecordFactory.ts';

/** Strict intake task for canonical {l,c,h,a?} OKLCH literals. */
class IntakeOklch implements TaskInterface {
  readonly 'name' = 'intake:oklch';

  readonly 'manifest': TaskManifestInterfaceTypeEntity.Type = TaskManifestInterfaceTypeEntity.create({
    'description': 'Parses {l,c,h,a?} OKLCH (l: 0..1, c: 0..0.5, h: 0..360) into ColorRecord entries. Throws on non-OKLCH input.',
    'name':        'intake:oklch',
    'reads':       ['input.colors'],
    'writes':      ['colors']
  });

  parse(raw: ColorInputEntity.Type | RawImagePixelInputInterface): ColorRecordInterfaceTypeEntity.Type {
    let input: OklchInputEntity.Type;
    try {
      input = OklchInputEntity.intake(raw);
    } catch {
      throw ValidationError.create({
        'message': 'intake:oklch — expected an {l,c,h} object',
        'path':    'raw',
        'violations': [{
          'details': { 'expectedShape': '{l: number, c: number, h: number, a?: number}', 'receivedType': typeof raw },
          'message': 'input is not an OKLCH object',
          'path':    'raw'
        }]
      });
    }
    const alpha = input.a ?? 1;
    const result = colorRecordFactory.fromOklch(input.l, input.c, input.h, { 'alpha': alpha });
    return result;
  }

  #tryParse(raw: ColorInputEntity.Type | RawImagePixelInputInterface): ColorRecordInterfaceTypeEntity.Type | undefined {
    try {
      const result = this.parse(raw);
      return result;
    } catch {
      return undefined;
    }
  }

  run(state: PaletteStateInterface, context: PipelineContextInterface): void {
    const inputColors = state.input.colors;
    for (let index = 0; index < inputColors.length; index += 1) {
      const raw = inputColors[index];
      if (raw === undefined) {
        continue;
      }
      const record = this.#tryParse(raw);
      if (record === undefined) {
        throw ValidationError.create({
          'message': `intake:oklch — entry at index ${index} is not an OKLCH object`,
          'path':    `input.colors[${index}]`,
          'violations': [{
            'details': {
              'expectedShape': '{l: 0..1, c: 0..0.5, h: 0..360, a?: number}',
              'index':         index,
              'received':      JSON.stringify(raw) ?? 'undefined'
            },
            'message': 'entry does not match the OKLCH object shape',
            'path':    `input.colors[${index}]`
          }]
        });
      }
      const input = OklchInputEntity.intake(raw);
      state.colors.push(record);
      context.logger.debug(
        LogBody.create({
          'component': 'IntakeOklch',
          'context': { 'c': input.c, 'h': input.h, 'hex': record.hex, 'l': input.l },
          'message': 'Parsed oklch value',
          'operation': 'run',
          'status': LOG_STATUS.SUCCESS
        })
      );
    }
  }
}

/** Singleton instance registered as the intake:oklch pipeline task. */
export const intakeOklch = new IntakeOklch();
