import type { JSONSchema7Type } from 'json-schema';

import type { ColorRecordInterfaceTypeEntity } from '../entities/ColorRecordInterfaceTypeEntity.ts';
import type { InputInterfaceTypeEntity } from '../entities/InputInterfaceTypeEntity.ts';
import type { RuntimeOptionsInterfaceTypeEntity } from '../entities/RuntimeOptionsInterfaceTypeEntity.ts';

export interface PaletteStateInterface {
  'colors':            ColorRecordInterfaceTypeEntity.Type[];
  readonly 'input':    InputInterfaceTypeEntity.Type;
  'metadata':          Record<string, JSONSchema7Type>;
  'outputs':           Record<string, JSONSchema7Type>;
  'roles':             Record<string, ColorRecordInterfaceTypeEntity.Type>;
  readonly 'runtime':  RuntimeOptionsInterfaceTypeEntity.Type;
  'variants':          Record<string, Record<string, ColorRecordInterfaceTypeEntity.Type>>;
}

/**
 * Mutable role workspace for pipeline tasks. Role records enter through a
 * Map and serialize into the public JSON-compatible state object only at the
 * task boundary.
 */
export class PaletteRoleState {
  readonly #roles: Map<string, ColorRecordInterfaceTypeEntity.Type>;
  readonly #target: Record<string, ColorRecordInterfaceTypeEntity.Type>;

  private constructor(roles: Map<string, ColorRecordInterfaceTypeEntity.Type>, target: Record<string, ColorRecordInterfaceTypeEntity.Type>) {
    this.#roles = roles;
    this.#target = target;
  }

  static admit(target: Record<string, ColorRecordInterfaceTypeEntity.Type>): PaletteRoleState {
    const result = new PaletteRoleState(new Map(Object.entries(target)), target);
    return result;
  }

  commit(): void {
    const names = Object.keys(this.#target);
    for (let index = 0; index < names.length; index += 1) {
      const name = names[index];
      if (name !== undefined && !Reflect.deleteProperty(this.#target, name)) {
        throw new TypeError('Unable to remove role from palette state');
      }
    }
    for (const [name, color] of this.#roles) {
      Object.defineProperty(this.#target, name, {
        'configurable': true,
        'enumerable':   true,
        'value':        color,
        'writable':     true
      });
    }
  }

  get(name: string): ColorRecordInterfaceTypeEntity.Type | undefined {
    const result = this.#roles.get(name);
    return result;
  }

  has(name: string): boolean {
    const result = this.#roles.has(name);
    return result;
  }

  set(name: string, color: ColorRecordInterfaceTypeEntity.Type): void {
    this.#roles.set(name, color);
  }
}
