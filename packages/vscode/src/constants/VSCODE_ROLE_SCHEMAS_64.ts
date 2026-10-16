import type { ContrastPairInterfaceType, RoleDefinitionInterfaceType, RoleSchemaInterfaceType } from '@studnicky/iridis';


export class VSCODE_ROLE_SCHEMAS_64 {
  static readonly dark: RoleSchemaInterfaceType = {
    'contrastPairs': VSCODE_ROLE_SCHEMAS_64.contrastPairs(),
    'description': '64-role VS Code schema for dark editor themes.',
    'name': 'vscode-64-dark',
    'roles': [...VSCODE_ROLE_SCHEMAS_64.baseRoles('dark'), ...VSCODE_ROLE_SCHEMAS_64.extensionRoles('dark')]
  };

  static readonly light: RoleSchemaInterfaceType = {
    'contrastPairs': VSCODE_ROLE_SCHEMAS_64.contrastPairs(),
    'description': '64-role VS Code schema for light editor themes.',
    'name': 'vscode-64-light',
    'roles': [...VSCODE_ROLE_SCHEMAS_64.baseRoles('light'), ...VSCODE_ROLE_SCHEMAS_64.extensionRoles('light')]
  };

  static contrastPairs(): ContrastPairInterfaceType[] {
    return [
      { 'algorithm': 'wcag21', 'background': 'background', 'foreground': 'foreground', 'minRatio': 7.0 },
      { 'algorithm': 'wcag21', 'background': 'background', 'foreground': 'comment', 'minRatio': 4.5 },
      { 'algorithm': 'wcag21', 'background': 'background', 'foreground': 'muted', 'minRatio': 4.5 },
      { 'algorithm': 'wcag21', 'background': 'background', 'foreground': 'surface', 'maxRatio': 2.0, 'minRatio': 1.1 },
      { 'algorithm': 'wcag21', 'background': 'background', 'foreground': 'keyword', 'minRatio': 4.5 },
      { 'algorithm': 'wcag21', 'background': 'background', 'foreground': 'accent', 'maxRatio': 4.5, 'minRatio': 3.0 },
      { 'algorithm': 'wcag21', 'background': 'background', 'foreground': 'type', 'minRatio': 4.5 },
      { 'algorithm': 'wcag21', 'background': 'background', 'foreground': 'function', 'minRatio': 4.5 },
      { 'algorithm': 'wcag21', 'background': 'background', 'foreground': 'variable', 'minRatio': 4.5 },
      { 'algorithm': 'wcag21', 'background': 'background', 'foreground': 'string', 'minRatio': 4.5 },
      { 'algorithm': 'wcag21', 'background': 'background', 'foreground': 'number', 'minRatio': 4.5 },
      { 'algorithm': 'wcag21', 'background': 'background', 'foreground': 'constant', 'minRatio': 4.5 },
      { 'algorithm': 'wcag21', 'background': 'background', 'foreground': 'error', 'minRatio': 4.5 },
      { 'algorithm': 'wcag21', 'background': 'background', 'foreground': 'warning', 'minRatio': 4.5 },
      { 'algorithm': 'wcag21', 'background': 'background', 'foreground': 'info', 'minRatio': 4.5 },
      { 'algorithm': 'wcag21', 'background': 'background', 'foreground': 'success', 'minRatio': 4.5 },
      { 'algorithm': 'wcag21', 'background': 'accent', 'foreground': 'onAccent', 'minRatio': 4.5 },
      { 'algorithm': 'wcag21', 'background': 'background', 'foreground': 'link', 'minRatio': 4.5 },
      { 'algorithm': 'wcag21', 'background': 'chrome', 'foreground': 'chromeForeground', 'minRatio': 4.5 }
    ];
  }

