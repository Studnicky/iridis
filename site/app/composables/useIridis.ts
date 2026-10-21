/**
 * Shared iridis engine state. Two mutually-exclusive modes — a color picker and
 * an image extractor — each with its own palette; switching modes swaps which
 * palette themes the page. Every color (roles AND the 50→950 scales) is produced
 * by engine.run(): scales come from derive:variant tonal steps, semantic hues
 * from hueOffset on the schema roles. The projector only reads those hexes.
 */

import type {
  ColorRecordInterfaceTypeEntity, PaletteStateInterface, RoleProvenanceInterfaceTypeEntity
} from '@studnicky/iridis';
import type { CvdMatrixInterfaceTypeEntity } from '@studnicky/iridis-contrast';
import type { ClusterStrategyInterface } from '@studnicky/iridis-image';
import type {
  GalleryDominantColorsSlotType, GalleryHistogramSlotInterfaceType
} from '@studnicky/iridis-image/types';
import type { ViteHotContext } from 'vite/types/hot.d.ts';

import { colorRecordFactory, InputInterfaceTypeEntity, Metadata } from '@studnicky/iridis';
import {
  ApcaPairResultSetInterfaceTypeEntity,
  CvdResultSetInterfaceTypeEntity,
  WcagPairResultSetInterfaceTypeEntity
} from '@studnicky/iridis-contrast';
import { ClusterDispatcher, GalleryCandidateOutputEntity, imagePlugin } from '@studnicky/iridis-image';
import { JsonValue } from '@studnicky/types/browser';
import * as VueModule from 'vue';

import { useNuxtApp, useRuntimeConfig } from '#imports';

import type { DerivationRelationInterfaceTypeEntity } from './entities/DerivationRelationInterfaceTypeEntity.ts';
import type { PickerSeedType, RoleHexMapType, RoleViewType, ScaleMapType, UploadedImage } from './types/index.ts';
import type { RoleMathClampType } from './types/roleMathClampType.ts';
import type { RoleSortKeyType } from './types/roleSortKeyType.ts';

import { contrastRatio } from '../theme/ContrastRatio.ts';
import { roleSchemaByName } from '../theme/RoleSchemaByName.ts';
import { Tokens } from '../theme/Tokens.ts';
import { cloneRanges } from '../utils/cloneRanges.ts';
import { complianceFor } from '../utils/complianceFor.ts';
import { debounce } from '../utils/debounce.ts';
import { isValidHex } from '../utils/isValidHex.ts';
import { keyedDebounce } from '../utils/keyedDebounce.ts';
import { minimumRatioForRole } from '../utils/minimumRatioForRole.ts';
import { RoleSortBehavior } from '../utils/roleSortBehavior.ts';
import { ROLE_SORT_FIELD_OPTIONS } from '../utils/roleSortFieldOptions.ts';
import { sortRoleRows } from '../utils/sortRoleRows.ts';
import { IRIDIS_CONSTANTS } from './constants/IridisConstants.ts';
import { ContrastConfigFor } from './contrastConfigFor.ts';
import { createColorEngine } from './createColorEngine.ts';
import { DerivationConfigInterfaceTypeEntity } from './entities/DerivationConfigInterfaceTypeEntity.ts';
import { FramingInterfaceTypeEntity } from './entities/FramingInterfaceTypeEntity.ts';
import { ModeInterfaceTypeEntity } from './entities/ModeInterfaceTypeEntity.ts';
import { RoleSortableRowInterfaceTypeEntity } from './entities/RoleSortableRowInterfaceTypeEntity.ts';
import { SchemaNameInterfaceTypeEntity } from './entities/SchemaNameInterfaceTypeEntity.ts';
import { optionalContrastStages } from './optionalContrastStages.ts';
import { pickerSeedInputs } from './pickerSeedInputs.ts';
import { REQUIRED_COLOR_STAGES } from './requiredColorStages.ts';
import { roleSchemaFor } from './roleSchemaFor.ts';
import { schemaRoleCount } from './schemaRoleCount.ts';
import { spliceOptionalStages } from './spliceOptionalStages.ts';
import { IridisUiEvent } from './types/index.ts';
import { useIridisUiMachine } from './useIridisUiMachine.ts';
import { useNavigationTargets } from './useNavigationTargets.ts';
import { VARIANT_CONFIG } from './variantConfig.ts';

class ViteModule {
  static readonly metadata: ImportMeta & { readonly 'hot'?: ViteHotContext } = import.meta;
}

/** Builds the serializable candidate requests accepted at the gallery metadata boundary. The extraction task resolves each algorithm into its executable ClusterStrategy internally. */
class AllCandidateAlgorithmsOperation {
  static run(k: number) {
    const result = IRIDIS_CONSTANTS.ALL_CANDIDATE_ALGORITHM_NAMES.map((algorithm) => {
      const candidate = { 'algorithm': algorithm, 'k': k, 'label': algorithm };
      return candidate;
    });
    return result;
  }
}

const allCandidateAlgorithms = AllCandidateAlgorithmsOperation.run;

class CvdTypeRegistry {
  static resolve(value: string): CvdMatrixInterfaceTypeEntity.Type['name'] {
    if (value === 'protanopia' || value === 'deuteranopia' || value === 'tritanopia' || value === 'achromatopsia') {
      const result = value;
      return result;
    }
    throw new RangeError(`Unsupported CVD preview type: ${value}`);
  }
}

namespace GalleryMetadataSlotEntity {
  export class GalleryMetadataSlot {
    private static isRecord(value: unknown): value is Record<string, unknown> {
      const result = value !== null && typeof value === 'object' && !Array.isArray(value);
      return result;
    }

    private static isRgb(value: unknown): boolean {
      const result = GalleryMetadataSlot.isRecord(value)
        && typeof value.b === 'number'
        && typeof value.g === 'number'
        && typeof value.r === 'number';
      return result;
    }

    private static isOklch(value: unknown): boolean {
      const result = GalleryMetadataSlot.isRecord(value)
        && typeof value.c === 'number'
        && typeof value.h === 'number'
        && typeof value.l === 'number';
      return result;
    }

