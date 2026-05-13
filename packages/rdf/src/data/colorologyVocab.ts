class ColorologyVocab {
  readonly 'base'        = 'https://studnicky.dev/colorology#';
  readonly 'Role'        = `${this.base}Role`;
  readonly 'hasColor'    = `${this.base}hasColor`;
  readonly 'hasRole'     = `${this.base}hasRole`;
  readonly 'oklch'       = `${this.base}oklch`;
  readonly 'rgb'         = `${this.base}rgb`;
  readonly 'hex'         = `${this.base}hex`;
  readonly 'wcag21Ratio' = `${this.base}wcag21Ratio`;
}

export const colorologyVocab = new ColorologyVocab();