  static baseRoles(mode: 'dark' | 'light'): RoleDefinitionInterfaceType[] {
    const semanticChroma = VSCODE_ROLE_SCHEMAS_64.range(mode, [0.06, 0.18], [0.05, 0.16]);
    const semanticLightness = VSCODE_ROLE_SCHEMAS_64.range(mode, [0.60, 0.80], [0.28, 0.48]);
    const accentChroma = VSCODE_ROLE_SCHEMAS_64.range(mode, [0.06, 0.18], [0.05, 0.16]);
    const accentLightness = VSCODE_ROLE_SCHEMAS_64.range(mode, [0.62, 0.82], [0.28, 0.46]);
    const diagnosticLightness = VSCODE_ROLE_SCHEMAS_64.range(mode, [0.52, 0.70], [0.28, 0.46]);
    const statusLightness = VSCODE_ROLE_SCHEMAS_64.range(mode, [0.60, 0.78], [0.28, 0.46]);
    return [
      VSCODE_ROLE_SCHEMAS_64.role('background', 'Editor and chrome background', 'background', [0.00, 0.05], VSCODE_ROLE_SCHEMAS_64.range(mode, [0.06, 0.18], [0.92, 0.99]), undefined, undefined),
      VSCODE_ROLE_SCHEMAS_64.role('foreground', 'Primary text and editor foreground', 'text', [0.00, 0.04], VSCODE_ROLE_SCHEMAS_64.range(mode, [0.88, 0.98], [0.10, 0.24]), undefined, undefined),
      VSCODE_ROLE_SCHEMAS_64.role('surface', 'Sidebar, panels, and activity bar background', 'background', [0.00, 0.06], VSCODE_ROLE_SCHEMAS_64.range(mode, [0.12, 0.28], [0.76, 0.92]), 'background', undefined, { 'chromaScale': 0.9, 'lightnessOffset': mode === 'dark' ? 0.06 : -0.06 }),
      VSCODE_ROLE_SCHEMAS_64.role('muted', 'Inactive and subdued text', 'muted', [0.00, 0.08], VSCODE_ROLE_SCHEMAS_64.range(mode, [0.55, 0.72], [0.35, 0.52]), 'foreground', undefined),
      VSCODE_ROLE_SCHEMAS_64.role('keyword', 'Keywords and primary interactive colour', 'accent', accentChroma, accentLightness, undefined, undefined),
      VSCODE_ROLE_SCHEMAS_64.role('type', 'Types, classes, interfaces, and structs', 'accent', semanticChroma, semanticLightness, 'keyword', 150),
      VSCODE_ROLE_SCHEMAS_64.role('function', 'Functions, methods, decorators, and events', 'accent', semanticChroma, semanticLightness, 'keyword', 45),
      VSCODE_ROLE_SCHEMAS_64.role('variable', 'Variables, parameters, and properties', 'accent', [0.04, 0.14], VSCODE_ROLE_SCHEMAS_64.range(mode, [0.64, 0.84], [0.24, 0.44]), 'foreground', undefined),
      VSCODE_ROLE_SCHEMAS_64.role('string', 'String literals and regular expressions', 'accent', semanticChroma, semanticLightness, 'function', 70),
      VSCODE_ROLE_SCHEMAS_64.role('number', 'Numeric literals', 'accent', semanticChroma, semanticLightness, 'string', 50),
      VSCODE_ROLE_SCHEMAS_64.role('constant', 'Constants and enum members', 'accent', semanticChroma, semanticLightness, 'number', 50),
      VSCODE_ROLE_SCHEMAS_64.role('comment', 'Comments and doc-comments', 'muted', [0.02, 0.10], VSCODE_ROLE_SCHEMAS_64.range(mode, [0.55, 0.72], [0.35, 0.52]), 'muted', undefined),
      VSCODE_ROLE_SCHEMAS_64.role('error', 'Error diagnostics', 'critical', [0.08, 0.20], diagnosticLightness, undefined, undefined),
      VSCODE_ROLE_SCHEMAS_64.role('warning', 'Warning diagnostics', 'muted', [0.08, 0.20], statusLightness, 'error', 50),
      VSCODE_ROLE_SCHEMAS_64.role('info', 'Info diagnostics and async hints', 'muted', [0.08, 0.20], statusLightness, 'error', 208),
      VSCODE_ROLE_SCHEMAS_64.role('success', 'Success diagnostics and added git state', 'positive', [0.08, 0.20], statusLightness, 'error', 125)
    ];
  }

