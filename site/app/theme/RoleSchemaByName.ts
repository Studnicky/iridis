/**
 * RoleSchemaByName.ts
 *
 * Built-in iridis role schemas for the docs site. Each tier is a superset
 * of the previous (4 ⊂ 8 ⊂ 12 ⊂ 16 ⊂ 32), so picking a smaller tier
 * produces a sparser palette and the docs page paints with fewer tokens
 * (that sparseness IS the demonstration of what each schema gives you).
 *
 * Each tier ships as a { dark, light } pair. Same role names, same contrast
 * pairs, only lightness ranges differ. The framing toggle in the navbar
 * swaps which variant feeds the engine; the engine produces both modes
 * idiomatically without renderer-side inversion.
 *
 *   iridis-4  : background, text, brand, muted
 *   iridis-8  : + surface, bgSoft, divider, onBrand
 *   iridis-12 : + success, warning, error, syntaxKeyword
 *   iridis-16 : + syntaxString, syntaxNumber, syntaxFunction, syntaxType
 *
 * Relationship graphs define the schema-authored role derivations. The
 * canonical resolver applies target envelopes, and contrast enforcement
 * maintains each selected standard.
 */

import { RoleRelationshipEntity, RoleRelationshipGraphEntity, RoleSchemaEntity } from '@studnicky/iridis';

import type { SchemaNameEntity } from '../composables/entities/SchemaNameEntity.ts';
import type { SchemaPair } from '../composables/types/index.ts';

/* ─── iridis-4 ─────────────────────────────────────────────────────── */

namespace RoleSchemas {
  class RelationshipGraphs {
    private static readonly toleranceByOperation = {
      'alias': { 'alpha': 1, 'chroma': 0.5, 'hue': 5, 'lightness': 1 },
      'hue-offset': { 'alpha': 1, 'chroma': 0.5, 'hue': 5, 'lightness': 1 },
      'hue-target': { 'alpha': 1, 'chroma': 0.5, 'hue': 5, 'lightness': 1 }
    } as const;

    static create(
      relationships: RoleRelationshipEntity.Type[]
    ): RoleRelationshipGraphEntity.Type {
      const result = RoleRelationshipGraphEntity.create({
        'groups': [{
          'anchor': 'brand',
          'defaultMode': 'default',
          'id': 'palette',
          'modes': [{ 'hueOffsets': [{ 'degrees': 0, 'variantId': 'default' }], 'id': 'default' }],
          'name': 'Palette relationships',
          'relationships': relationships
        }]
      });
      return result;
    }

    static alias(id: string, source: string, target: string): RoleRelationshipEntity.Type {
      const result = RoleRelationshipEntity.create({
        'id': id, 'operation': 'alias', 'priority': 0, 'relaxability': 'tolerant', 'source': source, 'target': target, 'tolerance': RelationshipGraphs.toleranceByOperation.alias
      });
      return result;
    }

    static hueOffset(id: string, source: string, target: string, degrees: number): RoleRelationshipEntity.Type {
      const result = RoleRelationshipEntity.create({
        'degrees': degrees, 'id': id, 'operation': 'hue-offset', 'priority': 0, 'relaxability': 'tolerant', 'source': source, 'target': target, 'tolerance': RelationshipGraphs.toleranceByOperation['hue-offset']
      });
      return result;
    }

    static hueTarget(id: string, target: string, hue: number, source?: string): RoleRelationshipEntity.Type {
      const result = RoleRelationshipEntity.create({
        'clamp': 90, 'hue': hue, 'id': id, 'operation': 'hue-target', 'priority': 0, 'relaxability': 'tolerant', 'target': target, 'tolerance': RelationshipGraphs.toleranceByOperation['hue-target'],
        ...(source === undefined ? {} : { 'source': source })
      });
      return result;
    }
  }

