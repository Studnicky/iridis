/**
 * Shared iridis engine state. Two mutually-exclusive modes — a color picker and
 * an image extractor — each with its own palette; switching modes swaps which
 * palette themes the page. Every color (roles AND the 50→950 scales) is produced
 * by engine.run(): scales come from derive:variant tonal steps, semantic hues
 * from hueOffset on the schema roles. The projector only reads those hexes.
 */

import type { ColorRecordInterfaceType, CvdType, PaletteStateInterface, RoleClampMapInterfaceType, RoleDistanceMapInterfaceType } from '@studnicky/iridis';
import type { ApcaPairResultSetInterfaceType, CvdResultSetInterfaceType, WcagPairResultSetInterfaceType } from '@studnicky/iridis-contrast';
import type {
  GalleryAlgorithmType, GalleryCandidateInterfaceType, GalleryCandidatesSlotType, GalleryDominantColorsSlotType, GalleryHistogramSlotInterfaceType
} from '@studnicky/iridis-image/types';
import type { ViteHotContext } from 'vite/types/hot.d.ts';

import { EngineMetadata } from '@studnicky/iridis';
import { getContrastMetadata } from '@studnicky/iridis-contrast';
import { imagePlugin } from '@studnicky/iridis-image';
import * as VueModule from 'vue';

import { useNuxtApp, useRuntimeConfig } from '#imports';

import type {
  DerivationConfigType, FramingType, IridisUiEffectType, IridisUiEffectVariant, ModeType, PickerSeedType, RoleHexMapType, RoleRelationDerivationType, RoleViewType, ScaleMapType
  , UploadedImageInterfaceType } from './types/index.ts';
import type { RoleSortableRowType } from './types/roleSortableRow.ts';
import type { RoleSortKeyType } from './types/roleSortKey.ts';

import { contrastRatio } from '../theme/ContrastRatio.ts';
import { cloneRanges } from '../utils/cloneRanges.ts';
import { complianceFor } from '../utils/complianceFor.ts';
import { debounce } from '../utils/debounce.ts';
import { isValidHex } from '../utils/isValidHex.ts';
import { keyedDebounce } from '../utils/keyedDebounce.ts';
import { minimumRatioForRole } from '../utils/minimumRatioForRole.ts';
import { sortRoleRows } from '../utils/sortRoleRows.ts';
import { IRIDIS_CONSTANTS } from './constants/IridisConstants.ts';
import { contrastConfigFor } from './contrastConfigFor.ts';
import { createColorEngine } from './createColorEngine.ts';
import { optionalContrastStages } from './optionalContrastStages.ts';
import { pickerSeedInputs } from './pickerSeedInputs.ts';
import { REQUIRED_COLOR_STAGES } from './requiredColorStages.ts';
import { schemaRoleCount } from './schemaRoleCount.ts';
import { spliceOptionalStages } from './spliceOptionalStages.ts';
import { DEFAULT_DERIVATION_CONFIG, DEFAULT_SCHEMA_NAME, IridisUiActionType } from './types/index.ts';
import { VARIANT_CONFIG } from './variantConfig.ts';

declare namespace IridisEffects {
  type MutateSeeds = Extract<IridisUiEffectType.Type, { 'variant': IridisUiEffectVariant.MUTATE_SEEDS }>;
  type SetPaletteParameter = Extract<IridisUiEffectType.Type, { 'variant': IridisUiEffectVariant.SET_PALETTE_PARAM }>;
  type ExtractImage = Extract<IridisUiEffectType.Type, { 'variant': IridisUiEffectVariant.EXTRACT_IMAGE }>;
  type PinSeedRole = Extract<IridisUiEffectType.Type, { 'variant': IridisUiEffectVariant.PIN_SEED_ROLE }>;
  type UpdateDiagramView = Extract<IridisUiEffectType.Type, { 'variant': IridisUiEffectVariant.UPDATE_DIAGRAM_VIEW }>;
  type UpdateCvdPreview = Extract<IridisUiEffectType.Type, { 'variant': IridisUiEffectVariant.UPDATE_CVD_PREVIEW }>;
  type PopulatePickerFromImage = Extract<IridisUiEffectType.Type, { 'variant': IridisUiEffectVariant.POPULATE_PICKER_FROM_IMAGE }>;
  type NavigateToTarget = Extract<IridisUiEffectType.Type, { 'variant': IridisUiEffectVariant.NAVIGATE_TO_TARGET }>;
  type SelectImageCandidate = Extract<IridisUiEffectType.Type, { 'variant': IridisUiEffectVariant.SELECT_IMAGE_CANDIDATE }>;
}

import { roleSchemaByName } from '../theme/RoleSchemaByName.ts';
import { Tokens } from '../theme/Tokens.ts';
import { useIridisUiMachine } from './useIridisUiMachine.ts';
import { useNavigationTargets } from './useNavigationTargets.ts';

class ViteModule {
  static readonly metadata: ImportMeta & { readonly 'hot'?: ViteHotContext } = import.meta;
}

/** Builds the four candidate-algorithm configs for gallery:extractCandidates, every one sharing `k` (the same color count the primary extraction uses). Full `GalleryCandidateInterfaceType` shape: `colors` is the not-yet-computed placeholder above, `label` defaults to the algorithm name — gallery:extractCandidates' own fallback for an unlabeled config. */
class AllCandidateAlgorithmsOperation {
  static run(k: number): GalleryCandidateInterfaceType[] {
    const result = IRIDIS_CONSTANTS.ALL_CANDIDATE_ALGORITHM_NAMES.map((algorithm) => {
      return { 'algorithm': algorithm, 'colors': IRIDIS_CONSTANTS.EMPTY_CANDIDATE_COLORS, 'k': k, 'label': algorithm };
    });
    return result;
  }
}

const allCandidateAlgorithms = AllCandidateAlgorithmsOperation.run;

class CvdTypeRegistry {
  static resolve(value: string): CvdType {
    if (value === 'protanopia' || value === 'deuteranopia' || value === 'tritanopia' || value === 'achromatopsia') {return value;}
    throw new RangeError(`Unsupported CVD preview type: ${value}`);
  }
}

class GalleryMetadataSlot {
  private static isRecord(value: unknown): value is Record<string, unknown> {
    return value !== null && typeof value === 'object' && !Array.isArray(value);
  }

  private static isRgb(value: unknown): boolean {
    return GalleryMetadataSlot.isRecord(value)
      && typeof value.b === 'number'
      && typeof value.g === 'number'
      && typeof value.r === 'number';
  }

