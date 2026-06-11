import { MAX_AGE_MONTHS } from '../sources.config';
import type { Candidate } from '../types';
import { ageInMonths } from '../lib/utils';
import { fetchDevto } from './devto';
import { fetchGithub } from './github';
import { fetchHn } from './hn';
import { fetchReddit } from './reddit';
import { fetchRss } from './rss';
import { fetchYoutube } from './youtube';

const SOURCES: [string, (opts: { backfill: boolean; page?: number }) => Promise<Candidate[]>][] = [
  ['hackernews', fetchHn],
  ['reddit', fetchReddit],
  ['devto', fetchDevto],
  ['rss', fetchRss],
  ['github', fetchGithub],
  ['youtube', fetchYoutube],
];

/**
 * Runs all fetchers sequentially (politeness); a failing source logs a
 * warning and contributes nothing — it never blocks the run (PRD Stage 5).
 */
export async function fetchAll(
  opts: { backfill: boolean; page?: number },
  log: (msg: string) => void = console.warn
): Promise<Candidate[]> {
  const all: Candidate[] = [];
  for (const [name, fetcher] of SOURCES) {
    try {
      const candidates = await fetcher(opts);
      log(`[fetch] ${name}: ${candidates.length} candidates`);
      all.push(...candidates);
    } catch (err) {
      log(`[fetch] ${name} FAILED: ${err instanceof Error ? err.message : err}`);
    }
  }
  return all.filter((c) => ageInMonths(c.postedAt) <= MAX_AGE_MONTHS);
}
