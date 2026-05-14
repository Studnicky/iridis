import { Engine, coreTasks }                                    from '@studnicky/iridis';
import { contrastPlugin }                                          from '@studnicky/iridis-contrast';
import { stylesheetPlugin }                                        from '@studnicky/iridis-stylesheet';
import type { CssVarsOutputInterface }                             from '@studnicky/iridis-stylesheet/types';
import { capacitorPlugin }                                         from '@studnicky/iridis-capacitor';
import type { StatusBarOutputInterface }                           from '@studnicky/iridis-capacitor/types';
import { categoryW3cRoleSchema }                                   from './categoryW3cRoleSchema.ts';

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
    /* Example wires every compliance check the engine exposes —
       WCAG 2.1 AA + AAA, APCA Lc targets, and CVD simulation against
       protanopia + deuteranopia + tritanopia + achromatopsia. Real
       consumers opt in/out via their own pipeline; the example
       demonstrates the maximal-correctness configuration. */
    this.engine.pipeline([
      'intake:any',
      'expand:family',
      'resolve:roles',
      'enforce:wcagAA',
      'enforce:wcagAAA',
      'enforce:apca',
      'enforce:cvdSimulate',
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
    readonly statusBar: StatusBarOutputInterface;
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
    const capacitor = state.outputs['capacitor'] as { readonly statusBar: StatusBarOutputInterface };
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
