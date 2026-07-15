import { EffectInterpreter } from '@studnicky/fsm';
/**
 * Vue adapter over the shared IridisUiMachine, run through an EffectInterpreter
 * — one module-level singleton, matching useIridis.ts's module-level-ref
 * pattern, so CylinderCarousel, ModeSwitch, and PalettePlayground (no
 * prop-passing path between them) stay in sync through one state owner. Every
 * interaction event on the site (mode switch, carousel nav/drag, popover
 * gating, seed edits) routes through `send()`.
 *
 * `reduce()` stays pure: events whose consequence lives outside
 * IridisUiStateType (seed array mutation, owned by useIridis.ts) are emitted
 * as effects and performed by the handler registered via
 * `registerMutateSeedsHandler` — not inline in the reducer or in components.
 */
import { LogBody } from '@studnicky/logger/builders';
import { LOG_STATUS } from '@studnicky/logger/constants';
import { shallowRef } from 'vue';

import { IridisUiMachine } from './fsm/IridisUiMachine.ts';
import { logger } from './logger.ts';
import { type IridisUiEffectType, IridisUiEffectVariant, type IridisUiEventType } from './types/index.ts';

type MutateSeedsHandlerType = (effect: Extract<IridisUiEffectType, { 'variant': IridisUiEffectVariant.MUTATE_SEEDS }>) => void;
type SetPaletteParamHandlerType = (effect: Extract<IridisUiEffectType, { 'variant': IridisUiEffectVariant.SET_PALETTE_PARAM }>) => void;
type ExtractImageHandlerType = (effect: Extract<IridisUiEffectType, { 'variant': IridisUiEffectVariant.EXTRACT_IMAGE }>) => void;
type PinSeedRoleHandlerType = (effect: Extract<IridisUiEffectType, { 'variant': IridisUiEffectVariant.PIN_SEED_ROLE }>) => void;
type UpdateDiagramViewHandlerType = (effect: Extract<IridisUiEffectType, { 'variant': IridisUiEffectVariant.UPDATE_DIAGRAM_VIEW }>) => void;
type UpdateCvdPreviewHandlerType = (effect: Extract<IridisUiEffectType, { 'variant': IridisUiEffectVariant.UPDATE_CVD_PREVIEW }>) => void;
type PopulatePickerFromImageHandlerType = (effect: Extract<IridisUiEffectType, { 'variant': IridisUiEffectVariant.POPULATE_PICKER_FROM_IMAGE }>) => void;
type NavigateToTargetHandlerType = (effect: Extract<IridisUiEffectType, { 'variant': IridisUiEffectVariant.NAVIGATE_TO_TARGET }>) => void;
type SelectImageCandidateHandlerType = (effect: Extract<IridisUiEffectType, { 'variant': IridisUiEffectVariant.SELECT_IMAGE_CANDIDATE }>) => void;

/** Mutable — `EffectInterpreter` reads handler keys dynamically on each drain, so filling this in after construction (once useIridis.ts registers it) still wires correctly. */
const handlers: {
  'EXTRACT_IMAGE'?: ExtractImageHandlerType; 'MUTATE_SEEDS'?: MutateSeedsHandlerType;
  'NAVIGATE_TO_TARGET'?: NavigateToTargetHandlerType; 'PIN_SEED_ROLE'?: PinSeedRoleHandlerType;
  'POPULATE_PICKER_FROM_IMAGE'?: PopulatePickerFromImageHandlerType; 'SELECT_IMAGE_CANDIDATE'?: SelectImageCandidateHandlerType
  'SET_PALETTE_PARAM'?: SetPaletteParamHandlerType; 'UPDATE_CVD_PREVIEW'?: UpdateCvdPreviewHandlerType;
  'UPDATE_DIAGRAM_VIEW'?: UpdateDiagramViewHandlerType;
} = {};

const interpreter = EffectInterpreter.create({ 'handlers': handlers, 'machine': new IridisUiMachine() });
interpreter.start();

const state = shallowRef(interpreter.getState());
interpreter.subscribe((next) => { state.value = next; });

/**
 * `interpreter.send()` is async (it awaits any emitted effect handlers), but
 * the state transition itself — and the synchronous `notifyObservers()` call
 * that pushes into `state` — happens before the first `await` inside the
 * interpreter's drain loop. So fire-and-forget here still updates `state`
 * synchronously for callers (the mode computed setter, carousel handlers);
 * nothing here needs to await effect completion.
 *
 * The returned promise is still observed, not discarded, as defense-in-depth:
 * every registered effect handler is wrapped (see `Handler.wrap` below) so it
 * cannot reject this promise, and the reducer is total for reachable events,
 * so in practice this `.catch` should never fire — but if some other rejection
 * path is added later, it still logs through the app logger instead of
 * surfacing only as an unhandled rejection.
 */
function send(event: IridisUiEventType): void {
  interpreter.send(event).catch((err: unknown) => {
    logger.error(
      LogBody.create()
        .component('useIridisUiMachine')
        .operation('send')
        .status(LOG_STATUS.FAILED)
        .message(`FSM rejected event "${event.type}"`)
        .context({ 'error': err instanceof Error ? err.message : String(err) })
        .build()
    );
  });
}