  private static isOklch(value: unknown): boolean {
    return GalleryMetadataSlot.isRecord(value)
      && typeof value.c === 'number'
      && typeof value.h === 'number'
      && typeof value.l === 'number';
  }

  private static isSourceFormat(value: unknown): boolean {
    return value === 'hex'
      || value === 'rgb'
      || value === 'hsl'
      || value === 'oklch'
      || value === 'lab'
      || value === 'named'
      || value === 'imagePixel'
      || value === 'displayP3';
  }

  private static isIntent(value: unknown): boolean {
    return value === undefined
      || value === 'text'
      || value === 'background'
      || value === 'accent'
      || value === 'muted'
      || value === 'critical'
      || value === 'positive'
      || value === 'link'
      || value === 'button'
      || value === 'onAccent'
      || value === 'onButton';
  }

  private static isHints(value: unknown): boolean {
    return value === undefined
      || (GalleryMetadataSlot.isRecord(value)
        && GalleryMetadataSlot.isIntent(value.intent)
        && (value.role === undefined || typeof value.role === 'string')
        && (value.weight === undefined || typeof value.weight === 'number'));
  }

  private static isColorRecord(value: unknown): value is ColorRecordInterfaceType {
    return GalleryMetadataSlot.isRecord(value)
      && typeof value.alpha === 'number'
      && typeof value.hex === 'string'
      && GalleryMetadataSlot.isOklch(value.oklch)
      && GalleryMetadataSlot.isRgb(value.rgb)
      && GalleryMetadataSlot.isSourceFormat(value.sourceFormat)
      && (value.displayP3 === undefined || GalleryMetadataSlot.isRgb(value.displayP3))
      && GalleryMetadataSlot.isHints(value.hints);
  }

  private static isAlgorithm(value: unknown): value is GalleryAlgorithmType {
    return value === 'median-cut' || value === 'delta-e' || value === 'k-means' || value === 'wu-quantize';
  }

  private static isCandidate(value: unknown): value is GalleryCandidateInterfaceType {
    return GalleryMetadataSlot.isRecord(value)
      && GalleryMetadataSlot.isAlgorithm(value.algorithm)
      && Array.isArray(value.colors)
      && value.colors.every(GalleryMetadataSlot.isColorRecord)
      && typeof value.k === 'number'
      && typeof value.label === 'string';
  }

  private static isCandidates(value: unknown): value is GalleryCandidatesSlotType {
    return Array.isArray(value) && value.every(GalleryMetadataSlot.isCandidate);
  }

  private static isDominantColors(value: unknown): value is GalleryDominantColorsSlotType {
    return Array.isArray(value) && value.every(GalleryMetadataSlot.isColorRecord);
  }

  private static isHistogram(value: unknown): value is GalleryHistogramSlotInterfaceType {
    return GalleryMetadataSlot.isRecord(value)
      && typeof value.binCount === 'number'
      && Array.isArray(value.bins)
      && value.bins.every((bin) => {
        return GalleryMetadataSlot.isRecord(bin) && typeof bin.hex === 'string' && typeof bin.weight === 'number';
      })
      && typeof value.totalPixels === 'number';
  }

  static candidates(metadata: PaletteStateInterface['metadata']): GalleryCandidatesSlotType {
    const value = metadata['gallery:candidates'];
    if (value === undefined) {return [];}
    if (GalleryMetadataSlot.isCandidates(value)) {return value;}
    throw new TypeError('Metadata slot gallery:candidates does not match the candidate palette schema');
  }

  static dominantColors(metadata: PaletteStateInterface['metadata']): GalleryDominantColorsSlotType {
    const value = metadata['gallery:dominantColors'];
    if (value === undefined) {return [];}
    if (GalleryMetadataSlot.isDominantColors(value)) {return value;}
    throw new TypeError('Metadata slot gallery:dominantColors does not match the color-record schema');
  }

  static histogram(metadata: PaletteStateInterface['metadata']): GalleryHistogramSlotInterfaceType['bins'] {
    const value = metadata['gallery:histogram'];
    if (value === undefined) {return [];}
    if (GalleryMetadataSlot.isHistogram(value)) {return value.bins;}
    throw new TypeError('Metadata slot gallery:histogram does not match the histogram schema');
  }
}

