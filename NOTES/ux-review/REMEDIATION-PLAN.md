# iridis front-end — UX/UI remediation plan

Source: a blind, in-character review by seven personas (The Drunk, The Mom, The Design
Snob, The Visual Designer, The Web Designer, The Curious Bystander, The Confused
Billionaire), each shown only rendered screenshots of the running app — never the code
or docs. Their reports live in `reports/`; the screens in `screenshots/`.

Every complaint below has been grounded in real code (`file:line`), root-caused, and
paired with a concrete fix that reuses a pattern already present in the codebase. Anchors
were spot-verified against source before writing. **No complaint was dropped** — the
traceability matrix at the end maps each persona reaction to a finding ID.

The front-end under review is a single page: `site/app/pages/index.vue` (a scrollytelling
narrative), not a multi-route site.

---

## Status — SHIPPED on branch `feat/ux-remediation`

All 29 findings + TOKEN-1 are implemented across three waves plus a contrast-hardening
pass. 25 files changed (+ new `WhatIsIridis.vue`). `nuxi typecheck` exits 0 at every wave
boundary and at the end. Not committed (awaiting review).

- **Wave A** — navigation overhaul (two-tier scrollspy bar, mobile single-row strip, unified
  wayfinding), systemic contrast gate in `theme/Tokens.ts`, false-`fail`→`n/a` roles fix,
  code-block file-tab framing, swatch hairlines.
- **Wave B** — plain-language hero + `WhatIsIridis` intro, "Upload a photo" CTA, CombineCard
  advanced-settings disclosure, pipeline phase-grouping, single-layer glow, ghost-panel
  defocus + scene scrim, capped lozenge, reduced-motion completion, particle text-exclusion.
- **Wave C** — accent-text tokens gated, theme switcher relocated to a discoverable "Try a
  theme" chip, tokenized fallback, glow tune (`--iridis-glow-strength` 1→0.8).
- **Contrast hardening** — framing-aware backing behind top-of-page text over the ambient.

**Contrast gate — verified by rendered-pixel sampling (not just token values):** every
chrome text block clears WCAG AA in BOTH dark and light framing (worst case: hero tagline
4.78 on light; all others 6.9–17.7). The palette is framing-derived (the 12 presets change
fonts/radius/glow/ambient only), so dark+light framing covers the contrast matrix. The UI
renders entirely from pipeline `--ui-*` tokens; the only remaining color literals are WebGL
graph node colors (visualization output, not chrome).

---

## Diagnosis in one paragraph

The product is genuinely admired — the iris logo, the chrome wordmark, the starfield made
of its own output colors, the live WCAG Roles Table, the single clear UPLOAD button, and
the restrained violet accent all drew unprompted praise from multiple personas, naive and
expert alike. The failure is entirely in the **entry experience**: the page shows
*everything at once, ungated*. Four structural facts produce ~90% of the pain:

1. **A flat 33-item navigation "tab-wall"** (`stageGroups.ts` → `TableOfContentsBar.vue`
   `flatMap`) with no hierarchy — the #1 complaint of all seven personas, and on mobile it
   *is* the entire first screen.
2. **No progressive disclosure / narrative on-ramp** — the serene hero drops straight into
   a ΔE signal-processing panel, and the plain-English "What is Iridis" explainer is
   ordered dead last.
3. **Decorative effects that overshoot into looking like defects** — a doubled text-shadow
   that reads as print misregistration, ghost sibling-cards whose text stays legible, a
   full-bleed glowing "lozenge."
4. **A "physician, heal thyself" cluster** — the chrome and the compliance table don't hold
   themselves to the contrast rigor the product sells (and in one case assert a *false*
   accessibility failure).

None of these require removing a feature. Every fix is reorder / disclose / tone-down /
re-tier.

---

## Priority & severity model

| Tier | Meaning |
|------|---------|
| **P0** | Breaks the first impression for most visitors, or is a true defect (looks broken / asserts a false claim). Fix first. |
| **P1** | Major friction that makes newcomers bounce, but not a defect. |
| **P2** | Polish; taste and consistency. |

Effort: **S** < 1h · **M** a few hours · **L** a day+. Risk = chance of regressing
behavior/build.