/**
 * Wraps a registered effect handler so it can never throw out of the
 * interpreter. `EffectInterpreter#drain()` (in `@studnicky/fsm`) sets its
 * internal draining flag before its while-loop and only clears it AFTER the
 * loop — not in a `finally` — so an uncaught handler throw mid-drain leaves
 * that flag stuck permanently: every later `send()` would see draining
 * already in progress, enqueue its event without ever draining it, and the
 * FSM would go permanently unresponsive while looking alive. Every
 * `register*Handler` below runs its handler through `Handler.wrap` before
 * storing it on `handlers`, so this single catch site covers all effect
 * variants, current and future — a handler that throws is caught and logged
 * here instead, so `#invokeHandler` always resolves and drain always reaches
 * its reset.
 */
class Handler {
  static wrap<TEffect extends IridisUiEffectType>(
    variant: IridisUiEffectVariant, handler: (effect: TEffect) => void
  ): (effect: TEffect) => void {
    return (effect: TEffect): void => {
      try {
        handler(effect);
      } catch (err: unknown) {
        logger.error(
          LogBody.create()
            .component('useIridisUiMachine')
            .operation('effect')
            .status(LOG_STATUS.FAILED)
            .message(`Effect handler for "${variant}" threw`)
            .context({ 'error': err instanceof Error ? err.message : String(err) })
            .build()
        );
      }
    };
  }
}

/** Registers the MUTATE_SEEDS effect handler. Called once by useIridis.ts, which owns the picker-seed refs the effect ultimately writes to. */
function registerMutateSeedsHandler(handler: MutateSeedsHandlerType): void {
  handlers.MUTATE_SEEDS = Handler.wrap(IridisUiEffectVariant.MUTATE_SEEDS, handler);
}

/** Registers the SET_PALETTE_PARAM effect handler (framing/schemaName/contrastLevel/imgAlgorithm). */
function registerSetPaletteParamHandler(handler: SetPaletteParamHandlerType): void {
  handlers.SET_PALETTE_PARAM = Handler.wrap(IridisUiEffectVariant.SET_PALETTE_PARAM, handler);
}

/** Registers the EXTRACT_IMAGE effect handler (sample gradient or an uploaded file). */
function registerExtractImageHandler(handler: ExtractImageHandlerType): void {
  handlers.EXTRACT_IMAGE = Handler.wrap(IridisUiEffectVariant.EXTRACT_IMAGE, handler);
}

/** Registers the PIN_SEED_ROLE effect handler (pin/unpin a picker seed to a named role). */
function registerPinSeedRoleHandler(handler: PinSeedRoleHandlerType): void {
  handlers.PIN_SEED_ROLE = Handler.wrap(IridisUiEffectVariant.PIN_SEED_ROLE, handler);
}

/** Registers the UPDATE_DIAGRAM_VIEW effect handler (zoom/pan/reset diagram view). */
function registerUpdateDiagramViewHandler(handler: UpdateDiagramViewHandlerType): void {
  handlers.UPDATE_DIAGRAM_VIEW = Handler.wrap(IridisUiEffectVariant.UPDATE_DIAGRAM_VIEW, handler);
}

/** Registers the UPDATE_CVD_PREVIEW effect handler (toggle/clear CVD preview types). */
function registerUpdateCvdPreviewHandler(handler: UpdateCvdPreviewHandlerType): void {
  handlers.UPDATE_CVD_PREVIEW = Handler.wrap(IridisUiEffectVariant.UPDATE_CVD_PREVIEW, handler);
}

/** Registers the POPULATE_PICKER_FROM_IMAGE effect handler (populate picker palette from image extraction). */
function registerPopulatePickerFromImageHandler(handler: PopulatePickerFromImageHandlerType): void {
  handlers.POPULATE_PICKER_FROM_IMAGE = Handler.wrap(IridisUiEffectVariant.POPULATE_PICKER_FROM_IMAGE, handler);
}

/** Registers the NAVIGATE_TO_TARGET effect handler (resolve a navigation-target id and move to it — a carousel SELECT_CARD or a doc-card scroll). */
function registerNavigateToTargetHandler(handler: NavigateToTargetHandlerType): void {
  handlers.NAVIGATE_TO_TARGET = Handler.wrap(IridisUiEffectVariant.NAVIGATE_TO_TARGET, handler);
}

/** Registers the SELECT_IMAGE_CANDIDATE effect handler (swap imageSeeds to a chosen gallery:extractCandidates palette). */
function registerSelectImageCandidateHandler(handler: SelectImageCandidateHandlerType): void {
  handlers.SELECT_IMAGE_CANDIDATE = Handler.wrap(IridisUiEffectVariant.SELECT_IMAGE_CANDIDATE, handler);
}

export function useIridisUiMachine() {
  return {
    'registerExtractImageHandler': registerExtractImageHandler, 'registerMutateSeedsHandler': registerMutateSeedsHandler,
    'registerNavigateToTargetHandler': registerNavigateToTargetHandler, 'registerPinSeedRoleHandler': registerPinSeedRoleHandler,
    'registerPopulatePickerFromImageHandler': registerPopulatePickerFromImageHandler, 'registerSelectImageCandidateHandler': registerSelectImageCandidateHandler,
    'registerSetPaletteParamHandler': registerSetPaletteParamHandler,
    'registerUpdateCvdPreviewHandler': registerUpdateCvdPreviewHandler,
    'registerUpdateDiagramViewHandler': registerUpdateDiagramViewHandler,
    'send': send, 'state': state
  };
}
