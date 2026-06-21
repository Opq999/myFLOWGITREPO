import { describe, expect, it } from 'vitest';
import type { Candidate, ScoreResult } from '../types';
import {
  escapeMdxBody,
  findMdxCompileError,
  normalizeFenceIndent,
  serializeUseCases,
  toMdx,
  validateDraft,
} from './mdx';

const candidate: Candidate = {
  title: 'How I do invoices with AI',
  url: 'https://www.reddit.com/r/smallbusiness/comments/xyz/',
  platform: 'reddit',
  author: 'u/biz',
  postedAt: '2026-05-12T00:00:00Z',
  excerpt: 'steps...',
  stats: { points: 50 },
};

const score: ScoreResult = {
  isWorkflow: true,
  score: 8,
  jobToBeDone: 'Send invoices faster',
  category: 'sme-operations',
  toolsMentioned: ['ChatGPT'],
  freeTierViable: true,
  reason: 'solid',
};

const goodDraft = {
  frontmatter: {
    title: 'Generate and send invoices in minutes with ChatGPT',
    description:
      'Use ChatGPT to draft, itemize and format client invoices in minutes, a reproducible workflow for small business owners with free tools only.',
    category: 'sme-operations',
    difficulty: 'beginner',
    timeMinutes: 15,
    jobToBeDone: 'Send invoices faster',
    tools: [{ name: 'ChatGPT', url: 'https://chatgpt.com', pricing: 'freemium' as const }],
    nigeriaNotes: 'Free tier works; minimal data.',
  },
  body:
    "## What you'll get\n\nFast invoices.\n\n## Tools you need\n\n- ChatGPT (freemium)\n\n## Steps\n\n1. Ask for an invoice:\n\n```\nDraft an invoice for ...\n```\n\n## Original source\n\nShared by u/biz on Reddit.\n\n## Notes & variations\n\n- Works in Gemini too.",
};

describe('validateDraft', () => {
  it('merges code-owned fields and passes the real schema', () => {
    const { workflow } = validateDraft(goodDraft, candidate, score);
    expect(workflow.badge).toBe('sourced');
    expect(workflow.score).toBe(8);
    expect(workflow.source.url).toBe(candidate.url);
    expect(workflow.source.platform).toBe('reddit');
    expect(workflow.tools[0].affiliateUrl).toBe('');
  });

  it('rejects missing tools', () => {
    const bad = { ...goodDraft, frontmatter: { ...goodDraft.frontmatter, tools: [] } };
    expect(() => validateDraft(bad, candidate, score)).toThrow();
  });

  it('rejects a bad category enum', () => {
    const bad = { ...goodDraft, frontmatter: { ...goodDraft.frontmatter, category: 'lifestyle' } };
    expect(() => validateDraft(bad, candidate, score)).toThrow();
  });

  it('accepts null nigeriaNotes', () => {
    const noNotes = {
      ...goodDraft,
      frontmatter: { ...goodDraft.frontmatter, nigeriaNotes: null },
    };
    const { workflow } = validateDraft(noNotes, candidate, score);
    expect(workflow.nigeriaNotes).toBeUndefined();
  });
});

describe('toMdx', () => {
  it('produces frontmatter that round-trips key fields', () => {
    const { workflow, body } = validateDraft(goodDraft, candidate, score);
    const mdx = toMdx(workflow, body);
    expect(mdx.startsWith('---\n')).toBe(true);
    expect(mdx).toContain('title: "Generate and send invoices in minutes with ChatGPT"');
    expect(mdx).toContain('category: "sme-operations"');
    expect(mdx).toContain('postedAt: 2026-05-12');
    expect(mdx).toContain('published: true');
    expect(mdx).toContain("## What you'll get");
  });

  it('escapes quotes in strings', () => {
    const { workflow, body } = validateDraft(
      {
        ...goodDraft,
        frontmatter: {
          ...goodDraft.frontmatter,
          title: 'Use "smart quotes" safely in invoice workflows',
        },
      },
      candidate,
      score
    );
    const mdx = toMdx(workflow, body);
    expect(mdx).toContain('title: "Use \\"smart quotes\\" safely in invoice workflows"');
  });

  it('omits nigeriaUseCases when empty and serializes the block before tiktokUrl when present', () => {
    const { workflow, body } = validateDraft(goodDraft, candidate, score);
    expect(toMdx(workflow, body)).not.toContain('nigeriaUseCases:');

    workflow.nigeriaUseCases = [
      { persona: 'student', scenario: 'Turn your lecture notes into a practice quiz.' },
      { persona: 'small-business', scenario: 'Draft WhatsApp replies to customer complaints.' },
    ];
    const mdx = toMdx(workflow, body);
    expect(mdx).toContain('nigeriaUseCases:');
    expect(mdx).toContain('  - persona: "student"');
    expect(mdx).toContain('    scenario: "Turn your lecture notes into a practice quiz."');
    expect(mdx.indexOf('nigeriaUseCases:')).toBeLessThan(mdx.indexOf('tiktokUrl:'));
  });
});

