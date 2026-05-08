/**
 * roleSchemas.ts
 *
 * Canonical role schemas selectable from the docs config. Each is a real
 * RoleSchemaInterface fed into engine.run() so demos resolve a meaningful
 * palette regardless of which schema the reader picks.
 */

import type { RoleSchemaInterface } from '@studnicky/iridis/model';

export const minimalRoleSchema: RoleSchemaInterface = {
  'name':        'minimal',
  'description': 'Minimal four-role schema for quick demos',
  'roles': [
    { 'name': 'background', 'intent': 'base',    'required': true, 'lightnessRange': [0.92, 1.0] },
    { 'name': 'foreground', 'intent': 'text',    'required': true, 'lightnessRange': [0.10, 0.25] },
    { 'name': 'accent',     'intent': 'accent',  'required': true },
    { 'name': 'muted',      'intent': 'muted',   'lightnessRange': [0.45, 0.65] },
  ],
  'contrastPairs': [
    { 'foreground': 'foreground', 'background': 'background', 'minRatio': 4.5, 'algorithm': 'wcag21' },
    { 'foreground': 'foreground', 'background': 'accent',     'minRatio': 4.5, 'algorithm': 'wcag21' },
  ],
};

export const w3cRoleSchema: RoleSchemaInterface = {
  'name':        'w3c',
  'description': 'WCAG 2.1 AA role schema (canvas / surface / accent / onAccent / border / muted / text)',
  'roles': [
    { 'name': 'canvas',   'intent': 'base',    'required': true, 'lightnessRange': [0.92, 1.0] },
    { 'name': 'surface',  'intent': 'surface', 'required': true, 'lightnessRange': [0.86, 0.96] },
    { 'name': 'accent',   'intent': 'accent',  'required': true },
    { 'name': 'onAccent', 'intent': 'text',    'required': true, 'derivedFrom': 'accent', 'lightnessRange': [0.98, 1.0] },
    { 'name': 'border',   'intent': 'neutral', 'lightnessRange': [0.60, 0.80] },
    { 'name': 'muted',    'intent': 'muted',   'lightnessRange': [0.45, 0.65] },
    { 'name': 'text',     'intent': 'text',    'required': true, 'lightnessRange': [0.10, 0.25] },
  ],
  'contrastPairs': [
    { 'foreground': 'text',     'background': 'canvas',  'minRatio': 4.5, 'algorithm': 'wcag21' },
    { 'foreground': 'text',     'background': 'surface', 'minRatio': 4.5, 'algorithm': 'wcag21' },
    { 'foreground': 'onAccent', 'background': 'accent',  'minRatio': 4.5, 'algorithm': 'wcag21' },
    { 'foreground': 'border',   'background': 'canvas',  'minRatio': 3.0, 'algorithm': 'wcag21' },
  ],
};

export const materialRoleSchema: RoleSchemaInterface = {
  'name':        'material',
  'description': 'Material-style six-role schema',
  'roles': [
    { 'name': 'primary',     'intent': 'accent',   'required': true },
    { 'name': 'onPrimary',   'intent': 'text',     'required': true, 'derivedFrom': 'primary', 'lightnessRange': [0.98, 1.0] },
    { 'name': 'secondary',   'intent': 'muted' },
    { 'name': 'background',  'intent': 'base',     'required': true, 'lightnessRange': [0.92, 1.0] },
    { 'name': 'onBackground','intent': 'text',     'required': true, 'lightnessRange': [0.10, 0.25] },
    { 'name': 'error',       'intent': 'critical' },
  ],
  'contrastPairs': [
    { 'foreground': 'onPrimary',     'background': 'primary',     'minRatio': 4.5, 'algorithm': 'wcag21' },
    { 'foreground': 'onBackground',  'background': 'background',  'minRatio': 4.5, 'algorithm': 'wcag21' },
  ],
};

export const roleSchemaByName: Readonly<Record<string, RoleSchemaInterface>> = {
  'minimal':  minimalRoleSchema,
  'w3c':      w3cRoleSchema,
  'material': materialRoleSchema,
};
