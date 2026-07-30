import { LerpHue } from './LerpHue.ts';
import { Vector } from './Vector.ts';

export const lerpHue = LerpHue.of;

export const lerp = Vector.lerp;
export const subtract = Vector.subtract;
export const nearest = Vector.nearest;
export const drift = Vector.drift;
export const perpendicular = Vector.perpendicular;

export type {
  HueDirectionType,
  LerpOptionsInterfaceType,
  OklchInterfaceType,
  PaletteDistanceMetricType,
  PaletteInterfaceType
} from './types/index.ts';
