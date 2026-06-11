import { DEVTO_TAGS, USER_AGENT } from '../sources.config';
import type { Candidate } from '../types';
import { truncate } from '../lib/utils';

interface DevtoArticle {
  title: string;
  url: string;
  published_at: string;
  description: string;
  positive_reactions_count: number;
  comments_count: number;
  user: { username: string };
}

export function normalizeDevto(articles: DevtoArticle[]): Candidate[] {
  return articles.map((a) => ({
    title: a.title,
    url: a.url,
    platform: 'blog' as const,
    author: a.user.username,
    postedAt: a.published_at,
    excerpt: truncate(a.description ?? '', 1500),
    stats: { points: a.positive_reactions_count, comments: a.comments_count },
  }));
}

export async function fetchDevto(opts: { backfill: boolean; page?: number }): Promise<Candidate[]> {
  const results: Candidate[] = [];
  const page = opts.backfill ? (opts.page ?? 0) + 1 : 1;
  for (const tag of DEVTO_TAGS) {
    const top = opts.backfill ? 365 : 2;
    const url = `https://dev.to/api/articles?tag=${tag}&top=${top}&per_page=${opts.backfill ? 30 : 10}&page=${page}`;
    const res = await fetch(url, { headers: { 'User-Agent': USER_AGENT } });
    if (!res.ok) throw new Error(`Dev.to ${res.status}`);
    const data = (await res.json()) as DevtoArticle[];
    results.push(...normalizeDevto(data));
  }
  return results;
}
