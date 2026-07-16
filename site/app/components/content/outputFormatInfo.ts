export const OUTPUT_FORMAT_INFO: Record<string, { filename: string; instruction: string; previewLines?: number }> = {
  'cssVars': {
    'filename': 'theme.css',
    'instruction': "Drop this in your project's global stylesheet — it defines the CSS custom properties every component reads from."
  },
  'cssVarsScoped': {
    'filename': 'theme.scoped.css',
    'instruction': "Drop this in your project's global stylesheet — the same variables, scoped under a selector instead of :root."
  },
  'tailwind': {
    'filename': 'tailwind.config.ts',
    'instruction': "Drop this in your project root as tailwind.config.ts — it extends Tailwind's theme with the resolved palette."
  },
  'shadcn': {
    'filename': 'globals.css',
    'instruction': "Drop this in your project's globals.css — shadcn/ui's components read these CSS variables directly."
  },
  'mui': {
    'filename': 'theme.ts',
    'instruction': "Drop this in your project as theme.ts and pass it to MUI's ThemeProvider."
  },
  'chakra': {
    'filename': 'theme.ts',
    'instruction': "Drop this in your project as theme.ts and pass it to Chakra's ChakraProvider."
  },
  'panda': {
    'filename': 'panda.config.ts',
    'instruction': 'Drop this in your project root as panda.config.ts — Panda CSS reads the theme tokens from here.'
  },
  'unocss': {
    'filename': 'uno.config.ts',
    'instruction': 'Drop this in your project root as uno.config.ts — UnoCSS reads the theme tokens from here.'
  },
  'capacitor': {
    'filename': 'capacitor.theme.ts',
    'instruction': "Drop this in your project as capacitor.theme.ts — Capacitor's status bar and splash screen read these values."
  },
  'androidThemeXml': {
    'filename': 'themes.xml',
    'instruction': "Drop this in your Android project's res/values/themes.xml — the native shell reads these values.",
    'previewLines': 30
  },
  'json': {
    'filename': 'theme.json',
    'instruction': 'Drop this in your project as theme.json — every other format on this carousel is derived from this same resolved data.',
    'previewLines': 30
  },
  'rdf': {
    'filename': 'theme.ttl',
    'instruction': 'Drop this in your project as theme.ttl — the resolved roles expressed as RDF/OWL triples for semantic tooling.',
    'previewLines': 30
  },
  'vscode': {
    'filename': 'theme-color-theme.json',
    'instruction': "Drop this in your VS Code extension's themes/ folder and reference it from package.json's contributes.themes."
  }
};
