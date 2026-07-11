<script setup lang="ts">
import { ref, computed } from 'vue';
import { AccordionContent, AccordionHeader, AccordionItem, AccordionRoot, AccordionTrigger } from 'reka-ui';
import { useIridis } from '~/composables/useIridis.ts';

/**
 * Per-color space readout. Pick any resolved role and see it across the spaces
 * iridis supports — Hex, RGB, HSV, CMYK, OKLCH. OKLCH comes straight off the
 * engine record; the rest are standard conversions of its hex.
 */
const { roleViews } = useIridis();
const selected = ref<string>('brand');
const names = computed<string[]>(() => roleViews.value.map((r) => r.name));
const role = computed(() => roleViews.value.find((r) => r.name === selected.value) ?? roleViews.value.find((r) => r.name === 'brand') ?? roleViews.value[0]);

function rgb(hex: string): [number, number, number] {
  return [parseInt(hex.slice(1, 3), 16), parseInt(hex.slice(3, 5), 16), parseInt(hex.slice(5, 7), 16)];
}
function hsv([r, g, b]: [number, number, number]): [number, number, number] {
  const rn = r / 255, gn = g / 255, bn = b / 255;
  const max = Math.max(rn, gn, bn), min = Math.min(rn, gn, bn), d = max - min;
  let h = 0;
  if (d !== 0) {
    h = max === rn ? ((gn - bn) / d) % 6 : max === gn ? (bn - rn) / d + 2 : (rn - gn) / d + 4;
    h *= 60; if (h < 0) h += 360;
  }
  return [Math.round(h), Math.round((max === 0 ? 0 : d / max) * 100), Math.round(max * 100)];
}
function cmyk([r, g, b]: [number, number, number]): [number, number, number, number] {
  const rn = r / 255, gn = g / 255, bn = b / 255;
  const k = 1 - Math.max(rn, gn, bn);
  if (k === 1) return [0, 0, 0, 100];
  return [Math.round(((1 - rn - k) / (1 - k)) * 100), Math.round(((1 - gn - k) / (1 - k)) * 100), Math.round(((1 - bn - k) / (1 - k)) * 100), Math.round(k * 100)];
}

const rows = computed(() => {
  const r = role.value;
  if (!r) return [];
  const c = rgb(r.hex);
  const [h, s, v] = hsv(c);
  const [cy, m, ye, k] = cmyk(c);
  return [
    { 'space': 'Hex', 'value': r.hex },
    { 'space': 'RGB', 'value': `rgb(${c[0]}, ${c[1]}, ${c[2]})` },
    { 'space': 'HSV', 'value': `${h}°, ${s}%, ${v}%` },
    { 'space': 'CMYK', 'value': `${cy}%, ${m}%, ${ye}%, ${k}%` },
    { 'space': 'OKLCH', 'value': `${r.l.toFixed(3)} ${r.c.toFixed(3)} ${r.h.toFixed(1)}°` },
  ];
});

/** Worked-example numbers for the detail sections below, derived from the selected role's own hex/rgb/oklch. */
const worked = computed(() => {
  const r = role.value;
  if (!r) return undefined;
  const [red, green, blue] = rgb(r.hex);
  const [h, s, v] = hsv([red, green, blue]);
  const [cy, m, ye, k] = cmyk([red, green, blue]);
  const rn = (red / 255).toFixed(3), gn = (green / 255).toFixed(3), bn = (blue / 255).toFixed(3);
  return { 'hex': r.hex, red, green, blue, rn, gn, bn, h, s, v, cy, m, ye, k, 'l': r.l, 'c': r.c, 'hue': r.h };
});
</script>