  const iridis8Relationships = [
    RelationshipGraphs.alias('surface', 'background', 'surface'), RelationshipGraphs.alias('bg-soft', 'background', 'bg-soft'),
    RelationshipGraphs.alias('divider', 'background', 'divider'), RelationshipGraphs.alias('on-brand', 'brand', 'on-brand')
  ];
  const iridis12Relationships = [
    ...iridis8Relationships,
    RelationshipGraphs.hueTarget('success', 'success', 160, 'brand'), RelationshipGraphs.hueTarget('warning', 'warning', 60, 'brand'),
    RelationshipGraphs.hueTarget('error', 'error', 25), RelationshipGraphs.alias('syntax-keyword', 'brand', 'syntax-keyword')
  ];
  const iridis16Relationships = [
    ...iridis12Relationships,
    RelationshipGraphs.hueOffset('syntax-string', 'brand', 'syntax-string', 120), RelationshipGraphs.hueOffset('syntax-number', 'brand', 'syntax-number', 60),
    RelationshipGraphs.hueOffset('syntax-function', 'brand', 'syntax-function', 180), RelationshipGraphs.hueOffset('syntax-type', 'brand', 'syntax-type', 210)
  ];
  const iridis32Relationships = [
    ...iridis16Relationships,
    RelationshipGraphs.alias('text-strong', 'text', 'text-strong'), RelationshipGraphs.alias('text-subtle', 'text', 'text-subtle'),
    RelationshipGraphs.hueOffset('link', 'brand', 'link', -15), RelationshipGraphs.hueOffset('link-hover', 'brand', 'link-hover', -15),
    RelationshipGraphs.alias('focus-ring', 'brand', 'focus-ring'), RelationshipGraphs.alias('border', 'divider', 'border'),
    RelationshipGraphs.alias('border-strong', 'divider', 'border-strong'), RelationshipGraphs.alias('code-bg', 'bg-soft', 'code-bg'),
    RelationshipGraphs.hueTarget('info', 'info', 230, 'brand'), RelationshipGraphs.hueOffset('accent-alt', 'brand', 'accent-alt', 150),
    RelationshipGraphs.alias('syntax-comment', 'muted', 'syntax-comment'), RelationshipGraphs.hueOffset('syntax-tag', 'brand', 'syntax-tag', 240),
    RelationshipGraphs.hueOffset('syntax-attribute', 'brand', 'syntax-attribute', 270), RelationshipGraphs.hueOffset('syntax-operator', 'brand', 'syntax-operator', 300),
    RelationshipGraphs.hueOffset('syntax-class', 'brand', 'syntax-class', 30), RelationshipGraphs.alias('syntax-punctuation', 'muted', 'syntax-punctuation')
  ];
  const iridis4Dark = RoleSchemaEntity.create({
    'contrastPairs': [
      { 'algorithm': 'wcag21',  'background': 'background', 'contrastClass': 'text', 'foreground': 'text', 'minimumContrastRatio': 4.5 },
      { 'algorithm': 'wcag21', 'background': 'background', 'contrastClass': 'text', 'foreground': 'brand', 'minimumContrastRatio': 4.5 },
      { 'algorithm': 'wcag21', 'background': 'background', 'contrastClass': 'text', 'foreground': 'muted', 'minimumContrastRatio': 4.5 }
    ],
    'description': 'Minimal four-role schema (dark framing). Background, text, brand, muted.',
    'name':        'iridis-4-dark',
    'roles': [
      { 'chromaRange': [0.00, 0.04], 'intent': 'background', 'lightnessRange': [0.04, 0.14], 'name': 'background', 'required': true },
      { 'chromaRange': [0.00, 0.04], 'intent': 'text', 'lightnessRange': [0.85, 0.96], 'name': 'text', 'required': true },
      { 'chromaRange': [0.12, 0.30], 'intent': 'accent', 'lightnessRange': [0.55, 0.84], 'name': 'brand', 'required': true },
      { 'chromaRange': [0.00, 0.06], 'intent': 'muted', 'lightnessRange': [0.50, 0.77], 'name': 'muted' }
    ]
  });

