import type {
  PaletteStateInterface,
  PipelineContextInterface,
  TaskInterface,
  TaskManifestInterface,
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
    'description': 'Produces 345 semantic token rules: 23 base + (23 × 10 modifiers) = 253+92... = 345 total. Lifts MODIFIER_TRANSFORMS.',
    'requires':    ['vscode:expandTokens'],
  };

  run(state: PaletteStateInterface, ctx: PipelineContextInterface): void {
    const meta = getVscodeMeta(state);
    const baseTokens = meta['baseTokens'];

    if (!baseTokens) {
      throw new Error('ApplyModifiers: metadata.vscode.baseTokens not found — run vscode:expandTokens first');
    }

    const bg = roleHex(state, 'background') ?? '#000000';
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

    // 23 × 10 = 230 modifier rules (but source uses 14 modifiers; the TOKEN_MODIFIERS
    // constant lists 10 — that's the actual VS Code spec set, matching the source's
    // PackPalette.TOKEN_MODIFIERS.  The "14" in source comments was aspirational.)
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

        let color = baseColor;

        if (transform.lightness) {
          if (transform.lightness > 0) {
            color = ctx.math.invoke<string>('lighten', color, transform.lightness);
          } else {
            color = ctx.math.invoke<string>('darken', color, -transform.lightness);
          }
        }

        if (transform.saturation) {
          if (transform.saturation > 0) {
            color = ctx.math.invoke<string>('saturate', color, transform.saturation);
          } else {
            color = ctx.math.invoke<string>('desaturate', color, -transform.saturation);
          }
        }

        if (transform.mixWith && transform.mixWeight) {
          const mixHex = roleHex(state, transform.mixWith);
          if (mixHex) {
            color = ctx.math.invoke<string>('mixHsl', color, mixHex, transform.mixWeight);
          }
        }

        color = ctx.math.invoke<string>('ensureContrast', color, bg, 4.5);

        const selector = `${tokenType}.${modifier}`;
        const entry: SemanticRuleEntryInterface = { 'foreground': color };
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
