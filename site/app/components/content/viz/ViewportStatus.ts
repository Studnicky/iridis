interface ViewportStatusOptionsInterface {
  readonly 'canFit'?: boolean;
  readonly 'canPan'?: boolean;
  readonly 'formatZoom'?: (zoomLevel: number | null) => string | null;
  readonly 'hint'?: string | null;
  readonly 'mode': 'inline' | 'modal';
  readonly 'zoomLevel': number | null;
}

class ViewportStatusModel {
  public readonly canFit: boolean;
  public readonly canPan: boolean;
  public readonly hint: string | null;
  public readonly mode: 'inline' | 'modal';
  public readonly zoomLevel: number | null;
  public readonly zoomText: string | null;

  public constructor(
    canFit: boolean,
    canPan: boolean,
    hint: string | null,
    mode: 'inline' | 'modal',
    zoomLevel: number | null,
    zoomText: string | null
  ) {
    this.canFit = canFit;
    this.canPan = canPan;
    this.hint = hint;
    this.mode = mode;
    this.zoomLevel = zoomLevel;
    this.zoomText = zoomText;
  }
}

export const ViewportStatus = class ViewportStatus {
  public static create(options: ViewportStatusOptionsInterface): ViewportStatusModel {
    const zoomText = options.formatZoom?.(options.zoomLevel)
      ?? (options.zoomLevel === null ? null : `${options.zoomLevel.toFixed(2)}×`);
    return new ViewportStatusModel(
      options.canFit ?? true,
      options.canPan ?? true,
      options.hint ?? 'drag · wheel',
      options.mode,
      options.zoomLevel,
      zoomText
    );
  }
};