describe('serializeUseCases', () => {
  it('returns [] for an empty list (key gets omitted)', () => {
    expect(serializeUseCases([])).toEqual([]);
  });

  it('emits a YAML block with escaped scenarios', () => {
    const lines = serializeUseCases([
      { persona: 'employee', scenario: 'Summarize a "long" report.' },
    ]);
    expect(lines[0]).toBe('nigeriaUseCases:');
    expect(lines).toContain('  - persona: "employee"');
    expect(lines).toContain('    scenario: "Summarize a \\"long\\" report."');
  });
});

describe('escapeMdxBody', () => {
  it('escapes bare angle-bracket placeholders in prose (the crash that took the site down)', () => {
    expect(escapeMdxBody('Use the <session-id> here.')).toBe('Use the \\<session-id> here.');
  });

  it('escapes bare braces in prose', () => {
    expect(escapeMdxBody('Replace {name} with yours.')).toBe('Replace \\{name} with yours.');
  });

  it('leaves inline-code spans untouched', () => {
    expect(escapeMdxBody('Run `cband <id>` now.')).toBe('Run `cband <id>` now.');
  });

  it('leaves fenced code blocks untouched', () => {
    const body = '```bash\ncband continue <session-id>\n```';
    expect(escapeMdxBody(body)).toBe(body);
  });

  it('does not escape comparisons / less-than between spaces', () => {
    expect(escapeMdxBody('use a < b in math')).toBe('use a < b in math');
  });
});

describe('normalizeFenceIndent', () => {
  it('re-indents code that escaped to column 0 inside a list step', () => {
    const body = '1.  **Run it**:\n\n    ```\nnpm install\n    ```\n';
    expect(normalizeFenceIndent(body)).toBe(
      '1.  **Run it**:\n\n    ```\n    npm install\n    ```\n'
    );
  });

  it('preserves relative indentation inside the block (e.g. JSON)', () => {
    const body = '1.  **Config**:\n\n    ```json\n{\n  "a": 1\n}\n    ```\n';
    expect(normalizeFenceIndent(body)).toBe(
      '1.  **Config**:\n\n    ```json\n    {\n      "a": 1\n    }\n    ```\n'
    );
  });

  it('leaves already-correct indented blocks untouched', () => {
    const body = '1.  **Run it**:\n\n    ```\n    npm install\n    ```\n';
    expect(normalizeFenceIndent(body)).toBe(body);
  });

  it('leaves top-level (column-0) fences untouched', () => {
    const body = '```bash\nnpm install\n```\n';
    expect(normalizeFenceIndent(body)).toBe(body);
  });

  it('does not pad blank lines inside the block', () => {
    const body = '1.  x:\n\n    ```\na\n\nb\n    ```\n';
    expect(normalizeFenceIndent(body)).toBe('1.  x:\n\n    ```\n    a\n\n    b\n    ```\n');
  });
});

describe('findMdxCompileError', () => {
  it('returns null for a body that compiles cleanly', async () => {
    const { workflow, body } = validateDraft(goodDraft, candidate, score);
    const mdx = toMdx(workflow, body);
    expect(await findMdxCompileError(mdx)).toBeNull();
  });

  it('flags a body that would crash the build (unclosed JSX)', async () => {
    const mdx = '---\ntitle: "x"\n---\n\n## Broken\n\nDangling element: <div>\n\nno closing tag\n';
    expect(await findMdxCompileError(mdx)).toBeTruthy();
  });
});
