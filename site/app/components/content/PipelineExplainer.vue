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
    <p class="mb-3 text-sm text-muted">
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

    <p class="mt-4 text-sm text-muted">
      Every useful iridis pipeline passes through four conceptual stages &mdash;
      <span class="font-mono text-xs">intake &rarr; resolve &rarr; enforce &rarr; emit</span> &mdash; even though the
      task names and order above are yours to define. See
      <a href="#02-the-four-stages" class="text-primary hover:underline">The Four Stages</a> below for the data flow,
      the registry, and how plugins contribute optional stages.
    </p>
  </UCard>
</template>
