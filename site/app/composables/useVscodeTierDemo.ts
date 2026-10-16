import { vscodeSeedRoleData } from '@studnicky/iridis-vscode';
import * as VueModule from 'vue';

import { runVscodeTheme } from './runVscodeTheme.ts';
import { useIridis } from './useIridis.ts';

class VscodeTierDemoData {
  static readonly colors = {
    'aurora': ['#101820', '#f5f7fa', '#7c3aed', '#ef4444', '#06b6d4', '#f59e0b', '#10b981', '#ec4899'],
    'ember': ['#1c1917', '#fff7ed', '#b45309', '#dc2626', '#0369a1', '#a16207', '#15803d', '#a21caf']
  } as const;

  static roleNames(tier: 4 | 8 | 16 | 64): readonly string[] {
    const entry = vscodeSeedRoleData.roleTiers.find((candidate) => { return candidate.tier === tier; });
    if (entry === undefined) { throw new RangeError(`Unsupported VS Code role tier: ${tier}`); }
    return entry.roleNames;
  }

  static roles(tier: 4 | 8 | 16 | 64, paletteName: 'aurora' | 'ember'): Record<string, string> {
    const paletteColors = VscodeTierDemoData.colors[paletteName];
    const roles: Record<string, string> = {};
    for (const [index, role] of VscodeTierDemoData.roleNames(tier).entries()) {
      roles[role] = paletteColors[index % paletteColors.length]!;
    }
    return roles;
  }
}

class VscodeTierDemoOperation {
  static run() {
    const { framing } = useIridis();
    const tier = VueModule.ref<4 | 8 | 16 | 64>(4);
    const paletteName = VueModule.ref<'aurora' | 'ember'>('aurora');
    const roles = VueModule.ref<Record<string, string>>(VscodeTierDemoData.roles(tier.value, paletteName.value));
    const announcement = VueModule.ref('Aurora 4-role palette is ready. Use the shared page framing switch to change light and dark output.');
    const seedRoles = VueModule.computed(() => { const result = VscodeTierDemoData.roleNames(tier.value);
      return result; });
    const result = VueModule.computed(() => {
      try { return { 'error': undefined, 'theme': runVscodeTheme({ 'framing': framing.value, 'roles': roles.value, 'tier': tier.value }) }; }
      catch (error: unknown) { return { 'error': error instanceof Error ? error.message : 'The theme could not be generated.', 'theme': undefined }; }
    });
    function setTier(value: number): void {
      if (value !== 4 && value !== 8 && value !== 16 && value !== 64) { return; }
      tier.value = value;
      roles.value = VscodeTierDemoData.roles(value, paletteName.value);
      announcement.value = `${value}-role tier selected. Its exact seed-role set replaces the editor fields.`;
    }
    function setPalette(value: string): void {
      if (value !== 'aurora' && value !== 'ember') { return; }
      paletteName.value = value;
      roles.value = VscodeTierDemoData.roles(tier.value, value);
      announcement.value = `${value} palette loaded with ${tier.value} supplied seed roles.`;
    }
    VueModule.watch(framing, (value) => { announcement.value = `Shared ${value} framing applied to the VS Code theme output.`; });
    return { 'announcement': announcement, 'framing': framing, 'paletteName': paletteName, 'result': result, 'roles': roles, 'seedRoles': seedRoles, 'setPalette': setPalette, 'setTier': setTier, 'tier': tier };
  }
}

export const useVscodeTierDemo = VscodeTierDemoOperation.run;
