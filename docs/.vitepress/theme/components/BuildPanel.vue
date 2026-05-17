<script setup lang="ts">
/**
 * BuildPanel.vue
 *
 * The /build workspace. Layout:
 *
 *   [ Header — title + Reset                        ]
 *   [ BuildResolvedRoles — ALWAYS visible           ]
 *   [ Tabs:                                         ]
 *     - Seed colors    — palette editor / picker
 *     - Image          — drop / extract / sliders
 *     - Role schema    — visual schema editor
 *     - Configuration  — framing / contrast / algo /
 *                        color space / schema picker
 *     - Code           — boilerplate snippets
 *
 * The resolved-roles grid sits above the tab strip because it's the
 * authoritative read-out of the current SPA theme: whatever tab the
 * user is editing in, those cards reflect the live engine output.
 *
 * Every tab — Seed colors, Image, Role schema — writes to the same
 * `configStore`, and they all use the SAME `roleSchema`. Image
 * extraction produces seeds that feed the canonical pipeline; the
 * schema (default iridis-16) declares the roles for ALL pipelines.
 */
import { computed, onMounted, ref, watch } from 'vue';

import Tabs         from 'primevue/tabs';
import TabList      from 'primevue/tablist';
import Tab          from 'primevue/tab';
import TabPanels    from 'primevue/tabpanels';
import TabPanel     from 'primevue/tabpanel';
import SelectButton from 'primevue/selectbutton';
import Select       from 'primevue/select';

import IridisDemo            from './IridisDemo.vue';
import IridisButton          from './base/IridisButton.vue';
import ImageToTheme          from './ImageToTheme.vue';
import RoleSchemaEditor      from './RoleSchemaEditor.vue';
import BuildTabPanel         from './BuildTabPanel.vue';
import BuildConfigFieldPanel from './BuildConfigFieldPanel.vue';
import BuildResolvedRoles    from './BuildResolvedRoles.vue';
import BuildCodePanel        from './BuildCodePanel.vue';
import BuildRoleSchemaGuide  from './BuildRoleSchemaGuide.vue';

import { resetConfig, configStore } from '../stores/configStore.ts';
import { roleSchemaByName }         from '../schemas/roleSchemas.ts';

const ACTIVE_TAB_KEY = 'iridis-build-active-tab';
const VALID_TABS = new Set(['user-palette', 'image', 'role-schema', 'configuration', 'code']);

const FULL_PIPELINE: readonly string[] = [
  'intake:hex',
  'clamp:count',
  'resolve:roles',
  'expand:family',
  'enforce:contrast',
  'enforce:wcagAA',
  'enforce:wcagAAA',
  'enforce:apca',
  'enforce:cvdSimulate',
  'derive:variant',
  'emit:json',
];

const activeTab = ref<string>('user-palette');

onMounted(() => {
  if (typeof window === 'undefined') return;
  try {
    const persisted = window.localStorage.getItem(ACTIVE_TAB_KEY);
    if (typeof persisted === 'string' && VALID_TABS.has(persisted)) {
      activeTab.value = persisted;
    } else if (persisted === 'seed') {
      /* Migrate stale `seed` value to the renamed `user-palette` slug. */
      activeTab.value = 'user-palette';
    }
  } catch { /* noop */ }
});

watch(activeTab, (next) => {
  if (typeof window === 'undefined') return;
  try { window.localStorage.setItem(ACTIVE_TAB_KEY, next); } catch { /* noop */ }
});

function onReset(): void {
  resetConfig();
}

interface OptionInterface { readonly 'label': string; readonly 'value': string }

const framingOptions: readonly OptionInterface[] = [
  { 'label': 'Light', 'value': 'light' },
  { 'label': 'Dark',  'value': 'dark'  },
];
const contrastLevelOptions: readonly OptionInterface[] = [
  { 'label': 'AA',  'value': 'AA'  },
  { 'label': 'AAA', 'value': 'AAA' },
];
const contrastAlgorithmOptions: readonly OptionInterface[] = [
  { 'label': 'WCAG 2.1', 'value': 'wcag21' },
  { 'label': 'APCA Lc',  'value': 'apca'   },
];
const colorSpaceOptions: readonly OptionInterface[] = [
  { 'label': 'sRGB',       'value': 'srgb'      },
  { 'label': 'Display P3', 'value': 'displayP3' },
];
const envelopeOptions: readonly { 'label': string; 'value': boolean }[] = [
  { 'label': 'Strict', 'value': false },
  { 'label': 'Loose',  'value': true  },
];
const roleSchemaOptions = computed<readonly OptionInterface[]>(() => {
  return Object.keys(roleSchemaByName).map((name) => ({ 'label': name, 'value': name }));
});
</script>

