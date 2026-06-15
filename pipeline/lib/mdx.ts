import { compile } from '@mdx-js/mdx';
import remarkGfm from 'remark-gfm';
import { z } from 'astro/zod';
import { PRICING, workflowSchema, type Workflow } from '../../src/lib/workflow-schema';
import type { Candidate, ScoreResult } from '../types';

/** Shape Gemini returns from the drafting prompt. */
export const draftOutputSchema = z.object({
  frontmatter: z.object({
    title: z.string(),
    description: z.string(),
    category: z.string(),
    difficulty: z.string(),
    timeMinutes: z.number(),
    jobToBeDone: z.string(),
    tools: z.array(
      z.object({ name: z.string(), url: z.string(), pricing: z.enum(PRICING) })
    ),
    nigeriaNotes: z.string().nullable(),
  }),
  body: z.string().min(200),
});
export type DraftOutput = z.infer<typeof draftOutputSchema>;

/**
 * Merges model output with code-owned fields and validates against the real
 * content schema. Throws ZodError on failure (caller retries once).
 */
export function validateDraft(raw: unknown, candidate: Candidate, score: ScoreResult): {
  workflow: Workflow;
  body: string;
} {
  const draft = draftOutputSchema.parse(raw);
  const workflow = workflowSchema.parse({
    ...draft.frontmatter,
    nigeriaNotes: draft.frontmatter.nigeriaNotes ?? undefined,
    tools: draft.frontmatter.tools.map((t) => ({ ...t, affiliateUrl: '' })),
    badge: 'sourced',
    source: {
      url: candidate.url,
      platform: candidate.platform,
      author: candidate.author,
      postedAt: candidate.postedAt,
    },
    score: score.score,
    ingestedAt: new Date(),
    tiktokUrl: '',
    published: true,
  });
  return { workflow, body: draft.body };
}

function yStr(s: string): string {
  return `"${s.replace(/\\/g, '\\\\').replace(/"/g, '\\"').replace(/\r?\n/g, ' ')}"`;
}

function yDate(d: Date): string {
  return d.toISOString().slice(0, 10);
}

/**
 * LLM prose sometimes contains bare `<placeholder>` tags or `{tokens}` that MDX
 * parses as JSX and crashes the whole build on. We escape `<` and `{` in prose
 * only, leaving fenced code blocks and inline-code spans untouched (angle
 * brackets and braces are valid and wanted there). Defense in depth so a single
 * bad draft can never take down the deploy again.
 */
export function escapeMdxBody(body: string): string {
  let inFence = false;
  return body
    .split('\n')
    .map((line) => {
      if (/^\s*(```|~~~)/.test(line)) {
        inFence = !inFence;
        return line;
      }
      if (inFence) return line;
      return line
        .split(/(`[^`]*`)/) // keep inline-code spans verbatim
        .map((part) =>
          part.startsWith('`')
            ? part
            : part.replace(/<(?=[a-zA-Z/])/g, '\\<').replace(/\{/g, '\\{')
        )
        .join('');
    })
    .join('\n');
}

/**
 * Compiles the prose body through the same MDX core (`@mdx-js/mdx` + remark-gfm)
 * that Astro's build uses, so we catch build-breaking content — bare JSX-looking
 * `<tags>` and stray `export`/`import` lines leaking out of mis-indented code
 * fences — BEFORE a file is published into the built `workflows/` collection.
 *
 * `escapeMdxBody` is a best-effort, line-based pass and can't perfectly model how
 * the real parser decides where code blocks start and end (indented fences inside
 * lists, mismatched fence indentation). This actually parses the content, so it
 * is the authoritative guard: anything it rejects would also fail `astro build`.
 * Frontmatter is YAML handled separately by Astro, so only the body is compiled.
 */
export async function bodyCompiles(
  body: string
): Promise<{ ok: true } | { ok: false; error: string }> {
  try {
    await compile(escapeMdxBody(body), { remarkPlugins: [remarkGfm] });
    return { ok: true };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : String(err) };
  }
}

/** Serializes a validated workflow to an MDX file with YAML frontmatter. */
export function toMdx(w: Workflow, body: string): string {
  const lines = [
    '---',
    `title: ${yStr(w.title)}`,
    `description: ${yStr(w.description)}`,
    `category: "${w.category}"`,
    `badge: "${w.badge}"`,
    `difficulty: "${w.difficulty}"`,
    `timeMinutes: ${w.timeMinutes}`,
    `jobToBeDone: ${yStr(w.jobToBeDone)}`,
    'tools:',
    ...w.tools.flatMap((t) => [
      `  - name: ${yStr(t.name)}`,
      `    url: ${yStr(t.url)}`,
      `    pricing: "${t.pricing}"`,
      `    affiliateUrl: ${yStr(t.affiliateUrl)}`,
    ]),
    'source:',
    `  url: ${yStr(w.source.url)}`,
    `  platform: "${w.source.platform}"`,
    `  author: ${yStr(w.source.author)}`,
    `  postedAt: ${yDate(w.source.postedAt)}`,
    `score: ${w.score}`,
    `ingestedAt: ${yDate(w.ingestedAt)}`,
    ...(w.nigeriaNotes ? [`nigeriaNotes: ${yStr(w.nigeriaNotes)}`] : []),
    `tiktokUrl: ${yStr(w.tiktokUrl)}`,
    `published: ${w.published}`,
    '---',
    '',
    escapeMdxBody(body).trim(),
    '',
  ];
  return lines.join('\n');
}
