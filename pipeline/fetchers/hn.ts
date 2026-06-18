import { DAILY, HN_QUERIES, USER_AGENT } from '../sources.config';
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

/**
 * Builds an HN Algolia search URL. We deliberately do NOT filter by points
 * server-side: Algolia removed `points`/`num_points` from
 * numericAttributesForFiltering, so `numericFilters=points>N` now returns HTTP
 * 400 (which previously killed the entire HN source). `created_at_i` is still
 * filterable, so backfill keeps its 12-month window; points are filtered
 * client-side instead (the response still carries each hit's points).
 */
export function buildHnUrl(query: string, opts: { backfill: boolean; page?: number }): string {
  const page = opts.page ?? 0;
  const hitsPerPage = opts.backfill ? 40 : DAILY.hnPerPage;
  const params = new URLSearchParams({
    query,
    tags: 'story',
    hitsPerPage: String(hitsPerPage),
    page: String(page),
  });
  if (opts.backfill) {
    const yearAgo = Math.floor(Date.now() / 1000) - 365 * 86400;
    params.set('numericFilters', `created_at_i>${yearAgo}`);
  }
  return `https://hn.algolia.com/api/v1/search?${params.toString()}`;
}

export async function fetchHn(opts: { backfill: boolean; page?: number }): Promise<Candidate[]> {
  const results: Candidate[] = [];
  const minPoints = opts.backfill ? 50 : DAILY.hnMinPoints;
  for (const query of HN_QUERIES) {
    try {
      const res = await fetch(buildHnUrl(query, opts), { headers: { 'User-Agent': USER_AGENT } });
      if (!res.ok) throw new Error(`HN API ${res.status}`);
      const data = (await res.json()) as { hits: HnHit[] };
      // Quality gate applied client-side now that the API won't filter points.
      results.push(...normalizeHn(data.hits.filter((h) => (h.points ?? 0) >= minPoints)));
    } catch (err) {
      // One failed query must not abort the other 11, that's how a single
      // transient/400 response used to silently zero out all of Hacker News.
      console.warn(`[fetch] hackernews query "${query}" failed: ${err instanceof Error ? err.message : err}`);
    }
  }
  return results;
}
