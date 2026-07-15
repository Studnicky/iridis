# iridis — Bug Audit Report

**Date:** 2026-07-15 · **Branch:** develop · **Scope:** the pipeline (`packages/core`, ~6.4k LOC) and the demo UI (`site/app`, ~12.1k LOC)

## Method

A fleet of 12 partitioned finder agents (6 over the pipeline, 6 over the demo UI, each owning a disjoint set of files) swept for correctness defects. Every candidate was then handed to an independent **adversarial verifier** instructed to *refute* it — open the real code, trace callers, and return `CONFIRMED` only with a concrete reproduction, defaulting to `REFUTED` under uncertainty. A parallel structural pass over the codebase-memory graph (complexity, duplication, coupling, dead code) corroborated the hotspots. The seven highest-impact findings were then re-verified by hand against source before certification.

- **Candidates raised:** 47
- **Confirmed:** 38  (🔴 0 · 🟠 7 · 🟡 19 · ⚪ 12)
- **Reclassified as by-design:** 2 (F17, F40 — hue is a nudge anchor, not a pin; see below)
- **Refuted on verification:** 7 (listed at the end — the refutations are themselves useful)
- **Split:** pipeline 20 · demo UI 18

Severity reflects the verifier's adjusted rating (true blast radius), which in several cases is *lower* than the finder's initial call — e.g. latent defects on APIs that no shipping code exercises yet are marked accordingly rather than inflated.

## ✅ Remediation status — COMPLETE (re-verified)

Every one of the 40 findings has been fully addressed and **verified green**. All 40 were re-checked by an independent adversarial verifier reading the committed code; the four it flagged as incomplete were then completed.

- **Outcome:** 39 findings **fixed at root cause** (the 38 confirmed bugs + F40); F17 **confirmed working-as-designed** (hue-blind candidate selection is the intended nudge-anchor model).
- **Verification:** `tsc --build` (packages) 0 errors · `nuxi typecheck` (site) 0 errors · core tests **348/348** · site tests **43/43** · change set **lint-clean**.
- **Waves:** pipeline substrate first (contrast/APCA, color-mix, clustering, engine/registry, model, intake/expand), then the demo UI (FSM, carousel/observers, export pipeline, compliance labels, hue labels), each reviewed and typechecked at the boundary.
- **Re-verification caught & closed 3 partial fixes:** F08 (NaN guard extended to the IntakeHsl/Oklch/Lab siblings), F19 (export pipeline now also threads `cvdCorrect` + `colorSpace`), F06 (effect handlers wrapped so a throw can't wedge the FSM interpreter).
- **F40 resolved (Option A):** role `hue` is now *always* a bounded nudge — never an absolute pin. A missing `hueClamp` defaults to `RoleGeometry.DEFAULT_HUE_CLAMP` (90°). This removes the absolute-pin capability from the published `@studnicky/iridis` library (its two pin tests were rewritten to assert the nudge). The shipping site palette is byte-identical.
- **F17 by-design:** `hue` is a nudge anchor — selection is on lightness/chroma proximity, hue only nudges the winner within the clamp; biasing selection by hue would replace that model.
- Touched files were additionally brought fully **lint-clean** against the repo's strict config (including the one-export-per-file structural convention).

## Executive summary — the themes that matter

Most of the confirmed bugs cluster into a handful of systemic root causes. Fixing the cause clears several findings at once:

1. **APCA is computed incorrectly, everywhere it is computed.** The APCA perceptual exponents are applied *per linearized channel and then again to the summed luminance*, instead of once to the luminance. `Σ wᵢ·linᵢ^p ≠ (Σ wᵢ·linᵢ)^p`, so **every APCA Lc number the engine and site produce is wrong.** The same defect is copy-pasted into the contrast-enforcement search. Downstream, the UI compounds it: one component computes an "APCA compliance %" from *WCAG* thresholds, and the enforcement task compares a *signed* APCA Lc against a positive minimum so every light-on-dark pair is mis-judged. _(F01, F09, F11, F16 — and see the duplication note in the structural section.)_

2. **Hue is interpolated and averaged in raw degrees, ignoring the circle.** Mixing a chromatic colour toward an achromatic endpoint (white/black/grey) drags hue toward the phantom `h=0`, and cluster centroids average hue in raw degrees across the 360→0 seam. Both yield visibly wrong colours. Several UI label/offset helpers likewise render hue deltas the long way round ("+330°" for what is −30°). _(F03, F04, F12, F25, and the low-severity label cluster.)_

3. **The demo-UI state machine can throw itself into a wedged state.** `reduce()` throws on any (state, event) pair it doesn't explicitly handle; `useModeGuardedSend` forces a `SELECT_MODE` regardless of the current state (including mid-drag, which `reduce` does not handle); and `send()` fire-and-forgets the interpreter promise, so the resulting throw becomes a silent unhandled rejection and the UI stops responding. These three compose into one real user-facing failure. _(F05, F06, F07.)_

4. **Contrast enforcement makes locally-greedy choices that fail globally.** `EnsureContrast` commits to the lower-headroom lightness direction and can converge to black when white was reachable; a foreground role shared across multiple contrast pairs gets last-pair-wins colours and a self-contradictory report. _(F02, F18. Two sibling role-resolution findings, F17 and F40, were reclassified — see the reclassified section.)_

5. **The "copy this output" path doesn't match the live palette**, and several compliance badges/labels hardcode WCAG 4.5/7 thresholds regardless of the role's declared target, mislabeling passing roles as failing. _(F19, F27, and the carousel measurement cluster F21/F22/F23.)_


## The pipeline (`packages/core`) — 20 confirmed

### 🟠 HIGH (4)

#### F01 · APCA luminance applies perceptual exponent per-channel instead of to the luminance (Y computed wrong)

- **Severity:** 🟠 HIGH  
- **Location:** `packages/core/src/math/ContrastApca.ts:8`  
- **Category:** color-math · **Slice:** core-contrast-cluster · **Verifier confidence:** 95

**Defect.** fgLuminance/bgLuminance raise each already-linearized (^2.4 via srgbToLinear) channel to ^0.56 (fg) / ^0.65 (bg) BEFORE the weighted sum, then apply() raises the result to ^0.57/^0.56 again. The APCA-W3 spec computes Y = 0.2126729*lin.r + 0.7151522*lin.g + 0.0721750*lin.b (no per-channel exponent) and applies the normTXT/normBG (0.57/0.56) and revTXT/revBG (0.65/0.62) exponents ONCE to the clamped Y values in the contrast step. Math.pow does not distribute over a sum, so Y is materially wrong for any color that is not pure black or pure white, and the soft-clamp threshold (0.022) and low-clip constants no longer correspond to the values they gate.

**Failure scenario.** Text #808080 on background #ffffff: srgbToLinear(0.5)=0.214 per channel. Correct APCA: Ytxt=0.214, Lc=(1^0.56 - 0.214^0.57)*1.14 - 0.027 ≈ 64. This code: fgLuminance=0.214^0.56≈0.422, then Lc=(1 - 0.422^0.57)*1.14 - 0.027 ≈ 41.6. A UI gating text on APCA Lc>=60 accepts/rejects the wrong colors (reports 42 instead of 64).

**Suggested fix.** Compute Ytxt/Ybg as plain relative luminance (0.2126729*lin.r + 0.7151522*lin.g + 0.0721750*lin.b) with no per-channel exponent, and apply the 0.56/0.57 (and reverse-polarity 0.62/0.65) exponents only to txtClamp/bgClamp inside apply(), which already does the second application.

**Adversarial repro (verifier).** Text #808080 (channel 128/255=0.50196) on background #ffffff. srgbToLinear.decode(0.50196)=((0.50196+0.055)/1.055)^2.4≈0.2159 per channel; decode(1.0)=1.0. Correct APCA: Ytxt=0.2159, Lc=(1^0.56 − 0.2159^0.57)·1.14 − 0.027 ≈ 0.637 → Lc≈64. Current code: fgLuminance=0.2159^0.56≈0.4238, Ybg=1.0, normal branch Lc=(1 − 0.4238^0.57)·1.14 − 0.027 ≈ 0.4142 → Lc≈41.4. A UI/enforcement pass gating on APCA Lc>=60 (EnforceApca requiredLc) therefore rejects and over-corrects #808080-on-white text that actually passes at Lc≈64, because the code reports ≈41.

---

#### F02 · EnsureContrast picks the step direction from fg-vs-bg lightness, committing to the wrong (lower-headroom) side

- **Severity:** 🟠 HIGH  
- **Location:** `packages/core/src/math/EnsureContrast.ts:119`  
- **Category:** logic · **Slice:** core-contrast-cluster · **Verifier confidence:** 95

**Defect.** step = fgL < background.oklch.l ? -0.02 : +0.02 lightens the foreground whenever it starts lighter than the background and darkens it whenever it starts darker. Contrast is only monotonic within a polarity branch: to maximize contrast against a fixed background you must move toward the luminance extreme FARTHER from the background, which depends on the background alone, not on where the foreground started. When foreground and background are on the same side (both light or both dark) the chosen direction heads to the near extreme, which can have far too little contrast headroom, so the loop drives L to a boundary and returns a color that fails minRatio even though a valid solution exists in the opposite direction.

**Failure scenario.** foreground OKLCH L=0.95 (near white) on background OKLCH L=0.90 (light gray), minRatio=4.5 (WCAG AA). 0.95<0.90 is false -> step=+0.02, loop drives L->1.0 and returns white; white-vs-L0.90 contrast is ~1.3 (<4.5), a failing result, while darkening toward black yields ~16:1. Symmetric failure for dark-fg on dark-bg.

**Suggested fix.** Derive the direction from the background: step = background.oklch.l > 0.5 ? -0.02 : +0.02 (darken fg on light bg, lighten on dark bg), or evaluate both directions and keep whichever first reaches minRatio.

**Adversarial repro (verifier).** Call ensureContrast.apply(fg, bg, 4.5, 'wcag21') where fg = OKLCH L=0.95,C=0,H=0 and bg = OKLCH L=0.90,C=0,H=0. Initial contrast ~1.165 < 4.5 enters loop; fgL(0.95) < bgL(0.90) is false so step=+0.02; loop lightens to L=1.0 (white), contrast vs bg ~1.348 < 4.5, newL===1 boundary returns the failing white. Darkening toward black (L=0) would yield ~15.58:1. Verified numerically with the repo's OklchToRgbRaw + WCAG luminance math: LOOP RESULT { newL: 1, r: 1.348, ok: false }.

---

#### F03 · MixHsl interpolates hue toward an achromatic (s=0) endpoint's hue=0, yielding wrong-hue theme colors

- **Severity:** 🟠 HIGH  
- **Location:** `packages/core/src/math/MixHsl.ts:23`  
- **Category:** color-math · **Slice:** core-color-math · **Verifier confidence:** 93

**Defect.** Identical root cause to MixOklch, in HSL space. rgbToHsl assigns h=0 to any achromatic input (delta=0 → the hue branch is skipped, h stays 0). MixHsl then lerpAngles the chromatic endpoint's hue toward 0, so mixing a gray/near-white/near-black with a saturated color produces an intermediate whose hue is dragged toward 0 (red) rather than staying near the colored endpoint. This has a confirmed live trigger: packages/vscode/src/tasks/EmitVscodeUiPalette.ts builds selection/border/accent colors with mixHslHex(bg_HEX, accent_HEX, w) where bg is frequently near-white (s=0).

**Failure scenario.** EmitVscodeUiPalette.ts:120 mixHslHex('#ffffff', blueAccent, 0.28): white → rgbToHsl gives h=0,s=0; blue accent h≈240. lerpAngle(0, 240, 0.28): diff=240>180 → -120; result = 0 + (-120*0.28) = -33.6 → +360 = 326.4. The generated editor.selectionBackground comes out hue ≈326 (pink/magenta) at ~28% saturation instead of a light desaturated blue near hue 240.

**Suggested fix.** When one endpoint is achromatic (s below an epsilon), carry the other endpoint's hue instead of interpolating from 0 (per CSS Color 4 powerless-hue handling). Interpolate s and l as before; only lerpAngle the hue when both endpoints have s > eps.

**Adversarial repro (verifier).** mixHsl.apply(fromHex('#ffffff'), fromHex('#3b82f6'), 0.28): bg→HSL(0,0,1); accent→HSL(217.2,0.912,0.598); lerpAngle(0,217.2,0.28) → diff 217.2>180 → −142.8 → 0+(−142.8*0.28)=−40 → +360 = hue 320. Result HSL(320, 0.255, 0.887) = pale magenta/pink instead of the intended pale blue near hue 217. This is the value emitted for editor.selectionBackground / list.activeSelectionBackground / list.focusBackground / button.secondaryBackground on any light theme whose background role is pure white.

---

#### F04 · ClusterMedianCut centroid averages hue in raw degrees — hue wraparound produces the wrong color

- **Severity:** 🟠 HIGH  
- **Location:** `packages/core/src/math/ClusterMedianCut.ts:22`  
- **Category:** color-math · **Slice:** core-contrast-cluster · **Verifier confidence:** 90

**Defect.** bucketMedian accumulates sumH += col.oklch.h and returns fromOklch(..., sumH/n): a naive arithmetic mean of hue angles in degrees. Every other clusterer in this package (kmeans, weighted median-cut, Wu) deliberately averages in Cartesian OKLab (a=c*cos h, b=c*sin h) to avoid this. For any bucket that straddles the 0/360 boundary the averaged hue lands on the opposite side of the wheel, so the centroid color is completely wrong.

**Failure scenario.** A bucket of reds at hue 350 deg and 10 deg (both crimson): centroid hue = (350+10)/2 = 180 deg -> cyan. The reduced palette emits a cyan swatch for a cluster made entirely of reds. Reds/pinks/magentas straddle 0 deg constantly in real images.

**Suggested fix.** Average in Cartesian OKLab like bucketCentroid in ClusterMedianCutWeighted: accumulate sumA += c*cos(h), sumB += c*sin(h), then C=hypot(aMean,bMean), H=atan2(bMean,aMean) normalized to [0,360).

**Adversarial repro (verifier).** clusterMedianCut.apply([colorRecordFactory.fromOklch(0.5,0.15,350), colorRecordFactory.fromOklch(0.5,0.15,10)], 1). targetK = min(1, 2) = 1, so the while loop at ClusterMedianCut.ts:80 never executes and the single bucket holds both crimson records. bucketMedian sums h: sumH = 350+10 = 360, n = 2, and returns fromOklch(0.5, 0.15, 360/2 = 180) — a cyan/teal color. Two crimsons reduce to cyan. This flows through ClampCount.ts:59 (clusterMedianCut.apply(state.colors, max)) and the unweighted fallback in image ClusterDispatcher.ts:114.

---

### 🟡 MEDIUM (11)

#### F08 · Non-finite numeric channels (NaN) are accepted by intake type guards and produce corrupt '#NaN…' records

- **Severity:** 🟡 MEDIUM  
- **Location:** `packages/core/src/tasks/intake/IntakeRgb.ts:20`  
- **Category:** nan-propagation · **Slice:** core-tasks-intake · **Verifier confidence:** 96

**Defect.** `isRgbInput` (and the sibling guards in IntakeHsl/IntakeOklch/IntakeLab) accept any value where `typeof x === 'number'`, which includes `NaN`. `NaN > 1` is false so no scaling occurs, and `fromRgb(NaN, …)` flows into `rgbToHex`, where `Math.round(clamp01(NaN)*255)` is `NaN` and `NaN.toString(16)` is the literal string 'NaN'. The record's hex becomes an invalid CSS string and all oklch fields become NaN — silent data corruption instead of a validation error.

**Failure scenario.** Input `{ r: NaN, g: 0, b: 0 }` (e.g. from a failed `parseFloat` upstream or malformed JSON) → passes isRgbInput → record.hex = '#NaN0000', record.oklch = { l: NaN, c: NaN, h: NaN }. The invalid hex propagates into CSS output and NaN oklch poisons downstream clustering/role math.

**Suggested fix.** Guard each numeric channel with `Number.isFinite` in the type guards (or validate in parse), throwing a ValidationError for non-finite input so IntakeAny can reject the entry instead of emitting a corrupt record.

**Adversarial repro (verifier).** state.input.colors = [{ r: NaN, g: 0, b: 0 }] (e.g. NaN from an upstream parseFloat failure). intakeRgb.run(state, ctx) parses it without throwing and pushes a record where record.hex === '#NaN0000', record.oklch === { l: NaN, c: NaN, h: NaN }, record.rgb.r === NaN. Verified directly: `#${toHex(NaN)}${toHex(0)}${toHex(0)}` evaluates to '#NaN0000'.

---

#### F09 · APCA contrast is compared as a signed Lc against a positive minRatio, so every light-on-dark pair is mis-judged and reported as failing

- **Severity:** 🟡 MEDIUM _(finder reported high; adjusted on verification)_  
- **Location:** `packages/core/src/tasks/enforce/EnforceContrast.ts:96`  
- **Category:** contrast-polarity · **Slice:** core-tasks-resolve · **Verifier confidence:** 94

**Defect.** measureContrast() for algorithm 'apca' returns contrastApca.apply(fg,bg) directly (line 24-27), and contrastApca returns a SIGNED Lc*100: positive for dark-text-on-light-bg, NEGATIVE for light-text-on-dark-bg (ContrastApca.ts:42-53). EnforceContrast then compares this signed value against the always-positive minRatio in two places: the pass gate `const passed = ratio >= minRatio` (line 96) and the report `'passed': finalRatio >= minRatio` (line 133). For any light-foreground/dark-background pair the measured value is negative (e.g. -75) while minRatio is positive (e.g. 60), so `-75 >= 60` is always false. This is inconsistent with ensureContrast (EnsureContrast.ts:55-70, apcaLcFromYtxt), which uses Math.abs(Lc*100). Net effect: every dark-polarity (i.e. dark-mode) APCA pair is treated as failing, spuriously triggers a nudge, is flagged adjusted=true, and its contrast report entry is written with passed=false and a negative `ratio` even when the actual contrast (|Lc| = 75) comfortably exceeds the target. The role color itself is usually left intact (ensureContrast short-circuits on its absolute measure), but the primary deliverable — state.metadata['core:contrastReport'] — is systematically wrong for roughly half of real-world pairs, and INFO 'nudging' log noise is emitted for pairs that already pass.

**Failure scenario.** input.contrast = { algorithm: 'apca' }; roles onPrimary = near-white, primary = dark navy; pair { foreground:'onPrimary', background:'primary', minRatio:60 }. Actual APCA |Lc| ~= 90 (excellent). measureContrast('apca', onPrimary, primary) returns -90. Gate `-90 >= 60` is false -> logs 'below minimum ratio; nudging', calls ensureContrast (which returns onPrimary unchanged because its absolute measure 90 >= 60), sets adjusted=true, and pushes report { passed: false, adjusted: true, ratio: -90 }. Consumers of core:contrastReport show a passing dark-mode pair as a failure.

**Suggested fix.** Take the magnitude for the pass/report comparison when the algorithm is APCA: in measureContrast return `Math.abs(contrastApca.apply(fg,bg))`, or compute `const magnitude = algo === 'apca' ? Math.abs(ratio) : ratio;` and compare magnitude against minRatio for both the gate (line 96) and the report (line 133/finalRatio).

**Adversarial repro (verifier).** Set state.input.contrast = { algorithm: 'apca' }. state.roles.onPrimary = near-white ColorRecord (rgb ~{0.98,0.98,0.98}), state.roles.primary = dark navy (rgb ~{0.05,0.07,0.15}). Pair { foreground:'onPrimary', background:'primary', minRatio:60 }. measureContrast('apca', onPrimary, primary): fg luminance high, bg luminance low, so bgClamp<txtClamp -> else branch -> Lc negative -> returns ~ -90 (true |Lc| ~90, an excellent pass). Line 96: -90 >= 60 is false -> logs 'Pair below minimum ratio; nudging'. Line 117: ensureContrast.apply returns onPrimary unchanged (its internal |−90|=90 >= 60), adjusted=true, state.roles[foreground] reassigned to identical value. Line 124: finalRatio = measureContrast(finalFg, bg) = -90. Report entry pushed: { passed:false, adjusted:true, ratio:-90, minRatio:60 } for a pair that genuinely passes. Consumers of core:contrastReport render a passing dark-mode pair as failing.

---

#### F12 · MixOklch interpolates hue toward an achromatic endpoint's phantom hue, producing wrong intermediate colors

- **Severity:** 🟡 MEDIUM _(finder reported high; adjusted on verification)_  
- **Location:** `packages/core/src/math/MixOklch.ts:20`  
- **Category:** color-math · **Slice:** core-color-math · **Verifier confidence:** 90

**Defect.** When either endpoint is achromatic (chroma ~ 0: black, white, or gray), its OKLCH hue is meaningless — black is exactly h=0, white is floating-point noise from atan2 of two ~1e-9 residuals. lerpAngle blindly drags the OTHER (chromatic) endpoint's hue toward that phantom value along the shortest arc. At the midpoint the interpolated chroma is still significant (half the color's chroma) while the hue has been pulled off toward 0/noise, so the intermediate color is objectively the wrong hue. CSS Color 4 §12.2 (powerless/missing hue) mandates carrying the defined hue from the non-achromatic endpoint instead of interpolating. This affects every shade-toward-black, tint-toward-white, and mix-with-gray operation, which are extremely common.

