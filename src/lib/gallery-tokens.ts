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
