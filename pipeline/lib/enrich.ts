import { USER_AGENT } from '../sources.config';
import type { Candidate } from '../types';
import { truncate } from './utils';

/**
 * Candidates with thin excerpts (e.g. HN stories that only link out) get
 * scored on their title alone — wasteful and inaccurate. Before scoring,
 * fetch the underlying article and append its text to the excerpt.
 */
const MIN_EXCERPT_CHARS = 300;

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

export async function enrichCandidate(c: Candidate): Promise<Candidate> {
  const target = enrichmentTarget(c);
  if (!target) return c;
  try {
    const res = await fetch(target, {
      headers: { 'User-Agent': USER_AGENT },
      signal: AbortSignal.timeout(15_000),
    });
    if (!res.ok) return c;
    const contentType = res.headers.get('content-type') ?? '';
    if (!contentType.includes('html') && !contentType.includes('text')) return c;
    const text = extractText(await res.text());
    if (text.length < 200) return c;
    return { ...c, excerpt: truncate(`${c.excerpt}\n${text}`, 2500) };
  } catch {
    return c; // enrichment is best-effort; scoring proceeds either way
  }
}
