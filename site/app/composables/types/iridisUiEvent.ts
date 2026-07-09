import type { FramingType } from './framing.ts';
import type { GalleryAlgorithmType } from './galleryAlgorithm.ts';
import type { ModeType } from './mode.ts';

/** Events accepted by the shared UI FSM (mode switching, carousel nav/drag, popover gating, seed edits, palette params). */
export type IridisUiEventType =
  | { 'mode': ModeType; 'type': 'SELECT_MODE' }
  | { 'index': number; 'type': 'SELECT_CARD' }
  | { 'count': number; 'delta': number; 'type': 'NAVIGATE' }
  | { 'type': 'DRAG_START' }
  | { 'dragPx': number; 'type': 'DRAG_MOVE' }
  | { 'count': number; 'shiftedBy': number; 'type': 'DRAG_END' }
  | { 'type': 'POPOVER_OPEN' }
  | { 'type': 'POPOVER_CLOSE' }
  | { 'hex'?: string; 'type': 'ADD_SEED' }
  | { 'index': number; 'type': 'REMOVE_SEED' }
  | { 'hex': string; 'index': number; 'type': 'SET_SEED' }
  | { 'index': number; 'role': string | undefined; 'type': 'PIN_SEED_ROLE' }
  | { 'framing': FramingType; 'type': 'SET_FRAMING' }
  | { 'schemaName': string; 'type': 'SET_SCHEMA' }
  | { 'contrastLevel': 'AA' | 'AAA'; 'type': 'SET_CONTRAST' }
  | { 'algorithm': GalleryAlgorithmType; 'type': 'SET_IMAGE_ALGORITHM' }
  | { 'source': 'sample'; 'type': 'EXTRACT_IMAGE' }
  | { 'file': File; 'source': 'file'; 'type': 'EXTRACT_IMAGE' };