class IridisContextFactory {
  static create() {
    /** Which optional stages currently run based on strictness. */
    const enabledOptionalStages = VueModule.computed<Set<string>>(() => {const result = optionalContrastStages(contrastStrictness.value);
      return result;});

    /** Slots the currently-enabled optional stages into `required` right after enforce:contrast. */
    class PipelineBuildOperation {
      static run(required: readonly string[]): string[] {
        const result = spliceOptionalStages(required, enabledOptionalStages.value);
        return result;
      }
    }

    const pipelineBuild = PipelineBuildOperation.run;

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
    class ModeGetOperation {
      static run(): ModeType.Type {
        const result = uiState.value.mode;
        return result;
      }
    }

    class ModeSetOperation {
      static run(mode: ModeType.Type): void {
        sendUiEvent({ 'mode': mode, 'type': IridisUiActionType.SELECT_MODE });
      }
    }

    const mode = VueModule.computed<ModeType.Type>({
      'get': ModeGetOperation.run,
      'set': ModeSetOperation.run
    });
    class DefaultPaletteSeedsOperation {
      static run(): PickerSeedType[] {
        return [
          { 'hex': '#000000', 'role': undefined },
          { 'hex': '#ffffff', 'role': undefined }
        ];
      }
    }

    const defaultPaletteSeeds = DefaultPaletteSeedsOperation.run;

    const pickerSeeds = VueModule.ref<PickerSeedType[]>(defaultPaletteSeeds());
    /** Same shape as pickerSeeds — a role pinned here (image mode) and a role
 * pinned there (picker mode) are the exact same concept, so both modes share
 * one representation instead of a parallel hex-only list plus a separate
 * index->role map. */
    const imageSeeds = VueModule.ref<PickerSeedType[]>(defaultPaletteSeeds());

    /**
 * Rebuilds imageSeeds from a fresh hex list (a recombine, or a newly-selected
 * candidate palette) while carrying forward any role a user had pinned on a
 * hex that's still present — matched by hex value, not index, since a
 * recombine can reorder/add/drop hues. Without this, any Combine-stage tweak
 * (or picking a different candidate) would silently wipe every pin made on
 * RefinePaletteCard.vue, the same clobber pickerSeeds is already guarded
 * against (see the mode !== 'picker' check below).
 */
    class WithPreservedRolesOperation {
      static run(hexes: readonly string[], previous: readonly PickerSeedType[]): PickerSeedType[] {
        const roleByHex = new Map<string, string | undefined>();
        for (const seed of previous) {roleByHex.set(seed.hex, seed.role);}
        return hexes.map((hex) => {return { 'hex': hex, 'role': roleByHex.get(hex) };});
      }
    }

    const withPreservedRoles = WithPreservedRolesOperation.run;

    class HydratePaletteSeedsOperation {
      static run(hexes: readonly string[], previous: readonly PickerSeedType[]): PickerSeedType[] {
        return hexes.length === 0 ? defaultPaletteSeeds() : withPreservedRoles(hexes, previous);
      }
    }

    const hydratePaletteSeeds = HydratePaletteSeedsOperation.run;

    const framing = VueModule.ref<FramingType.Type>('dark');
    const schemaName = VueModule.ref<string>(DEFAULT_SCHEMA_NAME);
    const contrastStrictness = VueModule.ref<number>(2);
    const colorSpace = VueModule.ref<'srgb' | 'displayP3'>('srgb');
    /**
 * CVD "correct" mode flag, threaded through as `input.contrast.cvdCorrect` —
 * when true, enforce:cvdSimulate (packages/contrast) auto-corrects failing
 * pairs instead of only warning. Off by default.
 */
    const cvdCorrect = VueModule.ref<boolean>(false);

    /**
 * Color derivation configuration — one hue-algorithm choice per derivedFrom
 * relation (keyed by the child role's own name). Passed through metadata to
 * the derive:roleRelations/derive:semanticHues pipeline tasks, which write
 * the resolved overrides those relations consult; changing it re-runs the
 * whole pipeline via the FSM's schedule(), the same as any other palette
 * parameter — never recomputed and reapplied client-side.
 */
    const derivationConfig = VueModule.ref<DerivationConfigType>(DEFAULT_DERIVATION_CONFIG);

    /** Merges a single relation's config into `derivationConfig` and re-runs the pipeline — the ONLY way a relation changes; the resolved hue is always recomputed by derive:roleRelations, never written directly here. */
    class RelationUpdateOperation {
      static run(roleName: string, relation: RoleRelationDerivationType): void {
        const patch: Record<string, RoleRelationDerivationType> = {};
        patch[roleName] = relation;
        relationsUpdate(patch);
      }
    }

    const relationUpdate = RelationUpdateOperation.run;

    /**
 * Merges a whole batch of relations into `derivationConfig` in a SINGLE
 * dispatch — required (not just an optimization) for a multi-child bulk
 * change like "apply this algorithm to every child in a hub": the FSM's
 * `EffectInterpreter.send()` is async, so firing one `send()` per relation
 * in a tight synchronous loop races — only the first lands before the
 * interpreter is busy processing it, and the rest are silently dropped.
 * One dispatch carrying every changed relation sidesteps the race entirely.
 */
    class RelationsUpdateOperation {
      static run(newRelations: Record<string, RoleRelationDerivationType>): void {
        const updated: DerivationConfigType = { 'relations': { ...derivationConfig.value.relations, ...newRelations } };
        sendUiEvent({ 'config': updated, 'type': IridisUiActionType.SET_DERIVATION_CONFIG });
      }
    }

    const relationsUpdate = RelationsUpdateOperation.run;

    /**
 * Whether `derive:semanticHues` runs at all — when off, success/warning/
 * error/info keep whatever hue their own relation (or the schema default)
 * gives them, with no built-in nudge toward their intent's conventional
 * meaning. Passed through metadata; the task itself checks this and is a
 * full no-op when disabled, same as any other palette parameter.
 */
    const semanticHuesEnabled = VueModule.ref(true);
    class SemanticHuesEnabledSetOperation {
      static run(enabled: boolean): void {
        sendUiEvent({ 'enabled': enabled, 'type': IridisUiActionType.SET_SEMANTIC_HUES_ENABLED });
      }
    }

    const semanticHuesEnabledSet = SemanticHuesEnabledSetOperation.run;

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
    const cvdPreviewTypes = VueModule.ref<Set<CvdType>>(new Set());

    /** Diagram view state (zoom level, pan offset, expanded fullscreen mode). */
    const diagramScale = VueModule.ref<number>(1);
    const diagramTranslateX = VueModule.ref<number>(0);
    const diagramTranslateY = VueModule.ref<number>(0);
    const diagramIsExpanded = VueModule.ref<boolean>(false);

    const roles = VueModule.ref<RoleHexMapType>({});
    const roleViews = VueModule.ref<RoleViewType[]>([]);
    const roleClamps = VueModule.ref<RoleClampMapInterfaceType>({});
    const roleDistances = VueModule.ref<RoleDistanceMapInterfaceType>({});
    const rolesSynthesized = VueModule.ref<string[]>([]);
    const rolesPinned = VueModule.ref<string[]>([]);
    const rolesDerived = VueModule.ref<string[]>([]);
    const scales = VueModule.ref<ScaleMapType>({});
    const histogram = VueModule.ref<GalleryHistogramSlotInterfaceType['bins']>([]);
    /**
 * Reference-counted rather than a single boolean: run(), combineNowRun(), and
 * addUploadedImagesUnqueued() can all be in flight at once (e.g. a debounced
 * run() firing synchronously while an uploaded image is still awaiting
 * ToPixels.decode()). A plain shared boolean would let whichever call
 * finishes first clear it out from under the others still running; counting
 * active operations means `running` only goes false once every one of them
 * has completed.
 */
    const activeOperations = VueModule.ref<number>(0);
    const running = VueModule.computed<boolean>(() => {return activeOperations.value > 0;});
    /** Marks one operation as started — pair with `endOperation()` in a `finally`. */
    class BeginOperationOperation {
      static run(): void { activeOperations.value += 1; }
    }

    const beginOperation = BeginOperationOperation.run;
    /** Marks one operation as finished. */
    class EndOperationOperation {
      static run(): void { activeOperations.value -= 1; }
    }

    const endOperation = EndOperationOperation.run;

    /**
 * Single source of truth for "sort the role list by ___" — every place the
 * full resolved-role set is listed (Roles table, Resolved roles, Clamps)
 * reads the SAME sortedRoleContrastRows / roleSortKeys rather than keeping
 * its own local sort state, so changing the sort in one place changes it
 * everywhere else showing the palette. Default matches the compliance-first
 * ordering Roles table already shipped with.
 */
    const roleSortKeys = VueModule.ref<RoleSortKeyType[]>([{ 'desc': true, 'field': 'compliance' }, { 'desc': true, 'field': 'ratio' }]);

    const roleContrastRows = VueModule.computed<(RoleSortableRowType & { 'hex': string })[]>(() => {
      // 'background' is a required role in every schema tier (RoleSchemaByName.ts),
      // and run() resolves it synchronously before any component can read this —
      // never a hardcoded placeholder.
      const bg = roles.value.background;
      if (bg === undefined) {throw new Error('Resolved palette is missing the required background role');}
      const schema = roleSchemaByName[schemaName.value]?.[framing.value];
      return roleViews.value.map((r) => {
        const ratio = contrastRatio(r.hex, bg);
        return { 'c': r.c, 'compliance': complianceFor(ratio, minimumRatioForRole(schema, r.name)), 'h': r.h, 'hex': r.hex, 'l': r.l, 'name': r.name, 'ratio': ratio };
      });
    });

    const sortedRoleContrastRows = VueModule.computed(() => { const result = sortRoleRows(roleContrastRows.value, roleSortKeys.value); return result; });
    const error = VueModule.ref<string | null>(null);

    /** Raw contrast-check metadata from the last run, keyed by algorithm rather than the `contrast:*` metadata prefix. */
    const contrastReport = VueModule.ref<{
      'aa'?:   WcagPairResultSetInterfaceType;
      'aaa'?:  WcagPairResultSetInterfaceType;
      'apca'?: ApcaPairResultSetInterfaceType;
      'cvd'?:  CvdResultSetInterfaceType;
    }>({});

    /* Image-extraction controls (mirror the engine's gallery config knobs). */
    const imgAlgorithm = VueModule.ref<GalleryAlgorithmType>('delta-e');
    const imgK = VueModule.ref<number>(8);
    const imgHistogramBits = VueModule.ref<number>(5);
    const imgDeltaECap = VueModule.ref<number>(128);
    const imgHarmonize = VueModule.ref<number>(10);
    /* Each envelope is a UNION of ranges, not a single continuous span — lets a
 * user keep e.g. two disjoint lightness bands (shadows + highlights) without
 * also keeping the midtones between them. */
    const imgLightnessRange = VueModule.ref<[number, number][]>([[0, 1]]);
    const imgChromaRange = VueModule.ref<[number, number][]>([[0, 0.5]]);
    /**
 * Every uploaded image, each independently decoded and reduced to its own
 * dominant colors (Stage 1) with its own algorithm/k/histogram/range
 * settings. The combine stage (see `combine()` below) concatenates every
 * entry's `dominantColors` into the final palette that themes the page.
 */
    const uploadedImages = VueModule.ref<UploadedImageInterfaceType[]>([]);
    /** The (typically 3) non-destructive candidate palettes from gallery:extractCandidates for the last image-driven run — one algorithm's clustering result each. */
    const candidates = VueModule.ref<GalleryCandidateInterfaceType[]>([]);
    /** Label of the candidate currently populating imageSeeds, if the user picked one via PaletteCandidatePicker.vue — null means imageSeeds still holds the default gallery:dominantColors extraction. */
    const selectedCandidateLabel = VueModule.ref<string | null>(null);
    /**
 * When true, every auto-trigger of the combine stage (new upload, per-image
 * setting edit, combine-stage setting edit) is suppressed — only the
 * "Re-run" button (`reRunCombine`) recombines. Default false reproduces
 * today's fully-reactive behavior exactly.
 */
    const combineLocked = VueModule.ref<boolean>(false);

    /**
 * Image extraction's color COUNT is the same concept as the role schema's
 * role count (iridis-4/8/12/16/32) — not a second, independently-tunable
 * number. schemaName is the single source of truth; this keeps imgK in sync
 * whenever it changes (from either the Schema & Compliance control or the
 * mirrored control in the Image card).
 */
    VueModule.watch(schemaName, (v) => { imgK.value = schemaRoleCount(v); }, { 'immediate': true });

    /** Whichever seed list is live for the current mode — imageSeeds and pickerSeeds share one shape now, so this is a plain switch, not a reshape. */
    const activeSeeds = VueModule.computed<PickerSeedType[]>(() => {return (mode.value === 'image' ? imageSeeds.value : pickerSeeds.value);});

    /**
 * Role names a seed can actually be pinned to for the active schema+framing —
 * restricted to IRIDIS_CONSTANTS.USED_ROLE_NAMES so the list matches roles the demo page really
 * renders somewhere distinct (a Nuxt UI alias, a --ui-* CSS var, a syntax-*
 * token color), not just whatever the schema happens to declare. Both
 * independently-resolved roles (background/text/brand/muted/error) AND
 * schema-derived ones (success/warning/info/accent-alt/syntax-*) work now —
 * pin:derivedRoles (in the pipeline between resolve:roles and expand:family)
 * overrides ExpandFamily's hue-rotation for whichever role a seed is pinned to.
 */
    const pinnableRoles = VueModule.computed<string[]>(() => {
      const pair = roleSchemaByName[schemaName.value] ?? roleSchemaByName[DEFAULT_SCHEMA_NAME];
      const schema = pair?.[framing.value];
      if (schema === undefined) {return [];}
      return schema.roles.reduce<string[]>((names, role) => {
        if (IRIDIS_CONSTANTS.USED_ROLE_NAMES.has(role.name)) { names.push(role.name); }
        return names;
      }, []);
    });

    class IngestOperation {
      static run(state: PaletteStateInterface): void {
        const engineMaps = Tokens.extractEngineMaps(state);
        const views: RoleViewType[] = [];
        for (const [name, r] of Object.entries(state.roles)) {
          views.push({ 'c': r.oklch.c, 'displayP3': r.displayP3, 'h': r.oklch.h, 'hex': r.hex, 'l': r.oklch.l, 'name': name });
        }
        roles.value = engineMaps.roles;
        roleViews.value = views;
        roleClamps.value = EngineMetadata.get(state.metadata, 'core:roleClamps') ?? {};
        roleDistances.value = EngineMetadata.get(state.metadata, 'core:roleDistances') ?? {};
        rolesSynthesized.value = EngineMetadata.get(state.metadata, 'core:rolesSynthesized') ?? [];
        rolesPinned.value = EngineMetadata.get(state.metadata, 'core:rolesPinned') ?? [];
        rolesDerived.value = EngineMetadata.get(state.metadata, 'core:rolesDerived') ?? [];
        scales.value = engineMaps.scales;
        contrastReport.value = {
          'aa':   getContrastMetadata(state.metadata, 'contrast:aa'),
          'aaa':  getContrastMetadata(state.metadata, 'contrast:aaa'),
          'apca': getContrastMetadata(state.metadata, 'contrast:apca'),
          'cvd':  getContrastMetadata(state.metadata, 'contrast:cvd')
        };
        if (typeof document !== 'undefined') {
          Tokens.apply(Tokens.mapFromEngine(engineMaps.roles, engineMaps.scales), framing.value);
        }
      }
    }

    const ingest = IngestOperation.run;

    /** run()'s engine input whenever neither seed list has anything yet (see run() below) — never surfaced as pickerSeeds/imageSeeds, so it never appears as a phantom entry in Manual or the per-image cards. */
    const BOOTSTRAP_SEEDS: PickerSeedType[] = defaultPaletteSeeds();

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
    class RunOperation {
      static run(framingOverride?: FramingType.Type): void {
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
          const targetRoles = pair[targetFraming];
          const state = engine.run({
            'bypass':   undefined,
            'colors':   pickerSeedInputs(seeds),
            'contrast': contrastConfigFor(contrastStrictness.value, cvdCorrect.value),
            'emit':     undefined,
            'maxColors': undefined,
            'metadata': { 'core:variantConfig': VARIANT_CONFIG, 'derivation:config': derivationConfig.value, 'derivation:semanticHuesEnabled': semanticHuesEnabled.value },
            'roles':    targetRoles,
            'runtime':  { 'colorSpace': colorSpace.value, 'extra': undefined, 'framing': targetFraming }
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
    }

    const run = RunOperation.run;

    /** Decode an image source into raw pixel data, downscaled for the gallery pipeline. */
    class ToPixels {
      static async decode(sourceUrl: string): Promise<{ 'data': Uint8ClampedArray; 'height': number; 'width': number; }> {
        const img = new Image();
        img.crossOrigin = 'anonymous';
        await new Promise<void>((resolve, reject) => {
          img.onload = () => { const result = resolve(); return result; };
          img.onerror = () => { const result = reject(new Error('Image load failed')); return result; };
          img.src = sourceUrl;
        });
        const MAXIMUM_DIMENSION = 180;
        const long = Math.max(img.naturalWidth, img.naturalHeight);
        const scale = long > MAXIMUM_DIMENSION ? MAXIMUM_DIMENSION / long : 1;
        const w = Math.max(1, Math.round(img.naturalWidth * scale));
        const h = Math.max(1, Math.round(img.naturalHeight * scale));
        const canvas = document.createElement('canvas');
        canvas.width = w; canvas.height = h;
        const context = canvas.getContext('2d', { 'willReadFrequently': true });
        if (context === null) {throw new Error('no 2D context');}
        context.drawImage(img, 0, 0, w, h);
        return { 'data': context.getImageData(0, 0, w, h).data, 'height': h, 'width': w };
      }
    }

    /** Raw decoded pixel buffers, keyed by `UploadedImageInterfaceType.id` — kept out of the reactive `uploadedImages` entries so Vue never deep-wraps a pixel array. */
    class PixelCache {
      static readonly entries = new Map<string, { 'data': Uint8ClampedArray; 'height': number; 'width': number }>();
    }
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

    /**
 * Seeds a freshly-uploaded entry's own settings from the CURRENT combine-stage
 * refs — sensible per-image defaults that become independently mutable
 * afterward. Returns a full `UploadedImageInterfaceType`: the not-yet-computed
 * fields (`candidates`, `dominantColorRecords`, `histogram`, `id`, `name`,
 * `selectedCandidateLabel`, `src`) get placeholder defaults that the caller
 * overwrites with the real per-call values (a freshly-uploaded entry) — also
 * reused as-is by `combineNowRun` to build the combine stage's own gallery
 * metadata, where those placeholders are never read.
 */
    class DefaultEntrySettingsOperation {
      static run(): UploadedImageInterfaceType {
        return {
          'algorithm':               imgAlgorithm.value,
          'candidates':               [],
          'chromaRange':              cloneRanges(imgChromaRange.value),
          'deltaECap':                imgDeltaECap.value,
          'dominantColorRecords':     [],
          'harmonizeThreshold':       imgHarmonize.value,
          'histogram':                [],
          'histogramBits':            imgHistogramBits.value,
          'id':                       '',
          'k':                        imgK.value,
          'lightnessRange':           cloneRanges(imgLightnessRange.value),
          'name':                     '',
          'selectedCandidateLabel':   null,
          'src':                      ''
        };
      }
    }

    const defaultEntrySettings = DefaultEntrySettingsOperation.run;

    /** Builds the `metadata.gallery` object handed to engine.run() — shared by EntryStage1.extract (per-image, passing that entry directly) and combineNowRun (the combine stage itself, passing `defaultEntrySettings()`), rather than two independent object literals repeating the same field list and range-cloning. */
    class GalleryMetadata {
      static build(source: UploadedImageInterfaceType): {
        'algorithm':          GalleryAlgorithmType;
        'candidates':         GalleryCandidateInterfaceType[];
        'chromaRange':        [number, number][];
        'deltaECap':          number;
        'harmonizeThreshold': number;
        'histogramBits':      number;
        'k':                  number;
        'lightnessRange':     [number, number][];
      } {
        return {
          'algorithm':          source.algorithm,
          'candidates':         allCandidateAlgorithms(source.k),
          'chromaRange':        cloneRanges(source.chromaRange),
          'deltaECap':          source.deltaECap,
          'harmonizeThreshold': source.harmonizeThreshold,
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
        const pixels = PixelCache.entries.get(entry.id);
        if (pixels === undefined) {return;}
        engine.pipeline(IRIDIS_CONSTANTS.IMAGE_ENTRY_STAGES);
        const state = engine.run({
          'bypass':   undefined,
          'colors':   [pixels],
          'contrast': undefined,
          'emit':     undefined,
          'maxColors': undefined,
          'metadata': {
            'gallery': GalleryMetadata.build(entry)
          },
          'roles':    undefined,
          'runtime':  undefined
        });
        const hist = GalleryMetadataSlot.histogram(state.metadata);
        entry.histogram = [...hist].sort((a, b) => {return b.weight - a.weight;}).slice(0, 96);
        const dominant = GalleryMetadataSlot.dominantColors(state.metadata);
        const validDominant = dominant.filter((c) => { const result = isValidHex(c.hex);
          return result; });
        entry.dominantColorRecords = validDominant.map((c) => { return { 'hex': c.hex, 'weight': c.hints?.weight ?? 1 }; });
        entry.candidates = GalleryMetadataSlot.candidates(state.metadata);
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
    class WeightedHexesForOperation {
      static run(entry: UploadedImageInterfaceType): readonly { 'hex': string; 'weight': number }[] {
        if (entry.selectedCandidateLabel !== null) {
          const match = entry.candidates.find((c) => {return c.label === entry.selectedCandidateLabel;});
          if (match !== undefined) {
            return match.colors.map((c) => {return { 'hex': c.hex, 'weight': c.hints?.weight ?? 1 };});
          }
        }
        return entry.dominantColorRecords;
      }
    }

    const weightedHexesFor = WeightedHexesForOperation.run;

    /** Plain hex list (no weight) — used wherever only the color values matter, e.g. the Upload card's per-image summary swatches. */
    class EffectiveHexesForOperation {
      static run(entry: UploadedImageInterfaceType): readonly string[] {
        const result = weightedHexesFor(entry).map((w) => {const result = w.hex;
          return result;});
        return result;
      }
    }

    const effectiveHexesFor = EffectiveHexesForOperation.run;

    /**
 * Expands a weighted {hex, weight} multiset into a flat hex array sized
 * proportionally to each entry's share of the total weight, capped at
 * `budget` total entries — feeding this through intake:any → gallery:histogram
 * reconstructs an approximately cumulative, pixel-weighted histogram (repeated
 * identical hex strings accumulate bin weight via plain frequency counting),
 * since the engine has no input path for pre-weighted color records.
 */
    class ExpandWeightedOperation {
      static run(weighted: readonly { 'hex': string; 'weight': number }[], budget: number): string[] {
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
    }

    const expandWeighted = ExpandWeightedOperation.run;

    /**
 * Stage 2 — gathers every uploaded image's own weighted contribution
 * (`weightedHexesFor`, respecting per-image candidate selection) and expands
 * it into a cumulative, pixel-weighted hex multiset (`expandWeighted`), then
 * runs that through the combine pipeline (IRIDIS_CONSTANTS.REQUIRED_IMAGE_STAGES). The
 * resulting histogram genuinely reflects the merged pixel density across
 * every uploaded image, not an equal-weight-per-representative-color
 * approximation. The combine-stage settings are the existing shared
 * imgAlgorithm/imgK/imgHistogramBits/imgDeltaECap/imgHarmonize/imgLightnessRange/
 * imgChromaRange refs — they now control the FINAL merge across all images,
 * not any single photo's extraction.
 */
    /** Gated auto-trigger — every reactive call site goes through this, so `combineLocked` suppresses them uniformly. */
    class CombineOperation {
      static run(): void {
        if (combineLocked.value) {return;}
        combineNowRun();
      }
    }

    const combine = CombineOperation.run;

    /** Always recombines immediately, ignoring the lock — what the "Re-run" button calls. */
    class ReRunCombineOperation {
      static run(): void {
        combineNowRun();
      }
    }

    const reRunCombine = ReRunCombineOperation.run;

    class CombineNowRunOperation {
      static run(): void {
        if (typeof document === 'undefined') {return;}
        const entries = uploadedImages.value;
        const weightedContributions = entries.flatMap((e) => {const result = weightedHexesFor(e);
          return result;});
        const combinedHexes = expandWeighted(weightedContributions, IRIDIS_CONSTANTS.CUMULATIVE_HISTOGRAM_BUDGET);
        if (combinedHexes.length === 0) {
          histogram.value = [];
          imageSeeds.value = defaultPaletteSeeds();
          pickerSeeds.value = defaultPaletteSeeds();
          candidates.value = [];
          selectedCandidateLabel.value = null;
          return;
        }
        beginOperation();
        error.value = null;
        try {
          const pair = roleSchemaByName[schemaName.value] ?? roleSchemaByName[DEFAULT_SCHEMA_NAME];
          if (pair === undefined) { return; }
          const activeRoles = pair[framing.value];
          engine.pipeline(pipelineBuild(IRIDIS_CONSTANTS.REQUIRED_IMAGE_STAGES));
          const state = engine.run({
            'bypass':   undefined,
            'colors':   combinedHexes,
            'contrast': contrastConfigFor(contrastStrictness.value, cvdCorrect.value),
            'emit':     undefined,
            'maxColors': undefined,
            'metadata': {
              'core:variantConfig': VARIANT_CONFIG,
              'derivation:config': derivationConfig.value,
              'derivation:semanticHuesEnabled': semanticHuesEnabled.value,
              'gallery': GalleryMetadata.build(defaultEntrySettings())
            },
            'roles':    activeRoles,
            'runtime':  { 'colorSpace': colorSpace.value, 'extra': undefined, 'framing': framing.value }
          });
          const hist = GalleryMetadataSlot.histogram(state.metadata);
          histogram.value = [...hist].sort((a, b) => {return b.weight - a.weight;}).slice(0, 96);
          const dominant = GalleryMetadataSlot.dominantColors(state.metadata);
          const schemaCount = schemaRoleCount(schemaName.value);
          const extracted: string[] = [];
          for (const color of dominant) {
            if (isValidHex(color.hex)) { extracted.push(color.hex); }
            if (extracted.length >= schemaCount) { break; }
          }
          imageSeeds.value = hydratePaletteSeeds(extracted, imageSeeds.value);
          pickerSeeds.value = hydratePaletteSeeds(extracted, pickerSeeds.value);
          candidates.value = GalleryMetadataSlot.candidates(state.metadata);
          selectedCandidateLabel.value = null;
          sendUiEvent({ 'hexes': extracted, 'type': IridisUiActionType.POPULATE_PICKER_FROM_IMAGE });
          ingest(state);
        } catch (e) {
          error.value = e instanceof Error ? e.message : String(e);
        } finally {
          endOperation();
        }
      }
    }

    const combineNowRun = CombineNowRunOperation.run;

    /**
 * Decodes and adds one or more images as new `uploadedImages` entries, each
 * running its own Stage 1 extraction independently, then recombines. Used
 * for both file uploads and the "Try a sample" button — the sample image is
 * just another entry, added rather than replacing what's already uploaded.
 *
 * Queued onto {@link uploadedImagesQueue} rather than run directly — see
 * that variable's comment for why concurrent calls must be serialized.
 */
    class AddUploadedImagesOperation {
      static async run(sources: readonly (File | string)[], sampleNames?: readonly string[]): Promise<void> {
        const next = uploadedImagesQueue.then(() => {const result = addUploadedImagesUnqueued(sources, sampleNames);
          return result;});
        // Swallow here so one call's failure doesn't wedge the queue for every
        // subsequent call — addUploadedImagesUnqueued already records the error
        // in the shared `error` ref via its own try/catch.
        uploadedImagesQueue = next.catch(() => {});
        return await next;
      }
    }

    const addUploadedImages = AddUploadedImagesOperation.run;

    class AddUploadedImagesUnqueuedOperation {
      static async run(sources: readonly (File | string)[], sampleNames?: readonly string[]): Promise<void> {
        if (typeof document === 'undefined' || sources.length === 0) {return;}
        beginOperation();
        error.value = null;
        try {
          const added: UploadedImageInterfaceType[] = [];
          const sourceCount = sources.length;
          for (let i = 0; i < sourceCount; i++) {
            const source = sources[i];
            if (source === undefined) {throw new RangeError(`Image source index ${i} is outside the supplied source list`);}
            const sourceUrl = typeof source === 'string' ? source : URL.createObjectURL(source);
            const name = typeof source === 'string' ? (sampleNames?.[i] ?? 'Sample') : source.name;
            const pixels = await ToPixels.decode(sourceUrl);
            const id = ImageId.make();
            PixelCache.entries.set(id, pixels);
            const entry: UploadedImageInterfaceType = {
              ...defaultEntrySettings(),
              'candidates':              [],
              'dominantColorRecords':    [],
              'histogram':               [],
              'id':                      id,
              'name':                    name,
              'selectedCandidateLabel':  null,
              'src':                     sourceUrl
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
    }

    const addUploadedImagesUnqueued = AddUploadedImagesUnqueuedOperation.run;

    /** Drops one uploaded image and recombines — every other entry is untouched. */
    class RemoveUploadedImageOperation {
      static run(id: string): void {
        const entry = uploadedImages.value.find((e) => {return e.id === id;});
        if (entry?.src.startsWith('blob:') === true) {
          URL.revokeObjectURL(entry.src);
        }
        PixelCache.entries.delete(id);
        entryReextract.cancel(id);
        uploadedImages.value = uploadedImages.value.filter((e) => {return e.id !== id;});
        scheduleCombine();
      }
    }

    const removeUploadedImage = RemoveUploadedImageOperation.run;

    /**
 * Mutates ONE uploaded image's own settings and schedules ONLY that image's
 * re-extraction (debounced), not every uploaded image. `patch` is a full
 * `UploadedImageInterfaceType` — the caller (UploadedImageCard.vue) builds it
 * by spreading the entry's own current props with the one changed field
 * overridden, so every key is already present; `Object.assign` below just
 * reassigns each field to its (mostly unchanged) value.
 */
    class UploadedImageSettingUpdateOperation {
      static run(id: string, patch: UploadedImageInterfaceType): void {
        const entry = uploadedImages.value.find((e) => {return e.id === id;});
        if (entry === undefined) {return;}
        Object.assign(entry, patch);
        entryReextract.schedule(id);
      }
    }

    const uploadedImageSettingUpdate = UploadedImageSettingUpdateOperation.run;

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
    class SelectEntryCandidateOperation {
      static run(id: string, label: string): void {
        const entry = uploadedImages.value.find((e) => {return e.id === id;});
        if (entry === undefined) {return;}
        entry.selectedCandidateLabel = label;
        combine();
      }
    }

    const selectEntryCandidate = SelectEntryCandidateOperation.run;

    /**
 * Performs the picker-seed array mutation for the FSM's MUTATE_SEEDS effect.
 * Registered once below via registerMutateSeedsHandler — PaletteControls.vue
 * triggers this indirectly via useIridisUiMachine().send({type: IridisUiActionType.ADD_SEED|...}),
 * never by calling array mutation directly.
 */
    class MutateSeedsOperation {
      static run(effect: IridisEffects.MutateSeeds): void {
        if (effect.op === 'add') {
          // A freshly added seed with no explicit hex starts as the current
          // engine-resolved brand color (a required role in every schema tier),
          // never a hardcoded placeholder — the user edits it from there.
          const nextHex = effect.hex ?? roles.value.brand;
          if (nextHex === undefined) {throw new Error('Cannot add a seed before the required brand role is resolved');}
          if (pickerSeeds.value.length < 32) {pickerSeeds.value = [...pickerSeeds.value, { 'hex': nextHex, 'role': undefined }];}
        } else if (effect.op === 'remove') {
          if (pickerSeeds.value.length > 1) {pickerSeeds.value = pickerSeeds.value.filter((_, index) => {return index !== effect.index;});}
        } else if (effect.op === 'set') {
          pickerSeeds.value = pickerSeeds.value.map((seed, index) => {return (index === effect.index ? { ...seed, 'hex': effect.hex } : seed);});
        }
        // Explicit, not just relying on the pickerSeeds deep watch below — every
        // seed edit is a config change that must re-run the engine.
        schedule();
      }
    }

    const mutateSeeds = MutateSeedsOperation.run;
    registerMutateSeedsHandler(mutateSeeds);

    /**
 * Performs the seed-role pin/unpin mutation for the FSM's PIN_SEED_ROLE effect.
 * Pinning attaches `hints.role` (via IntakeHexHint) so ResolveRoles assigns that
 * seed to the named role directly instead of by nearest-OKLCH-distance.
 * Ensures that a role can only be pinned to one seed at a time.
 */
    class PinSeedRoleOperation {
      static run(effect: IridisEffects.PinSeedRole): void {
        const applyPin = (seeds: PickerSeedType[]): PickerSeedType[] => { const result = seeds.map((seed, index) => {
          if (effect.role !== undefined && seed.role === effect.role && index !== effect.index) {
            return { ...seed, 'role': undefined };
          }
          return (index === effect.index ? { ...seed, 'role': effect.role } : seed);
        }); return result; };
        if (mode.value === 'image') {
          imageSeeds.value = applyPin(imageSeeds.value);
        } else {
          pickerSeeds.value = applyPin(pickerSeeds.value);
        }
        schedule();
      }
    }

    const pinSeedRole = PinSeedRoleOperation.run;
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
    class PaletteParamSetOperation {
      static run(effect: IridisEffects.SetPaletteParameter): void {
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
    }

    const paletteParamSet = PaletteParamSetOperation.run;
    registerSetPaletteParamHandler(paletteParamSet);

    /**
 * Performs diagram view state mutations (zoom, pan, expand/collapse) for the
 * FSM's UPDATE_DIAGRAM_VIEW effect. MermaidDiagram.vue sends DIAGRAM_* events
 * rather than mutating scale/translate/isExpanded directly.
 */
    class DiagramViewUpdateOperation {
      static run(effect: IridisEffects.UpdateDiagramView): void {
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
    }

    const diagramViewUpdate = DiagramViewUpdateOperation.run;
    registerUpdateDiagramViewHandler(diagramViewUpdate);

    /**
 * Performs CVD preview type mutations (toggle/clear) for the FSM's
 * UPDATE_CVD_PREVIEW effect. CvdVision.vue sends CVD_* events rather than
 * mutating cvdPreviewTypes directly.
 */
    class CvdPreviewUpdateOperation {
      static run(effect: IridisEffects.UpdateCvdPreview): void {
        if (effect.op === 'toggle') {
          const cvdType = CvdTypeRegistry.resolve(effect.cvdType);
          const next = new Set(cvdPreviewTypes.value);
          if (next.has(cvdType)) {
            next.delete(cvdType);
          } else {
            next.add(cvdType);
          }
          cvdPreviewTypes.value = next;
        } else if (effect.op === 'clear') {
          cvdPreviewTypes.value = new Set();
        }
      }
    }

    const cvdPreviewUpdate = CvdPreviewUpdateOperation.run;
    registerUpdateCvdPreviewHandler(cvdPreviewUpdate);

    /**
 * Populates picker palette from extracted hues. Called when image extraction
 * completes or when extraction settings change, replacing picker seeds with
 * the N extracted hues (where N = schema count).
 */
    class PopulatePickerFromImageOperation {
      static run(effect: IridisEffects.PopulatePickerFromImage): void {
        pickerSeeds.value = hydratePaletteSeeds(effect.hexes, pickerSeeds.value);
      }
    }

    const populatePickerFromImage = PopulatePickerFromImageOperation.run;
    registerPopulatePickerFromImageHandler(populatePickerFromImage);

    const { 'activateTarget': activateNavigationTarget } = useNavigationTargets();

    /**
 * Resolves a NAVIGATE_TO_TARGET effect's targetId against the navigation
 * target table and moves there. useNavigationTargets.ts owns the resolution
 * logic (which stage a card belongs to, how to scroll to it) since it also
 * owns the target table itself.
 */
    class NavigateToTargetOperation {
      static run(effect: IridisEffects.NavigateToTarget): void {
        activateNavigationTarget(effect.targetId);
      }
    }

    const navigateToTarget = NavigateToTargetOperation.run;
    registerNavigateToTargetHandler(navigateToTarget);

    /** Mirrors HeroBanner.vue's `${base}logo.png` resolution — the sample extraction source. */
    class LogoUrlOperation {
      static run(): string {
        const appConfiguration = useRuntimeConfig().app;
        if (
          typeof appConfiguration !== 'object'
      || appConfiguration === null
      || !('baseURL' in appConfiguration)
      || typeof appConfiguration.baseURL !== 'string'
        ) {
          throw new TypeError('Nuxt runtime configuration must provide app.baseURL');
        }
        return `${appConfiguration.baseURL}logo.png`;
      }
    }

    const logoUrl = LogoUrlOperation.run;

    /**
 * Performs image extraction for the FSM's EXTRACT_IMAGE effect (one or more
 * uploaded files, or the built-in sample — the iridis logo). Registered
 * below via registerExtractImageHandler. The sample is added as ONE MORE
 * `uploadedImages` entry, same as any uploaded file — it never replaces
 * what's already uploaded.
 */
    class ImageEffectExtractOperation {
      static async run(effect: IridisEffects.ExtractImage): Promise<void> {
        if (effect.source === 'sample') {
          await addUploadedImages([logoUrl()], ['Sample']);
          return;
        }
        const files = Array.isArray(effect.file) ? effect.file : [effect.file];
        await addUploadedImages(files);
      }
    }

    const imageEffectExtract = ImageEffectExtractOperation.run;
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
    class SelectImageCandidateOperation {
      static run(effect: IridisEffects.SelectImageCandidate): void {
        imageSeeds.value = hydratePaletteSeeds(effect.hexes, imageSeeds.value);
        pickerSeeds.value = hydratePaletteSeeds(effect.hexes, pickerSeeds.value);
        selectedCandidateLabel.value = effect.label;
        schedule();
      }
    }

    const selectImageCandidate = SelectImageCandidateOperation.run;
    registerSelectImageCandidateHandler(selectImageCandidate);

    let booted = false;
    /** Stop-handles for the two deep watches below, captured so HMR teardown can release them — empty until `useIridis()` has booted once on the client. */
    let stopWatches: (() => void)[] = [];
    const schedule = debounce(() => { run(); }, 120);

    class UseIridisContextOperation {
      static run() {
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
            stopWatches.push(VueModule.watch([pickerSeeds, imageSeeds, schemaName, contrastStrictness, colorSpace, mode, enabledOptionalStages, cvdCorrect, derivationConfig, semanticHuesEnabled], schedule, { 'deep': true }));
            stopWatches.push(VueModule.watch([schemaName, imgAlgorithm, imgK, imgHistogramBits, imgDeltaECap, imgHarmonize, imgLightnessRange, imgChromaRange], scheduleCombine, { 'deep': true }));
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
    }

    const dispose = (): void => {
      for (const stopWatch of stopWatches) { stopWatch(); }
      stopWatches = [];
      booted = false;
    };

    return { 'dispose': dispose, 'use': UseIridisContextOperation.run };
  }
}

class IridisContextRegistry {
  static readonly #contexts = new WeakMap<object, ReturnType<typeof IridisContextFactory.create>>();

  static resolve(nuxtApp: object): ReturnType<typeof IridisContextFactory.create> {
    const existing = this.#contexts.get(nuxtApp);
    if (existing !== undefined) { return existing; }

    const context = IridisContextFactory.create();
    this.#contexts.set(nuxtApp, context);
    if (typeof window !== 'undefined') {
      ViteModule.metadata.hot?.dispose(context.dispose);
    }
    return context;
  }
}

class UseIridisOperation {
  static run() {
    const context = IridisContextRegistry.resolve(useNuxtApp());
    return context.use();
  }
}

export const useIridis = UseIridisOperation.run;
