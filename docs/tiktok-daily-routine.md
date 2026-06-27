# Daily TikTok Routine — OPQAI Workflow Library

Your job every day: go to **opqai.solutions**, pick **one** reproducible workflow,
turn it into a short "how-to" video, film it, post it, and link the TikTok back into
the workflow. The site already does the hard part — every workflow has a job-to-be-done,
exact steps, the exact prompt, the tools, and a real human source. You are just
performing it on camera.

This whole routine is ~30 minutes once you have the rhythm.

---

## The daily loop (10 steps)

1. **Pick a workflow** (2 min) — see [How to pick](#how-to-pick-todays-workflow) below.
2. **Read it once, top to bottom** (3 min) on opqai.solutions so you can do it from memory.
3. **Do the workflow yourself first** (5–10 min). If a step doesn't work, you found a
   problem before your audience did. The real screen recording IS the content.
4. **Screen-record while you do it** (the run from step 3 can be the take).
5. **Fill in the [script template](#the-script-template)** — hook, 3 steps, payoff, CTA.
6. **Film / voice-over** the run using the script (60–90 seconds).
7. **Caption + hashtags** — see [Caption recipe](#caption--hashtags).
8. **Post to TikTok.**
9. **Close the loop**: copy the TikTok URL and paste it into that workflow's
   `tiktokUrl` field (see [Closing the loop](#closing-the-loop)). Commit + push.
10. **Log it** in [posting-log.md](#posting-log) so you never repeat a workflow.

---

## How to pick today's workflow

Go to **opqai.solutions** and choose by these rules, in order:

1. **Can you actually do it today, on the device in your hand?** Prefer
   `difficulty: beginner` and `timeMinutes` under ~10. Phone-doable beats impressive.
2. **Is it visual?** Anything that produces an image, a letter, a chart, a working
   app, or a funny output performs better than abstract config. (e.g. "Explain your
   job to a 5-year-old", "Generate a Reddit thread image", cover letters.)
3. **High score = proven**. Frontmatter `score` is the quality gate (out of 10).
   Sort toward 8–10 first; they're the crowd-pleasers.
4. **Free tools win.** Filter for tools with `pricing: "free"` or `"freemium"` so your
   Nigerian student / freelancer audience can follow along with no spend.
5. **Use the built-in angle.** Each workflow has `nigeriaUseCases` with an `employee`,
   `student`, and `entrepreneur` scenario — that's your hook, ready-made. Rotate the
   persona day to day so the feed feels fresh.
6. **Don't repeat.** Skip anything already in [posting-log.md](#posting-log).

A simple weekly theme rotation keeps you from decision fatigue:

| Day | Theme | Pick from category |
| --- | ----- | ------------------ |
| Mon | "Get hired" | `job-hunting` |
| Tue | "Make content" | `content-creation` |
| Wed | "Build something" | coding / app-building |
| Thu | "Run a business" | automation / SME |
| Fri | "Fun / wow" | image / game / music |
| Sat | Reply to a comment from the week with a workflow that answers it | any |
| Sun | Rest or batch-film 2–3 for the week ahead |

---

## The script template

Copy this, fill the blanks from the workflow's frontmatter and steps. Keep it to
60–90 seconds — that's roughly 150–220 spoken words.

```
TITLE: <workflow title>
WORKFLOW URL: https://opqai.solutions/workflows/<slug>
PERSONA ANGLE: <pick one nigeriaUseCase: employee / student / entrepreneur>

[0–3s  HOOK]  (say it AND put it as on-screen text)
  "<the nigeriaUseCase scenario, said as a problem>"
  e.g. "Your mum still doesn't know what your job is? Watch this."

[3–8s  PROMISE]
  "In <timeMinutes> minutes, with <tool> — which is free — here's how."

[8–55s  THE DO]  (screen recording, narrate 3 steps max — collapse the rest)
  Step 1: <step 1, one sentence>
  Step 2: <the exact prompt — read it / show it on screen, this is the gold>
  Step 3: <the result appearing>

[55–75s  PAYOFF]
  Show the actual output. "That's it. <one honest line about the result.>"

[75–90s  CTA]
  "Full steps, the exact prompt, and the source are free on opqai.solutions —
   link in bio. New AI workflow every day."
```

**Rules that make these work:**
- The **exact prompt is the hook payoff** — show it big and readable on screen, and tell
  them they can copy it from the site. That's the reason to click through.
- **Always credit the source.** The workflow has a `source` (real human, real link).
  Saying "this came from a Reddit user / Hacker News" builds trust and is honest.
- **Be honest about limits.** Use the "Common pitfall" / "Notes & variations" line so
  people don't get stuck (e.g. "Ollama has to be running first"). Honesty = saves +
  comments.
- **One CTA only**: opqai.solutions, link in bio.

---

## Three ready-to-film examples

These are filled in from live workflows so you can shoot one today.

### Example 1 — "Explain your job to a 5-year-old" (beginner, ~7 min, score 10)
URL: `https://opqai.solutions/workflows/explain-your-complex-job-simply-using-chatgpt`

> **HOOK (0–3s, on-screen text):** "Your parents STILL don't know what you do for work?"
> **PROMISE:** "One free ChatGPT prompt fixes that in 2 minutes."
> **DO:**
> 1. Open chatgpt.com, new chat.
> 2. Type — *(show this on screen, big)*:
>    `Explain what a [your job title] does, but make it simple enough for a 5-year-old.`
> 3. Read the answer out loud — it's funny and weirdly accurate.
> **PAYOFF:** Show your real result. "I'm a [job] and apparently I 'count toys and make colourful pictures.'"
> **CTA:** "Exact prompt + the original Reddit source are free on opqai.solutions, link in bio."

Persona swap for variety: student → "Explain my course to my grandma"; entrepreneur →
"Explain my startup to a non-techie investor."

### Example 2 — "Generate a Reddit thread image" (beginner, ~5 min, score 7)
URL: `https://opqai.solutions/workflows/generate-a-reddit-thread-image-with-chatgpt`

> **HOOK:** "Need a screenshot of a Reddit thread that doesn't exist? Make one."
> **PROMISE:** "Free ChatGPT image gen, 5 minutes, no design skills."
> **DO:**
> 1. chatgpt.com → new chat, image mode on.
> 2. Paste *(show on screen)*:
>    `Create a realistic image of a typical Reddit thread about "[your topic]". Show the post
>    title, username, upvotes, and 4–6 comments. Make it look like the real Reddit interface.`
> 3. Watch it draw the thread.
> **PAYOFF:** Show the image. "Looks real. Great for a slide, a blog, or a report."
> **CTA:** "Full prompt's free on opqai.solutions — new workflow daily, link in bio."

### Example 3 — "Cover letters with local AI" (intermediate, ~10 min, score 8)
URL: `https://opqai.solutions/workflows/generate-cover-letters-with-local-ai-and-ollama`

> **HOOK:** "Firing off 20 job applications? Don't pay per cover letter."
> **PROMISE:** "Run AI free on your own laptop — your CV never leaves your machine."
> **DO:**
> 1. Install Ollama, run `ollama pull llama3.2` *(show the command)*.
> 2. Open the free Cover Letter Maker app, upload your CV, paste the job description.
> 3. Hit generate — ~5 seconds to a tailored letter.
> **PAYOFF:** Show the finished letter. "Personalised, private, and ₦0 per letter."
> **CTA (be honest):** "Ollama has to be running first — full steps on opqai.solutions, link in bio."

---

## Caption & hashtags

**Caption recipe:** one-line hook + what they'll learn + CTA.
> "Make AI explain your job like you're 5 😭 Free prompt 👇 Full steps on opqai.solutions (link in bio). #ai #chatgpt"

**Hashtag set** (mix broad + niche + local — pick ~5):
`#ai #aitools #chatgpt #howto #productivity #techtok #naijatech #sidehustle #freelance #studenttips`

**Posting:** 1/day is the goal; consistency beats volume. Best windows for a Nigerian
audience are roughly 12–1pm and 7–9pm WAT. Batch-film on Sunday if daily filming is hard.

---

## Closing the loop

After a video is live, link it back to the workflow so the site and your TikTok feed
each other (the field already exists in every workflow's frontmatter):

1. Open `src/content/workflows/<slug>.mdx`.
2. Set the TikTok URL:
   ```yaml
   tiktokUrl: "https://www.tiktok.com/@yourhandle/video/1234567890"
   ```
3. Add the row to [posting-log.md](#posting-log).
4. Commit + push:
   ```bash
   git add -A && git commit -m "Add TikTok link for <slug>" && git push
   ```

This means visitors who find the workflow can watch you do it, and viewers who find the
TikTok can get the exact steps. That two-way link is the whole growth engine.

---

## Posting log

Keep a running list so you never repeat a workflow and can see your streak. Start it in
`docs/posting-log.md`:

```markdown
# TikTok Posting Log

| Date | Workflow slug | Persona angle | TikTok URL | Notes |
| ---- | ------------- | ------------- | ---------- | ----- |
| 2026-06-27 | explain-your-complex-job-simply-using-chatgpt | student | <url> | first post |
```

---

## Quick-start: do your first one in the next 30 minutes

1. Open `explain-your-complex-job-simply-using-chatgpt` (Example 1 above) — it's the
   easiest, highest-scoring, most relatable.
2. Run the prompt on your own job. Screen-record it.
3. Read Example 1's script over your recording.
4. Caption it, hashtag it, post it.
5. Paste the TikTok link into the workflow's `tiktokUrl`, log it, push.

Then come back tomorrow and pick the next one. That's the routine.
