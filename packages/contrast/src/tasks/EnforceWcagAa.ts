import type {
  PaletteStateInterface,
  PipelineContextInterface,
  TaskInterface
} from '@studnicky/iridis';

import { TaskManifestInterfaceTypeEntity } from '@studnicky/iridis';

import { WcagPairEnforcer } from './WcagPairEnforcer.ts';

class EnforceWcagAa implements TaskInterface {
  readonly 'name' = 'enforce:wcagAA';

  readonly 'manifest' = TaskManifestInterfaceTypeEntity.create({
    'description': 'Enforce WCAG 2.1 AA contrast (4.5:1 normal text, 3:1 large/UI) on all role pairs.',
    'name':        'enforce:wcagAA',
    'reads':       ['input.roles.contrastPairs', 'roles'],
    'writes':      ['roles', 'metadata[\'contrast:aa\']']
  });

  run(state: PaletteStateInterface, context: PipelineContextInterface): void {
    WcagPairEnforcer.run('aa', 'contrast:aa', 'EnforceWcagAa', state, context);
  }
}

export const enforceWcagAa = new EnforceWcagAa();