  const iridis4Light = RoleSchemaEntity.create({
    'contrastPairs': [
      { 'algorithm': 'wcag21',  'background': 'background', 'contrastClass': 'text', 'foreground': 'text', 'minimumContrastRatio': 4.5 },
      { 'algorithm': 'wcag21', 'background': 'background', 'contrastClass': 'text', 'foreground': 'brand', 'minimumContrastRatio': 4.5 },
      { 'algorithm': 'wcag21', 'background': 'background', 'contrastClass': 'text', 'foreground': 'muted', 'minimumContrastRatio': 4.5 }
    ],
    'description': 'Minimal four-role schema (light framing). Background, text, brand, muted.',
    'name':        'iridis-4-light',
    'roles': [
      { 'chromaRange': [0.00, 0.03], 'intent': 'background', 'lightnessRange': [0.94, 0.99], 'name': 'background', 'required': true },
      { 'chromaRange': [0.00, 0.04], 'intent': 'text', 'lightnessRange': [0.10, 0.22], 'name': 'text', 'required': true },
      { 'chromaRange': [0.14, 0.32], 'intent': 'accent', 'lightnessRange': [0.40, 0.58], 'name': 'brand', 'required': true },
      { 'chromaRange': [0.00, 0.06], 'intent': 'muted', 'lightnessRange': [0.40, 0.55], 'name': 'muted' }
    ]
  });

  /* ─── iridis-8 ─────────────────────────────────────────────────────── */

  const iridis8Dark = RoleSchemaEntity.create({
    'contrastPairs': [
      ...(iridis4Dark.contrastPairs ?? []),
      { 'algorithm': 'wcag21',     'background': 'surface',    'contrastClass': 'text', 'foreground': 'text', 'minimumContrastRatio': 4.5 },
      { 'algorithm': 'wcag21',     'background': 'bg-soft',    'contrastClass': 'text', 'foreground': 'text', 'minimumContrastRatio': 4.5 },
      { 'algorithm': 'wcag21', 'background': 'brand',      'contrastClass': 'text', 'foreground': 'on-brand', 'minimumContrastRatio': 4.5 },
      { 'algorithm': 'wcag21',  'background': 'background', 'contrastClass': 'non-text', 'foreground': 'divider', 'minimumContrastRatio': 3.0 }
    ],
    'description': 'Eight-role schema (dark framing). Adds surface, bgSoft, divider, onBrand.',
    'name':        'iridis-8-dark',
    'relationshipGraph': RelationshipGraphs.create(iridis8Relationships),
    'roles': [
      ...iridis4Dark.roles,
      { 'chromaRange': [0.00, 0.06], 'intent': 'background', 'lightnessRange': [0.08, 0.18], 'name': 'surface', 'required': true },
      { 'chromaRange': [0.00, 0.08], 'intent': 'background', 'lightnessRange': [0.10, 0.22], 'name': 'bg-soft' },
      { 'chromaRange': [0.00, 0.06], 'intent': 'muted', 'lightnessRange': [0.18, 0.70], 'name': 'divider' },
      { 'chromaRange': [0.00, 0.02], 'intent': 'text', 'lightnessRange': [0.04, 0.14], 'name': 'on-brand', 'required': true }
    ]
  });

  const iridis8Light = RoleSchemaEntity.create({
    'contrastPairs': [
      ...(iridis4Light.contrastPairs ?? []),
      { 'algorithm': 'wcag21',     'background': 'surface',    'contrastClass': 'text', 'foreground': 'text', 'minimumContrastRatio': 4.5 },
      { 'algorithm': 'wcag21',     'background': 'bg-soft',    'contrastClass': 'text', 'foreground': 'text', 'minimumContrastRatio': 4.5 },
      { 'algorithm': 'wcag21', 'background': 'brand',      'contrastClass': 'text', 'foreground': 'on-brand', 'minimumContrastRatio': 4.5 },
      { 'algorithm': 'wcag21',  'background': 'background', 'contrastClass': 'non-text', 'foreground': 'divider', 'minimumContrastRatio': 3.0 }
    ],
    'description': 'Eight-role schema (light framing). Adds surface, bg-soft, divider, on-brand.',
    'name':        'iridis-8-light',
    'relationshipGraph': RelationshipGraphs.create(iridis8Relationships),
    'roles': [
      ...iridis4Light.roles,
      { 'chromaRange': [0.00, 0.04], 'intent': 'background', 'lightnessRange': [0.88, 0.96], 'name': 'surface', 'required': true },
      { 'chromaRange': [0.00, 0.04], 'intent': 'background', 'lightnessRange': [0.90, 0.98], 'name': 'bg-soft' },
      { 'chromaRange': [0.00, 0.04], 'intent': 'muted', 'lightnessRange': [0.60, 0.86], 'name': 'divider' },
      { 'chromaRange': [0.00, 0.02], 'intent': 'text', 'lightnessRange': [0.97, 1.00], 'name': 'on-brand', 'required': true }
    ]
  });

