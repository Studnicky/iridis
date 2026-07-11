/**
 * Shared iridis engine state. Two mutually-exclusive modes — a color picker and
 * an image extractor — each with its own palette; switching modes swaps which
 * palette themes the page. Every color (roles AND the 50→950 scales) is produced
 * by engine.run(): scales come from derive:variant tonal steps, semantic hues
 * from hueOffset on the schema roles. The projector only reads those hexes.
 */

import type { CvdType } from '@studnicky/iridis';
import type { RoleDefinitionInterfaceType, RoleSchemaInterfaceType } from '@studnicky/iridis/model';

import { coreTasks, Engine } from '@studnicky/iridis';
import { contrastPlugin } from '@studnicky/iridis-contrast';
import { imagePlugin } from '@studnicky/iridis-image';
import { computed, ref, watch } from 'vue';

import type {
  DerivationConfig, FramingType, GalleryAlgorithmType, HistogramBinType, IridisUiEffectType, ModeType, PickerSeedType, RoleHexMapType, RoleViewType, ScaleMapType
} from './types/index.ts';
import { IridisUiActionType, IridisUiEffectVariant, PRESET_DEFAULTS } from './types/index.ts';

type MutateSeedsEffectType = Extract<IridisUiEffectType, { 'variant': IridisUiEffectVariant.MUTATE_SEEDS }>;
type SetPaletteParamEffectType = Extract<IridisUiEffectType, { 'variant': IridisUiEffectVariant.SET_PALETTE_PARAM }>;
type ExtractImageEffectType = Extract<IridisUiEffectType, { 'variant': IridisUiEffectVariant.EXTRACT_IMAGE }>;
type PinSeedRoleEffectType = Extract<IridisUiEffectType, { 'variant': IridisUiEffectVariant.PIN_SEED_ROLE }>;
type UpdateDiagramViewEffectType = Extract<IridisUiEffectType, { 'variant': IridisUiEffectVariant.UPDATE_DIAGRAM_VIEW }>;
type UpdateCvdPreviewEffectType = Extract<IridisUiEffectType, { 'variant': IridisUiEffectVariant.UPDATE_CVD_PREVIEW }>;
type PopulatePickerFromImageEffectType = Extract<IridisUiEffectType, { 'variant': IridisUiEffectVariant.POPULATE_PICKER_FROM_IMAGE }>;

import { applyDerivedColors } from '../theme/ApplyDerivedColors.ts';
import { intakeHexHint } from '../theme/IntakeHexHint.ts';
import { pinDerivedRoles } from '../theme/PinDerivedRoles.ts';
import { roleSchemaByName } from '../theme/RoleSchemaByName.ts';
import { Tokens } from '../theme/Tokens.ts';
import { useIridisUiMachine } from './useIridisUiMachine.ts';

/** Mirrors CodeBlock.vue's role(...) lookups — the only other place a role is read by name. */
const CODE_BLOCK_ROLES = [
  'code-bg', 'syntax-comment', 'syntax-string', 'syntax-number', 'syntax-function',
  'syntax-attribute', 'syntax-keyword', 'syntax-punctuation', 'syntax-type'
];
/** Every role name actually consumed somewhere on the page (Tokens.ts + CodeBlock.vue) — the ground truth for pinnable roles. */
const USED_ROLE_NAMES = new Set([...Tokens.candidateRoleNames(), ...CODE_BLOCK_ROLES]);

/** Absolute OKLCH lightness per shade — resolved through the engine, not here. */
const SHADE_L: Record<number, number> = {
  '100': 0.955, '200': 0.915, '300': 0.855, '400': 0.775, '50': 0.985, '500': 0.685,
  '600': 0.595, '700': 0.505, '800': 0.415, '900': 0.335, '950': 0.235
};
const VARIANT_CONFIG = Tokens.SHADE_KEYS.map((s) => {return { 'invertLightness': false, 'lightnessTarget': SHADE_L[s]!, 'name': `s${s}` };});

