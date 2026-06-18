/** All tunable pipeline knobs in one place (PRD section 7). */

// Subreddits chosen to cover all six categories (coding, content-creation,
// freelancing, academic-research, job-hunting, sme-operations), breadth is the
// cheapest lever on fresh-candidate supply.
export const SUBREDDITS = [
  // AI / prompting
  'ChatGPT',
  'ClaudeAI',
  'GeminiAI',
  'ArtificialInteligence',
  'PromptEngineering',
  'ChatGPTPro',
  'ChatGPTPromptGenius',
  'OpenAI',
  'LocalLLaMA',
  'aipromptprogramming',
  // building / coding
  'SideProject',
  'automation',
  'webdev',
  'learnprogramming',
  // work / money
  'freelance',
  'smallbusiness',
  'Entrepreneur',
  'marketing',
  'copywriting',
  'productivity',
  // study / job hunting
  'studytips',
  'resumes',
  'jobsearchhacks',
  'Notion',
];

export const HN_QUERIES = [
  'AI workflow',
  'Show HN AI',
  'ChatGPT workflow',
  'Claude workflow',
  'AI agent workflow',
  'automated with AI',
  'prompt engineering',
  'LLM workflow',
  'AI coding workflow',
  'building with LLMs',
  'RAG tutorial',
  'AI for business',
];

export const DEVTO_TAGS = [
  'ai',
  'productivity',
  'chatgpt',
  'automation',
  'machinelearning',
  'tutorial',
  'llm',
  'beginners',
];

export const RSS_FEEDS = [
  'https://simonwillison.net/atom/everything/',
  'https://www.latent.space/feed',
  'https://www.bensbites.com/feed',
  'https://www.oneusefulthing.org/feed',
];

export const GITHUB_QUERIES = [
  'ai workflow guide',
  'prompt engineering workflow',
  'chatgpt prompts guide',
  'llm application tutorial',
];

export const YOUTUBE_QUERIES = [
  'AI workflow tutorial step by step',
  'ChatGPT workflow real example',
  'Claude AI workflow tutorial',
];

/** Daily caps (quality + free-tier safety). Publishes = candidates scoring ≥ 7, up to the cap. */
export const CAPS = {
  scorePerRun: 150,
  publishPerRun: 25,
  /** Backfill runs become no-ops once this many workflows are published. */
  backfillTarget: 150,
};

/**
 * Daily-run fetch windows. Wider than "top of today" so we keep surfacing
 * genuinely new posts instead of re-scanning the same evergreen page-0 results
 * (which then all dedupe away). Combined with dailyPage rotation in run.ts.
 */
export const DAILY = {
  redditWindow: 'week' as const, // top of the week, not just today
  redditLimit: 25,
  hnMinPoints: 10,
  hnPerPage: 20,
  devtoTopDays: 7,
  devtoPerPage: 20,
  githubMinStars: 15,
  githubPerPage: 12,
  /** Daily page offset cycles 0..pageCycle-1 across runs to reach new posts. */
  pageCycle: 6,
};

/** Candidates older than this are dropped before scoring. */
export const MAX_AGE_MONTHS = 18;

export const GEMINI_MODEL = process.env.GEMINI_MODEL ?? 'gemini-2.5-flash';
/** Free tier is ~10 RPM for Flash; 7s spacing keeps us safely under. */
export const GEMINI_MS_BETWEEN_CALLS = 7000;

export const USER_AGENT =
  'opqai-workflow-library/1.0 (content discovery bot; contact: opeyemiolowosoke@gmail.com)';