**Failure scenario.** mixOklch.apply(blue, black, 0.5) where blue.oklch = {l:0.45, c:0.31, h:264} and black.oklch = {l:0, c:0, h:0}. lerpAngle(264, 0, 0.5): diff = -264 < -180 → +360 = 96; result = 264 + 96*0.5 = 312. The 'half shade' comes out at hue 312 (magenta) with chroma 0.155 instead of a darker blue near hue 264. Any gradient passing through a gray/white/black stop shows a hue swing at the midpoint.

**Suggested fix.** Before calling lerpAngle, treat a near-zero-chroma endpoint's hue as 'powerless': if a.oklch.c < eps use b.oklch.h for both (and vice-versa); if both are achromatic, hue is irrelevant so skip interpolation. Only lerpAngle when both endpoints have real chroma.

**Adversarial repro (verifier).** mixOklch.apply(blue, black, 0.5) with blue.oklch={l:0.45,c:0.31,h:264} and black.oklch={l:0,c:0,h:0}. lerpAngle(264,0,0.5)=312. Output oklch=(l:0.225, c:0.155, h:312) — a magenta/purple — instead of a darker blue near h:264. Any interpolation through a gray/white/black endpoint shows the same hue swing at intermediate t.

---

#### F14 · Hook queues accumulate duplicates on re-adopt/override, double-running phase tasks

- **Severity:** 🟡 MEDIUM _(finder reported high; adjusted on verification)_  
- **Location:** `packages/core/src/registry/TaskRegistry.ts:40`  
- **Category:** data-corruption · **Slice:** core-engine · **Verifier confidence:** 88

**Defect.** hook() dedups the name table via entries.set(task.name, task) but unconditionally push()es the task into the onRunStart/onRunEnd arrays with no dedup or prior-removal. Engine.adopt() (Engine.ts:119-124) routes every phase-marked task through hook(), and its own docstring (Engine.ts:73-77) advertises re-adopt as idempotent ('re-adopting a plugin overwrites prior entries with the same names, which is how downstream consumers monkey-patch built-ins'). Because the phase arrays never remove the prior instance, re-adopting a plugin, or adopting a second plugin whose task reuses the same name to override a hook, leaves BOTH the old and new task objects in the queue, so the hook runs 2x (or Nx). Additionally, re-hooking a task under a different phase leaves it in both onRunStart and onRunEnd.

**Failure scenario.** Plugin P contributes an onRunStart task 'seed:base' whose run() pushes a fallback ColorRecord into state.colors. Caller does engine.adopt(P); engine.adopt(P) (re-adopt to pick up a newer plugin build, the documented monkey-patch path). On engine.run(input), onRunStart fires 'seed:base' twice, so state.colors receives two identical seed colors instead of one; downstream clamp:count / resolve:roles / role distances are computed against corrupted color set, yielding wrong role assignments.

**Suggested fix.** In hook(), before pushing, remove any existing same-named task from both phase arrays (e.g. filter/splice onRunStart and onRunEnd by task.name), then push into the target phase. This makes hook registration idempotent by name, matching the entries table and the adopt() idempotency contract.

**Adversarial repro (verifier).** const seed = { name: 'seed:base', manifest: { name: 'seed:base', phase: 'onRunStart' }, run: (state) => state.colors.push(fallbackColor) }; const P = { name: 'p', version: '1.0.0', tasks: () => [seed] }; const engine = new Engine(); engine.adopt(P); engine.adopt(P); // documented re-adopt/monkey-patch path. After adopt#1 onRunStart=[seed]; after adopt#2 onRunStart=[seed,seed] (entries map still holds one). engine.run(input) -> hooks('onRunStart') returns [seed,seed], both run() -> state.colors gets two identical seed colors instead of one, corrupting downstream clamp:count / resolve:roles. Equivalent trigger: plugin A hooks 'x' onRunStart, plugin B contributes task 'x' with phase onRunStart to override it -> onRunStart=[A.x, B.x], both execute even though only B.x is name-resolvable.

---

#### F15 · Cached sequence not invalidated by direct engine.tasks.register(); new/override tasks silently ignored

- **Severity:** 🟡 MEDIUM  
- **Location:** `packages/core/src/engine/Engine.ts:287`  
- **Category:** stale-state · **Slice:** core-engine · **Verifier confidence:** 88

**Defect.** this.sequence is memoized (line 287 `??=`) and only reset to null inside adopt() (165) and rebuilt inside pipeline() (228). But EngineInterface exposes the mutable registry publicly as `tasks: TaskRegistryInterface` (registry.ts), and register() is the documented low-level path (quickPalette itself uses engine.tasks.register). If a consumer runs once with no pipeline set (which caches sequence from tasks.list()), then registers or overrides a task via engine.tasks.register(), the next run() reuses the stale cached sequence and the newly registered/overridden task never takes effect.

**Failure scenario.** const e = new Engine(); e.tasks.register(taskA); e.run(input) // caches sequence=[A]; e.tasks.register(taskB); e.run(input) // reuses cached [A], taskB is never executed and produces no output — silently wrong result with no error.

**Suggested fix.** Make TaskRegistry emit an invalidation signal (e.g. a version counter or a callback the Engine subscribes to) on register()/hook(), and have run() rebuild sequence when the registry version changed. Alternatively have Engine own an invalidation callback passed to the registry.

**Adversarial repro (verifier).** const e = new Engine(); e.tasks.register(taskA); e.run(validInput) // sequence memoized = [taskA] via ??= since order.length===0; e.tasks.register(taskB); const s = e.run(validInput) // ??= is no-op (sequence non-null), loop runs [taskA] only, taskB never executes, s.outputs.b === undefined, no error thrown. Same for override: registering a new object under an existing name after a run leaves the cached array pointing at the old task object.

---

#### F16 · EnsureContrast APCA path repeats the per-channel exponent error, corrupting the search target

- **Severity:** 🟡 MEDIUM _(finder reported high; adjusted on verification)_  
- **Location:** `packages/core/src/math/EnsureContrast.ts:40`  
- **Category:** color-math · **Slice:** core-contrast-cluster · **Verifier confidence:** 88

**Defect.** apcaFg (line 38-43) and apcaBg (line 46-51) apply the perceptual exponents 0.56/0.65 per-channel inside the luminance sum, identical to the ContrastApca defect, and apcaLcFromYtxt then applies 0.56/0.57 (or 0.62/0.65) again. Because the Lc the loop compares against minRatio is wrong, the ensure-contrast search for algorithm='apca' converges to the wrong lightness (or never satisfies the test), returning a foreground that does not actually meet the intended APCA Lc.

