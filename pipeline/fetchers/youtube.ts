import { USER_AGENT, YOUTUBE_QUERIES } from '../sources.config';
import type { Candidate } from '../types';
import { truncate } from '../lib/utils';

interface YoutubeItem {
  id: { videoId?: string };
  snippet: {
    title: string;
    channelTitle: string;
    publishedAt: string;
    description: string;
  };
}

export function normalizeYoutube(items: YoutubeItem[]): Candidate[] {
  return items
    .filter((i) => i.id.videoId)
    .map((i) => ({
      title: i.snippet.title,
      url: `https://www.youtube.com/watch?v=${i.id.videoId}`,
      platform: 'youtube' as const,
      author: i.snippet.channelTitle,
      postedAt: i.snippet.publishedAt,
      excerpt: truncate(i.snippet.description ?? '', 1500),
      stats: {},
    }));
}

/** Optional source: silently skipped when YOUTUBE_API_KEY is not set. */
export async function fetchYoutube(opts: { backfill: boolean }): Promise<Candidate[]> {
  const key = process.env.YOUTUBE_API_KEY;
  if (!key) return [];
  const results: Candidate[] = [];
  const publishedAfter = new Date(
    Date.now() - (opts.backfill ? 365 : 7) * 86400 * 1000
  ).toISOString();
  for (const query of YOUTUBE_QUERIES) {
    // search.list costs 100 units; 2 queries/day is well inside the 10k/day quota.
    const url =
      `https://www.googleapis.com/youtube/v3/search?part=snippet&type=video&order=viewCount` +
      `&maxResults=${opts.backfill ? 15 : 5}&publishedAfter=${publishedAfter}` +
      `&q=${encodeURIComponent(query)}&key=${key}`;
    const res = await fetch(url, { headers: { 'User-Agent': USER_AGENT } });
    if (!res.ok) throw new Error(`YouTube API ${res.status}`);
    const data = (await res.json()) as { items: YoutubeItem[] };
    results.push(...normalizeYoutube(data.items ?? []));
  }
  return results;
}
