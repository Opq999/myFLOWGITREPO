import { GITHUB_QUERIES, USER_AGENT } from '../sources.config';
import type { Candidate } from '../types';
import { truncate } from '../lib/utils';

interface GithubRepo {
  full_name: string;
  html_url: string;
  description: string | null;
  stargazers_count: number;
  pushed_at: string;
  owner: { login: string };
}

export function normalizeGithub(repos: GithubRepo[]): Candidate[] {
  return repos
    .filter((r) => r.description)
    .map((r) => ({
      title: `${r.full_name}: ${r.description}`,
      url: r.html_url,
      platform: 'github' as const,
      author: r.owner.login,
      postedAt: r.pushed_at,
      excerpt: truncate(r.description ?? '', 1500),
      stats: { points: r.stargazers_count },
    }));
}

export async function fetchGithub(opts: { backfill: boolean }): Promise<Candidate[]> {
  const results: Candidate[] = [];
  const headers: Record<string, string> = {
    'User-Agent': USER_AGENT,
    Accept: 'application/vnd.github+json',
  };
  if (process.env.GITHUB_TOKEN) headers.Authorization = `Bearer ${process.env.GITHUB_TOKEN}`;
  const page = opts.backfill ? ((opts as { page?: number }).page ?? 0) + 1 : 1;
  for (const query of GITHUB_QUERIES) {
    const q = `${query} in:name,description,readme stars:>${opts.backfill ? 100 : 20}`;
    const url = `https://api.github.com/search/repositories?q=${encodeURIComponent(q)}&sort=stars&per_page=${opts.backfill ? 20 : 8}&page=${page}`;
    const res = await fetch(url, { headers });
    if (!res.ok) throw new Error(`GitHub search ${res.status}`);
    const data = (await res.json()) as { items: GithubRepo[] };
    results.push(...normalizeGithub(data.items ?? []));
  }
  return results;
}
