import type {
  ColorRecordInterfaceTypeEntity,
  PaletteStateInterface,
  PipelineContextInterface,
  TaskInterface
} from '@studnicky/iridis';

import { TaskManifestInterfaceTypeEntity } from '@studnicky/iridis';
import { LOG_STATUS, LogBody } from '@studnicky/logger/node';

import { CapacitorOutputsEntity } from '../entities/CapacitorOutputsEntity.ts';

class HexRole {
  static resolve(
    roles: Record<string, ColorRecordInterfaceTypeEntity.Type>,
    ...names: string[]
  ): string {
    for (let index = 0; index < names.length; index += 1) {
      const name = names[index];
      if (name === undefined) {
        continue;
      }
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

  readonly 'manifest': TaskManifestInterfaceTypeEntity.Type = TaskManifestInterfaceTypeEntity.create({
    'description': 'Emit Android themes.xml fragment for Capacitor splash screen and status bar.',
    'name':        'emit:androidThemeXml',
    'reads':       ['roles', 'outputs.capacitor:statusBar', 'outputs.capacitor:splashScreen'],
    'writes':      ['outputs.capacitor:androidThemeXml']
  });

  run(state: PaletteStateInterface, context: PipelineContextInterface): void {
    const roles = state.roles;

    const statusBarOutput = state.outputs['capacitor:statusBar'];
    const priorStatusBar = statusBarOutput === undefined
      ? undefined
      : CapacitorOutputsEntity.intake({ 'statusBar': statusBarOutput }).statusBar;
    const splashScreenOutput = state.outputs['capacitor:splashScreen'];
    const priorSplashScreen = splashScreenOutput === undefined
      ? undefined
      : CapacitorOutputsEntity.intake({ 'splashScreen': splashScreenOutput }).splashScreen;

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

    CapacitorOutputsEntity.intake({ 'androidThemeXml': xml });
    state.outputs['capacitor:androidThemeXml'] = xml;

    context.logger.debug(
      LogBody.create({
        'component': 'EmitAndroidThemeXml',
        'context': {},
        'message': 'Android themes.xml fragment generated',
        'operation': 'run',
        'status': LOG_STATUS.SUCCESS
      })
    );
  }
}

export const emitAndroidThemeXml = new EmitAndroidThemeXml();
