# Gallery Playground - Design Spec

Date: 2026-06-18
Status: Approved (pending written-spec review)
Topic: A hidden, live design-token playground at `/gallery`

## Problem

Iterating on the site's look currently means editing styles in the codebase,
rebuilding, and reviewing, which costs time and credits every round. There is no
single place to see all UI pieces together, and styles are written as inline
Tailwind utility classes duplicated across components (there is no central
Button/Input/Badge/Card component).

## Goal

Build a hidden `/gallery` page that:

1. Renders the site's whole UI vocabulary in one place, in real states.
2. Lets the user retune design tokens live in the browser (no rebuild, no
   credits) by overriding CSS custom properties.
3. Exports the result as a ready-to-paste `@theme` block.

## Chosen approach: Hybrid (Approach A)

The gallery imports the real components onto a wrapper where the playground
overrides token variables. Colors and typography are fully truthful because the
real components render inside the wrapper and inherit the overridden variables.
Radius and shadows are currently hardcoded (`rounded-full`, inline `shadow-[...]`),
so a small set of new semantic tokens powers a band of tunable primitive demos.
Adopting those radius/shadow tokens in the real components site-wide is a
deliberate later step (Approach C), out of scope here.

Approaches B (pure sandbox) and C (full refactor) were considered and rejected:
B risks drift between gallery markup and the real site, C is a much larger,
costlier refactor than a gallery warrants.

## Why live theming works here

Tailwind v4 `@theme` tokens are emitted as real CSS custom properties on
`:root`, and utilities resolve to `var(--...)` (for example `text-accent`
becomes `color: var(--color-accent)`). CSS custom properties inherit, so setting
a variable on a wrapper element cascades to every descendant. The playground
therefore overrides variables on the preview wrapper with
`stage.style.setProperty('--color-accent', value)`, and all components inside,
including the real imported ones, update instantly.

## Layout and UX

A two-pane workspace:

- Left: a sticky control panel (about 340px) with collapsible accordions for
  Colors, Category accents, Radius and shadows, and Typography. Sticky position,
  its own scroll.
- Right: a scrollable preview stage with labeled sections, each showing
  components in their real states.
- Top bar: page title, a `Reset to defaults` button, a `Copy @theme block`
  button, and a read-only `<pre>` mirroring the current exported block.
- Mobile: the control panel collapses into a toggleable top drawer.

## Preview stage: three bands

1. Tunable primitives (demo markup that consumes all tokens including the new
   radius and shadow tokens): buttons (primary dark pill, secondary text link,
   disabled), inputs, selects, badges, and surfaces/cards. Every slider visibly
   affects this band.
2. Real site components (imported; color and typography fully live, radii stay
   truthful to the current site): `Badge`, `WorkflowCard`, `Thumbnail`, the dark
   prompt/code block, a prose/MDX sample with numbered steps, category tiles,
   `HireCta` (sidebar and inline variants), `NewsletterForm`, `ShareButtons`,
   `PersonaFilter`.
3. Foundations: a type specimen (Fraunces display sizes, Hanken body, mono, the
   eyebrow label style) and a color swatch grid for the full palette.

The split is deliberate. Band 2 guarantees the user sees the real site for
colors and typography. Band 1 provides working radius and shadow knobs without a
site-wide refactor.

## Controls inventory

- Core colors (color pickers): accent, ink-900, ink-700, ink-500, ink-300,
  paper, paper-2, surface, line, line-strong.
- Category accents (color pickers): content, freelance, academic, jobs, sme,
  coding.
- Radius and shadows (sliders): `--radius-card`, `--radius-control`,
  `--radius-badge`, `--shadow-card` depth, `--border-width`.
- Typography: display family and body family (chosen among already-loaded fonts:
  Fraunces, Hanken Grotesk, serif, system-ui, mono), a base size slider, and a
  heading weight slider.

## New semantic tokens (added to `@theme`)

`--radius-card`, `--radius-control`, `--radius-badge`, `--shadow-card`,
`--border-width`. Defaults are set to match the current look exactly, so nothing
on the live site changes. Only the gallery demos consume them for now.

## Export and persistence

- `Copy @theme block` serializes all current values into a valid `@theme { ... }`
  snippet (existing tokens plus the new ones) and writes it to the clipboard, also
  mirrored in the on-page `<pre>`.
- State persists in `localStorage` under the key `myflow-gallery` and restores on
  load. If storage is blocked (for example private mode), the playground falls
  back to in-memory state without crashing.
- `Reset to defaults` clears storage and removes the inline property overrides,
  reverting to the `@theme` defaults.

## Visibility and SEO

- `<meta name="robots" content="noindex,nofollow">` injected through the Base
  layout's `head` slot.
- Excluded from the sitemap via a `filter` option added to `@astrojs/sitemap` in
  `astro.config.mjs`.
- Search: automatically excluded. Pagefind only indexes regions marked
  `data-pagefind-body`, which only workflow pages have, so the gallery needs no
  action.
- RSS: automatically excluded. `rss.xml.ts` builds only from published
  workflows.
- Not linked from Header or Footer.

## File structure

```
src/pages/gallery.astro              # page: Base layout + noindex + panel + stage
src/components/gallery/ControlPanel.astro
src/components/gallery/Showcase.astro
src/components/gallery/gallery.css   # gallery layout + tunable-demo primitive styles
src/scripts/gallery.ts               # controls to setProperty, persistence, export, reset
src/styles/global.css                # + new semantic tokens (no visual change)
astro.config.mjs                     # + sitemap filter
```

## Non-goals (v1)

- No dark mode (the site is light-only).
- No file write-back; export by copy/paste instead.
- No arbitrary web-font loading; typography controls choose among already-loaded
  families only.
- No refactor of real components to adopt the radius/shadow tokens (that is the
  later Approach C graduation).
- No per-component prop matrix (Storybook-style controls). Components are shown in
  all their states statically.

## Verification

Run `npm run dev` and load `/gallery`:

- Changing a color or font updates both the tunable primitives and the real
  components.
- Changing a radius or shadow slider updates the tunable primitives.
- Tweaks survive a page refresh (localStorage), and `Reset` reverts to defaults.
- `Copy @theme block` produces a valid, non-empty block.
- `npm run check` passes and `npm run build` succeeds.

An optional small Playwright smoke test can assert: the page loads, changing the
accent reflects in a computed style, and the copy output is non-empty.