/**
 * Semantic hue targets, applied as a BOUNDED nudge (the engine rotates each role
 * toward the target by at most SEMANTIC_HUE_CLAMP degrees). This keeps success/
 * warning/error/info rooted in the actual palette — a red-dominant image yields
 * warm-leaning semantics rather than pure green/blue that appear nowhere in it.
 * Schema authoring; the engine still resolves the real color.
 */
const SEMANTIC_HUE: Record<string, number> = { 'error': 25, 'info': 230, 'success': 160, 'warning': 60 };
const SEMANTIC_HUE_CLAMP = 90;

/**
 * Exported so PipelineExplainer.vue can walk the same stage order and pull each
 * task's own manifest. pin:derivedRoles runs between resolve:roles and
 * expand:family — see PinDerivedRoles.ts for why that ordering is load-bearing.
 * This is the full superset of stages (required + every optional check) for
 * documentation purposes; the actual per-run pipeline is built by
 * buildPipeline() below from REQUIRED_*_STAGES plus whichever OPTIONAL_STAGE_NAMES
 * are currently enabled.
 */
export const COLOR_PIPELINE = [
  'intake:hexHint', 'resolve:roles', 'pin:derivedRoles', 'derive:colors', 'expand:family',
  'enforce:contrast', 'enforce:wcagAA', 'enforce:wcagAAA', 'enforce:apca', 'enforce:cvdSimulate',
  'derive:variant'
];
/** enforce:cvdSimulate is always on, not user-toggleable — CVD accessibility
 * reporting/correction isn't opt-in the way the other standards are. */
const REQUIRED_COLOR_STAGES = [
  'intake:hexHint', 'resolve:roles', 'pin:derivedRoles', 'derive:colors', 'expand:family',
  'enforce:contrast', 'enforce:cvdSimulate', 'derive:variant'
];
const REQUIRED_IMAGE_STAGES = [
  'intake:imagePixels', 'gallery:histogram', 'gallery:extract', 'gallery:harmonize',
  'resolve:roles', 'derive:colors', 'expand:family', 'enforce:contrast', 'enforce:cvdSimulate', 'derive:variant'
];

/** Toggleable contrast checks, in the order they slot in after enforce:contrast. */
export const OPTIONAL_STAGE_NAMES: readonly string[] = ['enforce:wcagAA', 'enforce:wcagAAA', 'enforce:apca'];

/** Which optional stages currently run based on strictness. */
const enabledOptionalStages = computed<Set<string>>(() => {
  if (contrastStrictness.value === 0) {return new Set(['enforce:wcagAA']);}
  if (contrastStrictness.value === 1) {return new Set(['enforce:wcagAAA']);}
  if (contrastStrictness.value === 2) {return new Set(['enforce:apca']);}
  return new Set();
});

/** Slots the currently-enabled optional stages into `required` right after enforce:contrast. */
function buildPipeline(required: readonly string[]): string[] {
  const idx = required.indexOf('enforce:contrast');
  const optional = OPTIONAL_STAGE_NAMES.filter((n) => {return enabledOptionalStages.value.has(n);});
  const result = [...required];
  result.splice(idx + 1, 0, ...optional);
  return result;
}

const engine = new Engine();
for (const t of coreTasks) {engine.tasks.register(t);}
engine.tasks.register(intakeHexHint);
engine.tasks.register(pinDerivedRoles);
engine.tasks.register(applyDerivedColors);
engine.adopt(contrastPlugin);
engine.adopt(imagePlugin);

/** Author hue targets onto the schema's semantic roles (engine resolves them). */
function withSemanticHues(schema: RoleSchemaInterfaceType): RoleSchemaInterfaceType {
  return {
    ...schema,
    'roles': schema.roles.map((r: RoleDefinitionInterfaceType) =>
    {return (SEMANTIC_HUE[r.name] !== undefined)
      ? { ...r, 'hue': SEMANTIC_HUE[r.name], 'hueClamp': SEMANTIC_HUE_CLAMP }
      : r;})
  };
}

