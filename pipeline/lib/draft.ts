import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import type { Candidate, ScoreResult } from '../types';
import { geminiJson } from './gemini';
import { toMdx, validateDraft } from './mdx';
import { slugify } from './utils';

let template: string | null = null;

export function buildDraftPrompt(c: Candidate, s: ScoreResult, promptDir?: string): string {
  if (template === null) {
    template = readFileSync(join(promptDir ?? join(process.cwd(), 'pipeline/prompts'), 'draft.md'), 'utf8');
  }
  return template
    .replace('{{TITLE}}', c.title)
    .replace('{{PLATFORM}}', c.platform)
    .replace('{{AUTHOR}}', c.author)
    .replace('{{POSTED_AT}}', c.postedAt)
    .replace('{{CATEGORY}}', s.category)
    .replace('{{JOB_TO_BE_DONE}}', s.jobToBeDone)
    .replace('{{TOOLS_MENTIONED}}', s.toolsMentioned.join(', '))
    .replace('{{EXCERPT}}', c.excerpt || '(no excerpt available)');
}

/**
 * Drafts the full MDX for a scored candidate. One retry with the validation
 * errors appended (PRD Stage 4); null when both attempts fail.
 *
 * Use cases are deliberately NOT generated here: they're filled by the
 * pipeline:usecases top-up step that runs after every ingest. Keeping that extra
 * Gemini call off the publish path means a tight daily quota is spent scoring and
 * drafting (i.e. publishing) candidates first — never on use cases for an
 * already-decided publish — so quota exhaustion can't quietly suppress publishes.
 * New workflows ship with `nigeriaUseCases: []` and the top-up backfills them.
 */
export async function draftWorkflow(
  c: Candidate,
  s: ScoreResult,
  log: (msg: string) => void = console.warn
): Promise<{ slug: string; mdx: string } | null> {
  const basePrompt = buildDraftPrompt(c, s);
  let prompt = basePrompt;
  for (let attempt = 0; attempt < 2; attempt++) {
    try {
      const raw = await geminiJson<unknown>(prompt);
      const { workflow, body } = validateDraft(raw, c, s);
      return { slug: slugify(workflow.title), mdx: toMdx(workflow, body) };
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      log(`[draft] attempt ${attempt + 1} failed for "${c.title}": ${message.slice(0, 300)}`);
      prompt = `${basePrompt}\n\n## Your previous attempt failed validation\n\nFix these issues and return the corrected JSON:\n${message.slice(0, 800)}`;
    }
  }
  return null;
}
