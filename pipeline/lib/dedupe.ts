import { readFileSync, readdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import type { Candidate } from '../types';
import { normalizeUrl, sha256, titleSimilarity } from './utils';

export interface SeenLedger {
  version: 1;
  /** hash of normalized URL → metadata for debuggability */
  seen: Record<string, { url: string; date: string }>;
}

export function loadSeen(path: string): SeenLedger {
  try {
    return JSON.parse(readFileSync(path, 'utf8')) as SeenLedger;
  } catch {
    return { version: 1, seen: {} };
  }
}

export function saveSeen(path: string, ledger: SeenLedger): void {
  writeFileSync(path, JSON.stringify(ledger, null, 2) + '\n', 'utf8');
}

export function markSeen(ledger: SeenLedger, url: string): void {
  ledger.seen[sha256(normalizeUrl(url))] = {
    url: normalizeUrl(url),
    date: new Date().toISOString().slice(0, 10),
  };
}

/** Frontmatter titles of all existing workflows + drafts, for fuzzy matching. */
export function getExistingTitles(contentDirs: string[]): string[] {
  const titles: string[] = [];
  for (const dir of contentDirs) {
    let files: string[] = [];
    try {
      files = readdirSync(dir).filter((f) => f.endsWith('.mdx'));
    } catch {
      continue;
    }
    for (const file of files) {
      const text = readFileSync(join(dir, file), 'utf8');
      const m = text.match(/^title:\s*["']?(.+?)["']?\s*$/m);
      if (m) titles.push(m[1]);
    }
  }
  return titles;
}

const SIMILARITY_THRESHOLD = 0.85;

/**
 * Drops candidates whose URL was already seen, or whose title is a near-match
 * of an existing workflow or an earlier candidate in this batch.
 */
export function dedupe(
  candidates: Candidate[],
  ledger: SeenLedger,
  existingTitles: string[]
): Candidate[] {
  const kept: Candidate[] = [];
  const keptTitles: string[] = [];
  for (const c of candidates) {
    const hash = sha256(normalizeUrl(c.url));
    if (ledger.seen[hash]) continue;
    const allTitles = [...existingTitles, ...keptTitles];
    if (allTitles.some((t) => titleSimilarity(t, c.title) >= SIMILARITY_THRESHOLD)) continue;
    kept.push(c);
    keptTitles.push(c.title);
  }
  return kept;
}
