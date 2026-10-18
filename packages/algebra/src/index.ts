import { LerpHue } from './LerpHue.ts';
import { Vector } from './Vector.ts';

export { LerpHue };
export { LerpOptionsInterfaceTypeEntity } from './entities/LerpOptionsInterfaceTypeEntity.ts';
export { OklchInterfaceTypeEntity } from './entities/OklchInterfaceTypeEntity.ts';
export { PaletteInterfaceTypeEntity } from './entities/PaletteInterfaceTypeEntity.ts';
export type { PaletteDistanceMetricInterface } from './interfaces/PaletteDistanceMetricInterface.ts';

export const lerpHue = LerpHue.shortestArc;
export const lerp = Vector.lerp;
export const subtract = Vector.subtract;
export const nearest = Vector.nearest;
export const drift = Vector.drift;
export const perpendicular = Vector.perpendicular;
