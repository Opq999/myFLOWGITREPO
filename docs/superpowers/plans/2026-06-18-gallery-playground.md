# Gallery Playground Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a hidden `/gallery` page that renders the whole UI vocabulary and lets the user retune design tokens live in the browser, then copy the result as a paste-ready `@theme` block.

**Architecture:** Hybrid (Approach A). A left control panel writes CSS custom properties onto a right-hand preview stage. Because Tailwind v4 utilities resolve to `var(--...)` and custom properties inherit, real imported components inside the stage update live for colors and typography. New semantic radius/shadow tokens power a band of tunable primitive demos. State persists in localStorage; export is copy-to-clipboard.

**Tech Stack:** Astro 5, Tailwind CSS 4 (`@theme`), TypeScript (strict), vitest. No new dependencies.

**Spec:** docs/superpowers/specs/2026-06-18-gallery-playground-design.md

**Conventions:** No em or en dashes in any content (user preference). Commit messages use lowercase `type:` prefixes matching the repo (`feat:`, `test:`, `chore:`).

---

## File Structure

- Create: `src/lib/gallery-tokens.ts` - single source of truth for tunable tokens (data + pure helpers; ships to browser, no server-only imports).
- Create: `src/lib/gallery-tokens.test.ts` - vitest unit tests for the pure helpers.
- Create: `src/components/gallery/ControlPanel.astro` - renders controls by iterating the token model.
- Create: `src/components/gallery/Showcase.astro` - the three preview bands (real components + tunable demos + foundations).
- Create: `src/components/gallery/gallery.css` - gallery layout + tunable demo primitive styles.
- Create: `src/scripts/gallery.ts` - client wiring: load, apply, persist, export, reset.
- Create: `src/pages/gallery.astro` - the page (Base layout, noindex, toolbar, panel + stage, script include).
- Modify: `src/styles/global.css` - add new semantic tokens (no visual change to the live site).
- Modify: `astro.config.mjs` - add a sitemap filter excluding `/gallery`.

---

## Task 1: Add new semantic tokens to global.css

New radius tokens go in `@theme` (Tailwind generates harmless bonus `rounded-*` utilities). Shadow depth and border width go in a plain `:root` rule to avoid generating invalid utilities. Defaults match the current look exactly, so the live site does not change.

**Files:**
- Modify: `src/styles/global.css`

- [ ] **Step 1: Add radius tokens to the `@theme` block**

In `src/styles/global.css`, inside the existing `@theme { ... }` block, immediately after the `--color-coding` line (the last category accent, around line 56), add:

```css

  /* Gallery-tunable radii (defaults match current look: rounded-2xl / rounded-full).
     Only the /gallery demos consume these for now; the live site is unchanged. */
  --radius-card: 1rem;
  --radius-control: 999px;
  --radius-badge: 999px;
```

- [ ] **Step 2: Add a `:root` rule for non-namespaced tunables**

In `src/styles/global.css`, immediately after the closing `}` of the `@theme` block (before the `body {` rule around line 60), add:

```css

/* Gallery-tunable presentational tokens that are NOT Tailwind namespaces, so
   they live in :root (no utilities generated). Defaults are inert site-wide. */
:root {
  --shadow-card: 1px;          /* depth scalar (px) used by gallery demo cards */
  --border-width: 1px;
}
```

- [ ] **Step 3: Verify the build is unaffected**

Run: `npm run build`
Expected: build succeeds, no errors. The live pages look identical (nothing references the new tokens yet).

- [ ] **Step 4: Commit**

```bash
git add src/styles/global.css
git commit -m "feat: add gallery-tunable radius/shadow/border tokens"
```

---

## Task 2: Token model and pure helpers (TDD)

This module is the single source of truth. It is pure data plus pure functions so it can be unit-tested and safely bundled into the client script.

**Files:**
- Create: `src/lib/gallery-tokens.ts`
- Test: `src/lib/gallery-tokens.test.ts`

- [ ] **Step 1: Write the failing test**