<template>
  <ClientOnly>
    <section class="build-panel">
      <header class="build-panel__header">
        <div class="build-panel__header-text">
          <h1 class="build-panel__title">Build</h1>
          <p class="build-panel__sub">
            Five ways into the same engine. The resolved roles below are always live — every tab edits the same schema-bound state. Hit Reset to go back to defaults.
          </p>
        </div>
        <IridisButton
          variant="secondary"
          size="sm"
          class="build-panel__reset"
          title="Restore docsConfigDefaults. Affects every page of the docs."
          @click="onReset"
        >
          Reset to defaults
        </IridisButton>
      </header>

      <Tabs v-model:value="activeTab" class="build-panel__tabs">
        <TabList>
          <Tab value="user-palette"  title="Hex / RGB / OKLCH seeds feed the active role schema.">User palette</Tab>
          <Tab value="image"         title="Drop or paste an image; histogram + cluster pipeline extracts dominant colors as seeds.">Image</Tab>
          <Tab value="role-schema"   title="Compose the role schema the engine enforces — roles, intents, envelopes, contrast pairs.">Role schema</Tab>
          <Tab value="configuration" title="Framing, contrast level, algorithm, color space, and active schema picker.">Configuration</Tab>
          <Tab value="code"          title="Copy-paste-runnable boilerplate that reproduces the current pipeline against the current configStore.">Code</Tab>
        </TabList>
        <TabPanels>
          <TabPanel value="user-palette">
            <BuildTabPanel
              eyebrow="Workflow"
              title="User palette"
              hint="Edit the seed colors directly. Click a swatch to drive the picker; the engine resolves your active schema against these seeds."
            >
              <IridisDemo :pipeline="FULL_PIPELINE" />
            </BuildTabPanel>
          </TabPanel>

          <TabPanel value="image">
            <BuildTabPanel
              eyebrow="Workflow"
              title="Image extraction"
              hint="Drop, paste, or pick a preset image. The histogram + cluster pipeline extracts dominant colors and writes them as the active palette."
            >
              <ImageToTheme />
            </BuildTabPanel>
          </TabPanel>

          <TabPanel value="role-schema">
            <BuildTabPanel
              eyebrow="Workflow"
              title="Role schema"
              hint="Compose the role schema the engine enforces. Each row is a role: name it, set lightness / chroma envelopes, declare contrast pairs."
            >
              <div class="build-panel__role-schema-grid">
                <BuildRoleSchemaGuide class="build-panel__role-schema-guide" />
                <div class="build-panel__role-schema-editor">
                  <RoleSchemaEditor />
                </div>
              </div>
            </BuildTabPanel>
          </TabPanel>

          <TabPanel value="configuration">
            <BuildTabPanel
              eyebrow="Configuration"
              title="Engine knobs"
              hint="Framing, contrast level, algorithm, color space, and active schema picker — every field writes to configStore and themes the docs."
            >
              <div class="build-panel__configuration">
                <BuildConfigFieldPanel
                  leg="Framing"
                  tooltip="Dark frame for museum-style chrome, light for room-style. Every emitter reads this to flip surface colors."
                  class="build-panel__cfg-cell"
                >
                  <SelectButton
                    v-model="configStore.framing"
                    :options="framingOptions"
                    option-label="label"
                    option-value="value"
                    :allow-empty="false"
                  />
                </BuildConfigFieldPanel>

                <BuildConfigFieldPanel
                  leg="Color space"
                  tooltip="sRGB or Display P3 — wide-gamut emitters use this to opt into P3."
                  class="build-panel__cfg-cell"
                >
                  <SelectButton
                    v-model="configStore.colorSpace"
                    :options="colorSpaceOptions"
                    option-label="label"
                    option-value="value"
                    :allow-empty="false"
                  />
                </BuildConfigFieldPanel>

                <BuildConfigFieldPanel
                  leg="Algorithm"
                  tooltip="WCAG 2.1 luminance ratio or APCA Lc perceptual algorithm."
                  class="build-panel__cfg-cell"
                >
                  <SelectButton
                    v-model="configStore.contrastAlgorithm"
                    :options="contrastAlgorithmOptions"
                    option-label="label"
                    option-value="value"
                    :allow-empty="false"
                  />
                </BuildConfigFieldPanel>

                <BuildConfigFieldPanel
                  leg="Contrast level"
                  tooltip="The engine nudges every declared role pair until it satisfies this threshold. AA = 4.5:1 normal text, AAA = 7:1."
                  class="build-panel__cfg-cell"
                >
                  <SelectButton
                    v-model="configStore.contrastLevel"
                    :options="contrastLevelOptions"
                    option-label="label"
                    option-value="value"
                    :allow-empty="false"
                  />
                </BuildConfigFieldPanel>

                <BuildConfigFieldPanel
                  leg="Envelope mode"
                  tooltip="Strict (default): the engine clamps every seed into the role's lightness/chroma envelope. Loose: envelopes act as warnings — the engine still clamps, but the resolved-role cards flag seeds that landed outside their declared range so you can see exactly what the engine adjusted."
                  class="build-panel__cfg-cell build-panel__cfg-cell--wide"
                >
                  <SelectButton
                    v-model="configStore.looseEnvelope"
                    :options="envelopeOptions"
                    option-label="label"
                    option-value="value"
                    :allow-empty="false"
                  />
                </BuildConfigFieldPanel>

                <BuildConfigFieldPanel
                  leg="Role schema"
                  tooltip="Tiers nest: iridis-4 ⊂ iridis-8 ⊂ iridis-12 ⊂ iridis-16 ⊂ iridis-32. Custom-* variants come from the Role schema tab."
                  class="build-panel__cfg-cell build-panel__cfg-cell--wide"
                >
                  <Select
                    v-model="configStore.roleSchema"
                    :options="roleSchemaOptions"
                    option-label="label"
                    option-value="value"
                    class="build-panel__schema-select"
                  />
                </BuildConfigFieldPanel>
              </div>
            </BuildTabPanel>
          </TabPanel>

          <TabPanel value="code">
            <BuildTabPanel
              eyebrow="Output"
              title="Engine code"
              hint="Copy-paste-runnable snippets bound to the current configStore. Seed-driven and image-driven examples both inline the active role schema."
            >
              <BuildCodePanel />
            </BuildTabPanel>
          </TabPanel>
        </TabPanels>
      </Tabs>

      <!-- Resolved-roles grid renders BELOW the tabs as the canonical
           read-out of the live theme. -->
      <BuildResolvedRoles />
    </section>
  </ClientOnly>
