# AI Workflow Library (OPQAI placeholder) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the v1 AI Workflow Library per the PRD: a static, mobile-first Astro 5 site of reproducible AI workflows plus a daily GitHub Actions pipeline that fetches candidates from free APIs, scores/drafts them with Gemini Flash, and auto-publishes, at $0/month.

**Architecture:** Astro 5 static site (content collections + zod, MDX, Tailwind 4, Pagefind) hosted on Cloudflare Pages. A TypeScript pipeline (run under `tsx`) in `pipeline/` fetches → dedupes → scores (Gemini) → drafts (Gemini) → commits MDX; GitHub Actions cron at 05:30 UTC runs it daily. No backend, no DB.

**Tech Stack:** Astro 5, @astrojs/mdx, @astrojs/sitemap, @astrojs/rss, Tailwind CSS 4 (@tailwindcss/vite), Pagefind, TypeScript (strict), tsx, vitest, fast-xml-parser, Gemini REST API (free tier), GitHub Actions, Cloudflare Pages.

**User-input gates (surface to Opq when reached, never block other work):**
1. `GEMINI_API_KEY` (aistudio.google.com), needed for live scoring/drafting (Phase 2 done-check, Phase 3).
2. GitHub repo + push access (gh CLI not installed), needed for Actions cron + Cloudflare Pages.
3. Cloudflare account, Pages project + Web Analytics token.
4. `YOUTUBE_API_KEY`, optional source.
5. Final name + domain, Phase 4; until then placeholder `OPQAI` lives only in `src/site.config.ts`.
6. Buttondown username + Tally form ID, newsletter/submit embeds render placeholders until filled in `src/site.config.ts`.

---

## Phase 1, Content foundation (site)

### Task 1: Scaffold Astro project

**Files:** Create project at repo root (`package.json`, `astro.config.mjs`, `tsconfig.json`, `src/`, `public/`), `.gitignore`, `src/site.config.ts`, `src/styles/global.css`.

- [ ] Run `npm create astro@latest . -- --template minimal --no-install --no-git --typescript strict --skip-houston -y` (adjust flags to whatever the current CLI accepts; goal: minimal template, strict TS, no git re-init).
- [ ] `npm install` then `npx astro add mdx sitemap --yes`; `npm install tailwindcss @tailwindcss/vite @astrojs/rss`; `npm install -D pagefind tsx vitest fast-xml-parser @astrojs/check typescript`.
- [ ] `astro.config.mjs`: integrations `mdx()`, `sitemap()`; `site: SITE.url` (import from site config not possible in .mjs cleanly, hardcode `https://opqai.pages.dev` with a comment to update with site.config.ts when domain decided); vite plugin `tailwindcss()`.
- [ ] `src/styles/global.css`: `@import "tailwindcss";` plus theme tokens (system font stack, accent color, dark-on-light minimal palette).
- [ ] `src/site.config.ts`:
```ts
export const SITE = {
  name: "OPQAI",            // placeholder, final name before Phase 4
  tagline: "Proven AI workflows, step by step",
  url: "https://opqai.pages.dev", // update with custom domain in Phase 4
  buttondownUsername: "",   // fill to enable newsletter form
  tallyFormId: "",          // fill to enable /submit embed
  cloudflareAnalyticsToken: "", // fill to enable analytics
};
```
- [ ] `.gitignore`: `node_modules/`, `dist/`, `.astro/`, `.env`, `pipeline/logs/*.log`.
- [ ] `package.json` scripts: `dev`, `build: astro build && pagefind --site dist`, `preview`, `check: astro check`, `test: vitest run`, `pipeline: tsx pipeline/run.ts`, `pipeline:dry: tsx pipeline/run.ts --dry-run`, `pipeline:backfill: tsx pipeline/run.ts --backfill`.
- [ ] Verify: `npm run build` succeeds on the empty site. Commit.

### Task 2: Content schema + collections + categories module

**Files:** Create `src/lib/workflow-schema.ts`, `src/content.config.ts`, `src/lib/categories.ts`, `src/content/workflows/.gitkeep`, `src/content/drafts/.gitkeep`.

