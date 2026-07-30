/**
 * MermaidExplorer: framework-agnostic vanilla-TS browser class that enhances
 * every rendered Mermaid `.mermaid` SVG on a page with an interactive D-pad,
 * wheel-zoom, drag-pan, and a fullscreen expand modal.
 *
 * ## D-pad layout (3×3 grid — identical to GraphDpad.vue)
 *
 *   [zoom-in ] [pan-up  ] [zoom-out]
 *   [pan-left] [centre  ] [pan-right]
 *   [expand  ] [pan-down] [fit     ]
 *
 * DOM access stays inside guarded static operations, so importing this module
 * during server rendering does not touch browser globals.
 *
 * @example
 * ```ts
 * import { MermaidExplorer } from '@studnicky/dagonizer/viz';
 * MermaidExplorer.install({ selector: '.vp-doc div.mermaid' });
 * ```
 */

import type { DpadMachine } from '../viz/DpadMachine.ts';

import { Scheduler } from '../runtime/Scheduler.js';
import { trustedMarkupRenderer } from '../trustedMarkupRenderer.ts';
import { CameraControls } from '../viz/CameraControls.ts';
import { ModalController } from '../viz/ModalController.ts';
import { ViewportStatus } from '../viz/ViewportStatus.ts';

/** Theme overrides written to the canonical variables consumed by Dpad.css. */
class MermaidExplorerThemeOptions {
  /** Overrides the D-pad accent and hover colour (`--ui-primary`). */
  public readonly accent?: string;
  /** Overrides the D-pad border colour (`--ui-border`). */
  public readonly stroke?: string;
  /** Overrides the D-pad control surface (`--ui-bg-elevated`). */
  public readonly surface?: string;
}

/**
 * Options for `MermaidExplorer.install` and `MermaidExplorer.enhance`.
 *
 * All fields are optional; the explorer supplies canonical defaults.
 */
class MermaidExplorerOptionsInput {
  /**
   * Whether to render the D-pad navigation control.
   * Default: `true`.
   */
  public readonly controls?: boolean;
  /**
   * Whether to enable the fullscreen expand modal.
   * Default: `true`.
   */
  public readonly expand?: boolean;
  /**
   * How to fit the diagram on mount.
   * `'contain'` — scale to fit while never upscaling past 1×.
   * `'none'` — use natural scale.
   * Default: `'contain'`.
   */
  public readonly fit?: 'contain' | 'none';
  /**
   * CSS selector that identifies Mermaid diagram wrapper elements.
   * Default: `'.vp-doc div.mermaid, .vp-doc .dagonizer-mermaid'`.
   */
  public readonly selector?: string;
  /** Override the control chrome colour palette. */
  public readonly theme?: MermaidExplorerThemeOptions;
}

class MermaidExplorerTheme {
  public readonly accent: string | undefined;
  public readonly stroke: string | undefined;
  public readonly surface: string | undefined;

  public constructor(
    accent: string | undefined,
    stroke: string | undefined,
    surface: string | undefined
  ) {
    this.accent = accent;
    this.stroke = stroke;
    this.surface = surface;
  }
}

class MermaidExplorerOptions {
  public readonly controls: boolean;
  public readonly expand: boolean;
  public readonly fit: 'contain' | 'none';
  public readonly selector: string;
  public readonly theme: MermaidExplorerTheme;

  public constructor(
    controls: boolean,
    expand: boolean,
    fit: 'contain' | 'none',
    selector: string,
    theme: MermaidExplorerTheme
  ) {
    this.controls = controls;
    this.expand = expand;
    this.fit = fit;
    this.selector = selector;
    this.theme = theme;
  }
}

class NaturalSize {
  public readonly h: number;
  public readonly w: number;

  public constructor(h: number, w: number) {
    this.h = h;
    this.w = w;
  }
}

class SvgBounds {
  public readonly h: number;
  public readonly w: number;
  public readonly x: number;
  public readonly y: number;

  public constructor(h: number, w: number, x: number, y: number) {
    this.h = h;
    this.w = w;
    this.x = x;
    this.y = y;
  }
}

/**
 * Camera state managed per enhanced diagram instance.
 *
 * The SVG's `transform-origin` is set to `0 0` at enhance time; all transforms
 * are `translate(tx, ty) scale(scale)` applied from the top-left corner.
 * Zoom pivots are computed by adjusting `tx`/`ty` before updating `scale`.
 */
