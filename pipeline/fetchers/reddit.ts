import { XMLParser } from 'fast-xml-parser';
import { SUBREDDITS, USER_AGENT } from '../sources.config';
import type { Candidate } from '../types';
import { sleep, truncate } from '../lib/utils';

/**
 * Reddit's JSON endpoints return 403 to unauthenticated clients from most
 * networks now, but the RSS (Atom) feeds remain open — so we use those.
 * Tradeoff: no vote/comment counts, but top.rss is already ranked.
 */
const parser = new XMLParser({ ignoreAttributes: false });

function asArray<T>(x: T | T[] | undefined): T[] {
  if (x === undefined) return [];
  return Array.isArray(x) ? x : [x];
}

function stripHtml(s: string): string {
  return s
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&amp;/g, '&')
    .replace(/<[^>]*>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

export function normalizeRedditFeed(xml: string): Candidate[] {
  const doc = parser.parse(xml);
  const entries = asArray<any>(doc?.feed?.entry);
  const candidates: Candidate[] = [];
  for (const entry of entries) {
    const links = asArray<any>(entry.link);
    const href = links[0]?.['@_href'];
    const title = typeof entry.title === 'object' ? entry.title['#text'] : entry.title;
    if (!href || !title) continue;
    const content = entry.content;
    const contentText = typeof content === 'object' ? (content['#text'] ?? '') : (content ?? '');
    candidates.push({
      title: String(title),
      url: String(href),
      platform: 'reddit',
      author: String(entry?.author?.name ?? 'unknown'),
      postedAt: String(entry.published ?? entry.updated ?? ''),
      excerpt: truncate(stripHtml(String(contentText)), 1500),
      stats: {},
    });
  }
  return candidates;
}

export async function fetchReddit(opts: { backfill: boolean }): Promise<Candidate[]> {
  const results: Candidate[] = [];
  for (const sub of SUBREDDITS) {
    const t = opts.backfill ? 'year' : 'day';
    const url = `https://www.reddit.com/r/${sub}/top.rss?t=${t}&limit=${opts.backfill ? 50 : 15}`;
    try {
      const res = await fetch(url, { headers: { 'User-Agent': USER_AGENT } });
      if (!res.ok) throw new Error(`status ${res.status}`);
      results.push(...normalizeRedditFeed(await res.text()));
    } catch (err) {
      console.warn(`[fetch] reddit r/${sub} skipped: ${err instanceof Error ? err.message : err}`);
    }
    // Politeness: keep request volume low (PRD free-tier guardrails).
    await sleep(1500);
  }
  return results;
}
