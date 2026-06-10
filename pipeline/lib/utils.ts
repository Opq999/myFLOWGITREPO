import { createHash } from 'node:crypto';

/** URL-safe slug from a title; ≤ 80 chars, no leading/trailing hyphens. */
export function slugify(title: string): string {
  return title
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[^\w\s-]/g, '')
    .trim()
    .replace(/[\s_]+/g, '-')
    .replace(/-+/g, '-')
    .slice(0, 80)
    .replace(/^-+|-+$/g, '');
}

export function sha256(s: string): string {
  return createHash('sha256').update(s).digest('hex');
}

/** Canonical form for dedupe: strips hash, tracking params, trailing slash. */
export function normalizeUrl(raw: string): string {
  try {
    const u = new URL(raw);
    u.hash = '';
    const params = new URLSearchParams();
    for (const [k, v] of u.searchParams) {
      if (!/^(utm_|ref$|ref_|fbclid|gclid|igshid|si$)/i.test(k)) params.append(k, v);
    }
    u.search = params.toString();
    let s = `${u.protocol}//${u.host.toLowerCase()}${u.pathname}`;
    if (s.endsWith('/')) s = s.slice(0, -1);
    return u.search ? `${s}?${u.searchParams.toString()}` : s;
  } catch {
    return raw.trim();
  }
}

/** Bigram Dice coefficient, 0..1 — for fuzzy near-duplicate titles. */
export function titleSimilarity(a: string, b: string): number {
  const clean = (s: string) =>
    s
      .toLowerCase()
      .replace(/[^a-z0-9\s]/g, '')
      .replace(/\s+/g, ' ')
      .trim();
  const x = clean(a);
  const y = clean(b);
  if (!x || !y) return 0;
  if (x === y) return 1;
  const bigrams = (s: string) => {
    const map = new Map<string, number>();
    for (let i = 0; i < s.length - 1; i++) {
      const bg = s.slice(i, i + 2);
      map.set(bg, (map.get(bg) ?? 0) + 1);
    }
    return map;
  };
  const bx = bigrams(x);
  const by = bigrams(y);
  let overlap = 0;
  for (const [bg, count] of bx) overlap += Math.min(count, by.get(bg) ?? 0);
  return (2 * overlap) / (x.length - 1 + (y.length - 1));
}

export function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export function truncate(s: string, n: number): string {
  return s.length <= n ? s : `${s.slice(0, n - 1)}…`;
}

/** Months between a date string and now; Infinity when unparseable. */
export function ageInMonths(iso: string): number {
  const t = Date.parse(iso);
  if (Number.isNaN(t)) return Infinity;
  return (Date.now() - t) / (30.44 * 24 * 60 * 60 * 1000);
}