- [ ] `src/lib/workflow-schema.ts`, single source of truth, imported by both Astro config and pipeline. Use `z` from `astro/zod`:
```ts
import { z } from "astro/zod";

export const CATEGORIES = ["content-creation","freelancing","academic-research","job-hunting","sme-operations","coding"] as const;
export const BADGES = ["sourced","tested","community-verified"] as const;
export const DIFFICULTIES = ["beginner","intermediate","advanced"] as const;
export const PLATFORMS = ["reddit","hackernews","youtube","github","blog","twitter","other"] as const;
export const PRICING = ["free","freemium","paid"] as const;

export const toolSchema = z.object({
  name: z.string().min(1),
  url: z.string().url(),
  pricing: z.enum(PRICING),
  affiliateUrl: z.string().default(""),
});

export const workflowSchema = z.object({
  title: z.string().min(10).max(120),
  description: z.string().min(50).max(200),
  category: z.enum(CATEGORIES),
  badge: z.enum(BADGES).default("sourced"),
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
  score: z.number().min(1).max(10),
  ingestedAt: z.coerce.date(),
  nigeriaNotes: z.string().optional(),
  tiktokUrl: z.string().default(""),
  published: z.boolean().default(true),
});
export type Workflow = z.infer<typeof workflowSchema>;
```
- [ ] `src/content.config.ts`: two collections via `glob` loader (`astro/loaders`): `workflows` (base `./src/content/workflows`) and `drafts` (base `./src/content/drafts`), both `pattern: "**/*.mdx"`, schema `workflowSchema` (drafts: `workflowSchema.extend({ published: z.boolean().default(false) })`).
- [ ] `src/lib/categories.ts`: `Record<Category, { label: string; blurb: string; emoji: string }>` with real copy for all 6 categories (e.g. `"sme-operations": { label: "SME Operations", blurb: "Run a leaner business, invoices, inventory, customer replies, and marketing handled with AI.", emoji: "🏪" }`, write all six).
- [ ] Verify: `npm run check` passes. Commit.

### Task 3: Three hand-written sample workflows

**Files:** Create `src/content/workflows/youtube-video-to-social-posts-claude.mdx`, `src/content/workflows/fix-github-issue-claude-code.mdx`, `src/content/workflows/tailor-cv-job-description-chatgpt.mdx`.

- [ ] Each follows the PRD body structure exactly: `## What you'll get`, `## Tools you need`, `## Steps` (numbered, every prompt in a fenced code block), `## Original source`, `## Notes & variations`. Frontmatter passes `workflowSchema`. Cover 3 different categories (content-creation, coding, job-hunting) and at least one with `nigeriaNotes`.
- [ ] Sources must be REAL canonical URLs (official docs/help-center articles describing the workflow). Verify each URL with WebFetch if network allows; if not, flag to user in final report. Never fabricate steps or attribute to invented authors, use the publishing org as author when sourcing docs.
- [ ] Verify: `npm run build` renders 3 workflow entries. Commit.

### Task 4: Layout, header, footer

**Files:** Create `src/layouts/Base.astro`, `src/components/Header.astro`, `src/components/Footer.astro`.

- [ ] `Base.astro`: HTML shell, meta (title, description, canonical, OG/Twitter tags via props), `<slot />`, global.css import, Cloudflare Analytics `<script>` only when `SITE.cloudflareAnalyticsToken` non-empty. Mobile-first viewport; no web fonts (system stack).
- [ ] `Header.astro`: site name → `/`, nav (Workflows, Categories, About, Submit), search container `<div id="search"></div>` with lazy Pagefind UI loader (script that on first focus/click injects `/pagefind/pagefind-ui.css` + JS and mounts `new PagefindUI({ element: "#search" })`).
- [ ] `Footer.astro`: short mission line, links (About, Submit, RSS), "Built for Nigeria 🇳🇬, open to the world."
- [ ] Verify: build passes. Commit.

### Task 5: Workflow detail page

**Files:** Create `src/pages/workflows/[slug].astro`, `src/components/Badge.astro`, `src/components/ToolsList.astro`, `src/components/NigeriaNotes.astro`, `src/components/ShareButtons.astro`, `src/components/SourceEmbed.astro`, `src/lib/jsonld.ts`, `src/lib/steps.ts`.

