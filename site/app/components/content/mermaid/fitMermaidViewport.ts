class SvgBounds {
  public readonly height: number;
  public readonly width: number;
  public readonly x: number;
  public readonly y: number;

  public constructor(height: number, width: number, x: number, y: number) {
    this.height = height;
    this.width = width;
    this.x = x;
    this.y = y;
  }
}

export const fitMermaidViewport = class MermaidViewportFitter {
  private static readonly fitPadding = 0.92;
  private static readonly svgBoundsPadding = 24;

  private static contentBounds(svg: SVGSVGElement): SvgBounds | null {
    try {
      const bounds = svg.getBBox();
      if (bounds.width > 0 && bounds.height > 0) {
        return new SvgBounds(bounds.height, bounds.width, bounds.x, bounds.y);
      }
    } catch {
      // getBBox can throw for detached or hidden SVG nodes.
    }
    return null;
  }

  public static fit(
    viewport: HTMLElement,
    state: {
      readonly 'scale': { 'value': number };
      readonly 'translateX': { 'value': number };
      readonly 'translateY': { 'value': number };
    }
  ): void {
    const svg = viewport.querySelector('svg');
    if (!(svg instanceof SVGSVGElement)) {return;}

    const viewportWidth = viewport.clientWidth;
    const viewportHeight = viewport.clientHeight;
    const { height, width } = MermaidViewportFitter.svgDimensions(svg);

    if (width > 0 && height > 0) {
      const scaleX = (viewportWidth * MermaidViewportFitter.fitPadding) / width;
      const scaleY = (viewportHeight * MermaidViewportFitter.fitPadding) / height;
      state.scale.value = Math.min(scaleX, scaleY, 1);
      state.translateX.value = (viewportWidth - width * state.scale.value) / 2;
      state.translateY.value = (viewportHeight - height * state.scale.value) / 2;
    }
  }

  private static normalizeBounds(svg: SVGSVGElement): void {
    MermaidViewportFitter.showOverflow(svg);
    const bounds = MermaidViewportFitter.contentBounds(svg);
    if (bounds === null) {return;}
    const x = bounds.x - MermaidViewportFitter.svgBoundsPadding;
    const y = bounds.y - MermaidViewportFitter.svgBoundsPadding;
    const width = bounds.width + (MermaidViewportFitter.svgBoundsPadding * 2);
    const height = bounds.height + (MermaidViewportFitter.svgBoundsPadding * 2);
    if (width > 0 && height > 0) {
      svg.setAttribute('viewBox', `${String(x)} ${String(y)} ${String(width)} ${String(height)}`);
    }
  }

  public static reset(
    viewport: HTMLElement,
    state: {
      readonly 'scale': { 'value': number };
      readonly 'translateX': { 'value': number };
      readonly 'translateY': { 'value': number };
    }
  ): void {
    const svg = viewport.querySelector('svg');
    if (!(svg instanceof SVGSVGElement)) {return;}
    const viewportWidth = viewport.clientWidth;
    const viewportHeight = viewport.clientHeight;
    const { height, width } = MermaidViewportFitter.svgDimensions(svg);
    if (width > 0 && height > 0) {
      state.translateX.value = (viewportWidth - width * state.scale.value) / 2;
      state.translateY.value = (viewportHeight - height * state.scale.value) / 2;
    }
  }

  private static showOverflow(svg: SVGSVGElement): void {
    svg.style.overflow = 'visible';
    const nodes = svg.querySelectorAll<SVGGraphicsElement>('*');
    const nodeCount = nodes.length;
    for (let index = 0; index < nodeCount; index++) {
      const node = nodes[index];
      if (node !== undefined) {
        node.style.overflow = 'visible';
      }
    }
  }

  private static svgDimensions(svg: SVGSVGElement): { 'height': number; 'width': number } {
    MermaidViewportFitter.normalizeBounds(svg);
    const heightStyle = svg.style.height;
    const widthStyle = svg.style.width;
    return {
      'height': parseFloat(heightStyle.length > 0 ? heightStyle : (svg.getAttribute('height') ?? '0')),
      'width': parseFloat(widthStyle.length > 0 ? widthStyle : (svg.getAttribute('width') ?? '0'))
    };
  }
};
