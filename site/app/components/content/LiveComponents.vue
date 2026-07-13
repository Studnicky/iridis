<script setup lang="ts">
import { computed, ref } from 'vue';
import { useIridis } from '~/composables/useIridis.ts';
import { ALIAS_COLOR_NAMES, type AliasColorType } from '~/theme/Tokens.ts';

/**
 * Live Nuxt UI component surface, themed by the engine's --ui-* tokens — and
 * genuinely functional, not decorative: each button fires a real UToast,
 * "Add alert" pushes a real dismissible UAlert, the table below reads the
 * actual resolved-role palette. Interactive/toggleable controls (switches,
 * radios, checkboxes, tabs, accordion, pagination) live in the separate
 * Interactables card instead of here. Laid out as a 2-column grid of
 * bordered sections so a wide card doesn't strand most of its width as
 * empty space.
 */
const toast = useToast();
const { sortedRoleContrastRows } = useIridis();

const COLORS = ALIAS_COLOR_NAMES;
type ColorType = AliasColorType;

function fireToast(color: ColorType): void {
  toast.add({
    'color':       color,
    'description': `A live UToast in the ${color} color — engine-themed, not a mockup.`,
    'icon':        'i-material-symbols-notifications-rounded',
    'title':       `${color[0]!.toUpperCase()}${color.slice(1)} toast`
  });
}

type AlertType = { 'color': ColorType; 'id': number; 'title': string };
const alerts = ref<AlertType[]>([]);
let alertId = 0;
function addAlert(): void {
  const color = COLORS[alerts.value.length % COLORS.length]!;
  alerts.value = [...alerts.value, { color, 'id': alertId++, 'title': `Dismissible ${color} alert` }];
}
function removeAlert(id: number): void {
  alerts.value = alerts.value.filter((a) => {return a.id !== id;});
}

const BUTTON_VARIANTS = ['solid', 'soft', 'outline', 'ghost'] as const;
const variantClicks = ref<Record<string, number>>({});
function fireVariant(variant: string, color: ColorType): void {
  const key = `${variant}-${color}`;
  variantClicks.value = { ...variantClicks.value, [key]: (variantClicks.value[key] ?? 0) + 1 };
}

const formName = ref('');
const formSubmitted = ref(false);
function submitForm(): void {
  formSubmitted.value = formName.value.trim().length > 0;
  if (formSubmitted.value) {
    toast.add({
      'color':       'primary',
      'description': `Hello, ${formName.value.trim()} — a real form submission.`,
      'title':       'Form submitted'
    });
  }
}

/** UTable — the current sort's top 6 rows, so this table itself demonstrates the shared roleSortKeys ordering. */
const tableRows = computed(() => sortedRoleContrastRows.value.slice(0, 6));
const tableColumns = [
  { 'accessorKey': 'name', 'header': 'Role' },
  { 'accessorKey': 'hex', 'header': 'Hex' },
  { 'accessorKey': 'ratio', 'header': 'Ratio' },
  { 'accessorKey': 'compliance', 'header': 'Compliance' }
];

const breadcrumbItems = [
  { 'label': 'iridis', 'icon': 'i-material-symbols-home-rounded' },
  { 'label': 'Components' },
  { 'label': 'Live demo' }
];
</script>