---

## Acceptance gates (non-negotiable)

1. **No rendered chrome may fail WCAG contrast — ever.** Every text-bearing interface
   surface (nav labels, body copy, help microcopy, control labels, badges, placeholder/
   disabled text) must meet WCAG AA (≥4.5:1 normal, ≥3:1 large) against its actual
   background, across **all 12 theme presets × light and dark framings**. This is enforced
   *systemically* in the token pipeline (`theme/Tokens.ts`), not per-component: after the
   engine builds the neutral scale, the specific shades Nuxt UI renders as text are
   re-gated against `--ui-bg` and lightness-nudged until they pass — so it holds by
   construction for every theme and any user seed, exactly as `enforce:contrast` already
   does for role hexes. CONTRAST-1's systemic fix is therefore **mandatory**, not a scoped
   mitigation. Text over the ambient starfield gets a scrim (DECOR-4) so it passes against
   a deterministic backing, not a random particle.
   **Corollary — token purity (TOKEN-1):** every UI element must render *from the
   pipeline's own output tokens* (the engine-derived `--ui-*` / role CSS variables). No
   component may hard-code a hex or `rgb()`/`hsl()` literal, use a literal Tailwind palette
   color (`text-gray-*`, `bg-slate-*`, `border-zinc-*`, …), or read an ungated raw scale
   shade. The interface dogfoods the engine end-to-end, so gating the pipeline gates the
   entire UI by construction. Verified by a tree-wide grep for non-token color literals
   returning zero interface hits.
2. No `eslint-disable`, `@ts-ignore`, `@ts-expect-error`, `as` casts, or weakened configs
   as a path to green. Fix the source.
3. Every feature the personas praised is preserved (see "Do-no-harm" below).

---

## Findings

### A. Navigation & wayfinding — *the single biggest problem (all 7 personas)*

Root architecture: `composables/stageGroups.ts` defines `STAGE_GROUPS` (6 groups, 33 flat
leaf items). That one array independently feeds **three** un-coordinated nav surfaces — the
sticky top bar (`TableOfContentsBar.vue:22-24` flattens all 33), the per-carousel dots
(`CylinderCarousel.vue` `.cyl-dots`), and the section chevron stepper (`index.vue:172-196`)
— with no shared "you are here." `useNavigationTargets.ts:23-32` already models
`cardTargets` vs `stageTargets` as distinct tiers; the UI never surfaces that split.

