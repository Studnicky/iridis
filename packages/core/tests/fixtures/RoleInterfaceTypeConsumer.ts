import type { ColorHintsInterfaceType } from '../../src/types/color.ts';
import type { TaskManifestInterfaceType } from '../../src/types/pipeline.ts';
import type { PluginSchemaContributionInterfaceType } from '../../src/types/plugin.ts';
import type {
  ContrastPairInterfaceType,
  RoleDefinitionInterfaceType
} from '../../src/types/role.ts';
import type { ContrastOptionsInterfaceType } from '../../src/types/state.ts';

export const roleInterfaceTypeConsumer = {
  'colorHints': {
    'intent': undefined,
    'role':   undefined,
    'weight': undefined
  } satisfies ColorHintsInterfaceType,
  'contrastOptions': {
    'algorithm':  undefined,
    'cvdCorrect': undefined,
    'extra':      undefined,
    'level':      undefined
  } satisfies ContrastOptionsInterfaceType,
  'pair': {
    'algorithm':  undefined,
    'background': 'surface',
    'foreground': 'text',
    'minRatio':   4.5
  } satisfies ContrastPairInterfaceType,
  'pluginSchema': {
    'metadata': undefined,
    'outputs':  undefined
  } satisfies PluginSchemaContributionInterfaceType,
  'role': {
    'chromaRange':    undefined,
    'derivedFrom':    undefined,
    'description':    undefined,
    'hue':            undefined,
    'hueClamp':       undefined,
    'hueOffset':      undefined,
    'intent':         undefined,
    'lightnessRange': undefined,
    'name':           'surface',
    'required':       undefined
  } satisfies RoleDefinitionInterfaceType,
  'taskManifest': {
    'description': undefined,
    'name':        'emit:test',
    'phase':       undefined,
    'reads':       undefined,
    'requires':    undefined,
    'writes':      undefined
  } satisfies TaskManifestInterfaceType
};
