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
  'ArtificialIntelligence',
  'PromptEngineering',
  'ChatGPTPro',
  'ChatGPTPromptGenius',
  'OpenAI',
  'LocalLLaMA',
  'aipromptprogramming',
  'MachineLearning',
  'learnmachinelearning',
  'LLMDevs',
  'AI_Agents',
  'StableDiffusion',
  'LangChain',
  'datascience',
  // building / coding
  'SideProject',
  'automation',
  'webdev',
  'learnprogramming',
  'Python',
  'programming',
  'NoCode',
  'SaaS',
  // work / money
  'freelance',
  'smallbusiness',
  'Entrepreneur',
  'marketing',
  'copywriting',
  'productivity',
  'startups',
  'digital_marketing',
  'Upwork',
  // study / job hunting
  'studytips',
  'resumes',
  'jobsearchhacks',
  'Notion',
  'GetStudying',
  'cscareerquestions',
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
  'AI automation',
  'Claude Code',
  'vibe coding',
  'AI agent tutorial',
  'local LLM',
  'AI productivity',
  'building AI agents',
  'MCP server',
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
  'webdev',
  'python',
  'opensource',
  'aiagents',
  'react',
  'career',
  'coding',
];

export const RSS_FEEDS = [
  'https://simonwillison.net/atom/everything/',
  'https://www.latent.space/feed',
  'https://www.bensbites.com/feed',
  'https://www.oneusefulthing.org/feed',
  'https://huggingface.co/blog/feed.xml',
  'https://magazine.sebastianraschka.com/feed',
  'https://www.interconnects.ai/feed',
  'https://newsletter.pragmaticengineer.com/feed',
];

export const GITHUB_QUERIES = [
  'ai workflow guide',
  'prompt engineering workflow',
  'chatgpt prompts guide',
  'llm application tutorial',
  'awesome ai agents',
  'ai automation workflow',
  'llm prompts collection',
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
 *
 * Reddit previously fetched a single fixed top-of-week page and ignored the
 * rotation, so it returned the SAME ~25 posts every run and starved after one.
 * It now pulls a wider top-of-month window (up to the API max) and the fetcher
 * slices a different `redditPageSize` block per run via the page offset, the
 * same way HN/dev.to/GitHub already paginate. Windows are deliberately wider
 * here than before so a single day of sources yields more publishable supply.
 */
export const DAILY = {
  redditWindow: 'month' as const, // top of the month, sliced per run (was 'week')
  /** Reddit posts fetched per subreddit per run (API max is 100), then sliced. */
  redditFetch: 100,
  /** Reddit posts kept per run from the fetched window (one rotating slice). */
  redditPageSize: 25,
  hnMinPoints: 10,
  hnPerPage: 20,
  devtoTopDays: 30, // last month, not just the last week (was 7)
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