| ID | P | Complaint (personas) | Root cause → Fix | file:line | Eff/Risk |
|----|---|----------------------|------------------|-----------|----------|
| **NAV-1** | P0 | Mobile first viewport is 100% nav, 0% content; hero below the fold (all mobile reviewers) | Bar renders all 33 items at every breakpoint, `sticky top:0`, before `<HeroBanner>`. → Below `lg`, collapse to a single-row horizontal-scroll chip strip (or closed drawer); show **stage-level** entries only (reuse `stageTargets`); make non-sticky until scrolled past hero via IntersectionObserver (idiom already in `CylinderCarousel.vue:270-283`). | `TableOfContentsBar.vue:22-24,56-69`; `BalancedWrap.vue:31-71`; `index.vue:139-141` | M / low |
| **NAV-2** | P0 | 30–40 identical-weight anchors, no hierarchy — "ransom note", "departures board" (all 7) | `flatMap(group=>group.items)` discards group structure; every pill identical `UButton variant=soft size=xs`. → Rebuild as two-tier: Row 1 = 6 stage labels (larger, primary); Row 2 = only the in-view stage's cards (smaller/dimmer), merged with `.cyl-dots`. | `stageGroups.ts:18-70`; `TableOfContentsBar.vue:22-24,41-49`; `useNavigationTargets.ts:23-30` | L / med |
| **NAV-3** | P0 | Sticky bar permanently steals ~15% of desktop viewport (all) | `position:sticky` never shrinks/hides. → Scroll-direction-aware `.toc-bar--compact` (slim single row: icon + current stage) on scroll-down past hero, expand on scroll-up. Pairs with NAV-2. | `TableOfContentsBar.vue:56-59` | M / low |
| **NAV-4** | P0 | Sticky bar overlaps the section header it jumps to (REFINE half-hidden, `home-desktop-dark-03`) | `scroll-mt-24` (96px) is smaller than the real 3–4-row (~140px) bar. → Publish measured `--toc-height` CSS var; use `scroll-margin-top: var(--toc-height)`. | `index.vue:170`; `TableOfContentsBar.vue:56-60`; `useNavigationTargets.ts:71-74` | S / low |
| **NAV-5** | P1 | Labels clip on desktop ("CSS VARIABLES (SCOPED)") and **both edges** on mobile ("R STREAM", "(SC…") | `flex-1` pill + `white-space:nowrap` can't shrink below label width; centered overflow + `body{overflow-x:hidden}` clips symmetrically. → Width-aware packing in `BalancedWrap` (measure real label width); degrade to horizontal-scroll chip strip; shorten worst labels (`outputFormatCards.ts:10` → "CSS vars (scoped)", `stageGroups.ts:36` → "Schema"). | `TableOfContentsBar.vue:70-73,46`; `BalancedWrap.vue:31-48`; `main.css:129-132` | M / low |
| **NAV-6** | P1 | 3–4 competing wayfinding systems; no stable "you are here / how do I get back" (all) | One data array, three treatments, no shared active state. → Collapse to **two** systems: (1) top bar becomes stage-level jump list + scrollspy highlight; (2) merge `.cyl-dots` under the `<h2>` chevron header into one unit; drop the redundant top-bar card flattening (it duplicates `.cyl-dots` verbatim). Docs accordion stays. | `TableOfContentsBar.vue:22-49`; `CylinderCarousel.vue:360-380`; `index.vue:172-196`; `AccordionPanel.vue:1-63` | L / med |
| **NAV-7** | P1 | Chevron `‹ ›` reads "swipe sideways" but content scrolls vertically (multiple) | Two near-identical chevron affordances do different things (section jump vs carousel rotate). → Relabel **section** Prev/Next with destination text ("← Upload", "Explore →"); keep **carousel** arrows icon-only and visually confined to the card frame. | `index.vue:172-196`; `CylinderCarousel.vue:304-317,349-357` | S / low |
| **NAV-8** | P1 | Mobile double-axis-scroll trap; tiny side-arrow targets (mobile reviewers) | `touch-action:pan-y` already makes touch-scroll safe, but arrows stay prominent on mobile while hidden ≥1024px. → De-emphasize (not remove) mobile arrows (~45% at rest, full on active/focus); audit hit target vs 44×44px. | `CylinderCarousel.vue:450-461,437-439,462-464` | S / low |
| **NAV-9** | P2 | Every active-state uses the same violet glow — nothing reads as authoritative (multiple) | Single `--ui-primary` reused across 4 active contexts. → After NAV-6 reduces to two systems, differentiate by *treatment*: top bar = persistent filled chip; `.cyl-dots` = momentary glow. Keep the hue (brand anchor). | `TableOfContentsBar.vue:74-76`; `CylinderCarousel.vue:526-528`; `index.vue:183-184,270-271`; `main.css:222` | S / low |
| **NAV-10** | P2 | No `aria-current` on the active nav pill (implicit in every "no you-are-here" complaint) | Bar has no concept of "active"; sibling `CylinderCarousel.vue:375` already sets `aria-current`. → After NAV-6 scrollspy lands, bind `:aria-current` on stage pills, mirroring the sibling. | `TableOfContentsBar.vue:41-48`; `CylinderCarousel.vue:375` | S / low |

### B. Page narrative, density cliff & primary CTA