Create `src/lib/gallery-tokens.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import {
  TOKEN_GROUPS,
  allControls,
  controlFor,
  defaultValues,
  formatValue,
  serializeTheme,
} from './gallery-tokens';

describe('defaultValues', () => {
  it('includes every control var with its default', () => {
    const v = defaultValues();
    expect(v['--color-accent']).toBe('#ff4d2e');
    expect(v['--radius-card']).toBe(1);
    expect(Object.keys(v)).toHaveLength(allControls().length);
  });
});

describe('formatValue', () => {
  it('appends the unit for sliders', () => {
    expect(formatValue(controlFor('--radius-control')!, 12)).toBe('12px');
  });
  it('emits unitless slider values without a unit', () => {
    expect(formatValue(controlFor('--gallery-heading-weight')!, 700)).toBe('700');
  });
  it('passes colors and selects through unchanged', () => {
    expect(formatValue(controlFor('--color-accent')!, '#abcdef')).toBe('#abcdef');
  });
});

describe('serializeTheme', () => {
  it('wraps values in an @theme block with formatted units', () => {
    const css = serializeTheme(defaultValues());
    expect(css).toContain('@theme {');
    expect(css).toContain('--color-accent: #ff4d2e;');
    expect(css).toContain('--radius-control: 999px;');
    expect(css).toContain('--radius-card: 1rem;');
  });
  it('uses overrides when provided and defaults otherwise', () => {
    const css = serializeTheme({ '--color-accent': '#000000' });
    expect(css).toContain('--color-accent: #000000;');
    expect(css).toContain('--color-paper: #fbf9f4;');
  });
});

describe('TOKEN_GROUPS', () => {
  it('has the four expected groups', () => {
    expect(TOKEN_GROUPS.map((g) => g.id)).toEqual(['colors', 'categories', 'shape', 'type']);
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npx vitest run src/lib/gallery-tokens.test.ts`
Expected: FAIL with a module-not-found / import error (file does not exist yet).

- [ ] **Step 3: Write the implementation**

Create `src/lib/gallery-tokens.ts`:

```ts
/**
 * Single source of truth for the gallery playground's tunable design tokens.
 * Drives BOTH the control panel (server render) and the live override + export
 * logic (client). Pure data + pure functions only: this module is bundled into
 * the browser, so it must not import anything server-only.
 */

export interface ColorControl {
  kind: 'color';
  var: string;
  label: string;
  default: string;
}

export interface SliderControl {
  kind: 'slider';
  var: string;
  label: string;
  default: number;
  min: number;
  max: number;
  step: number;
  unit: string; // 'px' | 'rem' | '' (unitless)
}

export interface SelectControl {
  kind: 'select';
  var: string;
  label: string;
  default: string;
  options: { label: string; value: string }[];
}

export type TokenControl = ColorControl | SliderControl | SelectControl;

export interface TokenGroup {
  id: string;
  label: string;
  controls: TokenControl[];
}

export type TokenValues = Record<string, string | number>;

const FRAUNCES = '"Fraunces", Georgia, "Times New Roman", serif';
const HANKEN =
  '"Hanken Grotesk", system-ui, -apple-system, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif';
const SERIF = 'Georgia, "Times New Roman", serif';
const SYSTEM = 'system-ui, -apple-system, sans-serif';
const MONO = 'ui-monospace, Menlo, Consolas, monospace';

export const TOKEN_GROUPS: TokenGroup[] = [
  {
    id: 'colors',
    label: 'Core colors',
    controls: [
      { kind: 'color', var: '--color-accent', label: 'Accent', default: '#ff4d2e' },
      { kind: 'color', var: '--color-ink-900', label: 'Ink 900 (headings)', default: '#1c1713' },
      { kind: 'color', var: '--color-ink-700', label: 'Ink 700 (body)', default: '#41392f' },
      { kind: 'color', var: '--color-ink-500', label: 'Ink 500 (muted)', default: '#6e655a' },
      { kind: 'color', var: '--color-ink-300', label: 'Ink 300 (faint)', default: '#b6ada0' },
      { kind: 'color', var: '--color-paper', label: 'Paper (canvas)', default: '#fbf9f4' },
      { kind: 'color', var: '--color-paper-2', label: 'Paper 2', default: '#f3eee3' },
      { kind: 'color', var: '--color-surface', label: 'Surface', default: '#ffffff' },
      { kind: 'color', var: '--color-line', label: 'Line', default: '#e8e1d5' },
      { kind: 'color', var: '--color-line-strong', label: 'Line strong', default: '#d6ccbb' },
    ],
  },
  {
    id: 'categories',
    label: 'Category accents',
    controls: [
      { kind: 'color', var: '--color-cat-content', label: 'Content', default: '#db2777' },
      { kind: 'color', var: '--color-cat-freelance', label: 'Freelance', default: '#b45309' },
      { kind: 'color', var: '--color-cat-academic', label: 'Academic', default: '#2563eb' },
      { kind: 'color', var: '--color-cat-jobs', label: 'Jobs', default: '#047857' },
      { kind: 'color', var: '--color-cat-sme', label: 'SME', default: '#c2410c' },
      { kind: 'color', var: '--color-cat-coding', label: 'Coding', default: '#6d28d9' },
    ],
  },
  {
    id: 'shape',
    label: 'Radius & shadows',
    controls: [
      { kind: 'slider', var: '--radius-card', label: 'Card radius', default: 1, min: 0, max: 2.5, step: 0.05, unit: 'rem' },
      { kind: 'slider', var: '--radius-control', label: 'Button/input radius', default: 999, min: 0, max: 999, step: 1, unit: 'px' },
      { kind: 'slider', var: '--radius-badge', label: 'Badge radius', default: 999, min: 0, max: 999, step: 1, unit: 'px' },
      { kind: 'slider', var: '--shadow-card', label: 'Card shadow depth', default: 1, min: 0, max: 24, step: 1, unit: 'px' },
      { kind: 'slider', var: '--border-width', label: 'Border width', default: 1, min: 0, max: 3, step: 0.5, unit: 'px' },
    ],
  },
  {
    id: 'type',
    label: 'Typography',
    controls: [
      {
        kind: 'select',
        var: '--font-display',
        label: 'Display font',
        default: FRAUNCES,
        options: [
          { label: 'Fraunces (default)', value: FRAUNCES },
          { label: 'Hanken Grotesk', value: HANKEN },
          { label: 'Georgia serif', value: SERIF },
          { label: 'System sans', value: SYSTEM },
          { label: 'Monospace', value: MONO },
        ],
      },
      {
        kind: 'select',
        var: '--font-sans',
        label: 'Body font',
        default: HANKEN,
        options: [
          { label: 'Hanken Grotesk (default)', value: HANKEN },
          { label: 'Fraunces', value: FRAUNCES },
          { label: 'Georgia serif', value: SERIF },
          { label: 'System sans', value: SYSTEM },
          { label: 'Monospace', value: MONO },
        ],
      },
      { kind: 'slider', var: '--gallery-base', label: 'Specimen base size', default: 16, min: 12, max: 22, step: 1, unit: 'px' },
      { kind: 'slider', var: '--gallery-heading-weight', label: 'Heading weight', default: 600, min: 300, max: 900, step: 50, unit: '' },
    ],
  },
];

export function allControls(): TokenControl[] {
  return TOKEN_GROUPS.flatMap((g) => g.controls);
}

const CONTROL_BY_VAR: Record<string, TokenControl> = Object.fromEntries(
  allControls().map((c) => [c.var, c])
);

export function controlFor(varName: string): TokenControl | undefined {
  return CONTROL_BY_VAR[varName];
}

export function defaultValues(): TokenValues {
  const out: TokenValues = {};
  for (const c of allControls()) out[c.var] = c.default;
  return out;
}

export function formatValue(control: TokenControl, value: string | number): string {
  if (control.kind === 'slider') return `${value}${control.unit}`;
  return String(value);
}

export function serializeTheme(values: TokenValues): string {
  const lines: string[] = [];
  for (const group of TOKEN_GROUPS) {
    lines.push(`  /* ${group.label} */`);
    for (const c of group.controls) {
      const raw = values[c.var] ?? c.default;
      lines.push(`  ${c.var}: ${formatValue(c, raw)};`);
    }
  }
  return (
    '/* Generated by /gallery. Append to src/styles/global.css; Tailwind merges @theme blocks. */\n' +
    `@theme {\n${lines.join('\n')}\n}`
  );
}
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `npx vitest run src/lib/gallery-tokens.test.ts`
Expected: PASS, all assertions green.

- [ ] **Step 5: Commit**

```bash
git add src/lib/gallery-tokens.ts src/lib/gallery-tokens.test.ts
git commit -m "feat: add gallery token model and pure helpers with tests"
```

---

## Task 3: ControlPanel component

Renders the control inputs from `TOKEN_GROUPS`. Each input carries `data-token-var` (and `data-unit` for sliders) so the client script can wire it without hardcoded ids.

**Files:**
- Create: `src/components/gallery/ControlPanel.astro`

- [ ] **Step 1: Write the component**

Create `src/components/gallery/ControlPanel.astro`:

```astro
---
import { TOKEN_GROUPS } from '../../lib/gallery-tokens';
---

<aside class="gallery-panel" aria-label="Design token controls">
  {
    TOKEN_GROUPS.map((group) => (
      <details class="gallery-group" open>
        <summary>{group.label}</summary>
        <div class="gallery-group__body">
          {group.controls.map((c) => (
            <label class="gallery-control">
              <span class="gallery-control__label">{c.label}</span>
              {c.kind === 'color' && (
                <input type="color" data-token-var={c.var} value={c.default} />
              )}
              {c.kind === 'slider' && (
                <input
                  type="range"
                  data-token-var={c.var}
                  data-unit={c.unit}
                  min={c.min}
                  max={c.max}
                  step={c.step}
                  value={c.default}
                />
              )}
              {c.kind === 'select' && (
                <select data-token-var={c.var}>
                  {c.options.map((o) => (
                    <option value={o.value} selected={o.value === c.default}>
                      {o.label}
                    </option>
                  ))}
                </select>
              )}
            </label>
          ))}
        </div>
      </details>
    ))
  }
