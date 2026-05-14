class ColorologyVocab {
  readonly 'base'        = 'https://studnicky.dev/colorology#';
  readonly 'Role'        = `${this.base}Role`;
  readonly 'hasColor'    = `${this.base}hasColor`;
  readonly 'hasRole'     = `${this.base}hasRole`;
  readonly 'oklch'       = `${this.base}oklch`;
  readonly 'rgb'         = `${this.base}rgb`;
  readonly 'hex'         = `${this.base}hex`;
  readonly 'wcag21Ratio' = `${this.base}wcag21Ratio`;

  /**
   * Display-P3 channel predicates. Emitted by {@link import('../tasks/ReasonAnnotate.ts').ReasonAnnotate}
   * for any role record whose `displayP3` slot is populated (out-of-sRGB
   * OKLCH input or `intake:p3` origin). Channels are xsd:decimal literals
   * in `[0, 1]` matching CSS Color 4 `color(display-p3 r g b)` semantics.
   *
   * Absent on records derived from sRGB-only inputs; SPARQL consumers
   * can `OPTIONAL { ?c colorology:displayP3R ?r }` to surface the
   * wide-gamut channels when present and fall back to `colorology:hex`
   * otherwise.
   */
  readonly 'displayP3R'  = `${this.base}displayP3R`;
  readonly 'displayP3G'  = `${this.base}displayP3G`;
  readonly 'displayP3B'  = `${this.base}displayP3B`;
}

export const colorologyVocab = new ColorologyVocab();