    private static isSourceFormat(value: unknown): boolean {
      const result = value === 'hex'
        || value === 'rgb'
        || value === 'hsl'
        || value === 'oklch'
        || value === 'lab'
        || value === 'named'
        || value === 'imagePixel'
        || value === 'displayP3';
      return result;
    }

    private static isIntent(value: unknown): boolean {
      const result = value === undefined
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
      return result;
    }

    private static isHints(value: unknown): boolean {
      const result = value === undefined
        || (GalleryMetadataSlot.isRecord(value)
          && GalleryMetadataSlot.isIntent(value.intent)
          && (value.role === undefined || typeof value.role === 'string')
          && (value.weight === undefined || typeof value.weight === 'number'));
      return result;
    }

    private static isColorRecord(value: unknown): value is ColorRecordInterfaceTypeEntity.Type {
      const result = GalleryMetadataSlot.isRecord(value)
        && typeof value.alpha === 'number'
        && typeof value.hex === 'string'
        && GalleryMetadataSlot.isOklch(value.oklch)
        && GalleryMetadataSlot.isRgb(value.rgb)
        && GalleryMetadataSlot.isSourceFormat(value.sourceFormat)
        && (value.displayP3 === undefined || GalleryMetadataSlot.isRgb(value.displayP3))
        && GalleryMetadataSlot.isHints(value.hints);
      return result;
    }

    private static isDominantColors(value: unknown): value is GalleryDominantColorsSlotType {
      const result = Array.isArray(value) && value.every(GalleryMetadataSlot.isColorRecord);
      return result;
    }

    private static isHistogram(value: unknown): value is GalleryHistogramSlotInterfaceType {
      const result = GalleryMetadataSlot.isRecord(value)
        && typeof value.binCount === 'number'
        && Array.isArray(value.bins)
        && value.bins.every((bin) => {
          const isValid = GalleryMetadataSlot.isRecord(bin) && typeof bin.hex === 'string' && typeof bin.weight === 'number';
          return isValid;
        })
        && typeof value.totalPixels === 'number';
      return result;
    }

    static candidates(metadata: PaletteStateInterface['metadata']): GalleryCandidateOutputEntity.Type[] {
      const value = metadata['gallery:candidates'];
      if (value === undefined) {return [];}
      if (!Array.isArray(value)) {
        throw new TypeError('Metadata slot gallery:candidates does not match the candidate palette schema');
      }
      const result = value.map(GalleryCandidateOutputEntity.intake);
      return result;
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

}
class ContrastMetadataSlot {
  static apca(metadata: PaletteStateInterface['metadata']): ApcaPairResultSetInterfaceTypeEntity.Type | undefined {
    const value = metadata['contrast:apca'];
    if (value === undefined) {
      const result = undefined;
      return result;
    }
    const result = ApcaPairResultSetInterfaceTypeEntity.intake(value);
    return result;
  }

  static cvd(metadata: PaletteStateInterface['metadata']): CvdResultSetInterfaceTypeEntity.Type | undefined {
    const value = metadata['contrast:cvd'];
    if (value === undefined) {
      const result = undefined;
      return result;
    }
    const result = CvdResultSetInterfaceTypeEntity.intake(value);
    return result;
  }

  static wcagAa(metadata: PaletteStateInterface['metadata']): WcagPairResultSetInterfaceTypeEntity.Type | undefined {
    const value = metadata['contrast:aa'];
    if (value === undefined) {
      const result = undefined;
      return result;
    }
    const result = WcagPairResultSetInterfaceTypeEntity.intake(value);
    return result;
  }

  static wcagAaa(metadata: PaletteStateInterface['metadata']): WcagPairResultSetInterfaceTypeEntity.Type | undefined {
    const value = metadata['contrast:aaa'];
    if (value === undefined) {
      const result = undefined;
      return result;
    }
    const result = WcagPairResultSetInterfaceTypeEntity.intake(value);
    return result;
  }
}

class RoleClampReadModel {
  private static rangeAdjustment(value: RoleProvenanceInterfaceTypeEntity.Type['adjustments'][number]): { readonly 'afterHex': string; readonly 'beforeHex': string } | undefined {
    if (value.operation !== 'role-range') {
      const result = undefined;
      return result;
    }
    const result = { 'afterHex': value.afterHex, 'beforeHex': value.beforeHex };
    return result;
  }

