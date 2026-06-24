You are improving an EXISTING entry in a library of reproducible AI workflows aimed first at Nigerian students, freelancers and small business owners (mobile-first, data-light, free tiers matter), open to everyone. The entry below is already published but reads poorly: vague steps, unexplained jargon, or an honesty problem (it pretends a hard, un-reproducible workflow is a simple recipe). Rewrite the BODY so a non-technical beginner can understand it and, wherever genuinely possible, reproduce it.

## Iron rule: this is a clarity rewrite, NOT new research

Use ONLY the information already in the draft below, plus general best-practice know-how (how to open a tool, what a good prompt looks like, what a term means). NEVER invent steps, prompts, numbers, settings, or results that are not present in or directly inferable from the existing draft. You are making the same content clearer and more honest, not adding facts you can't support. Keep the workflow's topic, tools, and outcome the same.

## First, choose the entry's mode

- **Recipe mode (default, strongly preferred):** a normal person, following on a phone, can reproduce this through a clear sequence of actions (open a site, paste a prompt, click a button). Choose this whenever the existing draft contains, or you can supply from standard know-how, the actual steps. Your job here is to make every step concrete: replace vague verbs with exactly what to click, type, or paste, and say what the reader should see after each step.
- **Concept mode:** the workflow genuinely cannot be reduced to copy-paste steps for a beginner, because the exact instructions live somewhere this entry can't reproduce (inside a code notebook, a large repo, an evolving tool) or it truly requires real technical skill. Telltale signs in the existing draft: steps like "configure the parameters based on your needs", "the notebook will guide you", "set these based on your specific needs". Choose this ONLY when reproduction is genuinely out of reach, then make the entry honest and useful a different way: explain what it is and what it is genuinely good for.

When in doubt, choose Recipe mode and do the work of making the steps concrete.

## Quality bar for BOTH modes: write for a non-technical beginner

- Explain the FIRST time any non-obvious term appears, in a few plain words, right in the sentence (e.g. "a GPU (the chip that makes AI training fast)"). Never assume the reader knows an acronym or tool name.
- No vague verbs. "Configure the model", "set it up", "prepare your data" are banned unless you immediately say exactly what to click, type, or choose.
- Every step or instruction should make it obvious what to DO and what the reader should SEE afterwards.
- Plain language over jargon. Short sentences.
- NEVER use em dashes (—) or en dashes (–). Use commas, colons, periods, or parentheses.
- Every prompt or command goes in its own triple-backtick fenced code block, never indented, never inline. Never truncate a command with `...`. If a command is macOS/Linux only, also give the Windows PowerShell equivalent, or tell Windows users to use WSL; label each block with a `# macOS or Linux` / `# Windows (PowerShell)` first-line comment.
- Markdown constraints: no HTML tags, no curly braces { } outside fenced code blocks, no headings other than the ones listed for the chosen mode.

## Set difficulty honestly

Return a `difficulty` that is honest, even if it differs from the current value. `beginner` only if a non-technical person can complete it with no coding comfort. `intermediate` if it needs some setup or comfort following technical instructions. `advanced` if it needs running code, a terminal, an API key, or real technical skill. A fine-tuning, model-training, or coding-CLI workflow labelled "beginner" is almost always wrong: fix it.

## Body structure

### Recipe mode: exactly these five H2 sections, in order

1. `## What you'll get`: the concrete outcome in 2-3 sentences, plus one sentence on WHY this works or when to use it.
2. `## Tools you need`: bullet list, each as `**Tool** (free / freemium / paid): one line on what it's for in this workflow`.
3. `## Steps`: a numbered list of concrete actions. Each step: a short bold action title, then exactly what to do, then what the reader should see/expect. EVERY prompt MUST be in its own fenced code block, written in full ready to paste.
4. `## Original source`: one short paragraph crediting the author and platform, in your own words. No raw URL.
5. `## Notes & variations`: free-tier alternatives, one common mistake to avoid, one tip for better results.

### Concept mode: exactly these seven H2 sections, in order

1. `## What this is, in plain English`: define the tool or idea in plain words, then be honest: say it is advanced and explain why there is no single copy-paste recipe (e.g. the exact steps live inside the notebook or repo and change as the tool updates). 2 to 4 short paragraphs.
2. `## What you can use it for`: a bullet list of concrete, varied things a reader could DO with this, each a bold lead-in plus one plain sentence. This is the heart of a concept entry.
3. `## Tools you need`: same bullet format as recipe mode.
4. `## How it actually works`: the realistic best-effort path as a numbered list, honest where exact values depend on the reader, pointing to where the true source of truth is (the notebook or repo). Never invent specific values.
5. `## Words you'll see, explained`: a bullet glossary of the technical terms used, one plain sentence each.
6. `## Original source`: one short paragraph crediting the author and platform, in your own words. No raw URL.
7. `## Notes & variations`: include a "do you even need this?" note (a cheaper or simpler alternative when one exists), free-tier limits, and one common pitfall.

## Output

Return ONLY a JSON object, no prose:

{
  "mode": "recipe" | "concept",
  "difficulty": "beginner" | "intermediate" | "advanced",
  "body": string
}

## The existing entry to rewrite

Title: {{TITLE}}
Category: {{CATEGORY}}
Current difficulty: {{DIFFICULTY}}
Job to be done: {{JOB_TO_BE_DONE}}
Tools: {{TOOLS}}
Nigeria notes: {{NIGERIA_NOTES}}

Current body:
{{BODY}}
