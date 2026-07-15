/**
 * Shared iridis engine state. Two mutually-exclusive modes — a color picker and
 * an image extractor — each with its own palette; switching modes swaps which
 * palette themes the page. Every color (roles AND the 50→950 scales) is produced
 * by engine.run(): scales come from derive:variant tonal steps, semantic hues
 * from hueOffset on the schema roles. The projector only reads those hexes.
 */

import type { CvdType, RoleClampMapInterfaceType, RoleDistanceMapInterfaceType } from '@studnicky/iridis';
import type { ApcaPairResultSetInterfaceType, CvdResultSetInterfaceType, WcagPairResultSetInterfaceType } from '@studnicky/iridis-contrast';
import type { GalleryAlgorithmType, GalleryCandidateInterfaceType, GalleryHistogramSlotInterfaceType } from '@studnicky/iridis-image/types';

import { getEngineMetadata } from '@studnicky/iridis';
import { getContrastMetadata } from '@studnicky/iridis-contrast';
import { imagePlugin } from '@studnicky/iridis-image';
import { computed, ref, watch } from 'vue';

import type {
  DerivationConfigType, FramingType, IridisUiEffectType, IridisUiEffectVariant, ModeType, PickerSeedType, RoleHexMapType, RoleRelationDerivationType, RoleViewType, ScaleMapType
  , UploadedImageInterfaceType } from './types/index.ts';
import type { RoleSortableRowType } from './types/roleSortableRow.ts';
import type { RoleSortKeyType } from './types/roleSortKey.ts';

import { contrastRatio } from '../theme/ContrastRatio.ts';
import { cloneRanges } from '../utils/cloneRanges.ts';
import { complianceFor } from '../utils/complianceFor.ts';
import { debounce, keyedDebounce } from '../utils/debounce.ts';
import { isValidHex } from '../utils/isValidHex.ts';
import { minRatioForRole } from '../utils/minRatioForRole.ts';
import { sortRoleRows } from '../utils/sortRoleRows.ts';
import { contrastConfigFor } from './contrastConfigFor.ts';
import { createColorEngine } from './createColorEngine.ts';
import { optionalContrastStages } from './optionalContrastStages.ts';
import { REQUIRED_COLOR_STAGES } from './requiredColorStages.ts';
import { schemaRoleCount } from './schemaRoleCount.ts';
import { spliceOptionalStages } from './spliceOptionalStages.ts';
import { DEFAULT_DERIVATION_CONFIG, DEFAULT_SCHEMA_NAME, IridisUiActionType } from './types/index.ts';
import { VARIANT_CONFIG } from './variantConfig.ts';

type MutateSeedsEffectType = Extract<IridisUiEffectType, { 'variant': IridisUiEffectVariant.MUTATE_SEEDS }>;
type SetPaletteParamEffectType = Extract<IridisUiEffectType, { 'variant': IridisUiEffectVariant.SET_PALETTE_PARAM }>;
type ExtractImageEffectType = Extract<IridisUiEffectType, { 'variant': IridisUiEffectVariant.EXTRACT_IMAGE }>;
type PinSeedRoleEffectType = Extract<IridisUiEffectType, { 'variant': IridisUiEffectVariant.PIN_SEED_ROLE }>;
type UpdateDiagramViewEffectType = Extract<IridisUiEffectType, { 'variant': IridisUiEffectVariant.UPDATE_DIAGRAM_VIEW }>;
type UpdateCvdPreviewEffectType = Extract<IridisUiEffectType, { 'variant': IridisUiEffectVariant.UPDATE_CVD_PREVIEW }>;
type PopulatePickerFromImageEffectType = Extract<IridisUiEffectType, { 'variant': IridisUiEffectVariant.POPULATE_PICKER_FROM_IMAGE }>;
type NavigateToTargetEffectType = Extract<IridisUiEffectType, { 'variant': IridisUiEffectVariant.NAVIGATE_TO_TARGET }>;
type SelectImageCandidateEffectType = Extract<IridisUiEffectType, { 'variant': IridisUiEffectVariant.SELECT_IMAGE_CANDIDATE }>;

import { roleSchemaByName } from '../theme/RoleSchemaByName.ts';
import { Tokens } from '../theme/Tokens.ts';
import { useIridisUiMachine } from './useIridisUiMachine.ts';
import { useNavigationTargets } from './useNavigationTargets.ts';

/** Mirrors CodeBlock.vue's role(...) lookups — the only other place a role is read by name. */
const CODE_BLOCK_ROLES = [
  'code-bg', 'syntax-comment', 'syntax-string', 'syntax-number', 'syntax-function',
  'syntax-attribute', 'syntax-keyword', 'syntax-punctuation', 'syntax-type'
];
/** Every role name actually consumed somewhere on the page (Tokens.ts + CodeBlock.vue) — the ground truth for pinnable roles. */
const USED_ROLE_NAMES = new Set([...Tokens.candidateRoleNames(), ...CODE_BLOCK_ROLES]);

/**
 * The COMBINE stage's pipeline — runs over the already-per-image-reduced hex
 * list (Stage 1 output concatenated across every uploaded image), not raw
 * pixels, hence `intake:any` rather than `intake:imagePixels`.
 */
const REQUIRED_IMAGE_STAGES = [
  'intake:any', 'gallery:histogram', 'gallery:extractCandidates', 'gallery:extract', 'gallery:harmonize',
  'derive:semanticHues', 'resolve:roles', 'derive:roleRelations', 'expand:family', 'enforce:contrast', 'enforce:cvdSimulate', 'derive:variant'
];
/** Stage 1 — reduces ONE image's own pixels to its own dominant colors AND its own per-algorithm candidates, independent of every other uploaded image. */
const IMAGE_ENTRY_STAGES = ['intake:any', 'gallery:histogram', 'gallery:extractCandidates', 'gallery:extract'];

/** All four clustering algorithms, explicit — gallery:extractCandidates' own built-in default only covers three (median-cut/k-means/delta-e), omitting wu-quantize. */
const ALL_CANDIDATE_ALGORITHMS: readonly { 'algorithm': GalleryAlgorithmType }[] = [
  { 'algorithm': 'median-cut' },
  { 'algorithm': 'wu-quantize' },
  { 'algorithm': 'k-means' },
  { 'algorithm': 'delta-e' }
];

