import { IridisUiEffectVariant } from './types/index.ts';
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

import { EffectInterpreter } from '@studnicky/fsm';
import { shallowRef } from 'vue';

import type { IridisUiEffectType, IridisUiEventType } from './types/index.ts';

import { IridisUiMachine } from './fsm/IridisUiMachine.ts';

type MutateSeedsHandlerType = (effect: Extract<IridisUiEffectType, { 'variant': IridisUiEffectVariant.MUTATE_SEEDS }>) => void;
type SetPaletteParamHandlerType = (effect: Extract<IridisUiEffectType, { 'variant': IridisUiEffectVariant.SET_PALETTE_PARAM }>) => void;
type ExtractImageHandlerType = (effect: Extract<IridisUiEffectType, { 'variant': IridisUiEffectVariant.EXTRACT_IMAGE }>) => void;
type PinSeedRoleHandlerType = (effect: Extract<IridisUiEffectType, { 'variant': IridisUiEffectVariant.PIN_SEED_ROLE }>) => void;
type UpdateDiagramViewHandlerType = (effect: Extract<IridisUiEffectType, { 'variant': IridisUiEffectVariant.UPDATE_DIAGRAM_VIEW }>) => void;
type UpdateCvdPreviewHandlerType = (effect: Extract<IridisUiEffectType, { 'variant': IridisUiEffectVariant.UPDATE_CVD_PREVIEW }>) => void;

/** Mutable — `EffectInterpreter` reads handler keys dynamically on each drain, so filling this in after construction (once useIridis.ts registers it) still wires correctly. */
const handlers: {
  'EXTRACT_IMAGE'?: ExtractImageHandlerType; 'MUTATE_SEEDS'?: MutateSeedsHandlerType;
  'PIN_SEED_ROLE'?: PinSeedRoleHandlerType; 'SET_PALETTE_PARAM'?: SetPaletteParamHandlerType;
  'UPDATE_DIAGRAM_VIEW'?: UpdateDiagramViewHandlerType; 'UPDATE_CVD_PREVIEW'?: UpdateCvdPreviewHandlerType
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
 */
function send(event: IridisUiEventType): void {
  void interpreter.send(event);
}

/** Registers the MUTATE_SEEDS effect handler. Called once by useIridis.ts, which owns the picker-seed refs the effect ultimately writes to. */
function registerMutateSeedsHandler(handler: MutateSeedsHandlerType): void {
  handlers.MUTATE_SEEDS = handler;
}

/** Registers the SET_PALETTE_PARAM effect handler (framing/schemaName/contrastLevel/imgAlgorithm). */
function registerSetPaletteParamHandler(handler: SetPaletteParamHandlerType): void {
  handlers.SET_PALETTE_PARAM = handler;
}

/** Registers the EXTRACT_IMAGE effect handler (sample gradient or an uploaded file). */
function registerExtractImageHandler(handler: ExtractImageHandlerType): void {
  handlers.EXTRACT_IMAGE = handler;
}

/** Registers the PIN_SEED_ROLE effect handler (pin/unpin a picker seed to a named role). */
function registerPinSeedRoleHandler(handler: PinSeedRoleHandlerType): void {
  handlers.PIN_SEED_ROLE = handler;
}

/** Registers the UPDATE_DIAGRAM_VIEW effect handler (zoom/pan/reset diagram view). */
function registerUpdateDiagramViewHandler(handler: UpdateDiagramViewHandlerType): void {
  handlers.UPDATE_DIAGRAM_VIEW = handler;
}

/** Registers the UPDATE_CVD_PREVIEW effect handler (toggle/clear CVD preview types). */
function registerUpdateCvdPreviewHandler(handler: UpdateCvdPreviewHandlerType): void {
  handlers.UPDATE_CVD_PREVIEW = handler;
}

export function useIridisUiMachine() {
  return {
    'registerExtractImageHandler': registerExtractImageHandler, 'registerMutateSeedsHandler': registerMutateSeedsHandler,
    'registerPinSeedRoleHandler': registerPinSeedRoleHandler, 'registerSetPaletteParamHandler': registerSetPaletteParamHandler,
    'registerUpdateDiagramViewHandler': registerUpdateDiagramViewHandler, 'registerUpdateCvdPreviewHandler': registerUpdateCvdPreviewHandler,
    'send': send, 'state': state
  };
}
