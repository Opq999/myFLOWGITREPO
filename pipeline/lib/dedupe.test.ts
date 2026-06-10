import { describe, expect, it } from 'vitest';
import type { Candidate } from '../types';
import { dedupe, markSeen, type SeenLedger } from './dedupe';

function candidate(overrides: Partial<Candidate>): Candidate {
  return {
    title: 'A unique workflow title about something',
    url: 'https://example.com/post',
    platform: 'blog',
    author: 'someone',
    postedAt: '2026-06-01',
    excerpt: 'excerpt',
    stats: {},
    ...overrides,
  };
}

function emptyLedger(): SeenLedger {
  return { version: 1, seen: {} };
}

describe('dedupe', () => {
  it('drops candidates whose URL hash is in the ledger', () => {
    const ledger = emptyLedger();
    markSeen(ledger, 'https://example.com/post');
    expect(dedupe([candidate({})], ledger, [])).toHaveLength(0);
  });

  it('treats utm-variant URLs as already seen', () => {
    const ledger = emptyLedger();
    markSeen(ledger, 'https://example.com/post?utm_source=reddit');
    expect(dedupe([candidate({ url: 'https://example.com/post' })], ledger, [])).toHaveLength(0);
  });

  it('drops near-duplicate titles vs existing workflows', () => {
    const existing = ['How I use ChatGPT to tailor my resume to jobs'];
    const result = dedupe(
      [candidate({ title: 'How I used ChatGPT to tailor my resume to jobs!' })],
      emptyLedger(),
      existing
    );
    expect(result).toHaveLength(0);
  });

  it('drops near-duplicates within the same batch, keeps the first', () => {
    const a = candidate({ title: 'Automate invoices with Claude in 5 steps', url: 'https://a.com/1' });
    const b = candidate({ title: 'Automate invoices with Claude in 5 steps!!', url: 'https://b.com/2' });
    const result = dedupe([a, b], emptyLedger(), []);
    expect(result).toHaveLength(1);
    expect(result[0].url).toBe('https://a.com/1');
  });

  it('passes through genuinely new candidates', () => {
    const result = dedupe(
      [candidate({ title: 'Completely fresh workflow about spreadsheets' })],
      emptyLedger(),
      ['An unrelated existing workflow about video editing']
    );
    expect(result).toHaveLength(1);
  });
});
