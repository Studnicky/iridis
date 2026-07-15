<script setup lang="ts">
import { computed } from 'vue';
import { colorRecordFactory } from '@studnicky/iridis';
import { useDataLayout } from '~/composables/useDataLayout.ts';
import { useIridis } from '~/composables/useIridis.ts';
import { roleSchemaByName } from '~/theme/RoleSchemaByName.ts';
import { ALIAS_COLOR_NAMES, Tokens } from '~/theme/Tokens.ts';
import { contrastRatio } from '~/theme/ContrastRatio.ts';
import { complianceFor } from '~/utils/complianceFor.ts';
import { minRatioForRole } from '~/utils/minRatioForRole.ts';
import { sortRoleRows } from '~/utils/sortRoleRows.ts';
import { capitalize } from '~/utils/capitalize.ts';

const TABLE_SHADES = [50, 100, 200, 300, 400, 500, 600, 700, 800, 900, 950];

const ALIASES = ALIAS_COLOR_NAMES.map((key) => ({ key, 'label': capitalize(key) }));

/** Same sort as every other role listing on the page — an alias's sort row is its base (500-shade) resolved color, the same hex ScaleCard shows as this alias's representative swatch. */
const { roles, scales, roleSortKeys, schemaName, framing } = useIridis();
const { dataLayout } = useDataLayout();

const sortedAliases = computed(() => {
  // 'background' is required in every schema tier — resolved before any
  // component reads this, never a hardcoded placeholder.
  const bg = roles.value['background']!;
  const schema = roleSchemaByName[schemaName.value]?.[framing.value];
  const rows = ALIASES.map((a) => {
    // resolveAliasShadeHex can still miss during an early SSR pass (e.g. the
    // requested shade tier isn't populated yet) — fall back to the same
    // always-present, required 'background' role rather than a hardcoded hex.
    const hex = Tokens.resolveAliasShadeHex(roles.value, scales.value, a.key, 500) ?? bg;
    const oklch = colorRecordFactory.fromHex(hex).oklch;
    const ratio = contrastRatio(hex, bg);
    // a.key is a Nuxt UI alias (primary/secondary/…), not a schema role name,
    // so it never matches a declared contrast pair — minRatioForRole falls
    // back to the WCAG-AA default, which is what every alias's underlying
    // role (brand/accent-alt/success/…) already declares.
    return { ...a, 'c': oklch.c, 'compliance': complianceFor(ratio, minRatioForRole(schema, a.key)), 'h': oklch.h, 'l': oklch.l, 'name': a.key, ratio };
  });
  return sortRoleRows(rows, roleSortKeys.value);
});
</script>

<template>
  <div class="space-y-3">
    <RoleSortControls />
    <div
      v-show="dataLayout === 'grid'"
      class="palette-grid"
    >
      <div
        v-for="a in sortedAliases"
        :key="a.key"
        class="grid-item"
      >
        <ScaleCard :alias="a" />
      </div>
    </div>
    <div
      v-show="dataLayout === 'list'"
      class="palette-list"
    >
      <div
        v-for="a in sortedAliases"
        :key="a.key"
        class="grid-item"
      >
        <ScaleCard :alias="a" />
      </div>
    </div>
    <div
      v-show="dataLayout === 'pixel'"
      class="palette-pixel"
    >
      <div
        v-for="a in sortedAliases"
        :key="a.key"
        class="grid-item"
      >
        <ScaleCard :alias="a" />
      </div>
    </div>
    <table
      v-show="dataLayout === 'table'"
      class="palette-table w-full border-collapse text-left text-sm"
    >
      <thead>
        <tr class="border-b border-(--ui-border)">
          <th class="px-2 py-2 font-display text-xs font-bold uppercase tracking-widest text-(--ui-text-dimmed)">
            Name
          </th>
          <th class="px-2 py-2 font-display text-xs font-bold uppercase tracking-widest text-(--ui-text-dimmed)">
            Shades
          </th>
          <th class="px-2 py-2 font-display text-xs font-bold uppercase tracking-widest text-(--ui-text-dimmed)">
            Ratio
          </th>
          <th class="px-2 py-2 font-display text-xs font-bold uppercase tracking-widest text-(--ui-text-dimmed)">
            Compliance
          </th>
        </tr>
      </thead>
      <tbody>
        <tr
          v-for="a in sortedAliases"
          :key="a.key"
          class="border-b border-(--ui-border)"
        >
          <td class="px-2 py-2 font-medium">
            {{ a.label }}
          </td>
          <td class="px-2 py-2">
            <div class="flex gap-0.5">
              <div
                v-for="s in TABLE_SHADES"
                :key="s"
                class="h-4 w-4 rounded-[2px]"
                :style="{ backgroundColor: `var(--ui-color-${a.key}-${s})` }"
                :title="`${a.key}-${s}`"
              />
            </div>
          </td>
          <td class="px-2 py-2 font-mono text-xs">
            {{ a.ratio.toFixed(2) }}
          </td>
          <td class="px-2 py-2 text-xs">
            {{ a.compliance }}
          </td>
        </tr>
      </tbody>
    </table>
  </div>
</template>

<style scoped>
.palette-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 1rem;
  padding-bottom: 2rem;
  width: 100%;
}
.palette-list {
  display: flex;
  flex-direction: column;
  gap: 1rem;
  padding-bottom: 2rem;
  width: 100%;
}
.palette-pixel {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(180px, 1fr));
  gap: 0.5rem;
  padding-bottom: 2rem;
  width: 100%;
}
.grid-item {
  width: 100%;
}
</style>
