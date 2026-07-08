export default defineAppConfig({
  ui: {
    // Engine-lit glass treatment for every card on the site.
    card: {
      slots: {
        root: 'iridis-card rounded-2xl',
        header: 'p-4 sm:px-6',
        body: 'p-4 sm:p-6',
        footer: 'p-4 sm:px-6',
      },
    },
  },
});