<template>
  <UCard>
    <template #header>
      <span class="block text-center font-semibold text-highlighted">Color spaces</span>
    </template>
    <div class="space-y-4">
      <div class="flex items-center gap-3">
        <div
          class="h-10 w-10 rounded-md border border-default"
          :style="{ backgroundColor: role?.hex }"
        />
        <USelect
          v-model="selected"
          :items="names"
          class="w-48"
        />
      </div>
      <div class="divide-y divide-default">
        <div
          v-for="row in rows"
          :key="row.space"
          class="flex items-center justify-between py-1.5"
        >
          <span class="text-xs font-medium uppercase tracking-wide text-dimmed">{{ row.space }}</span>
          <span class="font-mono text-xs text-highlighted">{{ row.value }}</span>
        </div>
      </div>

      <LearnMoreSection
        v-if="worked"
        :title="`Learn more — how each space above is derived, worked through ${role?.name}'s own values`"
        value="color-spaces-detail"
      >
        <AccordionRoot
          type="multiple"
          class="w-full"
        >
          <AccordionItem
            value="color-record"
            class="border-b border-default"
          >
            <AccordionHeader>
              <AccordionTrigger class="flex w-full items-center gap-2 py-2 text-left text-sm font-medium hover:text-highlighted">
                <span>ColorRecord: the OKLCH-first internal shape</span>
                <UIcon
                  name="i-lucide-chevron-down"
                  class="ml-auto size-4 transition-transform data-[state=open]:rotate-180"
                />
              </AccordionTrigger>
            </AccordionHeader>
            <AccordionContent class="space-y-2 pb-4 text-xs text-muted">
              <p>
                Every color iridis touches is stored internally as a <code>ColorRecord</code>, and OKLCH is the
                primary representation — RGB, hex, and (conditionally) Display-P3 are cached projections derived
                from it, not independent sources of truth. That's why the table above always shows an OKLCH row
                even though the picker and every export ultimately deal in hex or RGB: OKLCH is what the engine
                actually reasons with when it mixes, lightens, darkens, or nudges a color for contrast.
              </p>
              <p>
                The <code>rgb</code> and <code>hex</code> slots are always sRGB-safe. When {{ role?.name }}'s OKLCH
                coordinates land outside the sRGB gamut, they get gamut-mapped along constant lightness and hue
                (CSS Color 4 §13.2.2) before being written into those slots — which is a lossy step. A
                <code>displayP3</code> slot exists precisely to preserve wide-gamut fidelity in that case; it stays
                <code>undefined</code> whenever the input color was already fully representable in sRGB.
              </p>
              <p>
                Practically: two properties fall out of storing OKLCH first. Mixing two colors in OKLCH (
                <code>mixOklch</code>) produces a perceptually centered midpoint, where mixing in sRGB across a
                warm/cool hue boundary tends to produce muddy browns. And contrast enforcement nudges the
                <code>oklch.l</code> field in fixed steps because lightness is perceptually linear there — each
                step is a consistent perceived change, so the nudge converges predictably instead of overshooting.
              </p>
            </AccordionContent>
          </AccordionItem>

          <AccordionItem
            value="hex"
            class="border-b border-default"
          >
            <AccordionHeader>
              <AccordionTrigger class="flex w-full items-center gap-2 py-2 text-left text-sm font-medium hover:text-highlighted">
                <span>Hex — sRGB encoded as bytes</span>
                <UIcon
                  name="i-lucide-chevron-down"
                  class="ml-auto size-4 transition-transform data-[state=open]:rotate-180"
                />
              </AccordionTrigger>
            </AccordionHeader>
            <AccordionContent class="space-y-2 pb-4 text-xs text-muted">
              <p>
                <code>{{ worked!.hex }}</code> is three sRGB bytes in hex, each ranging <code>00</code>–<code>ff</code>.
                iridis only accepts the full six-digit <code>#rrggbb</code> form (plus an optional eight-digit
                <code>#rrggbbaa</code> with alpha) — the three- and four-digit shorthand forms are rejected outright.
              </p>
              <p>
                Converting to floating-point sRGB just divides each byte by 255:
              </p>
              <pre class="overflow-x-auto rounded-md bg-elevated p-2 font-mono">r = 0x{{ worked!.hex.slice(1, 3) }} / 255 = {{ worked!.rn }}
