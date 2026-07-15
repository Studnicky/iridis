<script setup lang="ts">
import { computed, ref } from 'vue';
import { useIridis } from '~/composables/useIridis.ts';
import { ALIAS_COLOR_NAMES } from '~/theme/aliasColorNames.ts';
import type { AliasColorType } from '~/theme/types/aliasColor.ts';

/**
 * Toggleable/selectable Nuxt UI controls — split out of the Components card
 * so switches/radios/checkboxes/tabs/accordion/pagination (things you
 * interact WITH to change what's displayed) aren't crowded in beside
 * one-shot action components (buttons/toasts/forms). Each avatar+badge pair
 * below is wrapped in its own flex item — two independent children per
 * iteration inside one `flex flex-wrap` parent wrap at the child level, not
 * the pair level, which is what previously interleaved them.
 */
const { roleViews, roles, contrastStrictness, sortedRoleContrastRows, contrastReport } = useIridis();

const COLORS = ALIAS_COLOR_NAMES;
type ColorType = AliasColorType;

const notifyEnabled = ref(true);
const density = ref('cozy');
const densityOptions = ['compact', 'cozy', 'spacious'];

/** A real filter applied to the avatar/badge row below, not decoration. */
const checkedColors = ref<ColorType[]>(['primary', 'success', 'error']);

// 'background' is required in every schema tier and resolved synchronously
// before any component reads this — never a hardcoded placeholder.
const bg = computed<string>(() => roles.value['background']!);
const complianceLabel = computed(() => ['AA', 'AAA', 'APCA'][contrastStrictness.value] ?? 'AA');
/** Under AA/AAA (strictness 0/1) reads the same sortedRoleContrastRows every
 * other compliance display on the page reads — never a second independent
 * contrastRatio() sweep, so this stat can't silently diverge from Roles
 * table / Resolved roles / Clamps if complianceFor()'s thresholds ever
 * change. Under APCA (strictness 2) the WCAG-derived `compliance` field
 * on those rows doesn't reflect the enforced APCA Lc target at all, so this
 * reads contrastReport.apca.pairs instead — the same APCA result set
 * SchemaComplianceCard and PipelineExplainer render as "X/Y pairs passing" —
 * so the label 'APCA' next to this number always matches the metric behind it. */
const compliancePct = computed<number>(() => {
  if (contrastStrictness.value === 2) {
    const pairs = contrastReport.value.apca?.pairs ?? [];
    if (pairs.length === 0) {return 0;}
    const passing = pairs.filter((p) => {return p.pass;}).length;
    return Math.round((passing / pairs.length) * 100);
  }
  const rows = sortedRoleContrastRows.value;
  if (rows.length === 0) {return 0;}
  const passing = rows.filter((r) => {return contrastStrictness.value === 1 ? r.compliance === 'AAA' : r.compliance !== 'fail';}).length;
  return Math.round((passing / rows.length) * 100);
});

/** UTabs — three real panels, not placeholder text. */
const tabItems = [
  { 'label': 'Overview', 'slot': 'overview' },
  { 'label': 'Roles', 'slot': 'rolesTab' },
  { 'label': 'Contrast', 'slot': 'contrastTab' }
];

/** UAccordion — live, not mock copy: each item's content reads real engine state. */
const accordionItems = computed(() => [
  { 'label': 'Resolved roles', 'content': `${roleViews.value.length} roles currently resolved.` },
  { 'label': 'Compliance target', 'content': `${complianceLabel.value} — ${compliancePct.value}% of roles passing.` },
  { 'label': 'Background', 'content': `Current background role hex: ${bg.value}.` }
]);

/** UPagination over the same sorted role list Components' UTable uses. */
const page = ref(1);
const pageSize = 8;
const pageRoles = computed(() => sortedRoleContrastRows.value.slice((page.value - 1) * pageSize, page.value * pageSize));
</script>

