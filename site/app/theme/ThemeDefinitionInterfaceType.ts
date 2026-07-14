/**
 * One visual preset's JS-side port: the ambient background's behavioral
 * config, plus its registry identity. Themes NEVER change layout/structure —
 * only surface-level knobs. Fonts/corner-radius/border-style are NOT part of
 * this type — those are pure CSS and live in this theme's own adapter
 * stylesheet (`site/app/theme/presets/<key>.css`), cascading in via
 * `[data-iridis-theme="<key>"]`, not written from JS. A new theme is one
 * `.ts` adapter (this shape) plus one `.css` adapter, registered in
 * `site/app/theme/presets/index.ts` / `presets.css` — never a branch added to
 * shared logic.
 */
export type ThemeDefinitionInterfaceType = {
  /** Ambient background parameters — read by AmbientBackground.vue instead of hardcoded literals. */
  'ambient': {
    /** Number of lava blobs generated. */
    'blobCount': number;
    /** Whether the SVG goo metaball filter applies to the lava-blob layer. */
    'gooEnabled': boolean;
    /** Whether the perspective grid floor renders. */
    'gridEnabled': boolean;
    /** Per-layer particle counts — replaces the previously hardcoded 200/200/200/100/100 across the 5 starfield layers. Length must be 5 (3 far layers, 2 near layers). */
    'particleCounts': number[];
    /** Star/particle shape — dispatched to its own renderer module (see `site/app/theme/particles/`), never branched on inline. */
    'particleShape': 'bubble' | 'dot' | 'heart' | 'square' | 'star' | 'streak';
    /** Multiplies every ambient animation-duration (grid pan, twinkle, star-rotate, lava rise/sway) — 1 reproduces today's exact speeds; >1 slows down, <1 speeds up. */
    'speedMultiplier': number;
  };
  /** Registry key — stable, lowercase, used for persistence and DOM data attrs (and this theme's CSS adapter's `[data-iridis-theme]` selector). */
  'key': string;
  /** Human-readable label shown in the theme-switcher <USelect>. */
  'label': string;
};
