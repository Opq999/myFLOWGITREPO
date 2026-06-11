/** All tunable pipeline knobs in one place (PRD section 7). */

export const SUBREDDITS = [
  'ChatGPT',
  'ClaudeAI',
  'ArtificialInteligence',
  'PromptEngineering',
  'SideProject',
  'automation',
  'artificial',
  'ChatGPTPro',
  'ChatGPTPromptGenius',
  'OpenAI',
  'LocalLLaMA',
  'productivity',
  'freelance',
  'smallbusiness',
];

export const HN_QUERIES = [
  'AI workflow',
  'Show HN AI',
  'ChatGPT workflow',
  'Claude workflow',
  'AI agent workflow',
  'automated with AI',
  'prompt engineering',
];

export const DEVTO_TAGS = ['ai', 'productivity', 'chatgpt', 'automation'];

export const RSS_FEEDS = [
  'https://simonwillison.net/atom/everything/',
  'https://www.latent.space/feed',
  'https://www.bensbites.com/feed',
];

export const GITHUB_QUERIES = ['ai workflow guide', 'prompt engineering workflow'];

export const YOUTUBE_QUERIES = ['AI workflow tutorial step by step', 'ChatGPT workflow real example'];

/** Daily caps (quality + free-tier safety). Publishes = candidates scoring ≥ 7, up to the cap. */
export const CAPS = {
  scorePerRun: 120,
  publishPerRun: 20,
};

/** Candidates older than this are dropped before scoring. */
export const MAX_AGE_MONTHS = 18;

export const GEMINI_MODEL = process.env.GEMINI_MODEL ?? 'gemini-2.5-flash';
/** Free tier is ~10 RPM for Flash; 7s spacing keeps us safely under. */
export const GEMINI_MS_BETWEEN_CALLS = 7000;

export const USER_AGENT =
  'opqai-workflow-library/1.0 (content discovery bot; contact: opeyemiolowosoke@gmail.com)';
