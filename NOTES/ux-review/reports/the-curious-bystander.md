# The Curious Bystander — blind first look at "IRIDIS," some kind of glowing space-color machine

**Who I am** — A nosy person who clicked a link with zero context, landed in the dark, and started scrolling to figure out what on earth I'd walked into.

## My first five seconds

Whoa. Black screen, tiny stars drifting around like I'm floating in space, and this chunky chrome wordmark — **IRIDIS** — sitting in the middle like the title card of a sci-fi movie. There's a little jewel-toned spiral thing above it, kind of a glittering mineral eye, and a smear of pink-orange-teal blobs next to it. It's genuinely pretty. My gut says "expensive, confident, slightly showing off."

But before I even got to the pretty part, my eyes hit a **wall of tabs** across the very top. I counted something like thirty-plus little labels — UPLOAD, COMBINE, MANUAL, PALETTE, CVD VISION, SCHEMA & COMPLIANCE, DERIVATION RELATIONS, ROLES TABLE, SPECTRUM, TAILWIND, SHADCN/UI, MUI, CHAKRA UI, PANDA CSS, UNOCSS, CAPACITOR, ANDROID THEME.XML, RDF (TURTLE)... It just keeps going. Four dense rows of it. My first feeling was equal parts "ooh" and "oh no."

## What I think this is / who it's for

Okay, reading the one line under the logo: *"A chromatic engine that resolves any seeds — or any image — into a full, contrast-enforced, OKLCH-native palette. Every pixel here is .engine.run()."*

So here's my honest guess: you feed it a photo (or some colors), and it spits out a whole coordinated color palette you can drop into an app. The tagline has `.engine.run()` written like code, and half those top tabs are framework names I half-recognize — Tailwind, MUI, Chakra. So this is **a tool for people who build software** and need color systems that don't clash and stay readable.

Is it for someone like me? Honestly... probably not. I don't know what "OKLCH-native" means, I've never said the word "seeds" about colors, and "contrast-enforced" sounds like homework. But I'm curious enough to keep scrolling, because it clearly *does something* and it looks cool doing it.

## Where my eyes went & what I'd tap first

After the logo, the page hands me three clear things stacked together: a dropdown that says **"Futuristic,"** a **LIGHT / DARK** toggle (currently dark, obviously), and a big fat **UPLOAD** button with an arrow. That UPLOAD button is the one thing on the whole first screen that says "press me, something happens." So that's where I'd go — upload a picture and see what it makes. Good. There is exactly one obvious front door, and I found it.

The "Futuristic" dropdown intrigued me — is that a *theme*? A vibe selector? I'd poke it just to be nosy. It suggests the whole look of the site changes, which is a fun promise.

## What confused, annoyed, or lost me

- **That tab wall (every screen).** It never goes away. It's pinned to the top of literally every screenshot, all four rows of it, following me down the entire page. Thirty-something cryptic labels is not a menu, it's an index of a manual I haven't been given. I have no idea what "CLAMPS" or "INTERACTABLES" or "HUE DERIVATION" are, and nothing invites me to find out gently.
- **The slider screens (desktop 01, phone 01).** I scrolled down and suddenly there's a "Clustering algorithm — ΔE (delta-e)" dropdown, a "Merge input cap · 128," "Histogram bits · 5," "Harmonize threshold · 10." A paragraph explains it's "O(n²), so this bounds the work." I fell off a cliff. One screen I'm looking at a movie title, the next I'm staring at somebody's signal-processing control panel. No transition, no "here's the simple version first."
- **The roles table (desktop 04, phone 05).** A giant grid of color chips each labeled with things like `syntax-operator`, `focus-ring`, `Ratio 9.85`, and little badges: AAA, AA, **fail**. I get that green-AAA is good and red-fail is bad, but I don't know what I did to "fail" or whether I should care.
- **The `:root { --c-background: #060102 }` code block (desktop 05, phone 06).** A wall of glowing hex codes. There's a Copy button, which tells me this is the *output* — but for me it's just confirmation I've wandered into the engine room.

## What I actually liked

I'll be fair — there's real craft here. The **starfield** isn't just wallpaper; those little colored dots (pink, teal, violet) feel like they belong to the same palette the tool makes, so the whole page feels like it's *made of its own product*. That's a nice touch even if I only half-noticed it consciously.

The **color swatch grids** (the "SAMPLE — Delta-E merge" card) are genuinely satisfying — rows of deep blues, teals, one pop of red — like a paint-chip drawer. And I liked the **numbered accordions near the bottom**: "1. What is Iridis," "2. The Four Stages," "5. Recipe: Vue + Capacitor Per-Category Palettes." *There's* the friendly part. If I'd found *that* first — a plain-English "What is Iridis" — instead of the slider panel, I'd have felt invited instead of lost. The stepper labels (EXPLORE, REFINE, REFERENCE, STYLESHEETS) with the little back/forward arrows also felt like a guided path, which I appreciated.

## On my phone vs the big screen

The phone version actually handled the chaos a bit *better* in one way and *worse* in another. Better: the logo, tagline, and that first stack breathe more — IRIDIS fills the screen and feels like a real landing moment. Worse: **the tab wall eats the top third of every single phone screen.** All 33 labels wrap into these stacked pills that push the actual content way down. On the phone I had to scroll past the whole index just to reach anything, every time. Some labels get clipped at the right edge too — "CSS VARIABLES (SC..." just runs off the screen.

The content cards themselves reflow nicely to one column on the phone, and the sliders and swatch grids stay usable. But that permanent tab-thicket on mobile is the difference between "cool" and "claustrophobic." On desktop it's a busy header I can look past; on the phone it's a gate I have to climb over repeatedly.

## My verdict

I came in with zero context and left knowing this is a slick, seriously-built machine for turning images into developer color palettes — and knowing, pretty firmly, that it's built for people who already know what OKLCH and contrast ratios and ΔE clustering are. The front door (UPLOAD) is clear and the visuals are gorgeous, but two seconds later the site assumes I'm one of its people and drops me into the control room without a handrail. The plain-English "What is Iridis" explainer is buried at the very bottom, behind a mile of sliders and hex codes and a permanent 33-item tab wall that never lets up — especially on my phone. I'd stick around a *little* longer out of pure nosiness, poke the UPLOAD and the "Futuristic" dropdown, and then bounce the moment the delta-e sliders showed up. Beautiful, confident, and not quite willing to hold a stranger's hand.

**Score: 6 out of 10** — on my personal "did a total stranger feel invited or feel like they crashed a party?" scale. Points for looking incredible and having one clear thing to press; points off for making me feel like I forgot to read the syllabus.