</template>

<style scoped>
.build-panel {
  margin: 1rem 0 2rem;
  display: flex;
  flex-direction: column;
  gap: 1.25rem;
}
.build-panel__header {
  display: flex;
  flex-direction: column;
  gap: 0.85rem;
  padding-bottom: 1rem;
  border-bottom: 1px solid var(--vp-c-divider);
}
@container (min-width: 720px) {
  .build-panel__header {
    flex-direction: row;
    align-items: flex-start;
    justify-content: space-between;
  }
}
.build-panel__title {
  margin: 0 0 0.35rem;
  font-size: 2.2rem;
  font-weight: 700;
  letter-spacing: -0.02em;
  border: 0;
  padding: 0;
}
.build-panel__sub {
  margin: 0;
  font-size: 0.95rem;
  color: var(--vp-c-text-2);
  max-width: 60ch;
  line-height: 1.5;
}
.build-panel__reset :deep(.p-button) {
  white-space: nowrap;
}
.build-panel__tabs :deep(.p-tablist) {
  background: var(--vp-c-bg-soft);
  border-bottom: 1px solid var(--vp-c-divider);
  padding: 0.55rem 0.6rem 0;
  border-top-left-radius: var(--iridis-radius-md, 8px);
  border-top-right-radius: var(--iridis-radius-md, 8px);
  display: flex;
  flex-wrap: nowrap;
  overflow-x: auto;
}
.build-panel__tabs :deep(.p-tab) {
  font-size: 0.9rem;
  font-weight: 500;
  padding: 0.55rem 1rem;
  color: var(--vp-c-text-2);
  white-space: nowrap;
  flex: 0 0 auto;
}
.build-panel__tabs :deep(.p-tab[aria-selected="true"]) {
  color: var(--vp-c-brand-1);
  border-bottom-color: var(--vp-c-brand-1);
}
.build-panel__tabs :deep(.p-tabpanels),
.build-panel__tabs :deep(.p-tabpanel) {
  background: transparent;
  padding: 1.25rem 0 0;
  display: flex;
  flex-direction: column;
  gap: 1.25rem;
}
/* Configuration grid:
     row 1: Framing      | Color space
     row 2: Algorithm    | Contrast level
     row 3: Role schema (spans both columns)
   Stacks single-column below 720 px viewport. */
.build-panel__configuration {
  display: grid;
  grid-template-columns: minmax(0, 1fr) minmax(0, 1fr);
  gap: 1rem;
}
.build-panel__cfg-cell--wide {
  grid-column: 1 / -1;
}
@media (max-width: 720px) {
  .build-panel__configuration {
    grid-template-columns: 1fr;
  }
  .build-panel__cfg-cell--wide {
    grid-column: auto;
  }
}
/* Role-schema tab: guide column on the LEFT (mirrors the picker /
   image-drop placement in the User-palette / Image tabs), editor
   on the RIGHT. Stacks single-column below 920 px viewport. */
.build-panel__role-schema-grid {
  display: grid;
  grid-template-columns: minmax(0, 280px) minmax(0, 1fr);
  gap: 1.5rem;
  align-items: start;
}
@media (max-width: 920px) {
  .build-panel__role-schema-grid {
    grid-template-columns: 1fr;
  }
}
.build-panel__role-schema-guide,
.build-panel__role-schema-editor {
  min-width: 0;
}
.build-panel__schema-select :deep(.p-select) {
  font-family: var(--vp-font-family-mono);
  font-size: 0.85rem;
  min-width: 14rem;
}
</style>
