<script setup lang="ts">
import { computed } from 'vue';
import { AccordionContent, AccordionHeader, AccordionItem, AccordionRoot, AccordionTrigger } from 'reka-ui';
import { useIridis } from '~/composables/useIridis.ts';
import { roleSchemaByName } from '~/theme/RoleSchemaByName.ts';

/**
 * The iridis-4 ⊂ 8 ⊂ 12 ⊂ 16 ⊂ 32 schema hierarchy as a tree: each tier node
 * expands to the roles it ADDS over the previous tier (not the cumulative
 * set — every tier after 4 re-exports its parent's roles verbatim). Each leaf
 * shows whether that role is independently resolved from a seed or hue-derived
 * from another role (ExpandFamily) by default — pinning a seed to it in
 * PaletteControls overrides either path — plus its live hex if resolved.
 */
const TIER_ORDER = ['iridis-4', 'iridis-8', 'iridis-12', 'iridis-16', 'iridis-32'];
const { roles, framing, schemaName } = useIridis();

type LeafType = { 'derivedFrom'?: string; 'hex'?: string; 'label': string; 'value': string };
type TierType = { 'children': LeafType[]; 'defaultExpanded': boolean; 'label': string; 'value': string };

const tree = computed<TierType[]>(() => {
  const seen = new Set<string>();
  return TIER_ORDER.map((tierName) => {
    const schema = roleSchemaByName[tierName]?.[framing.value];
    const added = (schema?.roles ?? []).filter((r) => {
      if (seen.has(r.name)) {return false;}
      seen.add(r.name);
      return true;
    });
    return {
      'children': added.map((r) => {return { 'derivedFrom': r.derivedFrom, 'hex': roles.value[r.name], 'label': r.name, 'value': `${tierName}:${r.name}` };}),
      'defaultExpanded': tierName === schemaName.value,
      'label': tierName,
      'value': tierName
    };
  });
});

/**
 * Per-field reference material for RoleDefinitionInterface, ported and enriched from
 * docs/reference/role-schema/*.md. Each entry pairs the field with what the engine
 * does with it and how to author it well.
 */
type FieldDetailType = { 'author': string; 'does': string; 'field': string; 'means': string; 'value': string };

const fieldDetails: FieldDetailType[] = [
  {
    'value':  'name',
    'field':  'name',
    'does':   'Becomes the suffix of the emitted CSS custom property (--iridis-{name}), and the key every downstream task uses to look up state.roles[name]. It is also what contrastPairs[].foreground / .background reference.',
    'means':  'A role name is semantic, not visual — it names what a color is FOR ("accent", "text"), not what it looks like ("#7c3aed"). This is the label shown in the mono badge on every leaf above.',
    'author': 'Use lowercase kebab-case so it maps cleanly into CSS variables. Keep names short and stable — renaming a role is a breaking change for every consumer reading --iridis-{old-name}.'
  },
  {
    'value':  'intent',
    'field':  'intent',
    'does':   'Drives forced-colors (WHCM) token selection, the APCA Lc target, the default WCAG ratio, and Capacitor StatusBar style — every semantic decision downstream of resolve:roles reads intent, never the role name.',
    'means':  'Intent is the classifier, name is the identifier. The closed 10-value ColorIntentType vocabulary is text, background, accent, muted, critical, positive, link, button, onAccent, onButton — grouped into a core family, a signal family, and an interaction family.',
    'author': 'Always set intent explicitly; roles without one fall back to unstable name-substring inference. Pick the intent matching the role\'s purpose, not its appearance — a muted-grey role used as body copy is text, not muted.'
  },
  {
    'value':  'required',
    'field':  'required',
    'does':   'resolve:roles gives required roles first pick of the available seeds. If seeds run short, a required role is never left unassigned — the engine picks the closest-matching seed rather than leaving it absent. Optional roles without a seed are left undefined unless derivedFrom synthesises them.',
    'means':  'Required is the contract flag: a consumer reading state.roles.background unconditionally can do so only because background is required. The green "resolved" badge above marks a role a seed competed for directly; required roles are the ones the tree guarantees will carry a hex.',
    'author': 'Mark a role required only when downstream code would break without it. Pair required with a tight lightnessRange / chromaRange — the engine assigns a seed regardless, and a loose envelope risks a degenerate result.'
  },
  {
    'value':  'derivedFrom',
    'field':  'derivedFrom',
    'does':   'expand:family runs after resolve:roles: it copies the parent role\'s resolved L and C (clamped to the child\'s own ranges), rotates the parent\'s hue by hueOffset, and reconstructs the child\'s color. This is the "← source" badge shown on derived leaves above.',
    'means':  'derivedFrom encodes a family relationship — "this role lives where its parent lives, just hue-shifted." If the parent moves because the user picked a different seed, every child rides along on the same hue arc, authored once in the schema.',
    'author': 'Pick hueOffset values in multiples of 30° for perceptually distinct siblings. Don\'t chain derivations more than two levels deep — expand:family is a single pass, so a grandchild only sees its parent\'s pre-expansion state.'
  },
  {
    'value':  'hueLock',
    'field':  'hueLock',
    'does':   'resolve:roles substitutes the locked hue in place of the seed\'s hue before clamping L and C into the role\'s envelopes — the seed still supplies lightness and chroma, only hue is overridden.',
    'means':  'hueLock is the anti-parametric option: derivedFrom says "follow another role," hueLock says "follow nobody, I own my hue." It exists for roles whose meaning is culturally fixed — success reads green, error reads red, regardless of brand seed.',
    'author': 'Reserve it for roles with a fixed semantic color association; never lock a brand role\'s hue, since the brand IS the seed. hueLock and derivedFrom are mutually exclusive — the schema validator rejects a role declaring both.'
  },
  {
    'value':  'lightnessRange',
    'field':  'lightnessRange',
    'does':   'clamp:oklch runs after intake and before resolve:roles: it pushes a seed\'s OKLCH L up to the lower bound or pulls it down to the upper bound, leaving hue and chroma untouched.',
    'means':  'The lightness envelope encodes role function, not taste. Text needs a high-contrast L band against its surface; a surface role\'s band flips between dark and light framing — the framing flip IS the lightness flip.',
    'author': 'Keep the range narrow (≤ 0.15 wide) for surface and text roles so the result stays inside the role\'s perceptual zone regardless of seed. Widen it (≥ 0.20) for accent roles so the seed\'s identity has room to show through. Author dark and light framing as separate schemas with the same role name occupying different bands.'
  },
  {
    'value':  'chromaRange',
    'field':  'chromaRange',
    'does':   'The same clamp:oklch pass pushes or pulls a seed\'s OKLCH C into [min, max] — a minimum floor keeps accents from collapsing to grey, a maximum ceiling keeps text and surfaces near-neutral.',
    'means':  'Chroma encodes how chromatic a role is, independent of hue. A muted role with a tight chromaRange near 0 stays near-grey even against a violently saturated seed.',
    'author': 'Keep the upper bound at or below ~0.32 for sRGB-only emit targets — higher falls outside gamut for most hues and gets mapped back during emit. Use the same range across dark and light framing unless one mode should read more saturated than the other.'
  },
  {
    'value':  'contrastPairs',
    'field':  'contrastPairs',
    'does':   'enforce:contrast walks each { foreground, background, minRatio, algorithm } pair after resolve:roles and expand:family, computing actual contrast and nudging the foreground\'s OKLCH lightness in increments (lift for dark framing, drop for light) until the ratio passes or the role\'s envelope is exhausted.',
    'means':  'A contrast pair is a declarative accessibility contract, not a styling hint — it commits that whichever seed the user supplies, the resolved foreground and background will clear minRatio against each other. Pairs not declared are not enforced; the engine cannot read your CSS to know what is painted on what.',
    'author': 'Declare a pair for every foreground/background combination that will actually render together. Use wcag21 (4.5:1 normal text, 3:1 large/non-text) for the legal floor, or apca (Lc ≥ 75 for body text) for perceptual accuracy in dark mode and on chromatic backgrounds. Declare pairs separately for dark and light framing — envelopes flip between them.'
  }
];
</script>