</aside>
```

- [ ] **Step 2: Type-check**

Run: `npm run check`
Expected: 0 errors (the component compiles; it is not yet referenced by a page, which is fine).

- [ ] **Step 3: Commit**

```bash
git add src/components/gallery/ControlPanel.astro
git commit -m "feat: add gallery control panel component"
```

---

## Task 4: Gallery CSS (layout + tunable demos)

Two-pane layout, sticky sidebar, and the demo primitive styles that consume the new tokens so the radius/shadow/border sliders have a visible target. Also sets defaults for the gallery-only specimen vars on the stage.

**Files:**
- Create: `src/components/gallery/gallery.css`

- [ ] **Step 1: Write the stylesheet**

Create `src/components/gallery/gallery.css`:

```css
/* Gallery playground styles. Loaded only by src/pages/gallery.astro. */

/* Gallery-only specimen defaults live on the stage so they exist before JS. */
#gallery-stage {
  --gallery-base: 16px;
  --gallery-heading-weight: 600;
  min-width: 0;
}

.gallery-layout {
  display: grid;
  grid-template-columns: 340px 1fr;
  gap: 2rem;
  align-items: start;
}
@media (max-width: 860px) {
  .gallery-layout {
    grid-template-columns: 1fr;
  }
}

.gallery-sidebar {
  position: sticky;
  top: 1rem;
  align-self: start;
  max-height: calc(100vh - 2rem);
  overflow-y: auto;
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
}
@media (max-width: 860px) {
  .gallery-sidebar {
    position: static;
    max-height: none;
  }
}

.gallery-toolbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.5rem;
}
.gallery-toolbar__actions {
  display: flex;
  gap: 0.5rem;
}
.gallery-btn {
  border-radius: 999px;
  border: 1px solid var(--color-line-strong);
  background: var(--color-surface);
  color: var(--color-ink-800);
  padding: 0.4rem 0.9rem;
  font-size: 0.8rem;
  font-weight: 600;
  cursor: pointer;
}
.gallery-btn--primary {
  background: var(--color-ink-900);
  color: var(--color-paper);
  border-color: var(--color-ink-900);
}

.gallery-group {
  border: 1px solid var(--color-line);
  border-radius: 0.75rem;
  background: var(--color-surface);
}
.gallery-group > summary {
  cursor: pointer;
  padding: 0.6rem 0.85rem;
  font-weight: 600;
  font-size: 0.85rem;
  color: var(--color-ink-900);
}
.gallery-group__body {
  padding: 0.25rem 0.85rem 0.85rem;
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}
.gallery-control {
  display: grid;
  grid-template-columns: 1fr auto;
  align-items: center;
  gap: 0.5rem;
  font-size: 0.78rem;
  color: var(--color-ink-600);
}
.gallery-control input[type='color'] {
  width: 2.2rem;
  height: 1.6rem;
  padding: 0;
  border: 1px solid var(--color-line);
  border-radius: 0.3rem;
  background: none;
}
.gallery-control input[type='range'] {
  width: 9rem;
}
.gallery-control select {
  max-width: 9rem;
  font-size: 0.75rem;
}

.gallery-export {
  font-family: var(--font-mono);
  font-size: 0.7rem;
  line-height: 1.5;
  background: #14110d;
  color: #ede8e1;
  border-radius: 0.6rem;
  padding: 0.75rem;
  overflow: auto;
  max-height: 16rem;
  white-space: pre;
  margin: 0;
}

.gallery-bands {
  display: flex;
  flex-direction: column;
  gap: 2.5rem;
}
.gallery-section {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}
.gallery-section__title {
  font-family: var(--font-display);
  font-size: 1.3rem;
  font-weight: 600;
  color: var(--color-ink-900);
  border-bottom: 1px solid var(--color-line);
  padding-bottom: 0.4rem;
}
.gallery-row {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 0.75rem;
}
.gallery-row--cards {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(150px, 1fr));
}