/** Which optional stages currently run based on strictness. */
const enabledOptionalStages = computed<Set<string>>(() => {const result = optionalContrastStages(contrastStrictness.value);
  return result;});

/** Slots the currently-enabled optional stages into `required` right after enforce:contrast. */
function pipelineBuild(required: readonly string[]): string[] {
  const result = spliceOptionalStages(required, enabledOptionalStages.value);
  return result;
}

const engine = createColorEngine();
engine.adopt(imagePlugin);

/* ─── shared reactive state ─── */
const {
  'registerExtractImageHandler': registerExtractImageHandler, 'registerMutateSeedsHandler': registerMutateSeedsHandler,
  'registerNavigateToTargetHandler': registerNavigateToTargetHandler, 'registerPinSeedRoleHandler': registerPinSeedRoleHandler,
  'registerPopulatePickerFromImageHandler': registerPopulatePickerFromImageHandler, 'registerSelectImageCandidateHandler': registerSelectImageCandidateHandler,
  'registerSetPaletteParamHandler': registerSetPaletteParamHandler,
  'registerUpdateCvdPreviewHandler': registerUpdateCvdPreviewHandler,
  'registerUpdateDiagramViewHandler': registerUpdateDiagramViewHandler,
  'send': sendUiEvent, 'state': uiState
} = useIridisUiMachine();
/** Derived from the shared UI FSM so ModeSwitch and image-drop mode changes stay in sync with the carousel. */
const mode = computed<ModeType>({
  'get': () => { const result = uiState.value.mode; return result; },
  'set': (m) => { const result = sendUiEvent({ 'mode': m, 'type': IridisUiActionType.SELECT_MODE }); return result; }
});
const pickerSeeds = ref<PickerSeedType[]>([]);
/** Same shape as pickerSeeds — a role pinned here (image mode) and a role
 * pinned there (picker mode) are the exact same concept, so both modes share
 * one representation instead of a parallel hex-only list plus a separate
 * index->role map. */
const imageSeeds = ref<PickerSeedType[]>([]);

/**
 * Rebuilds imageSeeds from a fresh hex list (a recombine, or a newly-selected
 * candidate palette) while carrying forward any role a user had pinned on a
 * hex that's still present — matched by hex value, not index, since a
 * recombine can reorder/add/drop hues. Without this, any Combine-stage tweak
 * (or picking a different candidate) would silently wipe every pin made on
 * RefinePaletteCard.vue, the same clobber pickerSeeds is already guarded
 * against (see the mode !== 'picker' check below).
 */
function withPreservedRoles(hexes: readonly string[], previous: readonly PickerSeedType[]): PickerSeedType[] {
  const roleByHex = new Map(previous.map((s) => {return [s.hex, s.role] as const;}));
  return hexes.map((hex) => {return { 'hex': hex, 'role': roleByHex.get(hex) };});
}

const framing = ref<FramingType>('dark');
const schemaName = ref<string>(DEFAULT_SCHEMA_NAME);
const contrastStrictness = ref<number>(2);
const colorSpace = ref<'srgb' | 'displayP3'>('srgb');
/**
 * CVD "correct" mode flag, threaded through as `input.contrast.cvdCorrect` —
 * when true, enforce:cvdSimulate (packages/contrast) auto-corrects failing
 * pairs instead of only warning. Off by default.
 */
const cvdCorrect = ref<boolean>(false);

/**
 * Color derivation configuration — one hue-algorithm choice per derivedFrom
 * relation (keyed by the child role's own name). Passed through metadata to
 * the derive:roleRelations/derive:semanticHues pipeline tasks, which write
 * the resolved overrides those relations consult; changing it re-runs the
 * whole pipeline via the FSM's schedule(), the same as any other palette
 * parameter — never recomputed and reapplied client-side.
 */
const derivationConfig = ref<DerivationConfigType>(DEFAULT_DERIVATION_CONFIG);

/** Merges a single relation's config into `derivationConfig` and re-runs the pipeline — the ONLY way a relation changes; the resolved hue is always recomputed by derive:roleRelations, never written directly here. */
function relationUpdate(roleName: string, relation: RoleRelationDerivationType): void {
  const patch: Record<string, RoleRelationDerivationType> = {};
  patch[roleName] = relation;
  relationsUpdate(patch);
}

/**
 * Merges a whole batch of relations into `derivationConfig` in a SINGLE
 * dispatch — required (not just an optimization) for a multi-child bulk
 * change like "apply this algorithm to every child in a hub": the FSM's
 * `EffectInterpreter.send()` is async, so firing one `send()` per relation
 * in a tight synchronous loop races — only the first lands before the
 * interpreter is busy processing it, and the rest are silently dropped.
 * One dispatch carrying every changed relation sidesteps the race entirely.
 */
function relationsUpdate(newRelations: Record<string, RoleRelationDerivationType>): void {
  const updated: DerivationConfigType = { 'relations': { ...derivationConfig.value.relations, ...newRelations } };
  sendUiEvent({ 'config': updated, 'type': IridisUiActionType.SET_DERIVATION_CONFIG });
}

/**
 * Whether `derive:semanticHues` runs at all — when off, success/warning/
 * error/info keep whatever hue their own relation (or the schema default)
 * gives them, with no built-in nudge toward their intent's conventional
 * meaning. Passed through metadata; the task itself checks this and is a
 * full no-op when disabled, same as any other palette parameter.
 */
const semanticHuesEnabled = ref(true);
function semanticHuesEnabledSet(enabled: boolean): void {
  sendUiEvent({ 'enabled': enabled, 'type': IridisUiActionType.SET_SEMANTIC_HUES_ENABLED });
}

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
const roleClamps = ref<RoleClampMapInterfaceType>({});
const roleDistances = ref<RoleDistanceMapInterfaceType>({});
const rolesSynthesized = ref<string[]>([]);
const rolesPinned = ref<string[]>([]);
const rolesDerived = ref<string[]>([]);
const scales = ref<ScaleMapType>({});
const histogram = ref<GalleryHistogramSlotInterfaceType['bins']>([]);
/**
 * Reference-counted rather than a single boolean: run(), combineNowRun(), and
 * addUploadedImagesUnqueued() can all be in flight at once (e.g. a debounced
 * run() firing synchronously while an uploaded image is still awaiting
 * ToPixels.decode()). A plain shared boolean would let whichever call
 * finishes first clear it out from under the others still running; counting
 * active operations means `running` only goes false once every one of them
 * has completed.
 */
