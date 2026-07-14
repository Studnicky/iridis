export enum IridisUiEffectVariant {
  MUTATE_SEEDS = 'MUTATE_SEEDS',
  PIN_SEED_ROLE = 'PIN_SEED_ROLE',
  SET_PALETTE_PARAM = 'SET_PALETTE_PARAM',
  EXTRACT_IMAGE = 'EXTRACT_IMAGE',
  POPULATE_PICKER_FROM_IMAGE = 'POPULATE_PICKER_FROM_IMAGE',
  SELECT_IMAGE_CANDIDATE = 'SELECT_IMAGE_CANDIDATE',
  UPDATE_DIAGRAM_VIEW = 'UPDATE_DIAGRAM_VIEW',
  UPDATE_CVD_PREVIEW = 'UPDATE_CVD_PREVIEW',
  NAVIGATE_TO_TARGET = 'NAVIGATE_TO_TARGET'
}

import type { FramingType } from './framing.ts';
import type { GalleryAlgorithmType } from './galleryAlgorithm.ts';
import type { DerivationConfig } from './colorDerivation.ts';
import type { RoleSortKeyType } from '../../utils/roleSort.ts';

/**
 * Side effects emitted by IridisUiMachine.reduce() for events whose consequence
 * lives outside IridisUiStateType (e.g. picker-seed array mutation, palette
 * params, image extraction — all owned by useIridis.ts). reduce() stays pure —
 * it only describes the effect; an EffectInterpreter handler performs the
 * actual mutation.
 */
export type IridisUiEffectType =
  | { 'hex'?: string; 'op': 'add'; 'variant': IridisUiEffectVariant.MUTATE_SEEDS }
  | { 'index': number; 'op': 'remove'; 'variant': IridisUiEffectVariant.MUTATE_SEEDS }
  | { 'hex': string; 'index': number; 'op': 'set'; 'variant': IridisUiEffectVariant.MUTATE_SEEDS }
  | { 'index': number; 'role': string | undefined; 'variant': IridisUiEffectVariant.PIN_SEED_ROLE }
  | { op: 'framing'; value: FramingType; variant: IridisUiEffectVariant.SET_PALETTE_PARAM }
  | { op: 'schemaName'; value: string; variant: IridisUiEffectVariant.SET_PALETTE_PARAM }
  | { op: 'strictness'; value: number; variant: IridisUiEffectVariant.SET_PALETTE_PARAM }
  | { op: 'colorSpace'; value: 'srgb' | 'displayP3'; variant: IridisUiEffectVariant.SET_PALETTE_PARAM }
  | { 'op': 'cvdCorrect'; 'value': boolean; 'variant': IridisUiEffectVariant.SET_PALETTE_PARAM }
  | { 'op': 'imgAlgorithm'; 'value': GalleryAlgorithmType; 'variant': IridisUiEffectVariant.SET_PALETTE_PARAM }
  | { 'op': 'imgK'; 'value': number; 'variant': IridisUiEffectVariant.SET_PALETTE_PARAM }
  | { 'op': 'imgHistogramBits'; 'value': number; 'variant': IridisUiEffectVariant.SET_PALETTE_PARAM }
  | { 'op': 'imgDeltaECap'; 'value': number; 'variant': IridisUiEffectVariant.SET_PALETTE_PARAM }
  | { 'op': 'imgHarmonize'; 'value': number; 'variant': IridisUiEffectVariant.SET_PALETTE_PARAM }
  | { 'op': 'imgLightnessRange'; 'value': [number, number][]; 'variant': IridisUiEffectVariant.SET_PALETTE_PARAM }
  | { 'op': 'imgChromaRange'; 'value': [number, number][]; 'variant': IridisUiEffectVariant.SET_PALETTE_PARAM }
  | { 'op': 'derivation'; 'value': DerivationConfig; 'variant': IridisUiEffectVariant.SET_PALETTE_PARAM }
  | { 'op': 'roleSort'; 'value': RoleSortKeyType[]; 'variant': IridisUiEffectVariant.SET_PALETTE_PARAM }
  | { 'source': 'sample'; 'variant': IridisUiEffectVariant.EXTRACT_IMAGE }
  | { 'file': File | readonly File[]; 'source': 'file'; 'variant': IridisUiEffectVariant.EXTRACT_IMAGE }
  | { 'hues': string[]; 'variant': IridisUiEffectVariant.POPULATE_PICKER_FROM_IMAGE }
  | { 'hexes': string[]; 'label': string; 'variant': IridisUiEffectVariant.SELECT_IMAGE_CANDIDATE }
  | { 'op': 'zoom'; 'factor': number; 'variant': IridisUiEffectVariant.UPDATE_DIAGRAM_VIEW }
  | { 'dx': number; 'dy': number; 'op': 'pan'; 'variant': IridisUiEffectVariant.UPDATE_DIAGRAM_VIEW }
  | { 'op': 'reset'; 'variant': IridisUiEffectVariant.UPDATE_DIAGRAM_VIEW }
  | { 'op': 'fit'; 'variant': IridisUiEffectVariant.UPDATE_DIAGRAM_VIEW }
  | { 'op': 'toggleExpand'; 'variant': IridisUiEffectVariant.UPDATE_DIAGRAM_VIEW }
  | { 'cvdType': string; 'op': 'toggle'; 'variant': IridisUiEffectVariant.UPDATE_CVD_PREVIEW }
  | { 'op': 'clear'; 'variant': IridisUiEffectVariant.UPDATE_CVD_PREVIEW }
  | { 'targetId': string; 'variant': IridisUiEffectVariant.NAVIGATE_TO_TARGET };
