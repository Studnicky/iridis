import type {
  PluginInterface,
  TaskInterface,
} from '@studnicky/iridis';
import { enforceApca }       from './tasks/EnforceApca.ts';
import { enforceCvdSimulate } from './tasks/EnforceCvdSimulate.ts';
import { enforceWcagAa }     from './tasks/EnforceWcagAa.ts';
import { enforceWcagAaa }    from './tasks/EnforceWcagAaa.ts';

export class WcagPlugin implements PluginInterface {
  readonly name    = 'wcag';
  readonly version = '0.1.0';

  tasks(): readonly TaskInterface[] {
    return [
      enforceWcagAa,
      enforceWcagAaa,
      enforceApca,
      enforceCvdSimulate,
    ];
  }
}

export const wcagPlugin     = new WcagPlugin();
export const contrastPlugin = wcagPlugin;