<template>
  <div class="grid grid-cols-1 gap-4 lg:grid-cols-2">
    <div class="rounded-lg border border-default p-3">
      <div class="mb-2 text-xs font-medium uppercase tracking-wide text-dimmed">
        Click to fire a real UToast
      </div>
      <BalancedWrap :items="[...COLORS]" :min-width="80" :gap="8">
        <template #default="{ item: c }">
          <UButton
            :color="c"
            class="flex-1 justify-center"
            @click="fireToast(c)"
          >
            {{ c }}
          </UButton>
        </template>
      </BalancedWrap>
    </div>

    <div class="rounded-lg border border-default p-3">
      <div class="mb-2 flex items-center justify-between">
        <span class="text-xs font-medium uppercase tracking-wide text-dimmed">Dismissible alerts</span>
        <UButton
          icon="i-material-symbols-add-rounded"
          size="xs"
          variant="soft"
          @click="addAlert"
        >
          Add alert
        </UButton>
      </div>
      <div
        v-auto-animate
        class="space-y-2"
      >
        <UAlert
          v-for="a in alerts"
          :key="a.id"
          :color="a.color"
          variant="soft"
          :title="a.title"
          close
          @update:open="removeAlert(a.id)"
        />
        <p
          v-if="alerts.length === 0"
          class="text-xs text-dimmed"
        >
          No alerts yet — add one.
        </p>
      </div>
    </div>

    <div class="rounded-lg border border-default p-3">
      <div class="mb-2 text-xs font-medium uppercase tracking-wide text-dimmed">
        Button variants
      </div>
      <div class="space-y-1.5">
        <div
          v-for="variant in BUTTON_VARIANTS"
          :key="variant"
          class="flex items-center gap-1.5"
        >
          <span class="w-14 shrink-0 text-xs text-dimmed">{{ variant }}</span>
          <UButton
            v-for="c in (['primary', 'neutral'] as const)"
            :key="c"
            :color="c"
            :variant="variant"
            size="xs"
            @click="fireVariant(variant, c)"
          >
            {{ variantClicks[`${variant}-${c}`] ?? 0 }}
          </UButton>
        </div>
      </div>
    </div>

    <div class="rounded-lg border border-default p-3">
      <div class="mb-2 text-xs font-medium uppercase tracking-wide text-dimmed">
        Live form
      </div>
      <form
        class="flex items-end gap-2"
        @submit.prevent="submitForm"
      >
        <UFormField
          label="Name"
          class="flex-1"
          :error="formSubmitted && !formName.trim() ? 'Required' : undefined"
        >
          <UInput
            v-model="formName"
            placeholder="Your name"
            size="sm"
          />
        </UFormField>
        <UButton
          type="submit"
          size="sm"
        >
          Submit
        </UButton>
      </form>
    </div>

    <div class="rounded-lg border border-default p-3 lg:col-span-2">
      <div class="mb-2 text-xs font-medium uppercase tracking-wide text-dimmed">
        UTable — top of the current sort ({{ tableRows.length }} of {{ sortedRoleContrastRows.length }} roles)
      </div>
      <UTable :data="tableRows" :columns="tableColumns">
        <template #hex-cell="{ row }">
          <span class="inline-flex items-center gap-1.5 font-mono text-xs">
            <span class="h-3 w-3 rounded-full border border-default" :style="{ backgroundColor: row.original.hex }" />
            {{ row.original.hex }}
          </span>
        </template>
        <template #ratio-cell="{ row }">
          {{ row.original.ratio.toFixed(2) }}
        </template>
        <template #compliance-cell="{ row }">
          <UBadge
            size="xs"
            variant="soft"
            :color="row.original.compliance === 'AAA' ? 'success' : row.original.compliance === 'AA' ? 'primary' : 'neutral'"
          >
            {{ row.original.compliance }}
          </UBadge>
        </template>
      </UTable>
    </div>

    <div class="rounded-lg border border-default p-3 space-y-2 lg:col-span-2">
      <div class="text-xs font-medium uppercase tracking-wide text-dimmed">
        Dropdown, tooltip &amp; popover
      </div>
      <div class="flex flex-wrap items-center gap-2">
        <UDropdownMenu :items="[[{ 'label': 'Duplicate' }, { 'label': 'Rename' }], [{ 'label': 'Delete', 'color': 'error' }]]">
          <UButton variant="soft" size="xs" trailing-icon="i-material-symbols-keyboard-arrow-down-rounded">
            Actions
          </UButton>
        </UDropdownMenu>
        <UTooltip text="Real tooltip, engine-themed border/background">
          <UButton variant="outline" size="xs">Hover me</UButton>
        </UTooltip>
        <UPopover>
          <UButton variant="ghost" size="xs">Popover</UButton>
          <template #content>
            <p class="p-2 text-xs text-muted">Live popover content.</p>
          </template>
        </UPopover>
        <UKbd>⌘</UKbd>
        <UKbd>K</UKbd>
      </div>
      <UBreadcrumb :items="breadcrumbItems" />
    </div>
  </div>
</template>