| ID | P | Complaint (personas) | Root cause → Fix | file:line | Eff/Risk |
|----|---|----------------------|------------------|-----------|----------|
| **NARR-1** | P0 | UPLOAD sits behind a theme dropdown + Light/Dark toggle — 3 decisions before the 1 action (Mom, Billionaire, Bystander, Web) | Page-level prefs laid out above/heavier than the real first action. → Move theme/framing block into the ToC bar (icon+popover) or the footer; downgrade the Upload section's forward-nav button from `primary` to neutral; reserve `primary` for a real "Upload a photo" CTA under the hero. | `index.vue:143-163,172-196`; `UploadIntakeCard.vue:68-98` | M / low |
| **NARR-2** | P0 | Density cliff: the full ΔE / "Merge input cap 128" / "Histogram bits" / O(n²) grid appears with no on-ramp (all) | `CombineCard` renders every merge-tuning control unconditionally as the first interactive surface after upload. → Split into two tiers: always show per-image palette + Lock/Re-run + Histogram; gate the control grid behind "Show advanced merge settings" (`UCollapsible`); rewrite the O(n²)/ΔE help to lead with plain consequence; keep the schema/role-count field always visible. | `CombineCard.vue:161-251,186,227,193-204`; `index.vue:52,76-79` | M / low |
| **NARR-3** | P0 | No plain-language "what is this / who's it for" before the jargon; OKLCH/seeds/ΔE cold (Mom, Billionaire, Bystander) | Hero is a technical tagline for the already-sold; the plain doc exists but is ordered last. → Add a plainer lead sentence to `HeroBanner` ("Give it a few colors or a photo, get back a full, accessible palette for your app"), demote the technical line; pull `01-what-is-iridis.md`'s opener into a `WhatIsIridis.vue` block under the hero. | `HeroBanner.vue:44-51`; `content/01-what-is-iridis.md:6` | M / low |
| **NARR-4** | P1 | The plain-English explainer accordion is buried at the very bottom (multiple) | `index.vue` hardcodes "every stage, then every doc"; docs' own numeric order is preserved only *within* the last section. → Special-case `01-what-is-iridis` (and maybe `02`) directly under the new intro block, `default-open`; exclude from the bottom loop to avoid double-render; verify Next/Prev sequencing. | `index.vue:255-304,290,296`; `content/01-what-is-iridis.md`; `AccordionPanel.vue:4-11` | M / med |
| **NARR-5** | P1 | Hero copy ends on `engine.run()` in monospace — "not for you" (Mom, Billionaire, Bystander) | A dev flourish placed as the last thing read before the fold. → Reorder the hero paragraph to end on the plain outcome; move `engine.run()` to a small caption/badge near the (relocated) theme control as an easter egg. | `HeroBanner.vue:50` | S / low |
| **NARR-6** | P2 | Density whiplash — dense lab vs airy accordion are two spacing systems (multiple) | Two components invented two "labeled setting" languages; the reusable airy `ControlPlane.vue` is used by only one consumer. → Wrap `CombineCard`'s controls in `ControlPlane.vue`; loosen to single-column / `gap-y-6` for multi-line-help sliders. Structurally supports NARR-2. | `CombineCard.vue:161-251`; `AccordionPanel.vue:56`; `ControlPlane.vue:1-27` | M / low |
| **NARR-7** | P2 | 12-step pipeline reads as a jargon grocery list (multiple) | Component surfaces the engine's raw task registry as the primary view; the helpful 4-concept framing is a trailing footnote; an already-computed phase grouping is unused. → Move the 4-stage paragraph *above* the accordion; group the 12 items under Intake/Resolve/Enforce/Emit using `stageNamesByPrefix`. Pure reorder/grouping. | `colorPipeline.ts:10-14`; `PipelineExplainer.vue:32-42,61-71,201-210` | M / low |

### C. Decorative effects fighting legibility (some read as defects)

Sequencing: DECOR-2 and DECOR-4 both touch carousel/ambient rendering — one owner. DECOR-6
(global glow multiplier) lands **last**, after the specific overshoots, else it masks
rather than fixes them.

