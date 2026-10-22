/**
 * Shared iridis engine state. Two mutually-exclusive modes — a color picker and
 * an image extractor — each with its own palette; switching modes swaps which
 * palette themes the page. Every color (roles AND the 50→950 scales) is produced
 * by engine.run(): scales come from derive:variant tonal steps, semantic hues
 * from hueOffset on the schema roles. The projector only reads those hexes.
 */

import type { ComplianceReportEntity, CvdMatrixEntity, CvdResultSetEntity } from '@studnicky/iridis-contrast';
import type { ClusterStrategyInterface, GalleryCandidateOutputEntity } from '@studnicky/iridis-image';
import type { GalleryHistogramSlotInterface } from '@studnicky/iridis-image/types';
import type { ViteHotContext } from 'vite/types/hot.d.ts';

import { ClusterDispatcher } from '@studnicky/iridis-image';
import * as VueModule from 'vue';

import { useNuxtApp, useRuntimeConfig, useState } from '#imports';

import type { DerivationRelationEntity } from './entities/DerivationRelationEntity.ts';
import type { PaletteSnapshotEntity } from './entities/PaletteSnapshotEntity.ts';
import type { WorkerEnvelopeEntity } from './entities/WorkerEnvelopeEntity.ts';
import type { WorkerReplyEntity } from './entities/WorkerReplyEntity.ts';
import type { PickerSeedType, RoleHexMapType, RoleViewType, ScaleMapType, UploadedImage } from './types/index.ts';
import type { RoleMathClampType } from './types/roleMathClampType.ts';
import type { RoleSortKeyType } from './types/roleSortKeyType.ts';

import { contrastRatio } from '../theme/ContrastRatio.ts';
import { roleSchemaByName } from '../theme/RoleSchemaByName.ts';
import { Tokens } from '../theme/Tokens.ts';
import { cloneRanges } from '../utils/cloneRanges.ts';
import { complianceFor } from '../utils/complianceFor.ts';
import { debounce } from '../utils/debounce.ts';
import { keyedDebounce } from '../utils/keyedDebounce.ts';
import { minimumRatioForRole } from '../utils/minimumRatioForRole.ts';
import { RoleSortBehavior } from '../utils/roleSortBehavior.ts';
import { ROLE_SORT_FIELD_OPTIONS } from '../utils/roleSortFieldOptions.ts';
import { sortRoleRows } from '../utils/sortRoleRows.ts';
import { AccessibilityBlockers } from './accessibilityBlockers.ts';
import { BrowserWorkerPort } from './browserWorkerPort.ts';
import { IRIDIS_CONSTANTS } from './constants/IridisConstants.ts';
import { DerivationConfigEntity } from './entities/DerivationConfigEntity.ts';
import { ExtractionSettingsEntity } from './entities/ExtractionSettingsEntity.ts';
import { FramingEntity } from './entities/FramingEntity.ts';
import { ModeEntity } from './entities/ModeEntity.ts';
import { PaletteResolveRequestEntity } from './entities/PaletteResolveRequestEntity.ts';
import { RoleSortableRowEntity } from './entities/RoleSortableRowEntity.ts';
import { SchemaNameEntity } from './entities/SchemaNameEntity.ts';
import { WorkerMessageEntity } from './entities/WorkerMessageEntity.ts';
import { ImagePixels } from './imagePixels.ts';
import { PaletteAdmission } from './paletteAdmission.ts';
import { PaletteResolve } from './paletteResolve.ts';
import { roleSchemaFor } from './roleSchemaFor.ts';
import { schemaRoleCount } from './schemaRoleCount.ts';
import { IridisUiEvent } from './types/index.ts';
import { useIridisUiMachine } from './useIridisUiMachine.ts';
import { useNavigationTargets } from './useNavigationTargets.ts';
import { WorkerRequestClient } from './workerRequestClient.ts';

class ViteModule {
  static readonly metadata: ImportMeta & { readonly 'hot'?: ViteHotContext } = import.meta;
}