g = 0x{{ worked!.hex.slice(3, 5) }} / 255 = {{ worked!.gn }}
b = 0x{{ worked!.hex.slice(5, 7) }} / 255 = {{ worked!.bn }}</pre>
              <p>
                That triple is what the RGB row above shows, scaled back to 0–255. The reverse direction multiplies
                by 255, rounds, and pads to two digits — the canonical hex iridis writes back out is always six
                digits; alpha is tracked separately on the record, never folded into the hex string.
              </p>
            </AccordionContent>
          </AccordionItem>

          <AccordionItem
            value="rgb"
            class="border-b border-default"
          >
            <AccordionHeader>
              <AccordionTrigger class="flex w-full items-center gap-2 py-2 text-left text-sm font-medium hover:text-highlighted">
                <span>RGB — gamma-corrected vs. linear light</span>
                <UIcon
                  name="i-lucide-chevron-down"
                  class="ml-auto size-4 transition-transform data-[state=open]:rotate-180"
                />
              </AccordionTrigger>
            </AccordionHeader>
            <AccordionContent class="space-y-2 pb-4 text-xs text-muted">
              <p>
                The RGB row above (<code>rgb({{ worked!.red }}, {{ worked!.green }}, {{ worked!.blue }})</code>) is
                gamma-corrected sRGB — what a hex string encodes, what gets painted to a <code>&lt;canvas&gt;</code>,
                what a CSS color declares. It is not the same as linear light. Whenever physical light needs to be
                added — relative luminance for WCAG, the path into OKLCH — the gamma-corrected value first has to be
                decoded to linear:
              </p>
              <pre class="overflow-x-auto rounded-md bg-elevated p-2 font-mono">v_linear = v / 12.92                     if v ≤ 0.04045
         = ((v + 0.055) / 1.055) ^ 2.4    otherwise</pre>
              <p>
                For {{ role?.name }}'s red channel, <code>v = {{ worked!.rn }}</code>, which is above the 0.04045
                threshold, so it takes the power-curve branch rather than the linear one. This decode step is what
                every luminance-based computation below (WCAG, APCA) depends on internally.
              </p>
            </AccordionContent>
          </AccordionItem>

          <AccordionItem
            value="hsv"
            class="border-b border-default"
          >
            <AccordionHeader>
              <AccordionTrigger class="flex w-full items-center gap-2 py-2 text-left text-sm font-medium hover:text-highlighted">
                <span>HSV — a cylindrical view of the same sRGB</span>
                <UIcon
                  name="i-lucide-chevron-down"
                  class="ml-auto size-4 transition-transform data-[state=open]:rotate-180"
                />
              </AccordionTrigger>
            </AccordionHeader>
            <AccordionContent class="space-y-2 pb-4 text-xs text-muted">
              <p>
                HSV re-parameterizes the same sRGB triple as an angle, a saturation, and a value rather than three
                intensities — useful for a picker ("same color, more orange") but not perceptually uniform: equal
                steps in H or S don't correspond to equal perceived steps in color, unlike OKLCH.
              </p>
              <p>
                Reading it back out of RGB is a max/min extraction: <code>V = max(R, G, B)</code>,
                <code>S = (max − min) / max</code>, and H comes from which channel held the maximum. For
                {{ role?.name }} that resolves to <code>{{ worked!.h }}°, {{ worked!.s }}%, {{ worked!.v }}%</code> —
                the exact value shown in the HSV row above.
              </p>
              <p>
                iridis doesn't ship an <code>hsvToRgb</code> pipeline primitive — HSV lives entirely in the picker UI,
                round-tripping through hex on every edit. The pipeline's cylindrical equivalent is HSL, which shares
                the hue axis but defines lightness differently.
              </p>
            </AccordionContent>
          </AccordionItem>

          <AccordionItem
            value="cmyk"
            class="border-b border-default"
          >
            <AccordionHeader>
              <AccordionTrigger class="flex w-full items-center gap-2 py-2 text-left text-sm font-medium hover:text-highlighted">
                <span>CMYK — subtractive ink, K-separated</span>
                <UIcon
                  name="i-lucide-chevron-down"
                  class="ml-auto size-4 transition-transform data-[state=open]:rotate-180"
                />
              </AccordionTrigger>
            </AccordionHeader>
            <AccordionContent class="space-y-2 pb-4 text-xs text-muted">
              <p>
                CMYK models four-color print: each channel is the percentage of ink laid on a white substrate. A
                naive subtractive conversion would set <code>C = 1 − R</code>, <code>M = 1 − G</code>,
                <code>Y = 1 − B</code>, but stacking three saturated inks to render a dark neutral wastes ink and
                shifts hue — so K (black) is pulled out as the shared minimum first:
              </p>
              <pre class="overflow-x-auto rounded-md bg-elevated p-2 font-mono">K = 1 − max(R, G, B) = {{ worked!.k }}%
