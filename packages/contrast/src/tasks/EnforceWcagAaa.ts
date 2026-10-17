import type {
  PaletteStateInterface,
  PipelineContextInterface,
  TaskInterface
} from '@studnicky/iridis';

import { TaskManifestInterfaceTypeEntity } from '@studnicky/iridis';

import { WcagPairEnforcer } from './WcagPairEnforcer.ts';

class EnforceWcagAaa implements TaskInterface {
  readonly 'name' = 'enforce:wcagAAA';

  readonly 'manifest' = TaskManifestInterfaceTypeEntity.create({
    'description': 'Enforce WCAG 2.1 AAA contrast (7:1 normal text, 4.5:1 large/UI) on all role pairs.',
    'name':        'enforce:wcagAAA',
    'reads':       ['input.roles.contrastPairs', 'roles'],
    'writes':      ['roles', 'metadata[\'contrast:aaa\']']
  });

  run(state: PaletteStateInterface, context: PipelineContextInterface): void {
    WcagPairEnforcer.run('aaa', 'contrast:aaa', 'EnforceWcagAaa', state, context);
  }
}

export const enforceWcagAaa = new EnforceWcagAaa();