class CameraState {
  /** Current scale factor (1 = natural / un-zoomed size). */
  public scale: number;
  /** CSS translate-x in screen pixels. */
  public tx: number;
  /** CSS translate-y in screen pixels. */
  public ty: number;

  public constructor(scale: number, tx: number, ty: number) {
    this.scale = scale;
    this.tx = tx;
    this.ty = ty;
  }
}

class MermaidModalKeyHandler implements EventListenerObject {
  #controller: InstanceType<typeof ModalController> | null;

  public constructor() {
    this.#controller = null;
  }

  public connect(controller: InstanceType<typeof ModalController>): void {
    this.#controller = controller;
  }

  public handleEvent(event: Event): void {
    if (!(event instanceof KeyboardEvent) || this.#controller === null) {return;}
    this.#controller.onKeyDown(event.key);
  }
}

class MermaidModalHooks {
  readonly #keyHandler: MermaidModalKeyHandler;
  readonly #overlay: HTMLDivElement;

  public constructor(overlay: HTMLDivElement, keyHandler: MermaidModalKeyHandler) {
    this.#keyHandler = keyHandler;
    this.#overlay = overlay;
  }

  public readonly onClose = (): void => {
    document.body.style.overflow = '';
    document.removeEventListener('keydown', this.#keyHandler);
    this.#overlay.remove();
  };

  public readonly onOpen = (): void => {
    document.body.appendChild(this.#overlay);
    document.body.style.overflow = 'hidden';
    document.addEventListener('keydown', this.#keyHandler);
  };
}

// ---------------------------------------------------------------------------
// MermaidExplorer
// ---------------------------------------------------------------------------

/**
 * Static class that turns every rendered Mermaid SVG into an interactive
 * diagram with D-pad controls, wheel-zoom, drag-pan, and fullscreen modal.
 *
 * All public surface is static. No instances are created — `MermaidExplorer`
 * is a namespace for the two entry points: `install` (page-wide wiring) and
 * `enhance` (single diagram). Both are safe to call repeatedly; already-
 * enhanced frames are skipped by the `dataset.dagExplorer` idempotency guard.
 *
 * Node-safe: module-level code never accesses DOM globals. Each static method
 * that needs DOM access begins with a `typeof document === 'undefined'` guard
 * and returns immediately in non-browser contexts.
 */
export const MermaidExplorer = class MermaidExplorer {
  static readonly #defaultSelector = '.vp-doc div.mermaid, .vp-doc .dagonizer-mermaid';
  static readonly #enhancedKey = 'dagExplorer';
  static readonly #enhancedRenderKey = 'dagExplorerRender';
  static readonly #fitMargin = 0.92;
  static readonly #maximumPollTicks = 24;
  static readonly #maximumZoom = 8;
  static readonly #minimumZoom = 0.05;
  static readonly #panStep = 80;
  static readonly #pollIntervalMilliseconds = 250;
  static readonly #svgBoundsPadding = 24;
  static readonly #zoomStep = 1.25;
  static readonly #defaults = new MermaidExplorerOptions(
    true,
    true,
    'contain',
    MermaidExplorer.#defaultSelector,
    new MermaidExplorerTheme(undefined, undefined, undefined)
  );
  static readonly #cameraControlsClass = class MermaidCameraControls {
    readonly #camera: CameraState;
    readonly #controller: InstanceType<typeof ModalController> | null;
    readonly #frame: HTMLElement;
    readonly #options: MermaidExplorerOptions;
    readonly #svg: SVGSVGElement;

    public constructor(
      frame: HTMLElement,
      svg: SVGSVGElement,
      camera: CameraState,
      options: MermaidExplorerOptions,
      controller: InstanceType<typeof ModalController> | null
    ) {
      this.#camera = camera;
      this.#controller = controller;
      this.#frame = frame;
      this.#options = options;
      this.#svg = svg;
    }

    public can(action: Parameters<InstanceType<typeof DpadMachine>['press']>[0]): boolean {
      if (action === 'expand') {return this.#options.expand;}
      if (action === 'close') {return this.#controller !== null;}
      return true;
    }

    public centre(): void {
      const stageRect = this.#frame.getBoundingClientRect();
      const svgRect = this.#svg.getBoundingClientRect();
      this.#camera.tx += (stageRect.left + stageRect.width / 2)
        - (svgRect.left + svgRect.width / 2);
      this.#camera.ty += (stageRect.top + stageRect.height / 2)
        - (svgRect.top + svgRect.height / 2);
      MermaidExplorer.#paint(this.#svg, this.#camera);
    }

    public close(): void {
      if (this.#controller === null) {return;}
      this.#controller.close('programmatic');
    }

    public expand(): void {
      if (!this.#options.expand) {return;}
      MermaidExplorer.#modal(this.#svg, this.#options);
    }

    public fit(): void {
      const natural = MermaidExplorer.#naturalSize(this.#svg);
      MermaidExplorer.#fitContain(this.#frame, this.#svg, this.#camera, natural);
    }

    public pan(direction: 'up' | 'down' | 'left' | 'right'): void {
      switch (direction) {
        case 'down':
          this.#camera.ty -= MermaidExplorer.#panStep;
          break;
        case 'left':
          this.#camera.tx += MermaidExplorer.#panStep;
          break;
        case 'right':
          this.#camera.tx -= MermaidExplorer.#panStep;
          break;
        case 'up':
          this.#camera.ty += MermaidExplorer.#panStep;
          break;
      }
      MermaidExplorer.#paint(this.#svg, this.#camera);
    }

    public zoomIn(): void {
      this.#zoom(MermaidExplorer.#zoomStep);
    }

    public zoomOut(): void {
      this.#zoom(1 / MermaidExplorer.#zoomStep);
    }

    #zoom(factor: number): void {
      const stageRect = this.#frame.getBoundingClientRect();
      MermaidExplorer.#zoomAbout(
        this.#svg,
        this.#camera,
        factor,
        stageRect.width / 2,
        stageRect.height / 2
      );
    }
  };

  private constructor() { /* static class — no instances */ }

  // ── Public API ─────────────────────────────────────────────────────────────

  /**
   * Wire `MermaidExplorer.enhance` on all matching diagram frames already in
   * the DOM, then observe future DOM mutations and run a short bounded poll
   * (~24 ticks × 250 ms) to catch SVGs that Mermaid injects asynchronously.
   *
   * Safe to call multiple times: repeated calls add independent observers but
   * already-enhanced frames are skipped by the `dataset.dagExplorer` guard.
   *
   * No-op when called in a Node.js context (`typeof document === 'undefined'`).
   *
   * @param options Optional configuration; all fields have sensible defaults.
   */
  public static install(options: MermaidExplorerOptionsInput = new MermaidExplorerOptionsInput()): void {
    if (typeof document === 'undefined') {return;}

    const resolved = MermaidExplorer.#resolvedOptions(options);
    MermaidExplorer.#enhanceAll(resolved);

    const observer = new MutationObserver(() => {
      MermaidExplorer.#enhanceAll(resolved);
    });
    observer.observe(document.body, { 'childList': true, 'subtree': true });

    // Bounded poll: belt-and-suspenders for Mermaid's flush-callback insertion.
    void (async () => {
      for (let ticks = 0; ticks < MermaidExplorer.#maximumPollTicks; ticks += 1) {
        await Scheduler.current().after(MermaidExplorer.#pollIntervalMilliseconds);
        MermaidExplorer.#enhanceAll(resolved);
      }
    })().catch(() => { /* scheduler reset cancels the bounded poll */ });
  }

  /**
   * Enhance a single diagram frame: locate its `<svg>`, strip intrinsic
   * dimensions, wire D-pad controls and pointer/wheel events.
   *
   * Idempotent: if the frame already has `dataset.dagExplorer === '1'`
   * this method refreshes bounds when its render token has not changed;
   * otherwise it rebuilds interactive wiring for new frame markup.
   *
   * No-op when called in a Node.js context (`typeof document === 'undefined'`).
   *
   * @param frame The wrapper element that contains the Mermaid `<svg>`.
   * @param options Optional configuration; all fields have sensible defaults.
   */
  public static enhance(
    frame: HTMLElement,
    options: MermaidExplorerOptionsInput = new MermaidExplorerOptionsInput()
  ): void {
    if (typeof document === 'undefined') {return;}

    const svg = frame.querySelector<SVGSVGElement>('svg');
    if (svg === null) {return;}

    // Always normalize the current SVG before the idempotency guard. HMR and
    // framework renderers can replace the SVG inside an already-enhanced frame.
    MermaidExplorer.#sizeToIntrinsic(svg);

    const renderId = frame.dataset[MermaidExplorer.#enhancedRenderKey];
    if (frame.dataset[MermaidExplorer.#enhancedKey] === '1'
      && frame.dataset[`${MermaidExplorer.#enhancedRenderKey}Applied`] === renderId
      && renderId !== undefined) {
      MermaidExplorer.#refreshBounds(svg);
      return;
    }

    frame.dataset[MermaidExplorer.#enhancedKey] = '1';
    frame.dataset[`${MermaidExplorer.#enhancedRenderKey}Applied`] = renderId ?? '';
    frame.classList.add('dag-mermaid-frame');

    const resolved = MermaidExplorer.#resolvedOptions(options);

    // Pin the SVG to its intrinsic pixel size so the CSS transform controls
    // size deterministically (a width-less viewBox SVG would auto-fill the
    // container and fight the camera).
    const natural = MermaidExplorer.#sizeToIntrinsic(svg);

    // Initialise camera.
    const camera = new CameraState(1, 0, 0);
    MermaidExplorer.#paint(svg, camera);

    // Fit on first paint.
    if (resolved.fit === 'contain') {
      requestAnimationFrame(() => {
        MermaidExplorer.#fitContain(frame, svg, camera, natural);
      });
    }

    MermaidExplorer.#refreshBounds(svg, () => {
      if (resolved.fit === 'contain') {
        const refreshed = MermaidExplorer.#naturalSize(svg);
        MermaidExplorer.#fitContain(frame, svg, camera, refreshed);
      }
    });

    // Pointer/wheel interaction.
    MermaidExplorer.#pointerPan(svg, camera);
    MermaidExplorer.#wheelZoom(frame, svg, camera);
    MermaidExplorer.#bindSelection(frame, svg);

    // D-pad control overlay.
    if (resolved.controls) {
      const dpad = MermaidExplorer.#dpad(frame, svg, camera, resolved);
      frame.appendChild(dpad);
    }
  }

  // ── Private: option resolution ─────────────────────────────────────────────

  static #resolvedOptions(
    options: MermaidExplorerOptionsInput
  ): MermaidExplorerOptions {
    const theme = new MermaidExplorerTheme(
      options.theme?.accent,
      options.theme?.stroke,
      options.theme?.surface
    );
    return new MermaidExplorerOptions(
      options.controls ?? MermaidExplorer.#defaults.controls,
      options.expand ?? MermaidExplorer.#defaults.expand,
      options.fit ?? MermaidExplorer.#defaults.fit,
      options.selector ?? MermaidExplorer.#defaults.selector,
      theme
    );
  }

  // ── Private: bulk enhance ──────────────────────────────────────────────────

  static #enhanceAll(options: MermaidExplorerOptions): void {
    const frames = document.querySelectorAll<HTMLElement>(options.selector);
    const frameCount = frames.length;
    for (let i = 0; i < frameCount; i++) {
      const frame = frames[i];
      if (frame !== undefined) {MermaidExplorer.enhance(frame, options);}
    }
  }

  // ── Private: camera math ───────────────────────────────────────────────────

  /**
   * Write the camera state to the SVG element's CSS transform.
   *
   * Transform order: `translate` then `scale`, pivoted from `0 0` (set at
   * enhance time via `transformOrigin`). Zoom-about-pivot is achieved by
   * adjusting `tx`/`ty` before calling this method (see `#zoomAbout`).
   */
  static #paint(svg: SVGSVGElement, camera: CameraState): void {
    svg.style.transform = `translate(${camera.tx}px,${camera.ty}px) scale(${camera.scale})`;
  }

  /**
   * Zoom by `factor` about a pivot point in the stage's local coordinate space.
   *
   * `pivotX`/`pivotY` are in stage-relative pixels (cursor offset from the
   * stage's bounding rect). The translate is adjusted so the point under the
   * cursor stays anchored after the scale change — identical to the
   * `AnimatedDagGraph` zoom implementation which uses cytoscape's
   * `renderedPosition` pivot and to the wheel handler in `MermaidEnhancer`.
   */
  static #zoomAbout(
    svg:    SVGSVGElement,
    camera: CameraState,
    factor: number,
    pivotX: number,
    pivotY: number
  ): void {
    const next = Math.min(
      MermaidExplorer.#maximumZoom,
      Math.max(MermaidExplorer.#minimumZoom, camera.scale * factor)
    );
    const ratio = next / camera.scale;
    camera.tx    = pivotX - (pivotX - camera.tx) * ratio;
    camera.ty    = pivotY - (pivotY - camera.ty) * ratio;
    camera.scale = next;
    MermaidExplorer.#paint(svg, camera);
  }

  /**
   * Scale to fit the diagram's natural bounds inside the stage, never
   * upscaling past 1× (contain, not fill).
   *
   * Natural bounds are read from `getBBox()` (most accurate), then
   * the SVG `viewBox` attribute, then to a 1024×768 safe default.
   */
  static #fitContain(
    stage:   HTMLElement,
    svg:     SVGSVGElement,
    camera:  CameraState,
    natural: NaturalSize | null = null
  ): void {
    const stageRect = stage.getBoundingClientRect();
    const frameWidth = Number.isFinite(stageRect.width) && stageRect.width > 0
      ? stageRect.width
      : 400;
    const frameHeight = Number.isFinite(stageRect.height) && stageRect.height > 0
      ? stageRect.height
      : 300;

    // Prefer a caller-supplied natural size (measured from the laid-out source
    // SVG). A freshly cloned SVG can fail getBBox at first paint, so
    // self-measuring is unreliable for the fullscreen modal.
    let nw = natural !== null && natural.w > 0 ? natural.w : 0;
    let nh = natural !== null && natural.h > 0 ? natural.h : 0;

    if (nw <= 0 || nh <= 0) {
      const measured = MermaidExplorer.#naturalSize(svg);
      nw = measured.w;
      nh = measured.h;
    }

    const scale = Math.min(
      (frameWidth * MermaidExplorer.#fitMargin) / nw,
      (frameHeight * MermaidExplorer.#fitMargin) / nh,
      1
    );
    camera.scale = scale;
    camera.tx = (frameWidth - nw * scale) / 2;
    camera.ty = (frameHeight - nh * scale) / 2;
    MermaidExplorer.#paint(svg, camera);
  }

  /**
   * Re-run bounds normalization after browser layout/style has settled.
   *
   * Mermaid computes node geometry before host-page CSS is necessarily applied.
   * A later font-size, font-family, letter-spacing, or label style can push text
   * outside the original viewBox. Two animation frames catch that settled
   * geometry and expand the SVG coordinate frame before the viewport clips it.
   */
  static #refreshBounds(svg: SVGSVGElement, after?: () => void): void {
    requestAnimationFrame(() => {
      MermaidExplorer.#sizeToIntrinsic(svg);
      if (after !== undefined) {after();}
      requestAnimationFrame(() => {
        MermaidExplorer.#sizeToIntrinsic(svg);
        if (after !== undefined) {after();}
      });
    });
  }

  /**
   * Natural size of an SVG. Prefer the viewBox (the svg's own coordinate frame)
   * so sizing the element to it is distortion-free; then getBBox, then
   * a default.
   */
  static #naturalSize(svg: SVGSVGElement): NaturalSize {
    const vb = svg.getAttribute('viewBox');
    if (vb !== null) {
      const parts = MermaidExplorer.#viewBoxParts(vb);
      const w = parseFloat(parts[2] ?? '0');
      const h = parseFloat(parts[3] ?? '0');
      if (w > 0 && h > 0) {return new NaturalSize(h, w);}
    }
    try {
      const bbox = svg.getBBox();
      if (bbox.width > 0 && bbox.height > 0) {
        return new NaturalSize(bbox.height, bbox.width);
      }
    } catch { /* getBBox throws on detached/invisible SVG */ }
    return new NaturalSize(768, 1024);
  }

  static #viewBoxParts(viewBox: string): readonly string[] {
    const parts: string[] = [];
    let currentPart = '';
    for (const character of viewBox.trim()) {
      const isSeparator = character === ','
        || character === ' '
        || character === '\n'
        || character === '\r'
        || character === '\t';
      if (isSeparator) {
        if (currentPart.length > 0) {
          parts.push(currentPart);
          currentPart = '';
        }
      } else {
        currentPart += character;
      }
    }
    if (currentPart.length > 0) {parts.push(currentPart);}
    return parts;
  }

