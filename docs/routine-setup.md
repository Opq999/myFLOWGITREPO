# Set up the daily TikTok script as a Claude Code Routine

A **Routine** runs on Anthropic's cloud on a schedule — it keeps working when your
laptop and browser are closed. This is the proper home for the daily 9 AM script
(unlike an in-session timer, which dies when the session ends).

Docs: https://code.claude.com/docs/en/routines

## One-time setup (~3 minutes)

1. Go to **https://claude.ai/code/routines** and click **New routine**.
   (Or in a terminal Claude session: `/schedule daily TikTok script at 9am`.)
2. **Name:** `Daily TikTok script`
3. **Prompt:** paste the block in [The routine prompt](#the-routine-prompt) below.
4. **Repositories:** select `Opq999/myFLOWGITREPO`.
5. **Environment:** `Default` (Trusted network) is fine — it allows pip/package
   registries, and this routine only reads local workflow files. No custom domains needed.
6. **Trigger → Schedule:** choose **Daily**, set the time to **9:00 AM** in your own
   timezone (the UI converts automatically; runs may start a few minutes late due to stagger).
7. **Permissions:** leave defaults. The routine pushes to the `claude/nifty-davinci-rfx1u2`
   branch, which is already `claude/`-prefixed, so **no** "unrestricted branch pushes" is needed.
8. Click **Create**. Use **Run now** on the detail page to test it immediately.

Each run shows up as its own session at claude.ai/code, where the Word doc is attached
and also committed to `docs/scripts/` in the repo.

## The routine prompt

```text
You generate ONE daily TikTok script for the OPQAI workflow library (opqai.solutions).

1. Check out the working branch:
   git fetch origin claude/nifty-davinci-rfx1u2
   git checkout claude/nifty-davinci-rfx1u2
   git pull origin claude/nifty-davinci-rfx1u2
   (This branch has the generator script and the posting log.)
2. Install the doc tool: pip install python-docx -q
3. Pick ONE workflow AT RANDOM from src/content/workflows/*.mdx whose slug is NOT
   already listed in docs/posting-log.md. Read that .mdx file fully.
4. Write a 60-90 second TikTok script for it:
   - 0-3s hook using one of its nigeriaUseCases as the angle (rotate persona daily)
   - the EXACT copy-paste prompt from its Steps, shown big
   - a react/payoff beat showing the real output
   - a CTA to opqai.solutions (link in bio)
   Be honest about any "Common pitfall" from its Notes.
5. Create a JSON file matching the schema documented at the top of
   scripts/make-tiktok-script-doc.py. Fields: day (today's date written out), title,
   url = https://opqai.solutions/workflows/<slug>, slug, meta (timeMinutes/difficulty/
   pricing/score), why, beats[] (label, direction, say, optional prompt), caption, hashtags.
6. Run: python3 scripts/make-tiktok-script-doc.py <that.json>
   It writes docs/scripts/<date>-<slug>.docx
7. Send the .docx to me with SendUserFile (status proactive, caption naming the workflow).
8. Append a row to docs/posting-log.md: today's date, the slug, the persona angle,
   and a blank TikTok URL for me to fill after posting.
9. Commit the new .docx and updated docs/posting-log.md and push to
   claude/nifty-davinci-rfx1u2 (git push -u origin claude/nifty-davinci-rfx1u2).
Keep your reply short: just say which workflow you picked and that the Word doc is attached.
```

## Notes

- **Why this branch:** all the tooling (the generator + the posting log that prevents
  repeats) lives on `claude/nifty-davinci-rfx1u2`. The routine checks it out each run so
  every script accumulates in one place and no workflow repeats.
- **Usage:** routine runs draw down your normal subscription usage and there's a daily
  routine-run cap per account — one run a day is well within it.
- **To change the time, pause, or edit the prompt:** open the routine at
  claude.ai/code/routines and click the pencil icon, or run `/schedule update` in a terminal session.
- **To get one right now without waiting:** click **Run now**, or just message me
  "today's script" in a session.
```
