import { DerivationConfigInterfaceTypeEntity } from '../composables/entities/DerivationConfigInterfaceTypeEntity.ts';
import { PaletteResolveRequestInterfaceTypeEntity } from '../composables/entities/PaletteResolveRequestInterfaceTypeEntity.ts';
import { SchemaNameInterfaceTypeEntity } from '../composables/entities/SchemaNameInterfaceTypeEntity.ts';
import { PaletteResolve } from '../composables/paletteResolve.ts';
import { Tokens } from './Tokens.ts';

/** Produces the optional static snapshot of the site's default engine-resolved theme. */
export class DefaultThemeCss {
  private static readonly baseSelector = 'html:root, html:root.dark, html:root:not(.dark)';
  private static readonly seeds = [
    { 'hex': '#7c3aed' },
    { 'hex': '#06b6d4' },
    { 'hex': '#f59e0b' },
    { 'hex': '#ec4899' }
  ];

  private static readonly parameters = {
    'colorSpace': 'srgb',
    'derivationConfig': DerivationConfigInterfaceTypeEntity.defaultValue,
    'schemaName': SchemaNameInterfaceTypeEntity.defaultValue,
    'seeds': DefaultThemeCss.seeds,
    'semanticHuesEnabled': true,
    'strictness': 2
  } as const;

  private static generateFrame(request: PaletteResolveRequestInterfaceTypeEntity.Type, selector: string): string {
    const snapshot = PaletteResolve.run(request);
    const css = Tokens.toCssText(Tokens.mapFromEngine(Tokens.hexRecord(snapshot.roles), snapshot.scales));
    const themedCss = css.replace(DefaultThemeCss.baseSelector, selector);
    return themedCss;
  }

  static generate(): string {
    const light = DefaultThemeCss.generateFrame(PaletteResolveRequestInterfaceTypeEntity.create({ ...DefaultThemeCss.parameters, 'framing': 'light' }), 'html:root, html:root:not(.dark)');
    const dark = DefaultThemeCss.generateFrame(PaletteResolveRequestInterfaceTypeEntity.create({ ...DefaultThemeCss.parameters, 'framing': 'dark' }), 'html:root.dark');
    const themeCss = `${light  }\n${  dark}`;
    return themeCss;
  }
}
