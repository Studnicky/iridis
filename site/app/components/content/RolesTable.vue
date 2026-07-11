<script setup lang="ts">
import { computed, h, resolveComponent } from 'vue';
import { useIridis } from '~/composables/useIridis.ts';
import { contrastRatio } from '~/theme/ContrastRatio.ts';

const { roleViews, roles } = useIridis();
const UButton = resolveComponent('UButton');
const UBadge = resolveComponent('UBadge');

const bg = computed<string>(() => roles.value['background'] ?? '#000000');

type RowType = { 'name': string; 'hex': string; 'l': number; 'c': number; 'h': number; 'ratio': number; 'aa': boolean; 'aaa': boolean; 'compliance': string };

const data = computed<RowType[]>(() => roleViews.value.map((r) => {
  const ratio = contrastRatio(r.hex, bg.value);
  const aa = ratio >= 4.5;
  const aaa = ratio >= 7;
  return { 'aa': aa, 'aaa': aaa, 'c': r.c, 'compliance': aaa ? 'AAA' : aa ? 'AA' : 'fail', 'h': r.h, 'hex': r.hex, 'l': r.l, 'name': r.name, 'ratio': ratio };
}));

type SortColumnType = { 'getIsSorted': () => false | 'asc' | 'desc'; 'toggleSorting': (desc?: boolean) => void };

function sortableHeader(label: string) {
  return ({ column }: { column: SortColumnType }) => {return h(UButton, {
    'class': 'w-full justify-start',
    'color': 'neutral',
    'icon': column.getIsSorted() === 'asc' ? 'i-material-symbols-arrow-upward-rounded' : column.getIsSorted() === 'desc' ? 'i-material-symbols-arrow-downward-rounded' : 'i-material-symbols-unfold-more-rounded',
    'onClick': () => { column.toggleSorting(column.getIsSorted() === 'asc'); },
    'size': 'xs',
    'variant': 'ghost'
  }, () => label);};
}

const columns = [
  { 'accessorKey': 'name', 'header': sortableHeader('Role'), 'size': 140 },
  { 'accessorKey': 'hex', 'header': sortableHeader('Hex'), 'size': 100 },
  { 'accessorKey': 'l', 'header': sortableHeader('L'), 'size': 60 },
  { 'accessorKey': 'c', 'header': sortableHeader('C'), 'size': 60 },
  { 'accessorKey': 'h', 'header': sortableHeader('H°'), 'size': 70 },
  { 'accessorKey': 'ratio', 'header': sortableHeader('Ratio'), 'size': 70 },
  { 'accessorKey': 'compliance', 'header': sortableHeader('Compliance'), 'size': 100 }
];
</script>

