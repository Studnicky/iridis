import type { DefaultTheme } from 'vitepress';

export const themeConfig = {
  'appearance': true as const,
  'logo':       '/logo.png',
  'outline':    { 'label': 'On this page', 'level': [2, 3] as [number, number] },
  'search':     { 'provider': 'local' as const },
  'footer':     { 'copyright': 'MIT License, © Andrew Studnicky', 'message': 'Released under the MIT License.' },
  'editLink':   {
    'pattern': 'https://github.com/Studnicky/iridis/edit/main/:path',
    'text':    'Edit this page on GitHub',
  },
  'docFooter':  { 'next': 'Next', 'prev': 'Previous' },
} satisfies Partial<DefaultTheme.Config>;
