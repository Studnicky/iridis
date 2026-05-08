# Living Color — v2 Thesis & Competitor Decomp

## Thesis

A palette is a **point in OKLCH × N-roles vector space**. Static themes are frozen points. A "living" palette is a *path* through that space — chameleons and cephalopod chromatophores do not pick a color, they animate along a trajectory while preserving constraints (visibility, contrast, biological viability).

The v1 engine derives one point. The v2 engine animates between points while continuously enforcing the same constraints (WCAG, role schemas, palette algebra) per frame.

## Vector-space framing

- Palette = vector `[L₁,C₁,h₁, L₂,C₂,h₂, …]` (3·N dimensions for N roles).
- Animation = parameterized curve `t → palette(t)` from `t=0` to `t=1`.
- Easings: `linear`, `cubic-bezier`, `spring`, `chromatic-detour` (path through a 3rd point — warm→cool transitions that visit green, not brown).
- Hue wraparound: shortest-arc by default; `hueDirection: 'cw' | 'ccw' | 'shortest'`.
- Per-frame `enforce:contrast` (cheap — full derivation < 5 ms). Constraints survive the morph.

This unlocks **palette algebra**:

| Operation | Meaning |
|---|---|
| `lerp(a, b, 0.3)` | 30 % toward palette `b` from `a` |
| `a − b` | per-role OKLCH delta vector |
| `nearest(a, corpus)` | closest preset to a custom palette (perceptual NN) |
| `drift(current, derived) > θ` | "user adjusted accent past tolerance — re-derive?" |
| `perpendicular(a, axis)` | move orthogonally in chroma plane while keeping L/h |

## Architecture implications

A second engine layer — **`Animator`** (or `livingPalette`) — consumes the same `Engine` per tick. New plugin candidates fall out:

| Plugin | Role |
|---|---|
| `iridis-anima` | interpolation tasks, easings, scheduler hooks (RAF in browser, `setTimeout` in Node) |
| `iridis-pulse` | reactive bindings: time-of-day, audio FFT, scroll, focus, ambient light, weather sensors |
| `iridis-fsm` | XState-style palette state machine (`mood: calm → focused → alert → resolved`) |
| `iridis-trajectory` | curated paths through palette space — sunrise, lava-lamp, bioluminescence, polar-aurora |

Reactive signals likely live behind a plugin contract, NOT in core's `PipelineContext` — keeps core platform-free. To be re-decided once we measure the friction.

## Naming — proposal

### Brand: `iridis`

Latin/Greek for *rainbow*. Six characters, evocative, NPM-clean, fits the workspace's Mechanicus/mystical aesthetic (auspex, fabricator, archivum, grimoire, magos), telegraphs "color" without being literal. Short enough that prefix-naming the plugins reads well.

### v1 packages

| Package | Folder | Role |
|---|---|---|
| `@studnicky/iridis`            | `packages/core`       | core engine |
| `@studnicky/iridis-cli`        | `packages/cli`        | runner |
| `@studnicky/iridis-vscode`     | `packages/vscode`     | VS Code theme generator |
| `@studnicky/iridis-stylesheet` | `packages/stylesheet` | CSS variable emitter |
| `@studnicky/iridis-tailwind`   | `packages/tailwind`   | Tailwind theme |
| `@studnicky/iridis-image`      | `packages/image`      | image-pixel intake → palette extraction |
| `@studnicky/iridis-contrast`   | `packages/contrast`   | WCAG / APCA / CVD contrast enforcement |
| `@studnicky/iridis-capacitor`  | `packages/capacitor`  | Capacitor native chrome (StatusBar, Splash) |
| `@studnicky/iridis-rdf`        | `packages/rdf`        | RDF graph emitter (Turtle, TriG, N-Quads, JSON-LD) |

### v2 packages (post-v1)

