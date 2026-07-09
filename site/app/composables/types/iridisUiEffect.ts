import type { FramingType } from './framing.ts';
import type { GalleryAlgorithmType } from './galleryAlgorithm.ts';

/**
 * Side effects emitted by IridisUiMachine.reduce() for events whose consequence
 * lives outside IridisUiStateType (e.g. picker-seed array mutation, palette
 * params, image extraction — all owned by useIridis.ts). reduce() stays pure —
 * it only describes the effect; an EffectInterpreter handler performs the
 * actual mutation.
 */
export type IridisUiEffectType =
  | { 'hex'?: string; 'op': 'add'; 'variant': 'MUTATE_SEEDS' }
  | { 'index': number; 'op': 'remove'; 'variant': 'MUTATE_SEEDS' }
  | { 'hex': string; 'index': number; 'op': 'set'; 'variant': 'MUTATE_SEEDS' }
  | { 'index': number; 'role': string | undefined; 'variant': 'PIN_SEED_ROLE' }
  | { 'op': 'framing'; 'value': FramingType; 'variant': 'SET_PALETTE_PARAM' }
  | { 'op': 'schemaName'; 'value': string; 'variant': 'SET_PALETTE_PARAM' }
  | { 'op': 'contrastLevel'; 'value': 'AA' | 'AAA'; 'variant': 'SET_PALETTE_PARAM' }
  | { 'op': 'imgAlgorithm'; 'value': GalleryAlgorithmType; 'variant': 'SET_PALETTE_PARAM' }
  | { 'source': 'sample'; 'variant': 'EXTRACT_IMAGE' }
  | { 'file': File; 'source': 'file'; 'variant': 'EXTRACT_IMAGE' };
