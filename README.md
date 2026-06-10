# OPQAI — AI Workflow Library

> Working name is a placeholder; final name decided before launch.

A free library of **reproducible AI workflows** — exact steps, copy-paste prompts, real human sources — built mobile-first and data-light for Nigerian students, freelancers and SME owners, open to the world.

**The unit of value:** job-to-be-done → exact steps → exact prompts → tools used → proof → original human source.

The platform feeds itself: a daily GitHub Actions pipeline pulls candidates from free APIs, scores and drafts them with Gemini Flash (free tier), and publishes automatically. **$0/month infrastructure.**

## Stack

- [Astro 5](https://astro.build) + TypeScript strict — content collections with zod, MDX
- Tailwind CSS 4 · Pagefind (static search) · Cloudflare Pages (hosting)
- GitHub Actions (pipeline runtime) · Gemini Flash free tier (scoring + drafting)
- No backend. No database. No auth.

## Commands

| Command                    | What it does                                          |
| -------------------------- | ----------------------------------------------------- |
| `npm run dev`              | Dev server at `localhost:4321`                        |
| `npm run build`            | Static build to `dist/` + Pagefind index              |
| `npm run preview`          | Preview the production build                          |
| `npm run check`            | Type-check Astro + TS                                 |
| `npm test`                 | Pipeline unit tests (vitest)                          |
| `npm run pipeline`         | Daily ingest: fetch → dedupe → score → draft → publish |
| `npm run pipeline:dry`     | Same, but everything is written to `src/content/drafts/` |
| `npm run pipeline:backfill`| 12-month windows, for building the launch corpus      |

## Pipeline

```
fetchers (HN, Reddit, Dev.to, RSS, GitHub, YouTube)
  → dedupe (pipeline/seen.json + fuzzy titles)
  → score with Gemini   (pipeline/prompts/score.md — THE quality gate)
  → draft with Gemini   (pipeline/prompts/draft.md)
  → score ≥ 7 publish to src/content/workflows/ (≤ 5/day)
    score 5–6 to src/content/drafts/ · score < 5 discarded
```

Runs daily at 05:30 UTC via [.github/workflows/ingest.yml](.github/workflows/ingest.yml). Per-candidate failures are logged to `pipeline/logs/` and skipped — they never block the run. Improving `score.md` is how content quality improves over time.

## Setup

1. **Secrets** (GitHub repo → Settings → Secrets and variables → Actions):
   - `GEMINI_API_KEY` — required, free at [aistudio.google.com](https://aistudio.google.com)
   - `YOUTUBE_API_KEY` — optional, enables the YouTube source
2. **Local:** copy `.env.example` to `.env` and fill the same keys.
3. **Deploy:** Cloudflare Pages → connect this repo → build command `npm run build`, output directory `dist`. Every pipeline commit auto-deploys.
4. **Launch config:** site name/domain, Buttondown username, Tally form ID and the Cloudflare Analytics token all live in [src/site.config.ts](src/site.config.ts).