  /* ─── iridis-12 ────────────────────────────────────────────────────── */

  const iridis12Dark = RoleSchemaEntity.create({
    'contrastPairs': [
      ...(iridis8Dark.contrastPairs ?? []),
      { 'algorithm': 'wcag21',       'background': 'background', 'contrastClass': 'text', 'foreground': 'success', 'minimumContrastRatio': 4.5 },
      { 'algorithm': 'wcag21',       'background': 'background', 'contrastClass': 'text', 'foreground': 'warning', 'minimumContrastRatio': 4.5 },
      { 'algorithm': 'wcag21',         'background': 'background', 'contrastClass': 'text', 'foreground': 'error', 'minimumContrastRatio': 4.5 },
      { 'algorithm': 'wcag21', 'background': 'bg-soft',     'contrastClass': 'text', 'foreground': 'syntax-keyword', 'minimumContrastRatio': 4.5 }
    ],
    'description': 'Twelve-role schema (dark framing). Adds success, warning, error, syntaxKeyword.',
    'name':        'iridis-12-dark',
    'relationshipGraph': RelationshipGraphs.create(iridis12Relationships),
    'roles': [
      ...iridis8Dark.roles,
      { 'chromaRange': [0.14, 0.28], 'intent': 'positive', 'lightnessRange': [0.65, 0.78], 'name': 'success' },
      { 'chromaRange': [0.16, 0.28], 'intent': 'positive', 'lightnessRange': [0.70, 0.82], 'name': 'warning' },
      { 'chromaRange': [0.10, 0.30], 'intent': 'critical', 'lightnessRange': [0.62, 0.84], 'name': 'error' },
      { 'chromaRange': [0.14, 0.28], 'intent': 'accent', 'lightnessRange': [0.68, 0.82], 'name': 'syntax-keyword' }
    ]
  });

  const iridis12Light = RoleSchemaEntity.create({
    'contrastPairs': [
      ...(iridis8Light.contrastPairs ?? []),
      { 'algorithm': 'wcag21',       'background': 'background', 'contrastClass': 'text', 'foreground': 'success', 'minimumContrastRatio': 4.5 },
      { 'algorithm': 'wcag21',       'background': 'background', 'contrastClass': 'text', 'foreground': 'warning', 'minimumContrastRatio': 4.5 },
      { 'algorithm': 'wcag21',         'background': 'background', 'contrastClass': 'text', 'foreground': 'error', 'minimumContrastRatio': 4.5 },
      { 'algorithm': 'wcag21', 'background': 'bg-soft',     'contrastClass': 'text', 'foreground': 'syntax-keyword', 'minimumContrastRatio': 4.5 }
    ],
    'description': 'Twelve-role schema (light framing). Adds success, warning, error, syntaxKeyword.',
    'name':        'iridis-12-light',
    'relationshipGraph': RelationshipGraphs.create(iridis12Relationships),
    'roles': [
      ...iridis8Light.roles,
      { 'chromaRange': [0.16, 0.30], 'intent': 'positive', 'lightnessRange': [0.40, 0.52], 'name': 'success' },
      { 'chromaRange': [0.18, 0.30], 'intent': 'positive', 'lightnessRange': [0.45, 0.62], 'name': 'warning' },
      { 'chromaRange': [0.20, 0.32], 'intent': 'critical', 'lightnessRange': [0.40, 0.55], 'name': 'error' },
      { 'chromaRange': [0.16, 0.30], 'intent': 'accent', 'lightnessRange': [0.42, 0.56], 'name': 'syntax-keyword' }
    ]
  });

