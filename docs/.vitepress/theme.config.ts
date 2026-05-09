import type { DefaultTheme } from 'vitepress';

export const themeConfig = {
  'appearance': true as const,
  'siteTitle':  'iridis',
  // Outline moves into the left sidebar as an accordion (rendered by
  // SidebarToc.vue via the sidebar-nav-after slot). Disable the default
  // right-rail outline so the right column is free for the example panel.
  'outline':    false as const,
  'search':     { 'provider': 'local' as const },
  'footer':     { 'copyright': 'MIT License, © Andrew Studnicky', 'message': 'Released under the MIT License.' },
  'editLink':   {
    'pattern': 'https://github.com/Studnicky/iridis/edit/develop/:path',
    'text':    'Edit this page on GitHub',
  },
  'docFooter':  { 'next': 'Next', 'prev': 'Previous' },
} satisfies Partial<DefaultTheme.Config>;
