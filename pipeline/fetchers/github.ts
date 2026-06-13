import { DAILY, GITHUB_QUERIES, USER_AGENT } from '../sources.config';
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

export async function fetchGithub(opts: { backfill: boolean; page?: number }): Promise<Candidate[]> {
  const results: Candidate[] = [];
  const headers: Record<string, string> = {
    'User-Agent': USER_AGENT,
    Accept: 'application/vnd.github+json',
  };
  if (process.env.GITHUB_TOKEN) headers.Authorization = `Bearer ${process.env.GITHUB_TOKEN}`;
  // GitHub search pages are 1-indexed; the rotating offset starts at 0.
  const page = (opts.page ?? 0) + 1;
  for (const query of GITHUB_QUERIES) {
    const minStars = opts.backfill ? 100 : DAILY.githubMinStars;
    const perPage = opts.backfill ? 20 : DAILY.githubPerPage;
    const q = `${query} in:name,description,readme stars:>${minStars}`;
    const url = `https://api.github.com/search/repositories?q=${encodeURIComponent(q)}&sort=stars&per_page=${perPage}&page=${page}`;
    const res = await fetch(url, { headers });
    if (!res.ok) throw new Error(`GitHub search ${res.status}`);
    const data = (await res.json()) as { items: GithubRepo[] };
    results.push(...normalizeGithub(data.items ?? []));
  }
  return results;
}
