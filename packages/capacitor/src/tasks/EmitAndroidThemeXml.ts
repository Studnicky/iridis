import type {
  ColorRecordInterfaceType,
  PaletteStateInterface,
  PipelineContextInterface,
  TaskInterface,
  TaskManifestInterfaceType
} from '@studnicky/iridis';

import { LogBody } from '@studnicky/logger/builders';
import { LOG_STATUS } from '@studnicky/logger/constants';

import type { SplashScreenOutputInterfaceType, StatusBarOutputInterfaceType } from '../types/index.ts';

class HexRole {
  static resolve(
    roles: Record<string, ColorRecordInterfaceType>,
    ...names: string[]
  ): string {
    for (const name of names) {
      const record = roles[name];
      if (record !== undefined) {
        return record.hex;
      }
    }
    return '#000000';
  }
}

class XmlItem {
  static build(name: string, value: string): string {
    const result = `        <item name="${name}">${value}</item>`;
    return result;
  }
}

class EmitAndroidThemeXml implements TaskInterface {
  readonly 'name' = 'emit:androidThemeXml';

  readonly 'manifest': TaskManifestInterfaceType = {
    'description': 'Emit Android themes.xml fragment for Capacitor splash screen and status bar.',
    'name':        'emit:androidThemeXml',
    'phase':       undefined,
    'reads':       ['roles', 'outputs.capacitor:statusBar', 'outputs.capacitor:splashScreen'],
    'requires':    undefined,
    'writes':      ['outputs.capacitor:androidThemeXml']
  };

  run(state: PaletteStateInterface, ctx: PipelineContextInterface): void {
    const roles = state.roles;

    const priorStatusBar    = state.outputs['capacitor:statusBar']    as StatusBarOutputInterfaceType   | undefined;
    const priorSplashScreen = state.outputs['capacitor:splashScreen'] as SplashScreenOutputInterfaceType | undefined;

    const statusBarColor = priorStatusBar?.backgroundColor
      ?? HexRole.resolve(roles, 'topBar', 'surface', 'base');

    const splashColor = priorSplashScreen?.backgroundColor
      ?? HexRole.resolve(roles, 'surface', 'background', 'base');

    const windowBackground  = HexRole.resolve(roles, 'background', 'surface', 'base');
    const primaryColor      = HexRole.resolve(roles, 'primary', 'base', 'accent');
    const navigationBarColor = HexRole.resolve(roles, 'navigationBar', 'surface', 'base');
    const textColorPrimary  = HexRole.resolve(roles, 'text', 'onSurface');

    const items = [
      XmlItem.build('android:statusBarColor',            statusBarColor),
      XmlItem.build('android:navigationBarColor',         navigationBarColor),
      XmlItem.build('android:windowBackground',           splashColor),
      XmlItem.build('android:colorPrimary',               primaryColor),
      XmlItem.build('android:colorPrimaryDark',           statusBarColor),
      XmlItem.build('android:colorBackground',            windowBackground),
      XmlItem.build('android:textColorPrimary',           textColorPrimary),
      XmlItem.build('postSplashScreenTheme',              '@style/AppTheme')
    ].join('\n');

    const xml = [
      '<resources>',
      '    <style name="AppTheme.NoActionBarLaunch" parent="Theme.SplashScreen">',
      items,
      '    </style>',
      '</resources>'
    ].join('\n');

    state.outputs['capacitor:androidThemeXml'] = xml;

    ctx.logger.debug(
      LogBody.create()
        .component('EmitAndroidThemeXml')
        .operation('run')
        .status(LOG_STATUS.SUCCESS)
        .message('Android themes.xml fragment generated')
        .context({})
        .build()
    );
  }
}

export const emitAndroidThemeXml = new EmitAndroidThemeXml();
