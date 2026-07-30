import type {
  PluginInterface,
  PluginSchemaContributionInterfaceType,
  TaskInterface
} from '@studnicky/iridis';

import { CONTRAST_PLUGIN_SCHEMAS } from './constants/ContrastPluginSchemas.ts';
import { enforceApca }        from './tasks/EnforceApca.ts';
import { enforceCvdSimulate } from './tasks/EnforceCvdSimulate.ts';
import { enforceWcagAa }      from './tasks/EnforceWcagAa.ts';
import { enforceWcagAaa }     from './tasks/EnforceWcagAaa.ts';

export class ContrastPlugin implements PluginInterface {
  readonly 'name'    = 'contrast';

  readonly 'version' = '0.1.0';

  tasks(): readonly TaskInterface[] {
    return [
      enforceWcagAa,
      enforceWcagAaa,
      enforceApca,
      enforceCvdSimulate
    ];
  }

  schemas(): PluginSchemaContributionInterfaceType {
    return {
      'metadata': {
        'contrast:aa':   CONTRAST_PLUGIN_SCHEMAS.aa,
        'contrast:aaa':  CONTRAST_PLUGIN_SCHEMAS.aaa,
        'contrast:apca': CONTRAST_PLUGIN_SCHEMAS.apca,
        'contrast:cvd':  CONTRAST_PLUGIN_SCHEMAS.cvd
      },
      'outputs': undefined
    };
  }
}