  static extensionRoles(mode: 'dark' | 'light'): RoleDefinitionInterfaceType[] {
    const uiChroma: [number, number] = [0.04, 0.14];
    const uiLightness = VSCODE_ROLE_SCHEMAS_64.range(mode, [0.42, 0.62], [0.44, 0.62]);
    const surfaceLightness = VSCODE_ROLE_SCHEMAS_64.range(mode, [0.10, 0.30], [0.70, 0.94]);
    const textLightness = VSCODE_ROLE_SCHEMAS_64.range(mode, [0.56, 0.82], [0.20, 0.52]);
    return [
      VSCODE_ROLE_SCHEMAS_64.role('accent', 'Workbench accent colour', 'accent', uiChroma, uiLightness, 'keyword', 0, { 'chromaScale': 0.9, 'lightnessOffset': mode === 'dark' ? -0.14 : 0.14 }),
      VSCODE_ROLE_SCHEMAS_64.role('onAccent', 'Content drawn over the accent', 'onAccent', [0.00, 0.04], VSCODE_ROLE_SCHEMAS_64.range(mode, [0.88, 0.98], [0.10, 0.24]), 'accent', undefined),
      VSCODE_ROLE_SCHEMAS_64.role('accentHover', 'Hovered workbench accent', 'accent', uiChroma, uiLightness, 'accent', undefined),
      VSCODE_ROLE_SCHEMAS_64.role('link', 'Text links and active text links', 'link', uiChroma, uiLightness, 'accent', undefined),
      VSCODE_ROLE_SCHEMAS_64.role('selection', 'Editor selection surfaces', 'accent', uiChroma, surfaceLightness, 'accent', undefined),
      VSCODE_ROLE_SCHEMAS_64.role('selectionList', 'Active list and focus surfaces', 'accent', uiChroma, surfaceLightness, 'selection', undefined),
      VSCODE_ROLE_SCHEMAS_64.role('buttonSecondary', 'Secondary button surface', 'button', uiChroma, surfaceLightness, 'selectionList', undefined),
      VSCODE_ROLE_SCHEMAS_64.role('findMatch', 'Find-match highlight surface', 'accent', uiChroma, surfaceLightness, 'accent', undefined),
      VSCODE_ROLE_SCHEMAS_64.role('bracketMatch', 'Matched bracket surface and border', 'accent', uiChroma, surfaceLightness, 'selection', undefined),
      VSCODE_ROLE_SCHEMAS_64.role('hover', 'Hover and line-highlight surface', 'background', [0.00, 0.06], surfaceLightness, 'background', undefined),
      VSCODE_ROLE_SCHEMAS_64.role('border', 'Workbench chrome border', 'muted', [0.00, 0.08], textLightness, 'foreground', undefined),
      VSCODE_ROLE_SCHEMAS_64.role('guide', 'Indent-guide and whitespace colour', 'muted', [0.00, 0.08], textLightness, 'border', undefined),
      VSCODE_ROLE_SCHEMAS_64.role('guideActive', 'Active indent-guide colour', 'muted', [0.00, 0.08], textLightness, 'border', undefined),
      VSCODE_ROLE_SCHEMAS_64.role('chrome', 'Active status and title bar background', 'background', [0.00, 0.06], surfaceLightness, 'background', undefined),
      VSCODE_ROLE_SCHEMAS_64.role('chromeInactive', 'Inactive chrome background', 'background', [0.00, 0.06], surfaceLightness, 'chrome', undefined),
      VSCODE_ROLE_SCHEMAS_64.role('chromeForeground', 'Chrome foreground content', 'text', [0.00, 0.08], textLightness, 'foreground', undefined),
      VSCODE_ROLE_SCHEMAS_64.role('inputBackground', 'Input background', 'background', [0.00, 0.06], surfaceLightness, 'background', undefined),
      VSCODE_ROLE_SCHEMAS_64.role('ansiBlack', 'Terminal ANSI black', 'muted', [0.00, 0.08], textLightness, 'border', undefined),
      VSCODE_ROLE_SCHEMAS_64.role('ansiRed', 'Terminal ANSI red', 'critical', [0.08, 0.20], textLightness, 'error', undefined),
      VSCODE_ROLE_SCHEMAS_64.role('ansiGreen', 'Terminal ANSI green', 'positive', [0.08, 0.20], textLightness, 'success', undefined),
      VSCODE_ROLE_SCHEMAS_64.role('ansiYellow', 'Terminal ANSI yellow', 'muted', [0.08, 0.20], textLightness, 'warning', undefined),
      VSCODE_ROLE_SCHEMAS_64.role('ansiBlue', 'Terminal ANSI blue', 'muted', [0.08, 0.20], textLightness, 'info', undefined),
      VSCODE_ROLE_SCHEMAS_64.role('ansiMagenta', 'Terminal ANSI magenta', 'accent', uiChroma, textLightness, 'type', undefined),
      VSCODE_ROLE_SCHEMAS_64.role('ansiCyan', 'Terminal ANSI cyan', 'accent', uiChroma, textLightness, 'function', undefined),
      VSCODE_ROLE_SCHEMAS_64.role('ansiWhite', 'Terminal ANSI white', 'text', [0.00, 0.04], textLightness, 'foreground', undefined),
      VSCODE_ROLE_SCHEMAS_64.role('ansiBrightBlack', 'Terminal bright ANSI black', 'muted', [0.00, 0.08], textLightness, 'muted', undefined),
      VSCODE_ROLE_SCHEMAS_64.role('ansiBrightRed', 'Terminal bright ANSI red', 'critical', [0.08, 0.20], textLightness, 'ansiRed', undefined),
      VSCODE_ROLE_SCHEMAS_64.role('ansiBrightGreen', 'Terminal bright ANSI green', 'positive', [0.08, 0.20], textLightness, 'ansiGreen', undefined),
      VSCODE_ROLE_SCHEMAS_64.role('ansiBrightYellow', 'Terminal bright ANSI yellow', 'muted', [0.08, 0.20], textLightness, 'ansiYellow', undefined),
      VSCODE_ROLE_SCHEMAS_64.role('ansiBrightBlue', 'Terminal bright ANSI blue', 'muted', [0.08, 0.20], textLightness, 'ansiBlue', undefined),
      VSCODE_ROLE_SCHEMAS_64.role('ansiBrightMagenta', 'Terminal bright ANSI magenta', 'accent', uiChroma, textLightness, 'ansiMagenta', undefined),
      VSCODE_ROLE_SCHEMAS_64.role('ansiBrightCyan', 'Terminal bright ANSI cyan', 'accent', uiChroma, textLightness, 'ansiCyan', undefined),
      VSCODE_ROLE_SCHEMAS_64.role('ansiBrightWhite', 'Terminal bright ANSI white', 'text', [0.00, 0.04], textLightness, 'ansiWhite', undefined),
      VSCODE_ROLE_SCHEMAS_64.role('gitAdded', 'Git added-resource decoration', 'positive', [0.08, 0.20], textLightness, 'success', undefined),
      VSCODE_ROLE_SCHEMAS_64.role('gitModified', 'Git modified-resource decoration', 'muted', [0.08, 0.20], textLightness, 'info', undefined),
      VSCODE_ROLE_SCHEMAS_64.role('gitDeleted', 'Git deleted-resource decoration', 'critical', [0.08, 0.20], textLightness, 'error', undefined),
      VSCODE_ROLE_SCHEMAS_64.role('gitUntracked', 'Git untracked-resource decoration', 'muted', [0.08, 0.20], textLightness, 'warning', undefined),
      VSCODE_ROLE_SCHEMAS_64.role('gitConflicting', 'Git conflicting-resource decoration', 'muted', [0.08, 0.20], textLightness, 'warning', undefined),
      VSCODE_ROLE_SCHEMAS_64.role('diffInserted', 'Inserted diff surface', 'positive', [0.08, 0.20], surfaceLightness, 'success', undefined),
      VSCODE_ROLE_SCHEMAS_64.role('diffRemoved', 'Removed diff surface', 'critical', [0.08, 0.20], surfaceLightness, 'error', undefined),
      VSCODE_ROLE_SCHEMAS_64.role('bracketLevel1', 'First bracket-highlight level', 'accent', uiChroma, textLightness, 'keyword', undefined),
      VSCODE_ROLE_SCHEMAS_64.role('bracketLevel2', 'Second bracket-highlight level', 'accent', uiChroma, textLightness, 'type', undefined),
      VSCODE_ROLE_SCHEMAS_64.role('bracketLevel3', 'Third bracket-highlight level', 'accent', uiChroma, textLightness, 'function', undefined),
      VSCODE_ROLE_SCHEMAS_64.role('bracketLevel4', 'Fourth bracket-highlight level', 'accent', uiChroma, textLightness, 'string', undefined),
      VSCODE_ROLE_SCHEMAS_64.role('bracketLevel5', 'Fifth bracket-highlight level', 'accent', uiChroma, textLightness, 'number', undefined),
      VSCODE_ROLE_SCHEMAS_64.role('bracketLevel6', 'Sixth bracket-highlight level', 'accent', uiChroma, textLightness, 'constant', undefined),
      VSCODE_ROLE_SCHEMAS_64.role('widgetBackground', 'Editor widget background', 'background', [0.00, 0.06], surfaceLightness, 'background', undefined),
      VSCODE_ROLE_SCHEMAS_64.role('widgetBorder', 'Editor widget border', 'muted', [0.00, 0.08], textLightness, 'border', undefined)
    ];
  }

  static range(mode: 'dark' | 'light', dark: [number, number], light: [number, number]): [number, number] {
    return mode === 'dark' ? dark : light;
  }

  static role(
    name: string,
    description: string,
    intent: RoleDefinitionInterfaceType['intent'],
    chromaRange: [number, number],
    lightnessRange: [number, number],
    derivedFrom: string | undefined,
    hueOffset: number | undefined,
    options: { readonly 'chromaScale'?: number; readonly 'lightnessOffset'?: number } = {}
  ): RoleDefinitionInterfaceType {
    const definition: RoleDefinitionInterfaceType = {
      'chromaRange': chromaRange,
      'derivedFrom': derivedFrom,
      'description': description,
      'hue': undefined,
      'hueClamp': undefined,
      'hueOffset': hueOffset,
      'intent': intent,
      'lightnessRange': lightnessRange,
      'name': name,
      'required': true
    };
    if (options.lightnessOffset !== undefined) { definition.lightnessOffset = options.lightnessOffset; }
    if (options.chromaScale !== undefined) { definition.chromaScale = options.chromaScale; }
    return definition;
  }
}
