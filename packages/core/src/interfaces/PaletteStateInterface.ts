import type { JSONSchema7Type } from 'json-schema';

import type { ColorRecordEntity } from '../entities/ColorRecordEntity.ts';
import type { InputEntity } from '../entities/InputEntity.ts';
import type { RuntimeOptionsEntity } from '../entities/RuntimeOptionsEntity.ts';

export interface PaletteStateInterface {
  'colors':            ColorRecordEntity.Type[];
  readonly 'input':    InputEntity.Type;
  'metadata':          Record<string, JSONSchema7Type>;
  'outputs':           Record<string, JSONSchema7Type>;
  'roles':             Record<string, ColorRecordEntity.Type>;
  readonly 'runtime':  RuntimeOptionsEntity.Type;
  'variants':          Record<string, Record<string, ColorRecordEntity.Type>>;
}

/**
 * Mutable role workspace for pipeline tasks. Role records enter through a
 * Map and serialize into the public JSON-compatible state object only at the
 * task boundary.
 */
export class PaletteRoleState {
  readonly #roles: Map<string, ColorRecordEntity.Type>;
  readonly #target: Record<string, ColorRecordEntity.Type>;

  private constructor(roles: Map<string, ColorRecordEntity.Type>, target: Record<string, ColorRecordEntity.Type>) {
    this.#roles = roles;
    this.#target = target;
  }

  static admit(target: Record<string, ColorRecordEntity.Type>): PaletteRoleState {
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

  get(name: string): ColorRecordEntity.Type | undefined {
    const result = this.#roles.get(name);
    return result;
  }

  has(name: string): boolean {
    const result = this.#roles.has(name);
    return result;
  }

  set(name: string, color: ColorRecordEntity.Type): void {
    this.#roles.set(name, color);
  }
}