/* ─── shared reactive state ─── */
const {
  'registerExtractImageHandler': registerExtractImageHandler, 'registerMutateSeedsHandler': registerMutateSeedsHandler,
  'registerPinSeedRoleHandler': registerPinSeedRoleHandler, 'registerSetPaletteParamHandler': registerSetPaletteParamHandler,
  'registerUpdateDiagramViewHandler': registerUpdateDiagramViewHandler, 'registerUpdateCvdPreviewHandler': registerUpdateCvdPreviewHandler,
  'registerPopulatePickerFromImageHandler': registerPopulatePickerFromImageHandler,
  'send': sendUiEvent, 'state': uiState
} = useIridisUiMachine();
/** Derived from the shared UI FSM so ModeSwitch and image-drop mode changes stay in sync with the carousel. */
const mode = computed<ModeType>({
  'get': () => { const result = uiState.value.mode; return result; },
  'set': (m) => { const result = sendUiEvent({ 'mode': m, 'type': IridisUiActionType.SELECT_MODE }); return result; }
});
const pickerSeeds = ref<PickerSeedType[]>([]);
const imageSeeds = ref<string[]>([]);
const framing = ref<FramingType>('dark');
const schemaName = ref<string>('iridis-32');
const contrastStrictness = ref<number>(2);
const colorSpace = ref<'srgb' | 'displayP3'>('srgb');
/**
 * CVD "correct" mode flag, threaded through as `input.contrast.cvdCorrect` —
 * when true, enforce:cvdSimulate (packages/contrast) auto-corrects failing
 * pairs instead of only warning. Off by default.
 */
const cvdCorrect = ref<boolean>(false);

/**
 * Color derivation configuration — allows users to select hue algorithms
 * (monochromatic, complementary, analogous, etc.) for each role. Passed
 * through metadata to ApplyDerivedColors task in the pipeline.
 */
const derivationConfig = ref<DerivationConfig>(PRESET_DEFAULTS['automatic']);

/**
 * Visual CVD preview — purely a display-time filter over whatever the engine
 * already resolved, genuinely independent of `cvdCorrect`. This is the "see
 * it as an afflicted person would" toggle; `cvdCorrect` is the "fix the
 * colors so everyone can distinguish them" toggle. Neither implies the
 * other: a user can correct without previewing (never sees simulated
 * vision, just sees their palette get more distinguishable), preview
 * without correcting (sees the CURRENT palette through a CVD filter,
 * unmodified), or both. A `Set` because real CVD isn't always a single
 * condition — combined/comorbid deficiencies exist, so more than one type
 * can be active at once (CvdPreviewOverlay.vue chains their filters).
 * Empty = preview off. Consumed by a display-layer component, not by the
 * engine pipeline — changing it never triggers a recompute.
 */
const cvdPreviewTypes = ref<Set<CvdType>>(new Set());

/** Diagram view state (zoom level, pan offset, expanded fullscreen mode). */
const diagramScale = ref<number>(1);
const diagramTranslateX = ref<number>(0);
const diagramTranslateY = ref<number>(0);
const diagramIsExpanded = ref<boolean>(false);

const roles = ref<RoleHexMapType>({});
const roleViews = ref<RoleViewType[]>([]);
const roleClamps = ref<Record<string, { seedHex: string, seedOklch: {l: number, c: number, h: number}, resolvedHex: string, resolvedOklch: {l: number, c: number, h: number} }>>({});
const roleDistances = ref<Record<string, Record<string, number>>>({});
const rolesSynthesized = ref<string[]>([]);
const rolesPinned = ref<string[]>([]);
const rolesDerived = ref<string[]>([]);
const scales = ref<ScaleMapType>({});
const histogram = ref<HistogramBinType[]>([]);
const running = ref<boolean>(false);
const error = ref<string | null>(null);

