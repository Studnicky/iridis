import type { AccessibilityBlockerSetEntity } from '../entities/AccessibilityBlockerSetEntity.ts';
import type { PaletteSnapshotEntity } from '../entities/PaletteSnapshotEntity.ts';
import type { RoleHexMapType, RoleViewType } from '../types/index.ts';
import type { RoleMathClampType } from '../types/roleMathClampType.ts';
import type { PaletteSessionInputEntity } from './entities/PaletteSessionInputEntity.ts';

import { contrastRatio } from '../../theme/ContrastRatio.ts';
import { roleSchemaByName } from '../../theme/RoleSchemaByName.ts';
import { Tokens } from '../../theme/Tokens.ts';
import { complianceFor } from '../../utils/complianceFor.ts';
import { minimumRatioForRole } from '../../utils/minimumRatioForRole.ts';
import { IRIDIS_CONSTANTS } from '../constants/IridisConstants.ts';
import { RoleSortableRowEntity } from '../entities/RoleSortableRowEntity.ts';
import { roleSchemaFor } from '../roleSchemaFor.ts';
import { PaletteSessionInput } from './PaletteSessionInput.ts';

/** Pure role views over a resolved snapshot and the session input; no state. */
export class PaletteSessionRoleViews {
  /** Role names the demo renders that accept exact seed pins. */
  public static pinnableRoles(input: PaletteSessionInputEntity.Type): string[] {
    const schema = PaletteSessionRoleViews.schemaOf(input);
    const result = schema.roles.reduce<string[]>((names, role) => {
      if (IRIDIS_CONSTANTS.USED_ROLE_NAMES.has(role.name)) {
        names.push(role.name);
      }
      return names;
    }, []);
    return result;
  }

  /** Pinned roles named by a blocked pair; the picker marks them pending. */
  public static rejectedPinRoles(
    blockers: AccessibilityBlockerSetEntity.Type,
    input: PaletteSessionInputEntity.Type
  ): string[] {
    const blockedNames = new Set<string>(blockers.pairs.flatMap((pair) => {
      const names = [pair.foreground, pair.background];
      return names;
    }));
    const result = PaletteSessionInput.activeSeeds(input).flatMap((seed) => {
      const pinned = seed.role !== undefined && blockedNames.has(seed.role) ? [seed.role] : [];
      return pinned;
    });
    return result;
  }

  public static roleClamps(snapshot: PaletteSnapshotEntity.Type): Map<string, RoleMathClampType> {
    const result = new Map<string, RoleMathClampType>();
    for (let index = 0; index < snapshot.clamps.length; index += 1) {
      const clamp = snapshot.clamps[index];
      if (clamp !== undefined) {
        result.set(clamp.roleName, { 'resolvedHex': clamp.resolvedHex, 'roleOklch': clamp.roleOklch, 'seedHex': clamp.seedHex, 'seedOklch': clamp.seedOklch });
      }
    }
    return result;
  }

  /** One row per resolved role: contrast ratio against the background role and the compliance grade for the role's minimum. */
  public static roleContrastRows(snapshot: PaletteSnapshotEntity.Type, input: PaletteSessionInputEntity.Type): RoleSortableRowEntity.Type[] {
    const views = PaletteSessionRoleViews.roleViews(snapshot);
    const background = PaletteSessionRoleViews.roles(snapshot).background;
    if (background === undefined) {
      throw new Error('Resolved palette is missing the required background role');
    }
    const schema = PaletteSessionRoleViews.schemaOf(input);
    const result = views.map((role) => {
      const ratio = contrastRatio(role.hex, background);
      const row = RoleSortableRowEntity.create({
        'c': role.c,
        'compliance': complianceFor(ratio, minimumRatioForRole(schema, role.name)),
        'h': role.h,
        'hex': role.hex,
        'l': role.l,
        'name': role.name,
        'ratio': ratio
      });
      return row;
    });
    return result;
  }

  public static roleDistances(snapshot: PaletteSnapshotEntity.Type): Map<string, ReadonlyMap<string, number>> {
    const result = new Map<string, ReadonlyMap<string, number>>();
    const entries = Object.entries(snapshot.distances);
    for (let index = 0; index < entries.length; index += 1) {
      const entry = entries[index];
      if (entry !== undefined) {
        result.set(entry[0], new Map(Object.entries(entry[1])));
      }
    }
    return result;
  }

  public static roleViews(snapshot: PaletteSnapshotEntity.Type): RoleViewType[] {
    const result = snapshot.roles.map((role) => {
      const view = { 'c': role.c, 'displayP3': role.displayP3, 'h': role.h, 'hex': role.hex, 'l': role.l, 'name': role.name };
      return view;
    });
    return result;
  }

  public static roles(snapshot: PaletteSnapshotEntity.Type): RoleHexMapType {
    const result = Tokens.hexRecord(snapshot.roles);
    return result;
  }

  private static schemaOf(input: PaletteSessionInputEntity.Type): ReturnType<typeof roleSchemaFor> {
    const pair = roleSchemaByName[input.schemaName];
    const result = roleSchemaFor(input.framing === 'dark' ? pair.dark : pair.light);
    return result;
  }
}
