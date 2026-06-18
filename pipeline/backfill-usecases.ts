/**
 * Idempotent top-up: fills `nigeriaUseCases` into any published workflow that
 * lacks it. Safe to re-run anytime, it skips files that already have use cases,
 * and stops cleanly when the Gemini free-tier quota is spent (re-run later to
 * finish the rest). It splices the YAML into the frontmatter only and never
 * touches the MDX body, so it can't introduce a build-breaking body regression.
 *
 *   npm run pipeline:usecases
 */
import { readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { GeminiQuotaError } from './lib/gemini';
import { serializeUseCases } from './lib/mdx';
import { generateUseCases } from './lib/usecases';

const ROOT = process.cwd();
const WORKFLOWS_DIR = join(ROOT, 'src', 'content', 'workflows');

/** Splits an MDX file into its YAML frontmatter and body (tolerant of CRLF). */
const FRONTMATTER_RE = /^---\r?\n([\s\S]*?)\r?\n---\r?\n([\s\S]*)$/;

/** Reads a top-level quoted string field out of the frontmatter text. */
function fmField(fm: string, key: string): string {
  const m = fm.match(new RegExp(`^${key}:\\s*(.+)$`, 'm'));
  if (!m) return '';
  let v = m[1].trim();
  if (v.startsWith('"') && v.endsWith('"')) {
    v = v.slice(1, -1).replace(/\\"/g, '"').replace(/\\\\/g, '\\');
  }
  return v;
}

async function main(): Promise<void> {
  const files = readdirSync(WORKFLOWS_DIR).filter((f) => f.endsWith('.mdx'));
  let filled = 0;
  let already = 0;
  let empty = 0;

  for (const file of files) {
    const path = join(WORKFLOWS_DIR, file);
    const content = readFileSync(path, 'utf8');
    const eol = content.includes('\r\n') ? '\r\n' : '\n';

    const m = content.match(FRONTMATTER_RE);
    if (!m) {
      console.warn(`[backfill] ${file}: no frontmatter block, skipping`);
      continue;
    }
    const [, fm, body] = m;

    if (/^nigeriaUseCases:/m.test(fm)) {
      already++;
      continue; // already populated, idempotent
    }

    const input = {
      title: fmField(fm, 'title'),
      category: fmField(fm, 'category'),
      jobToBeDone: fmField(fm, 'jobToBeDone'),
      body,
    };
    if (!input.title) {
      console.warn(`[backfill] ${file}: could not read title, skipping`);
      continue;
    }

    let cases;
    try {
      cases = await generateUseCases(input, { rethrowQuota: true });
    } catch (err) {
      if (err instanceof GeminiQuotaError) {
        console.warn('[backfill] Gemini quota exhausted, stopping. Re-run later to finish the rest.');
        break;
      }
      throw err;
    }

    if (cases.length === 0) {
      empty++;
      console.warn(`[backfill] ${file}: no use cases produced, leaving for a later run`);
      continue;
    }

    // Splice the block in before `tiktokUrl:` (function replacer so a `$` in a
    // scenario can't be read as a replacement pattern). Fall back to `published:`.
    const block = serializeUseCases(cases).join(eol);
    let newFm = fm;
    if (/^tiktokUrl:/m.test(fm)) {
      newFm = fm.replace(/^tiktokUrl:/m, () => `${block}${eol}tiktokUrl:`);
    } else if (/^published:/m.test(fm)) {
      newFm = fm.replace(/^published:/m, () => `${block}${eol}published:`);
    } else {
      newFm = `${fm}${eol}${block}`;
    }

    writeFileSync(path, `---${eol}${newFm}${eol}---${eol}${body}`, 'utf8');
    filled++;
    console.log(`[backfill] ${file}: +${cases.length} [${cases.map((c) => c.persona).join(', ')}]`);
  }

  console.log(
    `\n[backfill] done, filled ${filled}, already had ${already}, no-output ${empty}, of ${files.length} files.`
  );
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
