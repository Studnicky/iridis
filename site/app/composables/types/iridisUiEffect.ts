abstract class IridisUiEffectHandler {
  abstract addSeed(hex: string | undefined): void;
  abstract extractImageFiles(files: File | File[]): void;
  abstract extractSampleImage(): void;
  abstract pinSeedRole(index: number, role: string | undefined): void;
  abstract populatePickerFromImage(hexes: string[]): void;
  abstract removeSeed(index: number): void;
  abstract selectImageCandidate(hexes: string[], label: string): void;
  abstract setDisplayP3ColorSpace(): void;
  abstract setSrgbColorSpace(): void;
  abstract setContrastStrictness(strictness: number): void;
  abstract setCvdMode(cvdMode: string): void;
  abstract setNonMandatoryLevel(nonMandatoryLevel: string): void;
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
  abstract setSchema(schemaName: string): void;
  abstract setSeed(index: number, hex: string): void;
  abstract disableStrictCompliance(): void;
  abstract enableStrictCompliance(): void;
}

abstract class ColorSpaceSelection { abstract apply(handler: IridisUiEffectHandler): void; }
class DisplayP3ColorSpaceSelection extends ColorSpaceSelection { apply(handler: IridisUiEffectHandler): void { handler.setDisplayP3ColorSpace(); } }
class SrgbColorSpaceSelection extends ColorSpaceSelection { apply(handler: IridisUiEffectHandler): void { handler.setSrgbColorSpace(); } }
abstract class FramingSelection { abstract apply(handler: IridisUiEffectHandler): void; }
class DarkFramingSelection extends FramingSelection { apply(handler: IridisUiEffectHandler): void { handler.setDarkFraming(); } }
class LightFramingSelection extends FramingSelection { apply(handler: IridisUiEffectHandler): void { handler.setLightFraming(); } }
abstract class ImageAlgorithmSelection { abstract apply(handler: IridisUiEffectHandler): void; }
class DeltaEImageAlgorithmSelection extends ImageAlgorithmSelection { apply(handler: IridisUiEffectHandler): void { handler.setDeltaEImageAlgorithm(); } }
class KMeansImageAlgorithmSelection extends ImageAlgorithmSelection { apply(handler: IridisUiEffectHandler): void { handler.setKMeansImageAlgorithm(); } }
class MedianCutImageAlgorithmSelection extends ImageAlgorithmSelection { apply(handler: IridisUiEffectHandler): void { handler.setMedianCutImageAlgorithm(); } }
class WuQuantizeImageAlgorithmSelection extends ImageAlgorithmSelection { apply(handler: IridisUiEffectHandler): void { handler.setWuQuantizeImageAlgorithm(); } }

/** A concrete side effect emitted by IridisUiMachine and executed through the UI capability port. */
export abstract class IridisUiEffect {
  abstract readonly type: string;

  get variant(): string {
    const result = this.type;
    return result;
  }

  static addSeed(hex: string | undefined): IridisUiEffect { return new AddSeedEffect(hex); }
  static extractImageFiles(files: File | File[]): IridisUiEffect { return new ExtractImageFilesEffect(files); }
  static extractSampleImage(): IridisUiEffect { return new ExtractSampleImageEffect(); }
  static pinSeedRole(index: number, role: string | undefined): IridisUiEffect { return new PinSeedRoleEffect(index, role); }
  static populatePickerFromImage(hexes: string[]): IridisUiEffect { return new PopulatePickerFromImageEffect(hexes); }
  static removeSeed(index: number): IridisUiEffect { return new RemoveSeedEffect(index); }
  static selectImageCandidate(hexes: string[], label: string): IridisUiEffect { return new SelectImageCandidateEffect(hexes, label); }
  static displayP3ColorSpace(): ColorSpaceSelection { return new DisplayP3ColorSpaceSelection(); }
  static srgbColorSpace(): ColorSpaceSelection { return new SrgbColorSpaceSelection(); }
  static setColorSpace(selection: ColorSpaceSelection): IridisUiEffect { return new SetColorSpaceEffect(selection); }
  static setContrastStrictness(strictness: number): IridisUiEffect { return new SetContrastStrictnessEffect(strictness); }
  static setCvdMode(cvdMode: string): IridisUiEffect { return new SetCvdModeEffect(cvdMode); }
  static disableStrictCompliance(): IridisUiEffect { return new DisableStrictComplianceEffect(); }
  static enableStrictCompliance(): IridisUiEffect { return new EnableStrictComplianceEffect(); }
  static setNonMandatoryLevel(nonMandatoryLevel: string): IridisUiEffect { return new SetNonMandatoryLevelEffect(nonMandatoryLevel); }
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
  static setSchema(schemaName: string): IridisUiEffect { return new SetSchemaEffect(schemaName); }
  static setSeed(index: number, hex: string): IridisUiEffect { return new SetSeedEffect(index, hex); }

  abstract execute(handler: IridisUiEffectHandler): void;
}

class AddSeedEffect extends IridisUiEffect {
  readonly #hex: string | undefined;
  readonly type = 'ADD_SEED';
  constructor(hex: string | undefined) { super(); this.#hex = hex; }
  execute(handler: IridisUiEffectHandler): void { handler.addSeed(this.#hex); }
}
class ExtractImageFilesEffect extends IridisUiEffect {
  readonly #files: File | File[];
  readonly type = 'EXTRACT_IMAGE_FILES';
  constructor(files: File | File[]) { super(); this.#files = files; }
  execute(handler: IridisUiEffectHandler): void { handler.extractImageFiles(this.#files); }
}
class ExtractSampleImageEffect extends IridisUiEffect { readonly type = 'EXTRACT_SAMPLE_IMAGE'; execute(handler: IridisUiEffectHandler): void { handler.extractSampleImage(); } }
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
class SetCvdModeEffect extends IridisUiEffect {
  readonly #cvdMode: string; readonly type = 'SET_CVD_MODE';
  constructor(cvdMode: string) { super(); this.#cvdMode = cvdMode; }
  execute(handler: IridisUiEffectHandler): void { handler.setCvdMode(this.#cvdMode); }
}
class DisableStrictComplianceEffect extends IridisUiEffect {
  readonly type = 'DISABLE_STRICT_COMPLIANCE';
  execute(handler: IridisUiEffectHandler): void { handler.disableStrictCompliance(); }
}
class EnableStrictComplianceEffect extends IridisUiEffect {
  readonly type = 'ENABLE_STRICT_COMPLIANCE';
  execute(handler: IridisUiEffectHandler): void { handler.enableStrictCompliance(); }
}
class SetNonMandatoryLevelEffect extends IridisUiEffect {
  readonly #nonMandatoryLevel: string; readonly type = 'SET_NON_MANDATORY_LEVEL';
  constructor(nonMandatoryLevel: string) { super(); this.#nonMandatoryLevel = nonMandatoryLevel; }
  execute(handler: IridisUiEffectHandler): void { handler.setNonMandatoryLevel(this.#nonMandatoryLevel); }
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
