import { describe, expect, it } from 'vitest';
import type { Candidate } from '../types';
import { enrichmentTarget, extractText } from './enrich';

function candidate(excerpt: string): Candidate {
  return {
    title: 'Some workflow',
    url: 'https://news.ycombinator.com/item?id=1',
    platform: 'hackernews',
    author: 'x',
    postedAt: '2026-06-01',
    excerpt,
    stats: {},
  };
}

describe('enrichmentTarget', () => {
  it('returns null when the excerpt is already rich', () => {
    expect(enrichmentTarget(candidate('detailed steps... '.repeat(30)))).toBeNull();
  });

  it('prefers the linked article URL for HN link posts', () => {
    expect(enrichmentTarget(candidate('Links to: https://blog.example/post'))).toBe(
      'https://blog.example/post'
    );
  });

  it('falls back to the candidate URL for thin excerpts', () => {
    expect(enrichmentTarget(candidate('short'))).toBe('https://news.ycombinator.com/item?id=1');
  });
});

describe('extractText', () => {
  it('strips scripts, styles, tags and collapses whitespace', () => {
    const html = `<html><head><style>.x{color:red}</style><script>alert(1)</script></head>
      <body><nav>menu</nav><p>Step 1: paste   the prompt.</p><p>Step 2: run it.</p></body></html>`;
    const text = extractText(html);
    expect(text).toContain('Step 1: paste the prompt.');
    expect(text).toContain('Step 2: run it.');
    expect(text).not.toContain('alert');
    expect(text).not.toContain('menu');
  });
});
