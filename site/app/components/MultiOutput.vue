<script setup lang="ts">
import { ref, computed } from 'vue';
import { Engine, coreTasks } from '@studnicky/iridis';
import { contrastPlugin } from '@studnicky/iridis-contrast';
import { stylesheetPlugin } from '@studnicky/iridis-stylesheet';
import { tailwindPlugin } from '@studnicky/iridis-tailwind';
import { useIridis } from '~/composables/useIridis.ts';
import { roleSchemaByName } from '~/theme/roleSchemas.ts';

/**
 * One palette, many outputs. The active seeds are emitted as cascading CSS
 * variables and a Tailwind theme config — output targets are plugins over one
 * synchronous engine run. (VS Code and Capacitor ship as plugins too.)
 */
const { activeSeeds, framing, schemaName } = useIridis();
const outputs = ref<Array<{ label: string; text: string }>>([]);
const done = ref<boolean>(false);

function stringify(v: unknown): string {
  if (typeof v === 'string') return v;
  if (v && typeof v === 'object' && 'full' in (v as Record<string, unknown>)) return String((v as Record<string, unknown>)['full']);
  return JSON.stringify(v, null, 2);
}

function generate(): void {
  const engine = new Engine();
  for (const t of coreTasks) engine.tasks.register(t);
  engine.adopt(contrastPlugin);
  engine.adopt(stylesheetPlugin);
  engine.adopt(tailwindPlugin);
  engine.pipeline(['intake:hex', 'resolve:roles', 'expand:family', 'enforce:contrast', 'emit:cssVars', 'emit:tailwindTheme']);
  const pair = roleSchemaByName[schemaName.value] ?? roleSchemaByName['iridis-16'];
  const st = engine.run({
    'colors':   activeSeeds.value,
    'roles':    pair![framing.value],
    'contrast': { 'level': 'AA', 'algorithm': 'wcag21' },
    'runtime':  { 'framing': framing.value, 'colorSpace': 'srgb' },
  });
  const out = st.outputs as Record<string, unknown>;
  const rows: Array<{ label: string; text: string }> = [];
  if (out['stylesheet:cssVars']) rows.push({ 'label': 'CSS variables', 'text': stringify(out['stylesheet:cssVars']) });
  if (out['tailwind:theme']) rows.push({ 'label': 'Tailwind config', 'text': stringify(out['tailwind:theme']) });
  outputs.value = rows;
  done.value = true;
}

const tabItems = computed(() => outputs.value.map((o, i) => ({ 'label': o.label, 'value': String(i) })));
const active = ref<string>('0');
</script>

<template>
  <UCard>
    <template #header>
      <div class="flex items-center justify-between">
        <span class="font-semibold text-highlighted">Multi-output</span>
        <UButton color="primary" variant="soft" size="sm" @click="generate">{{ done ? 'Regenerate' : 'Generate outputs' }}</UButton>
      </div>
    </template>
    <div class="space-y-3">
      <p class="text-sm text-muted">
        The same palette emitted through the stylesheet and tailwind plugins. VS Code and Capacitor
        targets ship as plugins too.
      </p>
      <template v-if="outputs.length">
        <UTabs v-model="active" :items="tabItems" :content="false" />
        <pre class="max-h-72 overflow-auto rounded-lg bg-elevated p-3 text-xs"><code>{{ outputs[Number(active)]?.text }}</code></pre>
      </template>
    </div>
  </UCard>
</template>
