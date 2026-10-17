/** Shared carousel interaction state with behavior resolved at construction. */
export abstract class IridisUiState {
  abstract readonly activeIndex: number;
  abstract readonly variant: string;

  static draggingImage(activeIndex: number, dragPx: number): IridisUiState {
    const result = new DraggingImageIridisUiState(activeIndex, dragPx);
    return result;
  }

  static draggingPicker(activeIndex: number, dragPx: number): IridisUiState {
    const result = new DraggingPickerIridisUiState(activeIndex, dragPx);
    return result;
  }

  static idleImage(activeIndex: number): IridisUiState {
    const result = new IdleImageIridisUiState(activeIndex);
    return result;
  }

  static idlePicker(activeIndex: number): IridisUiState {
    const result = new IdlePickerIridisUiState(activeIndex);
    return result;
  }

  abstract dragOffset(): number;
  abstract isDragging(): boolean;
  abstract selectsImageMode(): boolean;
}

class DraggingImageIridisUiState extends IridisUiState {
  readonly variant: string = 'dragging';

  constructor(
    readonly activeIndex: number,
    private readonly dragPx: number
  ) { super(); }

  dragOffset(): number {
    const result = this.dragPx;
    return result;
  }

  isDragging(): boolean {
    return true;
  }

  selectsImageMode(): boolean {
    return true;
  }
}

class DraggingPickerIridisUiState extends IridisUiState {
  readonly variant: string = 'dragging';

  constructor(
    readonly activeIndex: number,
    private readonly dragPx: number
  ) { super(); }

  dragOffset(): number {
    const result = this.dragPx;
    return result;
  }

  isDragging(): boolean {
    return true;
  }

  selectsImageMode(): boolean {
    return false;
  }
}

class IdleImageIridisUiState extends IridisUiState {
  readonly variant: string = 'idle';

  constructor(readonly activeIndex: number) { super(); }

  dragOffset(): number {
    return 0;
  }

  isDragging(): boolean {
    return false;
  }

  selectsImageMode(): boolean {
    return true;
  }
}

class IdlePickerIridisUiState extends IridisUiState {
  readonly variant: string = 'idle';

  constructor(readonly activeIndex: number) { super(); }

  dragOffset(): number {
    return 0;
  }

  isDragging(): boolean {
    return false;
  }

  selectsImageMode(): boolean {
    return false;
  }
}