  static fromProvenance(provenance: ReadonlyMap<string, RoleProvenanceInterfaceTypeEntity.Type>): Map<string, RoleMathClampType> {
    const clamps = new Map<string, RoleMathClampType>();
    for (const [roleName, evidence] of provenance) {
      let rangeAdjustment: { readonly 'afterHex': string; readonly 'beforeHex': string } | undefined;
      for (let adjustmentIndex = 0; adjustmentIndex < evidence.adjustments.length; adjustmentIndex += 1) {
        const adjustment = evidence.adjustments[adjustmentIndex];
        if (adjustment === undefined) {
          throw new RangeError(`Role provenance for ${roleName} is missing adjustment ${adjustmentIndex}`);
        }
        const candidate = RoleClampReadModel.rangeAdjustment(adjustment);
        if (candidate !== undefined) {
          rangeAdjustment = candidate;
          break;
        }
      }
      if (rangeAdjustment === undefined) {continue;}
      const resolvedOklch = colorRecordFactory.fromHex(rangeAdjustment.afterHex).oklch;
      const seedOklch = colorRecordFactory.fromHex(rangeAdjustment.beforeHex).oklch;
      clamps.set(roleName, {
        'resolvedHex': rangeAdjustment.afterHex.toLowerCase(),
        'roleOklch': `L ${resolvedOklch.l.toFixed(2)} · C ${resolvedOklch.c.toFixed(2)} · H ${Math.round(resolvedOklch.h)}`,
        'seedHex': rangeAdjustment.beforeHex.toLowerCase(),
        'seedOklch': `L ${seedOklch.l.toFixed(2)} · C ${seedOklch.c.toFixed(2)} · H ${Math.round(seedOklch.h)}`
      });
    }
    const result = clamps;
    return result;
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
    const { 'registerEffectHandlers': registerEffectHandlers, 'send': sendUiEvent, 'state': uiState } = useIridisUiMachine();
    /** Derived from the shared UI FSM so ModeSwitch and image-drop mode changes stay in sync with the carousel. */
    class ModeSetOperation {
      static run(selection: string): void {
        if (selection === 'image') {
          sendUiEvent(IridisUiEvent.selectImageMode());
          return;
        }
        if (selection === 'picker') {
          sendUiEvent(IridisUiEvent.selectPickerMode());
          return;
        }
        throw new RangeError(`Unsupported palette mode: ${selection}`);
      }
    }

    const mode = VueModule.computed<ModeInterfaceTypeEntity.Type>({
      'get': () => {
        const result = ModeInterfaceTypeEntity.intake(uiState.value.selectsImageMode() ? 'image' : 'picker');
        return result;
      },
      'set': ModeSetOperation.run
    });
    class DefaultPaletteSeedsOperation {
      static run(): PickerSeedType[] {
        const result = [
          { 'hex': '#000000', 'role': undefined },
          { 'hex': '#ffffff', 'role': undefined }
        ];
        return result;
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
        for (let index = 0; index < previous.length; index += 1) {
          const seed = previous[index];
          if (seed === undefined) {
            throw new RangeError(`Palette seed list is missing entry ${index}`);
          }
          roleByHex.set(seed.hex, seed.role);
        }
        const result = hexes.map((hex) => {
          const seed = { 'hex': hex, 'role': roleByHex.get(hex) };
          return seed;
        });
        return result;
      }
    }

    const withPreservedRoles = WithPreservedRolesOperation.run;

    class HydratePaletteSeedsOperation {
      static run(hexes: readonly string[], previous: readonly PickerSeedType[]): PickerSeedType[] {
        const result = hexes.length === 0 ? defaultPaletteSeeds() : withPreservedRoles(hexes, previous);
        return result;
      }
    }

    const hydratePaletteSeeds = HydratePaletteSeedsOperation.run;

    const framing = VueModule.ref<FramingInterfaceTypeEntity.Type>(FramingInterfaceTypeEntity.intake('dark'));
    class ApplyCurrentFramingTokensOperation {
      static run(tokens: RoleHexMapType): void {
        if (framing.value === 'dark') {
          Tokens.applyDark(tokens);
          return;
        }
        Tokens.applyLight(tokens);
      }
    }

    const applyCurrentFramingTokens = ApplyCurrentFramingTokensOperation.run;

    const schemaName = VueModule.ref<SchemaNameInterfaceTypeEntity.Type>(SchemaNameInterfaceTypeEntity.defaultValue);
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
    const derivationConfig = VueModule.ref<DerivationConfigInterfaceTypeEntity.Type>(DerivationConfigInterfaceTypeEntity.defaultValue);

    /** Merges a single relation's config into `derivationConfig` and re-runs the pipeline — the ONLY way a relation changes; the resolved hue is always recomputed by derive:roleRelations, never written directly here. */
    class RelationUpdateOperation {
      static run(roleName: string, relation: DerivationRelationInterfaceTypeEntity.Type): void {
        const patch: Record<string, DerivationRelationInterfaceTypeEntity.Type> = {};
        Object.defineProperty(patch, roleName, { 'configurable': true, 'enumerable': true, 'value': relation, 'writable': true });
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
      static run(newRelations: Record<string, DerivationRelationInterfaceTypeEntity.Type>): void {
        const updated = DerivationConfigInterfaceTypeEntity.create({ 'relations': { ...derivationConfig.value.relations, ...newRelations } });
        sendUiEvent(IridisUiEvent.setDerivationConfig(updated));
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
      static run(nextState: boolean | string): void {
        if (nextState === true) {
          sendUiEvent(IridisUiEvent.setSemanticHuesEnabled());
          return;
        }
        if (nextState === false) {
          sendUiEvent(IridisUiEvent.setSemanticHuesDisabled());
          return;
        }
        throw new TypeError('Semantic hue state must be boolean');
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
    const cvdPreviewTypes = VueModule.ref<Set<CvdMatrixInterfaceTypeEntity.Type['name']>>(new Set());

    /** Diagram view state (zoom level, pan offset, expanded fullscreen mode). */
    const diagramScale = VueModule.ref<number>(1);
    const diagramTranslateX = VueModule.ref<number>(0);
    const diagramTranslateY = VueModule.ref<number>(0);
    const diagramIsExpanded = VueModule.ref<boolean>(false);

    const roles = VueModule.ref<RoleHexMapType>({});
    const roleViews = VueModule.ref<RoleViewType[]>([]);
    const roleClamps = VueModule.ref<Map<string, RoleMathClampType>>(new Map());
    const roleDistances = VueModule.ref<Map<string, ReadonlyMap<string, number>>>(new Map());
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
    const running = VueModule.computed<boolean>(() => {
      const result = activeOperations.value > 0;
      return result;
    });
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
    const complianceField = ROLE_SORT_FIELD_OPTIONS.find((option) => {
      const matches = option.label === 'Compliance';
      return matches;
    });
    const ratioField = ROLE_SORT_FIELD_OPTIONS.find((option) => {
      const matches = option.label === 'Ratio';
      return matches;
    });
    if (complianceField === undefined || ratioField === undefined) {
      throw new Error('Role sort field registry is missing a required default field');
    }
    const roleSortKeys = VueModule.ref<RoleSortKeyType[]>([
      { 'behavior': RoleSortBehavior.descending(complianceField.value) },
      { 'behavior': RoleSortBehavior.descending(ratioField.value) }
    ]);

    const roleContrastRows = VueModule.computed<RoleSortableRowInterfaceTypeEntity.Type[]>(() => {
      // 'background' is a required role in every schema tier (RoleSchemaByName.ts),
      // and run() resolves it synchronously before any component can read this —
      // never a hardcoded placeholder.
      const bg = roles.value.background;
      if (bg === undefined) {throw new Error('Resolved palette is missing the required background role');}
      const schema = (() => {
        const pair = roleSchemaByName[schemaName.value];
        if (pair === undefined) {
          throw new RangeError(`No role schema is registered for ${schemaName.value}`);
        }
        const selected = framing.value === 'dark' ? pair.dark : pair.light;
        const result = roleSchemaFor(selected);
        return result;
      })();
      const result = roleViews.value.map((role) => {
        const ratio = contrastRatio(role.hex, bg);
        const row = RoleSortableRowInterfaceTypeEntity.create({ 'c': role.c, 'compliance': complianceFor(ratio, minimumRatioForRole(schema, role.name)), 'h': role.h, 'hex': role.hex, 'l': role.l, 'name': role.name, 'ratio': ratio });
        return row;
      });
      return result;
    });

    const sortedRoleContrastRows = VueModule.computed(() => { const result = sortRoleRows(roleContrastRows.value, roleSortKeys.value.map((key) => { return key.behavior; })); return result; });
    const error = VueModule.ref<string | null>(null);

    /** Raw contrast-check metadata from the last run, keyed by algorithm rather than the `contrast:*` metadata prefix. */
    const contrastReport = VueModule.ref<{
      'aa'?:   WcagPairResultSetInterfaceTypeEntity.Type;
      'aaa'?:  WcagPairResultSetInterfaceTypeEntity.Type;
      'apca'?: ApcaPairResultSetInterfaceTypeEntity.Type;
      'cvd'?:  CvdResultSetInterfaceTypeEntity.Type;
    }>({});

    /* Image-extraction controls (mirror the engine's gallery config knobs). */
    const imgStrategy = VueModule.ref<ClusterStrategyInterface>(ClusterDispatcher.resolve('delta-e'));
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
    const uploadedImages = VueModule.ref<UploadedImage[]>([]);
    /** The (typically 3) non-destructive candidate palettes from gallery:extractCandidates for the last image-driven run — one algorithm's clustering result each. */
    const candidates = VueModule.ref<GalleryCandidateOutputEntity.Type[]>([]);
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
    VueModule.watch(schemaName, (v) => { imgK.value = schemaRoleCount(String(v)); }, { 'immediate': true });

    /** Whichever seed list is live for the current mode — imageSeeds and pickerSeeds share one shape now, so this is a plain switch, not a reshape. */
    const activeSeeds = VueModule.computed<PickerSeedType[]>(() => {
      const result = mode.value === 'image' ? imageSeeds.value : pickerSeeds.value;
      return result;
    });

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
      const schema = (() => {
        const pair = roleSchemaByName[schemaName.value];
        if (pair === undefined) {
          throw new RangeError(`No role schema is registered for ${schemaName.value}`);
        }
        const selected = framing.value === 'dark' ? pair.dark : pair.light;
        const result = roleSchemaFor(selected);
        return result;
      })();
      const result = schema.roles.reduce<string[]>((names, role) => {
        if (IRIDIS_CONSTANTS.USED_ROLE_NAMES.has(role.name)) { names.push(role.name); }
        return names;
      }, []);
      return result;
    });

    class IngestOperation {
      static run(state: PaletteStateInterface): void {
        const engineMaps = Tokens.extractEngineMaps(state);
        const views: RoleViewType[] = [];
        const roleNames = Object.keys(state.roles);
        for (let index = 0; index < roleNames.length; index += 1) {
          const name = roleNames[index];
          if (name === undefined) {
            throw new RangeError(`Resolved role list is missing entry ${index}`);
          }
          const role = state.roles[name];
          if (role === undefined) {
            throw new RangeError(`Resolved role ${name} is missing its color record`);
          }
          views.push({ 'c': role.oklch.c, 'displayP3': role.displayP3, 'h': role.oklch.h, 'hex': role.hex, 'l': role.oklch.l, 'name': name });
        }
        roles.value = engineMaps.roles;
        roleViews.value = views;
        const provenance = Metadata.roleProvenance(state.metadata);
        roleClamps.value = RoleClampReadModel.fromProvenance(provenance);
        roleDistances.value = Metadata.roleDistances(state.metadata);
        const derivedRoles: string[] = [];
        const statedRoles: string[] = [];
        const synthesizedRoles: string[] = [];
        for (const [roleName, evidence] of provenance) {
          if (evidence.origin === 'derived') {derivedRoles.push(roleName);}
          if (evidence.origin === 'stated') {statedRoles.push(roleName);}
          if (evidence.origin === 'synthesized') {synthesizedRoles.push(roleName);}
        }
        rolesSynthesized.value = synthesizedRoles;
        rolesPinned.value = statedRoles;
        rolesDerived.value = derivedRoles;
        scales.value = engineMaps.scales;
        contrastReport.value = {
          'aa':   ContrastMetadataSlot.wcagAa(state.metadata),
          'aaa':  ContrastMetadataSlot.wcagAaa(state.metadata),
          'apca': ContrastMetadataSlot.apca(state.metadata),
          'cvd':  ContrastMetadataSlot.cvd(state.metadata)
        };
        if (typeof document !== 'undefined') {
          applyCurrentFramingTokens(Tokens.mapFromEngine(engineMaps.roles, engineMaps.scales));
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
    let pendingFraming: FramingInterfaceTypeEntity.Type | undefined;
    class RunOperation {
      static run(): void {
        const targetFraming = pendingFraming ?? framing.value;

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
          const targetRoles = (() => {
            const pair = roleSchemaByName[schemaName.value];
            if (pair === undefined) {
              throw new RangeError(`No role schema is registered for ${schemaName.value}`);
            }
            const selected = targetFraming === 'dark' ? pair.dark : pair.light;
            const result = roleSchemaFor(selected);
            return result;
          })();
          const state = engine.run(InputInterfaceTypeEntity.create({
            'colors':   pickerSeedInputs(seeds),
            'contrast': ContrastConfigFor.forStrictness(contrastStrictness.value, cvdCorrect.value ? ContrastConfigFor.correctingCvd : ContrastConfigFor.advisoryCvd),
            'metadata': { 'core:variantConfig': JsonValue.from(VARIANT_CONFIG), 'derivation:config': JsonValue.from(derivationConfig.value), 'derivation:semanticHuesEnabled': JsonValue.from(semanticHuesEnabled.value) },
            'roles':    targetRoles,
            'runtime':  { 'colorSpace': colorSpace.value, 'framing': String(targetFraming) }
          }));
          if (pendingFraming !== undefined) {
            framing.value = pendingFraming;
            if (typeof document !== 'undefined') {
              document.documentElement.classList.add('is-switching-theme');
              if (pendingFraming === 'dark') {
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
          pendingFraming = undefined;
          if (typeof document !== 'undefined') {
            applyCurrentFramingTokens(Tokens.mapFromEngine(roles.value, scales.value));
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
          img.onload = () => { resolve(); };
          img.onerror = () => { reject(new Error('Image load failed')); };
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
        const result = { 'data': context.getImageData(0, 0, w, h).data, 'height': h, 'width': w };
        return result;
      }
    }

    /** Raw decoded pixel buffers, keyed by `UploadedImage.id` — kept out of the reactive `uploadedImages` entries so Vue never deep-wraps a pixel array. */
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
        const result = `img-${nextImageId}-${Date.now().toString(36)}`;
        return result;
      }
    }

    /**
 * Seeds a freshly-uploaded entry's own settings from the CURRENT combine-stage
 * refs — sensible per-image defaults that become independently mutable
 * afterward. Returns a full `UploadedImage`: the not-yet-computed
 * fields (`candidates`, `dominantColorRecords`, `histogram`, `id`, `name`,
 * `selectedCandidateLabel`, `source`) get placeholder defaults that the caller
 * overwrites with the real per-call values (a freshly-uploaded entry) — also
 * reused as-is by `combineNowRun` to build the combine stage's own gallery
 * metadata, where those placeholders are never read.
 */
    class DefaultEntrySettingsOperation {
      static run(): UploadedImage {
        const result = {
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
          'source':                   '',
          'strategy':                 imgStrategy.value
        };
        return result;
      }
    }

    const defaultEntrySettings = DefaultEntrySettingsOperation.run;

    /** Builds the `metadata.gallery` object handed to engine.run() — shared by EntryStage1.extract (per-image, passing that entry directly) and combineNowRun (the combine stage itself, passing `defaultEntrySettings()`), rather than two independent object literals repeating the same field list and range-cloning. */
    class GalleryMetadata {
      static build(source: UploadedImage) {
        const result = {
          'algorithm':          source.strategy.serializeAlgorithm(),
          'candidates':         allCandidateAlgorithms(source.k),
          'chromaRange':        cloneRanges(source.chromaRange),
          'deltaECap':          source.deltaECap,
          'harmonizeThreshold': source.harmonizeThreshold,
          'histogramBits':      source.histogramBits,
          'k':                  source.k,
          'lightnessRange':     cloneRanges(source.lightnessRange)
        };
        return result;
      }
    }

    /**
 * Stage 1 — reduces ONE image's own cached pixels to its own dominant
 * colors, using ONLY that entry's own settings. Independent of every other
 * uploaded image: re-running this for entry A never touches entry B's
 * histogram/dominantColors.
 */
    class EntryStage1 {
      static extract(entry: UploadedImage): void {
        const pixels = PixelCache.entries.get(entry.id);
        if (pixels === undefined) {return;}
        engine.pipeline(IRIDIS_CONSTANTS.IMAGE_ENTRY_STAGES);
        const state = engine.run(InputInterfaceTypeEntity.create({
          'colors': [pixels],
          'metadata': {
            'gallery': JsonValue.from(GalleryMetadata.build(entry))
          }
        }));
        const hist = GalleryMetadataSlotEntity.GalleryMetadataSlot.histogram(state.metadata);
        const sortedHistogram = [...hist].sort((left, right) => {
          const result = right.weight - left.weight;
          return result;
        });
        entry.histogram = sortedHistogram.slice(0, 96);
        const dominant = GalleryMetadataSlotEntity.GalleryMetadataSlot.dominantColors(state.metadata);
        const dominantColorRecords: { 'hex': string; 'weight': number }[] = [];
        for (let index = 0; index < dominant.length; index += 1) {
          const color = dominant[index];
          if (color === undefined) {
            throw new RangeError(`Dominant color list is missing entry ${index}`);
          }
          if (isValidHex(color.hex)) {
            dominantColorRecords.push({ 'hex': color.hex, 'weight': color.hints?.weight ?? 1 });
          }
        }
        entry.dominantColorRecords = dominantColorRecords;
        entry.candidates = GalleryMetadataSlotEntity.GalleryMetadataSlot.candidates(state.metadata);
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
      static run(entry: UploadedImage): readonly { 'hex': string; 'weight': number }[] {
        if (entry.selectedCandidateLabel !== null) {
          const match = entry.candidates.find((candidate) => {
            const result = candidate.label === entry.selectedCandidateLabel;
            return result;
          });
          if (match !== undefined) {
            const result = match.colors.map((color) => {
              const weightedColor = { 'hex': color.hex, 'weight': color.hints?.weight ?? 1 };
              return weightedColor;
            });
            return result;
          }
        }
        const result = entry.dominantColorRecords;
        return result;
      }
    }

    const weightedHexesFor = WeightedHexesForOperation.run;

    /** Plain hex list (no weight) — used wherever only the color values matter, e.g. the Upload card's per-image summary swatches. */
    class EffectiveHexesForOperation {
      static run(entry: UploadedImage): readonly string[] {
        const result = weightedHexesFor(entry).map((weightedColor) => {
          const hex = weightedColor.hex;
          return hex;
        });
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
        const totalWeight = weighted.reduce((sum, weightedColor) => {
          const result = sum + weightedColor.weight;
          return result;
        }, 0);
        if (totalWeight <= 0) {
          const result = weighted.map((weightedColor) => {
            const hex = weightedColor.hex;
            return hex;
          });
          return result;
        }
        const expanded: string[] = [];
        for (let index = 0; index < weighted.length; index += 1) {
          const weightedColor = weighted[index];
          if (weightedColor === undefined) {
            throw new RangeError(`Weighted palette is missing entry ${index}`);
          }
          const count = Math.max(1, Math.round((weightedColor.weight / totalWeight) * budget));
          for (let occurrence = 0; occurrence < count; occurrence += 1) {expanded.push(weightedColor.hex);}
        }
        const result = expanded;
        return result;
      }
    }

    const expandWeighted = ExpandWeightedOperation.run;

    /**
 * Stage 2 — gathers every uploaded image's own weighted contribution
 * (`weightedHexesFor`, respecting per-image candidate selection) and expands
 * it into a cumulative, pixel-weighted hex multiset (`expandWeighted`), then
 * runs that through the combine extraction pipeline (IRIDIS_CONSTANTS.COMBINE_EXTRACTION_STAGES). The
 * extracted seeds feed the color pipeline, which resolves roles once. The
 * resulting histogram genuinely reflects the merged pixel density across
 * every uploaded image, not an equal-weight-per-representative-color
 * approximation. The combine-stage settings are the existing shared
 * imgStrategy/imgK/imgHistogramBits/imgDeltaECap/imgHarmonize/imgLightnessRange/
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
          const activeRoles = (() => {
            const pair = roleSchemaByName[schemaName.value];
            if (pair === undefined) {
              throw new RangeError(`No role schema is registered for ${schemaName.value}`);
            }
            const selected = framing.value === 'dark' ? pair.dark : pair.light;
            const result = roleSchemaFor(selected);
            return result;
          })();
          engine.pipeline([...IRIDIS_CONSTANTS.COMBINE_EXTRACTION_STAGES]);
          const state = engine.run(InputInterfaceTypeEntity.create({
            'colors':   combinedHexes,
            'contrast': ContrastConfigFor.forStrictness(contrastStrictness.value, cvdCorrect.value ? ContrastConfigFor.correctingCvd : ContrastConfigFor.advisoryCvd),
            'metadata': {
              'core:variantConfig': JsonValue.from(VARIANT_CONFIG),
              'derivation:config': JsonValue.from(derivationConfig.value),
              'derivation:semanticHuesEnabled': JsonValue.from(semanticHuesEnabled.value),
              'gallery': JsonValue.from(GalleryMetadata.build(defaultEntrySettings()))
            },
            'roles':    activeRoles,
            'runtime':  { 'colorSpace': colorSpace.value, 'framing': String(framing.value) }
          }));
          const hist = GalleryMetadataSlotEntity.GalleryMetadataSlot.histogram(state.metadata);
          const sortedHistogram = [...hist].sort((left, right) => {
            const result = right.weight - left.weight;
            return result;
          });
          histogram.value = sortedHistogram.slice(0, 96);
          const dominant = GalleryMetadataSlotEntity.GalleryMetadataSlot.dominantColors(state.metadata);
          const schemaCount = schemaRoleCount(schemaName.value);
          const extracted: string[] = [];
          for (const color of dominant) {
            if (isValidHex(color.hex)) { extracted.push(color.hex); }
            if (extracted.length >= schemaCount) { break; }
          }
          imageSeeds.value = hydratePaletteSeeds(extracted, imageSeeds.value);
          pickerSeeds.value = hydratePaletteSeeds(extracted, pickerSeeds.value);
          candidates.value = GalleryMetadataSlotEntity.GalleryMetadataSlot.candidates(state.metadata);
          selectedCandidateLabel.value = null;
          sendUiEvent(IridisUiEvent.populatePickerFromImage(extracted));
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
          const added: UploadedImage[] = [];
          const sourceCount = sources.length;
          for (let i = 0; i < sourceCount; i++) {
            const source = sources[i];
            if (source === undefined) {throw new RangeError(`Image source index ${i} is outside the supplied source list`);}
            const sourceUrl = typeof source === 'string' ? source : URL.createObjectURL(source);
            const name = typeof source === 'string' ? (sampleNames?.[i] ?? 'Sample') : source.name;
            const pixels = await ToPixels.decode(sourceUrl);
            const id = ImageId.make();
            PixelCache.entries.set(id, pixels);
            const entry = defaultEntrySettings();
            entry.id = id;
            entry.name = name;
            entry.source = sourceUrl;
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
        const entry = uploadedImages.value.find((uploadedImage) => {
          const result = uploadedImage.id === id;
          return result;
        });
        if (entry?.source.startsWith('blob:') === true) {
          URL.revokeObjectURL(entry.source);
        }
        PixelCache.entries.delete(id);
        entryReextract.cancel(id);
        uploadedImages.value = uploadedImages.value.filter((uploadedImage) => {
          const result = uploadedImage.id !== id;
          return result;
        });
        scheduleCombine();
      }
    }

    const removeUploadedImage = RemoveUploadedImageOperation.run;

    /**
 * Mutates ONE uploaded image's own settings and schedules ONLY that image's
 * re-extraction (debounced), not every uploaded image. `patch` is a full
 * `UploadedImage` — the caller (UploadedImageCard.vue) builds it
 * by spreading the entry's own current props with the one changed field
 * overridden, so every key is already present; `Object.assign` below just
 * reassigns each field to its (mostly unchanged) value.
 */
    class UploadedImageSettingUpdateOperation {
      static run(id: string, patch: UploadedImage): void {
        const entry = uploadedImages.value.find((uploadedImage) => {
          const result = uploadedImage.id === id;
          return result;
        });
        if (entry === undefined) {return;}
        Object.assign(entry, patch);
        entryReextract.schedule(id);
      }
    }

    const uploadedImageSettingUpdate = UploadedImageSettingUpdateOperation.run;

    /** Per-entry debounce so rapid slider drags on one image's settings don't re-run its extraction on every step. */
    const entryReextract = keyedDebounce((id: string) => {
      const entry = uploadedImages.value.find((uploadedImage) => {
        const result = uploadedImage.id === id;
        return result;
      });
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
        const entry = uploadedImages.value.find((uploadedImage) => {
          const result = uploadedImage.id === id;
          return result;
        });
        if (entry === undefined) {return;}
        entry.selectedCandidateLabel = label;
        combine();
      }
    }

    const selectEntryCandidate = SelectEntryCandidateOperation.run;

    class SeedMutationOperation {
      static add(hex: string | undefined): void {
        const nextHex = hex ?? roles.value.brand;
        if (nextHex === undefined) { throw new Error('Cannot add a seed before the required brand role is resolved'); }
        if (pickerSeeds.value.length < 32) {
          pickerSeeds.value = [...pickerSeeds.value, { 'hex': nextHex, 'role': undefined }];
        }
        schedule();
      }

      static remove(index: number): void {
        if (pickerSeeds.value.length > 1) {
          pickerSeeds.value = pickerSeeds.value.filter((_, seedIndex) => {
            const result = seedIndex !== index;
            return result;
          });
        }
        schedule();
      }

      static set(index: number, hex: string): void {
        pickerSeeds.value = pickerSeeds.value.map((seed, seedIndex) => {
          const result = seedIndex === index ? { ...seed, 'hex': hex } : seed;
          return result;
        });
        schedule();
      }
    }

    class PinSeedRoleOperation {
      static run(index: number, role: string | undefined): void {
        const applyPin = (seeds: PickerSeedType[]): PickerSeedType[] => {
          const result = seeds.map((seed, seedIndex) => {
            if (role !== undefined && seed.role === role && seedIndex !== index) {
              return { ...seed, 'role': undefined };
            }
            const nextSeed = seedIndex === index ? { ...seed, 'role': role } : seed;
            return nextSeed;
          });
          return result;
        };
        if (mode.value === 'image') {
          imageSeeds.value = applyPin(imageSeeds.value);
        } else {
          pickerSeeds.value = applyPin(pickerSeeds.value);
        }
        schedule();
      }
    }

    class PaletteParameterOperation {
      static disableCvdCorrection(): void { cvdCorrect.value = false; schedule(); }
      static disableSemanticHues(): void { semanticHuesEnabled.value = false; schedule(); }
      static enableCvdCorrection(): void { cvdCorrect.value = true; schedule(); }
      static enableSemanticHues(): void { semanticHuesEnabled.value = true; schedule(); }
      static setContrastStrictness(strictness: number): void { contrastStrictness.value = strictness; schedule(); }
      static setDarkFraming(): void { pendingFraming = FramingInterfaceTypeEntity.intake('dark'); run(); }
      static setDeltaEImageAlgorithm(): void { imgStrategy.value = ClusterDispatcher.resolve('delta-e'); scheduleCombine(); }
      static setDerivationConfig(config: DerivationConfigInterfaceTypeEntity.Type): void { derivationConfig.value = config; schedule(); }
      static setDisplayP3ColorSpace(): void { colorSpace.value = 'displayP3'; schedule(); }
      static setImageChromaRange(range: [number, number][]): void { imgChromaRange.value = range; scheduleCombine(); }
      static setImageDeltaECap(cap: number): void { imgDeltaECap.value = cap; scheduleCombine(); }
      static setImageHarmonize(threshold: number): void { imgHarmonize.value = threshold; scheduleCombine(); }
      static setImageHistogramBits(bits: number): void { imgHistogramBits.value = bits; scheduleCombine(); }
      static setImageK(k: number): void { imgK.value = k; scheduleCombine(); }
      static setImageLightnessRange(range: [number, number][]): void { imgLightnessRange.value = range; scheduleCombine(); }
      static setKMeansImageAlgorithm(): void { imgStrategy.value = ClusterDispatcher.resolve('k-means'); scheduleCombine(); }
      static setLightFraming(): void { pendingFraming = FramingInterfaceTypeEntity.intake('light'); run(); }
      static setMedianCutImageAlgorithm(): void { imgStrategy.value = ClusterDispatcher.resolve('median-cut'); scheduleCombine(); }
      static setRoleSort(keys: RoleSortKeyType[]): void { roleSortKeys.value = keys; }
      static setSchema(nextSchemaName: string): void { schemaName.value = SchemaNameInterfaceTypeEntity.intake(nextSchemaName); schedule(); scheduleCombine(); }
      static setSrgbColorSpace(): void { colorSpace.value = 'srgb'; schedule(); }
      static setWuQuantizeImageAlgorithm(): void { imgStrategy.value = ClusterDispatcher.resolve('wu-quantize'); scheduleCombine(); }
    }

    class DiagramViewOperation {
      static fit(): void { DiagramViewOperation.reset(); }
      static pan(dx: number, dy: number): void { diagramTranslateX.value += dx; diagramTranslateY.value += dy; }
      static reset(): void { diagramScale.value = 1; diagramTranslateX.value = 0; diagramTranslateY.value = 0; }
      static toggleExpansion(): void { diagramIsExpanded.value = !diagramIsExpanded.value; }
      static zoom(factor: number): void { diagramScale.value = Math.min(8, Math.max(0.05, diagramScale.value * factor)); }
    }

    class CvdPreviewOperation {
      static clear(): void { cvdPreviewTypes.value = new Set(); }

      static toggle(cvdTypeName: string): void {
        const cvdType = CvdTypeRegistry.resolve(cvdTypeName);
        const next = new Set(cvdPreviewTypes.value);
        if (next.has(cvdType)) {
          next.delete(cvdType);
        } else {
          next.add(cvdType);
        }
        cvdPreviewTypes.value = next;
      }
    }

    class PopulatePickerFromImageOperation {
      static run(hexes: string[]): void {
        pickerSeeds.value = hydratePaletteSeeds(hexes, pickerSeeds.value);
      }
    }

    const { 'activateTarget': activateNavigationTarget } = useNavigationTargets();

    class NavigateToTargetOperation {
      static run(targetId: string): void {
        activateNavigationTarget(targetId);
      }
    }

    class LogoUrlOperation {
      static run(): string {
        const appConfiguration = useRuntimeConfig().app;
        if (
          typeof appConfiguration !== 'object'
          || !('baseURL' in appConfiguration)
          || typeof appConfiguration.baseURL !== 'string'
        ) {
          throw new TypeError('Nuxt runtime configuration must provide app.baseURL');
        }
        const result = `${appConfiguration.baseURL}logo.png`;
        return result;
      }
    }

    const logoUrl = LogoUrlOperation.run;

    class ImageEffectExtractionOperation {
      static files(files: File | File[]): void {
        const sources = Array.isArray(files) ? files : [files];
        ImageEffectExtractionOperation.observe(addUploadedImages(sources));
      }

      static sample(): void {
        ImageEffectExtractionOperation.observe(addUploadedImages([logoUrl()], ['Sample']));
      }

      private static observe(task: Promise<void>): void {
        task.catch(() => {});
      }
    }

    class SelectImageCandidateOperation {
      static run(hexes: string[], label: string): void {
        imageSeeds.value = hydratePaletteSeeds(hexes, imageSeeds.value);
        pickerSeeds.value = hydratePaletteSeeds(hexes, pickerSeeds.value);
        selectedCandidateLabel.value = label;
        schedule();
      }
    }

    registerEffectHandlers({
      'addSeed': SeedMutationOperation.add,
      'clearCvdPreviews': CvdPreviewOperation.clear,
      'disableCvdCorrection': PaletteParameterOperation.disableCvdCorrection,
      'disableSemanticHues': PaletteParameterOperation.disableSemanticHues,
      'enableCvdCorrection': PaletteParameterOperation.enableCvdCorrection,
      'enableSemanticHues': PaletteParameterOperation.enableSemanticHues,
      'extractImageFiles': ImageEffectExtractionOperation.files,
      'extractSampleImage': ImageEffectExtractionOperation.sample,
      'fitDiagram': DiagramViewOperation.fit,
      'navigateToTarget': NavigateToTargetOperation.run,
      'panDiagram': DiagramViewOperation.pan,
      'pinSeedRole': PinSeedRoleOperation.run,
      'populatePickerFromImage': PopulatePickerFromImageOperation.run,
      'removeSeed': SeedMutationOperation.remove,
      'resetDiagram': DiagramViewOperation.reset,
      'selectImageCandidate': SelectImageCandidateOperation.run,
      'setContrastStrictness': PaletteParameterOperation.setContrastStrictness,
      'setDarkFraming': PaletteParameterOperation.setDarkFraming,
      'setDeltaEImageAlgorithm': PaletteParameterOperation.setDeltaEImageAlgorithm,
      'setDerivationConfig': PaletteParameterOperation.setDerivationConfig,
      'setDisplayP3ColorSpace': PaletteParameterOperation.setDisplayP3ColorSpace,
      'setImageChromaRange': PaletteParameterOperation.setImageChromaRange,
      'setImageDeltaECap': PaletteParameterOperation.setImageDeltaECap,
      'setImageHarmonize': PaletteParameterOperation.setImageHarmonize,
      'setImageHistogramBits': PaletteParameterOperation.setImageHistogramBits,
      'setImageK': PaletteParameterOperation.setImageK,
      'setImageLightnessRange': PaletteParameterOperation.setImageLightnessRange,
      'setKMeansImageAlgorithm': PaletteParameterOperation.setKMeansImageAlgorithm,
      'setLightFraming': PaletteParameterOperation.setLightFraming,
      'setMedianCutImageAlgorithm': PaletteParameterOperation.setMedianCutImageAlgorithm,
      'setRoleSort': PaletteParameterOperation.setRoleSort,
      'setSchema': PaletteParameterOperation.setSchema,
      'setSeed': SeedMutationOperation.set,
      'setSrgbColorSpace': PaletteParameterOperation.setSrgbColorSpace,
      'setWuQuantizeImageAlgorithm': PaletteParameterOperation.setWuQuantizeImageAlgorithm,
      'toggleCvdPreview': CvdPreviewOperation.toggle,
      'toggleDiagramExpansion': DiagramViewOperation.toggleExpansion,
      'zoomDiagram': DiagramViewOperation.zoom
    });

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
            stopWatches.push(VueModule.watch([schemaName, imgStrategy, imgK, imgHistogramBits, imgDeltaECap, imgHarmonize, imgLightnessRange, imgChromaRange], scheduleCombine, { 'deep': true }));
          }
        }
        const result = {
          'activeSeeds': activeSeeds, 'addUploadedImages': addUploadedImages, 'candidates': candidates, 'colorSpace': colorSpace, 'combineLocked': combineLocked, 'contrastReport': contrastReport, 'contrastStrictness': contrastStrictness, 'cvdCorrect': cvdCorrect,
          'cvdPreviewTypes': cvdPreviewTypes, 'derivationConfig': derivationConfig, 'diagramIsExpanded': diagramIsExpanded, 'diagramScale': diagramScale,
          'diagramTranslateX': diagramTranslateX, 'diagramTranslateY': diagramTranslateY,
          'effectiveHexesFor': effectiveHexesFor, 'enabledOptionalStages': enabledOptionalStages, 'error': error, 'framing': framing,
          'histogram': histogram,
          'imageSeeds': imageSeeds, 'imgChromaRange': imgChromaRange, 'imgDeltaECap': imgDeltaECap,
          'imgHarmonize': imgHarmonize, 'imgHistogramBits': imgHistogramBits, 'imgK': imgK, 'imgLightnessRange': imgLightnessRange, 'imgStrategy': imgStrategy, 'mode': mode, 'pickerSeeds': pickerSeeds,
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
        return result;
      }
    }

    const dispose = (): void => {
      for (let index = 0; index < stopWatches.length; index += 1) {
        const stopWatch = stopWatches[index];
        if (stopWatch === undefined) {
          throw new RangeError(`Watch cleanup list is missing entry ${index}`);
        }
        stopWatch();
      }
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
    const result = context.use();
    return result;
  }
}

export const useIridis = UseIridisOperation.run;
