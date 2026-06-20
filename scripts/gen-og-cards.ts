/**
 * Renders the OPQAI social cards to PNG with the cached Playwright Chromium:
 *   public/og-default.png      - site-level default (homepage + fallback)
 *   public/og/<slug>.png       - one certificate per published workflow
 *
 * These are committed as static assets. The astro-og-canvas route
 * (src/pages/og/[...route].ts) only generates a card for workflows that do
 * NOT have a committed certificate, so brand-new daily workflows still get a
 * (plain) card automatically, and nothing here ever runs in the CI build.
 *
 *   npm run og        # regenerate after adding/redesigning workflows
 *
 * Chromium is auto-detected from the local Playwright cache; override with
 * OG_CHROMIUM=/path/to/chrome.
 */
import { chromium } from 'playwright-core';
import { readFileSync, readdirSync, mkdirSync, existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { join } from 'node:path';
import { parse as parseYaml } from 'yaml';
import { extractSteps } from '../src/lib/steps';
import { certificateHtml } from './lib/certificate.mjs';

const ROOT = fileURLToPath(new URL('..', import.meta.url));

function findChromium(): string {
  if (process.env.OG_CHROMIUM) return process.env.OG_CHROMIUM;
  const cache = join(process.env.LOCALAPPDATA || '', 'ms-playwright');
  const dirs = existsSync(cache)
    ? readdirSync(cache)
        .filter((d) => /^chromium-\d+$/.test(d))
        .sort((a, b) => Number(b.split('-')[1]) - Number(a.split('-')[1]))
    : [];
  for (const d of dirs) {
    for (const exe of ['chrome-win64/chrome.exe', 'chrome-linux/chrome', 'chrome-mac/Chromium.app/Contents/MacOS/Chromium']) {
      const p = join(cache, d, exe);
      if (existsSync(p)) return p;
    }
  }
  throw new Error('No cached Chromium found. Set OG_CHROMIUM to a chrome executable, or run: npx playwright install chromium');
}

const PLATFORM: Record<string, string> = {
  hackernews: 'Hacker News',
  reddit: 'Reddit',
  youtube: 'YouTube',
  github: 'GitHub',
  blog: 'Blog',
  twitter: 'Twitter',
  other: 'Web',
};

const esc = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

/** Decorative but stable per-workflow catalog number. */
function entryNo(id: string): string {
  let h = 0;
  for (const c of id) h = (h * 31 + c.charCodeAt(0)) >>> 0;
  return String((h % 999) + 1).padStart(3, '0');
}

/** Shrink the display title so long names still clear the seal and footer. */
function titleSize(t: string): number {
  const n = t.length;
  if (n <= 42) return 62;
  if (n <= 60) return 54;
  if (n <= 85) return 48;
  return 42;
}

const defaultHtml = certificateHtml({
  kicker: 'Certified reproducible · the living library',
  title: 'AI workflows that<br>actually get work done',
  stampText: '· PROVEN BY A HUMAN · PROVEN BY A HUMAN ',
  footer: [
    { label: 'Steps · exact' },
    { label: 'Prompts · copy-paste' },
    { label: 'Source · real humans' },
    { label: 'Cost · ₦0 forever', accent: true },
  ],
});

type Card = { id: string; title: string; score: number; platform: string; steps: number; free: boolean };

function cardHtml(c: Card): string {
  return certificateHtml({
    kicker: `Certified reproducible · entry №${entryNo(c.id)}`,
    title: esc(c.title),
    titleSize: titleSize(c.title),
    stampText: `· PROVEN BY A HUMAN · SCORE ${c.score.toFixed(1)} `.repeat(2),
    footer: [
      { label: `Source · ${PLATFORM[c.platform] ?? c.platform}` },
      { label: `Steps · ${c.steps}` },
      { label: `Tools · ${c.free ? 'free' : 'mixed'}` },
      { label: 'Cost · ₦0 forever', accent: true },
    ],
  });
}

function readWorkflows(): Card[] {
  const dir = join(ROOT, 'src', 'content', 'workflows');
  const cards: Card[] = [];
  for (const f of readdirSync(dir).filter((f) => f.endsWith('.mdx'))) {
    const raw = readFileSync(join(dir, f), 'utf8');
    const m = raw.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n([\s\S]*)$/);
    if (!m) continue;
    const data = parseYaml(m[1]) as any;
    if (data.published === false) continue;
    const tools = Array.isArray(data.tools) ? data.tools : [];
    cards.push({
      id: f.replace(/\.mdx$/, ''),
      title: String(data.title),
      score: Number(data.score),
      platform: String(data.source?.platform ?? 'other'),
      steps: extractSteps(m[2]).length,
      free: tools.every((t: any) => t.pricing !== 'paid'),
    });
  }
  return cards.sort((a, b) => a.id.localeCompare(b.id));
}

const cards = readWorkflows();
mkdirSync(join(ROOT, 'public', 'og'), { recursive: true });

// `--missing` only renders cards that don't exist yet (top up new workflows
// without rewriting the existing committed PNGs).
const onlyMissing = process.argv.includes('--missing');

const browser = await chromium.launch({ executablePath: findChromium(), headless: true });
const page = await browser.newPage({ viewport: { width: 1200, height: 630 }, deviceScaleFactor: 1 });

async function render(html: string, out: string) {
  if (onlyMissing && existsSync(out)) return false;
  await page.setContent(html, { waitUntil: 'load' });
  await page.evaluate(() => (document as any).fonts.ready);
  await page.screenshot({ path: out, clip: { x: 0, y: 0, width: 1200, height: 630 } });
  return true;
}

await render(defaultHtml, join(ROOT, 'public', 'og-default.png'));
let rendered = 0;
for (const c of cards) {
  if (await render(cardHtml(c), join(ROOT, 'public', 'og', `${c.id}.png`))) rendered++;
  if (rendered && rendered % 20 === 0) console.log(`  ${rendered}`);
}
await browser.close();
console.log(`Rendered ${rendered} card(s)${onlyMissing ? ' (missing only)' : ''} of ${cards.length}.`);
