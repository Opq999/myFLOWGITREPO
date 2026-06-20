/**
 * Shared OPQAI "Certificate" social-card template (Card A / "The Stamp").
 * Produces a full 1200x630 HTML document with the site fonts inlined so it
 * renders identically in any Chromium. Used by:
 *   - scripts/gen-og.mjs        -> the site-level default card
 *   - scripts/gen-og-cards.ts   -> one card per published workflow
 *
 * Tokens mirror src/styles/global.css; layout mirrors the locked design in
 * design_handoff_brand_marks/reference (lane 01, "The Stamp").
 */
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..', '..');
const b64 = (f) => readFileSync(join(ROOT, 'public', 'fonts', f)).toString('base64');
const FRAUNCES = b64('fraunces-var.woff2');
const HANKEN = b64('hanken-grotesk-var.woff2');

const GRAIN =
  "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='160' height='160'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='2'/%3E%3CfeColorMatrix values='0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0.03 0'/%3E%3C/filter%3E%3Crect width='160' height='160' filter='url(%23n)'/%3E%3C/svg%3E";
const MONO = "'SFMono-Regular',ui-monospace,Menlo,Consolas,monospace";

/**
 * @param {object} o
 * @param {string} o.kicker     mono coral line above the title
 * @param {string} o.title      Fraunces display title (may contain <br>)
 * @param {string} o.stampText  curved micro-text repeated around the seal
 * @param {{label:string,accent?:boolean}[]} o.footer  footer fields
 * @param {number} [o.titleSize=62]
 */
export function certificateHtml(o) {
  return `<!doctype html><html><head><meta charset="utf-8"><style>
  @font-face{font-family:'Fraunces';font-weight:300 900;src:url(data:font/woff2;base64,${FRAUNCES}) format('woff2');}
  @font-face{font-family:'Hanken Grotesk';font-weight:300 800;src:url(data:font/woff2;base64,${HANKEN}) format('woff2');}
  *{margin:0;padding:0;box-sizing:border-box;}
  html,body{width:1200px;height:630px;overflow:hidden;}
  body{font-family:'Hanken Grotesk',system-ui,sans-serif;}
</style></head><body>
  <div style="width:1200px;height:630px;background:#fbf9f4;position:relative;padding:54px;">
    <div style="position:absolute;inset:0;opacity:.5;pointer-events:none;background-image:url(&quot;${GRAIN}&quot;);"></div>
    <div style="position:relative;height:100%;border:2px solid #d6ccbb;border-radius:6px;padding:46px 56px;display:flex;flex-direction:column;justify-content:space-between;">
      <div style="display:flex;justify-content:space-between;align-items:center;border-bottom:1.5px solid #e8e1d5;padding-bottom:22px;">
        <span style="font-family:'Fraunces',serif;font-weight:600;font-size:30px;letter-spacing:-0.02em;color:#14100d;">OPQAI<span style="color:#ff4d2e;">.</span></span>
        <span style="font-family:${MONO};font-size:15px;font-weight:700;letter-spacing:0.2em;text-transform:uppercase;color:#8c8377;">Bureau of reproducible work</span>
      </div>
      <div style="position:relative;">
        <div style="font-family:${MONO};font-size:16px;font-weight:700;letter-spacing:0.16em;text-transform:uppercase;color:#ff4d2e;margin-bottom:16px;">${o.kicker}</div>
        <h1 style="font-family:'Fraunces',serif;font-weight:600;font-size:${o.titleSize ?? 62}px;line-height:1.02;letter-spacing:-0.025em;color:#14100d;max-width:700px;">${o.title}</h1>
        <svg width="240" height="240" viewBox="0 0 200 200" style="position:absolute;right:-6px;top:-78px;transform:rotate(-13deg);opacity:.86;">
          <defs><path id="ring1" d="M100,100 m-74,0 a74,74 0 1,1 148,0 a74,74 0 1,1 -148,0"/></defs>
          <circle cx="100" cy="100" r="90" fill="none" stroke="#ff4d2e" stroke-width="3"/>
          <circle cx="100" cy="100" r="64" fill="none" stroke="#ff4d2e" stroke-width="2"/>
          <text font-family="${MONO}" font-size="14.5" font-weight="700" letter-spacing="4" fill="#ff4d2e"><textPath href="#ring1" startOffset="0%">${o.stampText}</textPath></text>
          <path d="M72 100 L92 122 L132 74" fill="none" stroke="#ff4d2e" stroke-width="11" stroke-linecap="round" stroke-linejoin="round"/>
        </svg>
      </div>
      <div style="display:flex;gap:40px;border-top:1.5px solid #e8e1d5;padding-top:22px;font-family:${MONO};font-size:15px;font-weight:600;letter-spacing:0.04em;text-transform:uppercase;color:#564d41;">
        ${o.footer.map((f) => `<span${f.accent ? ' style="color:#ff4d2e;"' : ''}>${f.label}</span>`).join('')}
      </div>
    </div>
  </div>
</body></html>`;
}
