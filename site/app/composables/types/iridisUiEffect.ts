import type { DerivationConfigInterfaceTypeEntity } from '../entities/DerivationConfigInterfaceTypeEntity.ts';
import type { RoleSortKeyType } from './roleSortKeyType.ts';

abstract class IridisUiEffectHandler {
  abstract addSeed(hex: string | undefined): void;
  abstract clearCvdPreviews(): void;
  abstract extractImageFiles(files: File | File[]): void;
  abstract extractSampleImage(): void;
  abstract fitDiagram(): void;
  abstract navigateToTarget(targetId: string): void;
  abstract panDiagram(dx: number, dy: number): void;
  abstract pinSeedRole(index: number, role: string | undefined): void;
  abstract populatePickerFromImage(hexes: string[]): void;
  abstract removeSeed(index: number): void;
  abstract resetDiagram(): void;
  abstract selectImageCandidate(hexes: string[], label: string): void;
  abstract setDisplayP3ColorSpace(): void;
  abstract setSrgbColorSpace(): void;
  abstract setContrastStrictness(strictness: number): void;
  abstract disableCvdCorrection(): void;
  abstract enableCvdCorrection(): void;
  abstract setDerivationConfig(config: DerivationConfigInterfaceTypeEntity.Type): void;
  abstract setDarkFraming(): void;
  abstract setLightFraming(): void;
  abstract setDeltaEImageAlgorithm(): void;
  abstract setKMeansImageAlgorithm(): void;
  abstract setMedianCutImageAlgorithm(): void;
  abstract setWuQuantizeImageAlgorithm(): void;
  abstract setImageChromaRange(range: [number, number][]): void;
  abstract setImageDeltaECap(cap: number): void;
  abstract setImageHarmonize(threshold: number): void;
  abstract setImageHistogramBits(bits: number): void;
  abstract setImageK(k: number): void;
  abstract setImageLightnessRange(range: [number, number][]): void;
  abstract setRoleSort(keys: RoleSortKeyType[]): void;
  abstract setSchema(schemaName: string): void;
  abstract setSeed(index: number, hex: string): void;
  abstract disableSemanticHues(): void;
  abstract enableSemanticHues(): void;
  abstract toggleCvdPreview(cvdType: string): void;
  abstract toggleDiagramExpansion(): void;
  abstract zoomDiagram(factor: number): void;
}

abstract class ColorSpaceSelection { abstract apply(handler: IridisUiEffectHandler): void; }
class DisplayP3ColorSpaceSelection extends ColorSpaceSelection { apply(handler: IridisUiEffectHandler): void { handler.setDisplayP3ColorSpace(); } }
class SrgbColorSpaceSelection extends ColorSpaceSelection { apply(handler: IridisUiEffectHandler): void { handler.setSrgbColorSpace(); } }
abstract class CvdCorrectionSelection { abstract apply(handler: IridisUiEffectHandler): void; }
class CvdCorrectionDisabledSelection extends CvdCorrectionSelection { apply(handler: IridisUiEffectHandler): void { handler.disableCvdCorrection(); } }
class CvdCorrectionEnabledSelection extends CvdCorrectionSelection { apply(handler: IridisUiEffectHandler): void { handler.enableCvdCorrection(); } }
abstract class FramingSelection { abstract apply(handler: IridisUiEffectHandler): void; }
class DarkFramingSelection extends FramingSelection { apply(handler: IridisUiEffectHandler): void { handler.setDarkFraming(); } }
class LightFramingSelection extends FramingSelection { apply(handler: IridisUiEffectHandler): void { handler.setLightFraming(); } }
abstract class ImageAlgorithmSelection { abstract apply(handler: IridisUiEffectHandler): void; }
class DeltaEImageAlgorithmSelection extends ImageAlgorithmSelection { apply(handler: IridisUiEffectHandler): void { handler.setDeltaEImageAlgorithm(); } }
class KMeansImageAlgorithmSelection extends ImageAlgorithmSelection { apply(handler: IridisUiEffectHandler): void { handler.setKMeansImageAlgorithm(); } }
class MedianCutImageAlgorithmSelection extends ImageAlgorithmSelection { apply(handler: IridisUiEffectHandler): void { handler.setMedianCutImageAlgorithm(); } }
class WuQuantizeImageAlgorithmSelection extends ImageAlgorithmSelection { apply(handler: IridisUiEffectHandler): void { handler.setWuQuantizeImageAlgorithm(); } }
abstract class SemanticHuesSelection { abstract apply(handler: IridisUiEffectHandler): void; }
class SemanticHuesDisabledSelection extends SemanticHuesSelection { apply(handler: IridisUiEffectHandler): void { handler.disableSemanticHues(); } }
class SemanticHuesEnabledSelection extends SemanticHuesSelection { apply(handler: IridisUiEffectHandler): void { handler.enableSemanticHues(); } }

