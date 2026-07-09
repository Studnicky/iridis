import type {
  ColorRecordInterfaceType,
  PaletteStateInterface,
  PipelineContextInterface,
  TaskInterface,
  TaskManifestInterfaceType
} from '@studnicky/iridis';

import { LogBody } from '@studnicky/logger/builders';
import { LOG_STATUS } from '@studnicky/logger/constants';

import type { ShadcnOutputInterfaceType } from '../types/index.ts';

/**
 * shadcn/ui (Tailwind v4 convention) variable → resolved-role candidate
 * chain. Each variable takes the first role present in its chain; the
 * fallback ordering follows the same defensive pattern used by the
 * site's `Tokens.ts` `ALIAS_SOURCE` map and by `EmitTailwindTheme` for
 * roles that may not exist in every palette.
 */
const VAR_ROLE_CANDIDATES: Record<string, readonly string[]> = {
  '--accent':                 ['accent-alt', 'brand'],
  '--accent-foreground':      ['text'],
  '--background':             ['background'],
  '--border':                 ['border', 'divider', 'muted'],
  '--card':                   ['surface', 'background'],
  '--card-foreground':        ['text'],
  '--destructive':            ['error'],
  '--destructive-foreground': ['text'],
  '--foreground':             ['text'],
  '--input':                  ['border', 'divider', 'muted'],
  '--muted':                  ['bg-soft', 'background'],
  '--muted-foreground':       ['text-subtle', 'muted', 'text'],
  '--popover':                ['surface', 'background'],
  '--popover-foreground':     ['text'],
  '--primary':                ['brand'],
  '--primary-foreground':     ['on-brand', 'text'],
  '--ring':                   ['focus-ring', 'brand'],
  '--secondary':              ['accent-alt', 'brand'],
  '--secondary-foreground':   ['text']
};

/**
 * Resolves the first present role in a candidate chain, or `undefined`
 * when none of the chain's roles exist in the resolved palette.
 */
class RoleResolver {
  static resolve(
    roles:      Record<string, ColorRecordInterfaceType>,
    candidates: readonly string[]
  ): ColorRecordInterfaceType | undefined {
    for (const role of candidates) {
      const record = roles[role];
      if (record !== undefined) {return record;}
    }
    return undefined;
  }
}

/**
 * Formats an OKLCH triple as shadcn's Tailwind v4 `:root` convention:
 * a bare space-separated `L C H` triple (no `oklch(...)` wrapper, no
 * unit on hue) since shadcn's own utilities wrap the variable at the
 * usage site via `oklch(var(--x))`.
 */
class OklchTriple {
  static format(oklch: ColorRecordInterfaceType['oklch']): string {
    const l = oklch.l.toFixed(4);
    const c = oklch.c.toFixed(4);
    const h = oklch.h.toFixed(2);
    return `${l} ${c} ${h}`;
  }
}

/**
 * Builds the shadcn/ui `:root` CSS custom-property block and the
 * companion flat hex color map, skipping any variable whose entire
 * candidate chain is absent from the resolved palette rather than
 * throwing.
 */
class ShadcnTheme {
  static build(roles: Record<string, ColorRecordInterfaceType>): ShadcnOutputInterfaceType {
    const colors: Record<string, string> = {};
    const decls:  string[]               = [];

    for (const [varName, candidates] of Object.entries(VAR_ROLE_CANDIDATES)) {
      const record = RoleResolver.resolve(roles, candidates);
      if (record === undefined) {continue;}

      colors[varName] = record.hex;
      decls.push(`  ${varName}: ${OklchTriple.format(record.oklch)};`);
    }

    const cssVars = `:root {\n${decls.join('\n')}\n}`;

    return { colors, cssVars };
  }
}

/**
 * Emit a shadcn/ui-compatible CSS custom-property theme (OKLCH, Tailwind
 * v4 convention) from resolved roles. Registered as the
 * `emit:shadcnTheme` pipeline task.
 */
export class EmitShadcnTheme implements TaskInterface {
  readonly 'name' = 'emit:shadcnTheme';

  readonly 'manifest': TaskManifestInterfaceType = {
    'description': 'Emit a shadcn/ui-compatible CSS custom-property theme (OKLCH, Tailwind v4 convention) from resolved roles',
    'name':        'emit:shadcnTheme',
    'reads':       ['roles'],
    'writes':      ['outputs.shadcn:theme']
  };

  run(state: PaletteStateInterface, ctx: PipelineContextInterface): void {
    const output = ShadcnTheme.build(state.roles);

    state.outputs['shadcn:theme'] = output;

    ctx.logger.debug(
      LogBody.create()
        .component('EmitShadcnTheme')
        .operation('run')
        .status(LOG_STATUS.SUCCESS)
        .message('Emitted shadcn/ui theme')
        .context({ 'variables': Object.keys(output.colors).length })
        .build()
    );
  }
}