const activeOperations = ref<number>(0);
const running = computed<boolean>(() => {return activeOperations.value > 0;});
/** Marks one operation as started — pair with `endOperation()` in a `finally`. */
function beginOperation(): void { activeOperations.value += 1; }
/** Marks one operation as finished. */
function endOperation(): void { activeOperations.value -= 1; }

/**
 * Single source of truth for "sort the role list by ___" — every place the
 * full resolved-role set is listed (Roles table, Resolved roles, Clamps)
 * reads the SAME sortedRoleContrastRows / roleSortKeys rather than keeping
 * its own local sort state, so changing the sort in one place changes it
 * everywhere else showing the palette. Default matches the compliance-first
 * ordering Roles table already shipped with.
 */
const roleSortKeys = ref<RoleSortKeyType[]>([{ 'desc': true, 'field': 'compliance' }, { 'desc': true, 'field': 'ratio' }]);

const roleContrastRows = computed<(RoleSortableRowType & { 'hex': string })[]>(() => {
  // 'background' is a required role in every schema tier (RoleSchemaByName.ts),
  // and run() resolves it synchronously before any component can read this —
  // never a hardcoded placeholder.
  const bg = roles.value.background!;
  const schema = roleSchemaByName[schemaName.value]?.[framing.value];
  return roleViews.value.map((r) => {
    const ratio = contrastRatio(r.hex, bg);
    return { 'c': r.c, 'compliance': complianceFor(ratio, minRatioForRole(schema, r.name)), 'h': r.h, 'hex': r.hex, 'l': r.l, 'name': r.name, 'ratio': ratio };
  });
});

const sortedRoleContrastRows = computed(() => { const result = sortRoleRows(roleContrastRows.value, roleSortKeys.value); return result; });
const error = ref<string | null>(null);

/** Raw contrast-check metadata from the last run, keyed by algorithm rather than the `contrast:*` metadata prefix. */
const contrastReport = ref<{
  'aa'?:   WcagPairResultSetInterfaceType;
  'aaa'?:  WcagPairResultSetInterfaceType;
  'apca'?: ApcaPairResultSetInterfaceType;
  'cvd'?:  CvdResultSetInterfaceType;
}>({});

/* Image-extraction controls (mirror the engine's gallery config knobs). */
const imgAlgorithm = ref<GalleryAlgorithmType>('delta-e');
const imgK = ref<number>(8);
const imgHistogramBits = ref<number>(5);
const imgDeltaECap = ref<number>(128);
const imgHarmonize = ref<number>(10);
/* Each envelope is a UNION of ranges, not a single continuous span — lets a
 * user keep e.g. two disjoint lightness bands (shadows + highlights) without
 * also keeping the midtones between them. */
const imgLightnessRange = ref<[number, number][]>([[0, 1]]);
const imgChromaRange = ref<[number, number][]>([[0, 0.5]]);
/**
 * Every uploaded image, each independently decoded and reduced to its own
 * dominant colors (Stage 1) with its own algorithm/k/histogram/range
 * settings. The combine stage (see `combine()` below) concatenates every
 * entry's `dominantColors` into the final palette that themes the page.
 */
const uploadedImages = ref<UploadedImageInterfaceType[]>([]);
/** The (typically 3) non-destructive candidate palettes from gallery:extractCandidates for the last image-driven run — one algorithm's clustering result each. */
const candidates = ref<GalleryCandidateInterfaceType[]>([]);
/** Label of the candidate currently populating imageSeeds, if the user picked one via PaletteCandidatePicker.vue — null means imageSeeds still holds the default gallery:dominantColors extraction. */
const selectedCandidateLabel = ref<string | null>(null);
/**
 * When true, every auto-trigger of the combine stage (new upload, per-image
 * setting edit, combine-stage setting edit) is suppressed — only the
 * "Re-run" button (`reRunCombine`) recombines. Default false reproduces
 * today's fully-reactive behavior exactly.
 */
const combineLocked = ref<boolean>(false);

/**
 * Image extraction's color COUNT is the same concept as the role schema's
 * role count (iridis-4/8/12/16/32) — not a second, independently-tunable
 * number. schemaName is the single source of truth; this keeps imgK in sync
 * whenever it changes (from either the Schema & Compliance control or the
 * mirrored control in the Image card).
 */
watch(schemaName, (v) => { imgK.value = schemaRoleCount(v); }, { 'immediate': true });

/** Whichever seed list is live for the current mode — imageSeeds and pickerSeeds share one shape now, so this is a plain switch, not a reshape. */
const activeSeeds = computed<PickerSeedType[]>(() => {return (mode.value === 'image' ? imageSeeds.value : pickerSeeds.value);});

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
  const pair = roleSchemaByName[schemaName.value] ?? roleSchemaByName[DEFAULT_SCHEMA_NAME];
  const schema = pair?.[framing.value];
  if (schema === undefined) {return [];}
  return schema.roles.filter((r) => {const result = USED_ROLE_NAMES.has(r.name);
    return result;}).map((r) => {const result = r.name;
    return result;});
});

