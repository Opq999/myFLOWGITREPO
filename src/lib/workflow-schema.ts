import { z } from 'astro/zod';

/**
 * Single source of truth for the workflow content model (PRD section 5).
 * Imported by both the Astro content collections and the ingestion pipeline.
 */
export const CATEGORIES = [
  'content-creation',
  'freelancing',
  'academic-research',
  'job-hunting',
  'sme-operations',
  'coding',
] as const;

export const BADGES = ['sourced', 'tested', 'community-verified'] as const;
export const DIFFICULTIES = ['beginner', 'intermediate', 'advanced'] as const;
export const PLATFORMS = [
  'reddit',
  'hackernews',
  'youtube',
  'github',
  'blog',
  'twitter',
  'other',
] as const;
export const PRICING = ['free', 'freemium', 'paid'] as const;

/** Who a workflow is practically useful for in Nigeria (an axis orthogonal to category). */
export const PERSONAS = ['student', 'entrepreneur', 'small-business', 'employee'] as const;

export type Category = (typeof CATEGORIES)[number];
export type Platform = (typeof PLATFORMS)[number];
export type Persona = (typeof PERSONAS)[number];

/** One practical, persona-tagged Nigerian use case for a workflow. */
export const useCaseSchema = z.object({
  persona: z.enum(PERSONAS),
  scenario: z.string().min(10).max(240),
});

export const toolSchema = z.object({
  name: z.string().min(1),
  url: z.string().url(),
  pricing: z.enum(PRICING),
  /** Monetization-ready; empty until affiliate programs are joined. */
  affiliateUrl: z.string().default(''),
});

export const workflowSchema = z.object({
  title: z.string().min(10).max(120),
  /** SEO meta description; drafting prompt targets 140-160 chars. */
  description: z.string().min(50).max(200),
  category: z.enum(CATEGORIES),
  badge: z.enum(BADGES).default('sourced'),
  difficulty: z.enum(DIFFICULTIES),
  timeMinutes: z.number().int().positive(),
  jobToBeDone: z.string().min(5),
  tools: z.array(toolSchema).min(1),
  source: z.object({
    url: z.string().url(),
    platform: z.enum(PLATFORMS),
    author: z.string().min(1),
    postedAt: z.coerce.date(),
  }),
  /** Gemini quality score 1-10. */
  score: z.number().min(1).max(10),
  ingestedAt: z.coerce.date(),
  /** Free-tier viability, data usage, local payment compatibility. */
  nigeriaNotes: z.string().optional(),
  /** Practical Nigerian use cases tagged by persona. Empty when none generated yet. */
  nigeriaUseCases: z.array(useCaseSchema).default([]),
  /** Filled when a paired TikTok exists. */
  tiktokUrl: z.string().default(''),
  published: z.boolean().default(true),
});

export type Workflow = z.infer<typeof workflowSchema>;
export type Tool = z.infer<typeof toolSchema>;
export type UseCase = z.infer<typeof useCaseSchema>;
