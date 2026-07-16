# The Design Snob — blind first look at what appears to be a "color engine" that turns images into design-system palettes

## Who I am
I am the person at the dinner party who can tell you the typeface is Akzidenz and not Helvetica from across the room, and who considers "good enough" a moral failure.

## My first five seconds
Before I had located a single idea, I was assaulted by a *wall of tabs* — roughly forty of them, all-caps, letter-spaced, marching across four dense rows like a departures board at a provincial airport that services no destinations anyone wants. Every one is the same weight, the same size, the same tone. This is not navigation; it is a ransom note. Massimo Vignelli built the entire New York subway on the principle that a system speaks through hierarchy and restraint. Here there is no hierarchy at all — forty equal shouts is the same as silence. My eye had nowhere to land, so it did what any trained eye does under assault: it fled downward, past the whole apparatus, hunting for a single quiet thing to hold onto.

## What I think this is / who it's for
Once past the noise I found the actual proposition, and it is — grudgingly — a good one. A wordmark, **IRIDIS**, set in a wide chamfered techno display face, over the line "a chromatic engine that resolves any seeds — or any image — into a full, contrast-enforced, OKLCH-native palette." So: a tool that ingests a photograph and extrudes a rigorous, accessibility-checked color system, then exports it to what looks like every framework ever shipped — Tailwind, MUI, Chakra, Panda, RDF, Android XML, VS Code themes. This is for engineers who care about color science and want to skip the tedium of hand-tuning contrast ratios. A serious instrument wearing a teenager's spacesuit.

## Where my eyes went & what I'd tap first
Below the fold there is finally a composition with intent: a jewel-like iridescent hex-cell "iris" mark, a "Futuristic" theme dropdown, a LIGHT/DARK toggle, and a single violet **UPLOAD** button with an arrow. *That* is the one true call to action, and it took me a full scroll and a wall of forty tabs to reach it. It should have been the first thing on the page, framed by air. Instead the primary action is buried beneath its own table of contents. Rams' sixth principle — honest design — is violated the moment the interface pretends everything is equally important to hide the one thing that matters.

## What confused, annoyed, or lost me
Where do I begin.

**The ghosted section titles.** On nearly every screen — "REFINE," "EXPLORE," "STYLESHEETS," "REFERENCE," "COMBINE," "1. WHAT IS IRIDIS" — the display type carries a doubled, offset glow that reads exactly like *misregistration*, a two-plate print job knocked out of alignment. I know it is meant to be a neon halo. My eye reads it as broken. There is a special circle of hell for effects that mimic production defects.

**Gratuitous glow, everywhere.** The full-width violet-magenta progress bars (screens 2 and 3 of the desktop scroll) don't glow so much as *bleed*, radioactive lozenges stretched wall to wall. Decoration without function. Rams is spinning in a chair he designed.

**The starfield.** Blurred nebula blobs and scattered coloured dots drift behind everything, and behind the *focused* card float ghosted, half-legible sibling panels — "DERIVATION RELATIONS," "COLOR STREAM," "PALETTE" — bleeding in from the margins at 15% opacity. It is visual tinnitus. A tool this precise should sit on a Müller-Brockmann grid of pure negative space, not a planetarium.

**The contrast irony.** This product's crown jewel is a live WCAG contrast table — and yet its own body copy is a soft mid-grey whispered onto near-black, well under the ratios it so proudly enforces on everyone else. Physician, heal thyself.

## What I actually liked
I am not made of stone. There is real craft buried here.

The **iris mark** is genuinely beautiful — a faceted hexagonal cell-ring in full spectral iridescence, restrained in size, jewel-cut. Someone with a good eye made that.

The **Roles Table** is honest information design of the first order: every role swatched, its live contrast ratio printed, an AAA / AA / *fail* badge beside it, sortable by compliance. No decoration, all substance. Vignelli would nod.

The **color-swatch grids** are tidy, modular, evenly gapped — the one place the page finally breathes on a grid. And the **CSS-variables panel** — syntax-highlighted hex, a quiet Copy affordance — is clean and useful. When this thing stops performing "the future" and simply *shows the data*, it is excellent.

## On my phone vs the big screen
The phone is where the sins compound into catastrophe. That forty-tab wall, merely oppressive at 1440px, becomes a *layout failure* at 390px: the tabs stack into an endless column that devours the entire first screen and more, and worse — they are **clipped at both edges**. "COLOR STREAM" is guillotined to "R STREAM" on the left; "CSS VARIABLES (SCOPED)" is chopped to "(SC—" on the right. Text bleeding off the viewport is the most basic responsive crime there is; it tells me no one held this in their hand and scrolled. To the layout's credit, everything *below* that wall reflows to a single sensible column, and the carousel arrows are a reasonable small-screen concession. But the hero wordmark loses its air, and the ghosted double-exposure titles look even more like a fault on a cracked screen. The desktop merely over-decorates; the mobile actively breaks.

## My verdict
This is a Savile Row instrument stitched into a rave poster. Underneath the glow and the starfield and the forty-tab ransom note lives a genuinely rigorous, tasteful idea — OKLCH color science, enforced contrast, honest data tables, a beautiful mark — executed by people who clearly *can* do restraint when they forget to try to impress me. Every decorative instinct here works against every substantive one. Kill the glow. Halve the tabs and give them hierarchy. Fix that ghosted title before someone reports it as a rendering bug. Let the negative space do the talking, and this could be something Vignelli wouldn't sweep off his desk.

**Score: 4.5 / 10** — on my scale, where 10 is "Rams would leave it alone" and 1 is "designed inside a screensaver." The craft is an 8; the taste governing it is a 2; I split the difference and docked half a point for the clipped mobile tabs, out of principle.
