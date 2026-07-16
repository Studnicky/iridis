# The Visual Designer — blind first look at IRIDIS, some kind of color-engine playground

## Who I am
I'm a brand and visual designer who has spent twenty years pushing pixels a half-notch at a time and losing sleep over kerning — and when a product is *about* color, I hold its own palette to the standard it's selling.

## My first five seconds
Two things hit at once, and they fought each other.

First: that **IRIDIS** wordmark. Wide, chiseled, faceted sci-fi display face floating in a deep aubergine starfield with a little rainbow-hex iris logo above it. That's a *nice* five seconds. It reads confident, cinematic, "we know what we're doing with light." The chromatic speck-field behind it — tiny red, cyan and blue stars — is a lovely touch precisely because it's restrained; the color lives in the dust, not the furniture.

Second, and immediately: a **wall of tabs**. Before I even reach the logo my eye has to walk past roughly thirty-three tiny all-caps labels — UPLOAD, COMBINE, MANUAL, PALETTE, CVD VISION, SCHEMA & COMPLIANCE, DERIVATION RELATIONS, ROLES TABLE, ROLES, PAIRINGS, SPECTRUM… it keeps going for four full rows. My gut reaction is a flinch. It's the visual equivalent of someone handing me a business card with forty phone numbers on it.

So: genuine craft, wrapped around a hierarchy problem I could see from the doorway.

## What I think this is / who it's for
My honest read, purely from the surface: this is an engine that takes an image (or a few color "seeds") and derives a full, accessibility-checked color system out of it — then exports that system into every framework format under the sun. I'm inferring that from the tagline (*"resolves any seeds — or any image — into a full, contrast-enforced, OKLCH-native palette"*), from the roles table full of live WCAG ratios, and from that giant nav listing Tailwind, shadcn/ui, MUI, Chakra, Panda, UnoCSS, Android theme.xml, RDF Turtle, VS Code theme. It's a design-token foundry dressed as a spaceship console.

Who's it for? Not a casual "pick me a palette" user. This is for engineers and design-systems people who want provable contrast and portable output. It is aggressively for the technical. A marketing site this is not — the hero literally ends the sentence with `engine.run()` in monospace.

## Where my eyes went & what I'd tap first
Once past the nav wall, the center column does its job. The logo pulls me down to **IRIDIS**, to the tagline, to a "Futuristic" theme dropdown, a LIGHT/DARK toggle, and a glowing violet **UPLOAD** button with a little arrow. Good — there *is* a primary action, and it's the right one. I'd tap UPLOAD.

The problem is what surrounds that clarity. There isn't one navigation system here, there are what feels like *three or four*, stacked. The mega-nav up top. Then a second row of pill-tabs that appears mid-page (MANUAL / PALETTE / CVD VISION / SCHEMA & COMPLIANCE…). Then section headers with their own ‹ EXPLORE ›, ‹ REFINE ›, ‹ STYLESHEETS ›, ‹ REFERENCE › prev/next arrows. Then accordions inside the panels. Every one of those is a legitimate wayfinding pattern; all four at once means I never build a stable mental map of "where am I." Visually, the active pill glows violet and the rest sit muted — that part's handled well — but four parallel glowing-violet systems compete for the same "you are here" signal.

## What confused, annoyed, or lost me
- **The tab wall (screen 00, and worse on mobile).** Thirty-plus destinations at equal weight is not navigation, it's an index. Nothing is primary. On the phone it's genuinely a problem — see below.
- **Contrast on the chrome, of all things.** Here's the irony that stings a color tool: the nav labels are low-contrast grey caps on near-black, and on the desktop shots the *inactive* neighboring cards are ghosted at maybe 15% opacity directly behind the active card (screens 03, 04, 05). Faded translucent text like "DERIVATION RELATIONS" and "COLOR STREAM" bleeds through from behind the panel. It's an atmospheric choice, but it muddies the reading plane and — on a product that enforces WCAG AAA in its own output table — the surrounding UI doesn't hold itself to the same bar.
- **The tagline over the starfield.** Mid-grey body copy sitting on a busy speckled nebula (screen 00) is a legibility compromise I wouldn't ship. The dots land inside the letterforms.
- **The dark-navy swatches vanish.** In the SAMPLE grid (screen 02) the top rows are deep blues and near-blacks on a near-black card — several swatches essentially disappear. A color tool's swatches need a hairline border or a lighter cell so *every* chip is legible, especially the dark ones.
- **Density whiplash.** Screen 01 is a dense lab of five sliders and two paragraphs of fine-print helper text; screen 09 is airy, generously-spaced accordion rows. Same site, two very different spacing philosophies. It reads like different rooms rather than one building.