/** Raw contrast-check metadata from the last run, keyed by the same metadata names the contrastPlugin tasks write. */
const contrastReport = ref<{ 'aa'?: unknown; 'aaa'?: unknown; 'apca'?: unknown; 'cvd'?: unknown }>({});

/* Image-extraction controls (mirror the engine's gallery config knobs). */
const imgAlgorithm = ref<GalleryAlgorithmType>('delta-e');
const imgK = ref<number>(8);
const imgHistogramBits = ref<number>(5);
const imgDeltaECap = ref<number>(128);
const imgHarmonize = ref<number>(10);
const imgLightnessRange = ref<[number, number]>([0, 1]);
const imgChromaRange = ref<[number, number]>([0, 0.5]);
const lastImageSrc = ref<string | null>(null);

const activeSeeds = computed<(string | PickerSeedType)[]>(() => {return (mode.value === 'image' ? imageSeeds.value : pickerSeeds.value);});

/**
 * Role names a seed can actually be pinned to for the active schema+framing —
 * restricted to USED_ROLE_NAMES so the list matches roles the demo page really
 * renders somewhere distinct (a Nuxt UI alias, a --ui-* CSS var, a syntax-*
 * token color), not just whatever the schema happens to declare. Both
 * independently-resolved roles (background/text/brand/muted/error) AND
 * schema-derived ones (success/warning/info/accent-alt/syntax-*) work now —
 * pin:derivedRoles (in the pipeline between resolve:roles and expand:family)
 * overrides ExpandFamily's hue-rotation for whichever role a seed is pinned to.
 */
const pinnableRoles = computed<string[]>(() => {
  const pair = roleSchemaByName[schemaName.value] ?? roleSchemaByName['iridis-32'];
  const schema = pair?.[framing.value];
  if (schema === undefined) {return [];}
  return schema.roles.filter((r) => {return USED_ROLE_NAMES.has(r.name);}).map((r) => {return r.name;});
});

function ingest(state: { 'metadata': Record<string, unknown>; 'roles': Record<string, { 'hex': string; 'oklch': { 'c': number; 'h': number; 'l': number; } }>; 'variants': Record<string, Record<string, { 'hex': string }>> }): void {
  const roleHex: RoleHexMapType = {};
  const views: RoleViewType[] = [];
  for (const [name, r] of Object.entries(state.roles)) {
    roleHex[name] = r.hex;
    views.push({ 'c': r.oklch.c, 'h': r.oklch.h, 'hex': r.hex, 'l': r.oklch.l, 'name': name });
  }
  const sc: ScaleMapType = {};
  for (const s of Tokens.SHADE_KEYS) {
    const variant = state.variants[`s${s}`];
    if (variant === undefined) {continue;}
    const perShade: RoleHexMapType = {};
    for (const [name, rec] of Object.entries(variant)) {perShade[name] = rec.hex;}
    sc[s] = perShade;
  }
  roles.value = roleHex;
  roleViews.value = views;
  roleClamps.value = (state.metadata['core:roleClamps'] as any) || {};
  roleDistances.value = (state.metadata['core:roleDistances'] as any) || {};
  rolesSynthesized.value = (state.metadata['core:rolesSynthesized'] as any) || [];
  rolesPinned.value = (state.metadata['core:rolesPinned'] as any) || [];
  rolesDerived.value = (state.metadata['core:rolesDerived'] as any) || [];
  scales.value = sc;
  contrastReport.value = {
    'aa':   state.metadata['contrast:aa'],
    'aaa':  state.metadata['contrast:aaa'],
    'apca': state.metadata['contrast:apca'],
    'cvd':  state.metadata['contrast:cvd']
  };
  if (typeof document !== 'undefined') {
    Tokens.apply(Tokens.mapFromEngine(roleHex, sc), framing.value);
  }
}

