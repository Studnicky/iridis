import type { RoleHexMapType } from './roleHexMap.ts';

/** shade → (role → hex), one entry per engine tonal variant. */
export type ScaleMapType = Record<number, RoleHexMapType>;