  /* ─── iridis-16 ────────────────────────────────────────────────────── */

  const iridis16Dark = RoleSchemaEntity.create({
    'contrastPairs': [
      ...(iridis12Dark.contrastPairs ?? []),
      { 'algorithm': 'wcag21',   'background': 'bg-soft', 'contrastClass': 'text', 'foreground': 'syntax-string', 'minimumContrastRatio': 4.5 },
      { 'algorithm': 'wcag21',   'background': 'bg-soft', 'contrastClass': 'text', 'foreground': 'syntax-number', 'minimumContrastRatio': 4.5 },
      { 'algorithm': 'wcag21', 'background': 'bg-soft', 'contrastClass': 'text', 'foreground': 'syntax-function', 'minimumContrastRatio': 4.5 },
      { 'algorithm': 'wcag21',     'background': 'bg-soft', 'contrastClass': 'text', 'foreground': 'syntax-type', 'minimumContrastRatio': 4.5 }
    ],
    'description': 'Full sixteen-role schema (dark framing). Complete chrome + status + syntax theme.',
    'name':        'iridis-16-dark',
    'relationshipGraph': RelationshipGraphs.create(iridis16Relationships),
    'roles': [
      ...iridis12Dark.roles,
      { 'chromaRange': [0.14, 0.26], 'intent': 'accent', 'lightnessRange': [0.70, 0.85], 'name': 'syntax-string' },
      { 'chromaRange': [0.14, 0.28], 'intent': 'accent', 'lightnessRange': [0.70, 0.85], 'name': 'syntax-number' },
      { 'chromaRange': [0.12, 0.24], 'intent': 'accent', 'lightnessRange': [0.68, 0.82], 'name': 'syntax-function' },
      { 'chromaRange': [0.10, 0.22], 'intent': 'accent', 'lightnessRange': [0.70, 0.84], 'name': 'syntax-type' }
    ]
  });

  const iridis16Light = RoleSchemaEntity.create({
    'contrastPairs': [
      ...(iridis12Light.contrastPairs ?? []),
      { 'algorithm': 'wcag21',   'background': 'bg-soft', 'contrastClass': 'text', 'foreground': 'syntax-string', 'minimumContrastRatio': 4.5 },
      { 'algorithm': 'wcag21',   'background': 'bg-soft', 'contrastClass': 'text', 'foreground': 'syntax-number', 'minimumContrastRatio': 4.5 },
      { 'algorithm': 'wcag21', 'background': 'bg-soft', 'contrastClass': 'text', 'foreground': 'syntax-function', 'minimumContrastRatio': 4.5 },
      { 'algorithm': 'wcag21',     'background': 'bg-soft', 'contrastClass': 'text', 'foreground': 'syntax-type', 'minimumContrastRatio': 4.5 }
    ],
    'description': 'Full sixteen-role schema (light framing). Complete chrome + status + syntax theme.',
    'name':        'iridis-16-light',
    'relationshipGraph': RelationshipGraphs.create(iridis16Relationships),
    'roles': [
      ...iridis12Light.roles,
      { 'chromaRange': [0.14, 0.26], 'intent': 'accent', 'lightnessRange': [0.40, 0.52], 'name': 'syntax-string' },
      { 'chromaRange': [0.16, 0.28], 'intent': 'accent', 'lightnessRange': [0.42, 0.58], 'name': 'syntax-number' },
      { 'chromaRange': [0.14, 0.26], 'intent': 'accent', 'lightnessRange': [0.40, 0.52], 'name': 'syntax-function' },
      { 'chromaRange': [0.12, 0.22], 'intent': 'accent', 'lightnessRange': [0.40, 0.52], 'name': 'syntax-type' }
    ]
  });

