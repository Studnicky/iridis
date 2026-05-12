import { Engine, coreTasks } from '@studnicky/iridis';
import { contrastPlugin }                  from '@studnicky/iridis-contrast';
import { stylesheetPlugin }                from '@studnicky/iridis-stylesheet';
import { capacitorPlugin }                 from '@studnicky/iridis-capacitor';
import { categoryW3cRoleSchema }           from './categoryW3cRoleSchema.ts';

interface CssVarsOutputInterface {
  readonly full:        string;
  readonly scopedBlock: string;
  readonly map:         Record<string, string>;
}

interface CapacitorStatusBarOutputInterface {
  readonly backgroundColor: string;
  readonly style:           'DARK' | 'LIGHT';
}

export class CategoryColorService {
  private readonly engine: Engine;

  private constructor() {
    this.engine = new Engine();
    for (const task of coreTasks) {
      this.engine.tasks.register(task);
    }
    this.engine.adopt(contrastPlugin);
    this.engine.adopt(stylesheetPlugin);
    this.engine.adopt(capacitorPlugin);
    this.engine.pipeline([
      'intake:any',
      'expand:family',
      'resolve:roles',
      'enforce:wcagAA',
      'derive:variant',
      'emit:cssVars',
      'emit:capacitorStatusBar',
      'emit:capacitorTheme',
    ]);
  }

  private static instance: CategoryColorService | undefined;

  static shared(): CategoryColorService {
    if (!CategoryColorService.instance) {
      CategoryColorService.instance = new CategoryColorService();
    }

    return CategoryColorService.instance;
  }

  async apply(category: string, seed: string): Promise<{
    readonly cssVars:   CssVarsOutputInterface;
    readonly statusBar: CapacitorStatusBarOutputInterface;
  }> {
    const state = await this.engine.run({
      'colors':   [seed],
      'roles':    categoryW3cRoleSchema,
      'contrast': { 'level': 'AA', 'algorithm': 'wcag21' },
      'metadata': {
        'category':     category,
        'cssVarPrefix': '--c-',
        'scopeAttr':    'data-category',
        'scopePrefix':  'category',
        'themeName':    category,
      },
    });
    const cssVars   = state.outputs['cssVars'] as CssVarsOutputInterface;
    const capacitor = state.outputs['capacitor'] as { readonly statusBar: CapacitorStatusBarOutputInterface };
    const sheetId   = `ce-${category}-styles`;
    let   sheet     = document.getElementById(sheetId) as HTMLStyleElement | null;

    if (!sheet) {
      sheet = document.createElement('style');
      sheet.id = sheetId;
      document.head.appendChild(sheet);
    }
    sheet.textContent = `[data-category="${category}"] {\n${
      Object.entries(cssVars.map).map(([k, v]) => `  ${k}: ${v};`).join('\n')
    }\n}`;

    return { 'cssVars': cssVars, 'statusBar': capacitor.statusBar };
  }
}

export const categoryColorService = CategoryColorService.shared();
