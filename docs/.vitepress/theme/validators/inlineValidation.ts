/**
 * inlineValidation.ts
 *
 * Browser-safe validators for the IridisDemo inline editors. We can't use
 * json-tology in the docs bundle (it imports node:url) so these are
 * hand-rolled against the same shape constraints.
 *
 * Each validator returns null on success, or an error string on failure.
 */

import type { RoleSchemaInterface } from '@studnicky/iridis/model';

const HEX_RE = /^#[0-9a-fA-F]{6}$/;

export function validateColorsArray(value: unknown): string | null {
  if (!Array.isArray(value)) {
    return 'colors must be an array';
  }
  if (value.length < 1) return 'colors must have at least 1 entry';
  if (value.length > 8) return 'colors must have at most 8 entries';
  for (let i = 0; i < value.length; i++) {
    const v = value[i];
    if (typeof v !== 'string' || !HEX_RE.test(v)) {
      return `colors[${i}] must be a 6-digit hex string (#rrggbb), got ${JSON.stringify(v)}`;
    }
  }
  return null;
}

export function validateRoleSchema(value: unknown): string | null {
  if (typeof value !== 'object' || value === null) {
    return 'role schema must be an object';
  }
  const v = value as Record<string, unknown>;
  if (typeof v['name'] !== 'string') return 'name must be a string';
  if (!Array.isArray(v['roles'])) return 'roles must be an array';
  const roles = v['roles'] as unknown[];
  if (roles.length < 1) return 'roles must have at least 1 entry';
  for (let i = 0; i < roles.length; i++) {
    const r = roles[i];
    if (typeof r !== 'object' || r === null) {
      return `roles[${i}] must be an object`;
    }
    const role = r as Record<string, unknown>;
    if (typeof role['name'] !== 'string') {
      return `roles[${i}].name must be a string`;
    }
    if (role['lightnessRange'] !== undefined) {
      const lr = role['lightnessRange'];
      if (!Array.isArray(lr) || lr.length !== 2 || typeof lr[0] !== 'number' || typeof lr[1] !== 'number') {
        return `roles[${i}].lightnessRange must be [number, number]`;
      }
    }
    if (role['chromaRange'] !== undefined) {
      const cr = role['chromaRange'];
      if (!Array.isArray(cr) || cr.length !== 2 || typeof cr[0] !== 'number' || typeof cr[1] !== 'number') {
        return `roles[${i}].chromaRange must be [number, number]`;
      }
    }
  }
  return null;
}

export function asRoleSchema(value: unknown): RoleSchemaInterface {
  return value as RoleSchemaInterface;
}
