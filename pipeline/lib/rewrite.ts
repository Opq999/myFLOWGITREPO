import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { DIFFICULTIES } from '../../src/lib/workflow-schema';
import { geminiJson, GeminiQuotaError } from './gemini';

export interface RewriteInput {
  title: string;
  category: string;
  difficulty: string;
  jobToBeDone: string;
  tools: string;
  nigeriaNotes: string;
  body: string;
}

export interface RewriteResult {
  mode: 'recipe' | 'concept';
  difficulty: string;
  body: string;
}

let template: string | null = null;

export function buildRewritePrompt(input: RewriteInput, promptDir?: string): string {
  if (template === null) {
    template = readFileSync(
      join(promptDir ?? join(process.cwd(), 'pipeline/prompts'), 'rewrite.md'),
      'utf8'
    );
  }
  // Function replacers so a `$` in body/notes can't be read as a replacement pattern.
  return template
    .replace('{{TITLE}}', () => input.title)
    .replace('{{CATEGORY}}', () => input.category)
    .replace('{{DIFFICULTY}}', () => input.difficulty)
    .replace('{{JOB_TO_BE_DONE}}', () => input.jobToBeDone)
    .replace('{{TOOLS}}', () => input.tools || '(none listed)')
    .replace('{{NIGERIA_NOTES}}', () => input.nigeriaNotes || '(none)')
    .replace('{{BODY}}', () => input.body.slice(0, 6000));
}

const DIFFICULTY_SET = new Set<string>(DIFFICULTIES);
const MIN_BODY_CHARS = 200;

/**
 * Validates the model output. Returns null (caller skips the file, leaving the
 * original untouched) unless the body is a real, substantial markdown string.
 * Falls back to the current difficulty when the model omits or mangles it, and
 * to recipe mode when `mode` is missing, so a partial response never corrupts a
 * file. The body itself is still run through the MDX compiler by the caller
 * before anything is written, so this only needs to gate on plausibility.
 */
export function sanitizeRewrite(raw: unknown, currentDifficulty: string): RewriteResult | null {
  if (!raw || typeof raw !== 'object') return null;
  const r = raw as Record<string, unknown>;
  const body = typeof r.body === 'string' ? r.body.trim() : '';
  if (body.length < MIN_BODY_CHARS) return null;
  if (!/^##\s/m.test(body)) return null; // must contain the H2 section structure

  const difficulty =
    typeof r.difficulty === 'string' && DIFFICULTY_SET.has(r.difficulty)
      ? r.difficulty
      : currentDifficulty;
  const mode = r.mode === 'concept' ? 'concept' : 'recipe';
  return { mode, difficulty, body };
}

export interface GenerateRewriteOpts {
  log?: (msg: string) => void;
  /** When true, a GeminiQuotaError propagates so the batch caller can stop cleanly. */
  rethrowQuota?: boolean;
}

/**
 * Produces a clarity-rewritten body + honest difficulty for one existing entry.
 * Returns null on any failure (the caller then leaves the original file as-is),
 * except that a quota error is rethrown when `rethrowQuota` is set so the batch
 * can halt and resume on a later day instead of burning retries.
 */
export async function generateRewrite(
  input: RewriteInput,
  opts: GenerateRewriteOpts = {}
): Promise<RewriteResult | null> {
  const log = opts.log ?? console.warn;
  try {
    const raw = await geminiJson<unknown>(buildRewritePrompt(input));
    return sanitizeRewrite(raw, input.difficulty);
  } catch (err) {
    if (opts.rethrowQuota && err instanceof GeminiQuotaError) throw err;
    const msg = err instanceof Error ? err.message : String(err);
    log(`[rewrite] generation failed for "${input.title}": ${msg.slice(0, 200)}`);
    return null;
  }
}
