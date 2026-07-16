/**
 * Events accepted by TocBarMachine: hero-sentinel visibility (PAST_HERO /
 * RETURN_TOP, from the IntersectionObserver in TableOfContentsBar.vue) and
 * scroll-direction intent (SCROLL_UP / SCROLL_DOWN, from the rAF-throttled
 * scroll listener).
 */
export type TocBarEventType =
  | { 'type': 'PAST_HERO' }
  | { 'type': 'RETURN_TOP' }
  | { 'type': 'SCROLL_DOWN' }
  | { 'type': 'SCROLL_UP' };
