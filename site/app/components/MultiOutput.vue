<script setup lang="ts">
import { ref, computed } from 'vue';
import { Engine, coreTasks } from '@studnicky/iridis';
import { contrastPlugin } from '@studnicky/iridis-contrast';
import { stylesheetPlugin } from '@studnicky/iridis-stylesheet';
import { tailwindPlugin } from '@studnicky/iridis-tailwind';
import { rdfPlugin } from '@studnicky/iridis-rdf';
import { useIridis } from '~/composables/useIridis.ts';
import { roleSchemaByName } from '~/theme/roleSchemas.ts';

/**
 * One palette, many outputs. The same resolved seeds are emitted as cascading CSS
 * variables, a Tailwind theme config, and an RDF graph — demonstrating that
 * output targets are plugins over one engine run.
 */
const { seeds, framing, schemaName } = useIridis();
const outputs = ref<Array<{ label: string; lang: string; text: string }>>([]);
const running = ref<boolean>(false);
const done = ref<boolean>(false);

function stringify(v: unknown): string {
  if (typeof v === 'string') return v;
  if (v && typeof v === 'object' && 'full' in (v as Record<string, unknown>)) return String((v as Record<string, unknown>)['full']);
  return JSON.stringify(v, null, 2);
}

async function generate(): Promise<void> {
  running.value = true;
  try {
    const engine = new Engine();
    for (const t of coreTasks) engine.tasks.register(t);
    engine.adopt(contrastPlugin);
    engine.adopt(stylesheetPlugin);
    engine.adopt(tailwindPlugin);
    engine.adopt(rdfPlugin);
    engine.pipeline([
      'intake:hex', 'resolve:roles', 'expand:family', 'enforce:contrast',
      'emit:cssVars', 'emit:tailwindTheme', 'reason:annotate', 'reason:serialize',
    ]);
    const pair = roleSchemaByName[schemaName.value] ?? roleSchemaByName['iridis-16'];
    const st = await engine.run({
      'colors':   seeds.value,
      'roles':    pair![framing.value],
      'contrast': { 'level': 'AA', 'algorithm': 'wcag21' },
      'runtime':  { 'framing': framing.value, 'colorSpace': 'srgb' },
    });
    const out = st.outputs as Record<string, unknown>;
    const rows: Array<{ label: string; lang: string; text: string }> = [];
    if (out['stylesheet:cssVars']) rows.push({ 'label': 'CSS variables', 'lang': 'css', 'text': stringify(out['stylesheet:cssVars']) });
    if (out['tailwind:theme']) rows.push({ 'label': 'Tailwind config', 'lang': 'json', 'text': stringify(out['tailwind:theme']) });
    const rdf = out['rdf:reasoningGraph'] ?? out['rdf:serialized'] ?? Object.entries(out).find(([k]) => k.startsWith('rdf'))?.[1];
    if (rdf) rows.push({ 'label': 'RDF graph', 'lang': 'turtle', 'text': stringify(rdf) });
    outputs.value = rows;
    done.value = true;
  } catch (e) {
    outputs.value = [{ 'label': 'Error', 'lang': 'text', 'text': e instanceof Error ? e.message : String(e) }];
  } finally {
    running.value = false;
  }
}

const tabItems = computed(() => outputs.value.map((o, i) => ({ 'label': o.label, 'value': String(i) })));
const active = ref<string>('0');
</script>

<template>
  <UCard>
    <template #header>
      <div class="flex items-center justify-between">
        <span class="font-semibold text-highlighted">Multi-output</span>
        <UButton :loading="running" color="primary" variant="soft" size="sm" @click="generate">
          {{ done ? 'Regenerate' : 'Generate outputs' }}
        </UButton>
      </div>
    </template>
    <div class="space-y-3">
      <p class="text-sm text-muted">
        The same palette emitted through the stylesheet, tailwind, and rdf plugins. VS Code and Capacitor
        targets ship as plugins too.
      </p>
      <template v-if="outputs.length">
        <UTabs v-model="active" :items="tabItems" />
        <pre class="max-h-72 overflow-auto rounded-lg bg-elevated p-3 text-xs"><code>{{ outputs[Number(active)]?.text }}</code></pre>
      </template>
    </div>
  </UCard>
</template>