/* Tunable demo primitives: consume the new semantic tokens so sliders work. */
.demo-btn-primary {
  border-radius: var(--radius-control);
  background: var(--color-ink-900);
  color: var(--color-paper);
  padding: 0.625rem 1.25rem;
  font-weight: 600;
  border: none;
  cursor: pointer;
}
.demo-btn-primary[disabled] {
  opacity: 0.45;
  cursor: not-allowed;
}
.demo-btn-secondary {
  border-radius: var(--radius-control);
  border: var(--border-width) solid var(--color-line-strong);
  background: var(--color-surface);
  color: var(--color-ink-900);
  padding: 0.625rem 1.25rem;
  font-weight: 600;
  cursor: pointer;
}
.demo-input {
  border-radius: var(--radius-control);
  border: var(--border-width) solid var(--color-line-strong);
  background: var(--color-paper);
  color: var(--color-ink-900);
  padding: 0.625rem 1rem;
  font-size: 0.9rem;
}
.demo-badge {
  border-radius: var(--radius-badge);
  border: 1px solid;
  padding: 0.15rem 0.6rem;
  font-family: var(--font-mono);
  font-size: 10px;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.12em;
}
.demo-badge--sourced {
  border-color: var(--color-line-strong);
  background: var(--color-paper-2);
  color: var(--color-ink-600);
}
.demo-badge--tested {
  border-color: color-mix(in srgb, var(--color-accent) 50%, transparent);
  background: color-mix(in srgb, var(--color-accent) 10%, transparent);
  color: var(--color-accent);
}
.demo-badge--verified {
  border-color: rgba(59, 130, 246, 0.4);
  background: rgba(59, 130, 246, 0.1);
  color: #1d4ed8;
}
.demo-card {
  background: var(--color-surface);
  border: var(--border-width) solid var(--color-line);
  border-radius: var(--radius-card);
  box-shadow: 0 var(--shadow-card) calc(var(--shadow-card) * 2.4)
    calc(var(--shadow-card) * -0.4) rgba(28, 23, 19, 0.18);
  padding: 1.25rem;
  max-width: 22rem;
}

.demo-specimen {
  font-size: var(--gallery-base);
  display: flex;
  flex-direction: column;
  gap: 0.4rem;
}

.gallery-swatches {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(140px, 1fr));
  gap: 0.6rem;
}
.gallery-swatch {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  font-size: 0.75rem;
  color: var(--color-ink-600);
}
.gallery-swatch__chip {
  width: 1.6rem;
  height: 1.6rem;
  border-radius: 0.4rem;
  border: 1px solid var(--color-line);
}
```

- [ ] **Step 2: Commit**

```bash
git add src/components/gallery/gallery.css
git commit -m "feat: add gallery layout and tunable demo styles"
```

---

## Task 5: Showcase component

The three preview bands. Imports real components, pulls a sample published workflow for `WorkflowCard`, renders category tiles from `CATEGORY_META`, a `.workflow-body` prose sample, and a static replica of the (config-gated) newsletter form. Swatches are generated from the color groups of the token model.

**Files:**
- Create: `src/components/gallery/Showcase.astro`

- [ ] **Step 1: Write the component**

Create `src/components/gallery/Showcase.astro`:

```astro
---
import { getCollection } from 'astro:content';
import Badge from '../Badge.astro';
import WorkflowCard from '../WorkflowCard.astro';
import HireCta from '../HireCta.astro';
import ShareButtons from '../ShareButtons.astro';
import PersonaFilter from '../PersonaFilter.astro';
import { CATEGORY_META } from '../../lib/categories';
import { TOKEN_GROUPS } from '../../lib/gallery-tokens';

const published = await getCollection('workflows', (e) => e.data.published);
const sample = published[0];
const swatches = TOKEN_GROUPS.filter((g) => g.id === 'colors' || g.id === 'categories').flatMap(
  (g) => g.controls
);
const categories = Object.entries(CATEGORY_META);
---

