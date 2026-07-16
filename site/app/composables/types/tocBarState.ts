/**
 * Display state for TableOfContentsBar's sticky nav — 'top' before scroll
 * passes `#toc-hero-sentinel` (non-sticky, full document flow), 'expanded'
 * once sticky, and 'compact' while the user is actively scrolling down to
 * read (collapsed to a single row). `variant` (not `mode`) is the field name
 * because `StateMachine<TState, ...>` requires `TState extends { readonly
 * 'variant': string }` — the same discriminant key IridisUiStateType uses.
 */
export type TocBarStateType = { 'variant': 'compact' | 'expanded' | 'top' };
