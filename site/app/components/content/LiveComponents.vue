<script setup lang="ts">
import { computed, ref } from 'vue';
import { useIridis } from '~/composables/useIridis.ts';
import { contrastRatio } from '~/theme/ContrastRatio.ts';

/**
 * Live Nuxt UI component surface, themed by the engine's --ui-* tokens — and
 * genuinely functional, not decorative: each button fires a real UToast,
 * "Add alert" pushes a real dismissible UAlert, and the progress bar tracks
 * the actual percentage of resolved roles meeting the active contrast target.
 */
const shades = [50, 100, 200, 300, 400, 500, 600, 700, 800, 900, 950];
const toast = useToast();
const { roleViews, roles, contrastStrictness } = useIridis();

const COLORS = ['primary', 'secondary', 'success', 'warning', 'error', 'info', 'neutral'] as const;
type ColorType = (typeof COLORS)[number];

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

const bg = computed<string>(() => roles.value['background'] ?? '#000000');
const target = computed<number>(() => (contrastStrictness.value === 1 ? 7 : 4.5));
const complianceLabel = computed(() => ['AA', 'AAA', 'APCA'][contrastStrictness.value] ?? 'AA');
const compliancePct = computed<number>(() => {
  if (roleViews.value.length === 0) {return 0;}
  const passing = roleViews.value.filter((r) => {return contrastRatio(r.hex, bg.value) >= target.value;}).length;
  return Math.round((passing / roleViews.value.length) * 100);
});
</script>

<template>
  <div class="space-y-5">
    <div>
      <div class="mb-2 text-xs font-medium text-muted">
        Click to fire a real UToast
      </div>
      <BalancedWrap :items="[...COLORS]" :min-width="80" :gap="8">
        <template #default="{ item: c }">
          <UButton
            :color="c"
            @click="fireToast(c)"
            class="flex-1 justify-center"
          >
            {{ c }}
          </UButton>
        </template>
      </BalancedWrap>
    </div>

    <div>
      <div class="mb-2 flex items-center justify-between">
        <span class="text-xs font-medium text-muted">Dismissible alerts</span>
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

    <div class="space-y-1">
      <div class="flex items-center justify-between text-xs font-medium text-muted">
        <span>{{ complianceLabel }} compliance</span>
        <span>{{ compliancePct }}%</span>
      </div>
      <UProgress :model-value="compliancePct" />
    </div>

    <div class="space-y-1">
      <div class="text-xs font-medium text-muted">
        Primary scale
      </div>
      <div class="flex gap-0.5">
        <div
          v-for="s in shades"
          :key="s"
          class="h-8 flex-1 rounded"
          :style="{ backgroundColor: `var(--ui-color-primary-${s})` }"
          :title="`primary-${s}`"
        />
      </div>
    </div>
  </div>
</template>
