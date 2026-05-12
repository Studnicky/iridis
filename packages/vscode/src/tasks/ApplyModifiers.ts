import type {
  PaletteStateInterface,
  PipelineContextInterface,
  TaskInterface,
  TaskManifestInterface,
} from '@studnicky/iridis';
import {
  colorRecordFactory,
  darken,
  desaturate,
  ensureContrast,
  lighten,
  mixHsl,
  saturate,
} from '@studnicky/iridis';
import { MODIFIER_TRANSFORMS } from '../data/modifierTransforms.ts';
import { TOKEN_MODIFIERS, TOKEN_TYPES } from '../data/derivationParams.ts';

/** Shape of an individual semantic token rule entry. */
interface SemanticRuleEntryInterface {
  'foreground': string;
  'fontStyle'?: string;
}

interface VscodeMetaInterface {
  'baseTokens'?: Record<string, string>;
  'semanticTokenRules'?: Record<string, SemanticRuleEntryInterface>;
}

function getVscodeMeta(state: PaletteStateInterface): VscodeMetaInterface {
  const existing = state.metadata['vscode'];
  if (existing !== null && typeof existing === 'object') {
    return existing as VscodeMetaInterface;
  }
  const meta: VscodeMetaInterface = {};
  state.metadata['vscode'] = meta;
  return meta;
}

function roleHex(state: PaletteStateInterface, role: string): string | undefined {
  return state.roles[role]?.hex;
}

export class ApplyModifiers implements TaskInterface {
  readonly 'name' = 'vscode:applyModifiers';

  readonly 'manifest': TaskManifestInterface = {
    'name':        'vscode:applyModifiers',
    'reads':       ['metadata.vscode.baseTokens', 'roles'],
    'writes':      ['metadata.vscode.semanticTokenRules'],
    'requires':    ['vscode:expandTokens'],
    'description': 'Produces base + per-modifier semantic token rules from MODIFIER_TRANSFORMS, ensuring each rule meets contrast against the background role.',
  };

  run(state: PaletteStateInterface, ctx: PipelineContextInterface): void {
    const meta = getVscodeMeta(state);
    const baseTokens = meta['baseTokens'];

    if (!baseTokens) {
      throw new Error('ApplyModifiers: metadata.vscode.baseTokens not found — run vscode:expandTokens first');
    }

    const bg = roleHex(state, 'background') ?? '#000000';
    const bgRecord = colorRecordFactory.fromHex(bg);
    const rules: Record<string, SemanticRuleEntryInterface> = {};

    const typesLen = TOKEN_TYPES.length;

    // 23 base rules
    for (let i = 0; i < typesLen; i++) {
      const tokenType = TOKEN_TYPES[i];
      if (!tokenType) continue;
      const foreground = baseTokens[tokenType];
      if (!foreground) continue;
      rules[tokenType] = { foreground };
    }

    // 23 token types × N modifiers from TOKEN_MODIFIERS (the VS Code spec set).
    const modifiersLen = TOKEN_MODIFIERS.length;

    for (let i = 0; i < typesLen; i++) {
      const tokenType = TOKEN_TYPES[i];
      if (!tokenType) continue;
      const baseColor = baseTokens[tokenType];
      if (!baseColor) continue;

      for (let j = 0; j < modifiersLen; j++) {
        const modifier = TOKEN_MODIFIERS[j];
        if (!modifier) continue;

        const transform = MODIFIER_TRANSFORMS[modifier];
        if (!transform) continue;

        let color = colorRecordFactory.fromHex(baseColor);

        if (transform.lightness) {
          if (transform.lightness > 0) {
            color = lighten.apply(color, transform.lightness);
          } else {
            color = darken.apply(color, -transform.lightness);
          }
        }

        if (transform.saturation) {
          if (transform.saturation > 0) {
            color = saturate.apply(color, transform.saturation);
          } else {
            color = desaturate.apply(color, -transform.saturation);
          }
        }

        if (transform.mixWith && transform.mixWeight) {
          const mixHex = roleHex(state, transform.mixWith);
          if (mixHex) {
            color = mixHsl.apply(color, colorRecordFactory.fromHex(mixHex), transform.mixWeight);
          }
        }

        color = ensureContrast.apply(color, bgRecord, 4.5);

        const selector = `${tokenType}.${modifier}`;
        const entry: SemanticRuleEntryInterface = { 'foreground': color.hex };
        if (transform.fontStyle) {
          entry['fontStyle'] = transform.fontStyle;
        }
        rules[selector] = entry;
      }
    }

    meta['semanticTokenRules'] = rules;
    ctx.logger.debug(
      'ApplyModifiers',
      'run',
      `Generated ${Object.keys(rules).length} semantic token rules`,
    );
  }
}

export const applyModifiers = new ApplyModifiers();
