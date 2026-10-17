import { vscodeSeedRoleData } from '@studnicky/iridis-vscode';
import * as VueModule from 'vue';

import { runVscodeTheme } from './runVscodeTheme.ts';
import { useIridis } from './useIridis.ts';

class VscodeTierDemoData {
  static readonly colorsByPalette = new Map<string, readonly string[]>([
    ['aurora', ['#101820', '#f5f7fa', '#7c3aed', '#ef4444', '#06b6d4', '#f59e0b', '#10b981', '#ec4899']],
    ['ember', ['#1c1917', '#fff7ed', '#b45309', '#dc2626', '#0369a1', '#a16207', '#15803d', '#a21caf']]
  ]);
  static readonly roleNamesByTier = new Map<number, readonly string[]>(vscodeSeedRoleData.roleTiers.map((candidate) => {
    return [candidate.tier, candidate.roleNames];
  }));

  static roleNames(tier: number): readonly string[] {
    const roleNames = VscodeTierDemoData.roleNamesByTier.get(tier);
    if (roleNames === undefined) { throw new RangeError(`Unsupported VS Code role tier: ${tier}`); }
    const result = roleNames;
    return result;
  }

  static roles(tier: number, paletteName: string): Record<string, string> {
    const paletteColors = VscodeTierDemoData.colorsByPalette.get(paletteName);
    if (paletteColors === undefined) { throw new RangeError(`Unsupported VS Code palette: ${paletteName}`); }
    const roleNames = VscodeTierDemoData.roleNames(tier);
    const roles: Record<string, string> = {};
    for (let index = 0; index < roleNames.length; index += 1) {
      const role = roleNames[index]!;
      Object.defineProperty(roles, role, {
        'configurable': true, 'enumerable': true, 'value': paletteColors[index % paletteColors.length]!, 'writable': true
      });
    }
    return roles;
  }

  static messageFor(error: Error): string {
    const isSeedColorPatternError = error.message.startsWith('/roles/') && error.message.includes('must match pattern');
    const result = isSeedColorPatternError ? 'Each supplied seed color must be a six-digit hexadecimal color such as #101820.' : error.message;
    return result;
  }
}

class VscodeTierDemoOperation {
  static run() {
    const { framing } = useIridis();
    const tier = VueModule.ref(4);
    const paletteName = VueModule.ref('aurora');
    const roles = VueModule.ref<Record<string, string>>(VscodeTierDemoData.roles(tier.value, paletteName.value));
    const announcement = VueModule.ref('Aurora 4-role palette is ready. Use the shared page framing switch to change light and dark output.');
    const seedRoles = VueModule.computed(() => { const result = VscodeTierDemoData.roleNames(tier.value);
      return result; });
    const result = VueModule.computed(() => {
      try { return { 'error': undefined, 'theme': runVscodeTheme({ 'framing': framing.value, 'roles': roles.value, 'tier': tier.value }) }; }
      catch (error: unknown) {
        const themeError = error instanceof Error ? error : new Error('The theme could not be generated.');
        return { 'error': VscodeTierDemoData.messageFor(themeError), 'theme': undefined };
      }
    });
    function setTier(value: number): void {
      if (!VscodeTierDemoData.roleNamesByTier.has(value)) { return; }
      tier.value = value;
      roles.value = VscodeTierDemoData.roles(value, paletteName.value);
      announcement.value = `${value}-role tier selected. Its exact seed-role set replaces the editor fields.`;
    }
    function setPalette(value: string): void {
      if (!VscodeTierDemoData.colorsByPalette.has(value)) { return; }
      paletteName.value = value;
      roles.value = VscodeTierDemoData.roles(tier.value, value);
      announcement.value = `${value} palette loaded with ${tier.value} supplied seed roles.`;
    }
    VueModule.watch(framing, (value) => { announcement.value = `Shared ${value} framing applied to the VS Code theme output.`; });
    return { 'announcement': announcement, 'framing': framing, 'paletteName': paletteName, 'result': result, 'roles': roles, 'seedRoles': seedRoles, 'setPalette': setPalette, 'setTier': setTier, 'tier': tier };
  }
}

export const useVscodeTierDemo = VscodeTierDemoOperation.run;