- [ ] `[slug].astro`: `getStaticPaths` from `getCollection("workflows", e => e.data.published)`; render via `render(entry)`. Layout: title, meta row (Badge, difficulty, `timeMinutes` min, category link), jobToBeDone strapline, ToolsList (name + pricing chip + outbound link, `affiliateUrl || url`), NigeriaNotes callout when present, MDX `<Content />`, ShareButtons, SourceEmbed near the Original source section.
- [ ] Copy-to-clipboard: inline `<script>` decorating every `pre` in `.workflow-body` with a "Copy" button (`navigator.clipboard.writeText`, fallback `execCommand`), "Copied ✓" feedback. Vanilla JS, no deps.
- [ ] `ShareButtons.astro`: WhatsApp first (`https://wa.me/?text={title, url}`), then X (`https://twitter.com/intent/tweet`), then copy-link button. Large tap targets.
- [ ] `SourceEmbed.astro`: data-light click-to-load. Default renders a source card (platform icon, author, link). "Load original post" button injects the official embed on click only: YouTube → iframe `youtube-nocookie.com/embed/{id}`; Reddit → `embed.reddit.com` iframe; Twitter → blockquote + widgets.js; others → card only.
- [ ] `src/lib/steps.ts`: `extractSteps(body: string): string[]`, pull numbered-list lines from the `## Steps` section of raw MDX body (regex `/^\d+\.\s+(.+)$/gm` scoped between `## Steps` and the next `## `). `src/lib/jsonld.ts`: `howToJsonLd(workflow, steps, url)` returning schema.org HowTo (name, description, totalTime `PT{n}M`, tool array, step array). Inject via `<script type="application/ld+json" set:html={...} />`.
- [ ] Verify: build; open `dist` output of one sample to confirm copy buttons + JSON-LD exist. Commit.

### Task 6: Workflow index with filters

**Files:** Create `src/pages/workflows/index.astro`, `src/components/WorkflowCard.astro`.

- [ ] `WorkflowCard.astro`: title, description, Badge, difficulty, time, category, tool count; wrapper carries `data-category`, `data-badge`, `data-difficulty`, `data-free` (`"1"` when every tool `pricing !== "paid"`).
- [ ] Index page: all published workflows sorted by `ingestedAt` desc; filter bar (category select, badge select, difficulty select, "Free tools only" toggle). Inline vanilla script: filters toggle `hidden` on cards, syncs state to URL query params, restores from URL on load. Zero framework JS.
- [ ] Verify: build; check the emitted HTML contains data attributes; manual filter check in `npm run preview`. Commit.

### Task 7: Home page

**Files:** Modify `src/pages/index.astro`. Create `src/components/NewsletterForm.astro`.

- [ ] Sections: value prop hero ("Reproducible AI workflows for real work, exact steps, exact prompts, real sources."); Latest (6 most recent by `ingestedAt`); Trending (top `score`, `ingestedAt` within last 14 days, top 6, if none qualify, hide section); category grid from `categories.ts` with per-category counts; NewsletterForm.
- [ ] `NewsletterForm.astro`: Buttondown embed form action `https://buttondown.com/api/emails/embed-subscribe/{username}` only when `SITE.buttondownUsername` set; otherwise render nothing.
- [ ] Verify: build. Commit.

### Task 8: Category pages, about, submit, 404

**Files:** Create `src/pages/categories/[category].astro`, `src/pages/about.astro`, `src/pages/submit.astro`, `src/pages/404.astro`.

- [ ] `[category].astro`: `getStaticPaths` over `CATEGORIES`; intro blurb from `categories.ts`; card list of that category's published workflows.
- [ ] `about.astro`: mission, how curation works (pipeline + scoring + badges explained honestly: "sourced" = found in the wild with proof link; "tested" = personally reproduced), who's behind it (Opq).
- [ ] `submit.astro`: Tally iframe embed (`https://tally.so/embed/{tallyFormId}`) when configured; otherwise a friendly "submissions opening soon" note + mailto link.
- [ ] `404.astro`: link home + search nudge.
- [ ] Verify: build. Commit.

### Task 9: RSS

**Files:** Create `src/pages/rss.xml.ts`.

- [ ] `@astrojs/rss` endpoint over published workflows (title, description, link `/workflows/{id}/`, pubDate `ingestedAt`). Sitemap already handled by integration.
- [ ] Verify: build emits `dist/rss.xml` and `dist/sitemap-index.xml`. Commit.

### Task 10: Phase 1 verification