**Failure scenario.** ensureContrast(fg, bg, 60, 'apca') with a mid-tone fg/bg: the loop's apcaLcFromYtxt reports ~42 where the true Lc would be ~64 (see ContrastApca finding), so it keeps stepping past the true solution or terminates at an L whose real Lc differs from 60 by ~20 points.

**Suggested fix.** Change apcaFg/apcaBg to plain relative luminance (0.2126729*lin.r + 0.7151522*lin.g + 0.0721750*lin.b, no per-channel exponent); keep the norm/rev exponents only in apcaLcFromYtxt.

**Adversarial repro (verifier).** Configure a contrast pair with algorithm:'apca', minRatio:60, foreground resolving to sRGB ~[0.6,0.6,0.6] over background ~[0.1,0.1,0.1] (reverse polarity, light-on-dark). EnforceContrast measures contrastApca ~= 54.6 < 60 and calls ensureContrast.apply(fg,bg,60,'apca'). The loop steps L brighter until the corrupted apcaLcFromYtxt reads >= 60, but the code over-reports by ~9 Lc in reverse polarity, so it stops where the true APCA-W3 Lc is only ~51 — the returned foreground fails the intended Lc 60 while the pipeline report marks it passed. Symmetrically, dark-text-on-light (fg [0.3,0.5,0.7], bg near-white) has the code read 38.9 where canonical APCA is 60.6 (~22-point under-report), so a target of 60 over-darkens the text far past the requested contrast. Root cause: per-channel exponentiation of already-linearized channels at EnsureContrast.ts lines 40-42 and 48-50, compounded by the outer exponent at lines 61/65.

---

#### F18 · A foreground role shared across multiple contrast pairs gets last-pair-wins colors and stale, incorrect report entries

- **Severity:** 🟡 MEDIUM  
- **Location:** `packages/core/src/tasks/enforce/EnforceContrast.ts:119`  
- **Category:** mutation-ordering · **Slice:** core-tasks-resolve · **Verifier confidence:** 88

**Defect.** The enforcement loop mutates state.roles[pair.foreground] = finalFg in place (line 119) as it processes pairs sequentially, and pushes each pair's report entry immediately (line 127-135) based on the state at that moment. When the same foreground role participates in two pairs against conflicting backgrounds, adjusting it for a later pair invalidates the earlier pair — but the earlier pair's already-pushed report entry (passed=true) is never re-checked. The final foreground color satisfies only the last pair, while the report claims the earlier pair passed. No warning is emitted, so an unsatisfiable/conflicting constraint set fails silently with a self-contradictory report.

**Failure scenario.** Pairs in order: [ {fg:'text', bg:'panelDark', minRatio:4.5}, {fg:'text', bg:'panelLight', minRatio:4.5} ] with panelDark near-black and panelLight near-white. Pair 1 nudges 'text' light to contrast with panelDark and pushes { foreground:'text', background:'panelDark', passed:true }. Pair 2 then nudges the (now light) 'text' dark to contrast with panelLight, overwriting state.roles['text']. Final 'text' is dark, so it now fails against panelDark, yet pair 1's report entry still reads passed:true and the role only satisfies panelLight.

**Suggested fix.** Either detect a foreground that appears in multiple pairs and warn/skip re-nudging (treat as unsatisfiable), or run a reconciliation pass that re-measures all pairs against the final state.roles before writing the report so entries reflect the terminal colors rather than intermediate ones.

**Adversarial repro (verifier).** Input: state.roles = { text: mid-gray L≈0.5, panelDark: near-black L≈0.05, panelLight: near-white L≈0.95 }; state.input.roles.contrastPairs = [ {foreground:'text', background:'panelDark', minRatio:4.5}, {foreground:'text', background:'panelLight', minRatio:4.5} ]; algorithm wcag21. Pair 1: text fails vs panelDark, ensureContrast nudges L up to a light value, state.roles['text'] set light, report pushes {foreground:'text',background:'panelDark',passed:true}. Pair 2: reads now-light text, fails vs panelLight, nudges L down to a dark value, overwrites state.roles['text'] dark, report pushes passed:true. Observed wrong output: final state.roles['text'] is dark; measuring dark text vs near-black panelDark gives WCAG ratio ~1.x (< 4.5), so pair 1 is actually violated, yet contrastReport[0].passed === true and no warning was logged.

---

#### F20 · toCssVarName does not escape characters that are invalid in a CSS custom-property name, producing declarations the browser silently drops

- **Severity:** 🟡 MEDIUM  
- **Location:** `packages/core/src/model/ToCssVarName.ts:9`  
- **Category:** correctness · **Slice:** core-model-schema · **Verifier confidence:** 86

**Defect.** The function passes the role name through unchanged except for uppercase->'-lower'. Role names are unconstrained strings (RoleSchemaSchema roles[].name and RoleSchema/PaletteState keys have type:string with no pattern), so any name containing a space, '/', '.', '#', '(', etc. is concatenated verbatim after the prefix, yielding an invalid CSS custom-property identifier. A leading-uppercase name also yields a double-dash (e.g. 'Background' -> '--c--background') that no longer matches the intended '--c-background'.

**Failure scenario.** A user ships a role schema with a semantic role named 'brand/500' or 'nav bar'. During emit, toCssVarName('brand/500','--c-') returns '--c-brand/500' and the stylesheet emits '  --c-brand/500: #aabbcc;'. Because '/' (and the space) are not valid in a custom-property name, the browser treats the whole declaration as invalid and discards it: the role gets no CSS variable, and every var(--c-brand/500) reference falls back to its inherited/initial value, so the intended color never applies — with no error at emit time.

**Suggested fix.** Sanitize before concatenation: replace any run of characters outside [-_a-z0-9] with a safe separator (and guard a leading digit), or CSS-escape the identifier, so the produced name is always a valid custom-property token.

**Adversarial repro (verifier).** Provide an input schema with a role: { name: 'brand/500', ... } (or 'nav bar'). It passes RoleSchemaSchema validation (no pattern on name). After the pipeline, EmitCssVars emits ':root {\n  --c-brand/500: #aabbcc;\n}'. Parsing this CSS, the browser rejects the '--c-brand/500' declaration as invalid (the '/' is not a legal custom-property name char) and drops it; var(--c-brand/500) resolves to its fallback/initial, so the intended color never applies — with no error surfaced at emit time. output.map['brand/500'] likewise holds the unusable '--c-brand/500'.

---

#### F24 · adopt() after pipeline() invalidates the sequence but never re-validates requires ordering

- **Severity:** 🟡 MEDIUM  
- **Location:** `packages/core/src/engine/Engine.ts:165`  
- **Category:** validation-gap · **Slice:** core-engine · **Verifier confidence:** 80

**Defect.** pipeline() runs the requires/ordering validation once (186-225) and caches sequence. adopt() sets this.sequence = null (165) so run() rebuilds the sequence from this.order via this.order.map(resolve) (287-288) — but that rebuild performs NO requires-ordering re-validation. Since adopt() is explicitly the mechanism to override built-ins (73-77), an override can introduce a manifest.requires that the existing pipeline order violates, and it will be executed in the now-invalid order without any fail-fast error.

**Failure scenario.** engine.pipeline(['a','b']) succeeds because task 'a' has no requires. Then engine.adopt(plugin) overrides 'a' with a version whose manifest.requires = ['b'] (a now depends on b running first). run() rebuilds sequence as [a,b] and executes 'a' before 'b', violating the dependency silently and producing incorrect output instead of throwing the CONFIGURATION error pipeline() would have raised.

**Suggested fix.** Extract the requires/ordering validation from pipeline() into a private method and re-invoke it during the sequence rebuild in run() (or at the end of adopt() when an order is already set), so overrides that break ordering fail fast.

