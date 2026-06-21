import { z } from 'astro/zod';
import { PRICING, workflowSchema, type UseCase, type Workflow } from '../../src/lib/workflow-schema';
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
 * Serializes the persona use cases to YAML lines (like the `tools` block).
 * Returns [] when there are none so the key is simply omitted. Shared by
 * `toMdx` and the backfill script so the formatting lives in exactly one place.
 */
export function serializeUseCases(cases: UseCase[]): string[] {
  if (!cases.length) return [];
  return [
    'nigeriaUseCases:',
    ...cases.flatMap((c) => [
      `  - persona: "${c.persona}"`,
      `    scenario: ${yStr(c.scenario)}`,
    ]),
  ];
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
 * Gemini sometimes emits a fenced code block that is *meant* to sit inside a
 * numbered step: it indents the ``` fences to the list level but leaves the code
 * itself at column 0. That still compiles, so `findMdxCompileError` waves it
 * through, but it renders disastrously: the unindented lines break out of the
 * list item, so the code box shows up empty, the code leaks out as plain
 * paragraphs, and the step numbering restarts mid-list.
 *
 * This shifts the body of any such block right to match its opening fence
 * (relative indentation inside the block is preserved, so nested structure like
 * JSON survives). Blocks that are already correctly indented, and top-level
 * column-0 fences, are left untouched. A block that itself nests a same-length
 * ``` fence is left as written: those are too ambiguous to realign mechanically.
 */
export function normalizeFenceIndent(body: string): string {
  const fence = /^(\s*)(```+|~~~+)/;
  const lines = body.split('\n');
  const out: string[] = [];
  let i = 0;
  while (i < lines.length) {
    const open = lines[i].match(fence);
    if (!open) {
      out.push(lines[i++]);
      continue;
    }
    const indent = open[1].length;
    const block: string[] = [];
    let j = i + 1;
    while (j < lines.length && !fence.test(lines[j])) block.push(lines[j++]);
    if (j >= lines.length) {
      // unterminated fence: don't touch anything past it
      out.push(lines[i++]);
      continue;
    }
    const escaped =
      indent > 0 &&
      block.some((l) => l.trim() !== '' && /^\s*/.exec(l)![0].length < indent);
    const pad = ' '.repeat(indent);
    out.push(lines[i]); // opening fence, unchanged
    for (const l of block) out.push(escaped && l.trim() !== '' ? pad + l : l);
    out.push(lines[j]); // closing fence, unchanged
    i = j + 1;
  }
  return out.join('\n');
}

/** Drops the leading `--- ... ---` YAML frontmatter block from an MDX file string. */
function stripFrontmatter(mdx: string): string {
  const m = mdx.match(/^---\r?\n[\s\S]*?\r?\n---\r?\n?/);
  return m ? mdx.slice(m[0].length) : mdx;
}

/**
 * Best-effort guard against the one failure that can take the whole site down:
 * an LLM body that Astro can't compile. Astro compiles every published body at
 * build time with @mdx-js/mdx, so we run the same compiler on the body here,
 * BEFORE publishing, and route a non-compiling draft to drafts/ instead. The
 * regex escaping above prevents the common cases; this catches the rest
 * (unbalanced fences, HTML comments, stray JSX) without a full Astro build.
 *
 * Returns the compiler's error message on failure, or null when the body is
 * fine. If the compiler itself can't be loaded, returns null, the checker must
 * never be what stops the pipeline.
 */
export async function findMdxCompileError(mdxFile: string): Promise<string | null> {
  let compile: (typeof import('@mdx-js/mdx'))['compile'];
  try {
    ({ compile } = await import('@mdx-js/mdx'));
  } catch {
    return null; // compiler unavailable: don't block publishing on the checker
  }
  try {
    await compile(stripFrontmatter(mdxFile), { development: false });
    return null;
  } catch (err) {
    return err instanceof Error ? err.message : String(err);
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
    ...serializeUseCases(w.nigeriaUseCases),
    `tiktokUrl: ${yStr(w.tiktokUrl)}`,
    `published: ${w.published}`,
    '---',
    '',
    escapeMdxBody(normalizeFenceIndent(body)).trim(),
    '',
  ];
  return lines.join('\n');
}
