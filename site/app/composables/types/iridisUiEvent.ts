export enum IridisUiActionType {
  SELECT_MODE = 'SELECT_MODE',
  SELECT_CARD = 'SELECT_CARD',
  NAVIGATE = 'NAVIGATE',
  DRAG_START = 'DRAG_START',
  DRAG_MOVE = 'DRAG_MOVE',
  DRAG_END = 'DRAG_END',
  POPOVER_OPEN = 'POPOVER_OPEN',
  POPOVER_CLOSE = 'POPOVER_CLOSE',
  ADD_SEED = 'ADD_SEED',
  REMOVE_SEED = 'REMOVE_SEED',
  SET_SEED = 'SET_SEED',
  PIN_SEED_ROLE = 'PIN_SEED_ROLE',
  SET_FRAMING = 'SET_FRAMING',
  SET_SCHEMA = 'SET_SCHEMA',
  SET_CONTRAST_STRICTNESS = 'SET_CONTRAST_STRICTNESS',
  SET_COLOR_SPACE = 'SET_COLOR_SPACE',
  SET_CVD_CORRECT = 'SET_CVD_CORRECT',
  SET_IMAGE_ALGORITHM = 'SET_IMAGE_ALGORITHM',
  SET_IMAGE_K = 'SET_IMAGE_K',
  SET_IMAGE_HISTOGRAM_BITS = 'SET_IMAGE_HISTOGRAM_BITS',
  SET_IMAGE_DELTA_E_CAP = 'SET_IMAGE_DELTA_E_CAP',
  SET_IMAGE_HARMONIZE = 'SET_IMAGE_HARMONIZE',
  SET_IMAGE_LIGHTNESS_RANGE = 'SET_IMAGE_LIGHTNESS_RANGE',
  SET_IMAGE_CHROMA_RANGE = 'SET_IMAGE_CHROMA_RANGE',
  EXTRACT_IMAGE = 'EXTRACT_IMAGE',
  POPULATE_PICKER_FROM_IMAGE = 'POPULATE_PICKER_FROM_IMAGE',
  DIAGRAM_ZOOM = 'DIAGRAM_ZOOM',
  DIAGRAM_PAN = 'DIAGRAM_PAN',
  DIAGRAM_RESET = 'DIAGRAM_RESET',
  DIAGRAM_FIT = 'DIAGRAM_FIT',
  DIAGRAM_TOGGLE_EXPAND = 'DIAGRAM_TOGGLE_EXPAND',
  CVD_TOGGLE_PREVIEW = 'CVD_TOGGLE_PREVIEW',
  CVD_CLEAR_PREVIEWS = 'CVD_CLEAR_PREVIEWS'
}

import type { FramingType } from './framing.ts';
import type { GalleryAlgorithmType } from './galleryAlgorithm.ts';
import type { ModeType } from './mode.ts';

/** Events accepted by the shared UI FSM (mode switching, carousel nav/drag, popover gating, seed edits, palette params). */
export type IridisUiEventType =
  | { 'mode': ModeType; 'type': IridisUiActionType.SELECT_MODE }
  | { 'index': number; 'type': IridisUiActionType.SELECT_CARD }
  | { 'count': number; 'delta': number; 'type': IridisUiActionType.NAVIGATE }
  | { 'type': IridisUiActionType.DRAG_START }
  | { 'dragPx': number; 'type': IridisUiActionType.DRAG_MOVE }
  | { 'count': number; 'shiftedBy': number; 'type': IridisUiActionType.DRAG_END }
  | { 'type': IridisUiActionType.POPOVER_OPEN }
  | { 'type': IridisUiActionType.POPOVER_CLOSE }
  | { 'hex'?: string; 'type': IridisUiActionType.ADD_SEED }
  | { 'index': number; 'type': IridisUiActionType.REMOVE_SEED }
  | { 'hex': string; 'index': number; 'type': IridisUiActionType.SET_SEED }
  | { 'index': number; 'role': string | undefined; 'type': IridisUiActionType.PIN_SEED_ROLE }
  | { 'framing': FramingType; 'type': IridisUiActionType.SET_FRAMING }
  | { 'schemaName': string; 'type': IridisUiActionType.SET_SCHEMA }
  | { 'strictness': number; 'type': IridisUiActionType.SET_CONTRAST_STRICTNESS }
  | { 'colorSpace': 'srgb' | 'displayP3'; 'type': IridisUiActionType.SET_COLOR_SPACE }
  | { 'cvdCorrect': boolean; 'type': IridisUiActionType.SET_CVD_CORRECT }
  | { 'algorithm': GalleryAlgorithmType; 'type': IridisUiActionType.SET_IMAGE_ALGORITHM }
  | { 'k': number; 'type': IridisUiActionType.SET_IMAGE_K }
  | { 'bits': number; 'type': IridisUiActionType.SET_IMAGE_HISTOGRAM_BITS }
  | { 'cap': number; 'type': IridisUiActionType.SET_IMAGE_DELTA_E_CAP }
  | { 'threshold': number; 'type': IridisUiActionType.SET_IMAGE_HARMONIZE }
  | { 'range': [number, number]; 'type': IridisUiActionType.SET_IMAGE_LIGHTNESS_RANGE }
  | { 'range': [number, number]; 'type': IridisUiActionType.SET_IMAGE_CHROMA_RANGE }
  | { 'source': 'sample'; 'type': IridisUiActionType.EXTRACT_IMAGE }
  | { 'file': File; 'source': 'file'; 'type': IridisUiActionType.EXTRACT_IMAGE }
  | { 'hues': string[]; 'type': IridisUiActionType.POPULATE_PICKER_FROM_IMAGE }
  | { 'factor': number; 'type': IridisUiActionType.DIAGRAM_ZOOM }
  | { 'dx': number; 'dy': number; 'type': IridisUiActionType.DIAGRAM_PAN }
  | { 'type': IridisUiActionType.DIAGRAM_RESET }
  | { 'type': IridisUiActionType.DIAGRAM_FIT }
  | { 'type': IridisUiActionType.DIAGRAM_TOGGLE_EXPAND }
  | { 'cvdType': string; 'type': IridisUiActionType.CVD_TOGGLE_PREVIEW }
  | { 'type': IridisUiActionType.CVD_CLEAR_PREVIEWS };
