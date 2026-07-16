/**
 * Freezes decorative CSS animations that aren't worth paying for right now:
 *
 *  1. When the tab is BACKGROUNDED — `html.anims-paused` (Page Visibility API)
 *     halts every animation on the page until it's visible again.
 *  2. When a section is OFF-SCREEN — one IntersectionObserver watches each
 *     stage/doc section (`.toc-scroll-target`) plus the standalone icon-loader
 *     animations, and adds `.anim-offscreen` to any that scrolls out of view
 *     (with a 300px rootMargin so it resumes just before it re-enters).
 *     `.anim-offscreen` (main.css) sets `animation-play-state: paused` on the
 *     element and its descendants, so a tall page's below-the-fold carousels,
 *     showcases and loaders stop consuming CPU — with zero per-frame JS.
 *
 * The `position: fixed` ambient (starfield + lava blobs) is always
 * intersecting, so it is never paused — the living background keeps moving.
 * Sections stay in normal flow (the 3D transform lives inside them on
 * `.cyl-scene`), so IntersectionObserver reports them reliably even though it
 * can't observe elements *inside* the carousel's transformed subtree.
 */

/** Sections + standalone animation hosts to pause when off-screen. Excludes the fixed ambient (`.lava-blob`/`.star-layer`), which must keep animating. */
const OFFSCREEN_HOSTS = '.toc-scroll-target, .pulse, .orbit-rig, .sonar-ring, .radar-sweep, .chroma-cycle';

export default defineNuxtPlugin(() => {
  if (typeof document === 'undefined') { return; }

  const root = document.documentElement;

  // 1. Pause everything while the tab is hidden.
  const applyVisibility = (): void => { root.classList.toggle('anims-paused', document.hidden); };
  applyVisibility();
  document.addEventListener('visibilitychange', applyVisibility);

  if (typeof IntersectionObserver === 'undefined' || typeof MutationObserver === 'undefined') { return; }

  // 2. Pause off-screen sections.
  const observed = new WeakSet<Element>();
  const io = new IntersectionObserver((entries) => {
    for (const entry of entries) {
      (entry.target as HTMLElement).classList.toggle('anim-offscreen', !entry.isIntersecting);
    }
  }, { 'rootMargin': '300px' });

  const scan = (): void => {
    document.querySelectorAll(OFFSCREEN_HOSTS).forEach((el) => {
      if (!observed.has(el)) { observed.add(el); io.observe(el); }
    });
  };

  // Re-scan when the DOM adds sections/loaders (docs load async, the carousel
  // mounts faces) — debounced to one pass per animation frame during a churn.
  let scheduled = false;
  const mo = new MutationObserver(() => {
    if (scheduled) { return; }
    scheduled = true;
    requestAnimationFrame(() => { scheduled = false; scan(); });
  });

  const start = (): void => {
    scan();
    mo.observe(document.body, { 'childList': true, 'subtree': true });
  };
  // Wait for the app's DOM to exist before the first scan.
  requestAnimationFrame(start);
});
