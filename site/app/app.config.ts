export default defineAppConfig({
  'ui': {
    'button': {
      'variants': {
        'variant': {
          'solid': 'text-[var(--ui-primary-contrast,white)] dark:text-[var(--ui-primary-contrast,gray-900)]'
        }
      }
    },
    // Engine-lit glass treatment for every card on the site.
    'card': {
      'slots': {
        'body': 'p-4 sm:p-6',
        'footer': 'p-4 sm:px-6',
        'header': 'p-4 sm:px-6',
        'root': 'iridis-card rounded-2xl'
      }
    }
  }
});
