import { ViewportStatusOptionsInterfaceTypeEntity } from './ViewportStatusOptionsInterfaceTypeEntity.ts';

interface ViewportStatusFormattingInterface {
  formatZoom?(zoomLevel: number | null): string | null;
}

class ViewportStatusModel {
  readonly #options: ViewportStatusOptionsInterfaceTypeEntity.Type;
  readonly #zoomText: string | null;

  public constructor(
    options: ViewportStatusOptionsInterfaceTypeEntity.Type,
    zoomText: string | null
  ) {
    this.#options = options;
    this.#zoomText = zoomText;
  }

  public get canFit(): boolean {
    const result = this.#options.canFit ?? true;
    return result;
  }

  public get canPan(): boolean {
    const result = this.#options.canPan ?? true;
    return result;
  }

  public get hint(): string | null {
    const result = this.#options.hint === undefined ? 'drag · wheel' : this.#options.hint;
    return result;
  }

  public get mode(): ViewportStatusOptionsInterfaceTypeEntity.Type['mode'] {
    const result = this.#options.mode;
    return result;
  }

  public get zoomLevel(): number | null {
    const result = this.#options.zoomLevel;
    return result;
  }

  public get zoomText(): string | null {
    const result = this.#zoomText;
    return result;
  }
}

export const ViewportStatus = class ViewportStatus {
  public static create(
    options: ViewportStatusFormattingInterface & ViewportStatusOptionsInterfaceTypeEntity.Type
  ): ViewportStatusModel {
    const normalized = ViewportStatusOptionsInterfaceTypeEntity.intake({
      'canFit': options.canFit ?? true,
      'canPan': options.canPan ?? true,
      'hint': options.hint === undefined ? 'drag · wheel' : options.hint,
      'mode': options.mode,
      'zoomLevel': options.zoomLevel
    });
    const zoomText = options.formatZoom?.(normalized.zoomLevel)
      ?? (normalized.zoomLevel === null ? null : `${normalized.zoomLevel.toFixed(2)}×`);
    const result = new ViewportStatusModel(normalized, zoomText);
    return result;
  }
};
