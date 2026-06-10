import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { z } from 'astro/zod';
import { CATEGORIES } from '../../src/lib/workflow-schema';
import type { Candidate, ScoreResult } from '../types';
import { geminiJson } from './gemini';

const scoreResultSchema = z.object({
  isWorkflow: z.boolean(),
  score: z.number().min(0).max(10),
  jobToBeDone: z.string(),
  category: z.enum(CATEGORIES),
  toolsMentioned: z.array(z.string()),
  freeTierViable: z.boolean(),
  reason: z.string(),
});

let template: string | null = null;

export function buildScorePrompt(c: Candidate, promptDir?: string): string {
  if (template === null) {
    template = readFileSync(join(promptDir ?? join(process.cwd(), 'pipeline/prompts'), 'score.md'), 'utf8');
  }
  return template
    .replace('{{TITLE}}', c.title)
    .replace('{{PLATFORM}}', c.platform)
    .replace('{{AUTHOR}}', c.author)
    .replace('{{POSTED_AT}}', c.postedAt)
    .replace('{{STATS}}', JSON.stringify(c.stats))
    .replace('{{EXCERPT}}', c.excerpt || '(no excerpt available)');
}

/** Validates the raw model output; junk category/score → treated as non-workflow. */
export function validateScoreResult(raw: unknown): ScoreResult {
  const parsed = scoreResultSchema.safeParse(raw);
  if (!parsed.success) {
    return {
      isWorkflow: false,
      score: 0,
      jobToBeDone: '',
      category: 'coding',
      toolsMentioned: [],
      freeTierViable: false,
      reason: `Invalid score JSON: ${parsed.error.issues[0]?.message ?? 'unknown'}`,
    };
  }
  return { ...parsed.data, score: Math.round(parsed.data.score) };
}

export async function scoreCandidate(c: Candidate): Promise<ScoreResult> {
  const raw = await geminiJson<unknown>(buildScorePrompt(c));
  return validateScoreResult(raw);
}