/** A concrete side effect emitted by IridisUiMachine and executed through the UI capability port. */
export abstract class IridisUiEffect {
  abstract readonly type: string;

  get variant(): string {
    const result = this.type;
    return result;
  }

  static addSeed(hex: string | undefined): IridisUiEffect { return new AddSeedEffect(hex); }
  static clearCvdPreviews(): IridisUiEffect { return new ClearCvdPreviewsEffect(); }
  static extractImageFiles(files: File | File[]): IridisUiEffect { return new ExtractImageFilesEffect(files); }
  static extractSampleImage(): IridisUiEffect { return new ExtractSampleImageEffect(); }
  static fitDiagram(): IridisUiEffect { return new FitDiagramEffect(); }
  static navigateToTarget(targetId: string): IridisUiEffect { return new NavigateToTargetEffect(targetId); }
  static panDiagram(dx: number, dy: number): IridisUiEffect { return new PanDiagramEffect(dx, dy); }
  static pinSeedRole(index: number, role: string | undefined): IridisUiEffect { return new PinSeedRoleEffect(index, role); }
  static populatePickerFromImage(hexes: string[]): IridisUiEffect { return new PopulatePickerFromImageEffect(hexes); }
  static removeSeed(index: number): IridisUiEffect { return new RemoveSeedEffect(index); }
  static resetDiagram(): IridisUiEffect { return new ResetDiagramEffect(); }
  static selectImageCandidate(hexes: string[], label: string): IridisUiEffect { return new SelectImageCandidateEffect(hexes, label); }
  static displayP3ColorSpace(): ColorSpaceSelection { return new DisplayP3ColorSpaceSelection(); }
  static srgbColorSpace(): ColorSpaceSelection { return new SrgbColorSpaceSelection(); }
  static setColorSpace(selection: ColorSpaceSelection): IridisUiEffect { return new SetColorSpaceEffect(selection); }
  static setContrastStrictness(strictness: number): IridisUiEffect { return new SetContrastStrictnessEffect(strictness); }
  static cvdCorrectionDisabled(): CvdCorrectionSelection { return new CvdCorrectionDisabledSelection(); }
  static cvdCorrectionEnabled(): CvdCorrectionSelection { return new CvdCorrectionEnabledSelection(); }
  static setCvdCorrection(selection: CvdCorrectionSelection): IridisUiEffect { return new SetCvdCorrectionEffect(selection); }
  static setDerivationConfig(config: DerivationConfigInterfaceTypeEntity.Type): IridisUiEffect { return new SetDerivationConfigEffect(config); }
  static darkFraming(): FramingSelection { return new DarkFramingSelection(); }
  static lightFraming(): FramingSelection { return new LightFramingSelection(); }
  static setFraming(selection: FramingSelection): IridisUiEffect { return new SetFramingEffect(selection); }
  static deltaEImageAlgorithm(): ImageAlgorithmSelection { return new DeltaEImageAlgorithmSelection(); }
  static kMeansImageAlgorithm(): ImageAlgorithmSelection { return new KMeansImageAlgorithmSelection(); }
  static medianCutImageAlgorithm(): ImageAlgorithmSelection { return new MedianCutImageAlgorithmSelection(); }
  static wuQuantizeImageAlgorithm(): ImageAlgorithmSelection { return new WuQuantizeImageAlgorithmSelection(); }
  static setImageAlgorithm(selection: ImageAlgorithmSelection): IridisUiEffect { return new SetImageAlgorithmEffect(selection); }
  static setImageChromaRange(range: [number, number][]): IridisUiEffect { return new SetImageChromaRangeEffect(range); }
  static setImageDeltaECap(cap: number): IridisUiEffect { return new SetImageDeltaECapEffect(cap); }
  static setImageHarmonize(threshold: number): IridisUiEffect { return new SetImageHarmonizeEffect(threshold); }
  static setImageHistogramBits(bits: number): IridisUiEffect { return new SetImageHistogramBitsEffect(bits); }
  static setImageK(k: number): IridisUiEffect { return new SetImageKEffect(k); }
  static setImageLightnessRange(range: [number, number][]): IridisUiEffect { return new SetImageLightnessRangeEffect(range); }
  static setRoleSort(keys: RoleSortKeyType[]): IridisUiEffect { return new SetRoleSortEffect(keys); }
  static setSchema(schemaName: string): IridisUiEffect { return new SetSchemaEffect(schemaName); }
  static setSeed(index: number, hex: string): IridisUiEffect { return new SetSeedEffect(index, hex); }
  static semanticHuesDisabled(): SemanticHuesSelection { return new SemanticHuesDisabledSelection(); }
  static semanticHuesEnabled(): SemanticHuesSelection { return new SemanticHuesEnabledSelection(); }
  static setSemanticHues(selection: SemanticHuesSelection): IridisUiEffect { return new SetSemanticHuesEffect(selection); }
  static toggleCvdPreview(cvdType: string): IridisUiEffect { return new ToggleCvdPreviewEffect(cvdType); }
  static toggleDiagramExpansion(): IridisUiEffect { return new ToggleDiagramExpansionEffect(); }
  static zoomDiagram(factor: number): IridisUiEffect { return new ZoomDiagramEffect(factor); }

