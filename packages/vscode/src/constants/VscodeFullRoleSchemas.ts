import {
  ContrastPairEntity,
  RoleDefinitionEntity,
  RoleRelationshipEntity,
  RoleRelationshipGraphEntity,
  RoleSchemaEntity
} from '@studnicky/iridis';

type VscodeRoleDraft = Readonly<{
  'definition': RoleDefinitionEntity.Type;
  'relationship'?: RoleRelationshipEntity.Type;
}>;

class VscodeFullRoleSchemas {
  static readonly #tolerantRelationship = {
    'alpha': 1,
    'chroma': 0.5,
    'hue': 5,
    'lightness': 1
  } as const;

  static readonly #toleranceByOperation = {
    'alias': VscodeFullRoleSchemas.#tolerantRelationship,
    'hue-offset': VscodeFullRoleSchemas.#tolerantRelationship,
    'oklch-delta': VscodeFullRoleSchemas.#tolerantRelationship,
    'oklch-interpolate': VscodeFullRoleSchemas.#tolerantRelationship
  } as const;

  static readonly #darkFraming = {
    'accentLightnessOffset': -0.14,
    'range': VscodeFullRoleSchemas.darkRange,
    'surfaceLightnessOffset': 0.06
  };

  static readonly #lightFraming = {
    'accentLightnessOffset': 0.14,
    'range': VscodeFullRoleSchemas.lightRange,
    'surfaceLightnessOffset': -0.06
  };

  static readonly dark: RoleSchemaEntity.Type = VscodeFullRoleSchemas.schema(
    'vscode-full-dark',
    'Full VS Code schema for dark editor themes.',
    VscodeFullRoleSchemas.#darkFraming
  );

  static readonly light: RoleSchemaEntity.Type = VscodeFullRoleSchemas.schema(
    'vscode-full-light',
    'Full VS Code schema for light editor themes.',
    VscodeFullRoleSchemas.#lightFraming
  );

  static contrastPairs(): ContrastPairEntity.Type[] {
    const rawPairs = [
      {
        'algorithm': 'wcag21',
        'background': 'background',
        'contrastClass': 'text',
        'foreground': 'foreground',
        'minimumContrastRatio': 7.0
      },
      {
        'algorithm': 'wcag21',
        'background': 'background',
        'contrastClass': 'text',
        'foreground': 'comment',
        'minimumContrastRatio': 4.5
      },
      {
        'algorithm': 'wcag21',
        'background': 'background',
        'contrastClass': 'text',
        'foreground': 'muted',
        'minimumContrastRatio': 4.5
      },
      {
        'algorithm': 'wcag21',
        'background': 'background',
        'contrastClass': 'non-text',
        'foreground': 'surface',
        'maximumContrastRatio': 2.0,
        'minimumContrastRatio': 1.1
      },
      {
        'algorithm': 'wcag21',
        'background': 'background',
        'contrastClass': 'text',
        'foreground': 'keyword',
        'minimumContrastRatio': 4.5
      },
      {
        'algorithm': 'wcag21',
        'background': 'background',
        'contrastClass': 'non-text',
        'foreground': 'accent',
        'maximumContrastRatio': 4.5,
        'minimumContrastRatio': 3.0
      },
      {
        'algorithm': 'wcag21',
        'background': 'background',
        'contrastClass': 'text',
        'foreground': 'type',
        'minimumContrastRatio': 4.5
      },
      {
        'algorithm': 'wcag21',
        'background': 'background',
        'contrastClass': 'text',
        'foreground': 'function',
        'minimumContrastRatio': 4.5
      },
      {
        'algorithm': 'wcag21',
        'background': 'background',
        'contrastClass': 'text',
        'foreground': 'variable',
        'minimumContrastRatio': 4.5
      },
      {
        'algorithm': 'wcag21',
        'background': 'background',
        'contrastClass': 'text',
        'foreground': 'string',
        'minimumContrastRatio': 4.5
      },
      {
        'algorithm': 'wcag21',
        'background': 'background',
        'contrastClass': 'text',
        'foreground': 'number',
        'minimumContrastRatio': 4.5
      },
      {
        'algorithm': 'wcag21',
        'background': 'background',
        'contrastClass': 'text',
        'foreground': 'constant',
        'minimumContrastRatio': 4.5
      },
      {
        'algorithm': 'wcag21',
        'background': 'background',
        'contrastClass': 'text',
        'foreground': 'error',
        'minimumContrastRatio': 4.5
      },
      {
        'algorithm': 'wcag21',
        'background': 'background',
        'contrastClass': 'text',
        'foreground': 'warning',
        'minimumContrastRatio': 4.5
      },
      {
        'algorithm': 'wcag21',
        'background': 'background',
        'contrastClass': 'text',
        'foreground': 'info',
        'minimumContrastRatio': 4.5
      },
      {
        'algorithm': 'wcag21',
        'background': 'background',
        'contrastClass': 'text',
        'foreground': 'success',
        'minimumContrastRatio': 4.5
      },
      {
        'algorithm': 'wcag21',
        'background': 'accent',
        'contrastClass': 'text',
        'foreground': 'onAccent',
        'minimumContrastRatio': 4.5
      },
      {
        'algorithm': 'wcag21',
        'background': 'background',
        'contrastClass': 'text',
        'foreground': 'link',
        'minimumContrastRatio': 4.5
      },
      {
        'algorithm': 'wcag21',
        'background': 'chrome',
        'contrastClass': 'text',
        'foreground': 'chromeForeground',
        'minimumContrastRatio': 4.5
      }
    ];
    const result = rawPairs.map(ContrastPairEntity.create);
    return result;
  }

  static baseRoles(framing: {
    readonly 'accentLightnessOffset': number;
    readonly 'range': (
      dark: [number, number],
      light: [number, number]
    ) => [number, number];
    readonly 'surfaceLightnessOffset': number;
  }): VscodeRoleDraft[] {
    const semanticChroma = framing.range([0.06, 0.18], [0.05, 0.16]);
    const semanticLightness = framing.range([0.6, 0.8], [0.28, 0.48]);
    const accentChroma = framing.range([0.06, 0.18], [0.05, 0.16]);
    const accentLightness = framing.range([0.62, 0.82], [0.28, 0.46]);
    const diagnosticLightness = framing.range([0.52, 0.7], [0.28, 0.46]);
    const statusLightness = framing.range([0.6, 0.78], [0.28, 0.46]);
    return [
      VscodeFullRoleSchemas.role(
        'background',
        'Editor and chrome background',
        'background',
        [0.0, 0.05],
        framing.range([0.06, 0.18], [0.92, 0.99]),
        undefined,
        undefined
      ),
      VscodeFullRoleSchemas.role(
        'foreground',
        'Primary text and editor foreground',
        'text',
        [0.0, 0.04],
        framing.range([0.88, 0.98], [0.1, 0.24]),
        undefined,
        undefined
      ),
      VscodeFullRoleSchemas.role(
        'surface',
        'Sidebar, panels, and activity bar background',
        'background',
        [0.0, 0.06],
        framing.range([0.12, 0.28], [0.76, 0.92]),
        'background',
        undefined,
        { 'chromaScale': 0.9, 'lightnessOffset': framing.surfaceLightnessOffset }
      ),
      VscodeFullRoleSchemas.role(
        'muted',
        'Inactive and subdued text',
        'muted',
        [0.0, 0.08],
        framing.range([0.55, 0.72], [0.35, 0.52]),
        'foreground',
        undefined
      ),
      VscodeFullRoleSchemas.role(
        'keyword',
        'Keywords and primary interactive colour',
        'accent',
        accentChroma,
        accentLightness,
        undefined,
        undefined
      ),
      VscodeFullRoleSchemas.role(
        'type',
        'Types, classes, interfaces, and structs',
        'accent',
        semanticChroma,
        semanticLightness,
        'keyword',
        150
      ),
      VscodeFullRoleSchemas.role(
        'function',
        'Functions, methods, decorators, and events',
        'accent',
        semanticChroma,
        semanticLightness,
        'keyword',
        45
      ),
      VscodeFullRoleSchemas.role(
        'variable',
        'Variables, parameters, and properties',
        'accent',
        [0.04, 0.14],
        framing.range([0.64, 0.84], [0.24, 0.44]),
        'foreground',
        undefined
      ),
      VscodeFullRoleSchemas.role(
        'string',
        'String literals and regular expressions',
        'accent',
        semanticChroma,
        semanticLightness,
        'function',
        70
      ),
      VscodeFullRoleSchemas.role(
        'number',
        'Numeric literals',
        'accent',
        semanticChroma,
        semanticLightness,
        'string',
        50
      ),
      VscodeFullRoleSchemas.role(
        'constant',
        'Constants and enum members',
        'accent',
        semanticChroma,
        semanticLightness,
        'number',
        50
      ),
      VscodeFullRoleSchemas.role(
        'comment',
        'Comments and doc-comments',
        'muted',
        [0.02, 0.1],
        framing.range([0.55, 0.72], [0.35, 0.52]),
        'muted',
        undefined
      ),
      VscodeFullRoleSchemas.role(
        'error',
        'Error diagnostics',
        'critical',
        [0.08, 0.2],
        diagnosticLightness,
        undefined,
        undefined
      ),
      VscodeFullRoleSchemas.role(
        'warning',
        'Warning diagnostics',
        'muted',
        [0.08, 0.2],
        statusLightness,
        'error',
        50
      ),
      VscodeFullRoleSchemas.role(
        'info',
        'Info diagnostics and async hints',
        'muted',
        [0.08, 0.2],
        statusLightness,
        'error',
        208
      ),
      VscodeFullRoleSchemas.role(
        'success',
        'Success diagnostics and added git state',
        'positive',
        [0.08, 0.2],
        statusLightness,
        'error',
        125
      )
    ];
  }

  static extensionRoles(framing: {
    readonly 'accentLightnessOffset': number;
    readonly 'range': (
      dark: [number, number],
      light: [number, number]
    ) => [number, number];
    readonly 'surfaceLightnessOffset': number;
  }): VscodeRoleDraft[] {
    const uiChroma: [number, number] = [0.04, 0.14];
    const uiLightness = framing.range([0.42, 0.62], [0.44, 0.62]);
    const surfaceLightness = framing.range([0.1, 0.3], [0.7, 0.94]);
    const textLightness = framing.range([0.56, 0.82], [0.2, 0.52]);
    const subtleLightness = framing.range([0.16, 0.3], [0.7, 0.86]);
    const guideLightness = framing.range([0.22, 0.4], [0.62, 0.8]);
    const activeGuideLightness = framing.range([0.3, 0.48], [0.54, 0.72]);
    const ansiBlackLightness = framing.range([0.08, 0.2], [0.78, 0.9]);
    const ansiBrightBlackLightness = framing.range([0.28, 0.44], [0.56, 0.74]);
    const ansiWhiteLightness = framing.range([0.68, 0.84], [0.16, 0.34]);
    const ansiBrightWhiteLightness = framing.range([0.88, 0.98], [0.04, 0.16]);
    return [
      VscodeFullRoleSchemas.role(
        'accent',
        'Workbench accent colour',
        'accent',
        uiChroma,
        uiLightness,
        'keyword',
        0,
        { 'chromaScale': 0.9, 'lightnessOffset': framing.accentLightnessOffset }
      ),
      VscodeFullRoleSchemas.role(
        'onAccent',
        'Content drawn over the accent',
        'onAccent',
        [0.0, 0.04],
        framing.range([0.88, 0.98], [0.1, 0.24]),
        'accent',
        undefined
      ),
      VscodeFullRoleSchemas.role(
        'accentHover',
        'Hovered workbench accent',
        'accent',
        uiChroma,
        uiLightness,
        'accent',
        undefined
      ),
      VscodeFullRoleSchemas.role(
        'link',
        'Text links and active text links',
        'link',
        uiChroma,
        uiLightness,
        'accent',
        undefined
      ),
      VscodeFullRoleSchemas.role(
        'selection',
        'Editor selection surfaces',
        'accent',
        uiChroma,
        surfaceLightness,
        'accent',
        undefined
      ),
      VscodeFullRoleSchemas.role(
        'selectionList',
        'Active list and focus surfaces',
        'accent',
        uiChroma,
        surfaceLightness,
        'selection',
        undefined
      ),
      VscodeFullRoleSchemas.role(
        'buttonSecondary',
        'Secondary button surface',
        'button',
        uiChroma,
        surfaceLightness,
        'selectionList',
        undefined
      ),
      VscodeFullRoleSchemas.interpolatedRole(
        'buttonSecondaryHover',
        'Hovered secondary button surface',
        'button',
        uiChroma,
        surfaceLightness,
        'buttonSecondary',
        'foreground',
        0.1
      ),
      VscodeFullRoleSchemas.role(
        'findMatch',
        'Find-match highlight surface',
        'accent',
        uiChroma,
        surfaceLightness,
        'accent',
        undefined
      ),
      VscodeFullRoleSchemas.role(
        'bracketMatch',
        'Matched bracket surface and border',
        'accent',
        uiChroma,
        surfaceLightness,
        'selection',
        undefined
      ),
      VscodeFullRoleSchemas.role(
        'hover',
        'Hover and line-highlight surface',
        'background',
        [0.0, 0.06],
        surfaceLightness,
        'background',
        undefined
      ),
      VscodeFullRoleSchemas.role(
        'border',
        'Workbench chrome border',
        'muted',
        [0.0, 0.08],
        subtleLightness,
        'foreground',
        undefined
      ),
      VscodeFullRoleSchemas.role(
        'guide',
        'Indent-guide and whitespace colour',
        'muted',
        [0.0, 0.08],
        guideLightness,
        'border',
        undefined
      ),
      VscodeFullRoleSchemas.role(
        'guideActive',
        'Active indent-guide colour',
        'muted',
        [0.0, 0.08],
        activeGuideLightness,
        'border',
        undefined
      ),
      VscodeFullRoleSchemas.role(
        'chrome',
        'Active status and title bar background',
        'background',
        [0.0, 0.06],
        surfaceLightness,
        'background',
        undefined
      ),
      VscodeFullRoleSchemas.role(
        'chromeInactive',
        'Inactive chrome background',
        'background',
        [0.0, 0.06],
        surfaceLightness,
        'chrome',
        undefined
      ),
      VscodeFullRoleSchemas.role(
        'chromeForeground',
        'Chrome foreground content',
        'text',
        [0.0, 0.08],
        framing.range([0.88, 0.98], [0.2, 0.52]),
        'foreground',
        undefined
      ),
      VscodeFullRoleSchemas.role(
        'inputBackground',
        'Input background',
        'background',
        [0.0, 0.06],
        surfaceLightness,
        'background',
        undefined
      ),
      VscodeFullRoleSchemas.role(
        'ansiBlack',
        'Terminal ANSI black',
        'muted',
        [0.0, 0.08],
        ansiBlackLightness,
        'border',
        undefined
      ),
      VscodeFullRoleSchemas.role(
        'ansiRed',
        'Terminal ANSI red',
        'critical',
        [0.08, 0.2],
        textLightness,
        'error',
        undefined
      ),
      VscodeFullRoleSchemas.role(
        'ansiGreen',
        'Terminal ANSI green',
        'positive',
        [0.08, 0.2],
        textLightness,
        'success',
        undefined
      ),
      VscodeFullRoleSchemas.role(
        'ansiYellow',
        'Terminal ANSI yellow',
        'muted',
        [0.08, 0.2],
        textLightness,
        'warning',
        undefined
      ),
      VscodeFullRoleSchemas.role(
        'ansiBlue',
        'Terminal ANSI blue',
        'muted',
        [0.08, 0.2],
        textLightness,
        'info',
        undefined
      ),
      VscodeFullRoleSchemas.role(
        'ansiMagenta',
        'Terminal ANSI magenta',
        'accent',
        uiChroma,
        textLightness,
        'type',
        undefined
      ),
      VscodeFullRoleSchemas.role(
        'ansiCyan',
        'Terminal ANSI cyan',
        'accent',
        uiChroma,
        textLightness,
        'function',
        undefined
      ),
      VscodeFullRoleSchemas.role(
        'ansiWhite',
        'Terminal ANSI white',
        'text',
        [0.0, 0.04],
        ansiWhiteLightness,
        'foreground',
        undefined
      ),
      VscodeFullRoleSchemas.role(
        'ansiBrightBlack',
        'Terminal bright ANSI black',
        'muted',
        [0.0, 0.08],
        ansiBrightBlackLightness,
        'muted',
        undefined
      ),
      VscodeFullRoleSchemas.role(
        'ansiBrightRed',
        'Terminal bright ANSI red',
        'critical',
        [0.08, 0.2],
        textLightness,
        'ansiRed',
        undefined
      ),
      VscodeFullRoleSchemas.role(
        'ansiBrightGreen',
        'Terminal bright ANSI green',
        'positive',
        [0.08, 0.2],
        textLightness,
        'ansiGreen',
        undefined
      ),
      VscodeFullRoleSchemas.role(
        'ansiBrightYellow',
        'Terminal bright ANSI yellow',
        'muted',
        [0.08, 0.2],
        textLightness,
        'ansiYellow',
        undefined
      ),
      VscodeFullRoleSchemas.role(
        'ansiBrightBlue',
        'Terminal bright ANSI blue',
        'muted',
        [0.08, 0.2],
        textLightness,
        'ansiBlue',
        undefined
      ),
      VscodeFullRoleSchemas.role(
        'ansiBrightMagenta',
        'Terminal bright ANSI magenta',
        'accent',
        uiChroma,
        textLightness,
        'ansiMagenta',
        undefined
      ),
      VscodeFullRoleSchemas.role(
        'ansiBrightCyan',
        'Terminal bright ANSI cyan',
        'accent',
        uiChroma,
        textLightness,
        'ansiCyan',
        undefined
      ),
      VscodeFullRoleSchemas.role(
        'ansiBrightWhite',
        'Terminal bright ANSI white',
        'text',
        [0.0, 0.04],
        ansiBrightWhiteLightness,
        'ansiWhite',
        undefined
      ),
      VscodeFullRoleSchemas.role(
        'gitAdded',
        'Git added-resource decoration',
        'positive',
        [0.08, 0.2],
        textLightness,
        'success',
        undefined
      ),
      VscodeFullRoleSchemas.role(
        'gitModified',
        'Git modified-resource decoration',
        'muted',
        [0.08, 0.2],
        textLightness,
        'info',
        undefined
      ),
      VscodeFullRoleSchemas.role(
        'gitDeleted',
        'Git deleted-resource decoration',
        'critical',
        [0.08, 0.2],
        textLightness,
        'error',
        undefined
      ),
      VscodeFullRoleSchemas.role(
        'gitUntracked',
        'Git untracked-resource decoration',
        'muted',
        [0.08, 0.2],
        textLightness,
        'warning',
        undefined
      ),
      VscodeFullRoleSchemas.role(
        'gitConflicting',
        'Git conflicting-resource decoration',
        'muted',
        [0.08, 0.2],
        textLightness,
        'warning',
        undefined
      ),
      VscodeFullRoleSchemas.role(
        'diffInserted',
        'Inserted diff surface',
        'positive',
        [0.08, 0.2],
        surfaceLightness,
        'success',
        undefined
      ),
      VscodeFullRoleSchemas.role(
        'diffRemoved',
        'Removed diff surface',
        'critical',
        [0.08, 0.2],
        surfaceLightness,
        'error',
        undefined
      ),
      VscodeFullRoleSchemas.role(
        'bracketLevel1',
        'First bracket-highlight level',
        'accent',
        uiChroma,
        textLightness,
        'keyword',
        undefined
      ),
      VscodeFullRoleSchemas.role(
        'bracketLevel2',
        'Second bracket-highlight level',
        'accent',
        uiChroma,
        textLightness,
        'type',
        undefined
      ),
      VscodeFullRoleSchemas.role(
        'bracketLevel3',
        'Third bracket-highlight level',
        'accent',
        uiChroma,
        textLightness,
        'function',
        undefined
      ),
      VscodeFullRoleSchemas.role(
        'bracketLevel4',
        'Fourth bracket-highlight level',
        'accent',
        uiChroma,
        textLightness,
        'string',
        undefined
      ),
      VscodeFullRoleSchemas.role(
        'bracketLevel5',
        'Fifth bracket-highlight level',
        'accent',
        uiChroma,
        textLightness,
        'number',
        undefined
      ),
      VscodeFullRoleSchemas.role(
        'bracketLevel6',
        'Sixth bracket-highlight level',
        'accent',
        uiChroma,
        textLightness,
        'constant',
        undefined
      ),
      VscodeFullRoleSchemas.role(
        'widgetBackground',
        'Editor widget background',
        'background',
        [0.0, 0.06],
        surfaceLightness,
        'background',
        undefined
      ),
      VscodeFullRoleSchemas.role(
        'widgetBorder',
        'Editor widget border',
        'muted',
        [0.0, 0.08],
        subtleLightness,
        'border',
        undefined
      )
    ];
  }

  static darkRange(
    dark: [number, number],
    _light: [number, number]
  ): [number, number] {
    return dark;
  }

  static lightRange(
    _dark: [number, number],
    light: [number, number]
  ): [number, number] {
    return light;
  }

  static role(
    name: string,
    description: string,
    classification: string,
    chromaRange: [number, number],
    lightnessRange: [number, number],
    ...relationshipInput: readonly [
      string | undefined,
      number | undefined,
      { readonly 'chromaScale'?: number; readonly 'lightnessOffset'?: number }?
    ]
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
    const relationship = VscodeFullRoleSchemas.relationship(name, {
      ...(sourceRole === undefined ? {} : { 'source': sourceRole }),
      ...(degrees === undefined ? {} : { 'degrees': degrees }),
      ...(options.chromaScale === undefined
        ? {}
        : { 'chromaScale': options.chromaScale }),
      ...(options.lightnessOffset === undefined
        ? {}
        : { 'lightnessOffset': options.lightnessOffset })
    });
    const result =
      relationship === undefined
        ? { 'definition': definition }
        : { 'definition': definition, 'relationship': relationship };
    return result;
  }

  private static interpolatedRole(
    name: string,
    description: string,
    classification: string,
    chromaRange: [number, number],
    lightnessRange: [number, number],
    source: string,
    toward: string,
    weight: number
  ): VscodeRoleDraft {
    const definition = RoleDefinitionEntity.create({
      'chromaRange': chromaRange,
      'description': description,
      'intent': classification,
      'lightnessRange': lightnessRange,
      'name': name,
      'required': true
    });
    const relationship = RoleRelationshipEntity.create({
      'id': `${source}-toward-${toward}-to-${name}`,
      'operation': 'oklch-interpolate',
      'priority': 0,
      'relaxability': 'tolerant',
      'source': source,
      'target': name,
      'tolerance':
        VscodeFullRoleSchemas.#toleranceByOperation['oklch-interpolate'],
      'toward': toward,
      'weight': weight
    });
    return { 'definition': definition, 'relationship': relationship };
  }

  private static schema(
    name: string,
    description: string,
    framing: {
      readonly 'accentLightnessOffset': number;
      readonly 'range': (
        dark: [number, number],
        light: [number, number]
      ) => [number, number];
      readonly 'surfaceLightnessOffset': number;
    }
  ): RoleSchemaEntity.Type {
    const drafts = [
      ...VscodeFullRoleSchemas.baseRoles(framing),
      ...VscodeFullRoleSchemas.extensionRoles(framing)
    ];
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
      'contrastPairs': VscodeFullRoleSchemas.contrastPairs(),
      'description': description,
      'name': name,
      'relationshipGraph': RoleRelationshipGraphEntity.create({
        'groups': [
          {
            'anchor': 'background',
            'defaultMode': 'default',
            'id': 'vscode-derived-roles',
            'modes': [
              {
                'hueOffsets': [{ 'degrees': 0, 'variantId': 'default' }],
                'id': 'default'
              }
            ],
            'name': 'VS Code derived roles',
            'relationships': relationships
          }
        ]
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
    const shared = {
      'id': identifier,
      'priority': 0,
      'relaxability': 'tolerant' as const,
      'source': source,
      'target': target
    };
    if (
      options.chromaScale !== undefined ||
      options.lightnessOffset !== undefined
    ) {
      const result = RoleRelationshipEntity.create({
        ...shared,
        ...(options.degrees === undefined
          ? {}
          : { 'hueOffset': options.degrees }),
        ...(options.chromaScale === undefined
          ? {}
          : { 'chromaScale': options.chromaScale }),
        ...(options.lightnessOffset === undefined
          ? {}
          : { 'lightnessOffset': options.lightnessOffset }),
        'operation': 'oklch-delta',
        'tolerance': VscodeFullRoleSchemas.#toleranceByOperation['oklch-delta']
      });
      return result;
    }
    if (options.degrees === undefined) {
      const result = RoleRelationshipEntity.create({
        ...shared,
        'operation': 'alias',
        'tolerance': VscodeFullRoleSchemas.#toleranceByOperation.alias
      });
      return result;
    }
    const result = RoleRelationshipEntity.create({
      ...shared,
      'degrees': options.degrees,
      'operation': 'hue-offset',
      'tolerance': VscodeFullRoleSchemas.#toleranceByOperation['hue-offset']
    });
    return result;
  }
}

export const VSCODE_FULL_ROLE_SCHEMAS = VscodeFullRoleSchemas;
