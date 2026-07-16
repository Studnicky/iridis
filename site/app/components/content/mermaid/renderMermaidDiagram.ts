import mermaid from 'mermaid/dist/mermaid.esm.min.mjs';

const SVG_BOUNDS_PADDING = 24;
let cachedThemeSignature: string | null = null;

function buildMermaidThemeSignature(): string {
  return [
    getComputedColor('--ui-bg-elevated'),
    getComputedColor('--ui-text-highlighted'),
    getComputedColor('--ui-primary'),
    getComputedColor('--ui-bg'),
  ].join('|');
}

export function mermaidThemeSignature(): string {
  return buildMermaidThemeSignature();
}

function mermaidThemeVariables() {
  return {
    'primaryColor': getComputedColor('--ui-bg-elevated'),
    'primaryTextColor': getComputedColor('--ui-text-highlighted'),
    'primaryBorderColor': getComputedColor('--ui-primary'),
    'lineColor': getComputedColor('--ui-primary'),
    'secondaryColor': getComputedColor('--ui-bg-elevated'),
    'tertiaryColor': getComputedColor('--ui-bg'),
  };
}

function getComputedColor(varName: string): string {
  return getComputedStyle(document.documentElement).getPropertyValue(varName).trim();
}

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

function contentBounds(svg: SVGSVGElement): DOMRect | null {
  try {
    const bounds = svg.getBBox();
    if (bounds.width > 0 && bounds.height > 0) {
      return bounds;
    }
  } catch {
    // Mermaid can transiently expose an SVG before layout settles.
  }
  return null;
}

function naturalSize(svg: SVGSVGElement): { w: number; h: number } {
  const viewBox = svg.getAttribute('viewBox');
  if (viewBox) {
    const parts = viewBox.trim().split(/[\s,]+/);
    const width = parseFloat(parts[2] || '0');
    const height = parseFloat(parts[3] || '0');
    if (width > 0 && height > 0) return { 'w': width, 'h': height };
  }

  try {
    const bbox = svg.getBBox();
    if (bbox.width > 0 && bbox.height > 0) return { 'w': bbox.width, 'h': bbox.height };
  } catch {
    // Mermaid can transiently expose an SVG before layout/bounds stabilize.
  }

  return { 'w': 1024, 'h': 768 };
}

function normalizeBounds(svg: SVGSVGElement): void {
  showOverflow(svg);
  const bounds = contentBounds(svg);
  if (bounds === null) return;
  const x = bounds.x - SVG_BOUNDS_PADDING;
  const y = bounds.y - SVG_BOUNDS_PADDING;
  const w = bounds.width + (SVG_BOUNDS_PADDING * 2);
  const h = bounds.height + (SVG_BOUNDS_PADDING * 2);
  if (w > 0 && h > 0) {
    svg.setAttribute('viewBox', `${String(x)} ${String(y)} ${String(w)} ${String(h)}`);
  }
}

export async function renderMermaidDiagram(renderId: string, code: string): Promise<string> {
  const themeSignature = mermaidThemeSignature();
  if (cachedThemeSignature !== themeSignature) {
    mermaid.initialize({
      startOnLoad: false,
      theme: 'base',
      themeVariables: mermaidThemeVariables(),
    });
    cachedThemeSignature = themeSignature;
  }

  const { svg } = await mermaid.render(renderId, code);
  return svg;
}

export function normalizeMermaidSvg(svg: SVGSVGElement): void {
  normalizeBounds(svg);
  const size = naturalSize(svg);
  svg.removeAttribute('width');
  svg.removeAttribute('height');
  svg.style.width = `${size.w}px`;
  svg.style.height = `${size.h}px`;
  svg.style.maxWidth = 'none';
  svg.style.display = 'block';
}
