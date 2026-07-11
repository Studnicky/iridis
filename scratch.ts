import { Engine, buildPipeline, REQUIRED_COLOR_STAGES } from './packages/core/src/pipeline/IridisEngine.ts';
import { roleSchemaByName } from './site/app/theme/RoleSchemaByName.ts';
import { pinDerivedRoles } from './site/app/theme/PinDerivedRoles.ts';

const engine = new Engine();
engine.pipeline(buildPipeline(REQUIRED_COLOR_STAGES));
engine.tasks.register(pinDerivedRoles);

const VARIANT_CONFIG = {
  // dummy config if needed
};

const activeSeeds = [{ hex: '#7c3aed' }, { hex: '#06b6d4' }, { hex: '#f59e0b' }, { hex: '#ec4899' }];

try {
  console.log('Running iridis-32');
  const s32 = engine.run({
    colors: activeSeeds,
    contrast: { algorithm: 'wcag21', cvdCorrect: true, level: 'AA' },
    metadata: { 'core:variantConfig': VARIANT_CONFIG },
    roles: roleSchemaByName['iridis-32'].dark,
    runtime: { colorSpace: 'srgb', framing: 'dark' }
  });
  console.log('Success iridis-32');

  console.log('Running iridis-12');
  const s12 = engine.run({
    colors: activeSeeds,
    contrast: { algorithm: 'wcag21', cvdCorrect: true, level: 'AA' },
    metadata: { 'core:variantConfig': VARIANT_CONFIG },
    roles: roleSchemaByName['iridis-12'].dark,
    runtime: { colorSpace: 'srgb', framing: 'dark' }
  });
  console.log('Success iridis-12');
} catch (e) {
  console.error('ERROR:', e);
}
