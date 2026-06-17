import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { PERSONAS, useCaseSchema, type UseCase } from '../../src/lib/workflow-schema';
import { geminiJson, GeminiQuotaError } from './gemini';

export interface UseCaseInput {
  title: string;
  category: string;
  jobToBeDone: string;
  body: string;
}

let template: string | null = null;

export function buildUseCasesPrompt(input: UseCaseInput, promptDir?: string): string {
  if (template === null) {
    template = readFileSync(
      join(promptDir ?? join(process.cwd(), 'pipeline/prompts'), 'usecases.md'),
      'utf8'
    );
  }
  return template
    .replace('{{TITLE}}', input.title)
    .replace('{{CATEGORY}}', input.category)
    .replace('{{JOB_TO_BE_DONE}}', input.jobToBeDone)
    .replace('{{BODY}}', input.body.slice(0, 4000));
}

const PERSONA_SET = new Set<string>(PERSONAS);

/**
 * Drops anything the model got wrong: unknown personas, missing/short scenarios,
 * duplicate personas. Trims and caps each scenario to 240 chars and the whole
 * list to 3. This is the backstop that lets the prompt's enum be advisory while
 * the schema stays the source of truth.
 */
export function sanitizeUseCases(raw: unknown): UseCase[] {
  const list = (raw as { useCases?: unknown } | null)?.useCases;
  if (!Array.isArray(list)) return [];
  const out: UseCase[] = [];
  const seen = new Set<string>();
  for (const item of list) {
    if (!item || typeof item !== 'object') continue;
    const persona = (item as Record<string, unknown>).persona;
    const rawScenario = (item as Record<string, unknown>).scenario;
    if (typeof persona !== 'string' || typeof rawScenario !== 'string') continue;
    if (!PERSONA_SET.has(persona) || seen.has(persona)) continue;
    const scenario = rawScenario.trim().replace(/\s+/g, ' ').slice(0, 240);
    const parsed = useCaseSchema.safeParse({ persona, scenario });
    if (!parsed.success) continue;
    seen.add(persona);
    out.push(parsed.data);
    if (out.length >= 3) break;
  }
  return out;
}

export interface GenerateOpts {
  log?: (msg: string) => void;
  /**
   * When true, a `GeminiQuotaError` propagates instead of being swallowed, so a
   * batch caller (the backfill) can stop cleanly rather than slowly retrying the
   * exhausted quota on every remaining file. The daily pipeline leaves this off
   * so use cases stay fully non-fatal on the publish path.
   */
  rethrowQuota?: boolean;
}

/**
 * Generates persona use cases for a workflow. NON-FATAL by default: swallows
 * every error (including quota) and returns [] so use cases can never block a
 * publish or abort a run. Callers treat [] as "none yet" — the backfill top-up
 * retries on a later day.
 */
export async function generateUseCases(
  input: UseCaseInput,
  opts: GenerateOpts = {}
): Promise<UseCase[]> {
  const log = opts.log ?? console.warn;
  try {
    const raw = await geminiJson<unknown>(buildUseCasesPrompt(input));
    return sanitizeUseCases(raw);
  } catch (err) {
    if (opts.rethrowQuota && err instanceof GeminiQuotaError) throw err;
    const msg = err instanceof Error ? err.message : String(err);
    log(`[usecases] generation failed for "${input.title}": ${msg.slice(0, 200)}`);
    return [];
  }
}