<template>
  <UCard>
    <template #header>
      <span class="block text-center font-semibold text-highlighted">Schema tree</span>
    </template>
    <p class="mb-3 text-sm text-muted">
      Each tier adds roles over the last. "resolved" competes for a seed by default; "← source"
      is hue-derived — pin either one in Palette to override it.
    </p>
    <UTree :items="tree">
      <template #item-leading="{ item }">
        <span
          v-if="(item as LeafType).hex"
          class="h-3 w-3 shrink-0 rounded-full border border-default"
          :style="{ backgroundColor: (item as LeafType).hex }"
        />
      </template>
      <template #item-label="{ item }">
        <span class="flex items-center gap-1.5">
          <span class="font-mono text-xs">{{ item.label }}</span>
          <UBadge
            v-if="'derivedFrom' in item"
            :color="(item as LeafType).derivedFrom === undefined ? 'success' : 'neutral'"
            variant="soft"
            size="xs"
          >
            {{ (item as LeafType).derivedFrom === undefined ? 'resolved' : `← ${(item as LeafType).derivedFrom}` }}
          </UBadge>
        </span>
      </template>
    </UTree>

    <div class="mt-6 border-t border-default pt-4">
      <span class="block font-semibold text-highlighted">What a role schema is</span>
      <p class="mt-2 text-sm text-muted">
        A role schema is a consumer-authored contract: a <code class="font-mono text-xs">name</code>, an optional
        <code class="font-mono text-xs">description</code>, an array of <code class="font-mono text-xs">roles</code>,
        and an optional array of <code class="font-mono text-xs">contrastPairs</code>. iridis never infers meaning
        from a role's name — every downstream decision reads the role's declared <code class="font-mono text-xs">intent</code>
        instead. Each tier above (<code class="font-mono text-xs">iridis-4</code> through
        <code class="font-mono text-xs">iridis-32</code>) is one such schema, and each leaf is one
        <code class="font-mono text-xs">RoleDefinitionInterface</code> entry in its <code class="font-mono text-xs">roles[]</code> array.
        Expand a field below to see what it does, what it means, and how to author it.
      </p>
      <AccordionRoot
        type="multiple"
        class="mt-3 w-full"
      >
        <AccordionItem
          v-for="detail in fieldDetails"
          :key="detail.value"
          :value="detail.value"
          class="border-b border-default"
        >
          <AccordionHeader>
            <AccordionTrigger class="flex w-full items-center gap-2 py-2 text-left hover:text-highlighted">
              <span class="font-mono text-sm font-medium">{{ detail.field }}</span>
              <UIcon
                name="i-lucide-chevron-down"
                class="ml-auto size-4 transition-transform data-[state=open]:rotate-180"
              />
            </AccordionTrigger>
          </AccordionHeader>
          <AccordionContent class="space-y-2 pb-4 text-sm text-muted">
            <p><span class="font-medium text-highlighted">What it does — </span>{{ detail.does }}</p>
            <p><span class="font-medium text-highlighted">What it means — </span>{{ detail.means }}</p>
            <p><span class="font-medium text-highlighted">How to author — </span>{{ detail.author }}</p>
          </AccordionContent>
        </AccordionItem>
      </AccordionRoot>
    </div>
  </UCard>
</template>