| ID | P | Complaint (personas) | Root cause → Fix | file:line | Eff/Risk |
|----|---|----------------------|------------------|-----------|----------|
| **DECOR-1** | P0 | Doubled section titles read as print misregistration / "two pages on top of each other" (Design Snob, Drunk) | `.glow-text` stacks a 12px + a **40px** blur (>2× glyph height) → the outer layer reads as a second, out-of-focus copy. | Collapse `.glow-text` to a single tighter shadow (`~6px`, `color-mix` w/ `--glow`), keeping `--iridis-glow-strength`. All consumers inherit. | `main.css:222-225`; `index.vue:183,270`; `CombineCard.vue:87`; `ScaleCard.vue:38` | S / low |
| **DECOR-2** | P0 | Ghost neighbor panels bleed in with legible text — "visual tinnitus", dizzy | `faceStyle()` opacity floor `max(0.12,…)` + blur cap `min(5,…)` keep distant bold text readable; no scrim between deck and background. | Steepen falloff to reach 0 by `ad≈1.5-2`; raise blur ceiling (`min(10,ad*3)`); add a `.cyl-scene::before` edge-gradient scrim above far cards, below near neighbors. | `CylinderCarousel.vue:136-154,319-347,416-440` | M / med |
| **DECOR-3** | P0 | Full-bleed violet "radioactive lozenge" spanning the row | Single-item stage groups (Upload/Combine) render one `.cyl-dot flex-1` that stretches to full width + active-glow. | Cap the dot: `.cyl-dot { flex:0 1 auto; min-width:90px; max-width:220px }` — `justify-content:center` then centers it. | `stageGroups.ts:20-29`; `CylinderCarousel.vue:367-378,523-528`; `BalancedWrap.vue:31-71` | S / low |
| **DECOR-4** | P1 | Starfield sits behind text; dots land inside the tagline letterforms | Particle placement is fully random with no text-exclusion; the hero is the one text block with no scrim (unlike `.glass`/`.iridis-card`/`.toc-bar`). | (1) Add a soft radial-gradient vignette behind the hero title/tagline wrapper (ships alone). (2) Give `randomPlacement` an optional exclusion rect for the hero text box. | `randomPlacement.ts:2-4`; `presets/futuristic.ts:9`; `AmbientBackground.vue:192-205`; `HeroBanner.vue:26,41-51` | M / low |
| **DECOR-5** | P1 | `prefers-reduced-motion` only partially honored — effects persist even with reduce-motion set | `.pulse`/`.float`/`.glass::before`/`.iridis-card::after` are absent from the reduced-motion block; `CylinderCarousel` transition is an **inline** `:style` (unreachable by media query). | Extend `main.css:294-296` to `animation:none !important` those utilities; in `CylinderCarousel`, read `matchMedia('(prefers-reduced-motion:reduce)')` (pattern already in `MotionShowcase.vue:48`) and short-circuit `faceStyle()` transition. | `main.css:226,231,294-296,166,214,75-82`; `CylinderCarousel.vue:152` | M / low |
| **DECOR-6** | P2 | "Kill the glow" — aggregate density too high for a precision instrument (Design Snob, general) | Sum of individually-OK effects stacking. → **After** DECOR-1..5: values-only pass — lower theme-scoped `--iridis-glow-strength` (Futuristic 1 → ~0.75-0.8), drop `.glass::before` sheen ceiling. Reversible in one place; needs a visual sweep across 12 themes × 2 framings. | `main.css:32-34,165`; `presets/futuristic.css:16` | L / low |

### D. Contrast, swatch & output legibility ("physician, heal thyself")