  abstract execute(handler: IridisUiEffectHandler): void;
}

class AddSeedEffect extends IridisUiEffect {
  readonly #hex: string | undefined;
  readonly type = 'ADD_SEED';
  constructor(hex: string | undefined) { super(); this.#hex = hex; }
  execute(handler: IridisUiEffectHandler): void { handler.addSeed(this.#hex); }
}
class ClearCvdPreviewsEffect extends IridisUiEffect { readonly type = 'CVD_CLEAR_PREVIEWS'; execute(handler: IridisUiEffectHandler): void { handler.clearCvdPreviews(); } }
class ExtractImageFilesEffect extends IridisUiEffect {
  readonly #files: File | File[];
  readonly type = 'EXTRACT_IMAGE_FILES';
  constructor(files: File | File[]) { super(); this.#files = files; }
  execute(handler: IridisUiEffectHandler): void { handler.extractImageFiles(this.#files); }
}
class ExtractSampleImageEffect extends IridisUiEffect { readonly type = 'EXTRACT_SAMPLE_IMAGE'; execute(handler: IridisUiEffectHandler): void { handler.extractSampleImage(); } }
class FitDiagramEffect extends IridisUiEffect { readonly type = 'DIAGRAM_FIT'; execute(handler: IridisUiEffectHandler): void { handler.fitDiagram(); } }
class NavigateToTargetEffect extends IridisUiEffect {
  readonly #targetId: string;
  readonly type = 'NAVIGATE_TO_TARGET';
  constructor(targetId: string) { super(); this.#targetId = targetId; }
  execute(handler: IridisUiEffectHandler): void { handler.navigateToTarget(this.#targetId); }
}
class PanDiagramEffect extends IridisUiEffect {
  readonly #dx: number; readonly #dy: number; readonly type = 'DIAGRAM_PAN';
  constructor(dx: number, dy: number) { super(); this.#dx = dx; this.#dy = dy; }
  execute(handler: IridisUiEffectHandler): void { handler.panDiagram(this.#dx, this.#dy); }
}
class PinSeedRoleEffect extends IridisUiEffect {
  readonly #index: number; readonly #role: string | undefined; readonly type = 'PIN_SEED_ROLE';
  constructor(index: number, role: string | undefined) { super(); this.#index = index; this.#role = role; }
  execute(handler: IridisUiEffectHandler): void { handler.pinSeedRole(this.#index, this.#role); }
}
class PopulatePickerFromImageEffect extends IridisUiEffect {
  readonly #hexes: string[]; readonly type = 'POPULATE_PICKER_FROM_IMAGE';
  constructor(hexes: string[]) { super(); this.#hexes = hexes; }
  execute(handler: IridisUiEffectHandler): void { handler.populatePickerFromImage(this.#hexes); }
}
class RemoveSeedEffect extends IridisUiEffect {
  readonly #index: number; readonly type = 'REMOVE_SEED';
  constructor(index: number) { super(); this.#index = index; }
  execute(handler: IridisUiEffectHandler): void { handler.removeSeed(this.#index); }
}
class ResetDiagramEffect extends IridisUiEffect { readonly type = 'DIAGRAM_RESET'; execute(handler: IridisUiEffectHandler): void { handler.resetDiagram(); } }
class SelectImageCandidateEffect extends IridisUiEffect {
  readonly #hexes: string[]; readonly #label: string; readonly type = 'SELECT_IMAGE_CANDIDATE';
  constructor(hexes: string[], label: string) { super(); this.#hexes = hexes; this.#label = label; }
  execute(handler: IridisUiEffectHandler): void { handler.selectImageCandidate(this.#hexes, this.#label); }
}
class SetColorSpaceEffect extends IridisUiEffect {
  readonly #selection: ColorSpaceSelection; readonly type = 'SET_COLOR_SPACE';
  constructor(selection: ColorSpaceSelection) { super(); this.#selection = selection; }
  execute(handler: IridisUiEffectHandler): void { this.#selection.apply(handler); }
}
class SetContrastStrictnessEffect extends IridisUiEffect {
  readonly #strictness: number; readonly type = 'SET_CONTRAST_STRICTNESS';
  constructor(strictness: number) { super(); this.#strictness = strictness; }
  execute(handler: IridisUiEffectHandler): void { handler.setContrastStrictness(this.#strictness); }
}
class SetCvdCorrectionEffect extends IridisUiEffect {
  readonly #selection: CvdCorrectionSelection; readonly type = 'SET_CVD_CORRECT';
  constructor(selection: CvdCorrectionSelection) { super(); this.#selection = selection; }
  execute(handler: IridisUiEffectHandler): void { this.#selection.apply(handler); }
}
class SetDerivationConfigEffect extends IridisUiEffect {
  readonly #config: DerivationConfigInterfaceTypeEntity.Type; readonly type = 'SET_DERIVATION_CONFIG';
  constructor(config: DerivationConfigInterfaceTypeEntity.Type) { super(); this.#config = config; }
  execute(handler: IridisUiEffectHandler): void { handler.setDerivationConfig(this.#config); }
}
class SetFramingEffect extends IridisUiEffect {
  readonly #selection: FramingSelection; readonly type = 'SET_FRAMING';
  constructor(selection: FramingSelection) { super(); this.#selection = selection; }
  execute(handler: IridisUiEffectHandler): void { this.#selection.apply(handler); }
}
class SetImageAlgorithmEffect extends IridisUiEffect {
  readonly #selection: ImageAlgorithmSelection; readonly type = 'SET_IMAGE_ALGORITHM';
  constructor(selection: ImageAlgorithmSelection) { super(); this.#selection = selection; }
  execute(handler: IridisUiEffectHandler): void { this.#selection.apply(handler); }
}
class SetImageChromaRangeEffect extends IridisUiEffect {
  readonly #range: [number, number][]; readonly type = 'SET_IMAGE_CHROMA_RANGE';
  constructor(range: [number, number][]) { super(); this.#range = range; }
  execute(handler: IridisUiEffectHandler): void { handler.setImageChromaRange(this.#range); }
}
class SetImageDeltaECapEffect extends IridisUiEffect {
  readonly #cap: number; readonly type = 'SET_IMAGE_DELTA_E_CAP';
  constructor(cap: number) { super(); this.#cap = cap; }
  execute(handler: IridisUiEffectHandler): void { handler.setImageDeltaECap(this.#cap); }
}
class SetImageHarmonizeEffect extends IridisUiEffect {
  readonly #threshold: number; readonly type = 'SET_IMAGE_HARMONIZE';
  constructor(threshold: number) { super(); this.#threshold = threshold; }
  execute(handler: IridisUiEffectHandler): void { handler.setImageHarmonize(this.#threshold); }
}
class SetImageHistogramBitsEffect extends IridisUiEffect {
  readonly #bits: number; readonly type = 'SET_IMAGE_HISTOGRAM_BITS';
  constructor(bits: number) { super(); this.#bits = bits; }
  execute(handler: IridisUiEffectHandler): void { handler.setImageHistogramBits(this.#bits); }
}
class SetImageKEffect extends IridisUiEffect {
  readonly #k: number; readonly type = 'SET_IMAGE_K';
  constructor(k: number) { super(); this.#k = k; }
  execute(handler: IridisUiEffectHandler): void { handler.setImageK(this.#k); }
}
class SetImageLightnessRangeEffect extends IridisUiEffect {
  readonly #range: [number, number][]; readonly type = 'SET_IMAGE_LIGHTNESS_RANGE';
  constructor(range: [number, number][]) { super(); this.#range = range; }
  execute(handler: IridisUiEffectHandler): void { handler.setImageLightnessRange(this.#range); }
}
class SetRoleSortEffect extends IridisUiEffect {
  readonly #keys: RoleSortKeyType[]; readonly type = 'SET_ROLE_SORT';
  constructor(keys: RoleSortKeyType[]) { super(); this.#keys = keys; }
  execute(handler: IridisUiEffectHandler): void { handler.setRoleSort(this.#keys); }
}
class SetSchemaEffect extends IridisUiEffect {
  readonly #schemaName: string; readonly type = 'SET_SCHEMA';
  constructor(schemaName: string) { super(); this.#schemaName = schemaName; }
  execute(handler: IridisUiEffectHandler): void { handler.setSchema(this.#schemaName); }
}
class SetSeedEffect extends IridisUiEffect {
  readonly #index: number; readonly #hex: string; readonly type = 'SET_SEED';
  constructor(index: number, hex: string) { super(); this.#index = index; this.#hex = hex; }
  execute(handler: IridisUiEffectHandler): void { handler.setSeed(this.#index, this.#hex); }
}
class SetSemanticHuesEffect extends IridisUiEffect {
  readonly #selection: SemanticHuesSelection; readonly type = 'SET_SEMANTIC_HUES_ENABLED';
  constructor(selection: SemanticHuesSelection) { super(); this.#selection = selection; }
  execute(handler: IridisUiEffectHandler): void { this.#selection.apply(handler); }
}
class ToggleCvdPreviewEffect extends IridisUiEffect {
  readonly #cvdType: string; readonly type = 'CVD_TOGGLE_PREVIEW';
  constructor(cvdType: string) { super(); this.#cvdType = cvdType; }
  execute(handler: IridisUiEffectHandler): void { handler.toggleCvdPreview(this.#cvdType); }
}
class ToggleDiagramExpansionEffect extends IridisUiEffect { readonly type = 'DIAGRAM_TOGGLE_EXPAND'; execute(handler: IridisUiEffectHandler): void { handler.toggleDiagramExpansion(); } }
class ZoomDiagramEffect extends IridisUiEffect {
  readonly #factor: number; readonly type = 'DIAGRAM_ZOOM';
  constructor(factor: number) { super(); this.#factor = factor; }
  execute(handler: IridisUiEffectHandler): void { handler.zoomDiagram(this.#factor); }
}
