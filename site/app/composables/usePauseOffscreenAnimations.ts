import { onMounted, onUnmounted } from 'vue';

/** Sections + standalone animation hosts to pause when off-screen. Excludes the fixed ambient (`.lava-blob`/`.star-layer`), which must keep animating. */
const OFFSCREEN_HOSTS = '.toc-scroll-target, .pulse, .orbit-rig, .sonar-ring, .radar-sweep, .chroma-cycle';

/**
 * Freezes decorative CSS animations while their tab or host is not visible.
 * Browser work starts after the root component mounts, so SSR and prerender
 * only register lifecycle hooks and never access DOM APIs.
 */
class UsePauseOffscreenAnimationsOperation {
  static run(): void {
    let active = false;
    let animationDocument: Document | null = null;
    let animationWindow: Window | null = null;
    let initialFrameId: number | null = null;
    let intersectionObserver: IntersectionObserver | null = null;
    let mutationObserver: MutationObserver | null = null;
    let rescanFrameId: number | null = null;
    let root: HTMLElement | null = null;
    const observedHosts = new Set<Element>();

    function applyVisibility(): void {
      if (!active || animationDocument === null || root === null) {return;}
      root.classList.toggle('anims-paused', animationDocument.hidden);
    }

    function applyIntersectionEntries(entries: IntersectionObserverEntry[]): void {
      if (!active) {return;}
      for (const entry of entries) {
        entry.target.classList.toggle('anim-offscreen', !entry.isIntersecting);
      }
    }

    function observeHost(host: Element): void {
      if (intersectionObserver === null || observedHosts.has(host)) {return;}
      observedHosts.add(host);
      intersectionObserver.observe(host);
    }

    function scan(): void {
      if (!active || animationDocument === null) {return;}
      animationDocument.querySelectorAll(OFFSCREEN_HOSTS).forEach(observeHost);
    }

    function runScheduledScan(): void {
      rescanFrameId = null;
      scan();
    }

    function scheduleScan(): void {
      if (!active || animationWindow === null || rescanFrameId !== null) {return;}
      rescanFrameId = animationWindow.requestAnimationFrame(runScheduledScan);
    }

    function startOffscreenObservation(): void {
      initialFrameId = null;
      if (!active || animationDocument === null || mutationObserver === null) {return;}
      scan();
      mutationObserver.observe(animationDocument.body, { 'childList': true, 'subtree': true });
    }

    function start(): void {
      if (typeof window === 'undefined' || typeof document === 'undefined') {return;}

      active = true;
      animationDocument = document;
      animationWindow = window;
      root = animationDocument.documentElement;
      applyVisibility();
      animationDocument.addEventListener('visibilitychange', applyVisibility);

      if (
        typeof IntersectionObserver !== 'function'
        || typeof MutationObserver !== 'function'
        || typeof animationWindow.requestAnimationFrame !== 'function'
        || typeof animationWindow.cancelAnimationFrame !== 'function'
      ) {return;}

      intersectionObserver = new IntersectionObserver(applyIntersectionEntries, { 'rootMargin': '300px' });
      mutationObserver = new MutationObserver(scheduleScan);
      initialFrameId = animationWindow.requestAnimationFrame(startOffscreenObservation);
    }

    function stop(): void {
      active = false;

      if (animationWindow !== null && initialFrameId !== null) {
        animationWindow.cancelAnimationFrame(initialFrameId);
      }
      if (animationWindow !== null && rescanFrameId !== null) {
        animationWindow.cancelAnimationFrame(rescanFrameId);
      }
      initialFrameId = null;
      rescanFrameId = null;

      mutationObserver?.disconnect();
      intersectionObserver?.disconnect();
      mutationObserver = null;
      intersectionObserver = null;

      animationDocument?.removeEventListener('visibilitychange', applyVisibility);
      root?.classList.remove('anims-paused');
      for (const host of observedHosts) {
        host.classList.remove('anim-offscreen');
      }
      observedHosts.clear();

      animationDocument = null;
      animationWindow = null;
      root = null;
    }

    onMounted(start);
    onUnmounted(stop);
  }
}

export const usePauseOffscreenAnimations = UsePauseOffscreenAnimationsOperation.run;
