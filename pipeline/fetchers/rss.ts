import { XMLParser } from 'fast-xml-parser';
import { RSS_FEEDS, USER_AGENT } from '../sources.config';
import type { Candidate } from '../types';
import { ageInMonths, truncate } from '../lib/utils';

const parser = new XMLParser({ ignoreAttributes: false });

function asArray<T>(x: T | T[] | undefined): T[] {
  if (x === undefined) return [];
  return Array.isArray(x) ? x : [x];
}

function stripHtml(s: string): string {
  return s.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();
}

/** Handles both RSS 2.0 (`rss.channel.item`) and Atom (`feed.entry`). */
export function normalizeFeed(xml: string): Candidate[] {
  const doc = parser.parse(xml);
  const candidates: Candidate[] = [];

  const channel = doc?.rss?.channel;
  if (channel) {
    const feedAuthor = channel.title ?? 'unknown';
    for (const item of asArray<any>(channel.item)) {
      if (!item?.title || !item?.link) continue;
      candidates.push({
        title: String(item.title),
        url: String(item.link),
        platform: 'blog',
        author: String(item['dc:creator'] ?? item.author ?? feedAuthor),
        postedAt: item.pubDate ? new Date(item.pubDate).toISOString() : '',
        excerpt: truncate(stripHtml(String(item.description ?? '')), 1500),
        stats: {},
      });
    }
  }

  const feed = doc?.feed;
  if (feed) {
    const feedAuthor = feed?.author?.name ?? feed?.title ?? 'unknown';
    for (const entry of asArray<any>(feed.entry)) {
      if (!entry?.title) continue;
      const links = asArray<any>(entry.link);
      const alt = links.find((l) => l['@_rel'] === 'alternate' || !l['@_rel']);
      const href = alt?.['@_href'];
      if (!href) continue;
      const title = typeof entry.title === 'object' ? entry.title['#text'] : entry.title;
      const summary = entry.summary ?? entry.content;
      const summaryText = typeof summary === 'object' ? (summary?.['#text'] ?? '') : (summary ?? '');
      candidates.push({
        title: String(title),
        url: String(href),
        platform: 'blog',
        author: String(entry?.author?.name ?? feedAuthor),
        postedAt: entry.updated ?? entry.published ?? '',
        excerpt: truncate(stripHtml(String(summaryText)), 1500),
        stats: {},
      });
    }
  }

  return candidates;
}

export async function fetchRss(opts: { backfill: boolean }): Promise<Candidate[]> {
  const results: Candidate[] = [];
  const maxAgeMonths = opts.backfill ? 12 : 0.1; // ~3 days on daily runs
  for (const feedUrl of RSS_FEEDS) {
    try {
      const res = await fetch(feedUrl, { headers: { 'User-Agent': USER_AGENT } });
      if (!res.ok) throw new Error(`status ${res.status}`);
      const xml = await res.text();
      results.push(...normalizeFeed(xml).filter((c) => ageInMonths(c.postedAt) <= maxAgeMonths));
    } catch (err) {
      // One dead feed must not kill the whole RSS source.
      console.warn(`[fetch] rss ${feedUrl} skipped: ${err instanceof Error ? err.message : err}`);
    }
  }
  return results;
}
