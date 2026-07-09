# iridis site

> The iridis demo/docs site — a Nuxt 3 app that runs the real engine live against its own theme.

Every color, chart, code panel, and animation on this page is produced by `engine.run()` against
whatever seeds or image the user feeds it — nothing here is a static mockup. See the root
[README](../README.md) for what iridis itself is; this app is one consumer of it, built to prove
the pipeline out end-to-end: seed/image intake, role resolution, WCAG/APCA/CVD enforcement, and
every output-format plugin (`@studnicky/iridis-tailwind`, `-vscode`, `-shadcn`, `-mui`, `-chakra`,
`-panda`, `-capacitor`), all wired to one shared palette state.

## Requirements

Node.js >= 24 (matches the root workspace's `engines.node`).

## Develop

From the repo root (this is an npm workspace, not a standalone project):

```sh
npm install
cd site
npm run dev
```

Starts the dev server on `http://localhost:3000`.

## Other scripts

```sh
npm run build      # production build
npm run generate   # static prerender
npm run preview    # locally preview a production build
npm run typecheck  # nuxi typecheck
npm test           # node --test against test/
```

## Structure

- `app/components/content/` — cards: one focused demo/control each (palette input, pipeline
  explainer, CVD vision, motion showcase, ...).
- `app/components/layout/` — page-level chrome (the coverflow carousel, the ambient background,
  the sticky table-of-contents bar, the CVD preview overlay).
- `app/composables/useIridis.ts` — the shared engine state: every ref/computed every component
  reads, and the only place `engine.run()` is actually called.
- `app/composables/useIridisUiMachine.ts` + `app/composables/fsm/` — the UI-interaction FSM
  (carousel navigation, mode switching, seed edits) that every interactive control routes
  through, so "click a dot" and "pick a card from the table of contents" are provably the same
  action.
- `app/theme/` — role-schema definitions and the CSS-variable projector (`Tokens.ts`) that turns
  the engine's resolved roles into the `--ui-*` custom properties the whole page reads.
