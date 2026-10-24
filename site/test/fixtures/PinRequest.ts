import type { RoleSchemaEntity } from '@studnicky/iridis/model';

import { RuntimeOptionsEntity } from '@studnicky/iridis';

import { ContrastConfigOptionsEntity } from '../../app/composables/entities/ContrastConfigOptionsEntity.ts';
import { roleSchemaByName } from '../../app/theme/RoleSchemaByName.ts';

/** One survey run: framing-bound schema, typed contrast selection, seed colors, and pinned roles. */
export class PinRequest {
  public readonly options: ContrastConfigOptionsEntity.Type;
  public readonly pins: ReadonlyMap<string, string>;
  public readonly roles: RoleSchemaEntity.Type;
  public readonly runtime: RuntimeOptionsEntity.Type;
  public readonly seeds: readonly string[];

  public constructor(
    roles: RoleSchemaEntity.Type,
    runtime: RuntimeOptionsEntity.Type,
    options: ContrastConfigOptionsEntity.Type,
    pins: ReadonlyMap<string, string>,
    seeds: readonly string[] = ['#000000', '#ffffff']
  ) {
    this.options = options;
    this.pins = pins;
    this.roles = roles;
    this.runtime = runtime;
    this.seeds = seeds;
  }

  public static dark(strictness: number, pins: ReadonlyMap<string, string>, enableStrictCompliance = false): PinRequest {
    const runtime = RuntimeOptionsEntity.create({ 'colorSpace': 'srgb', 'framing': 'dark' });
    const options = ContrastConfigOptionsEntity.create({ 'cvdMode': 'nudge', 'enableStrictCompliance': enableStrictCompliance, 'nonMandatoryLevel': 'AA', 'strictness': strictness });
    const result = new PinRequest(roleSchemaByName['iridis-32'].dark, runtime, options, pins);
    return result;
  }

  public static light(strictness: number, pins: ReadonlyMap<string, string>, enableStrictCompliance = false): PinRequest {
    const runtime = RuntimeOptionsEntity.create({ 'colorSpace': 'srgb', 'framing': 'light' });
    const options = ContrastConfigOptionsEntity.create({ 'cvdMode': 'nudge', 'enableStrictCompliance': enableStrictCompliance, 'nonMandatoryLevel': 'AA', 'strictness': strictness });
    const result = new PinRequest(roleSchemaByName['iridis-32'].light, runtime, options, pins);
    return result;
  }

  public static forSchema(
    roles: RoleSchemaEntity.Type,
    runtime: RuntimeOptionsEntity.Type,
    options: ContrastConfigOptionsEntity.Type,
    pins: ReadonlyMap<string, string>,
    seeds: readonly string[] = ['#000000', '#ffffff']
  ): PinRequest {
    const result = new PinRequest(roles, runtime, options, pins, seeds);
    return result;
  }
}
