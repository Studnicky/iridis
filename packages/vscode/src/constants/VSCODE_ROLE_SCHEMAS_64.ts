import {
  ContrastPairEntity, RoleDefinitionEntity, RoleRelationshipEntity, RoleRelationshipGraphEntity, RoleSchemaEntity
} from '@studnicky/iridis';

type VscodeRoleDraft = Readonly<{
  'definition': RoleDefinitionEntity.Type;
  'relationship'?: RoleRelationshipEntity.Type;
}>;

class VscodeRoleSchemas64 {
  static readonly #tolerantRelationship = { 'alpha': 1, 'chroma': 0.5, 'hue': 5, 'lightness': 1 } as const;

  static readonly #toleranceByOperation = {
    'alias': VscodeRoleSchemas64.#tolerantRelationship,
    'hue-offset': VscodeRoleSchemas64.#tolerantRelationship,
    'oklch-delta': VscodeRoleSchemas64.#tolerantRelationship
  } as const;

  static readonly #darkFraming = {
    'accentLightnessOffset': -0.14,
    'range': VscodeRoleSchemas64.darkRange,
    'surfaceLightnessOffset': 0.06
  };

  static readonly #lightFraming = {
    'accentLightnessOffset': 0.14,
    'range': VscodeRoleSchemas64.lightRange,
    'surfaceLightnessOffset': -0.06
  };

  static readonly dark: RoleSchemaEntity.Type = VscodeRoleSchemas64.schema(
    'vscode-64-dark',
    '64-role VS Code schema for dark editor themes.',
    VscodeRoleSchemas64.#darkFraming
  );

  static readonly light: RoleSchemaEntity.Type = VscodeRoleSchemas64.schema(
    'vscode-64-light',
    '64-role VS Code schema for light editor themes.',
    VscodeRoleSchemas64.#lightFraming
  );

  static contrastPairs(): ContrastPairEntity.Type[] {
    const rawPairs = [
      { 'algorithm': 'wcag21', 'background': 'background', 'foreground': 'foreground', 'minimumContrastRatio': 7.0 },
      { 'algorithm': 'wcag21', 'background': 'background', 'foreground': 'comment', 'minimumContrastRatio': 4.5 },
      { 'algorithm': 'wcag21', 'background': 'background', 'foreground': 'muted', 'minimumContrastRatio': 4.5 },
      { 'algorithm': 'wcag21', 'background': 'background', 'foreground': 'surface', 'maximumContrastRatio': 2.0, 'minimumContrastRatio': 1.1 },
      { 'algorithm': 'wcag21', 'background': 'background', 'foreground': 'keyword', 'minimumContrastRatio': 4.5 },
      { 'algorithm': 'wcag21', 'background': 'background', 'foreground': 'accent', 'maximumContrastRatio': 4.5, 'minimumContrastRatio': 3.0 },
      { 'algorithm': 'wcag21', 'background': 'background', 'foreground': 'type', 'minimumContrastRatio': 4.5 },
      { 'algorithm': 'wcag21', 'background': 'background', 'foreground': 'function', 'minimumContrastRatio': 4.5 },
      { 'algorithm': 'wcag21', 'background': 'background', 'foreground': 'variable', 'minimumContrastRatio': 4.5 },
      { 'algorithm': 'wcag21', 'background': 'background', 'foreground': 'string', 'minimumContrastRatio': 4.5 },
      { 'algorithm': 'wcag21', 'background': 'background', 'foreground': 'number', 'minimumContrastRatio': 4.5 },
      { 'algorithm': 'wcag21', 'background': 'background', 'foreground': 'constant', 'minimumContrastRatio': 4.5 },
      { 'algorithm': 'wcag21', 'background': 'background', 'foreground': 'error', 'minimumContrastRatio': 4.5 },
      { 'algorithm': 'wcag21', 'background': 'background', 'foreground': 'warning', 'minimumContrastRatio': 4.5 },
      { 'algorithm': 'wcag21', 'background': 'background', 'foreground': 'info', 'minimumContrastRatio': 4.5 },
      { 'algorithm': 'wcag21', 'background': 'background', 'foreground': 'success', 'minimumContrastRatio': 4.5 },
      { 'algorithm': 'wcag21', 'background': 'accent', 'foreground': 'onAccent', 'minimumContrastRatio': 4.5 },
      { 'algorithm': 'wcag21', 'background': 'background', 'foreground': 'link', 'minimumContrastRatio': 4.5 },
      { 'algorithm': 'wcag21', 'background': 'chrome', 'foreground': 'chromeForeground', 'minimumContrastRatio': 4.5 }
    ];
    const result = rawPairs.map(ContrastPairEntity.create);
    return result;
  }

  static baseRoles(framing: {
    readonly 'accentLightnessOffset': number;
    readonly 'range': (dark: [number, number], light: [number, number]) => [number, number];
    readonly 'surfaceLightnessOffset': number;
  }): VscodeRoleDraft[] {
    const semanticChroma = framing.range([0.06, 0.18], [0.05, 0.16]);
    const semanticLightness = framing.range([0.60, 0.80], [0.28, 0.48]);
    const accentChroma = framing.range([0.06, 0.18], [0.05, 0.16]);
    const accentLightness = framing.range([0.62, 0.82], [0.28, 0.46]);
    const diagnosticLightness = framing.range([0.52, 0.70], [0.28, 0.46]);
    const statusLightness = framing.range([0.60, 0.78], [0.28, 0.46]);
    return [
      VscodeRoleSchemas64.role('background', 'Editor and chrome background', 'background', [0.00, 0.05], framing.range([0.06, 0.18], [0.92, 0.99]), undefined, undefined),
      VscodeRoleSchemas64.role('foreground', 'Primary text and editor foreground', 'text', [0.00, 0.04], framing.range([0.88, 0.98], [0.10, 0.24]), undefined, undefined),
      VscodeRoleSchemas64.role('surface', 'Sidebar, panels, and activity bar background', 'background', [0.00, 0.06], framing.range([0.12, 0.28], [0.76, 0.92]), 'background', undefined, { 'chromaScale': 0.9, 'lightnessOffset': framing.surfaceLightnessOffset }),
      VscodeRoleSchemas64.role('muted', 'Inactive and subdued text', 'muted', [0.00, 0.08], framing.range([0.55, 0.72], [0.35, 0.52]), 'foreground', undefined),
      VscodeRoleSchemas64.role('keyword', 'Keywords and primary interactive colour', 'accent', accentChroma, accentLightness, undefined, undefined),
      VscodeRoleSchemas64.role('type', 'Types, classes, interfaces, and structs', 'accent', semanticChroma, semanticLightness, 'keyword', 150),
      VscodeRoleSchemas64.role('function', 'Functions, methods, decorators, and events', 'accent', semanticChroma, semanticLightness, 'keyword', 45),
      VscodeRoleSchemas64.role('variable', 'Variables, parameters, and properties', 'accent', [0.04, 0.14], framing.range([0.64, 0.84], [0.24, 0.44]), 'foreground', undefined),
      VscodeRoleSchemas64.role('string', 'String literals and regular expressions', 'accent', semanticChroma, semanticLightness, 'function', 70),
      VscodeRoleSchemas64.role('number', 'Numeric literals', 'accent', semanticChroma, semanticLightness, 'string', 50),
      VscodeRoleSchemas64.role('constant', 'Constants and enum members', 'accent', semanticChroma, semanticLightness, 'number', 50),
      VscodeRoleSchemas64.role('comment', 'Comments and doc-comments', 'muted', [0.02, 0.10], framing.range([0.55, 0.72], [0.35, 0.52]), 'muted', undefined),
      VscodeRoleSchemas64.role('error', 'Error diagnostics', 'critical', [0.08, 0.20], diagnosticLightness, undefined, undefined),
      VscodeRoleSchemas64.role('warning', 'Warning diagnostics', 'muted', [0.08, 0.20], statusLightness, 'error', 50),
      VscodeRoleSchemas64.role('info', 'Info diagnostics and async hints', 'muted', [0.08, 0.20], statusLightness, 'error', 208),
      VscodeRoleSchemas64.role('success', 'Success diagnostics and added git state', 'positive', [0.08, 0.20], statusLightness, 'error', 125)
    ];
  }

  static extensionRoles(framing: {
    readonly 'accentLightnessOffset': number;
    readonly 'range': (dark: [number, number], light: [number, number]) => [number, number];
    readonly 'surfaceLightnessOffset': number;
  }): VscodeRoleDraft[] {
    const uiChroma: [number, number] = [0.04, 0.14];
    const uiLightness = framing.range([0.42, 0.62], [0.44, 0.62]);
    const surfaceLightness = framing.range([0.10, 0.30], [0.70, 0.94]);
    const textLightness = framing.range([0.56, 0.82], [0.20, 0.52]);
    return [
      VscodeRoleSchemas64.role('accent', 'Workbench accent colour', 'accent', uiChroma, uiLightness, 'keyword', 0, { 'chromaScale': 0.9, 'lightnessOffset': framing.accentLightnessOffset }),
      VscodeRoleSchemas64.role('onAccent', 'Content drawn over the accent', 'onAccent', [0.00, 0.04], framing.range([0.88, 0.98], [0.10, 0.24]), 'accent', undefined),
      VscodeRoleSchemas64.role('accentHover', 'Hovered workbench accent', 'accent', uiChroma, uiLightness, 'accent', undefined),
      VscodeRoleSchemas64.role('link', 'Text links and active text links', 'link', uiChroma, uiLightness, 'accent', undefined),
      VscodeRoleSchemas64.role('selection', 'Editor selection surfaces', 'accent', uiChroma, surfaceLightness, 'accent', undefined),
      VscodeRoleSchemas64.role('selectionList', 'Active list and focus surfaces', 'accent', uiChroma, surfaceLightness, 'selection', undefined),
      VscodeRoleSchemas64.role('buttonSecondary', 'Secondary button surface', 'button', uiChroma, surfaceLightness, 'selectionList', undefined),
      VscodeRoleSchemas64.role('findMatch', 'Find-match highlight surface', 'accent', uiChroma, surfaceLightness, 'accent', undefined),
      VscodeRoleSchemas64.role('bracketMatch', 'Matched bracket surface and border', 'accent', uiChroma, surfaceLightness, 'selection', undefined),
      VscodeRoleSchemas64.role('hover', 'Hover and line-highlight surface', 'background', [0.00, 0.06], surfaceLightness, 'background', undefined),
      VscodeRoleSchemas64.role('border', 'Workbench chrome border', 'muted', [0.00, 0.08], textLightness, 'foreground', undefined),
      VscodeRoleSchemas64.role('guide', 'Indent-guide and whitespace colour', 'muted', [0.00, 0.08], textLightness, 'border', undefined),
      VscodeRoleSchemas64.role('guideActive', 'Active indent-guide colour', 'muted', [0.00, 0.08], textLightness, 'border', undefined),
      VscodeRoleSchemas64.role('chrome', 'Active status and title bar background', 'background', [0.00, 0.06], surfaceLightness, 'background', undefined),
      VscodeRoleSchemas64.role('chromeInactive', 'Inactive chrome background', 'background', [0.00, 0.06], surfaceLightness, 'chrome', undefined),
      VscodeRoleSchemas64.role('chromeForeground', 'Chrome foreground content', 'text', [0.00, 0.08], textLightness, 'foreground', undefined),
      VscodeRoleSchemas64.role('inputBackground', 'Input background', 'background', [0.00, 0.06], surfaceLightness, 'background', undefined),
      VscodeRoleSchemas64.role('ansiBlack', 'Terminal ANSI black', 'muted', [0.00, 0.08], textLightness, 'border', undefined),
      VscodeRoleSchemas64.role('ansiRed', 'Terminal ANSI red', 'critical', [0.08, 0.20], textLightness, 'error', undefined),
      VscodeRoleSchemas64.role('ansiGreen', 'Terminal ANSI green', 'positive', [0.08, 0.20], textLightness, 'success', undefined),
      VscodeRoleSchemas64.role('ansiYellow', 'Terminal ANSI yellow', 'muted', [0.08, 0.20], textLightness, 'warning', undefined),
      VscodeRoleSchemas64.role('ansiBlue', 'Terminal ANSI blue', 'muted', [0.08, 0.20], textLightness, 'info', undefined),
      VscodeRoleSchemas64.role('ansiMagenta', 'Terminal ANSI magenta', 'accent', uiChroma, textLightness, 'type', undefined),
      VscodeRoleSchemas64.role('ansiCyan', 'Terminal ANSI cyan', 'accent', uiChroma, textLightness, 'function', undefined),
      VscodeRoleSchemas64.role('ansiWhite', 'Terminal ANSI white', 'text', [0.00, 0.04], textLightness, 'foreground', undefined),
      VscodeRoleSchemas64.role('ansiBrightBlack', 'Terminal bright ANSI black', 'muted', [0.00, 0.08], textLightness, 'muted', undefined),
      VscodeRoleSchemas64.role('ansiBrightRed', 'Terminal bright ANSI red', 'critical', [0.08, 0.20], textLightness, 'ansiRed', undefined),
      VscodeRoleSchemas64.role('ansiBrightGreen', 'Terminal bright ANSI green', 'positive', [0.08, 0.20], textLightness, 'ansiGreen', undefined),
      VscodeRoleSchemas64.role('ansiBrightYellow', 'Terminal bright ANSI yellow', 'muted', [0.08, 0.20], textLightness, 'ansiYellow', undefined),
      VscodeRoleSchemas64.role('ansiBrightBlue', 'Terminal bright ANSI blue', 'muted', [0.08, 0.20], textLightness, 'ansiBlue', undefined),
      VscodeRoleSchemas64.role('ansiBrightMagenta', 'Terminal bright ANSI magenta', 'accent', uiChroma, textLightness, 'ansiMagenta', undefined),
      VscodeRoleSchemas64.role('ansiBrightCyan', 'Terminal bright ANSI cyan', 'accent', uiChroma, textLightness, 'ansiCyan', undefined),
      VscodeRoleSchemas64.role('ansiBrightWhite', 'Terminal bright ANSI white', 'text', [0.00, 0.04], textLightness, 'ansiWhite', undefined),
      VscodeRoleSchemas64.role('gitAdded', 'Git added-resource decoration', 'positive', [0.08, 0.20], textLightness, 'success', undefined),
      VscodeRoleSchemas64.role('gitModified', 'Git modified-resource decoration', 'muted', [0.08, 0.20], textLightness, 'info', undefined),
      VscodeRoleSchemas64.role('gitDeleted', 'Git deleted-resource decoration', 'critical', [0.08, 0.20], textLightness, 'error', undefined),
      VscodeRoleSchemas64.role('gitUntracked', 'Git untracked-resource decoration', 'muted', [0.08, 0.20], textLightness, 'warning', undefined),
      VscodeRoleSchemas64.role('gitConflicting', 'Git conflicting-resource decoration', 'muted', [0.08, 0.20], textLightness, 'warning', undefined),
      VscodeRoleSchemas64.role('diffInserted', 'Inserted diff surface', 'positive', [0.08, 0.20], surfaceLightness, 'success', undefined),
      VscodeRoleSchemas64.role('diffRemoved', 'Removed diff surface', 'critical', [0.08, 0.20], surfaceLightness, 'error', undefined),
      VscodeRoleSchemas64.role('bracketLevel1', 'First bracket-highlight level', 'accent', uiChroma, textLightness, 'keyword', undefined),
      VscodeRoleSchemas64.role('bracketLevel2', 'Second bracket-highlight level', 'accent', uiChroma, textLightness, 'type', undefined),
      VscodeRoleSchemas64.role('bracketLevel3', 'Third bracket-highlight level', 'accent', uiChroma, textLightness, 'function', undefined),
      VscodeRoleSchemas64.role('bracketLevel4', 'Fourth bracket-highlight level', 'accent', uiChroma, textLightness, 'string', undefined),
      VscodeRoleSchemas64.role('bracketLevel5', 'Fifth bracket-highlight level', 'accent', uiChroma, textLightness, 'number', undefined),
      VscodeRoleSchemas64.role('bracketLevel6', 'Sixth bracket-highlight level', 'accent', uiChroma, textLightness, 'constant', undefined),
      VscodeRoleSchemas64.role('widgetBackground', 'Editor widget background', 'background', [0.00, 0.06], surfaceLightness, 'background', undefined),
      VscodeRoleSchemas64.role('widgetBorder', 'Editor widget border', 'muted', [0.00, 0.08], textLightness, 'border', undefined)
    ];
  }

  static darkRange(dark: [number, number], _light: [number, number]): [number, number] {
    return dark;
  }

  static lightRange(_dark: [number, number], light: [number, number]): [number, number] {
    return light;
  }

  static role(
    name: string,
    description: string,
    classification: string,
    chromaRange: [number, number],
    lightnessRange: [number, number],
    ...relationshipInput: readonly [string | undefined, number | undefined, { readonly 'chromaScale'?: number; readonly 'lightnessOffset'?: number }?]
  ): VscodeRoleDraft {
    const [sourceRole, degrees, options = {}] = relationshipInput;
    const definition = RoleDefinitionEntity.create({
      'chromaRange': chromaRange,
      'description': description,
      ...(classification.length === 0 ? {} : { 'intent': classification }),
      'lightnessRange': lightnessRange,
      'name': name,
      'required': true
    });
    const relationship = VscodeRoleSchemas64.relationship(name, {
      ...(sourceRole === undefined ? {} : { 'source': sourceRole }),
      ...(degrees === undefined ? {} : { 'degrees': degrees }),
      ...(options.chromaScale === undefined ? {} : { 'chromaScale': options.chromaScale }),
      ...(options.lightnessOffset === undefined ? {} : { 'lightnessOffset': options.lightnessOffset })
    });
    const result = relationship === undefined ? { 'definition': definition } : { 'definition': definition, 'relationship': relationship };
    return result;
  }

  private static schema(
    name: string,
    description: string,
    framing: {
      readonly 'accentLightnessOffset': number;
      readonly 'range': (dark: [number, number], light: [number, number]) => [number, number];
      readonly 'surfaceLightnessOffset': number;
    }
  ): RoleSchemaEntity.Type {
    const drafts = [...VscodeRoleSchemas64.baseRoles(framing), ...VscodeRoleSchemas64.extensionRoles(framing)];
    const roles: RoleDefinitionEntity.Type[] = [];
    const relationships: RoleRelationshipEntity.Type[] = [];
    for (let index = 0; index < drafts.length; index += 1) {
      const draft = drafts[index];
      if (draft === undefined) {
        continue;
      }
      roles.push(draft.definition);
      if (draft.relationship !== undefined) {
        relationships.push(draft.relationship);
      }
    }
    const result = RoleSchemaEntity.create({
      'contrastPairs': VscodeRoleSchemas64.contrastPairs(),
      'description': description,
      'name': name,
      'relationshipGraph': RoleRelationshipGraphEntity.create({
        'groups': [{
          'anchor': 'background',
          'defaultMode': 'default',
          'id': 'vscode-derived-roles',
          'modes': [{ 'hueOffsets': [{ 'degrees': 0, 'variantId': 'default' }], 'id': 'default' }],
          'name': 'VS Code derived roles',
          'relationships': relationships
        }]
      }),
      'roles': roles
    });
    return result;
  }


  private static relationship(
    target: string,
    options: Readonly<{
      'chromaScale'?: number;
      'degrees'?: number;
      'lightnessOffset'?: number;
      'source'?: string;
    }>
  ): RoleRelationshipEntity.Type | undefined {
    const source = options.source;
    if (source === undefined) {
      return undefined;
    }
    const identifier = [source, 'to', target].join('-');
    const shared = { 'id': identifier, 'priority': 0, 'relaxability': 'tolerant' as const, 'source': source, 'target': target };
    if (options.chromaScale !== undefined || options.lightnessOffset !== undefined) {
      const result = RoleRelationshipEntity.create({
        ...shared,
        ...(options.degrees === undefined ? {} : { 'hueOffset': options.degrees }),
        ...(options.chromaScale === undefined ? {} : { 'chromaScale': options.chromaScale }),
        ...(options.lightnessOffset === undefined ? {} : { 'lightnessOffset': options.lightnessOffset }),
        'operation': 'oklch-delta',
        'tolerance': VscodeRoleSchemas64.#toleranceByOperation['oklch-delta']
      });
      return result;
    }
    if (options.degrees === undefined) {
      const result = RoleRelationshipEntity.create({ ...shared, 'operation': 'alias', 'tolerance': VscodeRoleSchemas64.#toleranceByOperation.alias });
      return result;
    }
    const result = RoleRelationshipEntity.create({ ...shared, 'degrees': options.degrees, 'operation': 'hue-offset', 'tolerance': VscodeRoleSchemas64.#toleranceByOperation['hue-offset'] });
    return result;
  }

}

export const VSCODE_ROLE_SCHEMAS_64 = VscodeRoleSchemas64;
