import { HN_QUERIES, USER_AGENT } from '../sources.config';
import type { Candidate } from '../types';
import { truncate } from '../lib/utils';

interface HnHit {
  title: string | null;
  url: string | null;
  objectID: string;
  author: string;
  created_at: string;
  points: number | null;
  num_comments: number | null;
  story_text: string | null;
}

export function normalizeHn(hits: HnHit[]): Candidate[] {
  return hits
    .filter((h) => h.title)
    .map((h) => ({
      title: h.title as string,
      // The HN thread is the human proof; external article noted in excerpt.
      url: `https://news.ycombinator.com/item?id=${h.objectID}`,
      platform: 'hackernews' as const,
      author: h.author,
      postedAt: h.created_at,
      excerpt: truncate(
        [h.url ? `Links to: ${h.url}` : '', h.story_text ?? ''].filter(Boolean).join('\n'),
        1500
      ),
      stats: { points: h.points ?? 0, comments: h.num_comments ?? 0 },
    }));
}

export async function fetchHn(opts: { backfill: boolean }): Promise<Candidate[]> {
  const results: Candidate[] = [];
  for (const query of HN_QUERIES) {
    const numericFilters = opts.backfill
      ? `points>50,created_at_i>${Math.floor(Date.now() / 1000) - 365 * 86400}`
      : 'points>20';
    const url = `https://hn.algolia.com/api/v1/search?query=${encodeURIComponent(query)}&tags=story&numericFilters=${encodeURIComponent(numericFilters)}&hitsPerPage=${opts.backfill ? 30 : 10}`;
    const res = await fetch(url, { headers: { 'User-Agent': USER_AGENT } });
    if (!res.ok) throw new Error(`HN API ${res.status}`);
    const data = (await res.json()) as { hits: HnHit[] };
    results.push(...normalizeHn(data.hits));
  }
  return results;
}