## What I actually liked
Plenty, and I want to be fair, because there's real discipline here.

- **The roles table (screen 05) is the star.** A tidy grid of color chips, each with its name, a live contrast **Ratio**, and an AAA/AA/fail badge — text-strong 17.41 AAA, syntax-type 10.22, right down to border 1.36 fail. *This* is the product practicing what it preaches: it shows its contrast math in public, failures included. As a color person I trust a tool more when it's willing to print its own "fail." The syntax hues (pink, teal, amber, violet, lime) are vibrant yet clearly separated in hue — that's a well-spaced categorical palette, not a random rainbow.
- **The violet accent is used with restraint.** One confident brand color for actions and active states; everything else is neutral. That's the right move and it mostly holds.
- **The CSS-variables code block (screen 06)** is beautifully typeset — real monospace, tokenized syntax coloring, a clean Copy affordance. It looks like the product's output, which is exactly the flex it should be making.
- **That display typeface** for IRIDIS and the section headers (EXPLORE, REFINE, STYLESHEETS) gives the brand a spine. Paired with a clean humanist sans for body, the type *pairing* is sound even where the sizing rhythm wobbles.
- **The little iris/hex logo mark** is genuinely lovely — a jeweled rainbow cluster that says "spectrum" without a single word.

## On my phone vs the big screen
The phone exposes the desktop's hidden sin. On the 1440 the tab wall is a bad idea; on the 390 it's a **full-screen wall** — screen 00 on mobile is *nothing but* thirty-plus stacked tabs before you can scroll to the logo. The hero, the thing the brand lives or dies on, is pushed entirely below the fold by its own menu. That mega-nav should collapse into a hamburger or a single "Explore stages" sheet on mobile, full stop. And the labels truncate — "CSS VARIABLES (SC…" clipped mid-word (mobile 02, 06) is the kind of ragged edge that undermines an otherwise polished type system.

Credit where due: once you're *past* the nav, the mobile layout is actually the more comfortable read. The single-column accordions (mobile 07, 09) breathe better than the desktop's ghost-card-behind-card stack, the swatch and roles grids reflow cleanly to two columns (mobile 05), and the sliders stack sensibly (mobile 01). Ironically the phone hides the desktop's parallax-ghosting problem simply by not having room for it. So the content scales well; it's the *entry* — that opening tab dump — that mobile makes untenable.

## My verdict
There's a real designer in here, and a real engineer, and right now the engineer is winning the layout argument. The color system, the contrast honesty, the token output, the brand mark, the restrained violet — that's craft I respect, and on the roles table the product absolutely earns the "chromatic engine" claim. But it's buried under a navigation strategy that shows the user *everything at once* and trusts them to cope: a thirty-plus tab wall, three or four overlapping wayfinding systems, and a translucent ghost layer that dirties the very reading contrast this tool sells. Tame the front door — collapse the mega-nav, pick one primary navigation, put a hairline on every swatch, lift the chrome's contrast to the AAA bar the output already clears — and this goes from "impressive lab that intimidates me" to "beautiful instrument I want to play."

**Score: 6.5 / 10** on my personal *craft-minus-restraint* scale — where 10 is a design system so disciplined it disappears, and I dock hard for every place the tool doesn't practice the color rigor it preaches. The talent's clearly a 9; the editing is holding it back.
