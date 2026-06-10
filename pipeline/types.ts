import type { Category, Platform } from '../src/lib/workflow-schema';

/** Normalized output of every fetcher (PRD Stage 1). */
export interface Candidate {
  title: string;
  url: string;
  platform: Platform;
  author: string;
  /** ISO 8601 date string. */
  postedAt: string;
  excerpt: string;
  stats: { points?: number; comments?: number };
}

/** Strict JSON returned by the Gemini scoring stage (PRD Stage 3). */
export interface ScoreResult {
  isWorkflow: boolean;
  score: number;
  jobToBeDone: string;
  category: Category;
  toolsMentioned: string[];
  freeTierViable: boolean;
  reason: string;
}

export interface RunOptions {
  dryRun: boolean;
  backfill: boolean;
}
