<script setup lang="ts">
import { IridisUiActionType } from '~/composables/types/index.ts';
import { computed } from 'vue';
import { coreTasks } from '@studnicky/iridis';
import { contrastPlugin } from '@studnicky/iridis-contrast';
import { AccordionContent, AccordionHeader, AccordionItem, AccordionRoot, AccordionTrigger } from 'reka-ui';
import { COLOR_PIPELINE, OPTIONAL_STAGE_NAMES, useIridis } from '~/composables/useIridis.ts';
import { intakeHexHint } from '~/theme/IntakeHexHint.ts';
import { pinDerivedRoles } from '~/theme/PinDerivedRoles.ts';
import { useIridisUiMachine } from '~/composables/useIridisUiMachine.ts';

/**
 * The actual pipeline this site runs on every palette change, walked stage by
 * stage — each panel's description is pulled straight from that task's own
 * `manifest.description` (registered in the engine, not copy-pasted here), so
 * this stays truthful if a task's manifest ever changes.
 */
const TASKS_BY_NAME = new Map([...coreTasks, intakeHexHint, pinDerivedRoles, ...contrastPlugin.tasks()].map((t) => {return [t.name, t] as const;}));

const { enabledOptionalStages, cvdCorrect, contrastReport } = useIridis();
const { send } = useIridisUiMachine();


type ContrastPairsType = { pairs: { foreground: string; background: string; before: number; after: number; required: number; pass: boolean; algorithm: string }[] };
type CvdReportType = {
  warnings: unknown[];
  corrections?: { foreground: string; background: string; cvdTypesFixed: string[]; cvdTypesRemaining: string[] }[];
};

const stages = computed(() => COLOR_PIPELINE.map((name, i) => {
  const task = TASKS_BY_NAME.get(name);
  return {
    'label': `${i + 1}. ${name}`,
    'description': task?.manifest?.description ?? '(task not registered)',
    'optional': OPTIONAL_STAGE_NAMES.includes(name),
    'reads': task?.manifest?.reads ?? [],
    'value': name,
    'writes': task?.manifest?.writes ?? []
  };
}));

/** Pass/fail count summary for a WCAG-shaped (aa/aaa) or APCA-shaped contrast report entry. */
function pairSummary(report: unknown): string {
  const { pairs } = report as ContrastPairsType;
  const passing = pairs.filter((p) => {return p.pass;}).length;
  return `${passing}/${pairs.length} pairs passing`;
}

/** "N auto-corrected, M still failing" derived from a CVD report's corrections list. */
function cvdCorrectionSummary(report: unknown): string | undefined {
  const { corrections } = report as CvdReportType;
  if (corrections === undefined) {return undefined;}
  const autoCorrected = corrections.filter((c) => {return c.cvdTypesRemaining.length === 0;}).length;
  const stillFailing = corrections.filter((c) => {return c.cvdTypesRemaining.length > 0;}).length;
  return `${autoCorrected} pairs auto-corrected, ${stillFailing} still failing`;
}

const dataFlowDiagram = `flowchart TD
    A["input.colors\\n(raw strings / objects)"]
    B["state.colors\\n(ColorRecord[])"]
    C["state.roles\\n(Record<string, ColorRecord>)"]
    D["state.roles\\n(contrast-adjusted)"]
    E["state.variants\\n(light / dark)"]
    F["state.outputs\\n(cssVars, themeJson, capacitor ...)"]

    A -->|intake tasks| B
    B -->|resolve:roles| C
    C -->|enforce:contrast| D
    D -->|derive:variant| E
    D -->|emit tasks| F
    E -->|emit tasks| F`;

/** Stage names actually present in the accordion above, grouped by their `phase:task` prefix. */
const stageNamesByPrefix = computed(() => {
  const byPrefix = new Map<string, string[]>();
  for (const stage of stages.value) {
    const prefix = stage.value.split(':')[0] ?? stage.value;
    const list = byPrefix.get(prefix) ?? [];
    list.push(stage.value);
    byPrefix.set(prefix, list);
  }
  return byPrefix;
});
const enforceStageNames = computed(() => stageNamesByPrefix.value.get('enforce') ?? []);
</script>

