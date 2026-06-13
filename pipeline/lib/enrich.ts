import { USER_AGENT } from '../sources.config';
import type { Candidate } from '../types';
import { truncate } from './utils';

/**
 * Candidates with thin excerpts (e.g. HN stories that only link out, or Reddit
 * RSS summaries) get scored on almost nothing — wasteful and inaccurate, and it
 * caps their score because the model can't see the actual steps/prompts. Before
 * scoring we pull richer source text: the underlying article, or — for Reddit —
 * the post body PLUS top comments, where the real recipe usually lives.
 */
const MIN_EXCERPT_CHARS = 500;
const MAX_EXCERPT_CHARS = 4000;

export function extractText(html: string): string {
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style[\s\S]*?<\/style>/gi, ' ')
    .replace(/<nav[\s\S]*?<\/nav>/gi, ' ')
    .replace(/<header[\s\S]*?<\/header>/gi, ' ')
    .replace(/<footer[\s\S]*?<\/footer>/gi, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&[a-z#0-9]+;/gi, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

/** URL worth fetching for more context, or null when the excerpt is rich enough. */
export function enrichmentTarget(c: Candidate): string | null {
  if (c.excerpt.length >= MIN_EXCERPT_CHARS) return null;
  // HN candidates carry the external article as "Links to: <url>".
  const linked = c.excerpt.match(/^Links to:\s+(\S+)/);
  return linked ? linked[1] : c.url;
}

/** Fetches an article and returns its readable text, or null on any failure. */
async function fetchArticleText(url: string): Promise<string | null> {
  try {
    const res = await fetch(url, {
      headers: { 'User-Agent': USER_AGENT },
      signal: AbortSignal.timeout(15_000),
    });
    if (!res.ok) return null;
    const contentType = res.headers.get('content-type') ?? '';
    if (!contentType.includes('html') && !contentType.includes('text')) return null;
    const text = extractText(await res.text());
    return text.length >= 200 ? text : null;
  } catch {
    return null;
  }
}

/**
 * Pulls the post body + top comments from Reddit's JSON. On Reddit the actual
 * step-by-step recipe is frequently in the comments (or the full self-text the
 * RSS summary truncates), so this is what lifts good posts to a real score.
 */
async function fetchRedditThread(url: string): Promise<string | null> {
  try {
    const jsonUrl = `${url.replace(/\/$/, '')}/.json?limit=20&raw_json=1`;
    const res = await fetch(jsonUrl, {
      headers: { 'User-Agent': USER_AGENT },
      signal: AbortSignal.timeout(15_000),
    });
    if (!res.ok) return null;
    const data = (await res.json()) as Array<{ data?: { children?: any[] } }>;
    const post = data?.[0]?.data?.children?.[0]?.data;
    const comments = data?.[1]?.data?.children ?? [];
    const parts: string[] = [];
    if (post?.selftext) parts.push(String(post.selftext));
    let taken = 0;
    for (const ch of comments) {
      if (ch?.kind !== 't1' || ch?.data?.stickied || !ch?.data?.body) continue;
      parts.push(`Comment by u/${ch.data.author}: ${ch.data.body}`);
      if (++taken >= 8) break;
    }
    const text = parts.join('\n\n').trim();
    return text.length >= 100 ? text : null;
  } catch {
    return null;
  }
}

export async function enrichCandidate(c: Candidate): Promise<Candidate> {
  const target = enrichmentTarget(c);
  if (!target) return c;
  // Reddit threads carry the recipe in comments; everything else is an article.
  const extra =
    (c.platform === 'reddit' ? await fetchRedditThread(c.url) : null) ??
    (await fetchArticleText(target));
  if (!extra) return c; // enrichment is best-effort; scoring proceeds either way
  return { ...c, excerpt: truncate(`${c.excerpt}\n${extra}`, MAX_EXCERPT_CHARS) };
}