**Adversarial repro (verifier).** 1) Adopt a plugin registering task 'a' (manifest with no requires) and task 'b'. 2) engine.pipeline(['a','b']) -> passes (a has no requires), caches sequence, order=['a','b']. 3) engine.adopt(override) where override.tasks() yields task 'a' with manifest.requires=['b']; register overwrites entries['a'], line 165 nulls this.sequence. 4) engine.run(input): this.sequence is null and order.length>0, so it rebuilds ['a','b'].map(resolve) = [a'(requires b), b] and runs a' before b with NO ordering validation. Expected: pipeline-equivalent CONFIGURATION throw ("task 'a' requires 'b', which must appear earlier"). Actual: a' runs before its declared dependency b, silently producing incorrect output.

---

#### F25 · Box clusterers select split channel and split point on raw hue degrees, mis-partitioning hue-wrapping buckets

- **Severity:** 🟡 MEDIUM  
- **Location:** `packages/core/src/math/ClusterMedianCutWeighted.ts:63`  
- **Category:** color-math · **Slice:** core-contrast-cluster · **Verifier confidence:** 80

**Defect.** rangeOf(colors,'h')/360 uses (maxDeg-minDeg)/360, and when 'h' is chosen the bucket is sorted by raw hue degrees and split linearly. For a bucket that straddles 0/360 the reported hue range is spuriously near 1.0 (so hue wins channel selection when the true angular spread is tiny), and the linear sort/split cuts through the far side of the wheel, tearing an adjacent group of hues apart. Same defect in ClusterMedianCut.ts (rangeOf/split) and ClusterWuQuantize.ts (rangeOf line 98, splitAtMinVariance on raw hue). Produces poor, incorrect partitions (a palette slot wasted splitting one red cluster into two) though it does not crash.

**Failure scenario.** Bucket of reds at hues {358,359,1,2}: rangeOf('h')=357 -> hRange=0.99 dominates -> channel 'h'; sort gives [1,2,358,359]; the weighted/variance split cuts between 2 and 358, separating perceptually adjacent reds into two clusters while genuinely distinct hues elsewhere are left unsplit.

**Suggested fix.** Compute hue spread and the split axis in Cartesian a*/b* space (or use a circular range that accounts for wraparound) rather than raw hue degrees, so a cluster spanning 0/360 is treated as tight and split coherently.

**Adversarial repro (verifier).** Bucket of 4 pure reds that wrap the hue origin but vary strongly in lightness, split with k=2. Records (L,C,h): A(0.30,0.1,358), B(0.35,0.1,2), C(0.85,0.1,359), D(0.90,0.1,1), all weight 1. In Bucket.split: rangeOf('l')=0.60, rangeOf('c')=0, rangeOf('h')=359-1=358 → hRange=0.994. Channel selection picks 'h' (0.994>0.60). Sort by raw hue = [A(358,L.3), C(359,L.85), D(1,L.9), B(2,L.35)]; weighted half=2 → splitIdx=2 → left={A,C}, right={D,B}. Both output clusters mix dark and light reds (left centroid L≈0.575, right L≈0.625) — the dark/light distinction is destroyed and the palette gets two near-identical mid-reds. A circular-hue rangeOf would report hRange≈4/360=0.011, so lRange(0.60) wins and the split correctly separates {A,B} (dark reds) from {C,D} (light reds). The current code produces the wrong partition.

---

#### F26 · IntakeRgb byte auto-detect misclassifies floats marginally above 1.0, collapsing colors to near-black

- **Severity:** 🟡 MEDIUM  
- **Location:** `packages/core/src/tasks/intake/IntakeRgb.ts:79`  
- **Category:** numerical-color-math · **Slice:** core-tasks-intake · **Verifier confidence:** 80

**Defect.** The 0..1-vs-0..255 heuristic is `if (r > 1 || g > 1 || b > 1)` then divide ALL channels by 255. Any float RGB triple where a single channel slightly exceeds 1.0 (out-of-gamut result of prior color math, HDR reduction, or float rounding overshoot) is misclassified as 0..255 bytes and every channel is divided by 255, collapsing a light color to near-black.

**Failure scenario.** Input `{ r: 1.0000001, g: 1, b: 1 }` (intended white, with a rounding overshoot) → r>1 true → all channels /255 → (0.0000039, 0.00392, 0.00392) → fromRgb yields hex ≈ '#010101' (near-black) instead of '#ffffff'. Similarly `{ r: 1.02, g: 0.9, b: 0.9 }` (light pink) becomes ≈ '#010101'.

**Suggested fix.** Detect byte scale only when a channel is meaningfully out of the unit range (e.g. `max > 1 + EPS` combined with any channel > ~2), or require the caller to declare the unit. At minimum, treat values in (1, 1+epsilon] as clamped 1.0 rather than as byte data before dividing by 255.

**Adversarial repro (verifier).** In packages/core, call intakeRgb.parse({ r: 1.02, g: 0.9, b: 0.9 }). Line 79: 1.02 > 1 is true, so r=1.02/255=0.004, g=0.9/255=0.00353, b=0.00353. fromRgb -> rgbToHex: Math.round(0.004*255)=1 -> '01', Math.round(0.00353*255)=1 -> '01', '01' => record.hex === '#010101' (near-black). Correct normalized-clamp result would be '#ffe6e6' (light pink). Also parse({ r: 1.0000001, g: 1, b: 1 }) yields '#000101' instead of '#ffffff'.

---

### ⚪ LOW (5)

#### F28 · IntakeHex rejects valid 4-digit CSS hex (#RGBA)

- **Severity:** ⚪ LOW  
- **Location:** `packages/core/src/tasks/intake/IntakeHex.ts:32`  
- **Category:** parser-edge-case · **Slice:** core-tasks-intake · **Verifier confidence:** 92

**Defect.** `Hex.normalize` has branches for 3-, 6-, and 8-digit hex but none for the 4-digit `#RGBA` shorthand defined by CSS Color Module Level 4. A 4-digit string passes the `{3,8}` length gate in parse (line 78) but normalize falls through to `return ''`, causing parse to throw. Under intake:any this makes valid CSS input fail all delegates and raise 'does not match any known color format'.

**Failure scenario.** Input '#0f08' (CSS 4-digit hex: red-green-blue-alpha = #00ff0088) → gate passes (starts with #) → Hex.normalize returns '' (length 4 unhandled) → parse throws → intake:any reports the entry as an unknown color format even though it is valid CSS.

**Suggested fix.** Add a 4-digit branch in Hex.normalize that expands `RGBA` to `RRGGBB` for the canonical hex and derives alpha from the doubled 4th nibble (mirroring the existing 3-digit and 8-digit handling).

**Adversarial repro (verifier).** state.input.colors = ['#0f08'] (valid CSS #RGBA == #00ff0088). Run intake:hex: IntakeHex.parse('#0f08') — gate at line 78 passes (starts with '#'), Hex.normalize returns '' (length-4 cleaned string matches no branch, line 36), parse throws 'intake:hex — could not normalise hex' at line 90-99. Run intake:any on the same input: IntakeHex delegate returns undefined; no other delegate accepts a '#'-prefixed string; IntakeAny.run throws 'intake:any — entry at index 0 does not match any known color format' at line 115. Expected: a ColorRecord with hex #00ff00 and alpha ~0.533 (0x88/255).

---

#### F31 · pipeline() falsely rejects dependencies that are lifecycle (phase) hook tasks

- **Severity:** ⚪ LOW _(finder reported medium; adjusted on verification)_  
- **Location:** `packages/core/src/engine/Engine.ts:203`  
- **Category:** logic-error · **Slice:** core-engine · **Verifier confidence:** 88

**Defect.** The requires-ordering validation only skips deps that are not registered (line 199, treated as math-primitive documentation). A phase/hook task is registered (this.tasks.has(dep) === true), but hook tasks are never placed in the ordered pipeline array — they run via the onRunStart/onRunEnd channels. So order.indexOf(dep) returns -1 and the code throws 'missing-from-pipeline' (line 205-213), even though the hook always runs before/after the main sequence and the dependency is in fact satisfied. This blocks any legitimate pipeline where an ordered task declares requires on a hook task.

**Failure scenario.** A plugin registers an onRunStart hook 'seed:base' and an ordered task 'resolve:roles' whose manifest.requires = ['seed:base']. Caller calls engine.pipeline(['intake:hex','resolve:roles']). pipeline() sees 'seed:base' is registered but not in the order array and throws ModuleError 'requires seed:base, which is missing from the pipeline entirely', making a correct configuration impossible to declare.

**Suggested fix.** Before the indexOf check, skip deps whose resolved task has manifest.phase defined (phase tasks are always-satisfied, out-of-band dependencies): if (this.tasks.resolve(dep).manifest?.phase !== undefined) continue;

**Adversarial repro (verifier).** Plugin A registers an onRunStart hook task named 'seed:base' (manifest.phase='onRunStart') and an ordered task 'resolve:roles' with manifest.requires=['seed:base']; also an ordered 'intake:hex'. engine.adopt(A) routes 'seed:base' through TaskRegistry.hook() which sets entries['seed:base'] (has()=true) and pushes it to the onRunStart queue. Caller: engine.pipeline(['intake:hex','resolve:roles']). Line 178 name-existence check passes. For i=1 ('resolve:roles'), dep='seed:base': line 199 has('seed:base')=true so not skipped; line 203 order.indexOf('seed:base')=-1; line 205 throws ModuleError \"Engine.pipeline: task 'resolve:roles' requires 'seed:base', which is missing from the pipeline entirely\" — even though the onRunStart hook always runs before the sequence and the dependency is in fact satisfied.

---

#### F32 · ColorRecordFactory.fromRgb derives oklch from UNCLAMPED input while storing clamped rgb/hex, breaking encoding consistency

- **Severity:** ⚪ LOW  
- **Location:** `packages/core/src/math/ColorRecordFactory.ts:188`  
- **Category:** consistency · **Slice:** core-color-math · **Verifier confidence:** 88

**Defect.** fromRgb documents that inputs outside [0,1] are clamped and that every record leaves the factory with oklch/rgb/hex 'populated and consistent'. But it computes oklch via rgbToOklchRaw(r, g, b) on the RAW inputs (line 188), while the stored rgb field clamps each channel (line 195) and hex clamps internally (rgbToHex). For any out-of-range input the oklch slot therefore describes a different (brighter/more-saturated) color than the rgb and hex slots, violating the stated invariant. fromHex/fromOklch don't have this gap because their inputs are pre-bounded; fromRgb is reachable out-of-range through the exported public API (colorRecordFactory.fromRgb and the rgbToOklch math primitive).

**Failure scenario.** rgbToOklch.apply(1.2, 0, 0) (or colorRecordFactory.fromRgb(1.2, 0, 0)): rgb stored = {r:1, g:0, b:0}, hex = '#ff0000' (both clamped), but oklch is computed from linearized 1.2 → a lightness/chroma above pure red's. A consumer reading record.oklch.l gets one color while record.rgb/hex describe another; downstream OKLCH-based math (lighten/darken/mix) then operates on values inconsistent with the color the record's rgb/hex represent.

**Suggested fix.** Clamp the channels once at the top of fromRgb (rc=clamp01(r), gc=clamp01(g), bc=clamp01(b)) and feed those clamped values to rgbToOklchRaw, rgbToHex, and the rgb field, so all three encodings describe the same color.

**Adversarial repro (verifier).** Call the exported primitive `rgbToOklch.apply(1.2, 0, 0)` (or `colorRecordFactory.fromRgb(1.2, 0, 0)`). fromRgb line 188 computes oklch = rgbToOklchRaw(1.2,0,0); srgbToLinear.decode does NOT clamp, so it linearizes 1.2 -> ~1.517 and yields oklch.l ~= 0.722 (clamp01 on the result leaves it). Meanwhile the stored rgb field (line 195) clamps to {r:1,g:0,b:0} and hex (line 192, via rgbToHex/clamp01) is '#ff0000'. Pure red's true oklch.l is ~0.628, so record.oklch describes a color ~0.094 L brighter (and higher chroma) than record.rgb/record.hex represent. A consumer reading record.oklch.l gets 0.722 while rgb/hex say pure red -> downstream OKLCH math (lighten/darken/mix) operates on values inconsistent with the record's rgb/hex, violating the class docstring invariant (lines 77-83, and fromRgb doc lines 171-172) that all three encodings leave the factory clamped-and-consistent.

---

#### F33 · ExpandFamily is single-pass and order-dependent, dropping chained (derived-from-derived) roles

- **Severity:** ⚪ LOW _(finder reported medium; adjusted on verification)_  
- **Location:** `packages/core/src/tasks/expand/ExpandFamily.ts:112`  
- **Category:** order-dependent-logic · **Slice:** core-tasks-intake · **Verifier confidence:** 88

**Defect.** The run loop iterates `state.input.roles.roles` exactly once. For each derived role it reads `state.roles[derivedFrom]` and, if the source is not yet assigned, logs a warning and permanently skips the role (no second pass, no dependency ordering). When a derived role's source is itself a derived role that appears LATER in the roles array, the dependent is skipped before its source is created and is never revisited.

**Failure scenario.** roles array = [ { name: 'accentMuted', derivedFrom: 'accent', chromaRange:[…] }, { name: 'accent', derivedFrom: 'primary', hueOffset: 180 } ] with only 'primary' assigned by resolve:roles. Processing 'accentMuted' first finds state.roles['accent'] === undefined → warn + skip. Then 'accent' is derived. 'accentMuted' is never produced, leaving a hole in the palette purely because of array order.

**Suggested fix.** Resolve derivations to a fixed point: loop until no new role is assigned in a pass (with a cycle guard), or topologically sort by derivedFrom before deriving.

**Adversarial repro (verifier).** Schema roles (valid, passes RoleSchemaSchema): [{name:'primary',required:true}, {name:'accentMuted',derivedFrom:'accent',chromaRange:[0,0.1]}, {name:'accent',derivedFrom:'primary',hueOffset:180}]. resolve:roles assigns 'primary' and defers the two derived roles. expand:family iterates in array order: 'accentMuted' -> state.roles['accent'] is undefined -> warn 'Role derivedFrom source is not assigned' + continue; then 'accent' -> state.roles['primary'] defined -> derived successfully. Final state.roles contains primary and accent but NOT accentMuted — a silent hole caused solely by array order. Swapping the order of accent and accentMuted produces the complete palette.

---

#### F37 · normalisePath emits dot-index (colors.0.oklch) for required errors under arrays, inconsistent with the [N] bracket form used for every other keyword

- **Severity:** ⚪ LOW  
- **Location:** `packages/core/src/model/Validator.ts:143`  
- **Category:** correctness · **Slice:** core-model-schema · **Verifier confidence:** 85

**Defect.** The 'required' branch of normalisePath rewrites the whole parent pointer with `.replace(/\//g, '.')`, so numeric (array-index) path segments become '.0' instead of '[0]'. Every other keyword goes through the generic branch that converts digit-only segments to '[N]'. The resulting error.path is part of the public ValidationResultInterfaceType and is embedded into the ValidationError thrown at Engine.ts:302-308, so the index notation is observable to consumers.

**Failure scenario.** Validate a PaletteState whose colors[0] is missing 'oklch' (PaletteState is validated at every run end, Engine.ts:302, and colors[] items $ref ColorRecord which requires oklch). json-tology reports keyword 'required' at path '/colors/0' with missingProperty 'oklch'; normalisePath (line 143) returns 'colors.0.oklch'. A sibling type error at colors[0].hex returns 'colors[0].hex'. A consumer that parses error.path to identify the offending array element by its '[N]' segment fails to extract the index for the required-property case, mislocating the error.

**Suggested fix.** In the required branch, apply the same digit-segment -> '[N]' transform used by the generic branch to the parent path before appending `.${missing}`, so array indices are always bracketed.

**Adversarial repro (verifier).** Call Validator.validate(PaletteStateSchema, state) where state has all seven top-level required props present, and state.colors = [{ rgb:{r:0,g:0,b:0}, hex:'#000000', alpha:1, sourceFormat:'hex' }] (oklch omitted). json-tology emits keyword 'required', path '/colors/0', params.missingProperty 'oklch'. normalisePath returns error.path = 'colors.0.oklch'. Contrast: set state.colors[0].hex = 123 (wrong type) instead — the 'type' error at '/colors/0/hex' yields error.path = 'colors[0].hex'. Same array element, two different index notations ('.0' vs '[0]'); the required case fails a consumer extracting the index via the '[N]' segment.

---

## The demo UI (`site/app`) — 18 confirmed

### 🟠 HIGH (3)

#### F05 · reduce() throws for reachable (state,event) pairs, permanently wedging the whole UI FSM

- **Severity:** 🟠 HIGH _(finder reported critical; adjusted on verification)_  
- **Location:** `site/app/composables/fsm/IridisUiMachine.ts:117`  
- **Category:** race-condition · **Slice:** ui-fsm · **Verifier confidence:** 88

**Defect.** reduce() is not total: DRAG_START, SELECT_MODE, SELECT_CARD, NAVIGATE, ADD_SEED, REMOVE_SEED and SET_SEED are only handled when state.variant==='idle' (lines 88-106); in state.variant==='dragging' the only accepted events are DRAG_END/DRAG_MOVE (lines 107-116), so anything else hits the `throw` at line 117. Because CylinderCarousel.onDown (CylinderCarousel.vue:58-73) dispatches DRAG_START unconditionally with no `variant!=='dragging'` guard (unlike onMove/onUp which both guard), a second pointerdown that arrives while already dragging re-sends DRAG_START in the 'dragging' state and reduce() throws. StateMachine.transition rethrows this as ReducerThrewError out of EffectInterpreter.#drain(); crucially #drain() sets #draining=true at entry but only clears it AFTER the while-loop, so the throw skips `#draining=false` and leaves the interpreter's draining flag stuck true forever. From then on every send() (wrap.ts:56) sees #draining===true, pushes to the mailbox and never drains — the entire shared FSM (mode switch, carousel nav, seed edits, all palette params) silently stops responding with no recovery.

**Failure scenario.** On a touch device the user puts two fingers on the carousel. The first pointerdown fires onDown -> DRAG_START (idle->dragging). The second finger's pointerdown fires onDown again -> DRAG_START while variant==='dragging' -> reduce() throws at line 117 -> ReducerThrewError propagates out of #drain(), leaving #draining stuck true. Every later send() (switching mode, dragging, editing a seed, changing schema/contrast) is enqueued and never processed. The whole demo UI is frozen until full page reload.

**Suggested fix.** Make reduce() total: for any (state,event) pair it does not model, return a no-op step `{ effects: [], state }` instead of throwing (or explicitly accept DRAG_START/DRAG_END idempotently in 'dragging', e.g. treat a redundant DRAG_START as a no-op). Additionally guard onDown in CylinderCarousel so it never re-sends DRAG_START while already dragging.

**Adversarial repro (verifier).** On a touch device, open the page with the global (non-modelValue) CylinderCarousel. Press finger 1 on the carousel scene frame (not on the active card's `.cyl-card-body`): onDown -> send(DRAG_START), state goes idle->dragging, drain completes, #draining=false. While finger 1 is still down, press finger 2 anywhere on the scene except `.cyl-card-body` (scene background, a side-card face, or the card tag): pointerdown fires onDown again, isLocal is false so it calls send(DRAG_START) while state.variant==='dragging'. reduce() falls through both variant blocks and throws at IridisUiMachine.ts:117. StateMachine.transition rethrows ReducerThrewError out of EffectInterpreter.#drain() before `this.#draining=false` runs, so #draining stays true. From then on every send() (mode switch, NAVIGATE, seed add/remove/set, all SET_PALETTE_PARAM events) only pushes to #mailbox and never drains because send() gates draining on `!this.#draining`. The entire shared UI FSM is frozen with no recovery short of a full page reload.

---

#### F06 · send() fire-and-forgets interpreter.send without a catch, turning any reducer/effect throw into a silent unhandled rejection

- **Severity:** 🟠 HIGH  
- **Location:** `site/app/composables/useIridisUiMachine.ts:57`  
- **Category:** error-handling · **Slice:** ui-fsm · **Verifier confidence:** 88

**Defect.** send() does `void interpreter.send(event)` with no error handling. interpreter.send awaits #drain(); if reduce() throws (see critical finding) or any registered effect handler throws (EffectInterpreter #invokeHandler rethrows), the returned promise rejects. The `void` discards it, so the rejection surfaces only as a global unhandledrejection with no in-app handling, and — because the interpreter leaves #draining=true after a throw — the mailbox silently stops draining. There is no catch, no state-restore, and no observable error, so the FSM enters an unresponsive state with no diagnostic. This is the amplifier that makes a single reducer/handler throw catastrophic instead of localized.

**Failure scenario.** Any effect handler registered via useIridis (e.g. the EXTRACT_IMAGE handler decoding a corrupt file, or a SET_PALETTE_PARAM handler that throws) rejects. interpreter.send's promise rejects, `void` swallows it as an unhandled rejection, and #draining stays true, so every later send() enqueues without draining. The UI appears alive but no FSM event ever takes effect.

**Suggested fix.** Wrap the dispatch so failures are caught and observable, e.g. `interpreter.send(event).catch((err) => reportFsmError(err));`, and fix the reducer to be total so throws do not occur for reachable inputs. Ideally the interpreter should also reset its draining flag in a finally block, but the client-side catch at minimum prevents the silent unhandled rejection.

**Adversarial repro (verifier).** 1) Interpreter in 'idle'. 2) send({type: DRAG_START}) -> reduce handles it, state -> {variant:'dragging'}. 3) Before DRAG_END, send({type: DRAG_START}) again (pointerdown double-fire) OR send({type: NAVIGATE, delta, count}). 4) In #drain, machine.transition(state='dragging', event) calls reduce, which has no case for that (state,event) pair and hits `throw new Error('Cannot handle event ... in state dragging')` at IridisUiMachine.ts:117; StateMachine.transition rethrows ReducerThrewError. 5) The throw propagates out of #drain at EffectInterpreter.js:106, skipping line 123, so #draining stays true. 6) send()'s `void interpreter.send(event)` (useIridisUiMachine.ts:57) discards the rejected promise -> unhandledrejection, no in-app catch. 7) Every subsequent send() (mode switch, carousel nav, seed edit, SET_SCHEMA, etc.) pushes to #mailbox but line 65 `if (!this.#draining)` is false, so #drain never runs again. Observed: UI appears alive but no FSM event ever takes effect, and no error is shown to the user.

