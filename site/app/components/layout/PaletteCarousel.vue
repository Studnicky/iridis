<script setup lang="ts">
import { computed } from 'vue';
import { colorRecordFactory } from '@studnicky/iridis';
import { useIridis } from '~/composables/useIridis.ts';
import { ALIAS_COLOR_NAMES, Tokens } from '~/theme/Tokens.ts';
import { contrastRatio } from '~/theme/ContrastRatio.ts';
import { complianceFor, sortRoleRows } from '~/utils/roleSort.ts';

const ALIASES = ALIAS_COLOR_NAMES.map((key) => ({ key, 'label': `${key[0]!.toUpperCase()}${key.slice(1)}` }));

/** Same sort as every other role listing on the page — an alias's sort row is its base (500-shade) resolved color, the same hex ScaleCard shows as this alias's representative swatch. */
const { roles, scales, roleSortKeys } = useIridis();

const sortedAliases = computed(() => {
  const bg = roles.value['background'] ?? '#000000';
  const rows = ALIASES.map((a) => {
    const hex = Tokens.resolveAliasShadeHex(roles.value, scales.value, a.key, 500) ?? '#888888';
    const oklch = colorRecordFactory.fromHex(hex).oklch;
    const ratio = contrastRatio(hex, bg);
    return { ...a, 'c': oklch.c, 'compliance': complianceFor(ratio), 'h': oklch.h, 'l': oklch.l, 'name': a.key, ratio };
  });
  return sortRoleRows(rows, roleSortKeys.value);
});
</script>

<template>
  <div class="space-y-3">
    <RoleSortControls />
    <div class="palette-grid">
      <div
        v-for="a in sortedAliases"
        :key="a.key"
        class="grid-item"
      >
        <ScaleCard :alias="a" />
      </div>
    </div>
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
.grid-item {
  width: 100%;
}
</style>