<div class="gallery-bands">
  <!-- Band 1: tunable primitives -->
  <section class="gallery-section">
    <h2 class="gallery-section__title">Primitives (tunable)</h2>
    <div class="gallery-row">
      <button type="button" class="demo-btn-primary">Primary</button>
      <button type="button" class="demo-btn-secondary">Secondary</button>
      <button type="button" class="demo-btn-primary" disabled>Disabled</button>
    </div>
    <div class="gallery-row">
      <input class="demo-input" type="email" placeholder="you@example.com" />
      <select class="demo-input">
        <option>Choose a category</option>
        <option>Content creation</option>
        <option>Coding</option>
      </select>
    </div>
    <div class="gallery-row">
      <span class="demo-badge demo-badge--sourced">Sourced</span>
      <span class="demo-badge demo-badge--tested">Tested ✓</span>
      <span class="demo-badge demo-badge--verified">Verified</span>
    </div>
    <div class="gallery-row">
      <div class="demo-card">
        <p class="font-mono text-[10px] font-bold uppercase tracking-[0.2em] text-accent">Surface</p>
        <p class="mt-1 font-display text-lg font-semibold text-ink-900">Card / surface</p>
        <p class="mt-1 text-sm text-ink-500">Border, radius and shadow all follow the sliders.</p>
      </div>
    </div>
  </section>

  <!-- Band 2: real components -->
  <section class="gallery-section">
    <h2 class="gallery-section__title">Real components</h2>
    <div class="gallery-row">
      <Badge badge="sourced" />
      <Badge badge="tested" />
      <Badge badge="community-verified" />
    </div>
    {
      sample && (
        <div class="gallery-row" style="max-width: 22rem;">
          <WorkflowCard workflow={sample} />
        </div>
      )
    }
    <div class="gallery-row gallery-row--cards">
      {
        categories.map(([slug, meta]) => (
          <div class="bento-tile rounded-2xl p-5" data-category={slug}>
            <span class="text-2xl">{meta.emoji}</span>
            <p class="mt-2 font-display text-lg font-semibold text-ink-900">{meta.label}</p>
          </div>
        ))
      }
    </div>
    <div class="workflow-body">
      <h2>Workflow body sample</h2>
      <p>
        This exercises the MDX prose styles: <a href="#">links</a>, <strong>strong</strong>, lists
        and the dark prompt block below.
      </p>
      <ul>
        <li>First point</li>
        <li>Second point</li>
      </ul>
      <ol>
        <li>Step one</li>
        <li>Step two</li>
      </ol>
      <pre><code>Write a 200-word product description for: [PRODUCT]</code></pre>
    </div>
    <HireCta variant="inline" workflowTitle="Sample workflow" timeMinutes={20} />
    <div class="gallery-row" style="max-width: 22rem;">
      <HireCta variant="sidebar" workflowTitle="Sample workflow" timeMinutes={20} />
    </div>
    {/* Newsletter form is config-gated (SITE.buttondownUsername is empty), so this
        is a faithful static replica of NewsletterForm.astro for preview only. */}
    <section
      class="relative overflow-hidden rounded-2xl border border-line bg-surface p-6 shadow-[0_1px_2px_rgba(28,23,19,0.04)]"
    >
      <p class="font-mono text-[10px] font-bold uppercase tracking-[0.2em] text-accent">Newsletter</p>
      <h2 class="mt-1 font-display text-2xl font-medium tracking-[-0.02em] text-ink-900">
        Get new workflows weekly
      </h2>
      <p class="mt-1 text-sm text-ink-500">One email a week. Free workflows only.</p>
      <form class="mt-4 flex flex-wrap gap-2" onsubmit="return false">
        <input
          type="email"
          placeholder="you@example.com"
          class="min-w-0 flex-1 rounded-full border border-line-strong bg-paper px-4 py-2.5 text-sm text-ink-900 placeholder:text-ink-400 focus:border-accent focus:outline-none"
        />
        <button
          type="submit"
          class="rounded-full bg-ink-900 px-5 py-2.5 font-sans text-sm font-semibold text-paper transition-transform hover:scale-[1.03]"
        >
          Subscribe
        </button>
      </form>
    </section>
    <ShareButtons title="Sample workflow" url="https://opqai.pages.dev/" />
    <PersonaFilter />
  </section>

  <!-- Band 3: foundations -->
  <section class="gallery-section">
    <h2 class="gallery-section__title">Foundations</h2>
    <div class="demo-specimen">
      <p class="font-mono text-[10px] font-bold uppercase tracking-[0.2em] text-accent">
        Eyebrow label
      </p>
      <span
        class="font-display"
        style="font-size:2.5em; font-weight:var(--gallery-heading-weight); color:var(--color-ink-900); line-height:1.1;"
        >Display heading</span
      >
      <span
        class="font-display"
        style="font-size:1.6em; font-weight:var(--gallery-heading-weight); color:var(--color-ink-900);"
        >Section heading</span
      >
      <span style="color:var(--color-ink-700)"
        >Body copy in Hanken Grotesk. The quick brown fox jumps over the lazy dog.</span
      >
      <span class="font-mono" style="color:var(--color-ink-500)">Mono: const x = 42;</span>
    </div>
    <div class="gallery-swatches">
      {
        swatches.map((c) => (
          <div class="gallery-swatch">
            <span class="gallery-swatch__chip" style={`background:var(${c.var})`} />
            <span class="gallery-swatch__label">{c.label}</span>
          </div>
        ))
      }
    </div>
  </section>
</div>
```

- [ ] **Step 2: Type-check**

Run: `npm run check`
Expected: 0 errors. (If `published` is empty in a fresh checkout, the `sample &&` guard prevents a render error.)

- [ ] **Step 3: Commit**

```bash
git add src/components/gallery/Showcase.astro
git commit -m "feat: add gallery showcase bands"
```

---

## Task 6: Client wiring script

Loads saved state, hydrates inputs, applies values to the stage as CSS custom properties, persists on every change, and wires the Copy and Reset buttons. Pure helpers come from the tested token module.

**Files:**
- Create: `src/scripts/gallery.ts`

- [ ] **Step 1: Write the script**

Create `src/scripts/gallery.ts`:

```ts
import {
  controlFor,
  defaultValues,
  formatValue,
  serializeTheme,
  type TokenValues,
} from '../lib/gallery-tokens';

