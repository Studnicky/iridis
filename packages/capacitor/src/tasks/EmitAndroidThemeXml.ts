import type {
  ColorRecordInterface,
  PaletteStateInterface,
  PipelineContextInterface,
  TaskInterface,
  TaskManifestInterface,
} from '@studnicky/iridis';
import { getOrCreateOutput } from '@studnicky/iridis';

function resolveHexRole(
  roles: Record<string, ColorRecordInterface>,
  ...names: string[]
): string {
  for (const name of names) {
    const record = roles[name];
    if (record) {
      return record.hex;
    }
  }
  return '#000000';
}

function xmlItem(name: string, value: string): string {
  return `        <item name="${name}">${value}</item>`;
}

export class EmitAndroidThemeXml implements TaskInterface {
  readonly 'name' = 'emit:androidThemeXml';

  readonly 'manifest': TaskManifestInterface = {
    'name':        'emit:androidThemeXml',
    'reads':       ['roles', 'outputs.capacitor.statusBar', 'outputs.capacitor.splashScreen'],
    'writes':      ['outputs.capacitor.androidThemeXml'],
    'description': 'Emit Android themes.xml fragment for Capacitor splash screen and status bar.',
  };

  run(state: PaletteStateInterface, ctx: PipelineContextInterface): void {
    const roles = state.roles;

    const capacitorOut = getOrCreateOutput(state, 'capacitor');

    const statusBarColor = capacitorOut.statusBar?.backgroundColor
      ?? resolveHexRole(roles, 'topBar', 'surface', 'base');

    const splashColor = capacitorOut.splashScreen?.backgroundColor
      ?? resolveHexRole(roles, 'surface', 'background', 'base');

    const windowBackground  = resolveHexRole(roles, 'background', 'surface', 'base');
    const primaryColor      = resolveHexRole(roles, 'primary', 'base', 'accent');
    const navigationBarColor = resolveHexRole(roles, 'navigationBar', 'surface', 'base');
    const textColorPrimary  = resolveHexRole(roles, 'text', 'onSurface');

    const items = [
      xmlItem('android:statusBarColor',            statusBarColor),
      xmlItem('android:navigationBarColor',         navigationBarColor),
      xmlItem('android:windowBackground',           splashColor),
      xmlItem('android:colorPrimary',               primaryColor),
      xmlItem('android:colorPrimaryDark',           statusBarColor),
      xmlItem('android:colorBackground',            windowBackground),
      xmlItem('android:textColorPrimary',           textColorPrimary),
      xmlItem('postSplashScreenTheme',              '@style/AppTheme'),
    ].join('\n');

    const xml = [
      '<resources>',
      '    <style name="AppTheme.NoActionBarLaunch" parent="Theme.SplashScreen">',
      items,
      '    </style>',
      '</resources>',
    ].join('\n');

    capacitorOut['androidThemeXml'] = xml;

    ctx.logger.debug('EmitAndroidThemeXml', 'run', 'Android themes.xml fragment generated');
  }
}

export const emitAndroidThemeXml = new EmitAndroidThemeXml();
