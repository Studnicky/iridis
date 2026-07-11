import { Engine } from '@studnicky/iridis';
import { coreTasks } from '@studnicky/iridis';
import { contrastPlugin } from '@studnicky/iridis-contrast';
import { imagePlugin } from '@studnicky/iridis-image';
import { roleSchemaByName } from './site/app/theme/RoleSchemaByName.ts';
import { Tokens } from './site/app/theme/Tokens.ts';
import { intakeHexHint } from './site/app/theme/IntakeHexHint.ts';
import { pinDerivedRoles } from './site/app/theme/PinDerivedRoles.ts';
import fs from 'fs';

const engine = new Engine();
for (const t of coreTasks) { engine.tasks.register(t); }
engine.tasks.register(intakeHexHint);
engine.tasks.register(pinDerivedRoles);
engine.adopt(contrastPlugin);
engine.adopt(imagePlugin);

const REQUIRED_COLOR_STAGES = [
  'intake:hexHint', 'resolve:roles', 'pin:derivedRoles', 'expand:family',
  'enforce:contrast', 'enforce:apca', 'enforce:cvdSimulate', 'derive:variant'
];
engine.pipeline(REQUIRED_COLOR_STAGES);

const SEMANTIC_HUE: Record<string, number> = { 'error': 25, 'info': 230, 'success': 160, 'warning': 60 };
const SEMANTIC_HUE_CLAMP = 90;
function withSemanticHues(schema: any) {
  return {
    ...schema,
    'roles': schema.roles.map((r: any) =>
    {return (SEMANTIC_HUE[r.name] !== undefined)
      ? { ...r, 'hue': SEMANTIC_HUE[r.name], 'hueClamp': SEMANTIC_HUE_CLAMP }
      : r;})
  };
}

function generate(framing: 'light' | 'dark'): string {
  const schema = withSemanticHues(roleSchemaByName['iridis-32'][framing]);
  const VARIANT_CONFIG = Tokens.SHADE_KEYS.map((s) => ({ 'invertLightness': false, 'lightnessTarget': {
    '100': 0.955, '200': 0.915, '300': 0.855, '400': 0.775, '50': 0.985, '500': 0.685,
    '600': 0.595, '700': 0.505, '800': 0.415, '900': 0.335, '950': 0.235
  }[s]!, 'name': `s${s}` }));
  const result = engine.run({
    'colors': ['#7c3aed', '#06b6d4', '#f59e0b', '#ec4899'],
    'contrast': { 'algorithm': 'apca', 'cvdCorrect': true, 'level': 'Lc' },
    'metadata': { 'core:variantConfig': VARIANT_CONFIG },
    'roles': schema,
    'runtime': { 'colorSpace': 'srgb', 'framing': framing }
  });

  const roleHex: Record<string, string> = {};
  for (const [name, r] of Object.entries(result.roles)) { roleHex[name] = r.hex; }
  const scaleHex: Record<string, Record<string, string>> = {};
  for (const s of Tokens.SHADE_KEYS) {
    const variant = result.variants[`s${s}`];
    if (variant === undefined) continue;
    const perShade: Record<string, string> = {};
    for (const [name, rec] of Object.entries(variant)) { perShade[name] = rec.hex; }
    scaleHex[s] = perShade;
  }

  const css = Tokens.toCssText(Tokens.mapFromEngine(roleHex, scaleHex));
  if (framing === 'dark') {
    return css.replace('html:root, html:root.dark, html:root:not(.dark)', 'html:root.dark');
  } else {
    return css.replace('html:root, html:root.dark, html:root:not(.dark)', 'html:root, html:root:not(.dark)');
  }
}

const lightCss = generate('light');
const darkCss = generate('dark');
fs.writeFileSync('./site/app/assets/css/theme-default.css', lightCss + '\n' + darkCss);
console.log('wrote theme-default.css');