---

#### F07 · useModeGuardedSend dispatches SELECT_MODE in any FSM state; throws when the carousel is mid-drag

- **Severity:** 🟠 HIGH  
- **Location:** `site/app/composables/useModeGuardedSend.ts:12`  
- **Category:** guard-bypass · **Slice:** ui-fsm · **Verifier confidence:** 78

**Defect.** The guard forces `mode.value = targetMode`, which through the writable computed in useIridis.ts (line 147) dispatches a SELECT_MODE event, without ever checking whether the FSM can currently accept a mode change. SELECT_MODE is only reduced in the 'idle' branch (IridisUiMachine.ts:100); in 'dragging' it falls through to the throw at IridisUiMachine.ts:117. So any mode-guarded form action (SET_SEED from PickerIntakeCard, EXTRACT_IMAGE / SELECT_IMAGE_CANDIDATE from CombineCard/UploadIntakeCard) fired while the FSM is in the 'dragging' variant crashes the reducer and (per the #draining-stuck mechanism) freezes the machine. The guard also unconditionally reorders a mode switch ahead of the real event with no regard for the current sub-state.

**Failure scenario.** A carousel drag is interrupted (pointercancel / lost pointer capture / multi-touch), so DRAG_END never fires and state.variant stays 'dragging'. The user, in image mode, then edits a hex in the Manual card, invoking sendPickerAction (useModeGuardedSend targetMode='picker'). Since mode!=='picker', it sets mode.value='picker' -> SELECT_MODE dispatched while variant==='dragging' -> reduce() throws at line 117 -> interpreter wedged.

**Suggested fix.** Do not blindly dispatch a mode change from any state: either make the reducer accept SELECT_MODE in every variant (resetting to idle), or have the guard skip/defer the mode switch when the FSM is not in 'idle'. Pair with making reduce() total (see critical finding).

**Adversarial repro (verifier).** 1. Load the page (FSM initial mode='picker'; useIridis auto-loads the sample logo image, so CombineCard is rendered). 2. Press-drag on the carousel card frame/scene (not .cyl-card-body) → DRAG_START → variant='dragging'. 3. Trigger a pointercancel for that pointer (e.g. touch interruption / browser gesture / lost pointer capture) — no pointercancel handler exists, so DRAG_END never fires and variant stays 'dragging'. 4. Drag any Combine USlider (e.g. Histogram bits). USlider emits update:model-value during the drag (before pointerup) → sendImageAction(SET_IMAGE_*). mode('picker') !== 'image' → mode.value='image' → SELECT_MODE dispatched while variant==='dragging'. 5. reduce() throws at IridisUiMachine.ts:117 → ReducerThrewError propagates out of EffectInterpreter.#drain() before `#draining=false` → #draining stuck true → interpreter wedged. Observed: every subsequent send() (mode switch, carousel nav, seed edits, all palette params) only enqueues and never processes; UI is frozen until page reload. (Note: the finder's original hex-edit scenario self-heals via the stale window pointerup firing DRAG_END, so use the mid-drag slider path instead.)

---

### 🟡 MEDIUM (8)

#### F10 · Arrow-key navigation is bound to window per instance, so every activated carousel on the page navigates at once

- **Severity:** 🟡 MEDIUM  
- **Location:** `site/app/components/layout/CylinderCarousel.vue:219`  
- **Category:** event-listener-scope · **Slice:** ui-graph-carousel · **Verifier confidence:** 93

**Defect.** activate() registers a global `window.addEventListener('keydown', onKey)` (line 219). index.vue mounts one CylinderCarousel per stage (~15 instances), and each one that scrolls within 400px of the viewport calls activate() and adds its OWN onKey listener to window. onKey has no scoping to focus, hover, or which deck the user is interacting with — it calls go(±1) unconditionally. With multiple decks activated, a single ArrowRight/ArrowLeft press fires every registered onKey and advances every activated carousel simultaneously.

**Failure scenario.** User scrolls down the page so three stage carousels have entered view and been activated (three window keydown listeners). User presses ArrowRight once. All three carousels advance one card at the same time, not just the one near the user's attention. There is no way to drive a single deck by keyboard.

**Suggested fix.** Scope keyboard handling to the widget: attach the keydown listener to the carousel root element (with tabindex so it can be focused) and only act when the carousel contains document.activeElement or is hovered, instead of a global window listener per instance.

**Adversarial repro (verifier).** Load index.vue. Scroll the page so the 'refine', 'explore', and 'result' sections each pass within 400px of the viewport — each fires its IntersectionObserver and calls activate(), adding three separate window keydown listeners. Press ArrowRight once. All three onKey handlers fire; each emits update:modelValue for its own deck, advancing stageIndex['refine'], stageIndex['explore'], and stageIndex['result'] by one at the same time instead of only the deck the user is attending to. No mechanism exists to key-drive a single deck.

---

#### F11 · APCA compliance percentage is silently computed from WCAG thresholds

- **Severity:** 🟡 MEDIUM  
- **Location:** `site/app/components/content/InteractablesShowcase.vue:38`  
- **Category:** correctness · **Slice:** ui-page-misc · **Verifier confidence:** 92

**Defect.** compliancePct derives pass/fail from the WCAG-based `compliance` field (roleContrastRows uses complianceFor(ratio) => 'AAA'|'AA'|'fail', which is WCAG-2.1-only and independent of the strictness setting). The computed handles strictness 0 (AA => `compliance !== 'fail'`, correct) and strictness 1 (AAA => `compliance === 'AAA'`, correct), but when contrastStrictness === 2 (APCA) it falls through to the `!== 'fail'` branch. So under APCA the metric counts WCAG-AA-passing roles while the surrounding UI labels it 'APCA'. complianceLabel is derived as ['AA','AAA','APCA'][contrastStrictness] and rendered next to this number in the UProgress bar, the UTabs contrast panel, and the UAccordion 'Compliance target' item.

**Failure scenario.** User drags the compliance-strictness slider (SchemaComplianceCard) to APCA, so contrastStrictness=2 and the engine actually enforces APCA (run() sets algorithm:'apca', level:'Lc'). A role whose pair passes the enforced APCA Lc target but has a WCAG ratio of 4.2 (below 4.5) is scored as failing here; conversely a role at WCAG ratio 5.0 that fails the APCA target is scored as passing. The 'X% of roles meet APCA' progress bar and text (lines 137-138, 173-176) and the accordion 'Compliance target' line therefore report the WCAG-AA pass rate, not APCA — a misleading accessibility metric that claims to reflect APCA but never consults the APCA report.

**Suggested fix.** When contrastStrictness === 2, compute the passing count from the actual APCA result set (contrastReport.apca.pairs, the same source SchemaComplianceCard/PipelineExplainer use) rather than the WCAG-derived `compliance` field; or make complianceFor()/the `compliance` field APCA-aware so every consumer stays consistent.

**Adversarial repro (verifier).** Load the Interactables showcase in default state (contrastStrictness=2, APCA). The engine resolves roles under an APCA Lc target. A role whose pair has WCAG ratio 4.6 (compliance 'AA') but fails the enforced APCA Lc target is counted as passing; a role with WCAG ratio 4.2 (compliance 'fail') that satisfies the APCA target is counted as failing. The UProgress bar, Contrast tab text ('X% of roles meet APCA'), and accordion 'Compliance target' line all display the WCAG-AA pass rate while labeling it APCA. Concretely: set roles so all pairs land at WCAG ratio 4.6 but below the APCA Lc threshold — the UI shows 100% meet APCA even though 0% actually satisfy the enforced APCA target.

---

#### F13 · ModeSwitch active tab never highlights: numeric v-model vs string item values

- **Severity:** 🟡 MEDIUM  
- **Location:** `site/app/components/content/ModeSwitch.vue:20`  
- **Category:** reactivity-logic · **Slice:** ui-interactive · **Verifier confidence:** 90

**Defect.** The `activeTab` computed getter returns a NUMBER (`mode.value === 'picker' ? 0 : 1`), but `tabItems` declare their values as STRINGS (`value: '0'` / `'1'`). Reka's TabsTrigger decides the active tab with a strict-equality check: `props.value === rootContext.modelValue.value`. TabsRoot's `modelValue` prop type is `null` (no coercion) so the number 0 passes through unchanged, and the trigger's `value` (from `item.value`) stays the string '0'. `'0' === 0` is false, so NO trigger is ever marked selected. Because the component also sets `:ui="{ indicator: 'hidden' }"` and relies entirely on custom CSS keyed to `[data-state='active']` (lines 52-55) for the active look, the active state never renders.

**Failure scenario.** On page load in picker mode, `activeTab` get returns number 0. UTabs renders triggers with string values '0'/'1'; neither matches `0`, so both get `data-state="inactive"`. The `.output-tabs [role='tab'][data-state='active']` rule that paints the primary background/contrast never applies, so the demo's primary mode selector shows no indication of which mode is active. (Switching still works because the click handler calls `activeTab.set(Number('1'))`, but the highlight is permanently broken in both modes.)

**Suggested fix.** Make the getter return the matching type, e.g. `get: () => mode.value === 'picker' ? '0' : '1'` (strings, matching the item values), or equivalently change the item `value`s to numbers `0`/`1`. Either aligns the strict-equality comparison so exactly one trigger becomes active.

**Adversarial repro (verifier).** Load the demo page in default picker mode. activeTab getter returns number 0. UTabs renders two triggers with string values '0' and '1'; TabsRoot's modelValue is number 0. TabsTrigger isSelected does '0' === 0 (false) and '1' === 0 (false), so both triggers render data-state="inactive". The CSS rule .output-tabs [role='tab'][data-state='active'] { background: var(--ui-primary) } never applies, so neither "Build a palette" nor "Extract from image" shows the primary-colored active highlight. Clicking "Extract from image" switches mode to image (functionality works) but the getter then returns number 1 while the trigger value is string '1', so '1' === 1 is still false and no tab is highlighted in image mode either.

---

#### F19 · Exported output formats are generated from a reduced pipeline that omits derivation/variant stages and hardcodes AA contrast, so the copied code does not match the live palette

- **Severity:** 🟡 MEDIUM  
- **Location:** `site/app/composables/useMultiOutput.ts:92`  
- **Category:** consistency-correctness · **Slice:** ui-composables · **Verifier confidence:** 88

**Defect.** buildMainOutputs() builds its own Engine that registers only intakeHexHint + pinDerivedRoles and runs the pipeline ['intake:hexHint','resolve:roles','pin:derivedRoles','expand:family','enforce:contrast','emit:*']. It omits derive:semanticHues, derive:roleRelations and derive:variant, passes NO metadata (no core:variantConfig with SHADE_L, no derivation:config, no derivation:semanticHuesEnabled), and hardcodes contrast {algorithm:'wcag21', level:'AA'} (lines 99-104). The live palette in useIridis.run() runs all of those stages (REQUIRED_COLOR_STAGES) and threads contrastStrictness through. The two engines therefore resolve different role hexes and different 50-950 ramps, yet every OutputFormatCard presents its result as the palette shown on the page.

**Failure scenario.** User sets contrast strictness to AAA (or APCA), toggles semantic hues off, or customizes a derivation relation. The page repaints success/warning/derived roles and the 50-950 ramp accordingly, but the CSS variables / Tailwind / shadcn / MUI / etc. cards keep emitting the schema-default derived-role hues, the expand:family ramp (not the SHADE_L derive:variant ramp), and AA-adjusted colors. Copying the exported theme yields a visibly different palette than the one the user is looking at.

**Suggested fix.** Build buildMainOutputs' engine and pipeline from the same task registrations, stage list, metadata (core:variantConfig, derivation:config, derivation:semanticHuesEnabled) and contrast config that useIridis.run() uses, threading the live contrastStrictness/derivationConfig/semanticHuesEnabled through instead of hardcoding AA and dropping the derive stages.

**Adversarial repro (verifier).** Load the site with defaults (schema iridis-32, framing dark, contrastStrictness 2 = APCA/Lc, semanticHuesEnabled true). The live page nudges success toward OKLCH hue 160 (SEMANTIC_HUE, 90-degree clamp) and adjusts roles under APCA/Lc. Scroll to the Stylesheets stage: the CSS variables / Tailwind / shadcn cards emit success at the raw schema hue (brand hue + hueOffset 120, no semantic nudge, no roleRelations, wcag21/AA contrast, no derive:variant ramp). Copying --c-success (and warning/error/info, plus any derived role and the 50-950 ramp) yields a visibly different color than the swatch shown on the page. Toggling contrast to AAA/APCA, turning semantic hues off, or customizing a derivation relation widens the gap further, since none of those live params are threaded into buildMainOutputs.

---

#### F21 · Per-card ResizeObserver is attached to the height-pinned .cyl-card, so it never fires on post-mount content growth

- **Severity:** 🟡 MEDIUM _(finder reported high; adjusted on verification)_  
- **Location:** `site/app/components/layout/CylinderCarousel.vue:205`  
- **Category:** reactivity-height-overflow · **Slice:** ui-graph-carousel · **Verifier confidence:** 85

**Defect.** observeAllCards() observes the outer .cyl-card element (line 205). But cardStyle() (line 149) sets an explicit inline height:cardH on every .cyl-card, and the card has overflow:hidden. A ResizeObserver reports the border/content box, which for an explicitly-heighted element is fixed at cardH regardless of how tall its children get. So when a face's content grows AFTER the initial measurement (an inner accordion expanding, async data/image candidates loading, the ColorGraph canvas resizing), the .cyl-card box stays pinned at the old cardH and the observer never fires. cardHeights[idx] is therefore never updated for content growth, the shared cardH max never grows, and the grown content overflows into .cyl-card-body's internal scroll instead of the deck expanding. This directly contradicts the component's own promise ('a card whose own content grows post-mount ... updates the shared max'). Observing .cyl-card-body instead would not help either — it is also height-constrained (flex:1, min-height:0); only its scrollHeight changes, which RO does not observe.

**Failure scenario.** User is on a stage carousel whose active face contains an AccordionPanel. The face was measured at mount with the accordion collapsed, giving cardHeights[idx]=400. User expands the accordion; the inner content now needs 900px. The .cyl-card is pinned at height:400px (the shared max), overflow:hidden, so its border-box does not change and the ResizeObserver never fires. cardHeights stays {idx:400}, cardH stays 400, and the expanded accordion content is clipped/forced into a nested scrollbar inside the card instead of the deck growing to 900px.

**Suggested fix.** Do not rely on observing a height-pinned element for content growth. Observe an inner, unconstrained content wrapper (a child of .cyl-card-body that has no imposed height and no overflow clamp) so its border-box reflects true content height, or drive cardHeights from a MutationObserver / periodic scrollHeight re-read of .cyl-card-body. Then recompute cardH from the true natural heights.

**Adversarial repro (verifier).** 1) A carousel card slot contains an AccordionPanel, initially collapsed. On mount, activate() -> observeAllCards() measures and the RO settles with cardHeights[idx]=400 (collapsed natural height), cardH=400; the .cyl-card gets inline height:400px with overflow:hidden. 2) User expands the accordion; inner content now needs ~900px. .cyl-card-body's scrollHeight grows to ~900 but its box stays constrained (flex:1, min-height:0), and the .cyl-card content-box stays pinned at 400px (explicit height + overflow:hidden). 3) Neither the card's width nor its content-box height changes, so cardResizeObserver never fires -> callback never runs -> cardHeights stays {idx:400} -> cardH stays 400 -> the deck (.cyl-scene height = cardH+40) does not grow. 4) The expanded 900px of accordion content is clipped and forced into .cyl-card-body's nested scrollbar instead of the deck expanding to 900px — the exact opposite of the lines 163-167 promise.