<template>
  <UCard>
    <template #header>
      <div class="grid grid-cols-[1fr_auto_1fr] items-center gap-2">
        <span />
        <span class="text-center font-semibold text-highlighted">Pipeline</span>
        <span />
      </div>
    </template>
    
    <p class="mb-3 mt-6 text-sm text-muted">
      Expand a stage — the description underneath is that task's own manifest, not marketing copy.
      Optional stages are automatically switched on or off depending on the compliance strictness setting.
    </p>
    <AccordionRoot
      type="multiple"
      class="w-full"
    >
      <AccordionItem
        v-for="stage in stages"
        :key="stage.value"
        :value="stage.value"
        class="border-b border-default"
      >
        <AccordionHeader class="flex items-center gap-2">
          <AccordionTrigger class="flex flex-1 items-center gap-2 py-3 text-left hover:text-highlighted">
            <span class="font-medium">{{ stage.label }}</span>
            <UIcon
              name="i-lucide-chevron-down"
              class="ml-auto size-4 transition-transform data-[state=open]:rotate-180"
            />
          </AccordionTrigger>
          <UBadge
            v-if="stage.optional"
            :color="enabledOptionalStages.has(stage.value) ? 'primary' : 'neutral'"
            :variant="enabledOptionalStages.has(stage.value) ? 'soft' : 'subtle'"
            size="sm"
          >
            {{ enabledOptionalStages.has(stage.value) ? 'enabled' : 'disabled' }}
          </UBadge>
          <UBadge
            v-else
            color="neutral"
            variant="subtle"
            size="sm"
          >
            required
          </UBadge>
        </AccordionHeader>
        <AccordionContent class="pb-4">
          <p class="mb-2 text-sm text-muted">
            {{ stage.description }}
          </p>
          <div class="flex flex-wrap gap-3 text-xs">
            <div v-if="stage.reads.length">
              <span class="text-dimmed">reads </span>
              <UBadge
                v-for="r in stage.reads"
                :key="r"
                color="neutral"
                variant="soft"
                size="xs"
                class="mr-1 font-mono"
              >
                {{ r }}
              </UBadge>
            </div>
            <div v-if="stage.writes.length">
              <span class="text-dimmed">writes </span>
              <UBadge
                v-for="w in stage.writes"
                :key="w"
                color="primary"
                variant="soft"
                size="xs"
                class="mr-1 font-mono"
              >
                {{ w }}
              </UBadge>
            </div>
          </div>

          <div
            v-if="stage.value === 'enforce:cvdSimulate' && enabledOptionalStages.has('enforce:cvdSimulate')"
            class="mt-3 flex items-center justify-between rounded-md border border-default p-2 pl-3"
          >
            <span class="text-sm">Auto-correct failing pairs</span>
            <USwitch
              :model-value="cvdCorrect"
              @update:model-value="send({ type: IridisUiActionType.SET_CVD_CORRECT, cvdCorrect: $event as boolean })"
            />
          </div>

          <div
            v-if="stage.value === 'enforce:wcagAA' && enabledOptionalStages.has('enforce:wcagAA') && contrastReport.aa !== undefined"
            class="mt-3 text-xs text-muted"
          >
            {{ pairSummary(contrastReport.aa) }}
          </div>
          <div
            v-if="stage.value === 'enforce:wcagAAA' && enabledOptionalStages.has('enforce:wcagAAA') && contrastReport.aaa !== undefined"
            class="mt-3 text-xs text-muted"
          >
            {{ pairSummary(contrastReport.aaa) }}
          </div>
          <div
            v-if="stage.value === 'enforce:apca' && enabledOptionalStages.has('enforce:apca') && contrastReport.apca !== undefined"
            class="mt-3 text-xs text-muted"
          >
            {{ pairSummary(contrastReport.apca) }}
          </div>
          <div
            v-if="stage.value === 'enforce:cvdSimulate' && enabledOptionalStages.has('enforce:cvdSimulate') && contrastReport.cvd !== undefined"
            class="mt-3 flex flex-wrap items-center gap-1.5"
          >
            <UBadge
              color="neutral"
              variant="soft"
              size="xs"
            >
              {{ (contrastReport.cvd as { warnings: unknown[] }).warnings.length }} warnings
            </UBadge>
            <UBadge
              v-if="cvdCorrectionSummary(contrastReport.cvd) !== undefined"
              color="primary"
              variant="soft"
              size="xs"
            >
              {{ cvdCorrectionSummary(contrastReport.cvd) }}
            </UBadge>
          </div>
        </AccordionContent>
      </AccordionItem>
    </AccordionRoot>

    <div class="mt-8 border-t border-default pt-6">
      <h3 class="text-sm font-semibold text-highlighted">
        How the pipeline works
      </h3>
      <p class="mt-2 text-sm text-muted">
        iridis is a task pipeline. You register primitives and tasks, declare an execution order, pass an input, and get a
        fully resolved palette out. The engine does not know or care what the pipeline contains &mdash; that is your
        configuration, expressed as the ordered stage list rendered above.
      </p>

      <h4 class="mt-5 text-sm font-semibold text-highlighted">
        The four conceptual stages
      </h4>
      <p class="mt-2 text-sm text-muted">
        Every useful iridis pipeline passes through four conceptual stages, even though the task names above are explicit
        and the order is yours to define: <span class="font-mono text-xs">intake &rarr; resolve &rarr; enforce &rarr; emit</span>.
        This site's live pipeline runs
        <UBadge
          v-for="name in stageNamesByPrefix.get('intake') ?? []"
          :key="name"
          color="neutral"
          variant="soft"
          size="xs"
          class="mx-0.5 font-mono"
        >
          {{ name }}
        </UBadge>
        for intake, then
        <UBadge
          v-for="name in stageNamesByPrefix.get('resolve') ?? []"
          :key="name"
          color="neutral"
          variant="soft"
          size="xs"
          class="mx-0.5 font-mono"
        >
          {{ name }}
        </UBadge>
        to assign colors to named roles, then walks the {{ enforceStageNames.length }} enforce stages listed above
        (<span class="font-mono text-xs">{{ enforceStageNames.join(', ') }}</span>) to nudge foreground colors until
        every contrast pair meets its required ratio. Emit tasks aren't part of this palette-building pipeline &mdash;
        they run afterward, writing the resolved state into consumer-shaped output such as CSS variables, a VS Code
        theme JSON, or Capacitor status bar parameters.
      </p>

      <h4 class="mt-5 text-sm font-semibold text-highlighted">
        The data flow
      </h4>
      <p class="mt-2 text-sm text-muted">
        Each stage above reads from and writes to a shared, mutable state object. The <span class="font-mono text-xs">reads</span>
        and <span class="font-mono text-xs">writes</span> badges shown per stage are pulled from that task's own manifest,
        the same manifest depicted structurally below:
      </p>
      <MermaidDiagram :code="dataFlowDiagram" />

      <h4 class="mt-5 text-sm font-semibold text-highlighted">
        TaskRegistry, the spine
      </h4>
      <p class="mt-2 text-sm text-muted">
        A <span class="font-mono text-xs">TaskRegistry</span> is a <span class="font-mono text-xs">Map&lt;string, TaskInterface&gt;</span>.
        Every task has a string <span class="font-mono text-xs">name</span> &mdash; the same strings badged above, like
        <span class="font-mono text-xs">'{{ stages[0]?.value }}'</span>. The engine owns one registry instance; when you
        call <span class="font-mono text-xs">engine.pipeline([...])</span> with the stage names in this accordion, it
        validates every name is registered before storing the order, then executes them in that order during
        <span class="font-mono text-xs">engine.run()</span>. Lifecycle hooks (<span class="font-mono text-xs">onRunStart</span>,
        <span class="font-mono text-xs">onRunEnd</span>) let plugins initialize or flush state without occupying a
        pipeline slot.
      </p>

      <h4 class="mt-5 text-sm font-semibold text-highlighted">
        Plugins bring the optional stages
      </h4>
      <p class="mt-2 text-sm text-muted">
        Stages marked <span class="font-medium">required</span> above come from iridis core; stages marked
        <span class="font-medium">optional</span> &mdash; the WCAG AA/AAA, APCA, and CVD simulate enforce stages &mdash;
        are contributed by the <span class="font-mono text-xs">@studnicky/iridis-contrast</span> plugin and switched on
        or off by this site's compliance strictness setting. A plugin is any object satisfying
        <span class="font-mono text-xs">PluginInterface</span> (a <span class="font-mono text-xs">name</span>, a
        <span class="font-mono text-xs">version</span>, and a <span class="font-mono text-xs">tasks()</span> method);
        <span class="font-mono text-xs">engine.adopt(plugin)</span> registers all of a plugin's tasks in one call. iridis
        ships seven plugins beyond the core task set: <span class="font-mono text-xs">@studnicky/iridis-vscode</span>,
        <span class="font-mono text-xs">-stylesheet</span>, <span class="font-mono text-xs">-tailwind</span>,
        <span class="font-mono text-xs">-image</span>, <span class="font-mono text-xs">-contrast</span>,
        <span class="font-mono text-xs">-capacitor</span>, and <span class="font-mono text-xs">-rdf</span>. Each is a
        separate package; install only what a project needs.
      </p>

      <h4 class="mt-5 text-sm font-semibold text-highlighted">
        State as the shared medium
      </h4>
      <p class="mt-2 text-sm text-muted">
        The engine does not enforce dependency ordering at runtime &mdash; that is the pipeline array's job. Each task's
        <span class="font-mono text-xs">manifest</span> documents its <span class="font-mono text-xs">reads</span> and
        <span class="font-mono text-xs">writes</span> for documentation and tooling only. If a task writes
        <span class="font-mono text-xs">state.roles</span> and a later task reads it &mdash; as
        <span class="font-mono text-xs">{{ stageNamesByPrefix.get('resolve')?.[0] }}</span> writes it and the enforce
        stages above read it &mdash; the pipeline order must reflect that dependency; nothing checks it for you.
      </p>
    </div>
  </UCard>
</template>
