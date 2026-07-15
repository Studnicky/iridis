import type { CarouselCardType } from './types/carouselCard.ts';

/**
 * Stable keys for every output format the engine has a real emit plugin for —
 * one Stylesheets-stage carousel card per format (see OutputFormatCard.vue /
 * useMultiOutput.ts), in the same fixed order the pipeline always emits them.
 */
export const OUTPUT_FORMAT_CARDS: readonly CarouselCardType[] = [
  { 'key': 'output-cssVars', 'label': 'CSS variables' },
  { 'key': 'output-cssVarsScoped', 'label': 'CSS variables (scoped)' },
  { 'key': 'output-tailwind', 'label': 'Tailwind' },
  { 'key': 'output-shadcn', 'label': 'shadcn/ui' },
  { 'key': 'output-mui', 'label': 'MUI' },
  { 'key': 'output-chakra', 'label': 'Chakra UI' },
  { 'key': 'output-panda', 'label': 'Panda CSS' },
  { 'key': 'output-unocss', 'label': 'UnoCSS' },
  { 'key': 'output-capacitor', 'label': 'Capacitor' },
  { 'key': 'output-androidThemeXml', 'label': 'Android theme.xml' },
  { 'key': 'output-json', 'label': 'JSON' },
  { 'key': 'output-rdf', 'label': 'RDF (Turtle)' },
  { 'key': 'output-vscode', 'label': 'VS Code theme' }
];
