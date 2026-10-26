import type {
  ColorRecordEntity,
  PaletteStateInterface,
  PipelineContextInterface,
  RoleProvenanceEntity,
  TaskInterface
} from '@studnicky/iridis';

import { ModuleError } from '@studnicky/errors/node';
import {
  contrastText,
  darken,
  ensureContrast,
  FramingSurface,
  lighten,
  Metadata,
  mixHsl,
  TaskManifestEntity
} from '@studnicky/iridis';
import { LOG_STATUS, LogBody } from '@studnicky/logger/node';

class Role {
  static get(roles: Readonly<Record<string, ColorRecordEntity.Type>>, name: string): ColorRecordEntity.Type {
    const record = roles[name];
    if (record === undefined) {
      throw ModuleError.create(`DeriveVscodeUiRoles: role '${name}' not found in state.roles`, {
        'context':  { 'role': name, 'task': 'DeriveVscodeUiRoles' },
        'scenario': 'NOT_FOUND'
      });
    }
    return record;
  }

  static assign(
    roles: Record<string, ColorRecordEntity.Type>,
    provenance: ReadonlyMap<string, RoleProvenanceEntity.Type>,
    name: string,
    record: ColorRecordEntity.Type
  ): void {
    if (provenance.get(name)?.origin !== 'stated') {
      Object.defineProperty(roles, name, { 'configurable': true, 'enumerable': true, 'value': record, 'writable': true });
    }
  }
}

class DeriveVscodeUiRoles implements TaskInterface {
  readonly 'name' = 'vscode:deriveUiRoles';

  readonly 'manifest' = TaskManifestEntity.create({
    'description': 'Derives the 48 VS Code UI extension roles from resolved base roles while preserving caller-stated role values.',
    'name':        'vscode:deriveUiRoles',
    'reads':       ['roles', 'metadata.core:roleProvenance'],
    'requires':    ['derive:roleRelations'],
    'writes':      ['roles']
  });

  run(state: PaletteStateInterface, context: PipelineContextInterface): void {
    const roles = state.roles;
    const provenance = Metadata.roleProvenance(state.metadata);
    const background = Role.get(roles, 'background');
    const foreground = Role.get(roles, 'foreground');
    const muted = Role.get(roles, 'muted');
    const keyword = Role.get(roles, 'keyword');
    const type = Role.get(roles, 'type');
    const functionRole = Role.get(roles, 'function');
    const string = Role.get(roles, 'string');
    const number = Role.get(roles, 'number');
    const constant = Role.get(roles, 'constant');
    const error = Role.get(roles, 'error');
    const warning = Role.get(roles, 'warning');
    const info = Role.get(roles, 'info');
    const success = Role.get(roles, 'success');
    const isLight = FramingSurface.isLight(roles);

    roles.accent ??= ensureContrast.apply(keyword, background, 3, { 'maximumRatio': 4.5 });
    const accent = Role.get(roles, 'accent');

    const selection = mixHsl.apply(background, accent, isLight ? 0.18 : 0.25);
    const selectionList = mixHsl.apply(background, accent, isLight ? 0.28 : 0.35);
    const border = mixHsl.apply(background, foreground, isLight ? 0.14 : 0.12);

    Role.assign(roles, provenance, 'onAccent', contrastText.apply(accent));
    Role.assign(roles, provenance, 'accentHover', lighten.apply(accent, 0.1));
    Role.assign(roles, provenance, 'link', accent);
    Role.assign(roles, provenance, 'selection', selection);
    Role.assign(roles, provenance, 'selectionList', selectionList);
    Role.assign(roles, provenance, 'buttonSecondary', selectionList);
    Role.assign(roles, provenance, 'findMatch', accent);
    Role.assign(roles, provenance, 'bracketMatch', selection);
    Role.assign(roles, provenance, 'hover', mixHsl.apply(background, foreground, isLight ? 0.06 : 0.08));
    Role.assign(roles, provenance, 'border', border);
    Role.assign(roles, provenance, 'guide', border);
    Role.assign(roles, provenance, 'guideActive', mixHsl.apply(background, foreground, 0.2));
    Role.assign(roles, provenance, 'chrome', isLight ? mixHsl.apply(background, foreground, 0.06) : darken.apply(background, 0.2));
    Role.assign(roles, provenance, 'chromeInactive', isLight ? mixHsl.apply(background, foreground, 0.04) : darken.apply(background, 0.15));
    Role.assign(roles, provenance, 'chromeForeground', mixHsl.apply(foreground, muted, 0.3));
    Role.assign(roles, provenance, 'inputBackground', isLight ? mixHsl.apply(background, foreground, 0.04) : darken.apply(background, 0.1));

    Role.assign(roles, provenance, 'ansiBlack', border);
    Role.assign(roles, provenance, 'ansiRed', error);
    Role.assign(roles, provenance, 'ansiGreen', success);
    Role.assign(roles, provenance, 'ansiYellow', warning);
    Role.assign(roles, provenance, 'ansiBlue', info);
    Role.assign(roles, provenance, 'ansiMagenta', type);
    Role.assign(roles, provenance, 'ansiCyan', functionRole);
    Role.assign(roles, provenance, 'ansiWhite', foreground);
    Role.assign(roles, provenance, 'ansiBrightBlack', muted);
    Role.assign(roles, provenance, 'ansiBrightRed', lighten.apply(Role.get(roles, 'ansiRed'), 0.15));
    Role.assign(roles, provenance, 'ansiBrightGreen', lighten.apply(Role.get(roles, 'ansiGreen'), 0.15));
    Role.assign(roles, provenance, 'ansiBrightYellow', lighten.apply(Role.get(roles, 'ansiYellow'), 0.15));
    Role.assign(roles, provenance, 'ansiBrightBlue', lighten.apply(Role.get(roles, 'ansiBlue'), 0.15));
    Role.assign(roles, provenance, 'ansiBrightMagenta', lighten.apply(Role.get(roles, 'ansiMagenta'), 0.15));
    Role.assign(roles, provenance, 'ansiBrightCyan', lighten.apply(Role.get(roles, 'ansiCyan'), 0.15));
    Role.assign(roles, provenance, 'ansiBrightWhite', lighten.apply(Role.get(roles, 'ansiWhite'), 0.15));

    Role.assign(roles, provenance, 'gitAdded', success);
    Role.assign(roles, provenance, 'gitModified', info);
    Role.assign(roles, provenance, 'gitDeleted', error);
    Role.assign(roles, provenance, 'gitUntracked', warning);
    Role.assign(roles, provenance, 'gitConflicting', warning);
    Role.assign(roles, provenance, 'diffInserted', success);
    Role.assign(roles, provenance, 'diffRemoved', error);
    Role.assign(roles, provenance, 'bracketLevel1', keyword);
    Role.assign(roles, provenance, 'bracketLevel2', type);
    Role.assign(roles, provenance, 'bracketLevel3', functionRole);
    Role.assign(roles, provenance, 'bracketLevel4', string);
    Role.assign(roles, provenance, 'bracketLevel5', number);
    Role.assign(roles, provenance, 'bracketLevel6', constant);
    Role.assign(roles, provenance, 'widgetBackground', mixHsl.apply(background, foreground, 0.05));
    Role.assign(roles, provenance, 'widgetBorder', border);

    context.logger.debug(
      LogBody.create({
        'component': 'DeriveVscodeUiRoles',
        'context': { 'count': 48 },
        'message': 'Derived VS Code UI extension roles',
        'operation': 'run',
        'status': LOG_STATUS.SUCCESS
      })
    );
  }
}

export const deriveVscodeUiRoles = new DeriveVscodeUiRoles();