<template>
  <UCard>
    <template #header>
      <div class="grid grid-cols-[1fr_auto_1fr] items-center gap-2">
        <span />
        <span class="text-center font-semibold text-highlighted">Roles table</span>
        <UBadge
          color="neutral"
          variant="soft"
          class="justify-self-end"
        >
          {{ data.length }} roles
        </UBadge>
      </div>
    </template>
    <p class="mb-3 text-sm text-muted">
      Same roles as the grid, laid out for sorting — click a header.
    </p>
    <div class="w-full overflow-hidden">
      <UTable
        :data="data"
        :columns="columns"
        class="w-full"
      >
        <template #hex-cell="{ row }">
          <span class="inline-flex items-center gap-1.5">
            <span
              class="h-3 w-3 shrink-0 rounded border border-default"
              :style="{ backgroundColor: row.original.hex }"
            />
            <span class="font-mono text-xs">{{ row.original.hex.slice(1) }}</span>
          </span>
        </template>
        <template #l-cell="{ row }">
          <span class="text-xs">{{ row.original.l.toFixed(2) }}</span>
        </template>
        <template #c-cell="{ row }">
          <span class="text-xs">{{ row.original.c.toFixed(2) }}</span>
        </template>
        <template #h-cell="{ row }">
          <span class="text-xs">{{ row.original.h.toFixed(0) }}°</span>
        </template>
        <template #ratio-cell="{ row }">
          <span class="text-xs">{{ row.original.ratio.toFixed(2) }}</span>
        </template>
        <template #compliance-cell="{ row }">
          <UBadge
            :color="row.original.aaa ? 'success' : row.original.aa ? 'primary' : 'neutral'"
            variant="soft"
            size="xs"
          >
            {{ row.original.compliance }}
          </UBadge>
        </template>
      </UTable>
    </div>

    <LearnMoreSection title="Learn more: how contrast is measured and enforced" value="contrast-detail">
          <p>
            The <strong class="text-highlighted">Ratio</strong> column above is a WCAG 2.1 luminance ratio — the
            same number this section explains. It comes from <code class="font-mono text-xs">contrastRatio(role.hex, background)</code>,
            which computes relative luminance from gamma-decoded sRGB, then divides the lighter luminance by the
            darker: <code class="font-mono text-xs">(L₁ + 0.05) / (L₂ + 0.05)</code>. The result ranges from
            <code class="font-mono text-xs">1.0</code> (no contrast) to <code class="font-mono text-xs">21.0</code>
            (black on white). <strong class="text-highlighted">Compliance</strong> reads that ratio against two
            fixed tiers: <code class="font-mono text-xs">AA</code> at 4.5:1 (body text), <code class="font-mono text-xs">AAA</code>
            at 7.0:1 (high-stakes body text). Large text and non-text UI elements (borders, focus rings) use lower
            thresholds — 3.0:1 — that this table doesn't break out per-role.
          </p>

          <p>
            WCAG 2.1's model is a 1990s simplification: it underweights blue-on-black and overweights bright-on-white.
            iridis also ships <strong class="text-highlighted">APCA</strong> (Accessible Perceptual Contrast
            Algorithm, the metric under development for WCAG 3) as a swappable alternative — pick it via the
            <strong class="text-highlighted">Contrast algorithm</strong> control in the sidebar. Where WCAG produces
            one ratio, APCA produces a signed <code class="font-mono text-xs">Lc</code> value in roughly
            <code class="font-mono text-xs">[-108, +108]</code>: positive means light background, negative means
            dark, and the magnitude is what you compare against a threshold (≥75 body text, ≥60 fluent text, ≥45
            large text/headlines, ≥30 non-text/icons). APCA uses separate exponents for foreground and background
            luminance and a perceptual lightness curve closer to OKLCH, so it's stricter on dark-on-dark pairs and
            more permissive on saturated-on-light pairs than the ratio shown above would suggest.
          </p>

          <p>
            These numbers aren't just measured, they're enforced before you ever see this table. A role schema
            declares <code class="font-mono text-xs">contrastPairs</code> — foreground role, background role, a
            minimum ratio (or Lc magnitude), and an algorithm — and every declared pair is a hard contract. The
            <code class="font-mono text-xs">enforce:contrast</code> pipeline stage walks each pair and, for any
            foreground that falls short, calls <code class="font-mono text-xs">ensureContrast</code>: it checks
            whether the foreground is darker or lighter than its background, then nudges OKLCH lightness in that
            direction in steps of <code class="font-mono text-xs">0.02</code>, re-testing the ratio after each step,
            for up to 50 steps. Hue and chroma are untouched, so the adjusted color still looks like the one you
            picked, it just reads against its background too. If a role's declared <code class="font-mono text-xs">lightnessRange</code>
            can't reach the threshold, the engine records the closest reachable approximation instead of failing
            silently — that's a design constraint and an accessibility constraint in genuine conflict, and it
            surfaces as a measurable gap rather than a broken palette shipped unnoticed.
          </p>

          <p>
            One layer this table doesn't surface: <strong class="text-highlighted">color vision deficiency
            simulation</strong>. The optional <code class="font-mono text-xs">enforce:cvdSimulate</code> stage
            (visible in the Pipeline panel when enabled) simulates protanopia, deuteranopia, tritanopia, and
            achromatopsia using Brettel-Viénot matrices in linear sRGB, recomputes each pair's WCAG contrast under
            simulation, and warns when it drops meaningfully below the original. It's advisory only — it doesn't
            rewrite roles the way <code class="font-mono text-xs">enforce:contrast</code> does, because hue
            selection under CVD is a design decision the engine leaves to you.
          </p>
    </LearnMoreSection>
  </UCard>
</template>
