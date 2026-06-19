import { XMLParser } from 'fast-xml-parser';
import { DAILY, SUBREDDITS, USER_AGENT } from '../sources.config';
import type { Candidate } from '../types';
import { sleep, truncate } from '../lib/utils';

/**
 * Reddit time-window + fetch size for a run. Daily pulls a wide top-of-month
 * window so the per-run slice (below) keeps reaching new posts across runs;
 * backfill widens to top-of-year. Both fetch up to the API max, then slice.
 */
export function redditWindow(opts: { backfill: boolean }): { t: 'month' | 'year'; limit: number } {
  return { t: opts.backfill ? 'year' : DAILY.redditWindow, limit: DAILY.redditFetch };
}

/**
 * Returns the `page`-th contiguous block of `size` items, wrapping the page
 * index within however many blocks the list holds. This is what lets Reddit
 * reach genuinely new posts each run from one wide fetch: Reddit has no cheap
 * cursor pagination like the other sources, so without this it re-returned the
 * same fixed top slice every run, which then just deduped away to zero.
 */
export function pageSlice<T>(items: T[], page: number, size: number): T[] {
  if (items.length <= size) return items;
  const blocks = Math.ceil(items.length / size);
  const p = ((page % blocks) + blocks) % blocks;
  return items.slice(p * size, p * size + size);
}

/**
 * Reddit access, most reliable first:
 *  1. Official OAuth API (free for low volume) when REDDIT_CLIENT_ID /
 *     REDDIT_CLIENT_SECRET are set, never IP-blocked.
 *  2. Public RSS (Atom) feeds otherwise, works without auth but Reddit
 *     intermittently 403s anonymous clients.
 */

// ---------- OAuth JSON path ----------

interface RedditChild {
  data: {
    title: string;
    permalink: string;
    author: string;
    created_utc: number;
    selftext: string;
    ups: number;
    num_comments: number;
    stickied: boolean;
    over_18: boolean;
  };
}

export function normalizeRedditJson(children: RedditChild[]): Candidate[] {
  return children
    .filter((c) => !c.data.stickied && !c.data.over_18)
    .map((c) => ({
      title: c.data.title,
      url: `https://www.reddit.com${c.data.permalink}`,
      platform: 'reddit' as const,
      author: `u/${c.data.author}`,
      postedAt: new Date(c.data.created_utc * 1000).toISOString(),
      excerpt: truncate(c.data.selftext ?? '', 1500),
      stats: { points: c.data.ups, comments: c.data.num_comments },
    }));
}

async function getOauthToken(): Promise<string | null> {
  const id = process.env.REDDIT_CLIENT_ID;
  const secret = process.env.REDDIT_CLIENT_SECRET;
  if (!id || !secret) return null;
  try {
    const res = await fetch('https://www.reddit.com/api/v1/access_token', {
      method: 'POST',
      headers: {
        Authorization: `Basic ${Buffer.from(`${id}:${secret}`).toString('base64')}`,
        'Content-Type': 'application/x-www-form-urlencoded',
        'User-Agent': USER_AGENT,
      },
      body: 'grant_type=client_credentials',
    });
    if (!res.ok) {
      console.warn(`[fetch] reddit oauth token failed: ${res.status}`);
      return null;
    }
    const data = (await res.json()) as { access_token?: string };
    return data.access_token ?? null;
  } catch (err) {
    console.warn(`[fetch] reddit oauth error: ${err instanceof Error ? err.message : err}`);
    return null;
  }
}

async function fetchSubJson(
  sub: string,
  token: string,
  opts: { backfill: boolean; page?: number }
): Promise<Candidate[]> {
  const { t, limit } = redditWindow(opts);
  const url = `https://oauth.reddit.com/r/${sub}/top?t=${t}&limit=${limit}&raw_json=1`;
  const res = await fetch(url, {
    headers: { Authorization: `Bearer ${token}`, 'User-Agent': USER_AGENT },
  });
  if (!res.ok) throw new Error(`status ${res.status}`);
  const data = (await res.json()) as { data: { children: RedditChild[] } };
  return pageSlice(normalizeRedditJson(data.data.children), opts.page ?? 0, DAILY.redditPageSize);
}

// ---------- RSS fallback path ----------

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

async function fetchSubRss(sub: string, opts: { backfill: boolean; page?: number }): Promise<Candidate[]> {
  const { t, limit } = redditWindow(opts);
  const url = `https://www.reddit.com/r/${sub}/top.rss?t=${t}&limit=${limit}`;
  const res = await fetch(url, { headers: { 'User-Agent': USER_AGENT } });
  if (!res.ok) throw new Error(`status ${res.status}`);
  return pageSlice(normalizeRedditFeed(await res.text()), opts.page ?? 0, DAILY.redditPageSize);
}

// ---------- public fetcher ----------

export async function fetchReddit(opts: { backfill: boolean; page?: number }): Promise<Candidate[]> {
  const token = await getOauthToken();
  const results: Candidate[] = [];
  for (const sub of SUBREDDITS) {
    try {
      results.push(...(token ? await fetchSubJson(sub, token, opts) : await fetchSubRss(sub, opts)));
    } catch (err) {
      console.warn(`[fetch] reddit r/${sub} skipped: ${err instanceof Error ? err.message : err}`);
    }
    // Politeness + anonymous-rate-limit avoidance (the OAuth path lifts this).
    await sleep(2500);
  }
  return results;
}