C = (1 − R − K) / (1 − K) = {{ worked!.cy }}%
M = (1 − G − K) / (1 − K) = {{ worked!.m }}%
Y = (1 − B − K) / (1 − K) = {{ worked!.ye }}%</pre>
              <p>
                This is a browser-side approximation with no ICC profile applied — accurate enough for the CMYK tab
                in the picker, not accurate enough to send to a press. iridis exports no CMYK pipeline primitive and
                accepts no CMYK input; it exists purely as a numeric readout, which is exactly the role it plays in
                the table above.
              </p>
            </AccordionContent>
          </AccordionItem>

          <AccordionItem
            value="oklch"
            class="border-b border-default"
          >
            <AccordionHeader>
              <AccordionTrigger class="flex w-full items-center gap-2 py-2 text-left text-sm font-medium hover:text-highlighted">
                <span>OKLCH — the canonical, perceptually uniform space</span>
                <UIcon
                  name="i-lucide-chevron-down"
                  class="ml-auto size-4 transition-transform data-[state=open]:rotate-180"
                />
              </AccordionTrigger>
            </AccordionHeader>
            <AccordionContent class="space-y-2 pb-4 text-xs text-muted">
              <p>
                OKLCH is the polar form of Björn Ottosson's Oklab space: lightness L stays as-is, and the (a, b)
                chromaticity plane becomes chroma <code>C = √(a² + b²)</code> and hue <code>h = atan2(b, a)</code>.
                {{ role?.name }}'s OKLCH row above (<code>{{ worked!.l.toFixed(3) }} {{ worked!.c.toFixed(3) }}
                  {{ worked!.hue.toFixed(1) }}°</code>) is that L, C, h triple directly off the engine's
                <code>ColorRecord</code> — not derived from the hex the way the other four rows are.
              </p>
              <p>
                The forward conversion chain is sRGB (gamma) → linear sRGB → LMS cone responses → cube-root
                non-linearity → Oklab → polar form. Because L is perceptually linear and independent of hue, rotating
                h holds perceived lightness constant — HSL can't make that guarantee, since its lightness is just the
                average of the max and min RGB channels rather than a perceptual quantity.
              </p>
              <p>
                This is why contrast enforcement, palette family expansion, and color mixing throughout iridis all
                operate on the OKLCH slot rather than RGB or HSV: equal numeric steps here produce equal perceived
                steps, which the other four representations in this table do not offer.
              </p>
            </AccordionContent>
          </AccordionItem>

          <AccordionItem
            value="wcag"
            class="border-b border-default"
          >
            <AccordionHeader>
              <AccordionTrigger class="flex w-full items-center gap-2 py-2 text-left text-sm font-medium hover:text-highlighted">
                <span>WCAG 2.1 — the default contrast ratio</span>
                <UIcon
                  name="i-lucide-chevron-down"
                  class="ml-auto size-4 transition-transform data-[state=open]:rotate-180"
                />
              </AccordionTrigger>
            </AccordionHeader>
            <AccordionContent class="space-y-2 pb-4 text-xs text-muted">
              <p>
                WCAG 2.1's contrast ratio is the default algorithm <code>enforce:contrast</code> uses. It compares
                relative luminance Y — a Rec. 709-weighted sum of each color's linear sRGB channels — for both
                colors in a pair:
              </p>
              <pre class="overflow-x-auto rounded-md bg-elevated p-2 font-mono">Y = 0.2126·R_linear + 0.7152·G_linear + 0.0722·B_linear
ratio = (max(Y₁, Y₂) + 0.05) / (min(Y₁, Y₂) + 0.05)</pre>
              <p>
                The <code>+ 0.05</code> flare term models ambient screen reflectance and keeps the ratio finite even
                against pure black; the result lands on <code>[1, 21]</code>. It's symmetric — WCAG doesn't
                distinguish foreground from background the way APCA below does — and body text needs 4.5:1 at AA,
                7:1 at AAA, while large text and non-text UI components need less (3:1 AA, 4.5:1 AAA for large text).
              </p>
            </AccordionContent>
          </AccordionItem>

          <AccordionItem
            value="apca"
          >
            <AccordionHeader>
              <AccordionTrigger class="flex w-full items-center gap-2 py-2 text-left text-sm font-medium hover:text-highlighted">
                <span>APCA — polarity-aware perceptual contrast</span>
                <UIcon
                  name="i-lucide-chevron-down"
                  class="ml-auto size-4 transition-transform data-[state=open]:rotate-180"
                />
              </AccordionTrigger>
            </AccordionHeader>
            <AccordionContent class="space-y-2 pb-4 text-xs text-muted">
              <p>
                APCA (Accessible Perceptual Contrast Algorithm), the metric being evaluated for WCAG 3, addresses two
                gaps in the ratio above: it weights text and background luminance with different exponents (0.56 vs
                0.65) because the eye is asymmetric between light-on-dark and dark-on-light text, and it applies a
                soft-clamp polynomial near black to suppress runaway sensitivity to tiny absolute luminances:
              </p>
              <pre class="overflow-x-auto rounded-md bg-elevated p-2 font-mono">Y_soft = Y                              if Y ≥ 0.022
       = Y + (0.022 − Y)^1.414          otherwise</pre>
              <p>
                The output, Lc, is signed rather than a plain ratio — positive means light background with dark
                text, negative means dark background with light text, and the sign is exactly the polarity
                information WCAG's symmetric ratio throws away. Thresholds scale with use: small body text needs
                <code>|Lc| ≥ 75</code>, large headline text only <code>≥ 45</code>. A role schema opts a pair into
                APCA explicitly with <code>algorithm: 'apca'</code> on the contrast pair.
              </p>
            </AccordionContent>
          </AccordionItem>
        </AccordionRoot>
      </LearnMoreSection>
    </div>
  </UCard>
</template>
