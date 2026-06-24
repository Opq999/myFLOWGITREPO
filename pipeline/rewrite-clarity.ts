/**
 * Clarity backfill: rewrites the BODY of published workflows so a non-technical
 * beginner can follow them. Each entry is re-judged as a reproducible "recipe"
 * (concrete steps, jargon explained) or, when reproduction is genuinely out of
 * reach, a "concept" entry (honest framing + what it's good for). It also fixes
 * a dishonest `difficulty` (e.g. a fine-tuning workflow mislabelled "beginner").
 *
 * Safety:
 *   - Idempotent: stamps `revisedAt:` into the frontmatter and skips any file
 *     that already has it. Re-run anytime to finish where a previous run stopped.
 *   - Build-safe: every rewritten body is run through the same MDX compiler the
 *     site build uses BEFORE it is written. A body that won't compile is skipped,
 *     leaving the original file untouched, so the backfill can never break a deploy.
 *   - Quota-safe: stops cleanly when the Gemini free-tier quota is spent.
 *   - Never changes title (the slug/filename), description, tools, or source.
 *
 *   npm run pipeline:rewrite            # process every un-revised published file
 *   npm run pipeline:rewrite -- --limit 3   # only the first 3 (sample run)
 *   npm run pipeline:rewrite -- --slug fine-tune   # only files whose name matches
 */
import { readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { GeminiQuotaError } from './lib/gemini';
import { escapeMdxBody, findMdxCompileError, normalizeFenceIndent } from './lib/mdx';
import { generateRewrite } from './lib/rewrite';

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

/** Collects the tool names out of the frontmatter `tools:` block. */
function fmToolNames(fm: string): string {
  const names: string[] = [];
  for (const m of fm.matchAll(/^\s*-\s*name:\s*(.+)$/gm)) {
    let v = m[1].trim();
    if (v.startsWith('"') && v.endsWith('"')) v = v.slice(1, -1).replace(/\\"/g, '"');
    if (v) names.push(v);
  }
  return names.join(', ');
}

function parseArgs(argv: string[]): { limit: number; slug: string } {
  let limit = Infinity;
  let slug = '';
  for (let i = 0; i < argv.length; i++) {
    if (argv[i] === '--limit') limit = Number(argv[++i]) || Infinity;
    else if (argv[i] === '--slug') slug = (argv[++i] ?? '').toLowerCase();
  }
  return { limit, slug };
}

async function main(): Promise<void> {
  const { limit, slug } = parseArgs(process.argv.slice(2));
  const files = readdirSync(WORKFLOWS_DIR)
    .filter((f) => f.endsWith('.mdx'))
    .filter((f) => !slug || f.toLowerCase().includes(slug));

  let revised = 0;
  let already = 0;
  let skipped = 0;
  let invalid = 0;

  for (const file of files) {
    if (revised >= limit) break;
    const path = join(WORKFLOWS_DIR, file);
    const content = readFileSync(path, 'utf8');
    const eol = content.includes('\r\n') ? '\r\n' : '\n';

    const m = content.match(FRONTMATTER_RE);
    if (!m) {
      console.warn(`[rewrite] ${file}: no frontmatter block, skipping`);
      continue;
    }
    const [, fm, body] = m;

    if (/^revisedAt:/m.test(fm)) {
      already++;
      continue; // already rewritten, idempotent
    }

    const input = {
      title: fmField(fm, 'title'),
      category: fmField(fm, 'category'),
      difficulty: fmField(fm, 'difficulty'),
      jobToBeDone: fmField(fm, 'jobToBeDone'),
      tools: fmToolNames(fm),
      nigeriaNotes: fmField(fm, 'nigeriaNotes'),
      body,
    };
    if (!input.title) {
      console.warn(`[rewrite] ${file}: could not read title, skipping`);
      continue;
    }

    let result;
    try {
      result = await generateRewrite(input, { rethrowQuota: true });
    } catch (err) {
      if (err instanceof GeminiQuotaError) {
        console.warn('[rewrite] Gemini quota exhausted, stopping. Re-run later to finish the rest.');
        break;
      }
      throw err;
    }

    if (!result) {
      skipped++;
      console.warn(`[rewrite] ${file}: no usable rewrite produced, leaving original`);
      continue;
    }

    // Clean the body the same way toMdx does, then reassemble the file: same
    // frontmatter, but with an honest difficulty and a revisedAt stamp spliced in.
    const newBody = escapeMdxBody(normalizeFenceIndent(result.body)).trim().split('\n').join(eol);

    let newFm = fm.replace(/^difficulty:\s*.*$/m, () => `difficulty: "${result.difficulty}"`);
    const stamp = `revisedAt: ${new Date().toISOString().slice(0, 10)}`;
    if (/^tiktokUrl:/m.test(newFm)) {
      newFm = newFm.replace(/^tiktokUrl:/m, () => `${stamp}${eol}tiktokUrl:`);
    } else if (/^published:/m.test(newFm)) {
      newFm = newFm.replace(/^published:/m, () => `${stamp}${eol}published:`);
    } else {
      newFm = `${newFm}${eol}${stamp}`;
    }

    const out = `---${eol}${newFm}${eol}---${eol}${eol}${newBody}${eol}`;

    // Last line of defence: never write a body the site build can't compile.
    const compileError = await findMdxCompileError(out);
    if (compileError) {
      invalid++;
      console.warn(`[rewrite] ${file}: rewrite would not compile, leaving original (${compileError.slice(0, 120)})`);
      continue;
    }

    writeFileSync(path, out, 'utf8');
    revised++;
    const changed = result.difficulty !== input.difficulty ? ` difficulty ${input.difficulty} -> ${result.difficulty}` : '';
    console.log(`[rewrite] ${file}: ${result.mode}${changed}`);
  }

  console.log(
    `\n[rewrite] done, revised ${revised}, already done ${already}, no-output ${skipped}, won't-compile ${invalid}, of ${files.length} files.`
  );
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
