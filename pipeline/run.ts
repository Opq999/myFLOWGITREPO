/**
 * Pipeline orchestrator (PRD section 7).
 *
 *   npx tsx pipeline/run.ts             daily run: score → draft → publish
 *   npx tsx pipeline/run.ts --dry-run   everything goes to src/content/drafts/
 *   npx tsx pipeline/run.ts --backfill  12-month windows for the launch corpus
 *
 * Per-candidate errors are logged and skipped; only fatal config errors
 * (e.g. missing GEMINI_API_KEY) exit non-zero.
 */
import { appendFileSync, existsSync, mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { CAPS, DAILY } from './sources.config';
import type { Candidate, RunOptions } from './types';
import { fetchAll } from './fetchers';
import { dedupe, getExistingTitles, loadSeen, markSeen, saveSeen } from './lib/dedupe';
import { draftWorkflow } from './lib/draft';
import { enrichCandidate } from './lib/enrich';
import { GeminiQuotaError, getApiKeys } from './lib/gemini';
import { scoreCandidate } from './lib/score';

/** Obvious non-workflows dropped before scoring, saves Gemini quota. */
const JUNK_TITLE = /awesome[- ]|a curated list|curated list of|list of (free|awesome)/i;

const ROOT = process.cwd();
const SEEN_PATH = join(ROOT, 'pipeline', 'seen.json');
const LOG_DIR = join(ROOT, 'pipeline', 'logs');
const WORKFLOWS_DIR = join(ROOT, 'src', 'content', 'workflows');
const DRAFTS_DIR = join(ROOT, 'src', 'content', 'drafts');

const logFile = join(LOG_DIR, `run-${new Date().toISOString().slice(0, 10)}.jsonl`);

function logEvent(event: Record<string, unknown>): void {
  mkdirSync(LOG_DIR, { recursive: true });
  appendFileSync(logFile, JSON.stringify({ at: new Date().toISOString(), ...event }) + '\n');
}

function info(msg: string): void {
  console.log(msg);
}

/**
 * Writes a run health summary to the GitHub Actions step summary (visible on
 * every run page) so a silent failure, a dead source, or 0 published, can
 * never hide again. No-op locally where GITHUB_STEP_SUMMARY is unset.
 */
function writeStepSummary(
  opts: RunOptions,
  counts: { scored: number; published: number; drafted: number; discarded: number; failed: number },
  fetched: number,
  fresh: number,
  sourceWarnings: string[]
): void {
  const path = process.env.GITHUB_STEP_SUMMARY;
  if (!path) return;
  const lines = [
    `### ${opts.backfill ? 'Backfill' : 'Daily'} ingest`,
    '',
    '| fetched | fresh | scored | published | drafted | discarded | failed |',
    '|--:|--:|--:|--:|--:|--:|--:|',
    `| ${fetched} | ${fresh} | ${counts.scored} | **${counts.published}** | ${counts.drafted} | ${counts.discarded} | ${counts.failed} |`,
    '',
  ];
  if (sourceWarnings.length) {
    lines.push('**⚠️ Sources that failed to fetch:**', '', ...sourceWarnings.map((w) => `- ${w}`), '');
  }
  if (counts.published === 0) {
    lines.push('> ⚠️ **0 new workflows published this run**: check the source warnings and score reasons above.', '');
  }
  try {
    appendFileSync(path, lines.join('\n') + '\n');
  } catch {
    /* never let reporting break the run */
  }
}

function uniqueSlugPath(dir: string, slug: string): string {
  let path = join(dir, `${slug}.mdx`);
  let n = 2;
  while (existsSync(path)) {
    path = join(dir, `${slug}-${n}.mdx`);
    n++;
  }
  return path;
}

/** Drafts MDX marked unpublished so the drafts collection stays invisible. */
function asUnpublished(mdx: string): string {
  return mdx.replace(/^published: true$/m, 'published: false');
}

async function main(): Promise<void> {
  const opts: RunOptions = {
    dryRun: process.argv.includes('--dry-run'),
    backfill: process.argv.includes('--backfill'),
  };
  info(`Pipeline run, dryRun=${opts.dryRun} backfill=${opts.backfill}`);

  const ledger = loadSeen(SEEN_PATH);
  const existingTitles = getExistingTitles([WORKFLOWS_DIR, DRAFTS_DIR]);

  // Backfill stops itself once the launch corpus target is reached.
  if (opts.backfill) {
    const publishedCount = getExistingTitles([WORKFLOWS_DIR]).length;
    if (publishedCount >= CAPS.backfillTarget) {
      info(`Corpus target reached (${publishedCount} published workflows). Backfill done, nothing to do.`);
      return;
    }
  }

  // Stage 1, fetch. Backfill paginates ever deeper; daily runs rotate a page
  // offset (0..pageCycle-1) so each day reaches NEW posts instead of re-scanning
  // the same page-0 "top of today" results that just dedupe away.
  const page = opts.backfill ? (ledger.backfillPage ?? 0) : (ledger.dailyPage ?? 0);
  info(`[fetch] ${opts.backfill ? 'backfill' : 'daily'} page ${page}`);
  const sourceWarnings: string[] = [];
  const fetched = await fetchAll({ backfill: opts.backfill, page }, (m) => {
    info(m);
    logEvent({ stage: 'fetch', msg: m });
    if (/FAILED/i.test(m)) sourceWarnings.push(m);
  });
  info(`[fetch] total: ${fetched.length} candidates`);

  if (opts.backfill) {
    ledger.backfillPage = page + 1;
  } else {
    ledger.dailyPage = (page + 1) % DAILY.pageCycle;
  }
  saveSeen(SEEN_PATH, ledger);

  // Stage 2, dedupe
  const deduped = dedupe(fetched, ledger, existingTitles);
  info(`[dedupe] ${deduped.length} new candidates (${fetched.length - deduped.length} dropped)`);

  const fresh = deduped.filter((c) => {
    if (!JUNK_TITLE.test(c.title)) return true;
    markSeen(ledger, c.url); // never rescore obvious junk
    return false;
  });
  if (fresh.length < deduped.length) {
    info(`[prefilter] ${deduped.length - fresh.length} obvious non-workflows dropped before scoring`);
  }

  // Round-robin across platforms (each already sorted by engagement) so
  // sources without vote counts (e.g. Reddit RSS) aren't starved by the cap.
  const byPlatform = new Map<string, Candidate[]>();
  for (const c of fresh) {
    const list = byPlatform.get(c.platform) ?? [];
    list.push(c);
    byPlatform.set(c.platform, list);
  }
  for (const list of byPlatform.values()) {
    list.sort((a, b) => (b.stats.points ?? 0) - (a.stats.points ?? 0));
  }
  const toScore: Candidate[] = [];
  while (toScore.length < CAPS.scorePerRun) {
    let added = false;
    for (const list of byPlatform.values()) {
      const next = list.shift();
      if (next && toScore.length < CAPS.scorePerRun) {
        toScore.push(next);
        added = true;
      }
    }
    if (!added) break;
  }

  if (toScore.length === 0) {
    info('Nothing new to score. Done.');
    writeStepSummary(
      opts,
      { scored: 0, published: 0, drafted: 0, discarded: 0, failed: 0 },
      fetched.length,
      fresh.length,
      sourceWarnings
    );
    return;
  }

  if (getApiKeys().length === 0) {
    info(
      `\nFetch + dedupe OK (${toScore.length} candidates ready), but no Gemini key is set.\n` +
        'Create a free key at https://aistudio.google.com, then either:\n' +
        '  - locally: set it in .env / your shell, or\n' +
        '  - CI: add it as a GitHub Actions secret named GEMINI_API_KEY.\n' +
        '  - add more keys (GEMINI_API_KEY_2, _3, …) to raise the free daily quota.'
    );
    process.exit(1);
  }

  // Stage 3 + 4, score then draft
  const counts = { scored: 0, published: 0, drafted: 0, discarded: 0, failed: 0 };
  mkdirSync(WORKFLOWS_DIR, { recursive: true });
  mkdirSync(DRAFTS_DIR, { recursive: true });

  for (const rawCandidate of toScore) {
    const candidate = await enrichCandidate(rawCandidate);
    try {
      const score = await scoreCandidate(candidate);
      counts.scored++;
      markSeen(ledger, candidate.url);
      saveSeen(SEEN_PATH, ledger);
      logEvent({ stage: 'score', url: candidate.url, score: score.score, reason: score.reason });

      if (!score.isWorkflow || score.score < 5) {
        counts.discarded++;
        info(`[discard] ${score.score}/10, ${candidate.title}`);
        continue;
      }

      const result = await draftWorkflow(candidate, score, (m) => logEvent({ stage: 'draft', msg: m }));
      if (!result) {
        counts.failed++;
        logEvent({ stage: 'draft', url: candidate.url, outcome: 'failed-validation-twice' });
        continue;
      }

      const publishable = score.score >= 7 && !opts.dryRun && counts.published < CAPS.publishPerRun;
      if (publishable) {
        writeFileSync(uniqueSlugPath(WORKFLOWS_DIR, result.slug), result.mdx, 'utf8');
        counts.published++;
        info(`[publish] ${score.score}/10, ${result.slug}`);
        logEvent({ stage: 'publish', url: candidate.url, slug: result.slug, score: score.score });
      } else {
        writeFileSync(uniqueSlugPath(DRAFTS_DIR, result.slug), asUnpublished(result.mdx), 'utf8');
        counts.drafted++;
        info(`[draft] ${score.score}/10, ${result.slug}`);
        logEvent({ stage: 'to-drafts', url: candidate.url, slug: result.slug, score: score.score });
      }
    } catch (err) {
      // All free-tier quotas spent: stop scoring, keep everything done so far.
      if (err instanceof GeminiQuotaError) {
        info(`[quota] ${err.message} Stopping this run; the next run picks up fresh quota.`);
        logEvent({ stage: 'quota', msg: err.message });
        break;
      }
      counts.failed++;
      const message = err instanceof Error ? err.message : String(err);
      info(`[error] skipping "${candidate.title}": ${message.slice(0, 200)}`);
      logEvent({ stage: 'error', url: candidate.url, error: message.slice(0, 500) });
      // A missing/invalid API key is fatal, every candidate would fail.
      if (message.includes('GEMINI_API_KEY') || message.includes('Gemini API error 4')) {
        throw err;
      }
    }
  }

  info(
    `\nSummary: fetched=${fetched.length} new=${fresh.length} scored=${counts.scored} ` +
      `published=${counts.published} drafted=${counts.drafted} discarded=${counts.discarded} failed=${counts.failed}`
  );
  writeStepSummary(opts, counts, fetched.length, fresh.length, sourceWarnings);
}

main().catch((err) => {
  console.error(`Fatal: ${err instanceof Error ? err.message : err}`);
  process.exit(1);
});