/**
 * `framingOverride`, when given, is the target framing of an in-flight
 * dark/light swap: the engine resolves the FULL new token set against it
 * BEFORE `framing.value` (and therefore `<html class="dark">`, read
 * directly off that ref in app.vue) ever changes. Only once the new state
 * is ready do we commit `framing.value` and call `ingest()` — one
 * synchronous block, so the class toggle and the actual color repaint land
 * in the same tick instead of the class flipping instantly while the old
 * colors linger for a debounce window.
 */
function run(framingOverride?: FramingType): void {
  const targetFraming = framingOverride ?? framing.value;
  const pair = roleSchemaByName[schemaName.value] ?? roleSchemaByName['iridis-32'];
  if (pair === undefined || activeSeeds.value.length === 0) {return;}
  running.value = true;
  error.value = null;
  try {
    engine.pipeline(buildPipeline(REQUIRED_COLOR_STAGES));
    const state = engine.run({
      'colors':   activeSeeds.value,
      'contrast': { 'algorithm': contrastStrictness.value === 2 ? 'apca' : 'wcag21', 'cvdCorrect': cvdCorrect.value, 'level': contrastStrictness.value === 0 ? 'AA' : (contrastStrictness.value === 1 ? 'AAA' : 'Lc') },
      'metadata': { 'core:variantConfig': VARIANT_CONFIG, 'derivation:config': derivationConfig.value },
      'roles':    withSemanticHues(pair[targetFraming]),
      'runtime':  { 'colorSpace': colorSpace.value, 'framing': targetFraming }
    });
    if (framingOverride !== undefined) {
      framing.value = framingOverride;
      if (typeof document !== 'undefined') {
        document.documentElement.classList.add('is-switching-theme');
        if (framingOverride === 'dark') {
          document.documentElement.classList.add('dark');
        } else {
          document.documentElement.classList.remove('dark');
        }
        setTimeout(() => {
          document.documentElement.classList.remove('is-switching-theme');
        }, 180); // slightly longer than --iridis-tune (150ms)
      }
    }
    ingest(state);
    if (typeof document !== 'undefined') {
      Tokens.apply(Tokens.mapFromEngine(roles.value, scales.value), targetFraming);
    }
  } catch (e) {
    error.value = e instanceof Error ? e.message : String(e);
  } finally {
    running.value = false;
  }
}

/** Decode an image source into raw pixel data, downscaled for the gallery pipeline. */
class ToPixels {
  static async decode(src: string): Promise<{ 'data': Uint8ClampedArray; 'height': number; 'width': number; }> {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    await new Promise<void>((resolve, reject) => {
      img.onload = () => { const result = resolve(); return result; };
      img.onerror = () => { const result = reject(new Error('Image load failed')); return result; };
      img.src = src;
    });
    const MAX = 180;
    const long = Math.max(img.naturalWidth, img.naturalHeight);
    const scale = long > MAX ? MAX / long : 1;
    const w = Math.max(1, Math.round(img.naturalWidth * scale));
    const h = Math.max(1, Math.round(img.naturalHeight * scale));
    const canvas = document.createElement('canvas');
    canvas.width = w; canvas.height = h;
    const ctx = canvas.getContext('2d', { 'willReadFrequently': true });
    if (ctx === null) {throw new Error('no 2D context');}
    ctx.drawImage(img, 0, 0, w, h);
    return { 'data': ctx.getImageData(0, 0, w, h).data, 'height': h, 'width': w };
  }
}

