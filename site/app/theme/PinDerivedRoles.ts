import type {
  PaletteStateInterface, PipelineContextInterface, TaskInterface
} from '@studnicky/iridis';

import { Metadata, RoleProvenanceInterfaceTypeEntity, TaskManifestInterfaceTypeEntity } from '@studnicky/iridis';

/**
 * Assigns an admitted hint to an unassigned derived role before family
 * expansion. The explicit role value remains assigned, so family derivation
 * preserves the requested pin rather than replacing it.
 */
class PinDerivedRoles implements TaskInterface {
  readonly 'name' = 'pin:derivedRoles';

  readonly 'manifest' = TaskManifestInterfaceTypeEntity.create({
    'description': 'Assigns hint-pinned colors onto derivedFrom roles that ResolveRoles skipped, so a pin overrides hue-rotation instead of being silently discarded by ExpandFamily.',
    'name':        'pin:derivedRoles',
    'reads':       ['colors', 'input.roles', 'metadata', 'roles'],
    'writes':      ['metadata', 'roles']
  });

  run(state: PaletteStateInterface, _context: PipelineContextInterface): void {
    const roleSchema = state.input.roles;
    if (roleSchema === undefined) {return;}
    const colorsByRole = new Map<string, (typeof state.colors)[number]>();
    const colors = state.colors;
    const colorCount = colors.length;
    for (let colorIndex = 0; colorIndex < colorCount; colorIndex += 1) {
      const color = colors[colorIndex];
      const roleName = color?.hints?.role;
      if (color !== undefined && roleName !== undefined) {colorsByRole.set(roleName, color);}
    }
    const provenance = Metadata.roleProvenance(state.metadata);
    const roles = roleSchema.roles;
    for (let roleIndex = 0; roleIndex < roles.length; roleIndex += 1) {
      const role = roles[roleIndex];
      if (role?.derivedFrom === undefined || role.derivedFrom === '') {continue;}
      if (Object.hasOwn(state.roles, role.name)) {continue;}
      const hintMatch = colorsByRole.get(role.name);
      if (hintMatch === undefined) {continue;}
      const resolvedRole = hintMatch;
      Object.defineProperty(state.roles, role.name, { 'configurable': true, 'enumerable': true, 'value': resolvedRole, 'writable': true });
      provenance.set(role.name, RoleProvenanceInterfaceTypeEntity.create({ 'adjustments': [], 'origin': 'stated' }));
    }
    Metadata.writeRoleProvenance(state.metadata, provenance);
  }
}

/** Singleton task registered by createColorEngine. */
export const pinDerivedRoles = new PinDerivedRoles();