| ID | P | Complaint (personas) | Root cause → Fix | file:line | Eff/Risk |
|----|---|----------------------|------------------|-----------|----------|
| **ROLES-1** | P0 | Red "fail" badges alarm newcomers with no explanation; "like I did something wrong" (Mom, Bystander) | **Real classification bug:** `minRatioForRole` defaults *structural* roles (border, overlay, code-bg, surface, on-brand — no `contrastPairs` entry) to the 4.5 body-text threshold, so the table asserts a *false* accessibility failure about roles never subject to it. | `minRatioForRole.ts`: if the role's `intent` is `background`/structural, return `undefined`. `complianceFor.ts`: return `n/a` for undefined. Badge + 4 render sites in `RolesTable.vue`: distinct neutral "n/a" styling + tooltip ("structural role — not a text pairing"). `sortRoleRows.ts`: rank `n/a` separately. | `minRatioForRole.ts:1-20`; `RoleSchemaByName.ts:191-204,237-250`; `complianceFor.ts`; `RolesTable.vue:53-167`; `complianceBadgeColor.ts` | M / low |
| **CONTRAST-1** | P0 | Nav labels are low-contrast grey/lavender on near-black — the chrome fails its own bar (Mom, Bystander, general) | `color="neutral"` pills read an **ungated** Nuxt-UI tonal *scale* shade (`derive:variant` lightness curve), bypassing `enforce:contrast` which only validates a role's single base hex. Structurally unverified across 10 presets + user seeds. | (1) Scoped mitigation: `.toc-pill { color: var(--ui-text-dimmed) }` (the AA-gated shortcut the hero already uses). (2) Root: in `Tokens.mapFromEngine`, re-check the specific shade Nuxt UI renders as text vs `--ui-bg` and nudge lightness if < 4.5:1. (3) Sweep other `color="neutral"` text chrome. | `Tokens.ts:16-77`; `RoleSchemaByName.ts:35,194,240`; `TableOfContentsBar.vue:41-73`; `HeroBanner.vue:44` | S (mitigation) / M (root) / low |
| **CONTRAST-2** | P2 | Hero tagline reads soft grey (Mom, Bystander) | **Nuance (pixel-measured):** the tagline is actually ~6.9:1 (AA-pass) — it's a *hierarchy* perception: the dimmest text sandwiched between two bright anchors, while claiming "contrast-enforced." | Promote `HeroBanner.vue:44` `text-muted` → `text-toned` (one step brighter, still AA-gated) so the most-read line shows the best tier, not the minimum-legal one. | `HeroBanner.vue:41-51` | S / low |
| **SWATCH-1** | P0 | Near-black swatches vanish into the near-black card; can't tell chips apart (Mom, Bystander, general) | Shade-ramp cells set only `backgroundColor`; a 2px gap (the card's own dark bg) is the only separator — collapses for 800–950 chips. | Add an inset ring per cell: `ScaleCard.vue:51` + `PaletteCarousel.vue:118` → `ring-1 ring-inset ring-(--ui-border)/70` (token already used elsewhere). | `ScaleCard.vue:47-54`; `main.css:142-153`; `PaletteCarousel.vue:113-121` | S / low |
| **SWATCH-2** | P1 | Same vanish in Combine's per-image palette preview | Border is `border-default/50` — the `/50` halves an already-subtle border; the same file's other grid uses full opacity. | Drop `/50` at `CombineCard.vue:106` → `border border-default`. | `CombineCard.vue:104-112,270-276` | S / low |
| **CODE-1** | P1 | Raw CSS-vars hex dump reads as "the Matrix / the back office on the front page" (Mom, Bystander, general) | `CodeBlock` has no caption/filename affordance; all 13 formats render identically (Copy button + unframed code). `ProsePre` already destructures a `filename` it discards. | Add optional `caption` prop to `CodeBlock` (file-tab label); pass per-format filename + a concrete per-format instruction from `OutputFormatCard`; forward `ProsePre.filename`; for the longest formats, default to a shorter preview with "Show full file (N lines)" (Copy still copies all). | `OutputFormatCard.vue:16-27`; `CodeBlock.vue:44-61`; `ProsePre.vue:7-37` | M / low |

### E. Token purity — the UI must render entirely from pipeline output

| ID | P | Requirement | Fix | Eff/Risk |
|----|---|-------------|-----|----------|
| **TOKEN-1** | P0 | Every text/background/border/shadow color on every interface surface must come from the engine's output tokens (`--ui-*` / role variables), so the systemic contrast gate (CONTRAST-1) actually governs the whole UI. | Tree-wide audit of `site/app/components`, `pages`, `assets/css`: grep for color literals (`#`, `rgb(`, `hsl(`, `oklch(` used as a literal fill, and literal Tailwind palette utilities `text|bg|border|ring|from|to|via-(gray|slate|zinc|neutral-\d\|red\|green\|…)-\d`). Replace each with the correct pipeline token (`text-muted`/`text-toned`/`--ui-text*`, `bg-elevated`, `border-default`/`--ui-border`, role vars). Legitimate non-UI exceptions: the engine's *own* generated output samples (swatch fills, the Roles/CSS-vars/RDF output the tool literally emits), theme-preset definition files, and syntax-highlight token maps that are themselves engine output. Acceptance: the grep returns zero *chrome* hits. | Runs **last**, tree-wide, single owner (touches many files → cannot run concurrently with the structural waves). | M / low |

