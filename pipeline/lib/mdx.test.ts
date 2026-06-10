import { describe, expect, it } from 'vitest';
import type { Candidate, ScoreResult } from '../types';
import { toMdx, validateDraft } from './mdx';

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
      'Use ChatGPT to draft, itemize and format client invoices in minutes — a reproducible workflow for small business owners with free tools only.',
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
});