| Proposed | Role |
|---|---|
| `@studnicky/iridis-anima` | animation / interpolation engine |
| `@studnicky/iridis-pulse` | reactive signal bindings |
| `@studnicky/iridis-fsm` | palette state machine |
| `@studnicky/iridis-trajectory` | curated palette paths |
| `@studnicky/iridis-algebra` | palette math (lerp, delta, nearest, perpendicular) |

### Naming rules going forward

- Body word names the function literally. No poetic Latin. (`-image` not `-imago`, `-contrast` not `-aegis`, `-rdf` not `-codex`.)
- Platform plugins keep platform names (`-vscode`, `-capacitor`, `-tailwind`) — clarity beats poetry where the platform IS the brand.
- Latin-leaning Mechanicus aesthetic where natural; never forced.
- NPM-clean: lowercase, single hyphen between brand and body.

### Rename strategy

The in-flight workspace conversion uses literal `@studnicky/iridis-*` names. Rename pass before first publish: search-replace at workspace root, update `exports` maps, update the CLI's `enable*` flag → package-name resolver, update example imports. Trivial because nothing has shipped to the registry yet.

## Competitor decomp — survey list

After v1 lands, write a `decomp.md` per major competitor. Categories:

### Static palette generators

Coolors · Adobe Color · Khroma · Huetone · uicolors.app · tints.dev · Realtime Colors · Color Hunt · Paletton · Material Theme Builder · Stylify Me · Themer (mattvague).

### Token systems / design-system color libs

Radix Colors · Open Props · Tailwind default palette · Primer Prism (GitHub) · USWDS color tokens · IBM Carbon · Atlassian Design Tokens · Polaris (Shopify) · Bootstrap theming · Mantine theme · Chakra UI tokens.

### Dynamic / OS-level

Material You / HCT (Google) · Apple Dynamic Colors · Windows Accent System · KDE Plasma color schemes · GNOME accent colors.

### Tools (perceptual)

Leonardo (Adobe) · Huetone · Polychrom (Figma) · Themer · Color Tools (Stripe) · Atelier · Theme Studio for VS Code · Primer Theme Builder · Wildlight (existing prior art).

### Color libraries (math)

Culori · Color.js (Lea Verou) · Chroma.js · TinyColor · Okhsl/Oklab reference impls (Björn Ottosson) · d3-color · ColorTranslator.

### Image-driven palettes

Vibrant.js / node-vibrant · ColorThief · Pictaculous · image-palette · Smart Crop palette extraction.

### Animation / motion-color

Framer Motion color interpolation · GSAP color plugin · Lottie color overrides · Rive runtime palettes · CSS Houdini Properties & Values API.

### Accessibility

APCA / SAPC (Myndex) · Stark · Contrast Ratio (Lea Verou) · Polypane · WAVE · axe-core color checks.

### Research / academic

Brettel-Viénot CVD · MIT Colorgorical · Adobe research on perceptually uniform palettes · Microsoft IEUM · NASA Ames color-vision deficiency studies.

### What to extract from each

Per competitor, capture:
1. Color model / math foundation
2. Role / token taxonomy (if any)
3. Plugin or extension surface
4. Accessibility story
5. Animation story
6. What's worth lifting; what's a deliberate counter-decision

## White space

None of the surveyed projects treat palettes as **animatable, contrast-enforced, plugin-composed vectors**. Material You comes closest with HCT-based dynamic color but is locked to Google's tonal-palette model and not pluggable. Culori and Color.js give us math; nobody composes math + roles + contrast + animation + reasoning + reactive signals into one engine.

That's the v2 wedge.

## Action items (deferred until v1 lands)

- [ ] Spike `iridis-anima` against the existing engine — measure per-tick budget for 60 fps role morphing on a 12-role schema.
- [ ] Survey each competitor above; produce `docs/decomp/<name>.md` per entry.
- [ ] Define the palette-algebra API (`lerp`, `delta`, `nearest`, `perpendicular`).
- [ ] Decide whether reactive signals belong in core's `PipelineContext` or stay in a plugin layer.
- [ ] Rename workspace packages from `@studnicky/iridis-*` to `@studnicky/iridis-*` before first publish.