---

## Do-no-harm: things reviewers loved — preserve these

The remediation must not sand these off; several fixes explicitly keep them:

- The **iris/hex logo mark** and the **chrome IRIDIS wordmark** (near-universal praise).
- The **starfield made of the product's own palette** — keep it; only add a scrim behind
  text (DECOR-4) and honor reduce-motion (DECOR-5).
- The **live Roles Table** with AAA/AA badges — "practices what it preaches." ROLES-1 only
  fixes the *false* fails; keep the honest ones.
- The **single clear UPLOAD** front door — NARR-1 makes it *more* prominent, not less.
- The **restrained single violet accent** — NAV-9 keeps the hue, changes only treatment.
- The **Copy affordance** and the **in-place help microcopy** (Web Designer's "textbook").
- The **numbered docs accordion** and the familiar **Light/Dark** toggle.

---

## Phased execution plan (sprout-and-swap, wave-partitioned by file ownership)

**Execution mapping (as dispatched)** — the findings collapse onto a few hot files
(`index.vue`, `main.css`, `CylinderCarousel.vue`, `HeroBanner.vue`, `CombineCard.vue`), so
parallelism is bounded by file-disjointness:

- **Wave A** *(parallel ×4, disjoint files)* — **NAV** (NAV-1…10) · **TOKENS/contrast**
  (CONTRAST-1 systemic gate + ROLES-1) · **CODE** (CODE-1) · **SWATCH** (SWATCH-1).
- **Wave B** *(parallel ×2, disjoint files)* — **NARRATIVE** (NARR-1…7 + SWATCH-2 + hero
  vignette DECOR-4 + CONTRAST-2) · **DECOR** (DECOR-1,2,3,5 + particle-exclusion DECOR-4).
- **Wave C** *(sequential, single owner, tree-wide — cannot run concurrently)* — **TOKEN-1**
  purity sweep, then **DECOR-6** glow-values tune, very last.

The finding-level batching below (Waves 0–3) is the rationale for that grouping.



**Wave 0 — Quick wins & defect fixes** *(ship first; isolated, low-risk, high visible ROI).*
Each is a self-contained edit; partition by file so they parallelize. `main.css` is touched
by DECOR-1 **and** DECOR-5 → one owner does both sequentially.
- DECOR-1 (`.glow-text` single shadow) · DECOR-3 (`.cyl-dot` cap) · DECOR-4 step 1 (hero
  vignette) · DECOR-5 step 1 (`main.css` reduce-motion) — *decor owner, `main.css` + `CylinderCarousel` + `HeroBanner`.*
- SWATCH-1 (`ScaleCard`, `PaletteCarousel` rings) · SWATCH-2 (`CombineCard` border) ·
  CONTRAST-1 mitigation (`.toc-pill` color) · CONTRAST-2 (`text-toned`) — *tokens/swatch owner.*
- NAV-4 (`--toc-height`) · NAV-5 label shortening · NAV-7 relabel · NARR-5 hero reorder ·
  NARR-4 stopgap (`default-open`) · NARR-7 partial (move 4-stage paragraph up).

**Wave 1 — Navigation architecture** *(the #1 issue; single owner — shared files).*
NAV-1, 2, 3, 6, 8, 9, 10 + finalize NAV-5. Sprout the new two-tier scrollspy bar beside the
old, wire mobile collapse, merge `.cyl-dots` with the chevron stepper, then swap. Touches
`TableOfContentsBar.vue`, `useNavigationTargets.ts`, `CylinderCarousel.vue`, `BalancedWrap.vue`,
`index.vue` — all shared → **one agent, sequential.** Do not start Wave 2 until the swap is green.

**Wave 2 — Narrative & progressive disclosure** *(after Wave 1; shares `index.vue`).*
NARR-1, 2, 3, 4, 6. Add `WhatIsIridis.vue`, hoist doc 01, gate `CombineCard` advanced
controls, relocate theme/CTA block, adopt `ControlPlane` for consistent spacing.

**Wave 3 — Depth, glow & contrast root-causes** *(parallelizable, disjoint from Wave 2).*
- DECOR-2 (ghost panels) — *same owner as any residual `CylinderCarousel` work from Wave 1;
  sequence after it.*
- ROLES-1 + CONTRAST-1 root-cause — *token/schema layer (`minRatioForRole`, `complianceFor`,
  `Tokens.ts`, `RoleSchemaByName`), disjoint from UI waves.*
- CODE-1 — *`CodeBlock`/`OutputFormatCard`/`ProsePre`, disjoint.*
- NARR-7 full grouping · NARR-6.
- **DECOR-6 last of all** — global glow multiplier + 12-theme × 2-framing visual sweep.

**Verification at every wave boundary:** re-run `capture.mjs` (in scratchpad) to
re-screenshot the same states, eyeball against the pre-fix tiles, and re-run the relevant
persona lens on the changed screens to confirm the complaint is resolved. Gate the body of
work behind `litany typecheck` + `litany lint` + `site` tests before merge.

---

## Traceability — every persona complaint → a finding (nothing dropped)

| Persona complaint | Finding |
|---|---|
| Tab-wall, no hierarchy (all 7) | NAV-2 |
| Sticky bar eats viewport (all) | NAV-3 |
| Cryptic/undifferentiated labels (Drunk, Bystander) | NAV-2 + NAV-5 |
| Desktop label truncation "CSS VARIABLES (SCOPED)" (Web, Snob) | NAV-5 |
| Mobile = 100% menu, hero below fold (all mobile) | NAV-1 |
| Mobile labels clipped both edges "R STREAM"/"(SC…" (Snob, VisDes, Web, Bystander) | NAV-5 |
| Nav labels low-contrast (Web, VisDes) | CONTRAST-1 |
| Sticky bar obscures the section header it jumps to | NAV-4 |
| 3–4 competing wayfinding systems (VisDes, Web) | NAV-6 |
| Chevron `‹ ›` ambiguity (Web) | NAV-7 |
| Everything glows violet at once (VisDes) | NAV-9 |
| Mobile double-axis scroll / tiny arrows (Web, Mom) | NAV-8 |
| No "you are here" (VisDes, Web) | NAV-6 + NAV-10 |
| Density cliff into ΔE/sliders (all) | NARR-2 |
| "What is this" buried at bottom (Mom, Bystander, Billionaire, Drunk) | NARR-4 + NARR-3 |
| No plain-language layer / jargon (Mom, Bystander, Billionaire) | NARR-3 |
| `engine.run()` in the hero (Mom, VisDes, Billionaire) | NARR-5 |
| CTA below fold behind theme/toggle (Web, Mom, Billionaire) | NARR-1 |
| Density whiplash / two spacing systems (VisDes) | NARR-6 |
| 12-step pipeline "grocery list" (Drunk, Billionaire) | NARR-7 |
| Doubled/misregistered titles (Snob, Drunk) | DECOR-1 |
| Ghost neighbor panels bleeding in (Snob, VisDes, Drunk) | DECOR-2 |
| Full-width glowing bars/lozenges (Snob) | DECOR-3 |
| Starfield behind text / dots in letterforms (Snob, VisDes, Web) | DECOR-4 |
| "Kill the glow" aggregate (Snob) | DECOR-6 |
| Reduce-motion not honored (verification ask) | DECOR-5 |
| Chrome fails its own contrast (Snob, VisDes, Web) | CONTRAST-1 |
| Hero tagline reads soft grey (Mom, Bystander) | CONTRAST-2 |
| Dark swatches vanish (VisDes) | SWATCH-1 + SWATCH-2 |
| Red "fail" badges alarm newcomers (Mom, Bystander) | ROLES-1 |
| Raw code / "engine room" on landing (Drunk, Mom, Bystander, Billionaire) | CODE-1 |

**29 findings** across four themes. P0: NAV-1/2/3/4, NARR-1/2/3, DECOR-1/2/3, ROLES-1,
CONTRAST-1, SWATCH-1 (13). P1: NAV-5/6/7/8, NARR-4/5, DECOR-4/5, SWATCH-2, CODE-1 (10).
P2: NAV-9/10, NARR-6/7, DECOR-6, CONTRAST-2 (6).
