import type { RoleSchemaInterfaceTypeEntity } from '@studnicky/iridis/model';

import { RuntimeOptionsInterfaceTypeEntity } from '@studnicky/iridis';

import { roleSchemaByName } from '../../app/theme/RoleSchemaByName.ts';

/** One survey run: framing-bound schema and runtime, contrast strictness, and pinned role hexes keyed by role name. */
export class PinRequest {
  public readonly pins: ReadonlyMap<string, string>;
  public readonly roles: RoleSchemaInterfaceTypeEntity.Type;
  public readonly runtime: RuntimeOptionsInterfaceTypeEntity.Type;
  public readonly strictness: number;

  public constructor(roles: RoleSchemaInterfaceTypeEntity.Type, runtime: RuntimeOptionsInterfaceTypeEntity.Type, strictness: number, pins: ReadonlyMap<string, string>) {
    this.pins = pins;
    this.roles = roles;
    this.runtime = runtime;
    this.strictness = strictness;
  }

  public static dark(strictness: number, pins: ReadonlyMap<string, string>): PinRequest {
    const runtime = RuntimeOptionsInterfaceTypeEntity.create({ 'colorSpace': 'srgb', 'framing': 'dark' });
    const result = new PinRequest(roleSchemaByName['iridis-32'].dark, runtime, strictness, pins);
    return result;
  }

  public static light(strictness: number, pins: ReadonlyMap<string, string>): PinRequest {
    const runtime = RuntimeOptionsInterfaceTypeEntity.create({ 'colorSpace': 'srgb', 'framing': 'light' });
    const result = new PinRequest(roleSchemaByName['iridis-32'].light, runtime, strictness, pins);
    return result;
  }
}
