import { LerpHue } from './LerpHue.ts';
import { Vector } from './Vector.ts';

export { LerpHue };
export { LerpOptionsEntity } from './entities/LerpOptionsEntity.ts';
export { OklchEntity } from './entities/OklchEntity.ts';
export { PaletteEntity } from './entities/PaletteEntity.ts';
export type { PaletteDistanceMetricInterface } from './interfaces/PaletteDistanceMetricInterface.ts';

export const lerpHue = LerpHue.shortestArc;
export const lerp = Vector.lerp;
export const subtract = Vector.subtract;
export const nearest = Vector.nearest;
export const drift = Vector.drift;
export const perpendicular = Vector.perpendicular;
