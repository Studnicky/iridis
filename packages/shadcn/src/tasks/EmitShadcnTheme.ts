import type {
  ColorRecordEntity,
  PaletteStateInterface,
  PipelineContextInterface,
  TaskInterface
} from '@studnicky/iridis';

import { TaskManifestEntity } from '@studnicky/iridis';
import { LOG_STATUS, LogBody } from '@studnicky/logger/node';

import { ShadcnOutputEntity } from '../entities/ShadcnOutputEntity.ts';

const VAR_ROLE_CANDIDATES = [
  { 'candidates': ['accent-alt', 'brand'], 'name': '--accent' },
  { 'candidates': ['text'], 'name': '--accent-foreground' },
  { 'candidates': ['background'], 'name': '--background' },
  { 'candidates': ['border', 'divider', 'muted'], 'name': '--border' },
  { 'candidates': ['surface', 'background'], 'name': '--card' },
  { 'candidates': ['text'], 'name': '--card-foreground' },
  { 'candidates': ['error'], 'name': '--destructive' },
  { 'candidates': ['text'], 'name': '--destructive-foreground' },
  { 'candidates': ['text'], 'name': '--foreground' },
  { 'candidates': ['border', 'divider', 'muted'], 'name': '--input' },
  { 'candidates': ['bg-soft', 'background'], 'name': '--muted' },
  { 'candidates': ['text-subtle', 'muted', 'text'], 'name': '--muted-foreground' },
  { 'candidates': ['surface', 'background'], 'name': '--popover' },
  { 'candidates': ['text'], 'name': '--popover-foreground' },
  { 'candidates': ['brand'], 'name': '--primary' },
  { 'candidates': ['on-brand', 'text'], 'name': '--primary-foreground' },
  { 'candidates': ['focus-ring', 'brand'], 'name': '--ring' },
  { 'candidates': ['accent-alt', 'brand'], 'name': '--secondary' },
  { 'candidates': ['text'], 'name': '--secondary-foreground' }
] as const;

class RoleResolver {
  static resolve(
    roles: ReadonlyMap<string, ColorRecordEntity.Type>,
    candidates: readonly string[]
  ): ColorRecordEntity.Type | undefined {
    for (let candidateIndex = 0; candidateIndex < candidates.length; candidateIndex += 1) {
      const candidate = candidates[candidateIndex];
      if (candidate === undefined) {continue;}
      const record = roles.get(candidate);
      if (record !== undefined) {return record;}
    }
    return undefined;
  }
}

class OklchTriple {
  static format(oklch: ColorRecordEntity.Type['oklch']): string {
    const l = oklch.l.toFixed(4);
    const c = oklch.c.toFixed(4);
    const h = oklch.h.toFixed(2);
    return `${l} ${c} ${h}`;
  }
}

class ShadcnColors {
  static primary(colors: ReadonlyMap<string, string>): Record<string, string> {
    const accent = colors.get('--accent');
    const accentForeground = colors.get('--accent-foreground');
    const background = colors.get('--background');
    const border = colors.get('--border');
    const card = colors.get('--card');
    const cardForeground = colors.get('--card-foreground');
    const destructive = colors.get('--destructive');
    const destructiveForeground = colors.get('--destructive-foreground');
    const foreground = colors.get('--foreground');
    const input = colors.get('--input');
    return {
      ...(accent === undefined ? {} : { '--accent': accent }),
      ...(accentForeground === undefined ? {} : { '--accent-foreground': accentForeground }),
      ...(background === undefined ? {} : { '--background': background }),
      ...(border === undefined ? {} : { '--border': border }),
      ...(card === undefined ? {} : { '--card': card }),
      ...(cardForeground === undefined ? {} : { '--card-foreground': cardForeground }),
      ...(destructive === undefined ? {} : { '--destructive': destructive }),
      ...(destructiveForeground === undefined ? {} : { '--destructive-foreground': destructiveForeground }),
      ...(foreground === undefined ? {} : { '--foreground': foreground }),
      ...(input === undefined ? {} : { '--input': input })
    };
  }

  static secondary(colors: ReadonlyMap<string, string>): Record<string, string> {
    const muted = colors.get('--muted');
    const mutedForeground = colors.get('--muted-foreground');
    const popover = colors.get('--popover');
    const popoverForeground = colors.get('--popover-foreground');
    const primary = colors.get('--primary');
    const primaryForeground = colors.get('--primary-foreground');
    const ring = colors.get('--ring');
    const secondary = colors.get('--secondary');
    const secondaryForeground = colors.get('--secondary-foreground');
    return {
      ...(muted === undefined ? {} : { '--muted': muted }),
      ...(mutedForeground === undefined ? {} : { '--muted-foreground': mutedForeground }),
      ...(popover === undefined ? {} : { '--popover': popover }),
      ...(popoverForeground === undefined ? {} : { '--popover-foreground': popoverForeground }),
      ...(primary === undefined ? {} : { '--primary': primary }),
      ...(primaryForeground === undefined ? {} : { '--primary-foreground': primaryForeground }),
      ...(ring === undefined ? {} : { '--ring': ring }),
      ...(secondary === undefined ? {} : { '--secondary': secondary }),
      ...(secondaryForeground === undefined ? {} : { '--secondary-foreground': secondaryForeground })
    };
  }

  static record(colors: ReadonlyMap<string, string>): Record<string, string> {
    const primary = ShadcnColors.primary(colors);
    const secondary = ShadcnColors.secondary(colors);
    return { ...primary, ...secondary };
  }
}

class ShadcnTheme {
  static build(roles: Record<string, ColorRecordEntity.Type>): ShadcnOutputEntity.Type {
    const roleMap = new Map(Object.entries(roles));
    const colors = new Map<string, string>();
    const declarations: string[] = [];
    for (let candidateIndex = 0; candidateIndex < VAR_ROLE_CANDIDATES.length; candidateIndex += 1) {
      const candidate = VAR_ROLE_CANDIDATES[candidateIndex];
      if (candidate === undefined) {continue;}
      const record = RoleResolver.resolve(roleMap, candidate.candidates);
      if (record === undefined) {continue;}
      colors.set(candidate.name, record.hex);
      declarations.push(`  ${candidate.name}: ${OklchTriple.format(record.oklch)};`);
    }
    const cssVars = `:root {\n${declarations.join('\n')}\n}`;
    const output = ShadcnOutputEntity.create({
      'colors': ShadcnColors.record(colors),
      'cssVars': cssVars
    });
    return output;
  }
}

/** Emit a shadcn/ui-compatible CSS custom-property theme from resolved roles. */
export class EmitShadcnTheme implements TaskInterface {
  readonly 'name' = 'emit:shadcnTheme';

  readonly 'manifest' = TaskManifestEntity.create({
    'description': 'Emit a shadcn/ui-compatible CSS custom-property theme (OKLCH, Tailwind v4 convention) from resolved roles',
    'name':        'emit:shadcnTheme',
    'reads':       ['roles'],
    'writes':      ['outputs.shadcn:theme']
  });

  run(state: PaletteStateInterface, context: PipelineContextInterface): void {
    const output = ShadcnTheme.build(state.roles);
    state.outputs['shadcn:theme'] = output;
    context.logger.debug(LogBody.create({
      'component': 'EmitShadcnTheme',
      'context': { 'variables': Object.keys(output.colors).length },
      'message': 'Emitted shadcn/ui theme',
      'operation': 'run',
      'status': LOG_STATUS.SUCCESS
    }));
  }
}