---

#### F22 · Dynamic carousel items (uploaded-image faces) are never re-measured or observed; removed faces leave stale heights

- **Severity:** 🟡 MEDIUM _(finder reported high; adjusted on verification)_  
- **Location:** `site/app/components/layout/CylinderCarousel.vue:217`  
- **Category:** reactivity-height-overflow · **Slice:** ui-graph-carousel · **Verifier confidence:** 85

**Defect.** observeAllCards() runs exactly once, in activate() (line 213-217) behind the one-shot `activated` guard, and there is no watch on props.items. But in index.vue, stageItemsFor(group) returns [...group.items, ...uploadedImages.map(...)], so props.items GROWS and SHRINKS as the user uploads/removes images. New .cyl-card faces added after activation are never passed to cardResizeObserver.observe() and their natural height is never inserted into cardHeights, so the shared cardH max does not account for them. Conversely, removed faces leave stale entries in cardHeights (the record is never pruned), inflating the max. index.vue also does stageIndex['upload']=next on upload (navigating straight to the new, unmeasured face), so the overflow is immediately visible.

**Failure scenario.** User uploads an image. stageItemsFor appends a new face; index.vue sets stageIndex['upload'] to that new face, snapping the deck to it. The new UploadedImageCard is taller than any previously-measured face, but observeAllCards never re-ran, so cardHeights has no entry for it and cardH stays at the old (shorter) max. The just-added, now-active image card overflows its box into an internal scrollbar. Removing images later leaves their heights in cardHeights, so a subsequently-shown short face sits in a deck sized to a face that no longer exists (large dead blank area).

**Suggested fix.** Add `watch(() => props.items.map(i => i.key), () => { if (activated) nextTick(observeAllCards); }, { flush: 'post' })`, and in observeAllCards rebuild cardHeights from scratch (replace, so removed indices are pruned) and re-observe the current card set. Also key cardHeights by item.key rather than array index to avoid index-shift corruption when items reorder.

**Adversarial repro (verifier).** 1) Load page; the upload CylinderCarousel scrolls into view and activate() runs, so observeAllCards() measures only the dropzone (UploadIntakeCard) face -> cardHeights={0:h_dropzone}, cardH=h_dropzone. 2) Upload an image whose UploadedImageCard (preview + candidates + settings) is taller than the dropzone. items grows to [dropzone, imgA]; index.vue watch sets stageIndex['upload']=1, snapping the deck to imgA. 3) imgA's .cyl-card is never passed to cardResizeObserver.observe() (one-shot observeAllCards, no props.items watch), so cardHeights stays {0:h_dropzone} and cardH stays h_dropzone. Observed result: the now-active, taller imgA face is clamped to h_dropzone and shows an internal scrollbar in .cyl-card-body instead of the deck growing to fit it. Secondary: if the carousel activates with several uploads already present (all measured) and one is then removed, its cardHeights entry is never pruned and the ResizeObserver never re-fires for the size-unchanged, index-shifted survivors, so a subsequently-shown shorter face sits in a deck sized to a face that no longer exists.

---

#### F23 · useDebouncedResizeObserver drops entries from earlier callbacks within the debounce window

- **Severity:** 🟡 MEDIUM  
- **Location:** `site/app/composables/useDebouncedResizeObserver.ts:16`  
- **Category:** race-condition · **Slice:** ui-graph-carousel · **Verifier confidence:** 82

**Defect.** The ResizeObserver callback does `if (timer) clearTimeout(timer); timer = setTimeout(() => callback(entries), delayMs)` (lines 16-18). Each new RO callback overwrites `timer` AND supersedes the previously-captured `entries`, so only the entries from the LAST callback before the window elapses are ever delivered. ResizeObserver batches per animation frame, so entries that arrive in an earlier frame's callback (e.g. one card finishing its resize) are discarded if a different element's callback arrives before the 100ms timer fires. CylinderCarousel observes many cards through this utility, so a card that settles while another element is still resizing never gets its final height applied to cardHeights.

**Failure scenario.** Two cards in the deck settle their content in overlapping windows: card A delivers its final resize entry at t=200ms; card B is still animating and delivers entries at t=210, 240, 280ms. Each of B's callbacks clears the timer and replaces the captured entries with B's, so A's settled-height entry (t=200) is never passed to the consumer. cardHeights[A] keeps a stale value and the shared cardH max can be computed from an out-of-date A height until A happens to resize again.

**Suggested fix.** Accumulate entries across callbacks instead of overwriting: keep a Map keyed by entry.target that is merged on every RO callback, and flush the whole accumulated set to `callback` when the debounce timer fires, then clear the accumulator.

**Adversarial repro (verifier).** All cards ~400px so cardH=400. Card A's in-card accordion expands to 900px, its last resize frame at t=200ms. Card B animates concurrently (both observed continuously), firing frames at t=210/240/280ms. A's t=200 callback sets timer→t=300 capturing [A]; at t=210 B's callback clears that timer and captures [B]; subsequent B frames keep resetting. The timer finally fires ~t=380 with entries=[B], so cardHeights[A] is never updated to 900. cardH stays 400, clamping/overflowing A's 900px content, and does not correct until A resizes again.

---

#### F27 · complianceFor hardcodes 4.5/7, mislabels roles whose declared contrast pair only requires 3.0 as 'fail'

- **Severity:** 🟡 MEDIUM  
- **Location:** `site/app/utils/roleSort.ts:52`  
- **Category:** contrast-compliance-correctness · **Slice:** ui-theme-derivation · **Verifier confidence:** 74

**Defect.** complianceFor(ratio) classifies AA strictly at >=4.5 and AAA at >=7 with no notion of a role's declared minRatio. The role listings (useRoleMathList.ts:111 feeds `contrastRatio(role, background)` straight into complianceFor and renders the result as the role's compliance badge, later fed to complianceBadgeColor and to the compliance sort rank). RoleSchemaByName.ts deliberately declares several contrast pairs at minRatio 3.0 (e.g. `divider` vs `background`, and syntax-comment/syntax-punctuation vs code-bg). A role that legitimately resolves to a ratio in [3.0, 4.5) — exactly what enforce:contrast lifts `divider` to — satisfies its own declared/enforced requirement yet complianceFor returns 'fail', so the table reports a passing role as failing WCAG. The threshold is fixed and cannot express the 3.0 tier the schema itself uses.

**Failure scenario.** Load any 8+ tier schema. `divider` (dark: chroma [0,0.06], lightness [0.18,0.32]) contrasts against `background` (lightness [0.04,0.14]); its schema contrast pair is minRatio 3.0 and enforce:contrast lifts it to ~3.0-3.5. useRoleMathList computes ratio ~3.2 vs background and calls complianceFor(3.2) -> 'fail'. The Roles/Resolved-roles/Clamps table then shows `divider` with a 'fail' (neutral) badge even though it meets and was enforced to its declared 3.0 threshold.

**Suggested fix.** Thread the pair's declared minRatio (or a non-body-text flag) into complianceFor and classify relative to it — e.g. `complianceFor(ratio, minRatio = 4.5)` returning 'AA' when `ratio >= minRatio`, 'AAA' when `ratio >= Math.max(minRatio, 7)` — so a role enforced to its own 3.0 pair is not reported as failing.

**Adversarial repro (verifier).** Load iridis-8 (or any 8+ tier), dark framing. enforce:contrast lifts `divider` to its declared minRatio-3.0 pair against `background`, so contrastRatio(dividerHex, backgroundHex) settles at ~3.0 (in [3.0,4.5)). useRoleMathList computes compliance = complianceFor(~3.0) = 'fail' because 3.0 < 4.5. The Roles/Resolved-roles/Clamps table then renders `divider` with a neutral 'fail' badge, the compliance sort drops it to the bottom (rank 0), and InteractablesShowcase's compliancePct counts it as not passing — even though divider satisfies and was enforced to its declared 3.0 WCAG-1.4.11 threshold. Same mislabel applies to syntax-comment and syntax-punctuation (3.0 pairs vs code-bg) in iridis-32.

---

### ⚪ LOW (7)

#### F29 · HueDerivation freeform swatches ignore the selected seed hue (absolute instead of base-relative)

- **Severity:** ⚪ LOW  
- **Location:** `site/app/components/content/HueDerivation.vue:51`  
- **Category:** color-math-consistency · **Slice:** ui-interactive · **Verifier confidence:** 90