<template>
  <div class="grid grid-cols-1 gap-4 lg:grid-cols-2">
    <div class="rounded-lg border border-default p-3 space-y-3">
      <div class="text-xs font-medium uppercase tracking-wide text-dimmed">
        Switch &amp; radio
      </div>
      <div class="flex items-center justify-between">
        <span class="text-xs text-muted">Notifications</span>
        <USwitch v-model="notifyEnabled" />
      </div>
      <URadioGroup
        v-model="density"
        :items="densityOptions"
        orientation="horizontal"
        size="sm"
      />
    </div>

    <div class="rounded-lg border border-default p-3 space-y-2">
      <div class="text-xs font-medium uppercase tracking-wide text-dimmed">
        Checkbox group — filters the avatars/badges card
      </div>
      <UCheckboxGroup
        v-model="checkedColors"
        :items="[...COLORS]"
        orientation="horizontal"
        size="sm"
        :ui="{ fieldset: 'flex flex-wrap gap-x-4 gap-y-2' }"
      />
    </div>

    <div class="rounded-lg border border-default p-3 lg:col-span-2">
      <div class="mb-2 text-xs font-medium uppercase tracking-wide text-dimmed">
        Avatars &amp; badges — filtered by the checkboxes above
      </div>
      <div class="flex flex-wrap items-center gap-3">
        <div
          v-for="c in checkedColors"
          :key="c"
          class="flex items-center gap-1.5"
        >
          <UAvatar
            :alt="c"
            size="sm"
            :ui="{ root: `bg-[var(--ui-color-${c}-500)] text-[var(--ui-color-${c}-50)]` }"
          >
            {{ c[0]?.toUpperCase() }}
          </UAvatar>
          <UBadge
            :color="c"
            variant="subtle"
            size="sm"
          >
            {{ c }}
          </UBadge>
        </div>
        <span
          v-if="checkedColors.length === 0"
          class="text-xs text-dimmed italic"
        >Check a color above to show it here.</span>
      </div>
    </div>

    <div class="rounded-lg border border-default p-3 lg:col-span-2">
      <div class="mb-2 text-xs font-medium uppercase tracking-wide text-dimmed">
        UTabs
      </div>
      <UTabs
        :items="tabItems"
        size="sm"
      >
        <template #overview>
          <p class="p-2 text-sm text-muted">
            {{ roleViews.length }} roles resolved · background <code class="font-mono text-xs">{{ bg }}</code> · compliance target {{ complianceLabel }}.
          </p>
        </template>
        <template #rolesTab>
          <div class="flex flex-wrap gap-1 p-2">
            <span
              v-for="r in roleViews.slice(0, 16)"
              :key="r.name"
              class="h-5 w-5 rounded border border-default"
              :style="{ backgroundColor: r.hex }"
              :title="r.name"
            />
          </div>
        </template>
        <template #contrastTab>
          <div class="p-2">
            <UProgress :model-value="compliancePct" />
            <p class="mt-1 text-xs text-muted">
              {{ compliancePct }}% of roles meet {{ complianceLabel }}.
            </p>
          </div>
        </template>
      </UTabs>
    </div>

    <div class="rounded-lg border border-default p-3">
      <div class="mb-2 text-xs font-medium uppercase tracking-wide text-dimmed">
        UAccordion
      </div>
      <UAccordion :items="accordionItems">
        <template #body="{ item }">
          <p class="text-xs text-muted">
            {{ item.content }}
          </p>
        </template>
      </UAccordion>
    </div>

    <div class="rounded-lg border border-default p-3">
      <div class="mb-2 flex items-center justify-between text-xs font-medium uppercase tracking-wide text-dimmed">
        <span>UPagination — same sorted role list Components' table uses</span>
      </div>
      <div class="mb-2 flex flex-wrap gap-1">
        <span
          v-for="r in pageRoles"
          :key="r.name"
          class="h-5 w-5 rounded border border-default"
          :style="{ backgroundColor: r.hex }"
          :title="r.name"
        />
      </div>
      <UPagination
        v-model:page="page"
        :total="sortedRoleContrastRows.length"
        :items-per-page="pageSize"
        size="xs"
      />
    </div>

    <div class="rounded-lg border border-default p-3 lg:col-span-2">
      <div class="mb-1 flex items-center justify-between text-xs font-medium uppercase tracking-wide text-dimmed">
        <span>{{ complianceLabel }} compliance</span>
        <span>{{ compliancePct }}%</span>
      </div>
      <UProgress :model-value="compliancePct" />
    </div>
  </div>
</template>
