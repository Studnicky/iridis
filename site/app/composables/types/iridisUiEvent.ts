import type { FsmStepInterface } from '@studnicky/fsm/browser';

import type { DerivationConfigType } from './colorDerivation.ts';
import type { RoleSortKeyType } from './roleSortKey.ts';

import { IridisUiEffect } from './iridisUiEffect.ts';
import { IridisUiState } from './iridisUiState.ts';

/** A concrete UI transition with behavior resolved at construction. */
export abstract class IridisUiEvent {
  abstract readonly type: string;

  static addSeed(hex: string | undefined): IridisUiEvent { return new EffectOnlyIridisUiEvent('ADD_SEED', IridisUiEffect.addSeed(hex)); }
  static clearCvdPreviews(): IridisUiEvent { return new EffectOnlyIridisUiEvent('CVD_CLEAR_PREVIEWS', IridisUiEffect.clearCvdPreviews()); }
  static displayP3ColorSpace(): IridisUiEvent { return new EffectOnlyIridisUiEvent('SET_COLOR_SPACE', IridisUiEffect.setColorSpace(IridisUiEffect.displayP3ColorSpace())); }
  static dragEnd(count: number, shiftedBy: number): IridisUiEvent { return new DragEndIridisUiEvent(count, shiftedBy); }
  static dragMove(dragPx: number): IridisUiEvent { return new DragMoveIridisUiEvent(dragPx); }
  static dragStart(): IridisUiEvent { return new DragStartIridisUiEvent(); }
  static extractImageFiles(files: File | File[]): IridisUiEvent { return new EffectOnlyIridisUiEvent('EXTRACT_IMAGE', IridisUiEffect.extractImageFiles(files)); }
  static extractSampleImage(): IridisUiEvent { return new EffectOnlyIridisUiEvent('EXTRACT_IMAGE', IridisUiEffect.extractSampleImage()); }
  static fitDiagram(): IridisUiEvent { return new EffectOnlyIridisUiEvent('DIAGRAM_FIT', IridisUiEffect.fitDiagram()); }
  static navigate(count: number, delta: number): IridisUiEvent { return new NavigateIridisUiEvent(count, delta); }
  static navigateToTarget(targetId: string): IridisUiEvent { return new EffectOnlyIridisUiEvent('NAVIGATE_TO_TARGET', IridisUiEffect.navigateToTarget(targetId)); }
  static panDiagram(dx: number, dy: number): IridisUiEvent { return new EffectOnlyIridisUiEvent('DIAGRAM_PAN', IridisUiEffect.panDiagram(dx, dy)); }
  static pinSeedRole(index: number, role: string | undefined): IridisUiEvent { return new EffectOnlyIridisUiEvent('PIN_SEED_ROLE', IridisUiEffect.pinSeedRole(index, role)); }
  static populatePickerFromImage(hexes: string[]): IridisUiEvent { return new EffectOnlyIridisUiEvent('POPULATE_PICKER_FROM_IMAGE', IridisUiEffect.populatePickerFromImage(hexes)); }
  static removeSeed(index: number): IridisUiEvent { return new EffectOnlyIridisUiEvent('REMOVE_SEED', IridisUiEffect.removeSeed(index)); }
  static resetDiagram(): IridisUiEvent { return new EffectOnlyIridisUiEvent('DIAGRAM_RESET', IridisUiEffect.resetDiagram()); }
  static selectCard(index: number): IridisUiEvent { return new SelectCardIridisUiEvent(index); }
  static selectImageCandidate(hexes: string[], label: string): IridisUiEvent { return new EffectOnlyIridisUiEvent('SELECT_IMAGE_CANDIDATE', IridisUiEffect.selectImageCandidate(hexes, label)); }
  static selectImageMode(): IridisUiEvent { return new SelectImageModeIridisUiEvent(); }
  static selectPickerMode(): IridisUiEvent { return new SelectPickerModeIridisUiEvent(); }
  static setContrastStrictness(strictness: number): IridisUiEvent { return new EffectOnlyIridisUiEvent('SET_CONTRAST_STRICTNESS', IridisUiEffect.setContrastStrictness(strictness)); }
  static setCvdCorrectionDisabled(): IridisUiEvent { return new EffectOnlyIridisUiEvent('SET_CVD_CORRECT', IridisUiEffect.setCvdCorrection(IridisUiEffect.cvdCorrectionDisabled())); }
  static setCvdCorrectionEnabled(): IridisUiEvent { return new EffectOnlyIridisUiEvent('SET_CVD_CORRECT', IridisUiEffect.setCvdCorrection(IridisUiEffect.cvdCorrectionEnabled())); }
  static setDarkFraming(): IridisUiEvent { return new EffectOnlyIridisUiEvent('SET_FRAMING', IridisUiEffect.setFraming(IridisUiEffect.darkFraming())); }
  static setDerivationConfig(config: DerivationConfigType): IridisUiEvent { return new EffectOnlyIridisUiEvent('SET_DERIVATION_CONFIG', IridisUiEffect.setDerivationConfig(config)); }
  static setDeltaEImageAlgorithm(): IridisUiEvent { return new EffectOnlyIridisUiEvent('SET_IMAGE_ALGORITHM', IridisUiEffect.setImageAlgorithm(IridisUiEffect.deltaEImageAlgorithm())); }
  static setImageChromaRange(range: [number, number][]): IridisUiEvent { return new EffectOnlyIridisUiEvent('SET_IMAGE_CHROMA_RANGE', IridisUiEffect.setImageChromaRange(range)); }
  static setImageDeltaECap(cap: number): IridisUiEvent { return new EffectOnlyIridisUiEvent('SET_IMAGE_DELTA_E_CAP', IridisUiEffect.setImageDeltaECap(cap)); }
  static setImageHarmonize(threshold: number): IridisUiEvent { return new EffectOnlyIridisUiEvent('SET_IMAGE_HARMONIZE', IridisUiEffect.setImageHarmonize(threshold)); }
  static setImageHistogramBits(bits: number): IridisUiEvent { return new EffectOnlyIridisUiEvent('SET_IMAGE_HISTOGRAM_BITS', IridisUiEffect.setImageHistogramBits(bits)); }
  static setImageK(k: number): IridisUiEvent { return new EffectOnlyIridisUiEvent('SET_IMAGE_K', IridisUiEffect.setImageK(k)); }
  static setImageLightnessRange(range: [number, number][]): IridisUiEvent { return new EffectOnlyIridisUiEvent('SET_IMAGE_LIGHTNESS_RANGE', IridisUiEffect.setImageLightnessRange(range)); }
  static setKMeansImageAlgorithm(): IridisUiEvent { return new EffectOnlyIridisUiEvent('SET_IMAGE_ALGORITHM', IridisUiEffect.setImageAlgorithm(IridisUiEffect.kMeansImageAlgorithm())); }
  static setLightFraming(): IridisUiEvent { return new EffectOnlyIridisUiEvent('SET_FRAMING', IridisUiEffect.setFraming(IridisUiEffect.lightFraming())); }
  static setMedianCutImageAlgorithm(): IridisUiEvent { return new EffectOnlyIridisUiEvent('SET_IMAGE_ALGORITHM', IridisUiEffect.setImageAlgorithm(IridisUiEffect.medianCutImageAlgorithm())); }
  static setRoleSort(keys: RoleSortKeyType[]): IridisUiEvent { return new EffectOnlyIridisUiEvent('SET_ROLE_SORT', IridisUiEffect.setRoleSort(keys)); }
  static setSchema(schemaName: string): IridisUiEvent { return new EffectOnlyIridisUiEvent('SET_SCHEMA', IridisUiEffect.setSchema(schemaName)); }
  static setSeed(index: number, hex: string): IridisUiEvent { return new EffectOnlyIridisUiEvent('SET_SEED', IridisUiEffect.setSeed(index, hex)); }
  static setSemanticHuesDisabled(): IridisUiEvent { return new EffectOnlyIridisUiEvent('SET_SEMANTIC_HUES_ENABLED', IridisUiEffect.setSemanticHues(IridisUiEffect.semanticHuesDisabled())); }
  static setSemanticHuesEnabled(): IridisUiEvent { return new EffectOnlyIridisUiEvent('SET_SEMANTIC_HUES_ENABLED', IridisUiEffect.setSemanticHues(IridisUiEffect.semanticHuesEnabled())); }
  static setSrgbColorSpace(): IridisUiEvent { return new EffectOnlyIridisUiEvent('SET_COLOR_SPACE', IridisUiEffect.setColorSpace(IridisUiEffect.srgbColorSpace())); }
  static setWuQuantizeImageAlgorithm(): IridisUiEvent { return new EffectOnlyIridisUiEvent('SET_IMAGE_ALGORITHM', IridisUiEffect.setImageAlgorithm(IridisUiEffect.wuQuantizeImageAlgorithm())); }
  static toggleCvdPreview(cvdType: string): IridisUiEvent { return new EffectOnlyIridisUiEvent('CVD_TOGGLE_PREVIEW', IridisUiEffect.toggleCvdPreview(cvdType)); }
  static toggleDiagramExpansion(): IridisUiEvent { return new EffectOnlyIridisUiEvent('DIAGRAM_TOGGLE_EXPAND', IridisUiEffect.toggleDiagramExpansion()); }
  static zoomDiagram(factor: number): IridisUiEvent { return new EffectOnlyIridisUiEvent('DIAGRAM_ZOOM', IridisUiEffect.zoomDiagram(factor)); }

