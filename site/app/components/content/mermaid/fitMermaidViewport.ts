type MermaidViewportState = {
  scale: { value: number };
  translateX: { value: number };
  translateY: { value: number };
};

type SvgBoundsType = {
  readonly x: number;
  readonly y: number;
  readonly w: number;
  readonly h: number;
};

const MERMAID_FIT_PADDING = 0.92;
const SVG_BOUNDS_PADDING = 24;

function showOverflow(svg: SVGSVGElement): void {
  svg.style.overflow = 'visible';
  const nodes = svg.querySelectorAll<SVGGraphicsElement>('*');
  for (let i = 0; i < nodes.length; i++) {
    const node = nodes[i];
    if (node) {
      node.style.overflow = 'visible';
    }
  }
}

function contentBounds(svg: SVGSVGElement): SvgBoundsType | null {
  try {
    const bounds = svg.getBBox();
    if (bounds.width > 0 && bounds.height > 0) {
      return { 'x': bounds.x, 'y': bounds.y, 'w': bounds.width, 'h': bounds.height };
    }
  } catch {
    // getBBox can throw for detached or hidden SVG nodes.
  }
  return null;
}

function normalizeBounds(svg: SVGSVGElement): void {
  showOverflow(svg);
  const bounds = contentBounds(svg);
  if (bounds === null) return;
  const x = bounds.x - SVG_BOUNDS_PADDING;
  const y = bounds.y - SVG_BOUNDS_PADDING;
  const w = bounds.w + (SVG_BOUNDS_PADDING * 2);
  const h = bounds.h + (SVG_BOUNDS_PADDING * 2);
  if (w > 0 && h > 0) {
    svg.setAttribute('viewBox', `${String(x)} ${String(y)} ${String(w)} ${String(h)}`);
  }
}

function svgDimensions(svg: SVGSVGElement): { width: number; height: number } {
  normalizeBounds(svg);
  return {
    'width': parseFloat(svg.style.width || svg.getAttribute('width') || '0'),
    'height': parseFloat(svg.style.height || svg.getAttribute('height') || '0')
  };
}

export function resetMermaidViewport(
  viewport: HTMLElement,
  state: MermaidViewportState
): void {
  const svg = viewport.querySelector('svg');
  if (!(svg instanceof SVGSVGElement)) return;
  const viewportWidth = viewport.clientWidth;
  const viewportHeight = viewport.clientHeight;
  const { width, height } = svgDimensions(svg);
  if (width > 0 && height > 0) {
    state.translateX.value = (viewportWidth - width * state.scale.value) / 2;
    state.translateY.value = (viewportHeight - height * state.scale.value) / 2;
  }
}

export function fitMermaidViewport(
  viewport: HTMLElement,
  state: MermaidViewportState
): void {
  const svg = viewport.querySelector('svg');
  if (!(svg instanceof SVGSVGElement)) return;

  const viewportWidth = viewport.clientWidth;
  const viewportHeight = viewport.clientHeight;
  const { width, height } = svgDimensions(svg);

  if (width > 0 && height > 0) {
    const scaleX = (viewportWidth * MERMAID_FIT_PADDING) / width;
    const scaleY = (viewportHeight * MERMAID_FIT_PADDING) / height;
    state.scale.value = Math.min(scaleX, scaleY, 1);
    state.translateX.value = (viewportWidth - width * state.scale.value) / 2;
    state.translateY.value = (viewportHeight - height * state.scale.value) / 2;
  }
}
