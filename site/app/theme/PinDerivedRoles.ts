import type {
  PaletteStateInterface, PipelineContextInterface, TaskInterface
} from '@studnicky/iridis';

import { Metadata, RoleProvenanceInterfaceTypeEntity, TaskManifestInterfaceTypeEntity } from '@studnicky/iridis';

/**
 * Assigns an admitted hint to an unassigned derived role before family
 * expansion. The pinned color keeps its exact value and is recorded as a
 * stated role, so contrast enforcement moves other roles around it.
 */
class PinDerivedRoles implements TaskInterface {
  readonly 'name' = 'pin:derivedRoles';

  readonly 'manifest' = TaskManifestInterfaceTypeEntity.create({
    'description': 'Assigns hint-pinned colors onto derivedFrom roles that ResolveRoles skipped and records them as stated, so a pin overrides hue-rotation and stays exact through contrast enforcement.',
    'name':        'pin:derivedRoles',
    'reads':       ['colors', 'input.roles', 'roles'],
    'writes':      ['metadata[\'core:roleProvenance\']', 'roles']
  });

  run(state: PaletteStateInterface, _context: PipelineContextInterface): void {
    const roleSchema = state.input.roles;
    if (roleSchema !== undefined) {
      this.assignPins(state, roleSchema.roles);
    }
  }

  private assignPins(state: PaletteStateInterface, roles: NonNullable<PaletteStateInterface['input']['roles']>['roles']): void {
    const colorsByRole = new Map<string, (typeof state.colors)[number]>();
    for (let colorIndex = 0; colorIndex < state.colors.length; colorIndex += 1) {
      const color = state.colors[colorIndex];
      const roleName = color?.hints?.role;
      if (color !== undefined && roleName !== undefined) {colorsByRole.set(roleName, color);}
    }
    const provenance = Metadata.roleProvenance(state.metadata);
    for (let roleIndex = 0; roleIndex < roles.length; roleIndex += 1) {
      const role = roles[roleIndex];
      const pinned = role === undefined ? undefined : colorsByRole.get(role.name);
      const derivedUnassigned = role?.derivedFrom !== undefined && role.derivedFrom !== '' && !Object.hasOwn(state.roles, role.name);
      if (role !== undefined && pinned !== undefined && derivedUnassigned) {
        Object.defineProperty(state.roles, role.name, { 'configurable': true, 'enumerable': true, 'value': pinned, 'writable': true });
        provenance.set(role.name, RoleProvenanceInterfaceTypeEntity.create({ 'adjustments': [], 'origin': 'stated' }));
      }
    }
    Metadata.writeRoleProvenance(state.metadata, provenance);
  }
}

/** Singleton task registered by createColorEngine. */
export const pinDerivedRoles = new PinDerivedRoles();