class CvdTypeRegistry {
  static resolve(value: string): CvdMatrixEntity.Type['name'] {
    if (value === 'protanopia' || value === 'deuteranopia' || value === 'tritanopia' || value === 'achromatopsia') {
      const result = value;
      return result;
    }
    throw new RangeError(`Unsupported CVD preview type: ${value}`);
  }
}

class IridisContextFactory {
  static create() {
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

    const mode = VueModule.computed<ModeEntity.Type>({
      'get': () => {
        const result = ModeEntity.intake(uiState.value.selectsImageMode() ? 'image' : 'picker');
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

    const framing = VueModule.ref<FramingEntity.Type>(FramingEntity.intake('dark'));
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

    const schemaName = VueModule.ref<SchemaNameEntity.Type>(SchemaNameEntity.defaultValue);
    const contrastStrictness = VueModule.ref<number>(2);
    const colorSpace = VueModule.ref<'srgb' | 'displayP3'>('srgb');

    /**
 * Color derivation configuration — one hue-algorithm choice per derivedFrom
 * relation (keyed by the child role's own name). Passed through metadata to
 * the derive:roleRelations/derive:semanticHues pipeline tasks, which write
 * the resolved overrides those relations consult; changing it re-runs the
 * whole pipeline via the FSM's schedule(), the same as any other palette
 * parameter — never recomputed and reapplied client-side.
 */
    const derivationConfig = VueModule.ref<DerivationConfigEntity.Type>(DerivationConfigEntity.defaultValue);

    /** Merges a single relation's config into `derivationConfig` and re-runs the pipeline — the ONLY way a relation changes; the resolved hue is always recomputed by derive:roleRelations, never written directly here. */
    class RelationUpdateOperation {
      static run(roleName: string, relation: DerivationRelationEntity.Type): void {
        const patch: Record<string, DerivationRelationEntity.Type> = {};
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
      static run(newRelations: Record<string, DerivationRelationEntity.Type>): void {
        const updated = DerivationConfigEntity.create({ 'relations': { ...derivationConfig.value.relations, ...newRelations } });
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
 * already resolved, independent of the always-on CVD correction. This is the
 * "see it as an afflicted person would" toggle: the previewed palette is the
 * corrected one. A `Set` because real CVD isn't always a single
 * condition — combined/comorbid deficiencies exist, so more than one type
 * can be active at once (CvdPreviewOverlay.vue chains their filters).
 * Empty = preview off. Consumed by a display-layer component, not by the
 * engine pipeline — changing it never triggers a recompute.
 */
    const cvdPreviewTypes = VueModule.ref<Set<CvdMatrixEntity.Type['name']>>(new Set());

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
    const histogram = VueModule.ref<GalleryHistogramSlotInterface['bins']>([]);
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

    const roleContrastRows = VueModule.computed<RoleSortableRowEntity.Type[]>(() => {
      // 'background' is a required role in every schema tier (RoleSchemaByName.ts),
      // and run() resolves it synchronously before any component can read this —
      // never a hardcoded placeholder.
      const bg = roles.value.background;
      if (bg === undefined) {throw new Error('Resolved palette is missing the required background role');}
      const schema = (() => {
        const pair = roleSchemaByName[schemaName.value];
        const selected = framing.value === 'dark' ? pair.dark : pair.light;
        const result = roleSchemaFor(selected);
        return result;
      })();
      const result = roleViews.value.map((role) => {
        const ratio = contrastRatio(role.hex, bg);
        const row = RoleSortableRowEntity.create({ 'c': role.c, 'compliance': complianceFor(ratio, minimumRatioForRole(schema, role.name)), 'h': role.h, 'hex': role.hex, 'l': role.l, 'name': role.name, 'ratio': ratio });
        return row;
      });
      return result;
    });

    const sortedRoleContrastRows = VueModule.computed(() => { const result = sortRoleRows(roleContrastRows.value, roleSortKeys.value.map((key) => { return key.behavior; })); return result; });
    const error = VueModule.ref<string | null>(null);

    /** Compliance blockers from the latest run; the empty set when the run is compliant. */
    const accessibilityBlockers = VueModule.shallowRef(AccessibilityBlockers.fromReport(undefined));
    const paletteAdmission = new PaletteAdmission();
    /** True while a palette request is in flight in the resolve worker. */
    const resolving = VueModule.ref<boolean>(false);
    /** Counts admitted palettes; consumers wait on it instead of timers. */
    const paletteRevision = VueModule.ref<number>(0);
    /** The palette resolved during SSR; the client renders it before any worker exists. */
    const serverSnapshot = useState<PaletteSnapshotEntity.Type | null>('iridis-palette-snapshot', () => {
      const initial = null;
      return initial;
    });

    /** Compliance and CVD reports from the last run. */
    const contrastReport = VueModule.shallowRef<{
      'compliance'?: ComplianceReportEntity.Type;
      'cvd'?:        CvdResultSetEntity.Type;
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
      static run(snapshot: PaletteSnapshotEntity.Type): void {
        const clamps = new Map<string, RoleMathClampType>();
        for (let index = 0; index < snapshot.clamps.length; index += 1) {
          const clamp = snapshot.clamps[index];
          if (clamp !== undefined) {
            clamps.set(clamp.roleName, { 'resolvedHex': clamp.resolvedHex, 'roleOklch': clamp.roleOklch, 'seedHex': clamp.seedHex, 'seedOklch': clamp.seedOklch });
          }
        }
        const distances = new Map<string, ReadonlyMap<string, number>>();
        const distanceEntries = Object.entries(snapshot.distances);
        for (let index = 0; index < distanceEntries.length; index += 1) {
          const entry = distanceEntries[index];
          if (entry !== undefined) {
            distances.set(entry[0], new Map(Object.entries(entry[1])));
          }
        }
        roles.value = Tokens.hexRecord(snapshot.roles);
        roleViews.value = snapshot.roles.map((role) => {
          const view = { 'c': role.c, 'displayP3': role.displayP3, 'h': role.h, 'hex': role.hex, 'l': role.l, 'name': role.name };
          return view;
        });
        roleClamps.value = clamps;
        roleDistances.value = distances;
        rolesSynthesized.value = snapshot.provenance.synthesized;
        rolesPinned.value = snapshot.provenance.pinned;
        rolesDerived.value = snapshot.provenance.derived;
        scales.value = snapshot.scales;
        contrastReport.value = { 'compliance': snapshot.compliance, 'cvd': snapshot.cvd };
        if (typeof document !== 'undefined') {
          applyCurrentFramingTokens(Tokens.mapFromEngine(roles.value, scales.value));
        }
      }
    }

    const ingest = IngestOperation.run;

    /** Pinned roles named by a blocked pair; the picker marks them pending. */
    const rejectedPinRoles = VueModule.computed<readonly string[]>(() => {
      const blockedNames = new Set<string>(accessibilityBlockers.value.pairs.flatMap((pair) => {
        const names = [pair.foreground, pair.background];
        return names;
      }));
      const result = activeSeeds.value.flatMap((seed) => {
        const pinned = seed.role !== undefined && blockedNames.has(seed.role) ? [seed.role] : [];
        return pinned;
      });
      return result;
    });

    /** run()'s engine input whenever neither seed list has anything yet (see run() below) — never surfaced as pickerSeeds/imageSeeds, so it never appears as a phantom entry in Manual or the per-image cards. */
    const BOOTSTRAP_SEEDS: PickerSeedType[] = defaultPaletteSeeds();

    /**
 * `pendingFraming` is the target framing of an in-flight dark/light swap: the
 * worker resolves the FULL new token set against it BEFORE `framing.value`
 * (and therefore `<html class="dark">`) changes. Once the snapshot arrives,
 * the framing commit and the repaint land in one synchronous block.
 */
    let pendingFraming: FramingEntity.Type | undefined;
    let transitionEpoch = 0;
    /** Opens the shared color-transition window; the newest window closes the class. */
    class ThemeTransitionOperation {
      static begin(): void {
        if (typeof document !== 'undefined') {
          transitionEpoch += 1;
          const epoch = transitionEpoch;
          document.documentElement.classList.add('is-switching-theme');
          setTimeout(() => {
            if (epoch === transitionEpoch) {
              document.documentElement.classList.remove('is-switching-theme');
            }
          }, 180); // slightly longer than --iridis-tune (150ms)
        }
      }
    }

    class FramingSwapOperation {
      static run(request: PaletteResolveRequestEntity.Type): void {
        if (request.framing !== framing.value) {
          framing.value = request.framing;
          if (typeof document !== 'undefined') {
            if (request.framing === 'dark') {
              document.documentElement.classList.add('dark');
            } else {
              document.documentElement.classList.remove('dark');
            }
          }
        }
      }
    }

    /** Admits a resolved snapshot and commits framing, palette state, and tokens as one unit. */
    class CommitSnapshotOperation {
      static run(snapshot: PaletteSnapshotEntity.Type, request: PaletteResolveRequestEntity.Type): void {
        const blockers = AccessibilityBlockers.fromReport(snapshot.compliance);
        accessibilityBlockers.value = blockers;
        if (paletteAdmission.admit(blockers)) {
          FramingSwapOperation.run(request);
          ingest(snapshot);
          paletteRevision.value += 1;
        }
        pendingFraming = undefined;
      }
    }

    class ResolveRequestOperation {
      static build(): PaletteResolveRequestEntity.Type {
        // Neither pickerSeeds nor imageSeeds has a seed yet on the very first pass
        // (in-browser sample-image extraction hasn't resolved) — feed the engine one
        // bootstrap seed so it resolves a real role set from tick one, WITHOUT writing
        // that seed into either user-visible seed list.
        const seeds = activeSeeds.value.length > 0 ? activeSeeds.value : BOOTSTRAP_SEEDS;
        const result = PaletteResolveRequestEntity.create({
          'colorSpace': colorSpace.value,
          'derivationConfig': VueModule.toRaw(derivationConfig.value),
          'framing': pendingFraming ?? framing.value,
          'schemaName': schemaName.value,
          'seeds': PaletteResolve.seeds(seeds),
          'semanticHuesEnabled': semanticHuesEnabled.value,
          'strictness': contrastStrictness.value
        });
        return result;
      }
    }

    /** Receives worker outcomes: the newest reply of each lane applies to the reactive state; a palette snapshot commits inside one theme transition. */
    class ClientHandlersOperation {
      static accept(reply: WorkerReplyEntity.Type, envelope: WorkerEnvelopeEntity.Type): void {
        const message = envelope.message;
        try {
          if (reply.kind === 'palette' && message.kind === 'palette') {
            ClientHandlersOperation.palette(reply, message.request);
          } else if (reply.kind === 'extract' && message.kind === 'extract') {
            ExtractionApplyOperation.run(message.imageId, reply);
          } else if (reply.kind === 'combine' && message.kind === 'combine') {
            CombineApplyOperation.run(reply);
          }
        } catch (e) {
          error.value = e instanceof Error ? e.message : String(e);
        }
      }

      static busy(message: WorkerMessageEntity.Type): void {
        if (message.kind === 'palette') {
          resolving.value = true;
        } else {
          beginOperation();
        }
      }

      static idle(message: WorkerMessageEntity.Type): void {
        if (message.kind === 'palette') {
          resolving.value = false;
        } else {
          endOperation();
        }
      }

      static reject(message: string): void {
        error.value = message;
      }

      private static palette(reply: Extract<WorkerReplyEntity.Type, { 'kind': 'palette' }>, request: PaletteResolveRequestEntity.Type): void {
        if (reply.snapshot === undefined) {
          throw new TypeError('Palette resolve reply carried no snapshot');
        }
        ThemeTransitionOperation.begin();
        CommitSnapshotOperation.run(reply.snapshot, request);
      }
    }

    let client: WorkerRequestClient | undefined;
    const clientWaiters: ((opened: WorkerRequestClient) => void)[] = [];

    /** Hands the open worker client to callers that arrive before or after the first consumer mounts. */
    class ClientAccessOperation {
      static open(): Promise<WorkerRequestClient> {
        const result = client === undefined
          ? new Promise<WorkerRequestClient>((resolve) => { clientWaiters.push(resolve); })
          : Promise.resolve(client);
        return result;
      }

      static publish(opened: WorkerRequestClient): void {
        const waiting = clientWaiters.splice(0);
        for (let index = 0; index < waiting.length; index += 1) {
          waiting[index]?.(opened);
        }
      }
    }

    let mountedConsumers = 0;
    /** Set when a resolve is requested before any consumer has mounted; the first mount runs it. */
    let awaitingMount = false;

    class RunOperation {
      static run(): void {
        error.value = null;
        const request = ResolveRequestOperation.build();
        if (client !== undefined) {
          void client.request(WorkerMessageEntity.create({ 'kind': 'palette', 'request': request }));
        } else if (typeof window === 'undefined') {
          beginOperation();
          try {
            const snapshot = PaletteResolve.run(request);
            serverSnapshot.value = snapshot;
            CommitSnapshotOperation.run(snapshot, request);
          } catch (e) {
            error.value = e instanceof Error ? e.message : String(e);
          } finally {
            endOperation();
          }
        } else {
          awaitingMount = true;
        }
      }
    }

    const run = RunOperation.run;

    /** Decode an image source into raw pixel data, downscaled for the gallery pipeline. */
    class ToPixels {
      static async decode(sourceUrl: string): Promise<ImagePixels> {
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
        const result = new ImagePixels(context.getImageData(0, 0, w, h).data.buffer, h, w);
        return result;
      }
    }

    /** Entries whose first extraction is in flight; they join `uploadedImages` once it lands. */
    class PendingEntries {
      static readonly entries = new Map<string, UploadedImage>();
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

    /** Serializable extraction settings of one uploaded image or of the combine stage (`defaultEntrySettings()`). */
    class ExtractionSettingsOperation {
      static from(source: UploadedImage): ExtractionSettingsEntity.Type {
        const result = ExtractionSettingsEntity.create({
          'algorithm': source.strategy.serializeAlgorithm(),
          'chromaRange': cloneRanges(source.chromaRange),
          'deltaECap': source.deltaECap,
          'harmonizeThreshold': source.harmonizeThreshold,
          'histogramBits': source.histogramBits,
          'k': source.k,
          'lightnessRange': cloneRanges(source.lightnessRange)
        });
        return result;
      }
    }

    /** Applies an image extraction reply to the entry it was requested for. */
    class ExtractionApplyOperation {
      static run(imageId: string, reply: Extract<WorkerReplyEntity.Type, { 'kind': 'extract' }>): void {
        const entry = uploadedImages.value.find((uploadedImage) => {
          const result = uploadedImage.id === imageId;
          return result;
        }) ?? PendingEntries.entries.get(imageId);
        if (reply.result === undefined) {
          throw new TypeError('Image extraction reply carried no result');
        }
        if (entry !== undefined) {
          entry.histogram = reply.result.histogram;
          entry.dominantColorRecords = reply.result.dominantColorRecords;
          entry.candidates = reply.result.candidates;
        }
      }
    }

    /** Applies the combine reply: histogram, seeds, and candidate palettes of the merged extraction. */
    class CombineApplyOperation {
      static run(reply: Extract<WorkerReplyEntity.Type, { 'kind': 'combine' }>): void {
        if (reply.result === undefined) {
          throw new TypeError('Combine reply carried no result');
        }
        histogram.value = reply.result.histogram;
        imageSeeds.value = hydratePaletteSeeds(reply.result.extracted, imageSeeds.value);
        pickerSeeds.value = hydratePaletteSeeds(reply.result.extracted, pickerSeeds.value);
        candidates.value = reply.result.candidates;
        selectedCandidateLabel.value = null;
        sendUiEvent(IridisUiEvent.populatePickerFromImage(reply.result.extracted));
      }
    }

    /**
 * Stage 1 — reduces ONE image's own pixels (held by the engine worker) to
 * its own dominant colors, using ONLY that entry's own settings. Independent
 * of every other uploaded image: re-running this for entry A never touches
 * entry B's histogram/dominantColors. Resolves true when the reply landed.
 */
    class EntryStage1 {
      static async extract(entry: UploadedImage): Promise<boolean> {
        const opened = await ClientAccessOperation.open();
        if (!opened.holdsPixels(entry.id)) {
          await EntryStage1.upload(opened, entry.id, await ToPixels.decode(entry.source));
        }
        const reply = await opened.request(WorkerMessageEntity.create({ 'imageId': entry.id, 'kind': 'extract', 'settings': ExtractionSettingsOperation.from(entry) }));
        const result = reply !== undefined;
        return result;
      }

      /** Transfers the decoded buffer to the worker; the main thread keeps no pixel copy. */
      static async upload(opened: WorkerRequestClient, imageId: string, pixels: ImagePixels): Promise<void> {
        await opened.request(WorkerMessageEntity.create({ 'height': pixels.height, 'imageId': imageId, 'kind': 'pixels', 'width': pixels.width }), pixels.buffer);
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
          client?.cancelCombine();
          histogram.value = [];
          imageSeeds.value = defaultPaletteSeeds();
          pickerSeeds.value = defaultPaletteSeeds();
          candidates.value = [];
          selectedCandidateLabel.value = null;
          return;
        }
        error.value = null;
        void CombineNowRunOperation.send(WorkerMessageEntity.create({
          'colorSpace': colorSpace.value,
          'derivationConfig': VueModule.toRaw(derivationConfig.value),
          'framing': framing.value,
          'hexes': combinedHexes,
          'kind': 'combine',
          'schemaName': schemaName.value,
          'semanticHuesEnabled': semanticHuesEnabled.value,
          'settings': ExtractionSettingsOperation.from(defaultEntrySettings()),
          'strictness': contrastStrictness.value
        }));
      }

      private static async send(message: WorkerMessageEntity.Type): Promise<void> {
        const opened = await ClientAccessOperation.open();
        await opened.request(message);
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

    /** Decodes one source, hands its pixels to the worker, and resolves the extracted entry; a failed extraction releases the worker's pixels and resolves undefined. */
    class AddEntryOperation {
      static async run(opened: WorkerRequestClient, source: File | string, sampleName: string | undefined): Promise<UploadedImage | undefined> {
        const sourceUrl = typeof source === 'string' ? source : URL.createObjectURL(source);
        const pixels = await ToPixels.decode(sourceUrl);
        const entry = defaultEntrySettings();
        entry.id = ImageId.make();
        entry.name = typeof source === 'string' ? (sampleName ?? 'Sample') : source.name;
        entry.source = sourceUrl;
        PendingEntries.entries.set(entry.id, entry);
        await EntryStage1.upload(opened, entry.id, pixels);
        const extracted = await EntryStage1.extract(entry);
        PendingEntries.entries.delete(entry.id);
        if (!extracted) {
          void opened.request(WorkerMessageEntity.create({ 'imageId': entry.id, 'kind': 'release' }));
        }
        const result = extracted ? entry : undefined;
        return result;
      }
    }

    class AddUploadedImagesUnqueuedOperation {
      static async run(sources: readonly (File | string)[], sampleNames?: readonly string[]): Promise<void> {
        if (typeof document === 'undefined' || sources.length === 0) {return;}
        beginOperation();
        error.value = null;
        try {
          const added: UploadedImage[] = [];
          const opened = await ClientAccessOperation.open();
          const sourceCount = sources.length;
          let complete = true;
          for (let i = 0; i < sourceCount && complete; i++) {
            const source = sources[i];
            if (source === undefined) {throw new RangeError(`Image source index ${i} is outside the supplied source list`);}
            const entry = await AddEntryOperation.run(opened, source, sampleNames?.[i]);
            if (entry === undefined) {
              complete = false;
            } else {
              added.push(entry);
            }
          }
          if (complete) {
            uploadedImages.value = [...uploadedImages.value, ...added];
            combine();
          } else {
            for (let index = 0; index < added.length; index += 1) {
              void opened.request(WorkerMessageEntity.create({ 'imageId': added[index]?.id ?? '', 'kind': 'release' }));
            }
          }
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
        if (client !== undefined) {
          void client.request(WorkerMessageEntity.create({ 'imageId': id, 'kind': 'release' }));
        }
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

    /** Re-extracts one image in the worker, then recombines once that extraction's reply landed; a superseded or failed extraction leaves the recombine to the newer reply. */
    class EntryReextractOperation {
      static async run(id: string): Promise<void> {
        const entry = uploadedImages.value.find((uploadedImage) => {
          const result = uploadedImage.id === id;
          return result;
        });
        const settled = entry === undefined || await EntryStage1.extract(entry);
        if (settled) {
          combine();
        }
      }
    }

    /** Per-entry debounce so rapid slider drags on one image's settings don't re-run its extraction on every step. */
    const entryReextract = keyedDebounce((id: string) => { void EntryReextractOperation.run(id); }, 180);

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
      static disableSemanticHues(): void { semanticHuesEnabled.value = false; schedule(); }
      static enableSemanticHues(): void { semanticHuesEnabled.value = true; schedule(); }
      static setContrastStrictness(strictness: number): void { contrastStrictness.value = strictness; schedule(); }
      static setDarkFraming(): void { pendingFraming = FramingEntity.intake('dark'); run(); }
      static setDeltaEImageAlgorithm(): void { imgStrategy.value = ClusterDispatcher.resolve('delta-e'); scheduleCombine(); }
      static setDerivationConfig(config: DerivationConfigEntity.Type): void { derivationConfig.value = config; schedule(); }
      static setDisplayP3ColorSpace(): void { colorSpace.value = 'displayP3'; schedule(); }
      static setImageChromaRange(range: [number, number][]): void { imgChromaRange.value = range; scheduleCombine(); }
      static setImageDeltaECap(cap: number): void { imgDeltaECap.value = cap; scheduleCombine(); }
      static setImageHarmonize(threshold: number): void { imgHarmonize.value = threshold; scheduleCombine(); }
      static setImageHistogramBits(bits: number): void { imgHistogramBits.value = bits; scheduleCombine(); }
      static setImageK(k: number): void { imgK.value = k; scheduleCombine(); }
      static setImageLightnessRange(range: [number, number][]): void { imgLightnessRange.value = range; scheduleCombine(); }
      static setKMeansImageAlgorithm(): void { imgStrategy.value = ClusterDispatcher.resolve('k-means'); scheduleCombine(); }
      static setLightFraming(): void { pendingFraming = FramingEntity.intake('light'); run(); }
      static setMedianCutImageAlgorithm(): void { imgStrategy.value = ClusterDispatcher.resolve('median-cut'); scheduleCombine(); }
      static setRoleSort(keys: RoleSortKeyType[]): void { roleSortKeys.value = keys; }
      static setSchema(nextSchemaName: string): void { schemaName.value = SchemaNameEntity.intake(nextSchemaName); schedule(); scheduleCombine(); }
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
      'disableSemanticHues': PaletteParameterOperation.disableSemanticHues,
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

    /** Opens the resolve worker with the first mounted consumer and closes it with the last. */
    class ConsumerLifecycleOperation {
      static mounted(): void {
        mountedConsumers += 1;
        if (client === undefined) {
          client = new WorkerRequestClient(BrowserWorkerPort.open(), ClientHandlersOperation);
          ClientAccessOperation.publish(client);
          if (awaitingMount) {
            awaitingMount = false;
            run();
          }
        }
      }

      static register(): void {
        if (typeof window !== 'undefined') {
          if (VueModule.getCurrentInstance() === null) {
            ConsumerLifecycleOperation.mounted();
          } else {
            VueModule.onMounted(ConsumerLifecycleOperation.mounted);
            VueModule.onUnmounted(ConsumerLifecycleOperation.unmounted);
          }
        }
      }

      static unmounted(): void {
        mountedConsumers -= 1;
        if (mountedConsumers === 0) {
          client?.dispose();
          client = undefined;
        }
      }
    }

    class BootOperation {
      static run(): void {
        // The server resolves synchronously and hands its snapshot to the client through the Nuxt payload,
        // so hydration starts from the server palette and no engine work happens before a consumer mounts.
        if (typeof window === 'undefined') {
          run();
          return;
        }
        const snapshot = serverSnapshot.value;
        if (snapshot === null) {
          awaitingMount = true;
        } else {
          serverSnapshot.value = null;
          CommitSnapshotOperation.run(snapshot, ResolveRequestOperation.build());
        }
        // Load default sample palette on page init
        void addUploadedImages([logoUrl()], ['Sample']);
        // framing is intentionally absent here — its swap is dispatched directly by
        // the framing setters via run(), not through this debounce.
        stopWatches.push(VueModule.watch([pickerSeeds, imageSeeds, schemaName, contrastStrictness, colorSpace, mode, derivationConfig, semanticHuesEnabled], schedule, { 'deep': true }));
        stopWatches.push(VueModule.watch([schemaName, imgStrategy, imgK, imgHistogramBits, imgDeltaECap, imgHarmonize, imgLightnessRange, imgChromaRange], scheduleCombine, { 'deep': true }));
      }
    }

    class UseIridisContextOperation {
      static run() {
        if (!booted) {
          booted = true;
          BootOperation.run();
        }
        ConsumerLifecycleOperation.register();
        const result = {
          'accessibilityBlockers': accessibilityBlockers, 'activeSeeds': activeSeeds, 'addUploadedImages': addUploadedImages, 'candidates': candidates, 'colorSpace': colorSpace, 'combineLocked': combineLocked, 'contrastReport': contrastReport, 'contrastStrictness': contrastStrictness,          'cvdPreviewTypes': cvdPreviewTypes, 'derivationConfig': derivationConfig, 'diagramIsExpanded': diagramIsExpanded, 'diagramScale': diagramScale,
          'diagramTranslateX': diagramTranslateX, 'diagramTranslateY': diagramTranslateY,
          'effectiveHexesFor': effectiveHexesFor, 'error': error, 'framing': framing,
          'histogram': histogram,
          'imageSeeds': imageSeeds, 'imgChromaRange': imgChromaRange, 'imgDeltaECap': imgDeltaECap,
          'imgHarmonize': imgHarmonize, 'imgHistogramBits': imgHistogramBits, 'imgK': imgK, 'imgLightnessRange': imgLightnessRange, 'imgStrategy': imgStrategy, 'mode': mode, 'paletteRevision': paletteRevision, 'pickerSeeds': pickerSeeds,
          'pinnableRoles': pinnableRoles, 'rejectedPinRoles': rejectedPinRoles, 'removeUploadedImage': removeUploadedImage, 'reRunCombine': reRunCombine, 'resolving': resolving, 'roleClamps': roleClamps, 'roleDistances': roleDistances,
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
      client?.dispose();
      client = undefined;
      mountedConsumers = 0;
      awaitingMount = false;
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
