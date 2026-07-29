/**
 * iridis-specific design-system contracts: the dynamic class-expression
 * bases the site's Vue components compute at runtime, and the token
 * definitions the `known-design-tokens` rule checks CSS custom-property
 * usage against.
 *
 * Helpers (`normalizeDynamicClassExpression`, `extractDynamicExpressionBase`,
 * `isKnownConditionalDynamicClassExpression`, `isKnownDynamicClassExpression`)
 * are re-exported from `./index.mjs` rather than reimplemented here — there
 * is exactly one definition of each in this package.
 */
export {
  extractDynamicExpressionBase,
  isKnownConditionalDynamicClassExpression,
  isKnownDynamicClassExpression,
  normalizeDynamicClassExpression
} from './index.mjs'

/**
 * BEM-style modifier classes the site's chrome components compute from a
 * prop at render time (`ui-code-block--${tone}`, etc.) rather than writing
 * as literal class tokens. Registered here by expression base so
 * `known-dynamic-class-expr` can verify each resolves to one of the
 * component's declared variants instead of an arbitrary string.
 */
export const IRIDIS_DYNAMIC_CLASS_EXPRESSION_CONTRACTS = Object.freeze(
  new Map([
    ['tone', /^(?:default|source|error|live|warn|accent)$/u],
    ['align', /^(?:left|center)$/u],
    ['props.kind', /^(?:loading|error|empty)$/u],
    ['tab.tone', /^(?:default|live|warn|accent)$/u],
    // AmbientParticleLayer.vue's `layerClass` prop is a plain `string` (no
    // literal union to point at) but every caller — AmbientBackground.vue —
    // passes one of its own two `.star-layer` variants.
    ['layerClass', /^star-layer(?: star-(?:far|near)-[1-3])?$/u],
    // CylinderCarousel.vue's `{ active: isActive(i) }` — an unquoted object
    // key is always treated as a dynamic expression (see index.mjs's
    // reportExpression), never checked against classNames directly, even
    // though `.active` genuinely is one of its own declared classes.
    ['active', /^active$/u],
    // AppSelect.vue's `size?: 'xs' | 'sm' | 'md'` prop.
    ['size', /^(?:xs|sm|md)$/u]
  ])
)

/**
 * CSS custom properties the pipeline and Nuxt UI theme wiring define.
 * `--ui-*` shortcuts come from `site/app/theme/Tokens.ts`; `--iridis-*`,
 * `--font-*`, and `--text-*` come from `site/app/assets/css/main.css`.
 * Consumers wiring `known-design-tokens` should prefer collecting the live
 * set via `collectDesignSystemTokenNames(['app/assets/css/main.css'])` (and
 * the generated theme CSS) over this static snapshot — it exists as a
 * fallback/example set for the package's own tests.
 */
// Mirrors TokenConstants.ALIAS_SOURCE's keys and Tokens.SHADE_KEYS in
// site/app/theme/Tokens.ts — the `--ui-color-{alias}-{shade}` scale Nuxt UI
// itself defines per alias, which Tokens.mapFromEngine populates with
// engine-derived hexes for every shade of every alias. Generated here
// instead of imported because Tokens.ts is TypeScript and this package is
// plain ESM with no build step or TS loader.
const IRIDIS_COLOR_ALIASES = ['error', 'info', 'neutral', 'primary', 'secondary', 'success', 'warning']
const IRIDIS_COLOR_SHADES = [50, 100, 200, 300, 400, 500, 600, 700, 800, 900, 950]
const IRIDIS_COLOR_SCALE_TOKENS = IRIDIS_COLOR_ALIASES.flatMap(
  (alias) => IRIDIS_COLOR_SHADES.map((shade) => `--ui-color-${alias}-${shade}`)
)

export const IRIDIS_DESIGN_TOKENS = Object.freeze(new Set([
  '--font-display',
  '--font-mono',
  '--font-sans',
  '--iridis-ambient-speed',
  '--iridis-border-style',
  '--iridis-ease',
  '--iridis-glow-strength',
  '--iridis-radius-lg',
  '--iridis-radius-md',
  '--iridis-radius-sm',
  '--iridis-tune',
  // Reka UI's own primitive (the headless library Nuxt UI's Accordion/
  // Collapsible build on) — it sets this itself for its collapse/expand
  // animation; main.css's keyframes consume it but never define it. Not one
  // of ours, but a legitimate external integration point, not a violation.
  '--reka-collapsible-content-height',
  '--text-2xl',
  '--text-3xl',
  '--text-base',
  '--text-lg',
  '--text-sm',
  '--text-xl',
  '--text-xs',
  '--ui-bg',
  '--ui-bg-elevated',
  '--ui-bg-muted',
  '--ui-border',
  '--ui-border-accented',
  '--ui-border-muted',
  ...IRIDIS_COLOR_SCALE_TOKENS,
  '--ui-error',
  '--ui-error-contrast',
  '--ui-info',
  '--ui-info-contrast',
  '--ui-primary',
  '--ui-primary-contrast',
  '--ui-secondary',
  '--ui-success',
  '--ui-success-contrast',
  '--ui-text',
  '--ui-text-dimmed',
  '--ui-text-highlighted',
  '--ui-text-muted',
  '--ui-warning',
  '--ui-warning-contrast'
]))