- [ ] `npm run check` (0 errors), `npm run build` (Pagefind indexes pages), `npm run preview` spot check: copy buttons, filters, share links, search.
- [ ] JS budget check: list `dist/**/*.js` total bytes on a workflow page, must be well under 100KB (expect < 10KB excluding lazy Pagefind).
- [ ] Commit. **USER GATE:** Cloudflare Pages deploy needs Opq's account, report exact connect steps; do not block Phase 2.

---

## Phase 2, Pipeline

### Task 11: Pipeline types, config, utils (TDD)

**Files:** Create `pipeline/types.ts`, `pipeline/sources.config.ts`, `pipeline/lib/utils.ts`, `pipeline/lib/utils.test.ts`.

- [ ] `pipeline/types.ts`:
```ts
import type { Workflow } from "../src/lib/workflow-schema";
export type Platform = Workflow["source"]["platform"];
export interface Candidate {
  title: string; url: string; platform: Platform; author: string;
  postedAt: string; excerpt: string;
  stats: { points?: number; comments?: number };
}
export interface ScoreResult {
  isWorkflow: boolean; score: number; jobToBeDone: string;
  category: Workflow["category"]; toolsMentioned: string[];
  freeTierViable: boolean; reason: string;
}
```
- [ ] `pipeline/sources.config.ts`: subreddits `["ChatGPT","ClaudeAI","ArtificialInteligence","PromptEngineering","SideProject","automation","artificial"]`; HN queries `["AI workflow","Show HN AI","ChatGPT workflow","Claude workflow"]`; RSS feed list (Latent Space, Ben's Bites, simonwillison.net/atom/everything); devto tags `["ai","productivity"]`; caps `{ scorePerRun: 40, publishPerRun: 5 }`; `GEMINI_MODEL = process.env.GEMINI_MODEL ?? "gemini-2.5-flash"`; `GEMINI_MS_BETWEEN_CALLS = 7000`; `USER_AGENT = "opqai-workflow-library/1.0 (content discovery; contact: opeyemiolowosoke@gmail.com)"`.
- [ ] `pipeline/lib/utils.ts` with vitest TDD (write `utils.test.ts` first, watch fail, implement, pass): `slugify(title)` (lowercase, alnum+hyphens, ≤ 80 chars, no leading/trailing hyphen); `sha256(s)` (node:crypto hex); `normalizeUrl(u)` (strip hash, utm_* params, trailing slash, lowercase host); `titleSimilarity(a,b)` (bigram Dice coefficient 0..1); `sleep(ms)`; `truncate(s,n)`.
- [ ] `npm test` green. Commit.

### Task 12: Fetchers (TDD on normalizers)

**Files:** Create `pipeline/fetchers/hn.ts`, `reddit.ts`, `devto.ts`, `rss.ts`, `github.ts`, `youtube.ts`, `index.ts`, plus `pipeline/fetchers/__fixtures__/*.json` and `pipeline/fetchers/fetchers.test.ts`.

- [ ] Each fetcher exports `fetch{Source}(opts: { backfill: boolean }): Promise<Candidate[]>` and a pure `normalize{Source}(raw): Candidate[]` (tested against a captured fixture). Fetch with global `fetch`, `USER_AGENT` header, try/catch per source returning `[]` on failure (log warning).
  - HN: `https://hn.algolia.com/api/v1/search?query={q}&tags=story&numericFilters=points>20` (backfill: `search` by points over past year).
  - Reddit: `https://www.reddit.com/r/{sub}/top.json?t=day&limit=15` (backfill `t=year&limit=50`); excerpt from `selftext`; skip stickied.
  - Dev.to: `https://dev.to/api/articles?tag={tag}&top=1` (backfill `top=365`).
  - RSS: parse with fast-xml-parser; items from last 2 days (backfill: 365).
  - GitHub: `https://api.github.com/search/repositories?q={q}&sort=stars` with `Authorization` only if `GITHUB_TOKEN` set; topic queries like `ai-workflow`, `prompt-engineering created:>{1y ago}`.
  - YouTube: only when `YOUTUBE_API_KEY` set: `search` endpoint, queries like "AI workflow tutorial"; else return `[]` silently.
- [ ] `index.ts`: `fetchAll(backfill): Promise<Candidate[]>` running all fetchers sequentially (politeness), flattening, filtering items older than 12 months (penalty rule handled in scoring; hard-drop > 18 months).
- [ ] Tests: one fixture per source asserting normalization → valid `Candidate` (platform, ISO date, excerpt truncated ≤ 1500 chars). `npm test` green. Commit.

### Task 13: Dedupe stage (TDD)

**Files:** Create `pipeline/lib/dedupe.ts`, `pipeline/lib/dedupe.test.ts`, `pipeline/seen.json` (`{"version":1,"seen":{}}`).

- [ ] `loadSeen(path)` / `saveSeen(path, seen)`; `dedupe(candidates, seen, existingTitles): Candidate[]`, drop if `sha256(normalizeUrl(url))` in seen, or `titleSimilarity ≥ 0.85` vs any existing workflow title or earlier candidate in the same batch. `existingTitles` read by globbing `src/content/{workflows,drafts}/*.mdx` frontmatter titles (simple regex parse `^title:` line).
- [ ] Tests: URL dup, utm-variant dup, near-title dup, batch-internal dup, clean pass-through. Green. Commit.

### Task 14: Gemini client (TDD on parsing)

**Files:** Create `pipeline/lib/gemini.ts`, `pipeline/lib/gemini.test.ts`.

- [ ] `geminiJson<T>(prompt: string, opts?): Promise<T>`, POST `https://generativelanguage.googleapis.com/v1beta/models/{GEMINI_MODEL}:generateContent?key={GEMINI_API_KEY}`, body `{ contents: [{ parts: [{ text }]}], generationConfig: { responseMimeType: "application/json", temperature: 0.2 } }`. Built-in throttle: module-level last-call timestamp, await `sleep` to respect `GEMINI_MS_BETWEEN_CALLS`. On 429: wait 60s, retry once. Missing `GEMINI_API_KEY` → throw `new Error("GEMINI_API_KEY not set")` (orchestrator surfaces this as a user gate).
- [ ] Pure helper `extractJson(text)` (strips markdown fences, finds first `{`…last `}`), TDD with fenced/plain/noisy inputs. Green. Commit.

### Task 15: Scoring prompt + stage

**Files:** Create `pipeline/prompts/score.md`, `pipeline/lib/score.ts`, `pipeline/lib/score.test.ts`.

- [ ] `score.md`, THE quality gate. Contains: role ("strict curator for a library of reproducible AI workflows"), the full PRD rubric verbatim (0-4 / 5-6 / 7-8 / 9-10, penalties −2 paid-only, −2 single-tool self-promo, −1 older than 12 months; bonuses +1 real results, +1 fully free tools), category enum with one-line definitions, beachhead note (favor free-tier, low-data workflows useful to Nigerian students/freelancers/SMEs), strict JSON output spec matching `ScoreResult`, and 3 few-shot examples (one 2, one 6, one 8) with candidate `{{TITLE}} {{PLATFORM}} {{AUTHOR}} {{POSTED_AT}} {{STATS}} {{EXCERPT}}` placeholders at the end.
- [ ] `score.ts`: `scoreCandidate(c: Candidate): Promise<ScoreResult>`, interpolate template, call `geminiJson<ScoreResult>`, validate with a zod schema for `ScoreResult` (clamp score 0-10, category must be in enum else `isWorkflow:false`). Test: template interpolation + validation rejects bad category (mock `geminiJson`). Green. Commit.

### Task 16: Drafting prompt + stage (TDD on serialization)

**Files:** Create `pipeline/prompts/draft.md`, `pipeline/lib/draft.ts`, `pipeline/lib/mdx.ts`, `pipeline/lib/mdx.test.ts`.

- [ ] `draft.md`: instructs Gemini to produce strict JSON `{ frontmatter: <object matching workflowSchema minus score/ingestedAt/source (injected by code)>, body: "<markdown>" }`; body MUST follow the 5-section structure with every prompt in a fenced code block; description 140-160 chars; **never fabricate steps/results, where the source omits detail, write the step generically and say so**; include `nigeriaNotes` when free-tier/data info is inferable, omit otherwise.
- [ ] `mdx.ts`: `toMdx(frontmatter: Workflow, body: string): string`, YAML frontmatter serializer (hand-rolled for our flat schema: strings quoted/escaped, dates as `YYYY-MM-DD`, nested `tools`/`source` maps) + body; `validateDraft(obj): Workflow` via `workflowSchema.parse` after injecting `score`, `ingestedAt`, `source`, `badge:"sourced"`. TDD round-trip test: `toMdx` output frontmatter re-parses (regex/YAML-lite) and `validateDraft` rejects missing tools / bad enum.
- [ ] `draft.ts`: `draftWorkflow(c: Candidate, s: ScoreResult): Promise<{ slug, mdx } | null>`, call Gemini, validate; on zod failure retry once with the validation errors appended to the prompt; second failure → return null (orchestrator demotes to drafts dir with whatever was salvageable, else skips + logs). Green tests. Commit.

### Task 17: Orchestrator

**Files:** Create `pipeline/run.ts`, `pipeline/logs/.gitkeep`.

- [ ] `run.ts` flow: parse flags (`--dry-run`, `--backfill`); `fetchAll` → `dedupe` → cap to `scorePerRun` (sorted by stats.points desc) → for each candidate (try/catch per candidate; errors log + continue): score → route: `<5` discard (log reason); `5-6` write draft MDX to `src/content/drafts/`; `≥7` draft → write to `src/content/workflows/` (or `drafts/` when `--dry-run`) until `publishPerRun` cap. Update + save `seen.json` for every scored candidate. Write JSONL run log `pipeline/logs/run-{YYYY-MM-DD}.jsonl` ({stage, url, score?, outcome, error?}). Exit non-zero only on fatal config errors (missing key), never on per-candidate failures. Print summary table (fetched/deduped/scored/published/drafted/discarded).
- [ ] Backfill mode: same flow with `backfill:true` fetch windows and loop note: run repeatedly until corpus targets met (Phase 3 handles the looping; run.ts itself stays single-pass).
- [ ] Verify: `npm run pipeline:dry` without `GEMINI_API_KEY` exits with the clear gate message after fetching+dedupe (fetch/dedupe stages proven against live APIs). Commit.

### Task 18: GitHub Action + README + .env.example

**Files:** Create `.github/workflows/ingest.yml`, `README.md`, `.env.example`.

- [ ] `ingest.yml`: `schedule: cron "30 5 * * *"` + `workflow_dispatch` (inputs: `dry_run`, `backfill`); `permissions: contents: write`; `concurrency: ingest`; steps: checkout → setup-node 22 (npm cache) → `npm ci` → `npx tsx pipeline/run.ts` with env `GEMINI_API_KEY`/`YOUTUBE_API_KEY`/`PRODUCTHUNT_TOKEN` from secrets → commit `src/content pipeline/seen.json` if changed (`git diff --quiet || (git config user.name "opqai-bot" && ... git push)`).
- [ ] `.env.example` documenting all keys. README: project intro, dev commands, pipeline usage, secrets setup, deploy steps (Cloudflare Pages: build `npm run build`, output `dist`).
- [ ] Commit. **USER GATE:** create GitHub repo + add secrets + connect Cloudflare Pages.

---

## Phase 3, Backfill + tune (GATED on GEMINI_API_KEY)

### Task 19: Live dry-run + prompt tuning + backfill
- [ ] With key: `npm run pipeline:dry` → review ≥3 generated drafts for schema validity + honesty (no fabricated steps) → iterate `score.md`/`draft.md` → flip to publish, run `pipeline:backfill` until 60-75 published with every category ≥ 8 (respect free-tier throttle: spread over multiple runs/days if needed).

---

## Phase 4, Launch polish (partially GATED)

### Task 20: OG images + final SEO
- [ ] Auto OG images: `astro-og-canvas` (or satori) endpoint `src/pages/og/[...slug].png.ts` over workflows collection; wire `og:image` in Base.astro. HowTo JSON-LD + sitemap + RSS already done (Tasks 5/9).
### Task 21: Config fill-ins (USER GATES)
- [ ] Final name + domain → update `site.config.ts` + astro.config `site` + Cloudflare custom domain. Buttondown username, Tally form ID, CF Analytics token → `site.config.ts`. Re-deploy, Lighthouse mobile ≥ 90 verification.

---

## Self-review notes
- Spec coverage checked against PRD sections 4-9 and 12: all pages, schema fields, pipeline stages, caps, throttles, action cron, badges, monetization-ready `affiliateUrl`, no-backend constraint, covered. Non-goals respected (no auth/comments/X API).
- Lighthouse target is verified at Phase 1 end and Phase 4; JS budget enforced by avoiding frameworks (only inline vanilla scripts + lazy Pagefind).
- Types consistent: `Candidate`/`ScoreResult` defined once in `pipeline/types.ts`; schema single-sourced in `src/lib/workflow-schema.ts`.