  /* ─── iridis-32 ────────────────────────────────────────────────────── */

  /* Sixteen-role tier extended with emphasis tiers, interaction colors,
   chrome variants, and the full editor-style syntax family. Mirrors
   the conceptual surface that large-scale design systems (vscode,
   ide themes, full chrome+code+status surfaces) consume. */

  const iridis32Dark = RoleSchemaEntity.create({
    'contrastPairs': [
      ...(iridis16Dark.contrastPairs ?? []),
      { 'algorithm': 'wcag21', 'background': 'background', 'contrastClass': 'text', 'foreground': 'text-strong', 'minimumContrastRatio': 7.0 },
      { 'algorithm': 'wcag21', 'background': 'background', 'contrastClass': 'text', 'foreground': 'text-subtle', 'minimumContrastRatio': 4.5 },
      { 'algorithm': 'wcag21',        'background': 'background', 'contrastClass': 'text', 'foreground': 'link', 'minimumContrastRatio': 4.5 },
      { 'algorithm': 'wcag21',  'background': 'background', 'contrastClass': 'text', 'foreground': 'link-hover', 'minimumContrastRatio': 4.5 },
      { 'algorithm': 'wcag21',        'background': 'background', 'contrastClass': 'text', 'foreground': 'info', 'minimumContrastRatio': 4.5 },
      { 'algorithm': 'wcag21',  'background': 'background', 'contrastClass': 'text', 'foreground': 'accent-alt', 'minimumContrastRatio': 4.5 },
      { 'algorithm': 'wcag21',         'background': 'code-bg', 'contrastClass': 'text', 'foreground': 'syntax-tag', 'minimumContrastRatio': 4.5 },
      { 'algorithm': 'wcag21',   'background': 'code-bg', 'contrastClass': 'text', 'foreground': 'syntax-attribute', 'minimumContrastRatio': 4.5 },
      { 'algorithm': 'wcag21',    'background': 'code-bg', 'contrastClass': 'text', 'foreground': 'syntax-operator', 'minimumContrastRatio': 4.5 },
      { 'algorithm': 'wcag21',       'background': 'code-bg', 'contrastClass': 'text', 'foreground': 'syntax-class', 'minimumContrastRatio': 4.5 },
      { 'algorithm': 'wcag21',     'background': 'code-bg', 'contrastClass': 'non-text', 'foreground': 'syntax-comment', 'minimumContrastRatio': 3.0 },
      { 'algorithm': 'wcag21', 'background': 'code-bg', 'contrastClass': 'non-text', 'foreground': 'syntax-punctuation', 'minimumContrastRatio': 3.0 }
    ],
    'description': 'Thirty-two-role schema (dark framing). Adds emphasis tiers, interaction colors, chrome variants, and extended syntax tokens.',
    'name':        'iridis-32-dark',
    'relationshipGraph': RelationshipGraphs.create(iridis32Relationships),
    'roles': [
      ...iridis16Dark.roles,
      /* Emphasis tiers: text-strong reads as primary headings, text-subtle as captions / metadata. */
      { 'chromaRange': [0.00, 0.03], 'intent': 'text', 'lightnessRange': [0.92, 0.99], 'name': 'text-strong' },
      { 'chromaRange': [0.00, 0.04], 'intent': 'muted', 'lightnessRange': [0.62, 0.77], 'name': 'text-subtle' },
      /* Interaction family: link/link-hover for anchors, focus-ring for a11y outlines. */
      { 'chromaRange': [0.14, 0.28], 'intent': 'link', 'lightnessRange': [0.62, 0.78], 'name': 'link' },
      { 'chromaRange': [0.16, 0.30], 'intent': 'link', 'lightnessRange': [0.72, 0.86], 'name': 'link-hover' },
      { 'chromaRange': [0.20, 0.34], 'intent': 'accent', 'lightnessRange': [0.60, 0.75], 'name': 'focus-ring' },
      /* Chrome variants: overlays, alternate borders, code surfaces. */
      { 'chromaRange': [0.00, 0.04], 'intent': 'background', 'lightnessRange': [0.02, 0.10], 'name': 'overlay' },
      { 'chromaRange': [0.00, 0.06], 'intent': 'muted', 'lightnessRange': [0.22, 0.34], 'name': 'border' },
      { 'chromaRange': [0.00, 0.08], 'intent': 'muted', 'lightnessRange': [0.32, 0.46], 'name': 'border-strong' },
      { 'chromaRange': [0.00, 0.04], 'intent': 'background', 'lightnessRange': [0.08, 0.16], 'name': 'code-bg' },
      /* Status family: info completes the warning/error/success quadrant. */
      { 'chromaRange': [0.16, 0.28], 'intent': 'accent', 'lightnessRange': [0.55, 0.76], 'name': 'info' },
      /* Secondary accent: pairs with brand for two-color emphasis. */
      { 'chromaRange': [0.14, 0.26], 'intent': 'accent', 'lightnessRange': [0.58, 0.77], 'name': 'accent-alt' },
      /* Extended syntax: comment / tag / attribute / operator / class / punctuation. */
      { 'chromaRange': [0.00, 0.06], 'intent': 'muted', 'lightnessRange': [0.48, 0.70], 'name': 'syntax-comment' },
      { 'chromaRange': [0.14, 0.26], 'intent': 'accent', 'lightnessRange': [0.68, 0.82], 'name': 'syntax-tag' },
      { 'chromaRange': [0.12, 0.24], 'intent': 'accent', 'lightnessRange': [0.68, 0.82], 'name': 'syntax-attribute' },
      { 'chromaRange': [0.10, 0.22], 'intent': 'accent', 'lightnessRange': [0.70, 0.84], 'name': 'syntax-operator' },
      { 'chromaRange': [0.14, 0.26], 'intent': 'accent', 'lightnessRange': [0.70, 0.84], 'name': 'syntax-class' },
      { 'chromaRange': [0.00, 0.08], 'intent': 'muted', 'lightnessRange': [0.58, 0.72], 'name': 'syntax-punctuation' }
    ]
  });