const STORAGE_KEY = 'myflow-gallery';

function readStorage(): TokenValues {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as TokenValues) : {};
  } catch {
    return {};
  }
}

function writeStorage(values: TokenValues): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(values));
  } catch {
    /* storage blocked (e.g. private mode): keep in-memory only */
  }
}

function init(): void {
  const stage = document.getElementById('gallery-stage');
  if (!stage) return;
  const preview = document.getElementById('gallery-export');
  const inputs = Array.from(
    document.querySelectorAll<HTMLInputElement | HTMLSelectElement>('[data-token-var]')
  );

  const values: TokenValues = { ...defaultValues(), ...readStorage() };

  const apply = (varName: string): void => {
    const control = controlFor(varName);
    if (!control) return;
    stage.style.setProperty(varName, formatValue(control, values[varName]));
  };
  const refreshExport = (): void => {
    if (preview) preview.textContent = serializeTheme(values);
  };

  for (const input of inputs) {
    const varName = input.dataset.tokenVar;
    if (!varName) continue;
    if (values[varName] !== undefined) input.value = String(values[varName]);
    input.addEventListener('input', () => {
      values[varName] = input.type === 'range' ? Number(input.value) : input.value;
      apply(varName);
      writeStorage(values);
      refreshExport();
    });
    apply(varName);
  }
  refreshExport();

  const copyBtn = document.getElementById('gallery-copy');
  copyBtn?.addEventListener('click', () => {
    navigator.clipboard.writeText(serializeTheme(values)).then(() => {
      const original = copyBtn.textContent;
      copyBtn.textContent = 'Copied ✓';
      setTimeout(() => {
        copyBtn.textContent = original;
      }, 2000);
    });
  });

  const resetBtn = document.getElementById('gallery-reset');
  resetBtn?.addEventListener('click', () => {
    const defaults = defaultValues();
    for (const key of Object.keys(values)) delete values[key];
    Object.assign(values, defaults);
    for (const input of inputs) {
      const varName = input.dataset.tokenVar;
      if (!varName) continue;
      input.value = String(values[varName]);
      stage.style.removeProperty(varName);
    }
    try {
      localStorage.removeItem(STORAGE_KEY);
    } catch {
      /* ignore */
    }
    refreshExport();
  });
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init);
} else {
  init();
}
```

- [ ] **Step 2: Type-check**

Run: `npm run check`
Expected: 0 errors.

- [ ] **Step 3: Commit**

```bash
git add src/scripts/gallery.ts
git commit -m "feat: add gallery client wiring (apply, persist, export, reset)"
```

---

## Task 7: Gallery page

Wires everything together: Base layout, noindex via the head slot, a toolbar with Reset and Copy plus the export `<pre>`, the control panel, the preview stage wrapping the showcase, and the script. Note: the stage is a `<div>` (not `<main>`) because Base already renders a `<main>`.

**Files:**
- Create: `src/pages/gallery.astro`

- [ ] **Step 1: Write the page**

Create `src/pages/gallery.astro`:

```astro
---
import Base from '../layouts/Base.astro';
import ControlPanel from '../components/gallery/ControlPanel.astro';
import Showcase from '../components/gallery/Showcase.astro';
import '../components/gallery/gallery.css';
---

<Base title="Gallery">
  <meta slot="head" name="robots" content="noindex,nofollow" />
  <div class="gallery-layout">
    <div class="gallery-sidebar">
      <div class="gallery-toolbar">
        <h1 class="font-display text-xl font-semibold text-ink-900">Gallery</h1>
        <div class="gallery-toolbar__actions">
          <button id="gallery-reset" type="button" class="gallery-btn">Reset</button>
          <button id="gallery-copy" type="button" class="gallery-btn gallery-btn--primary">
            Copy @theme
          </button>
        </div>
      </div>
      <ControlPanel />
      <pre id="gallery-export" class="gallery-export" aria-label="Exported @theme block"></pre>
    </div>
    <div id="gallery-stage" data-pagefind-ignore class="gallery-stage">
      <Showcase />
    </div>
  </div>
</Base>

<script>
  import '../scripts/gallery.ts';
</script>
```

- [ ] **Step 2: Type-check and build**

Run: `npm run check && npm run build`
Expected: 0 type errors; build succeeds; `/gallery` is emitted to `dist/gallery/index.html`.

- [ ] **Step 3: Manual visual verification**

Run: `npm run dev`, then open `http://localhost:4321/gallery`.

