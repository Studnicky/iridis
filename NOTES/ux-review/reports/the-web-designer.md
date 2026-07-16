# The Web Designer — blind first look at IRIDIS, a color-engine-for-developers thing

## Who I am
I'm the person who redraws your nav on a napkin at lunch and asks "okay, but what does the user *do* in the first five seconds?" — I think in Nielsen heuristics, tap targets, and fold lines.

## My first five seconds
I opened the page and got hit in the face with a wall of tabs. Not a nav bar — a *nav wall*. Four dense rows on desktop, roughly thirty-five all-caps labels: UPLOAD, COMBINE, MANUAL, PALETTE, CVD VISION, SCHEMA & COMPLIANCE, DERIVATION RELATIONS, ROLES TABLE… all the way down to RDF (TURTLE), VS CODE THEME, HUE DERIVATION, CLAMPS. Every one of them is the same size, same weight, same dim lavender-on-near-black. My eye had nowhere to land. It's the visual equivalent of someone reading you their entire table of contents out loud before saying hello.

Then, once I got *past* the wall, the actual hero underneath is genuinely nice — a glowing iridescent orb, "IRIDIS" set in a chrome sci-fi display face, a tagline, a single UPLOAD button. So my gut reaction is split down the middle: "oh, this is pretty" fighting "oh no, the menu ate the page."

## What I think this is / who it's for
A palette/design-token engine for developers. You feed it an image (or seed colors), and it extracts a color palette, enforces WCAG contrast on every role, and spits the result out as CSS variables, Tailwind, shadcn/ui, MUI, Chakra, Panda, UnoCSS, Android XML, JSON, even an RDF Turtle dump and a VS Code theme. The tagline "Every pixel here is `engine.run()`" and the OKLCH talk tell me this is aimed squarely at front-end engineers and design-system people — not designers-designers, and definitely not civilians. Nobody's grandmother is reading "Harmonize threshold · 10" and "it's O(n²), so this bounds the work." This is a power tool that has decided, proudly, to look like one.

## Where my eyes went & what I'd tap first
Once I fought past the nav, the wayfinding actually resolves: **UPLOAD** is the one clearly primary button — filled arrow, standout treatment, unambiguous. Good. That's the first action, and it's the right one. My complaint is everything you have to survive to reach it: the nav wall, then a "Futuristic" dropdown, then a Light/Dark toggle, *then* the button. Three decisions stacked in front of the one thing you actually want me to do. Push UPLOAD up. Let me change the theme later.

The deeper problem is that this page has **four separate navigation systems fighting each other**: (1) the giant sticky top tab-wall, (2) inline pill sub-navs that appear mid-scroll (MANUAL / PALETTE / CVD VISION…, then CSS VARIABLES / SCOPED / TAILWIND…), (3) section headers with left/right chevron arrows — COMBINE ‹ ›, REFINE ‹ ›, EXPLORE ‹ ›, STYLESHEETS ‹ ›, REFERENCE ‹ › — that imply a horizontal stepper, and (4) a numbered doc accordion at the bottom (1. What is Iridis … 12. Living Color). Four mental models for one page. I never formed a single stable map of "where am I and how do I get back."

## What confused, annoyed, or lost me
- **The nav wall (every screen).** It's sticky, so it follows me down the whole page, permanently stealing the top ~15% of desktop viewport and a catastrophic chunk of mobile. No grouping, no hierarchy, no primary/secondary split. UPLOAD and CLAMPS are peers. That's a flat sitemap masquerading as a menu.
- **The chevron arrows vs. vertical scroll (screens 03, 05, 07).** Those ‹ EXPLORE › / ‹ REFERENCE › headers scream "paged carousel, swipe me sideways," but the content is a long vertical scroll. Are the arrows stepping through stages? Scrolling the page? Cycling a card? I genuinely couldn't tell without clicking, and a first-timer shouldn't have to gamble.
- **Text clipping (desktop 00 and mobile 06).** "CSS VARIABLES (SCOPED)" and "CSS VARIABLES (SC…" get truncated. When your own nav labels don't fit their own chips, that's a sign the label set outgrew the pattern.
- **The mid-page density cliff (screens 01, 02).** You go from a serene hero to "Merge input cap · 128," "Histogram bits · 5," a delta-E dropdown, and a paragraph invoking O(n²) — with essentially no on-ramp. It's a fantastic control panel dropped into a landing page with no transition.
- **The particle starfield behind everything.** Pretty, on-brand, but it sits *behind text* and the dim nav labels, and it fights legibility. The low-contrast lavender labels over moving specks are the weakest contrast on the page — ironic for a tool whose headline feature is enforcing contrast.

## What I actually liked
There's real craft here, and I want to be fair about it.
- **The Roles Table (screen 05) is the best thing on the page.** Named color roles as chips, each with a live WCAG ratio and an AAA / AA / fail badge, sortable by Compliance and Ratio. That is accessibility surfaced *as a first-class visible feature*, not buried in a checklist. text-strong 17.41 AAA next to border 1.36 fail — I can scan a whole system's contrast health in one glance. Chef's kiss.
- **The in-place help microcopy.** The explanation under "Harmonize threshold" ("hues within this ΔE distance of each other are nudged into agreement — cleans up near-duplicate colors…") is genuinely well-written. Help-and-documentation, right where the control is. That's textbook, and it's done with care.
- **The export block (screen 06).** A clean code panel with a Copy button and a format switcher across the top. Standard, legible, obvious affordance. No notes.
- **The hero lockup and the logo.** The iridescent orb and the chrome wordmark are a strong, coherent brand moment. The pipeline stepper (1. intake:hexHint … 12. derive:variant) with required/disabled badges is a tidy, honest bit of information design too.

## On my phone vs the big screen
This is where it hurts. On desktop the nav wall is at least a scannable 4-row grid. **On the phone (screen 00), the *entire first viewport is nothing but navigation* — ten rows of tabs — and the IRIDIS logo barely peeks in at the very bottom edge.** A first-time mobile visitor lands on a screen that is 100% menu and 0% content. There's no hamburger, no collapse, no horizontal-scroll chip row — just the whole sitemap dumped vertically. That is the single most fixable, highest-impact problem on the site: collapse that into a hamburger or a sticky UPLOAD bar and you've reclaimed the entire mobile first impression.

It gets worse: those inline pill sub-navs and section carousels grow **side chevrons on mobile** (‹ ›, visible on screens 01, 02, 05, 06, 07), which means cards you swipe *horizontally* live inside a page you scroll *vertically*. Double-axis scrolling is a classic trap — I never know which gesture does what, and I'll fat-finger the wrong one. Credit where due: the actual controls — sliders, dropdowns, the code block — do reflow to a sensible single column and stay usable. The layout engine is fine. It's the *navigation* that never adapted to a small screen.

## My verdict
This is a tool built by people who clearly know color, accessibility, and their own domain cold — the Roles Table and the contextual help prove there's serious design intelligence in here. But it's wearing its entire feature list as a hat. The nav wall, the four competing wayfinding systems, and a mobile first-screen that's pure menu mean a newcomer's first job is *archaeology*, not action. The good news is that almost all of my pain is in one layer — navigation — and it's eminently fixable: collapse the wall into a grouped/primary structure, pick *one* wayfinding metaphor, hoist UPLOAD above the fold, and let that gorgeous Roles Table breathe. The bones and the craft are already better than the first impression lets on.

**Score: 5.5 / 10** — on my personal scale of *"how few decisions stand between a first-time visitor and their first real action."* Right now there are too many, and on mobile the very first one is "scroll past the menu to find out this is a website."