/** Extracts dominant hues from image to populate picker palette. */
class FromImage {
  /** Decode image and extract N hues matching schema count; populate picker seeds. */
  static async extract(fileOrUrl: File | string): Promise<void> {
    if (typeof document === 'undefined') {return;}
    running.value = true;
    error.value = null;
    try {
      const src = typeof fileOrUrl === 'string' ? fileOrUrl : URL.createObjectURL(fileOrUrl);
      lastImageSrc.value = src;
      const pixels = await ToPixels.decode(src);
      const pair = roleSchemaByName[schemaName.value] ?? roleSchemaByName['iridis-32'];
      engine.pipeline(buildPipeline(REQUIRED_IMAGE_STAGES));
      const state = engine.run({
        'colors':   [pixels],
        'contrast': { 'algorithm': contrastStrictness.value === 2 ? 'apca' : 'wcag21', 'cvdCorrect': cvdCorrect.value, 'level': contrastStrictness.value === 0 ? 'AA' : (contrastStrictness.value === 1 ? 'AAA' : 'Lc') },
        'metadata': {
          'core:variantConfig': VARIANT_CONFIG,
          'derivation:config': derivationConfig.value,
          'gallery': {
            'algorithm':          imgAlgorithm.value,
            'chromaRange':        [...imgChromaRange.value] as [number, number],
            'deltaECap':          imgDeltaECap.value,
            'harmonizeThreshold': imgHarmonize.value,
            'histogramBits':      imgHistogramBits.value,
            'k':                  imgK.value,
            'lightnessRange':     [...imgLightnessRange.value] as [number, number]
          }
        },
        'roles':    withSemanticHues(pair![framing.value]),
        'runtime':  { 'colorSpace': colorSpace.value, 'framing': framing.value }
      });
      const hist = (state.metadata['gallery:histogram'] as { 'bins'?: HistogramBinType[] } | undefined)?.bins ?? [];
      histogram.value = [...hist].sort((a, b) => {return b.weight - a.weight;}).slice(0, 96);
      const dominant = (state.metadata['gallery:dominantColors'] as { 'hex': string }[] | undefined) ?? [];
      const schemaCount = parseInt(schemaName.value.replace('iridis-', ''), 10) || 32;
      const extracted = dominant.map((c) => { const result = c.hex; return result; }).filter((hex) => { const result = /^#[0-9a-fA-F]{6}$/.test(hex); return result; }).slice(0, schemaCount);
      imageSeeds.value = extracted;
      sendUiEvent({ 'hues': extracted, 'type': IridisUiActionType.POPULATE_PICKER_FROM_IMAGE });
      ingest(state);
    } catch (e) {
      error.value = e instanceof Error ? e.message : String(e);
    } finally {
      running.value = false;
    }
  }
}

/**
 * Performs the picker-seed array mutation for the FSM's MUTATE_SEEDS effect.
 * Registered once below via registerMutateSeedsHandler — PalettePlayground.vue
 * triggers this indirectly via useIridisUiMachine().send({type: IridisUiActionType.ADD_SEED|...}),
 * never by calling array mutation directly.
 */
function mutateSeeds(effect: MutateSeedsEffectType): void {
  if (effect.op === 'add') {
    if (pickerSeeds.value.length < 32) {pickerSeeds.value = [...pickerSeeds.value, { 'hex': effect.hex ?? '#888888' }];}
  } else if (effect.op === 'remove') {
    if (pickerSeeds.value.length > 1) {pickerSeeds.value = pickerSeeds.value.filter((_, idx) => {return idx !== effect.index;});}
  } else if (effect.op === 'set') {
    pickerSeeds.value = pickerSeeds.value.map((s, idx) => {return (idx === effect.index ? { ...s, 'hex': effect.hex } : s);});
  }
}
registerMutateSeedsHandler(mutateSeeds);

/**
 * Performs the seed-role pin/unpin mutation for the FSM's PIN_SEED_ROLE effect.
 * Pinning attaches `hints.role` (via IntakeHexHint) so ResolveRoles assigns that
 * seed to the named role directly instead of by nearest-OKLCH-distance.
 * Ensures that a role can only be pinned to one seed at a time.
 */
function pinSeedRole(effect: PinSeedRoleEffectType): void {
  pickerSeeds.value = pickerSeeds.value.map((s, idx) => {
    if (effect.role && s.role === effect.role && idx !== effect.index) {
      return { ...s, role: undefined };
    }
    return (idx === effect.index ? { ...s, 'role': effect.role } : s);
  });
}
registerPinSeedRoleHandler(pinSeedRole);

/**
 * Performs the framing/schemaName/contrastLevel/imgAlgorithm mutation for the
 * FSM's SET_PALETTE_PARAM effect. Registered below via
 * registerSetPaletteParamHandler — components send SET_FRAMING/SET_SCHEMA/
 * SET_CONTRAST/SET_IMAGE_ALGORITHM events rather than assigning these refs directly.
 */
function setPaletteParam(effect: SetPaletteParamEffectType): void {
  // Framing swaps skip the debounce entirely — see run()'s framingOverride doc.
  // Everything else still goes through the debounced schedule() below.
  if (effect.op === 'framing') {run(effect.value);}
  else if (effect.op === 'schemaName') {schemaName.value = effect.value;}
  else if (effect.op === 'strictness') {contrastStrictness.value = effect.value;}
  else if (effect.op === 'colorSpace') {colorSpace.value = effect.value;}
  else if (effect.op === 'cvdCorrect') {cvdCorrect.value = effect.value;}
  else if (effect.op === 'imgAlgorithm') {imgAlgorithm.value = effect.value;}
  else if (effect.op === 'imgK') {imgK.value = effect.value;}
  else if (effect.op === 'imgHistogramBits') {imgHistogramBits.value = effect.value;}
  else if (effect.op === 'imgDeltaECap') {imgDeltaECap.value = effect.value;}
  else if (effect.op === 'imgHarmonize') {imgHarmonize.value = effect.value;}
  else if (effect.op === 'imgLightnessRange') {imgLightnessRange.value = effect.value;}
  else if (effect.op === 'imgChromaRange') {imgChromaRange.value = effect.value;}
  else if (effect.op === 'derivation') {derivationConfig.value = effect.value;}
}
registerSetPaletteParamHandler(setPaletteParam);

/**
 * Performs diagram view state mutations (zoom, pan, expand/collapse) for the
 * FSM's UPDATE_DIAGRAM_VIEW effect. MermaidDiagram.vue sends DIAGRAM_* events
 * rather than mutating scale/translate/isExpanded directly.
 */
function updateDiagramView(effect: UpdateDiagramViewEffectType): void {
  if (effect.op === 'zoom') {
    diagramScale.value = Math.min(8, Math.max(0.05, diagramScale.value * effect.factor));
  } else if (effect.op === 'pan') {
    diagramTranslateX.value += effect.dx;
    diagramTranslateY.value += effect.dy;
  } else if (effect.op === 'reset' || effect.op === 'fit') {
    diagramScale.value = 1;
    diagramTranslateX.value = 0;
    diagramTranslateY.value = 0;
  } else if (effect.op === 'toggleExpand') {
    diagramIsExpanded.value = !diagramIsExpanded.value;
  }
}
registerUpdateDiagramViewHandler(updateDiagramView);

/**
 * Performs CVD preview type mutations (toggle/clear) for the FSM's
 * UPDATE_CVD_PREVIEW effect. CvdVision.vue sends CVD_* events rather than
 * mutating cvdPreviewTypes directly.
 */
function updateCvdPreview(effect: UpdateCvdPreviewEffectType): void {
  if (effect.op === 'toggle') {
    const next = new Set(cvdPreviewTypes.value);
    if (next.has(effect.cvdType as CvdType)) {
      next.delete(effect.cvdType as CvdType);
    } else {
      next.add(effect.cvdType as CvdType);
    }
    cvdPreviewTypes.value = next;
  } else if (effect.op === 'clear') {
    cvdPreviewTypes.value = new Set();
  }
}
registerUpdateCvdPreviewHandler(updateCvdPreview);

/**
 * Populates picker palette from extracted hues. Called when image extraction
 * completes or when extraction settings change, replacing picker seeds with
 * the N extracted hues (where N = schema count).
 */
function populatePickerFromImage(effect: PopulatePickerFromImageEffectType): void {
  pickerSeeds.value = effect.hues.map((hex) => ({ 'hex': hex }));
}
registerPopulatePickerFromImageHandler(populatePickerFromImage);

/** Mirrors HeroBanner.vue's `${base}logo.png` resolution — the sample extraction source. */
function logoUrl(): string {
  const base = useRuntimeConfig().app.baseURL;
  return `${base}logo.png`;
}

/**
 * Performs image extraction for the FSM's EXTRACT_IMAGE effect (an uploaded
 * file, or the built-in sample — the iridis logo). Registered below via
 * registerExtractImageHandler — ImageMode.vue sends EXTRACT_IMAGE events
 * rather than calling FromImage.extract directly.
 */
async function extractImageEffect(effect: ExtractImageEffectType): Promise<void> {
  const src = effect.source === 'file' ? effect.file : logoUrl();
  await FromImage.extract(src);
}
registerExtractImageHandler(extractImageEffect);

let booted = false;
let timer: ReturnType<typeof setTimeout> | undefined;
function schedule(): void {
  if (typeof window === 'undefined') {return;}
  if (timer !== undefined) {clearTimeout(timer);}
  timer = setTimeout(() => { run(); }, 120);
}

let extractTimer: ReturnType<typeof setTimeout> | undefined;
function scheduleReextract(): void {
  if (typeof window === 'undefined' || lastImageSrc.value === null) {return;}
  if (extractTimer !== undefined) {clearTimeout(extractTimer);}
  extractTimer = setTimeout(() => { void FromImage.extract(lastImageSrc.value!); }, 180);
}

export function useIridis() {
  if (!booted) {
    booted = true;
    // Runs on the server too: engine.run() is pure computation.
    // This makes the SSR-rendered palette identical to the client's,
    // so hydration never has to re-theme the page.
    run();
    if (typeof window !== 'undefined') {
      // framing is intentionally absent here — its swap is dispatched synchronously
      // by setPaletteParam() via run(effect.value), not through this debounce.
      watch([pickerSeeds, imageSeeds, schemaName, contrastStrictness, colorSpace, mode, enabledOptionalStages, cvdCorrect, derivationConfig], schedule, { 'deep': true });
      watch([schemaName, imgAlgorithm, imgK, imgHistogramBits, imgDeltaECap, imgHarmonize, imgLightnessRange, imgChromaRange], scheduleReextract, { 'deep': true });
    }
  }
  return {
    'activeSeeds': activeSeeds, 'contrastStrictness': contrastStrictness, 'colorSpace': colorSpace, 'contrastReport': contrastReport, 'cvdCorrect': cvdCorrect,
    'cvdPreviewTypes': cvdPreviewTypes, 'derivationConfig': derivationConfig,
    'diagramIsExpanded': diagramIsExpanded, 'diagramScale': diagramScale, 'diagramTranslateX': diagramTranslateX, 'diagramTranslateY': diagramTranslateY,
    'enabledOptionalStages': enabledOptionalStages, 'error': error, 'framing': framing, 'histogram': histogram,
    'imageSeeds': imageSeeds, 'imgAlgorithm': imgAlgorithm, 'imgChromaRange': imgChromaRange, 'imgDeltaECap': imgDeltaECap, 'imgHarmonize': imgHarmonize, 'imgHistogramBits': imgHistogramBits,
    'imgK': imgK, 'imgLightnessRange': imgLightnessRange, 'lastImageSrc': lastImageSrc, 'mode': mode, 'pickerSeeds': pickerSeeds, 'pinnableRoles': pinnableRoles,
    'roles': roles, 'roleViews': roleViews, 'roleClamps': roleClamps,
    'roleDistances': roleDistances,
    'rolesSynthesized': rolesSynthesized,
    'rolesPinned': rolesPinned,
    'rolesDerived': rolesDerived,
    'run': run, 'running': running, 'scales': scales, 'schemaName': schemaName, 'send': sendUiEvent
  };
}
