import type { RoleHexMapType } from './roleHexMapType.ts';

/** shade → (role → hex), one entry per engine tonal variant. */
export declare class ScaleMapType {
  [shade: number]: RoleHexMapType;
}