**Defect.** For the 'freeform' row the preview computes `selectHueAlgorithm('freeform', baseHue.value, FREEFORM_ILLUSTRATIVE_OFFSETS)`, which routes to `getFreeformHues([0,45,200])` and returns those offsets VERBATIM as absolute hues — `baseHue` is discarded. Every other algorithm in this card (analogous, complementary, triadic, split-complementary, compound, etc.) is computed relative to `baseHue`, and the real pipeline treats freeform as an OFFSET from the parent hue (see `resolveHueOffset` in utils/colorDerivation.ts: 'The relative hue offset ... from the parent role's own hue'). So the freeform swatches neither track the selected role nor match what the engine actually produces.

**Failure scenario.** Select a seed role whose hue is 280° (e.g. brand/violet). The analogous/triadic/etc. swatches update to reflect 280°, but the freeform swatches stay fixed at 0°/45°/200° (red/orange/blue) regardless of the selection — directly contradicting the card's own instruction 'Pick a seed role and watch all 8 update together', and misrepresenting freeform, which in the pipeline would render 280°+0/45/200.

**Suggested fix.** Add the base hue to each illustrative offset before rendering, e.g. map the offsets through `(baseHue.value + o) % 360` (or introduce a base-relative freeform helper), so the freeform preview is base-relative like every other algorithm and matches the pipeline's parent+offset semantics.

**Adversarial repro (verifier).** In HueDerivation.vue, select the `brand` seed role with hue 280°, so baseHue.value = 280. The card computes each algorithm's swatches: analogous → getAnalogousHues(280, 30) = [280, 250, 310], triadic → [280, 40, 160], etc., all tracking the 280° seed. But the freeform row (line 51) computes selectHueAlgorithm('freeform', 280, [0,45,200]), which dispatches to getFreeformHues([0,45,200]) (colorDerivation.ts:52 → :39-41) and returns [0, 45, 200] verbatim — baseHue is discarded. The freeform swatches therefore render as red(0°)/orange(45°)/blue(200°) and stay fixed no matter which seed role is selected, while every other row moves with the seed. This contradicts the card's own instruction "Pick a seed role and watch all 8 update together." It also misrepresents the real pipeline: resolveHueOffset (colorDerivation.ts:153) returns the freeform value as a relative offset, written to core:hueOffsetOverrides by DeriveRoleRelations.ts:42 and applied by expand:family in place of the schema hueOffset (i.e. added to the parent hue). So the engine would produce 280+{0,45,200} = 280/325/120, not the absolute 0/45/200 shown.

---

#### F30 · Hue-variant offset labels are not normalized to the shortest signed angle

- **Severity:** ⚪ LOW  
- **Location:** `site/app/components/content/DerivationRelations.vue:82`  
- **Category:** color-math · **Slice:** ui-page-misc · **Verifier confidence:** 90

**Defect.** variantOptions() labels each candidate slot with hueVariantLabel(offset), where the offsets come from selectHueAlgorithm(algorithm, 0). Those helpers (getAnalogousHues/getTriadicHues/getTetracticHues/getSplitComplementaryHues in utils/colorDerivation.ts) return absolute hues wrapped into [0,360) — e.g. analogous(0) => [0, 330, 30]. hueVariantLabel only prefixes '+' when the value is positive, so counter-clockwise candidates render as large positive angles instead of their shortest-path negative equivalent. The same misleading value is shown per-row at line 247 via hueVariantLabel(role.algorithmInfo.offsetDeg), since resolveHueOffset() returns the same unnormalized offsets[index] (330 for analogous variant 1).

**Failure scenario.** Open any relation group and choose 'Analogous' in a per-role picker: the variant dropdown reads 'Base (0°)', '+330°', '+30°' — the '+330°' entry is really a −30° analogous rotation. Triadic shows '+240°' (−120°), tetradic '+270°' (−90°), split-complementary '+210°' (−150°). The engine rotates correctly (330° ≡ −30°), so output color is right, but the user-facing degree label misrepresents the relationship and reads as a near-full-circle rotation.

**Suggested fix.** Normalize the offset into the signed range (−180, 180] before labeling in both variantOptions() and the line-247 label, e.g. `const signed = ((offset + 180) % 360 + 360) % 360 - 180;` then pass `signed` to hueVariantLabel().

**Adversarial repro (verifier).** Open a relation group and set a per-role picker to 'Analogous'. The variant dropdown reads 'Base (0°)', '+330°', '+30°' — the '+330°' entry is the counter-clockwise (−30°) analogous slot mislabeled as a near-full-circle positive rotation. Selecting it makes the row suffix (line 247) also read '+330°' since offsetDeg=resolveHueOffset returns 330. Triadic yields '+240°' (−120°), tetradic '+270°' (−90°), split-complementary '+210°' (−150°). Expected per hueVariantLabel's documented format: '-30°', '-120°', '-90°', '-150°'.

---

#### F34 · computedHues for freeform relations returns relative offsets instead of absolute hues, unlike every other algorithm

- **Severity:** ⚪ LOW  
- **Location:** `site/app/composables/useRoleMathList.ts:87`  
- **Category:** logic-consistency · **Slice:** ui-composables · **Verifier confidence:** 88

**Defect.** algorithmInfo.computedHues is built via selectHueAlgorithm(relation.hueAlgorithm, baseHue, freeformOffset!==undefined ? [freeformOffset] : undefined). For every non-freeform algorithm selectHueAlgorithm returns ABSOLUTE hues (baseHue, baseHue+180, ...). For 'freeform' it calls getFreeformHues(offsets) which returns the raw offsets and ignores baseHue entirely, so computedHues holds a relative offset while the actual resolved child hue is baseHue + freeformOffset. computedHues thus mixes two coordinate systems depending on the algorithm.

**Failure scenario.** A freeform relation with freeformOffset=30 on a child whose parent role hue is 200 degrees. computedHues resolves to [30] (a raw offset), whereas the role's real derived hue is 230 degrees and every non-freeform relation's computedHues would already be absolute. Any RoleMathCard swatch/degree readout driven by computedHues shows 30 degrees for a hue that is actually 230 degrees.

**Suggested fix.** For the freeform branch, compute absolute hues, e.g. normalizeHue(baseHue + freeformOffset), so computedHues is consistently absolute across all algorithms (or pass baseHue-added offsets into getFreeformHues).

**Adversarial repro (verifier).** Derived role with parent role hue = 200°, freeform relation freeformOffset=30. computedHues = getFreeformHues([30]) = [30]. RoleMathCard shows "Seed hue 200° → computed 30°", but the role's actual resolved hue is 200+30 = 230°. Under any non-freeform algorithm the same slot would show absolute hues (e.g. complementary -> "computed 200°, 20°"), so freeform's "computed 30°" is a relative offset mislabeled as an absolute computed hue.

---

#### F35 · Algorithm hue-variant offsets render the long way around: '-30°' displays as '+330°'

- **Severity:** ⚪ LOW  
- **Location:** `site/app/utils/colorDerivation.ts:163`  
- **Category:** color-math-label-correctness · **Slice:** ui-theme-derivation · **Verifier confidence:** 88

**Defect.** getAnalogousHues (line 16), getSplitComplementaryHues (line 29) and getCompoundHues (lines 32-37) wrap every offset into [0,360) via `(x + 360) % 360`, so the analogous left-neighbor is 330 (not -30), and split-complementary/compound slots that are conceptually negative rotations come out as 150/210/240/300 etc. hueVariantLabel then formats these with `rounded > 0 ? '+' : ''`, so the negative-sign branch is unreachable for algorithm-derived offsets and the UI prints '+330°' where the type doc (RoleRelationDerivation.hueVariantIndex: 'analogous: 0°/-30°/+30°') and the shortest-signed convention call for '-30°'. This surfaces in DerivationRelations.vue's variant dropdown (variantOptions, :82) and the per-role offset badge (:247, hueVariantLabel(offsetDeg)). Downstream math is unaffected (330 ≡ -30 mod 360 through expand:family), so this is a misleading-label defect only.

**Failure scenario.** In the Derivation Relations card pick 'Analogous' for a derived role (e.g. syntax-string from brand). The hue-variant dropdown lists 'Base (0°)', '+330°', '+30°' — the middle slot, meant to read '-30°', shows '+330°'. Selecting it also renders the role's offset badge as '+330°'. Picking 'Split-complementary' similarly shows a '-150°' slot as '+210°'. A freeform value of -30 typed by hand correctly shows '-30°', so identical relationships display inconsistently.

**Suggested fix.** Fold the offset into (-180, 180] inside hueVariantLabel before formatting: `if (offsetDeg > 180) offsetDeg -= 360;` (after the 0 check), so the existing sign branch produces '-30°'/'-150°'.

**Adversarial repro (verifier).** In the Derivation Relations card, select 'Analogous' for a derived role. The hue-variant dropdown (variantOptions, DerivationRelations.vue:82) lists 'Base (0°)', '+330°', '+30°'; the middle slot documented as -30° (types/colorDerivation.ts:15) instead reads '+330°'. Selecting it sets hueVariantIndex=1, so resolveHueOffset returns offsets[1]=330 (colorDerivation.ts:154-156) and the offset badge (DerivationRelations.vue:247) renders hueVariantLabel(330)='+330°'. By contrast, typing a freeform value of -30 renders '-30°', so the identical relationship displays inconsistently. Split-complementary similarly shows its 210 slot (≡ -150) as '+210°'.

---

#### F36 · ColorGraph visibility poll retries initCosmos() forever when construction throws, re-allocating WebGL contexts

- **Severity:** ⚪ LOW  
- **Location:** `site/app/components/content/ColorGraph.vue:137`  
- **Category:** resource-leak · **Slice:** ui-graph-carousel · **Verifier confidence:** 88

**Defect.** visibilityPoll = setInterval(tryInit, 400) (line 137) is only cleared when graph.value becomes non-null (init success) or on unmount. If `new GraphCtor(container, config)` in initCosmos() throws (WebGL2 unavailable/context-lost, shader compile failure), the assignment on line 151 never completes, graph.value stays null, loadError is set, but the interval keeps calling tryInit -> initCosmos every 400ms indefinitely. Each retry runs `new GraphCtor(...)` again, which can partially allocate a WebGL2 context before throwing, repeatedly — browsers cap concurrent WebGL contexts (~16) and will start dropping the oldest, so this can exhaust/thrash GPU contexts for the whole tab while the error overlay is already showing.

**Failure scenario.** On a device where cosmos.gl's WebGL2 context creation throws (e.g. GPU blocklisted, context lost), the graph card scrolls into view. loadError is displayed, but visibilityPoll never stops: every 400ms it calls `new GraphCtor()` which throws again, repeatedly attempting WebGL2 context allocation for as long as the component stays mounted, churning GPU resources with no user benefit.

**Suggested fix.** Stop the poll once a hard init failure occurs: after initCosmos catches an error, clear visibilityPoll (or track an `initFailed` flag that tryInit checks and bails on) so construction is attempted at most a bounded number of times rather than every 400ms forever.

**Adversarial repro (verifier).** On a device where cosmos.gl's Graph constructor throws (WebGL2 unavailable / GPU blocklisted / context-lost / shader compile failure): mount ColorGraph and scroll the card into the viewport. onMounted imports @cosmos.gl/graph successfully (loading=false), sets visibilityPoll = setInterval(tryInit, 400) (line 137), and calls tryInit(). tryInit sees the container in-viewport and calls initCosmos, where `new GraphCtor(container, config)` (line 151) throws; the catch sets loadError (error overlay shows) and graph.value stays null. Because line 132's `graph.value !== null` is false, visibilityPoll is never cleared. Every 400ms thereafter tryInit runs again, graph.value is still null and still in viewport, so initCosmos re-runs `new GraphCtor(...)` which throws again — an unbounded retry loop invoking the WebGL2 Graph constructor ~2.5×/sec for as long as the component stays mounted, despite the error overlay already being shown. Fix: also stop/skip the poll when loadError.value is set (or clear visibilityPoll inside initCosmos's catch).

---

#### F38 · getHighlighter caches a rejected promise, permanently breaking syntax highlighting after one transient init failure

- **Severity:** ⚪ LOW  
- **Location:** `site/app/theme/Highlighter.ts:20`  
- **Category:** async-error-handling · **Slice:** ui-theme-derivation · **Verifier confidence:** 76

**Defect.** `highlighterPromise ??= createHighlighter(...)` assigns only when highlighterPromise is null/undefined. If the very first highlightCode() call's createHighlighter() promise rejects (e.g. a transient dynamic-import/WASM-free engine init failure), highlighterPromise is left holding that rejected promise. Because `??=` never reassigns a non-null value, every subsequent highlightCode() reuses the same already-rejected promise and re-throws, so highlighting stays broken for the whole session with no retry even after the transient cause clears.

**Failure scenario.** First code block renders during a moment the shiki engine init fails (rejected promise). highlighterPromise is now a rejected Promise. Every later CodeBlock.vue mount awaits getHighlighter(), gets the cached rejection, and throws — no code block ever highlights again until a full page reload, despite the failure being transient.

**Suggested fix.** Clear the cache on failure so the next call retries: attach `.catch((e) => { highlighterPromise = null; throw e; })` to the promise stored in highlighterPromise (or await inside a try and reset highlighterPromise = null before rethrowing).

**Adversarial repro (verifier).** 1) First CodeBlock.vue mounts and calls highlightCode(); getHighlighter() invokes createHighlighter(), whose internal dynamic import of a grammar chunk fails transiently (e.g. momentary offline / chunk 404), so the promise rejects. 2) highlighterPromise now permanently holds that rejected Promise. 3) Network recovers; a later CodeBlock mounts and calls highlightCode() -> getHighlighter(); `??=` sees the non-null rejected promise and returns it unchanged; `await` re-throws. Result: no code block highlights for the rest of the session despite the failure being transient, until a full page reload resets the module singleton.

---

#### F39 · running flag is shared between the synchronous run() and the async image-upload pipeline, so it can clear while a decode is still in flight

- **Severity:** ⚪ LOW  
- **Location:** `site/app/composables/useIridis.ts:694`  
- **Category:** async-state · **Slice:** ui-composables · **Verifier confidence:** 68

**Defect.** addUploadedImagesUnqueued() sets running.value=true at line 694 and only clears it in its finally (line 723) after an awaited ToPixels.decode(). Meanwhile the synchronous run() (and runCombineNow()) also drive the same running ref, setting it true then false within a single synchronous call. A debounced run() firing during the decode window resets running to false even though the upload is still decoding.

**Failure scenario.** On boot the sample image decode is dispatched (void addUploadedImages, running=true) while the debounced schedule/run watchers are live; a concurrent seed/schema change (or the initial scheduled run) completes run() during the ~50-100ms decode, setting running=false. Any spinner/disabled-state bound to running flickers off mid-upload, then back on when combine() runs, giving a false 'done' indication while extraction is still ongoing.

**Suggested fix.** Track upload/decoding progress with a dedicated ref (e.g. decoding count) separate from the synchronous engine-run running flag, or reference-count running so it only clears when all in-flight operations complete.

**Adversarial repro (verifier).** 1) App booted, sample loaded, running=false, spinner hidden. 2) User uploads a large image: addUploadedImages([file]) -> addUploadedImagesUnqueued sets running=true (line 694), spinner shows, then hits `await ToPixels.decode(src)` (line 703) which for a large image takes >~150ms. 3) While decode is in flight (~t=20ms) the user drags the schema selector or contrast-strictness control, mutating a watched ref -> the `schedule` debounce (120ms, line 961/975) is armed. 4) At ~t=140ms the debounce fires run() synchronously: it sets running=true (already true) then its finally sets running=false (line 436) — all before decode resolves. Now running=false while decode is still pending. 5) The CombineCard spinner overlay (v-if="running", CombineCard.vue:149) disappears mid-upload (false "done"), then reappears when decode resolves and combine()->runCombineNow (line 625) sets running=true again. Observed wrong output: spinner flickers off during an in-flight decode, indicating completion while extraction is still ongoing.