  const iridis32Light = RoleSchemaEntity.create({
    'contrastPairs': [
      ...(iridis16Light.contrastPairs ?? []),
      { 'algorithm': 'wcag21', 'background': 'background', 'contrastClass': 'text', 'foreground': 'text-strong', 'minimumContrastRatio': 7.0 },
      { 'algorithm': 'wcag21', 'background': 'background', 'contrastClass': 'text', 'foreground': 'text-subtle', 'minimumContrastRatio': 4.5 },
      { 'algorithm': 'wcag21',        'background': 'background', 'contrastClass': 'text', 'foreground': 'link', 'minimumContrastRatio': 4.5 },
      { 'algorithm': 'wcag21',  'background': 'background', 'contrastClass': 'text', 'foreground': 'link-hover', 'minimumContrastRatio': 4.5 },
      { 'algorithm': 'wcag21',        'background': 'background', 'contrastClass': 'text', 'foreground': 'info', 'minimumContrastRatio': 4.5 },
      { 'algorithm': 'wcag21',  'background': 'background', 'contrastClass': 'text', 'foreground': 'accent-alt', 'minimumContrastRatio': 4.5 },
      { 'algorithm': 'wcag21',         'background': 'code-bg', 'contrastClass': 'text', 'foreground': 'syntax-tag', 'minimumContrastRatio': 4.5 },
      { 'algorithm': 'wcag21',   'background': 'code-bg', 'contrastClass': 'text', 'foreground': 'syntax-attribute', 'minimumContrastRatio': 4.5 },
      { 'algorithm': 'wcag21',    'background': 'code-bg', 'contrastClass': 'text', 'foreground': 'syntax-operator', 'minimumContrastRatio': 4.5 },
      { 'algorithm': 'wcag21',       'background': 'code-bg', 'contrastClass': 'text', 'foreground': 'syntax-class', 'minimumContrastRatio': 4.5 },
      { 'algorithm': 'wcag21',     'background': 'code-bg', 'contrastClass': 'non-text', 'foreground': 'syntax-comment', 'minimumContrastRatio': 3.0 },
      { 'algorithm': 'wcag21', 'background': 'code-bg', 'contrastClass': 'non-text', 'foreground': 'syntax-punctuation', 'minimumContrastRatio': 3.0 }
    ],
    'description': 'Thirty-two-role schema (light framing). Adds emphasis tiers, interaction colors, chrome variants, and extended syntax tokens.',
    'name':        'iridis-32-light',
    'relationshipGraph': RelationshipGraphs.create(iridis32Relationships),
    'roles': [
      ...iridis16Light.roles,
      { 'chromaRange': [0.00, 0.04], 'intent': 'text', 'lightnessRange': [0.04, 0.12], 'name': 'text-strong' },
      { 'chromaRange': [0.00, 0.05], 'intent': 'muted', 'lightnessRange': [0.32, 0.46], 'name': 'text-subtle' },
      { 'chromaRange': [0.14, 0.28], 'intent': 'link', 'lightnessRange': [0.36, 0.50], 'name': 'link' },
      { 'chromaRange': [0.16, 0.30], 'intent': 'link', 'lightnessRange': [0.28, 0.42], 'name': 'link-hover' },
      { 'chromaRange': [0.20, 0.34], 'intent': 'accent', 'lightnessRange': [0.40, 0.58], 'name': 'focus-ring' },
      { 'chromaRange': [0.00, 0.03], 'intent': 'background', 'lightnessRange': [0.85, 0.94], 'name': 'overlay' },
      { 'chromaRange': [0.00, 0.05], 'intent': 'muted', 'lightnessRange': [0.72, 0.84], 'name': 'border' },
      { 'chromaRange': [0.00, 0.06], 'intent': 'muted', 'lightnessRange': [0.60, 0.72], 'name': 'border-strong' },
      { 'chromaRange': [0.00, 0.03], 'intent': 'background', 'lightnessRange': [0.92, 0.97], 'name': 'code-bg' },
      { 'chromaRange': [0.16, 0.28], 'intent': 'accent', 'lightnessRange': [0.36, 0.50], 'name': 'info' },
      { 'chromaRange': [0.14, 0.26], 'intent': 'accent', 'lightnessRange': [0.36, 0.50], 'name': 'accent-alt' },
      { 'chromaRange': [0.00, 0.06], 'intent': 'muted', 'lightnessRange': [0.45, 0.58], 'name': 'syntax-comment' },
      { 'chromaRange': [0.14, 0.26], 'intent': 'accent', 'lightnessRange': [0.38, 0.52], 'name': 'syntax-tag' },
      { 'chromaRange': [0.12, 0.24], 'intent': 'accent', 'lightnessRange': [0.38, 0.52], 'name': 'syntax-attribute' },
      { 'chromaRange': [0.10, 0.22], 'intent': 'accent', 'lightnessRange': [0.40, 0.52], 'name': 'syntax-operator' },
      { 'chromaRange': [0.14, 0.26], 'intent': 'accent', 'lightnessRange': [0.38, 0.52], 'name': 'syntax-class' },
      { 'chromaRange': [0.00, 0.08], 'intent': 'muted', 'lightnessRange': [0.40, 0.55], 'name': 'syntax-punctuation' }
    ]
  });

  /* ─── Public registry ─────────────────────────────────────────────── */

  export const byName: Record<SchemaNameEntity.Type, SchemaPair> = {
    'iridis-12': { 'dark': iridis12Dark, 'light': iridis12Light },
    'iridis-16': { 'dark': iridis16Dark, 'light': iridis16Light },
    'iridis-32': { 'dark': iridis32Dark, 'light': iridis32Light },
    'iridis-4':  { 'dark': iridis4Dark,  'light': iridis4Light  },
    'iridis-8':  { 'dark': iridis8Dark,  'light': iridis8Light  }
  };
}

export const roleSchemaByName = RoleSchemas.byName;