  /**
   * Expand the SVG viewBox to the measured rendered content bounds.
   *
   * This is the clipping hardening layer: labels may become wider after host
   * CSS is applied, so the viewBox must be derived from actual rendered bounds
   * rather than Mermaid's initial layout assumptions.
   */
  static #normalizeBounds(svg: SVGSVGElement): void {
    MermaidExplorer.#showOverflow(svg);
    const content = MermaidExplorer.#contentBounds(svg);
    if (content === null) {return;}

    const x = content.x - MermaidExplorer.#svgBoundsPadding;
    const y = content.y - MermaidExplorer.#svgBoundsPadding;
    const w = content.w + MermaidExplorer.#svgBoundsPadding * 2;
    const h = content.h + MermaidExplorer.#svgBoundsPadding * 2;
    if (w <= 0 || h <= 0) {return;}
    svg.setAttribute('viewBox', `${String(x)} ${String(y)} ${String(w)} ${String(h)}`);
  }

  /** Force the SVG and its rendered children to expose their measured bounds. */
  static #showOverflow(svg: SVGSVGElement): void {
    svg.style.overflow = 'visible';
    const descendants = svg.querySelectorAll<SVGElement>('*');
    const descendantCount = descendants.length;
    for (let i = 0; i < descendantCount; i++) {
      const child = descendants[i];
      if (child !== undefined) {child.style.overflow = 'visible';}
    }
  }

  /** Read rendered SVG content bounds, returning null while layout is unavailable. */
  static #contentBounds(svg: SVGSVGElement): SvgBounds | null {
    try {
      const bbox = svg.getBBox();
      if (bbox.width > 0 && bbox.height > 0) {
        return new SvgBounds(bbox.height, bbox.width, bbox.x, bbox.y);
      }
    } catch { /* getBBox throws on detached/invisible SVG */ }
    return null;
  }

  /**
   * Pin the SVG to a fixed pixel size equal to its intrinsic (viewBox) size and
   * neutralise any `max-width: 100%` from theme CSS. A viewBox SVG with no width
   * auto-fills its container, which fights the transform-based camera; pinning a
   * known size lets the CSS transform scale and position it deterministically.
   */
  static #sizeToIntrinsic(svg: SVGSVGElement): NaturalSize {
    MermaidExplorer.#normalizeBounds(svg);
    const n = MermaidExplorer.#naturalSize(svg);
    svg.removeAttribute('width');
    svg.removeAttribute('height');
    svg.style.width           = `${String(n.w)}px`;
    svg.style.height          = `${String(n.h)}px`;
    svg.style.maxWidth        = 'none';
    svg.style.transformOrigin = '0 0';
    svg.style.display         = 'block';
    return n;
  }

  // ── Private: interaction wiring ────────────────────────────────────────────

  /**
   * Wire drag-pan via `setPointerCapture` on the SVG element.
   *
   * `setPointerCapture` routes all pointer events to the capture target even
   * when the pointer leaves the element, preventing ghost drags after fast
   * gestures — matching the modal's pointer handling in `MermaidEnhancer`.
   */
  static #pointerPan(
    svg:    SVGSVGElement,
    camera: CameraState
  ): void {
    let dragging = false;
    let lastX    = 0;
    let lastY    = 0;

    svg.addEventListener('pointerdown', (e) => {
      dragging = true;
      lastX = e.clientX;
      lastY = e.clientY;
      svg.setPointerCapture(e.pointerId);
    });

    svg.addEventListener('pointermove', (e) => {
      if (!dragging) {return;}
      camera.tx += e.clientX - lastX;
      camera.ty += e.clientY - lastY;
      lastX = e.clientX;
      lastY = e.clientY;
      MermaidExplorer.#paint(svg, camera);
    });

    const endDrag = (): void => { dragging = false; };
    svg.addEventListener('pointerup',     endDrag);
    svg.addEventListener('pointercancel', endDrag);
  }

  /**
   * Wire wheel-zoom with cursor-pivot scaling on the stage.
   *
   * Uses `{ passive: false }` to allow `e.preventDefault()` to suppress page
   * scroll. The pivot is derived from the cursor's position relative to the
   * stage so the point under the cursor stays fixed during zoom.
   */
  static #wheelZoom(
    stage:  HTMLElement,
    svg:    SVGSVGElement,
    camera: CameraState
  ): void {
    stage.addEventListener('wheel', (e) => {
      e.preventDefault();
      const rect   = stage.getBoundingClientRect();
      const pivotX = e.clientX - rect.left;
      const pivotY = e.clientY - rect.top;
      const factor = Math.exp(-e.deltaY * 0.0015);
      MermaidExplorer.#zoomAbout(svg, camera, factor, pivotX, pivotY);
    }, { 'passive': false });
  }

  // ── Private: D-pad construction ────────────────────────────────────────────

  /**
   * Build the 3×3 D-pad control overlay element for an inline diagram frame.
   *
   * D-pad layout matches GraphDpad.vue exactly:
   *   row 1: zoom-in · pan-up · zoom-out
   *   row 2: pan-left · centre · pan-right
   *   row 3: expand · pan-down · fit
   *
   * Pan-left moves the view toward the left (reveals left content), i.e.
   * translates the SVG rightward (+tx) — matching `AnimatedDagGraph.panLeft()`
   * which calls `cy.panBy({ x: 80, y: 0 })` where positive x reveals
   * content to the left of the viewport.
   *
   * The expand slot opens the fullscreen modal when `options.expand` is true;
   * otherwise a disabled placeholder preserves the 3×3 grid shape.
   */
  static #dpad(
    frame:   HTMLElement,
    svg:     SVGSVGElement,
    camera:  CameraState,
    options: MermaidExplorerOptions
  ): HTMLDivElement {
    const wrap = document.createElement('div');
    wrap.className = 'dag-mermaid-dpad-wrap dagonizer-dpad-wrap dagonizer-dpad-anchor dagonizer-dpad-anchor--hover';
    wrap.setAttribute('aria-label', 'Diagram navigation controls');
    const machine = CameraControls.create(
      MermaidExplorer.#cameraControls(frame, svg, camera, options),
      'inline'
    );
    const grid = MermaidExplorer.#renderDpad(machine);
    MermaidExplorer.#themed(wrap, options.theme);
    wrap.appendChild(grid);
    return wrap;
  }

  /** Produce a single D-pad button with `aria-label`, `title`, and click handler. */
  static #btn(
    label:   string,
    title:   string,
    disabled: boolean,
    handler: () => void
  ): HTMLButtonElement {
    const btn = document.createElement('button');
    btn.className   = disabled
      ? 'dagonizer-dpad-btn dagonizer-dpad-btn--disabled'
      : 'dagonizer-dpad-btn';
    btn.type        = 'button';
    btn.title       = title;
    btn.disabled    = disabled;
    btn.textContent = label;
    btn.setAttribute('aria-label', title);
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      if (disabled) {return;}
      handler();
    });
    return btn;
  }

  static #renderDpad(machine: InstanceType<typeof DpadMachine>): HTMLDivElement {
    const grid = document.createElement('div');
    grid.className = 'dag-mermaid-dpad dagonizer-dpad';
    for (const item of machine.state().items) {
      grid.appendChild(MermaidExplorer.#btn(item.label, item.title, item.disabled, () => {
        void machine.press(item.action);
      }));
    }
    return grid;
  }

  static #cameraControls(
    frame: HTMLElement,
    svg: SVGSVGElement,
    camera: CameraState,
    options: MermaidExplorerOptions,
    controller: InstanceType<typeof ModalController> | null = null
  ) {
    return new MermaidExplorer.#cameraControlsClass(
      frame,
      svg,
      camera,
      options,
      controller
    );
  }

  /**
   * Write `theme` overrides as canonical design-system custom properties on
   * the D-pad wrap element. Only provided fields are written; absent fields
   * inherit the page's existing `--ui-*` values.
   */
  static #themed(
    wrap:  HTMLElement,
    theme: MermaidExplorerTheme
  ): void {
    if (theme.surface !== undefined) {
      wrap.style.setProperty('--ui-bg-elevated', theme.surface);
    }
    if (theme.stroke !== undefined) {
      wrap.style.setProperty('--ui-border', theme.stroke);
    }
    if (theme.accent !== undefined) {
      wrap.style.setProperty('--ui-primary', theme.accent);
    }
  }

  // ── Private: fullscreen modal ──────────────────────────────────────────────

  /**
   * Open a fullscreen modal containing a cloned copy of `svg` with its own
   * independent D-pad. The expand slot becomes a close (✕ / Esc) control.
   *
   * The modal is appended to `document.body` and removed on close. The cloned
   * SVG has its own independent camera state so the modal's transform
   * state is fully isolated from the inline diagram's camera.
   *
   * Backdrop-click (on the overlay itself, not the stage) and Escape close
   * the modal — matching the `DiagramFrame.vue` expand modal pattern.
   */
  static #modal(
    svg:     SVGSVGElement,
    options: MermaidExplorerOptions
  ): void {
    const overlay = document.createElement('div');
    overlay.className = 'dag-mermaid-modal dagonizer-modal-shell';
    overlay.setAttribute('role',       'dialog');
    overlay.setAttribute('aria-modal', 'true');
    overlay.setAttribute('aria-label', 'Diagram fullscreen view');

    const stage = document.createElement('div');
    stage.className = 'dag-mermaid-modal-stage dagonizer-modal-stage';

    const stageStyle = stage.style;
    stageStyle.position    = 'relative';
    stageStyle.overflow    = 'hidden';
    stageStyle.flex        = '1 1 auto';
    stageStyle.cursor      = 'grab';
    stageStyle.userSelect  = 'none';
    stageStyle.touchAction = 'none';

    const clone = svg.cloneNode(true);
    if (!(clone instanceof SVGSVGElement)) {
      return;
    }
    clone.style.transform = '';
    const serializedClone = new XMLSerializer().serializeToString(clone);
    const cloneResult = trustedMarkupRenderer.render(stage, serializedClone, 'svg');
    if (!cloneResult.accepted) {
      return;
    }

    const hint = document.createElement('div');
    hint.className   = 'dag-mermaid-modal-hint dagonizer-modal-hint';
    hint.textContent = ViewportStatus.create({
      'hint': 'drag · wheel · esc to close',
      'mode': 'modal',
      'zoomLevel': 1
    }).hint ?? '';
    hint.setAttribute('aria-hidden', 'true');

    const dpadWrap = document.createElement('div');
    dpadWrap.className = 'dag-mermaid-dpad-wrap dagonizer-dpad-wrap dagonizer-dpad-anchor dagonizer-dpad-anchor--modal dagonizer-dpad-anchor--visible';
    dpadWrap.setAttribute('aria-label', 'Diagram navigation controls');

    overlay.appendChild(stage);
    overlay.appendChild(hint);
    overlay.appendChild(dpadWrap);

    const keyHandler = new MermaidModalKeyHandler();
    const controller = new ModalController(new MermaidModalHooks(overlay, keyHandler));
    keyHandler.connect(controller);
    controller.open();

    const clonedSvg = stage.querySelector<SVGSVGElement>('svg');
    if (clonedSvg === null) {
      controller.close('programmatic');
      return;
    }

    const modalNatural = MermaidExplorer.#sizeToIntrinsic(clonedSvg);

    const modalCamera = new CameraState(1, 0, 0);
    MermaidExplorer.#paint(clonedSvg, modalCamera);

    // Fit once the overlay has its layout dimensions. Double-rAF so the
    // fixed-position stage has measured its size; pass the source-measured
    // natural dims so the fit is correct even if the clone's getBBox is not
    // yet ready.
    requestAnimationFrame(() => {
      MermaidExplorer.#fitContain(stage, clonedSvg, modalCamera, modalNatural);
      requestAnimationFrame(() => {
        MermaidExplorer.#fitContain(stage, clonedSvg, modalCamera, modalNatural);
      });
    });

    // Interaction.
    MermaidExplorer.#pointerPan(clonedSvg, modalCamera);
    MermaidExplorer.#wheelZoom(stage, clonedSvg, modalCamera);
    MermaidExplorer.#bindSelection(stage, clonedSvg);

    const modalControls = MermaidExplorer.#cameraControls(
      stage,
      clonedSvg,
      modalCamera,
      options,
      controller
    );
    const machine = CameraControls.create(modalControls, 'modal');
    const grid = MermaidExplorer.#renderDpad(machine);

    MermaidExplorer.#themed(dpadWrap, options.theme);
    dpadWrap.appendChild(grid);

    // Backdrop click (overlay itself, not stage or buttons) closes the modal.
    overlay.addEventListener('click', (e) => {
      controller.onBackdropPress(e.target === overlay);
    });
  }

  static #bindSelection(
    stage: HTMLElement,
    svg: SVGSVGElement
  ): void {
    const nodes = svg.querySelectorAll<SVGElement>('.node');
    const nodeCount = nodes.length;
    for (let i = 0; i < nodeCount; i++) {
      const node = nodes[i];
      if (node === undefined) {continue;}
      node.classList.remove('dag-mermaid-selected');
      node.addEventListener('click', (e) => {
        e.stopPropagation();
        MermaidExplorer.#clearSelection(svg);
        node.classList.add('dag-mermaid-selected');
      });
    }

    stage.addEventListener('click', (e) => {
      if (e.target === stage || e.target === svg) {
        MermaidExplorer.#clearSelection(svg);
      }
    });
  }

  static #clearSelection(svg: SVGSVGElement): void {
    const selected = svg.querySelectorAll<SVGElement>('.dag-mermaid-selected');
    const selectedCount = selected.length;
    for (let i = 0; i < selectedCount; i++) {
      const node = selected[i];
      if (node !== undefined) {node.classList.remove('dag-mermaid-selected');}
    }
  }
};