---

## Reclassified — working as designed (2)

Two findings assumed a role's `hue` is an absolute target the resolver must reach or hard-pin. In iridis, hue defaults are **anchors for nudging** — selection is on lightness/chroma, and hue only nudges the winner toward the anchor within `hueClamp`. Their proposed fixes would break that model, so they were **not** remediated.

- **F17 · `packages/core/src/tasks/resolve/ResolveRoles.ts:54`** — Role candidate selection ignores the absolute `hue` target, so semantic-hue roles can pick a candidate that can never reach their target
  - _By design:_ In iridis, role `hue` is a nudge anchor — selection is on lightness/chroma proximity and hue only nudges the winner toward the anchor within `hueClamp`. Biasing candidate selection by hue (the proposed fix) would replace the nudge model with a select-by-hue model. Working as designed.

- **F40 · `packages/core/src/tasks/resolve/ResolveRoles.ts:200`** — hueTargetOverride without a hueClamp retains the schema's stale hueClamp, silently downgrading an absolute hue pin to a bounded nudge
  - _By design:_ A hue override with no `hueClamp` is a nudge anchor, not a hard pin. The proposed fix (drop the schema clamp so the override pins the hue absolutely) contradicts the anchors-for-nudging model. Working as designed.

## Refuted candidates (7)

These were raised by finders but killed by the adversarial verifier. Recorded because the *reason* they are not bugs is itself worth knowing.

- **`packages/core/src/engine/Engine.ts:315`** — Plugin-contributed output/metadata slot schemas are skipped when the slot is absent, so required-output contracts go unenforced
  - _Why not a bug:_ The bug assumes contributing an output/metadata schema for a slot means "that slot must exist," but the API expresses no such semantic. PluginSchemaContributionInterface (packages/core/src/types/plugin.ts:4-9) maps slot -> a JSON Schema for the slot's VALUE, documented as "for output/metadata slot validation." The `required:['--bg']` in the reported scenario is a JSON Schema constraint on properties WITHIN the value object, not a declaration that the slot key must be present in state.outputs. Slot-presence, if it were a contract, would be enforced by the whole-state PaletteStateSchema (Engine.ts:302), not by these per-value schemas. The `if (slotValue !== undefined)` guards at lines 315/331 deliberately implement validate-the-value-when-present, matching the documented contract (line 242) and the tests: tests/unit/Engine.test.ts cell-8 (lines 724-843) states "validates plugin-contributed output and metadata slots against their registered schemas at run exit. Violations must throw," and every test writes the slot first then checks value conformance — none expects an absent slot to throw. So a pipeline that omits emit:cssVars simply never produces the value, which is legitimate under the actual contract, not a swallowed error. No concrete input produces behavior diverging from the specified/tested contract.

- **`packages/core/src/tasks/clamp/ClampCount.ts:40`** — ClampCount throws (crashes the pipeline) when maxColors is <= 0 or in (0,1)
  - _Why not a bug:_ The reported crash cannot occur through the pipeline. ClampCount.run is only reached via Engine.run, which validates the input against InputSchema at entry (Engine.ts:245) before executing any task. InputSchema (InputSchema.ts:21) declares maxColors: { minimum: 1, type: 'number' }, and the json-tology-backed Validator enforces minimum. Empirical test: v.validate(InputSchema, { colors:[{}], maxColors: 0 }) => valid:false, message "0 is less than minimum 1"; likewise 0.5 and -3 are rejected; 1 and 64 pass. Thus a caller (e.g. a UI slider) setting maxColors=0 or 0.5 gets a fail-fast ValidationError "input invalid: maxColors: ... is less than minimum 1" thrown at the documented entry gate, never reaching clusterMedianCut.apply(colors, max). The k<1 throw in ClusterMedianCut is a defensive internal guard behind that schema gate. The only way to trigger the raw ClampCount throw is to call ClampCount.run directly with hand-built state, bypassing the Engine — which is not the finder's scenario and is not a pipeline crash.

- **`packages/core/src/model/ToCssVarName.ts:9`** — toCssVarName maps camelCase and kebab-case role names to the SAME CSS variable, silently dropping one role's color
  - _Why not a bug:_ The collision described is a real arithmetic property of toCssVarName (line 9): it only lowercases uppercase letters and never touches existing hyphens, so 'primaryText' and 'primary-text' both map to '--c-primary-text', and EmitCssVars.Declarations.build (packages/stylesheet/src/tasks/EmitCssVars.ts:61-64) emits both with no collision guard. However, triggering it requires an input that neither callers nor conventions produce. Role names originate from user-authored RoleSchema.roles[].name (RoleSchemaSchema.ts:46, unconstrained string) and are copied verbatim into state.roles[role.name] (ExpandFamily.ts:130, ResolveRoles.ts:206) — no code path synthesizes hyphenated role names. Every real role name in the repo's palettes is camelCase with no literal hyphens (accent, border, canvas, muted, onAccent, surface, text); the only hyphenated "name" hits are npm package names in lockfiles. Within that camelCase-only name space, toCssVarName is injective — the sole camelCase preimage of '--c-primary-text' is 'primaryText'. A collision requires a role name that already contains a literal hyphen, i.e. an author deliberately defining the same concept twice under two mixed casing conventions in one palette. That is a duplicate-role authoring error, not the code mishandling two legitimately distinct roles. The reported 'high' severity is unjustified; at most this is a low-severity hardening opportunity (add a uniqueness guard/slugify), not a defect that valid operation produces.

- **`packages/core/src/model/Validator.ts:385`** — Validator.validate throws uncaught when a non-core schema's $id collides with an already-registered schema of different content
  - _Why not a bug:_ The finder's causal chain is wrong at the json-tology layer. Validator.validate for a non-core schema calls this.#jt.validate(withId, pruned) (Validator.ts:385). In json-tology 0.27.0, JsonTology.validate(schemaObject, data) calls this.registry.set(schema) (JsonTology.js:1210-1214). That set() dispatches to setOne() (SchemaRegistry.js:1071), which does `this.delete(iri); this.registerSingle(schema);` (lines 1082-1083) — it DELETES any existing registration under the same $id BEFORE registering. So by the time registerSingle -> assertSchemaNotDuplicate runs (line 973), store.has(schemaId) is false, the guard returns false at line 465-466, and the DUPLICATE_ID SchemaError at lines 472-476 is never reached. The reported "same $id, different content -> assertSchemaNotDuplicate throws" precondition (an existing entry still present) cannot hold on the set()-a-schema-object path; DUPLICATE_ID is only reachable via a path that registers without deleting first (e.g. an array literal containing two same-$id schemas at create() time), which validate() never takes because it always passes a single schema object.

Empirically confirmed with a test against the real installed package (json-tology 0.27.0) using the actual @studnicky/iridis/model Validator on the process-wide shared CoreRegistry: validate(s1={$id:X, props:{a:string}}, {a}) then validate(s2={$id:X, required:[b], props:{b:number}}, {a}) — the second call did NOT throw (threw:false) and returned {valid:false, errors:[required property "b" is missing]}. The valid:false-on-b proves s2 fully replaced s1 in the registry (delete-then-register), and the absence of any exception proves validate() stays total. Both of the finder's concrete scenarios (two plugins/two Engines reusing a $id with changed content) hit exactly this delete-then-register path and therefore silently re-register rather than throwing. The observation that validate() lacks a try/catch (unlike tryCompile) is accurate but inert here because the underlying call does not throw for this input class.

- **`site/app/composables/fsm/wrap.ts:3`** — wrap(index, 0) returns NaN, corrupting activeIndex on an empty carousel
  - _Why not a bug:_ wrap(x,0) does return NaN in isolation, but no reachable caller ever passes count===0. (1) The cited FSM corruption path is dead: NAVIGATE/DRAG_END are dispatched only from CylinderCarousel.vue's non-local branch, but its sole consumer (index.vue:195) always binds :model-value, and stageIndex is initialized to 0 for every group (index.vue:41-43), so modelValue is never undefined and isLocal is always true — the FSM NAVIGATE/DRAG_END reducer cases (IridisUiMachine.ts:95,110) are never reached, so state.activeIndex is never set to NaN. (2) An empty deck is impossible: even the local wrap(active+d, n.value) calls need items.length===0, but stageItemsFor returns statically non-empty STAGE_GROUPS.items for every group (each has >=1 card; result has 13 OUTPUT_FORMAT_CARDS), and the upload group appends to a non-empty base. n.value>=1 always. The bug depends on a precondition (empty items / count===0) the callers structurally prevent, so no concrete input triggers the wrong behavior. It is a real but latent fragility of wrap(), not a triggerable defect.

- **`site/app/composables/colorStreamComparison.ts:33`** — OKLCH lerp interpolates hue linearly (no shortest-arc wrap), contradicting the engine's actual interpolation and the demo's own thesis
  - _Why not a bug:_ The finder correctly notes oklchLerpHex uses linear hue lerp (no wrap) while the engine defaults to shortestArc (Evaluate.ts:24, hueMath.ts lerpHue). But the reported catastrophic failure requires |Δh|>180 (the 30° vs 330° long-arc rainbow). The sole production caller, drawComparisonBands in ColorStreamCard.vue:66, hardcodes toH = (view.h + 180) % 360 — exactly 180° apart, with identical L and C. At exactly 180°, lerpHue's forwardSweep and backwardSweep are both 180, so linear and shortest-arc are EQUAL-LENGTH arcs; there is no long way around and no rainbow smear. Because L/C are constant, the OKLCH band stays fully saturated on either half-wheel, so it never looks 'worse/noisier than RGB' — the demo's thesis (OKLCH stays vibrant, naive RGB muddies at midpoint) holds regardless, and the existing saturation-dip test still passes. The only residual is that for roles with hue ≥ 180, the demo walks the opposite (but equal-length) half-wheel from the engine's clockwise tie-break — different intermediate hues but same endpoints, same length, same vibrancy: a cosmetic fidelity gap in an explicitly stylized static strip, not the reported correctness failure. The specific failure scenario is unreachable given the caller's fixed 180° construction.

- **`site/app/components/content/SchemaTree.vue:78`** — SchemaTree labels unresolved deeper-tier roles as green "resolved"
  - _Why not a bug:_ The badge is documented to signal a role's STATIC default derivation strategy, not its live-active status. Component doc (lines 11-13) says each leaf shows "whether that role is independently resolved from a seed or hue-derived from another role... by default," and the template caption (lines 60-62) says "'resolved' competes for a seed by default; '← source' is hue-derived." Line 78/82 render exactly that: derivedFrom===undefined -> 'resolved' (independent-seed default), else '← source' (hue-derived). This is a permanent schema property, correctly computed from r.derivedFrom.

The swatch fallback to background (line 42) is an INDEPENDENT signal — it shows the live hex if resolved, else a neutral fallback because a deeper-tier role has no live color to display. The comment (lines 37-41) says this fallback signals "not currently active."

The two elements are orthogonal by design: badge = default derivation classification (static), swatch = live color or fallback. A role can legitimately be both "independent-seed by default" (badge) AND "not in the active tier" (background swatch) with no contradiction in the code's own defined terms. The finder's "contradiction" only appears by reinterpreting the badge word "resolved" as "live in the active resolved set" — a meaning the code and both captions explicitly disclaim ("by default").

There is no incorrect computation or wrong output: the badge faithfully reflects derivedFrom as designed and documented. At most this is a wording ambiguity about the label "resolved," not a functional bug. Per the refute-by-default standard, the code already handles the case as intended.


## Structural findings (codebase-memory graph)

The graph pass is corroboration and structural-health signal; it produced no net-new runtime bugs beyond the fleet's, but it pinpoints where risk concentrates and it killed two false "duplication bugs" via direct reads.

- **Complexity epicenter:** `IridisUiMachine.reduce` — cyclomatic **44**, cognitive **101**. By far the most complex unit in either target and the exact code the recent commits keep patching. This is where F05/F06/F07 live; treat any change here as high-regression-risk.
- **Real copy-paste pairs (fix-propagation risk).** `MixHsl.lerpAngle` ≡ `MixOklch.lerpAngle` (jaccard 1.0) — the hue-interpolation bug (F03/F12) is duplicated in both, so both must be fixed together. Also `getOrCreateOutput` ≡ `getOrCreateMetadata`, and `ClusterMedianCut.rangeOf` ≡ `ClusterMedianCutWeighted.rangeOf`. The APCA per-channel error is likewise duplicated between `ContrastApca` and `EnsureContrast` — extract one shared implementation.
- **False positives caught by direct read (NOT bugs):** the intake type-guards (`isHslInput`/`isOklchInput`/`isLabInput`/`isRgbInput`) come back jaccard 1.0 "identical" but have different keys and discriminate correctly; `Engine.run` is flagged "recursive" but only calls *other* objects' `.run()`.
- **Perf hot paths:** the clustering methods (`ClusterKMeans`, `ClusterDeltaEMerge`, `ClusterWuQuantize`) run at loop-depth 3 with allocation-in-loop on the image-intake route, with no sampling guard; `useLivingBackground.tick` does per-frame work inside the rAF loop.
- **Coupling epicenter (temporal):** `useIridis ↔ colorDerivation ↔ IridisUiMachine ↔ iridisUiEffect/Event` all co-change at 0.86–1.0 — the instability center of the demo UI.

## How to read severity

- 🔴 **Critical / 🟠 High** — wrong output on a common path, or a user-facing failure. Fix first: the APCA cluster (F01/F16/F09/F11), the hue-interpolation cluster (F03/F12/F04), and the FSM trio (F05/F06/F07).
- 🟡 **Medium** — wrong output on a reachable-but-narrower path, or a latent defect on a public API no shipping code exercises yet (e.g. phase-hook duplication F14).
- ⚪ **Low** — narrow edge cases, label/format inaccuracies, and consistency gaps.

_Every finding above was confirmed with a concrete reproduction. Line numbers are against the working tree at audit time (branch `develop`)._