Verify:
- All three bands render: tunable primitives, real components (including the sample WorkflowCard), and foundations (specimen + swatches).
- Drag the Accent picker: the real Badge "Tested", WorkflowCard accent text, demo badge, and swatch all change together.
- Drag "Button/input radius": the demo buttons and inputs change roundness; drag "Card radius" and "Card shadow depth": the demo card responds.
- Change the Display font select: the specimen and demo card heading change.
- Refresh the page: your tweaks persist (localStorage).
- Click "Copy @theme": clipboard contains a valid `@theme { ... }` block (paste somewhere to confirm); the on-page `<pre>` mirrors it.
- Click "Reset": inputs and preview return to defaults; refresh confirms storage cleared.

- [ ] **Step 4: Commit**

```bash
git add src/pages/gallery.astro
git commit -m "feat: add hidden /gallery playground page"
```

---

## Task 8: Exclude /gallery from the sitemap

**Files:**
- Modify: `astro.config.mjs`

- [ ] **Step 1: Add the sitemap filter**

In `astro.config.mjs`, change the integrations line:

```js
  integrations: [mdx(), sitemap()],
```

to:

```js
  integrations: [mdx(), sitemap({ filter: (page) => !page.includes('/gallery') })],
```

- [ ] **Step 2: Verify the sitemap excludes the page**

Run: `npm run build`
Then inspect `dist/sitemap-0.xml` and confirm there is no `<loc>` containing `/gallery`.

Run: `grep -L gallery dist/sitemap-0.xml` (expected: the filename prints, meaning the term is absent), or open the file and search manually.

- [ ] **Step 3: Commit**

```bash
git add astro.config.mjs
git commit -m "chore: exclude /gallery from sitemap"
```

---

## Task 9: Final verification

**Files:** none (verification only).

- [ ] **Step 1: Run the full check suite**

Run: `npm run check`
Expected: 0 errors.

Run: `npm run test`
Expected: all tests pass, including `gallery-tokens.test.ts`.

Run: `npm run build`
Expected: build succeeds; Pagefind indexes; `dist/gallery/index.html` exists; `dist/sitemap-0.xml` has no `/gallery` entry.

- [ ] **Step 2: Confirm search and RSS exclusion**

- Confirm `dist/gallery/index.html` contains `<meta name="robots" content="noindex,nofollow">`.
- Confirm the gallery body has `data-pagefind-ignore` and there is no `data-pagefind-body` on the page, so Pagefind does not index it.
- Confirm `dist/rss.xml` contains only workflow links (no `/gallery`).

- [ ] **Step 3: Optional Playwright smoke test**

If desired, with `npm run dev` running, use the Playwright tools to assert: navigate to `/gallery`, the page title contains "Gallery", changing the accent input updates a computed color on a `.demo-badge--tested` element, and the `#gallery-export` text contains `@theme {`. This is optional; the unit tests plus manual verification are the primary gates.

- [ ] **Step 4: Final commit (only if Step 1-2 required fixes)**

```bash
git add -A
git commit -m "chore: gallery verification fixes"
```

---

## Self-Review

**Spec coverage:**
- Live theming via CSS-variable override: Tasks 2, 6 (apply via setProperty on the stage).
- Two-pane layout, sticky panel, mobile stack: Task 4.
- Three preview bands (tunable primitives, real components, foundations): Task 5.
- Controls for all four token groups: Task 2 (`TOKEN_GROUPS`), Task 3 (render).
- New semantic radius/shadow/border tokens with inert defaults: Task 1.
- Export `@theme` block + localStorage persistence + reset: Tasks 2, 6, 7.
- Visibility (noindex, sitemap filter, search/RSS auto-excluded): Tasks 7, 8, 9.
- Verification: Tasks 7 (manual), 9 (build/test/optional Playwright).

**Placeholder scan:** No TBD/TODO; every code step contains complete code.

**Type consistency:** Helper names (`defaultValues`, `formatValue`, `serializeTheme`, `controlFor`, `allControls`, `TokenValues`) are defined in Task 2 and used identically in Tasks 3, 5, 6. Control `var` names in Task 2 match the new tokens added in Task 1 (`--radius-card`, `--radius-control`, `--radius-badge`, `--shadow-card`, `--border-width`) and the gallery-only specimen vars (`--gallery-base`, `--gallery-heading-weight`) defaulted in Task 4.

**Known intentional deviations:** The newsletter form is a static replica (the real component is config-gated by an empty `buttondownUsername`); the base-size and heading-weight sliders target the foundations specimen band, not the real components (which use fixed Tailwind text sizes). Both are documented in the spec.