  abstract transition(state: IridisUiState): FsmStepInterface<IridisUiState, IridisUiEffect>;
}


class EffectOnlyIridisUiEvent extends IridisUiEvent {
  readonly #effect: IridisUiEffect;
  readonly type: string;

  constructor(type: string, effect: IridisUiEffect) {
    super();
    this.type = type;
    this.#effect = effect;
  }

  transition(state: IridisUiState): FsmStepInterface<IridisUiState, IridisUiEffect> {
    return { 'effects': [this.#effect], 'state': state };
  }
}

class DragEndIridisUiEvent extends IridisUiEvent {
  readonly #count: number;
  readonly #shiftedBy: number;
  readonly type = 'DRAG_END';

  constructor(count: number, shiftedBy: number) {
    super();
    this.#count = count;
    this.#shiftedBy = shiftedBy;
  }

  transition(state: IridisUiState): FsmStepInterface<IridisUiState, IridisUiEffect> {
    if (!state.isDragging()) { throw new Error('Cannot handle event "DRAG_END" in an idle state'); }
    const activeIndex = ((state.activeIndex + this.#shiftedBy) % this.#count + this.#count) % this.#count;
    const next = state.selectsImageMode() ? IridisUiState.idleImage(activeIndex) : IridisUiState.idlePicker(activeIndex);
    return { 'effects': [], 'state': next };
  }
}

class DragMoveIridisUiEvent extends IridisUiEvent {
  readonly #dragPx: number;
  readonly type = 'DRAG_MOVE';

  constructor(dragPx: number) {
    super();
    this.#dragPx = dragPx;
  }

  transition(state: IridisUiState): FsmStepInterface<IridisUiState, IridisUiEffect> {
    if (!state.isDragging()) { throw new Error('Cannot handle event "DRAG_MOVE" in an idle state'); }
    const next = state.selectsImageMode()
      ? IridisUiState.draggingImage(state.activeIndex, this.#dragPx)
      : IridisUiState.draggingPicker(state.activeIndex, this.#dragPx);
    return { 'effects': [], 'state': next };
  }
}

class DragStartIridisUiEvent extends IridisUiEvent {
  readonly type = 'DRAG_START';

  transition(state: IridisUiState): FsmStepInterface<IridisUiState, IridisUiEffect> {
    if (state.isDragging()) { return { 'effects': [], 'state': state }; }
    const next = state.selectsImageMode()
      ? IridisUiState.draggingImage(state.activeIndex, 0)
      : IridisUiState.draggingPicker(state.activeIndex, 0);
    return { 'effects': [], 'state': next };
  }
}

class NavigateIridisUiEvent extends IridisUiEvent {
  readonly #count: number;
  readonly #delta: number;
  readonly type = 'NAVIGATE';

  constructor(count: number, delta: number) {
    super();
    this.#count = count;
    this.#delta = delta;
  }

  transition(state: IridisUiState): FsmStepInterface<IridisUiState, IridisUiEffect> {
    if (state.isDragging()) { return { 'effects': [], 'state': state }; }
    const activeIndex = ((state.activeIndex + this.#delta) % this.#count + this.#count) % this.#count;
    const next = state.selectsImageMode() ? IridisUiState.idleImage(activeIndex) : IridisUiState.idlePicker(activeIndex);
    return { 'effects': [], 'state': next };
  }
}

class SelectCardIridisUiEvent extends IridisUiEvent {
  readonly #index: number;
  readonly type = 'SELECT_CARD';

  constructor(index: number) {
    super();
    this.#index = index;
  }

  transition(state: IridisUiState): FsmStepInterface<IridisUiState, IridisUiEffect> {
    if (state.isDragging()) { return { 'effects': [], 'state': state }; }
    const next = state.selectsImageMode() ? IridisUiState.idleImage(this.#index) : IridisUiState.idlePicker(this.#index);
    return { 'effects': [], 'state': next };
  }
}

class SelectImageModeIridisUiEvent extends IridisUiEvent {
  readonly type = 'SELECT_IMAGE_MODE';

  transition(): FsmStepInterface<IridisUiState, IridisUiEffect> {
    return { 'effects': [], 'state': IridisUiState.idleImage(0) };
  }
}

class SelectPickerModeIridisUiEvent extends IridisUiEvent {
  readonly type = 'SELECT_PICKER_MODE';

  transition(): FsmStepInterface<IridisUiState, IridisUiEffect> {
    return { 'effects': [], 'state': IridisUiState.idlePicker(1) };
  }
}
