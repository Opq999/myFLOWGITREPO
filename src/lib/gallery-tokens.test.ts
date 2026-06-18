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
