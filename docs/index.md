---
layout: doc
title: iridis — chromatic palette builder
---

<div style="padding:1.5rem 0 1rem;border-bottom:1px solid var(--iridis-divider);margin-bottom:1.5rem">
  <h1 style="font-size:2.6rem;font-weight:700;letter-spacing:-0.02em;margin:0 0 0.4rem;border:0;padding:0">iridis</h1>
  <p style="font-size:1.18rem;color:var(--iridis-muted);max-width:680px;margin:0 0 1.25rem;line-height:1.5">
    Pick your colors. Get a complete, accessible, role-resolved palette. Export it as JSON and walk away.
    No download. No build step. No runtime.
  </p>
  <div style="display:flex;gap:0.6rem;flex-wrap:wrap;align-items:center">
    <PaletteCTA />
    <a href="/iridis/getting-started" style="text-decoration:none;padding:0.55rem 1.2rem;border-radius:6px;background:var(--iridis-bg-soft);color:var(--iridis-text);border:1px solid var(--iridis-divider);font-weight:500;font-size:0.95rem">For developers</a>
    <a href="https://github.com/Studnicky/iridis" style="text-decoration:none;padding:0.55rem 1.2rem;border-radius:6px;background:var(--iridis-bg-soft);color:var(--iridis-text);border:1px solid var(--iridis-divider);font-weight:500;font-size:0.95rem">GitHub</a>
  </div>
</div>

::: tip For designers
The example panel on the right is the whole product. Pick seed colors. Open **Configuration** to swap framing or contrast level. Hit **Export** to download a JSON of your resolved palette. Drop it into Figma tokens, your CSS variables, your design system — wherever you ship colors. The whole site re-themes with your choices as you work, so you can preview your palette in motion before you take it home.
:::

## What you get

A palette that already satisfies your accessibility requirements. Every role you ask for — `background`, `foreground`, `accent`, `muted`, or whatever your schema declares — comes out inside its declared lightness, chroma, and contrast envelope. If your seeds don't fit, the engine **nudges them in OKLCH space** until they do. You receive the palette that works, not a report of what's broken.

- **Variable input.** 1 to 8 seed colors. Hex, RGB, HSL, OKLCH, Lab, named, or image pixels — all normalized to a canonical OKLCH-first record.
- **Role-resolved.** Pick `minimal` (4 roles), `w3c` (7 roles), or `material` (6 roles). Or write your own role schema in the right panel.
- **Contrast-enforced.** WCAG 2.1 AA / AAA, or APCA Lc. Every role pair you declare meets the threshold or the engine moves the color until it does.
- **Framing-aware.** Dark mode and light mode are real switches in the iridis pipeline, not a CSS toggle. Swap framing in the navbar — every role recomputes against the new envelope.
- **Free, forever.** This whole page runs in your browser. No account, no API key, no telemetry. The palette is yours.

## When you actually need to install something

You only need the npm package if you want palettes generated **at runtime in your app**, like:

- Per-user theming (each user's seeds drive their session)
- Dynamic responses (palette shifts on time of day, scroll, audio, sensors)
- Build-step token generation in CI

If you just need *a* palette — pick once, ship the result — stay here. Export, paste, ship.

```bash
npm install @studnicky/iridis      # only if you want runtime generation
```

## Where to look next

For designers:
- **[Try it out](./try-it-out)** — the builder, dedicated full-screen
- **[Accessibility calculations](./concepts/accessibility-calculations)** — what AA / AAA / APCA actually mean

For developers:
- **[Getting started](./getting-started)** — the one-liner, then the full Engine API
- **[Pipeline](./concepts/pipeline)** — how the engine runs (intake → resolve → enforce → emit)
- **[Role schemas](./concepts/role-schemas)** — declare what a palette must satisfy
- **[CLI](./recipes/cli)** — the same engine, no Node.js code
- **[Living color (v2 thesis)](./v2-living-color)** — animation engine and reactive bindings planned next
