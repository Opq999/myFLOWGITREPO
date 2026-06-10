import { describe, expect, it } from 'vitest';
import { ageInMonths, normalizeUrl, sha256, slugify, titleSimilarity, truncate } from './utils';

describe('slugify', () => {
  it('lowercases, hyphenates, strips punctuation', () => {
    expect(slugify('Turn a 1-hour YouTube video into a week of posts!')).toBe(
      'turn-a-1-hour-youtube-video-into-a-week-of-posts'
    );
  });
  it('caps length at 80 without trailing hyphen', () => {
    const slug = slugify('a'.repeat(60) + ' ' + 'b'.repeat(60));
    expect(slug.length).toBeLessThanOrEqual(80);
    expect(slug.endsWith('-')).toBe(false);
  });
});

describe('sha256', () => {
  it('is deterministic hex', () => {
    expect(sha256('abc')).toMatch(/^[0-9a-f]{64}$/);
    expect(sha256('abc')).toBe(sha256('abc'));
  });
});

describe('normalizeUrl', () => {
  it('strips utm params, hash and trailing slash', () => {
    expect(normalizeUrl('https://Example.com/post/?utm_source=x&utm_medium=y#top')).toBe(
      'https://example.com/post'
    );
  });
  it('keeps meaningful query params', () => {
    expect(normalizeUrl('https://youtube.com/watch?v=abc123')).toBe(
      'https://youtube.com/watch?v=abc123'
    );
  });
  it('treats utm-variants of the same URL as identical', () => {
    expect(normalizeUrl('https://a.com/x?utm_campaign=z')).toBe(normalizeUrl('https://a.com/x'));
  });
});

describe('titleSimilarity', () => {
  it('near-identical titles score high', () => {
    expect(
      titleSimilarity(
        'How I use ChatGPT to write my resume',
        'How I used ChatGPT to write my resume!'
      )
    ).toBeGreaterThan(0.85);
  });
  it('unrelated titles score low', () => {
    expect(titleSimilarity('Fix bugs with Claude Code', 'Best pizza recipes of 2026')).toBeLessThan(
      0.3
    );
  });
});

describe('truncate', () => {
  it('leaves short strings alone and shortens long ones', () => {
    expect(truncate('short', 10)).toBe('short');
    expect(truncate('x'.repeat(20), 10)).toHaveLength(10);
  });
});

describe('ageInMonths', () => {
  it('recent dates are ~0, garbage is Infinity', () => {
    expect(ageInMonths(new Date().toISOString())).toBeLessThan(0.1);
    expect(ageInMonths('not-a-date')).toBe(Infinity);
  });
});