function ingest(state: { 'metadata': Record<string, unknown>; 'roles': Record<string, { 'displayP3'?: { 'b': number; 'g': number; 'r': number; }; 'hex': string; 'oklch': { 'c': number; 'h': number; 'l': number; } }>; 'variants': Record<string, Record<string, { 'hex': string }>> }): void {
  const roleHex: RoleHexMapType = {};
  const views: RoleViewType[] = [];
  for (const [name, r] of Object.entries(state.roles)) {
    roleHex[name] = r.hex;
    views.push({ 'c': r.oklch.c, 'displayP3': r.displayP3, 'h': r.oklch.h, 'hex': r.hex, 'l': r.oklch.l, 'name': name });
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
  roleClamps.value = getEngineMetadata(state.metadata, 'core:roleClamps') ?? {};
  roleDistances.value = getEngineMetadata(state.metadata, 'core:roleDistances') ?? {};
  rolesSynthesized.value = getEngineMetadata(state.metadata, 'core:rolesSynthesized') ?? [];
  rolesPinned.value = getEngineMetadata(state.metadata, 'core:rolesPinned') ?? [];
  rolesDerived.value = getEngineMetadata(state.metadata, 'core:rolesDerived') ?? [];
  scales.value = sc;
  contrastReport.value = {
    'aa':   getContrastMetadata(state.metadata, 'contrast:aa'),
    'aaa':  getContrastMetadata(state.metadata, 'contrast:aaa'),
    'apca': getContrastMetadata(state.metadata, 'contrast:apca'),
    'cvd':  getContrastMetadata(state.metadata, 'contrast:cvd')
  };
  if (typeof document !== 'undefined') {
    Tokens.apply(Tokens.mapFromEngine(roleHex, sc), framing.value);
  }
}

/** run()'s engine input whenever neither seed list has anything yet (see run() below) — never surfaced as pickerSeeds/imageSeeds, so it never appears as a phantom entry in Manual or the per-image cards. */
const BOOTSTRAP_SEEDS: PickerSeedType[] = [{ 'hex': '#7c3aed' }];

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
  const pair = roleSchemaByName[schemaName.value] ?? roleSchemaByName[DEFAULT_SCHEMA_NAME];
  if (pair === undefined) {return;}
  // Neither pickerSeeds nor imageSeeds has a seed yet on the very first pass
  // (in-browser sample-image extraction hasn't resolved, and can't even run
  // during SSR — no canvas there) — feed the engine one bootstrap seed so it
  // resolves a real role set from tick one instead of leaving roles.value
  // empty, WITHOUT writing that seed into either user-visible seed list (the
  // Manual card must only ever show what the user actually entered).
  const seeds = activeSeeds.value.length > 0 ? activeSeeds.value : BOOTSTRAP_SEEDS;
  beginOperation();
  error.value = null;
  try {
    engine.pipeline(pipelineBuild(REQUIRED_COLOR_STAGES));
    const state = engine.run({
      'colors':   seeds,
      'contrast': contrastConfigFor(contrastStrictness.value, cvdCorrect.value),
      'metadata': { 'core:variantConfig': VARIANT_CONFIG, 'derivation:config': derivationConfig.value, 'derivation:semanticHuesEnabled': semanticHuesEnabled.value },
      'roles':    pair[targetFraming],
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
    endOperation();
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

/** Raw decoded pixel buffers, keyed by `UploadedImageInterfaceType.id` — kept out of the reactive `uploadedImages` entries so Vue never deep-wraps a pixel array. */
const pixelCache = new Map<string, { 'data': Uint8ClampedArray; 'height': number; 'width': number }>();
let nextImageId = 0;
/**
 * Serializes `addUploadedImages` calls. Without this, two overlapping calls
 * (e.g. a user drops a second image before the first's decode settles) each
 * read `uploadedImages.value` before either had written its own addition —
 * a classic lost-update race where whichever call writes second clobbers the
 * first's entry entirely. Chaining every call onto this promise means each
 * call's full read-modify-write only starts once the previous one has fully
 * committed, so uploads queue instead of racing.
 */
let uploadedImagesQueue: Promise<void> = Promise.resolve();
/** Generates a unique id for a freshly-decoded uploaded image entry. */
class ImageId {
  static make(): string {
    nextImageId += 1;
    return `img-${nextImageId}-${Date.now().toString(36)}`;
  }
}

/** Seeds a freshly-uploaded entry's own settings from the CURRENT combine-stage refs — sensible per-image defaults that become independently mutable afterward. */
function defaultEntrySettings(): Pick<UploadedImageInterfaceType, 'algorithm' | 'chromaRange' | 'deltaECap' | 'harmonizeThreshold' | 'histogramBits' | 'k' | 'lightnessRange'> {
  return {
    'algorithm':          imgAlgorithm.value,
    'chromaRange':        cloneRanges(imgChromaRange.value),
    'deltaECap':          imgDeltaECap.value,
    'harmonizeThreshold': imgHarmonize.value,
    'histogramBits':      imgHistogramBits.value,
    'k':                  imgK.value,
    'lightnessRange':     cloneRanges(imgLightnessRange.value)
  };
}

type GallerySourceType = { 'algorithm': GalleryAlgorithmType; 'chromaRange': readonly [number, number][]; 'deltaECap': number; 'harmonizeThreshold'?: number; 'histogramBits': number; 'k': number; 'lightnessRange': readonly [number, number][] };

/** Builds the `metadata.gallery` object handed to engine.run() — shared by EntryStage1.extract (per-image, no harmonizeThreshold — that knob only applies at the combine stage) and combineNowRun (the combine stage itself), rather than two independent object literals repeating the same field list and range-cloning. */
class GalleryMetadata {
  static build(source: GallerySourceType): GallerySourceType & { 'candidates': typeof ALL_CANDIDATE_ALGORITHMS } {
    return {
      'algorithm':          source.algorithm,
      'candidates':         ALL_CANDIDATE_ALGORITHMS,
      'chromaRange':        cloneRanges(source.chromaRange),
      'deltaECap':          source.deltaECap,
      ...(source.harmonizeThreshold !== undefined ? { 'harmonizeThreshold': source.harmonizeThreshold } : {}),
      'histogramBits':      source.histogramBits,
      'k':                  source.k,
      'lightnessRange':     cloneRanges(source.lightnessRange)
    };
  }
}

/**
 * Stage 1 — reduces ONE image's own cached pixels to its own dominant
 * colors, using ONLY that entry's own settings. Independent of every other
 * uploaded image: re-running this for entry A never touches entry B's
 * histogram/dominantColors.
 */
class EntryStage1 {
  static extract(entry: UploadedImageInterfaceType): void {
    const pixels = pixelCache.get(entry.id);
    if (pixels === undefined) {return;}
    engine.pipeline(IMAGE_ENTRY_STAGES);
    const state = engine.run({
      'colors':   [pixels],
      'metadata': {
        'gallery': GalleryMetadata.build({
          'algorithm':      entry.algorithm,
          'chromaRange':    entry.chromaRange,
          'deltaECap':      entry.deltaECap,
          'histogramBits':  entry.histogramBits,
          'k':              entry.k,
          'lightnessRange': entry.lightnessRange
        })
      }
    });
    const hist = (state.metadata['gallery:histogram'] as GalleryHistogramSlotInterfaceType | undefined)?.bins ?? [];
    entry.histogram = [...hist].sort((a, b) => {return b.weight - a.weight;}).slice(0, 96);
    const dominant = (state.metadata['gallery:dominantColors'] as { 'hex': string; 'hints'?: { 'weight'?: number } }[] | undefined) ?? [];
    const validDominant = dominant.filter((c) => { const result = isValidHex(c.hex);
      return result; });
    entry.dominantColorRecords = validDominant.map((c) => { return { 'hex': c.hex, 'weight': c.hints?.weight ?? 1 }; });
    entry.candidates = (state.metadata['gallery:candidates'] as GalleryCandidateInterfaceType[] | undefined) ?? [];
  }
}

/**
 * Resolves the weighted color list an uploaded image contributes to the
 * combine stage: its selected candidate's colors when one is chosen
 * (falling back to the default extraction if that label no longer exists in
 * the current candidate set), otherwise the default `dominantColorRecords`
 * extraction. Each color carries the real cluster weight (pixel-count share)
 * gallery:extract/gallery:extractCandidates already compute — this is what
 * lets the combine stage build a genuinely cumulative, pixel-weighted
 * histogram instead of treating every representative color as equally
 * significant regardless of how much of the source image it actually covers.
 */
function weightedHexesFor(entry: UploadedImageInterfaceType): readonly { 'hex': string; 'weight': number }[] {
  if (entry.selectedCandidateLabel !== null) {
    const match = entry.candidates.find((c) => {return c.label === entry.selectedCandidateLabel;});
    if (match !== undefined) {
      return match.colors.map((c) => {return { 'hex': c.hex, 'weight': c.hints?.weight ?? 1 };});
    }
  }
  return entry.dominantColorRecords;
}

/** Plain hex list (no weight) — used wherever only the color values matter, e.g. the Upload card's per-image summary swatches. */
function effectiveHexesFor(entry: UploadedImageInterfaceType): readonly string[] {
  const result = weightedHexesFor(entry).map((w) => {const result = w.hex;
    return result;});
  return result;
}

/**
 * Expands a weighted {hex, weight} multiset into a flat hex array sized
 * proportionally to each entry's share of the total weight, capped at
 * `budget` total entries — feeding this through intake:any → gallery:histogram
 * reconstructs an approximately cumulative, pixel-weighted histogram (repeated
 * identical hex strings accumulate bin weight via plain frequency counting),
 * since the engine has no input path for pre-weighted color records.
 */
function expandWeighted(weighted: readonly { 'hex': string; 'weight': number }[], budget: number): string[] {
  const totalWeight = weighted.reduce((sum, w) => {return sum + w.weight;}, 0);
  if (totalWeight <= 0) {return weighted.map((w) => {const result = w.hex;
    return result;});}
  const expanded: string[] = [];
  for (const w of weighted) {
    const count = Math.max(1, Math.round((w.weight / totalWeight) * budget));
    for (let i = 0; i < count; i++) {expanded.push(w.hex);}
  }
  return expanded;
}

/**
 * Stage 2 — gathers every uploaded image's own weighted contribution
 * (`weightedHexesFor`, respecting per-image candidate selection) and expands
 * it into a cumulative, pixel-weighted hex multiset (`expandWeighted`), then
 * runs that through the combine pipeline (REQUIRED_IMAGE_STAGES). The
 * resulting histogram genuinely reflects the merged pixel density across
 * every uploaded image, not an equal-weight-per-representative-color
 * approximation. The combine-stage settings are the existing shared
 * imgAlgorithm/imgK/imgHistogramBits/imgDeltaECap/imgHarmonize/imgLightnessRange/
 * imgChromaRange refs — they now control the FINAL merge across all images,
 * not any single photo's extraction.
 */
/** Gated auto-trigger — every reactive call site goes through this, so `combineLocked` suppresses them uniformly. */
function combine(): void {
  if (combineLocked.value) {return;}
  combineNowRun();
}

/** Always recombines immediately, ignoring the lock — what the "Re-run" button calls. */
function reRunCombine(): void {
  combineNowRun();
}

/** Total hex entries the cumulative weighted expansion is scaled to — large enough for gallery:histogram to re-derive a meaningful weighted distribution, small enough to stay cheap. */
const CUMULATIVE_HISTOGRAM_BUDGET = 1000;

function combineNowRun(): void {
  if (typeof document === 'undefined') {return;}
  const entries = uploadedImages.value;
  const weightedContributions = entries.flatMap((e) => {const result = weightedHexesFor(e);
    return result;});
  const combinedHexes = expandWeighted(weightedContributions, CUMULATIVE_HISTOGRAM_BUDGET);
  if (combinedHexes.length === 0) {
    histogram.value = [];
    imageSeeds.value = [];
    candidates.value = [];
    selectedCandidateLabel.value = null;
    return;
  }
  beginOperation();
  error.value = null;
  try {
    const pair = roleSchemaByName[schemaName.value] ?? roleSchemaByName[DEFAULT_SCHEMA_NAME];
    engine.pipeline(pipelineBuild(REQUIRED_IMAGE_STAGES));
    const state = engine.run({
      'colors':   combinedHexes,
      'contrast': contrastConfigFor(contrastStrictness.value, cvdCorrect.value),
      'metadata': {
        'core:variantConfig': VARIANT_CONFIG,
        'derivation:config': derivationConfig.value,
        'derivation:semanticHuesEnabled': semanticHuesEnabled.value,
        'gallery': GalleryMetadata.build({
          'algorithm':          imgAlgorithm.value,
          'chromaRange':        imgChromaRange.value,
          'deltaECap':          imgDeltaECap.value,
          'harmonizeThreshold': imgHarmonize.value,
          'histogramBits':      imgHistogramBits.value,
          'k':                  imgK.value,
          'lightnessRange':     imgLightnessRange.value
        })
      },
      'roles':    pair![framing.value],
      'runtime':  { 'colorSpace': colorSpace.value, 'framing': framing.value }
    });
    const hist = (state.metadata['gallery:histogram'] as GalleryHistogramSlotInterfaceType | undefined)?.bins ?? [];
    histogram.value = [...hist].sort((a, b) => {return b.weight - a.weight;}).slice(0, 96);
    const dominant = (state.metadata['gallery:dominantColors'] as { 'hex': string }[] | undefined) ?? [];
    const schemaCount = schemaRoleCount(schemaName.value);
    const extracted = dominant.map((c) => { const result = c.hex; return result; }).filter((hex) => { const result = isValidHex(hex);
      return result; }).slice(0, schemaCount);
    imageSeeds.value = withPreservedRoles(extracted, imageSeeds.value);
    candidates.value = (state.metadata['gallery:candidates'] as GalleryCandidateInterfaceType[] | undefined) ?? [];
    selectedCandidateLabel.value = null;
    // Pre-populates the picker with the image extraction so switching TO manual
    // mode starts from something — but only while the user hasn't already
    // switched there. Once mode is 'picker', pickerSeeds is user-owned data;
    // a background recombine (e.g. a schema/algorithm tweak, or the
    // always-loaded boot sample) must never silently clobber manual edits.
    if (mode.value !== 'picker') {
      sendUiEvent({ 'hexes': extracted, 'type': IridisUiActionType.POPULATE_PICKER_FROM_IMAGE });
    }
    ingest(state);
  } catch (e) {
    error.value = e instanceof Error ? e.message : String(e);
  } finally {
    endOperation();
  }
}

/**
 * Decodes and adds one or more images as new `uploadedImages` entries, each
 * running its own Stage 1 extraction independently, then recombines. Used
 * for both file uploads and the "Try a sample" button — the sample image is
 * just another entry, added rather than replacing what's already uploaded.
 *
 * Queued onto {@link uploadedImagesQueue} rather than run directly — see
 * that variable's comment for why concurrent calls must be serialized.
 */
async function addUploadedImages(sources: readonly (File | string)[], sampleNames?: readonly string[]): Promise<void> {
  const next = uploadedImagesQueue.then(() => {const result = addUploadedImagesUnqueued(sources, sampleNames);
    return result;});
  // Swallow here so one call's failure doesn't wedge the queue for every
  // subsequent call — addUploadedImagesUnqueued already records the error
  // in the shared `error` ref via its own try/catch.
  uploadedImagesQueue = next.catch(() => {});
  return await next;
}

async function addUploadedImagesUnqueued(sources: readonly (File | string)[], sampleNames?: readonly string[]): Promise<void> {
  if (typeof document === 'undefined' || sources.length === 0) {return;}
  beginOperation();
  error.value = null;
  try {
    const added: UploadedImageInterfaceType[] = [];
    for (let i = 0; i < sources.length; i++) {
      const source = sources[i]!;
      const src = typeof source === 'string' ? source : URL.createObjectURL(source);
      const name = typeof source === 'string' ? (sampleNames?.[i] ?? 'Sample') : source.name;
      const pixels = await ToPixels.decode(src);
      const id = ImageId.make();
      pixelCache.set(id, pixels);
      const entry: UploadedImageInterfaceType = {
        ...defaultEntrySettings(),
        'candidates':              [],
        'dominantColorRecords':    [],
        'histogram':               [],
        'id':                      id,
        'name':                    name,
        'selectedCandidateLabel':  null,
        'src':                     src
      };
      EntryStage1.extract(entry);
      added.push(entry);
    }
    uploadedImages.value = [...uploadedImages.value, ...added];
    combine();
  } catch (e) {
    error.value = e instanceof Error ? e.message : String(e);
  } finally {
    endOperation();
  }
}

/** Drops one uploaded image and recombines — every other entry is untouched. */
function removeUploadedImage(id: string): void {
  const entry = uploadedImages.value.find((e) => {return e.id === id;});
  if (entry?.src.startsWith('blob:') === true) {
    URL.revokeObjectURL(entry.src);
  }
  pixelCache.delete(id);
  entryReextract.cancel(id);
  uploadedImages.value = uploadedImages.value.filter((e) => {return e.id !== id;});
  scheduleCombine();
}

type UploadedImageSettingsPatchType = Partial<Pick<UploadedImageInterfaceType, 'algorithm' | 'chromaRange' | 'deltaECap' | 'harmonizeThreshold' | 'histogramBits' | 'k' | 'lightnessRange'>>;

/** Mutates ONE uploaded image's own settings and schedules ONLY that image's re-extraction (debounced), not every uploaded image. */
function uploadedImageSettingUpdate(id: string, patch: UploadedImageSettingsPatchType): void {
  const entry = uploadedImages.value.find((e) => {return e.id === id;});
  if (entry === undefined) {return;}
  Object.assign(entry, patch);
  entryReextract.schedule(id);
}

/** Per-entry debounce so rapid slider drags on one image's settings don't re-run its extraction on every step. */
const entryReextract = keyedDebounce((id: string) => {
  const entry = uploadedImages.value.find((e) => {return e.id === id;});
  if (entry !== undefined) {EntryStage1.extract(entry);}
  combine();
}, 180);

/** Debounced combine-stage re-run — triggered by adding/removing an image, a per-image setting change, or a combine-stage setting change. */
const scheduleCombine = debounce(() => { combine(); }, 180);

/**
 * Sets which of ONE image's own candidate palettes contributes to the
 * combine stage (or clears back to its default extraction when `label` is
 * null), then recombines — only recombines, never re-runs that image's own
 * Stage-1 extraction.
 */
function selectEntryCandidate(id: string, label: string): void {
  const entry = uploadedImages.value.find((e) => {return e.id === id;});
  if (entry === undefined) {return;}
  entry.selectedCandidateLabel = label;
  combine();
}

/**
 * Performs the picker-seed array mutation for the FSM's MUTATE_SEEDS effect.
 * Registered once below via registerMutateSeedsHandler — PaletteControls.vue
 * triggers this indirectly via useIridisUiMachine().send({type: IridisUiActionType.ADD_SEED|...}),
 * never by calling array mutation directly.
 */
function mutateSeeds(effect: MutateSeedsEffectType): void {
  if (effect.op === 'add') {
    // A freshly added seed with no explicit hex starts as the current
    // engine-resolved brand color (a required role in every schema tier),
    // never a hardcoded placeholder — the user edits it from there.
    if (pickerSeeds.value.length < 32) {pickerSeeds.value = [...pickerSeeds.value, { 'hex': effect.hex ?? roles.value.brand! }];}
  } else if (effect.op === 'remove') {
    if (pickerSeeds.value.length > 1) {pickerSeeds.value = pickerSeeds.value.filter((_, idx) => {return idx !== effect.index;});}
  } else if (effect.op === 'set') {
    pickerSeeds.value = pickerSeeds.value.map((s, idx) => {return (idx === effect.index ? { ...s, 'hex': effect.hex } : s);});
  }
  // Explicit, not just relying on the pickerSeeds deep watch below — every
  // seed edit is a config change that must re-run the engine.
  schedule();
}
registerMutateSeedsHandler(mutateSeeds);

/**
 * Performs the seed-role pin/unpin mutation for the FSM's PIN_SEED_ROLE effect.
 * Pinning attaches `hints.role` (via IntakeHexHint) so ResolveRoles assigns that
 * seed to the named role directly instead of by nearest-OKLCH-distance.
 * Ensures that a role can only be pinned to one seed at a time.
 */
function pinSeedRole(effect: PinSeedRoleEffectType): void {
  const applyPin = (seeds: PickerSeedType[]): PickerSeedType[] => { const result = seeds.map((s, idx) => {
    if (effect.role !== undefined && s.role === effect.role && idx !== effect.index) {
      return { ...s, 'role': undefined };
    }
    return (idx === effect.index ? { ...s, 'role': effect.role } : s);
  }); return result; };
  if (mode.value === 'image') {
    imageSeeds.value = applyPin(imageSeeds.value);
  } else {
    pickerSeeds.value = applyPin(pickerSeeds.value);
  }
  schedule();
}
registerPinSeedRoleHandler(pinSeedRole);

/**
 * Performs the framing/schemaName/contrastLevel/imgAlgorithm mutation for the
 * FSM's SET_PALETTE_PARAM effect. Registered below via
 * registerSetPaletteParamHandler — components send SET_FRAMING/SET_SCHEMA/
 * SET_CONTRAST/SET_IMAGE_ALGORITHM events rather than assigning these refs directly.
 *
 * Every branch both mutates its ref AND explicitly triggers the engine
 * re-run that config implies — never just the mutation, relying on some
 * other decoupled watcher to notice. Framing skips the debounce entirely
 * (see run()'s framingOverride doc); every other picker/schema/contrast
 * param goes through schedule() (the general debounced run()); every
 * combine-stage image param goes through scheduleCombine() (re-runs the
 * COMBINE stage — see `combine()` — over whatever every uploaded image's
 * Stage 1 already produced; a no-op if no image is uploaded). These params
 * no longer redecode or re-run any per-image extraction: that only happens
 * via `uploadedImageSettingUpdate()` for one image's own settings. The deep
 * watches below still exist as a safety net for state changed outside this
 * handler, but each of THIS handler's own mutations is responsible for its
 * own re-run, not just relying on being watched.
 */
function paletteParamSet(effect: SetPaletteParamEffectType): void {
  if (effect.op === 'framing') {run(effect.value); return;}
  if (effect.op === 'schemaName') {schemaName.value = effect.value; schedule(); scheduleCombine(); return;}
  if (effect.op === 'strictness') {contrastStrictness.value = effect.value; schedule(); return;}
  if (effect.op === 'colorSpace') {colorSpace.value = effect.value; schedule(); return;}
  if (effect.op === 'cvdCorrect') {cvdCorrect.value = effect.value; schedule(); return;}
  if (effect.op === 'imgAlgorithm') {imgAlgorithm.value = effect.value; scheduleCombine(); return;}
  if (effect.op === 'imgK') {imgK.value = effect.value; scheduleCombine(); return;}
  if (effect.op === 'imgHistogramBits') {imgHistogramBits.value = effect.value; scheduleCombine(); return;}
  if (effect.op === 'imgDeltaECap') {imgDeltaECap.value = effect.value; scheduleCombine(); return;}
  if (effect.op === 'imgHarmonize') {imgHarmonize.value = effect.value; scheduleCombine(); return;}
  if (effect.op === 'imgLightnessRange') {imgLightnessRange.value = effect.value; scheduleCombine(); return;}
  if (effect.op === 'imgChromaRange') {imgChromaRange.value = effect.value; scheduleCombine(); return;}
  if (effect.op === 'derivation') {derivationConfig.value = effect.value; schedule(); return;}
  if (effect.op === 'semanticHuesEnabled') {semanticHuesEnabled.value = effect.value; schedule(); return;}
  // Sort order is a pure display concern — it never changes what the engine
  // derives, so unlike every branch above there's no schedule()/scheduleCombine()
  // call here on purpose.
  if (effect.op === 'roleSort') {roleSortKeys.value = effect.value; return;}
}
registerSetPaletteParamHandler(paletteParamSet);

/**
 * Performs diagram view state mutations (zoom, pan, expand/collapse) for the
 * FSM's UPDATE_DIAGRAM_VIEW effect. MermaidDiagram.vue sends DIAGRAM_* events
 * rather than mutating scale/translate/isExpanded directly.
 */
function diagramViewUpdate(effect: UpdateDiagramViewEffectType): void {
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
registerUpdateDiagramViewHandler(diagramViewUpdate);

/**
 * Performs CVD preview type mutations (toggle/clear) for the FSM's
 * UPDATE_CVD_PREVIEW effect. CvdVision.vue sends CVD_* events rather than
 * mutating cvdPreviewTypes directly.
 */
function cvdPreviewUpdate(effect: UpdateCvdPreviewEffectType): void {
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
registerUpdateCvdPreviewHandler(cvdPreviewUpdate);

/**
 * Populates picker palette from extracted hues. Called when image extraction
 * completes or when extraction settings change, replacing picker seeds with
 * the N extracted hues (where N = schema count).
 */
function populatePickerFromImage(effect: PopulatePickerFromImageEffectType): void {
  pickerSeeds.value = effect.hexes.map((hex) => {return { 'hex': hex };});
}
registerPopulatePickerFromImageHandler(populatePickerFromImage);

const { 'activateTarget': activateNavigationTarget } = useNavigationTargets();

/**
 * Resolves a NAVIGATE_TO_TARGET effect's targetId against the navigation
 * target table and moves there. useNavigationTargets.ts owns the resolution
 * logic (which stage a card belongs to, how to scroll to it) since it also
 * owns the target table itself.
 */
function navigateToTarget(effect: NavigateToTargetEffectType): void {
  activateNavigationTarget(effect.targetId);
}
registerNavigateToTargetHandler(navigateToTarget);

/** Mirrors HeroBanner.vue's `${base}logo.png` resolution — the sample extraction source. */
function logoUrl(): string {
  const base = useRuntimeConfig().app.baseURL;
  return `${base}logo.png`;
}

/**
 * Performs image extraction for the FSM's EXTRACT_IMAGE effect (one or more
 * uploaded files, or the built-in sample — the iridis logo). Registered
 * below via registerExtractImageHandler. The sample is added as ONE MORE
 * `uploadedImages` entry, same as any uploaded file — it never replaces
 * what's already uploaded.
 */
async function imageEffectExtract(effect: ExtractImageEffectType): Promise<void> {
  if (effect.source === 'sample') {
    await addUploadedImages([logoUrl()], ['Sample']);
    return;
  }
  const files = Array.isArray(effect.file) ? effect.file : [effect.file];
  await addUploadedImages(files);
}
// registerExtractImageHandler expects a void-returning handler — imageEffectExtract is
// async, so it's wrapped here and its promise explicitly discarded (the FSM effect
// itself is fire-and-forget; addUploadedImagesUnqueued already reports its own errors
// via the shared `error` ref).
registerExtractImageHandler((effect) => { void imageEffectExtract(effect); });

/**
 * Swaps imageSeeds to a candidate palette from gallery:extractCandidates
 * (PaletteCandidatePicker.vue) instead of the default gallery:dominantColors
 * extraction. schedule() re-runs the color pipeline against the new seeds —
 * the image itself is not re-decoded, only which palette themes the page.
 */
function selectImageCandidate(effect: SelectImageCandidateEffectType): void {
  imageSeeds.value = withPreservedRoles(effect.hexes, imageSeeds.value);
  selectedCandidateLabel.value = effect.label;
  schedule();
}
registerSelectImageCandidateHandler(selectImageCandidate);

let booted = false;
const schedule = debounce(() => { run(); }, 120);

export function useIridis() {
  if (!booted) {
    booted = true;
    // Runs on the server too: engine.run() is pure computation.
    // This makes the SSR-rendered palette identical to the client's,
    // so hydration never has to re-theme the page.
    run();
    if (typeof window !== 'undefined') {
      // Load default sample palette on page init
      void addUploadedImages([logoUrl()], ['Sample']);
      // framing is intentionally absent here — its swap is dispatched synchronously
      // by paletteParamSet() via run(effect.value), not through this debounce.
      watch([pickerSeeds, imageSeeds, schemaName, contrastStrictness, colorSpace, mode, enabledOptionalStages, cvdCorrect, derivationConfig, semanticHuesEnabled], schedule, { 'deep': true });
      watch([schemaName, imgAlgorithm, imgK, imgHistogramBits, imgDeltaECap, imgHarmonize, imgLightnessRange, imgChromaRange], scheduleCombine, { 'deep': true });
    }
  }
  return {
    'activeSeeds': activeSeeds, 'addUploadedImages': addUploadedImages, 'candidates': candidates, 'colorSpace': colorSpace, 'combineLocked': combineLocked, 'contrastReport': contrastReport, 'contrastStrictness': contrastStrictness, 'cvdCorrect': cvdCorrect,
    'cvdPreviewTypes': cvdPreviewTypes, 'derivationConfig': derivationConfig, 'diagramIsExpanded': diagramIsExpanded, 'diagramScale': diagramScale,
    'diagramTranslateX': diagramTranslateX, 'diagramTranslateY': diagramTranslateY,
    'effectiveHexesFor': effectiveHexesFor, 'enabledOptionalStages': enabledOptionalStages, 'error': error, 'framing': framing,
    'histogram': histogram,
    'imageSeeds': imageSeeds, 'imgAlgorithm': imgAlgorithm, 'imgChromaRange': imgChromaRange, 'imgDeltaECap': imgDeltaECap,
    'imgHarmonize': imgHarmonize, 'imgHistogramBits': imgHistogramBits, 'imgK': imgK, 'imgLightnessRange': imgLightnessRange, 'mode': mode, 'pickerSeeds': pickerSeeds,
    'pinnableRoles': pinnableRoles, 'removeUploadedImage': removeUploadedImage, 'reRunCombine': reRunCombine, 'roleClamps': roleClamps, 'roleDistances': roleDistances,
    'roles': roles, 'rolesDerived': rolesDerived,
    'roleSortKeys': roleSortKeys, 'rolesPinned': rolesPinned, 'rolesSynthesized': rolesSynthesized,
    'roleViews': roleViews,
    'run': run, 'running': running,
    'scales': scales,
    'schemaName': schemaName,
    'selectedCandidateLabel': selectedCandidateLabel,
    'selectEntryCandidate': selectEntryCandidate, 'semanticHuesEnabled': semanticHuesEnabled, 'send': sendUiEvent, 'setSemanticHuesEnabled': semanticHuesEnabledSet, 'sortedRoleContrastRows': sortedRoleContrastRows, 'updateRelation': relationUpdate, 'updateRelations': relationsUpdate,
    'updateUploadedImageSetting': uploadedImageSettingUpdate, 'uploadedImages': uploadedImages
  };
}
