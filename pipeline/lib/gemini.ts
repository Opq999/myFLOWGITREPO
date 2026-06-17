import { GEMINI_MODEL, GEMINI_MS_BETWEEN_CALLS } from '../sources.config';
import { sleep } from './utils';

/**
 * Returns the first JSON object in the model output by slicing from the first
 * `{` to the last `}`. This tolerates a ```` ```json ```` wrapper without a
 * global fence strip — stripping all fences would also destroy the code blocks
 * inside the drafted body string (the bug that left workflows with bare `bash`
 * lines and crashed MDX on placeholders like `<session-id>`).
 */
export function extractJson(text: string): string {
  const start = text.indexOf('{');
  const end = text.lastIndexOf('}');
  if (start === -1 || end === -1 || end <= start) {
    throw new Error(`No JSON object found in model output: ${text.slice(0, 200)}`);
  }
  return text.slice(start, end + 1);
}

/** Thrown when every fallback model is rate-limited — callers should stop the run gracefully. */
export class GeminiQuotaError extends Error {
  constructor() {
    super('All Gemini models are rate-limited (free-tier quota likely exhausted for today).');
    this.name = 'GeminiQuotaError';
  }
}

const FALLBACK_MODELS = [...new Set([GEMINI_MODEL, 'gemini-2.5-flash-lite', 'gemini-2.0-flash'])];

/**
 * Every free-tier API key carries its own independent daily + per-minute quota,
 * so rotating across several keys multiplies the effective free ceiling at $0.
 * Supply them via GEMINI_API_KEY plus optional GEMINI_API_KEY_2..6, and/or a
 * comma-separated GEMINI_API_KEYS. Duplicates are ignored.
 */
export function getApiKeys(): string[] {
  const keys: string[] = [];
  const add = (v?: string) => {
    if (!v) return;
    for (const k of v.split(',').map((s) => s.trim()).filter(Boolean)) {
      if (!keys.includes(k)) keys.push(k);
    }
  };
  add(process.env.GEMINI_API_KEYS);
  for (const name of [
    'GEMINI_API_KEY',
    'GEMINI_API_KEY_2',
    'GEMINI_API_KEY_3',
    'GEMINI_API_KEY_4',
    'GEMINI_API_KEY_5',
    'GEMINI_API_KEY_6',
  ]) {
    add(process.env[name]);
  }
  return keys;
}

/**
 * A 429 is almost always a per-MINUTE limit (free tier is ~10-15 RPM per key),
 * not the daily cap. So we don't retire a (model, key) pair on a 429 — we put it
 * on a short cooldown and round-robin to the next key. With several keys, while
 * one cools the others keep working, so we use each key's full DAILY quota
 * instead of throwing ~240 calls/key away on the first per-minute spike.
 */
const RPM_COOLDOWN_MS = 65_000;
const cooldownUntil = new Map<string, number>(); // `${model}:${keyIndex}` -> ts
let rrPointer = 0; // round-robin start, advanced after each success to spread load

function pairKey(model: string, k: number): string {
  return `${model}:${k}`;
}
function available(model: string, k: number): boolean {
  return Date.now() >= (cooldownUntil.get(pairKey(model, k)) ?? 0);
}
function cool(model: string, k: number, ms: number): void {
  cooldownUntil.set(pairKey(model, k), Date.now() + ms);
}

export function currentModel(): string {
  return FALLBACK_MODELS[0];
}

const RATE_LIMITED = Symbol('rate-limited');

let lastCallAt = 0;

/** Retries connection-level failures (DNS, timeouts, flaky links) with backoff. */
async function fetchWithRetry(url: string, init: Omit<RequestInit, 'signal'>): Promise<Response> {
  const delaysMs = [5_000, 20_000, 60_000];
  for (let attempt = 0; ; attempt++) {
    try {
      // Fresh AbortSignal per attempt — a timed-out signal can't be reused.
      return await fetch(url, { ...init, signal: AbortSignal.timeout(90_000) });
    } catch (err) {
      if (attempt >= delaysMs.length) throw err;
      console.warn(`[gemini] network error, retrying in ${delaysMs[attempt] / 1000}s…`);
      await sleep(delaysMs[attempt]);
    }
  }
}

async function callModel(model: string, body: string, apiKey: string): Promise<string | typeof RATE_LIMITED> {
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;
  for (let attempt = 0; ; attempt++) {
    const wait = lastCallAt + GEMINI_MS_BETWEEN_CALLS - Date.now();
    if (wait > 0) await sleep(wait);
    lastCallAt = Date.now();

    const res = await fetchWithRetry(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body,
    });
    // 429 = rate limit (usually per-minute): the caller cools this key and
    // rotates to the next one immediately — no point sleeping here.
    if (res.status === 429) return RATE_LIMITED;
    // 503 = transient overload: one quick retry, then rotate.
    if (res.status === 503) {
      if (attempt === 0) {
        await sleep(8_000);
        continue;
      }
      return RATE_LIMITED;
    }
    if (!res.ok) {
      throw new Error(`Gemini API error ${res.status}: ${(await res.text()).slice(0, 300)}`);
    }
    const data = (await res.json()) as {
      candidates?: { content?: { parts?: { text?: string }[] } }[];
    };
    const text = data.candidates?.[0]?.content?.parts?.map((p) => p.text ?? '').join('') ?? '';
    if (!text) throw new Error('Gemini returned an empty response.');
    return text;
  }
}

/**
 * Calls Gemini (free tier) and parses a strict-JSON response. Round-robins
 * across all keys (best model first) so no single key bunches against its
 * per-minute limit; a 429 just cools that key briefly. Only when EVERY
 * (model, key) pair is cooling — and a wait-and-retry still gets nothing — do
 * we conclude the daily quota is truly spent.
 */
export async function geminiJson<T>(prompt: string): Promise<T> {
  const keys = getApiKeys();
  if (keys.length === 0) {
    throw new Error(
      'GEMINI_API_KEY not set. Create a free key at https://aistudio.google.com and export it (or add it as a GitHub secret). Add more as GEMINI_API_KEY_2, _3, … to raise the free quota.'
    );
  }

  const body = JSON.stringify({
    contents: [{ parts: [{ text: prompt }] }],
    generationConfig: { responseMimeType: 'application/json', temperature: 0.2 },
  });

  // `stall` counts forced waits with zero progress; two in a row ⇒ give up.
  for (let stall = 0; stall <= 1; ) {
    for (const model of FALLBACK_MODELS) {
      for (let i = 0; i < keys.length; i++) {
        const k = (rrPointer + i) % keys.length;
        if (!available(model, k)) continue;
        try {
          const result = await callModel(model, body, keys[k]);
          if (result !== RATE_LIMITED) {
            rrPointer = (k + 1) % keys.length; // spread the next call onto another key
            return JSON.parse(extractJson(result)) as T;
          }
          cool(model, k, RPM_COOLDOWN_MS);
        } catch (err) {
          // A bad/invalid key (4xx) shouldn't kill the run — sideline it for the run.
          const msg = err instanceof Error ? err.message : String(err);
          if (!/Gemini API error 4/.test(msg)) throw err;
          console.warn(`[gemini] key ${k + 1} on ${model} errored (${msg.slice(0, 80)}) — sidelining`);
          cool(model, k, 24 * 60 * 60 * 1000);
        }
      }
    }
    // Every pair is cooling. If a cooldown expires soon, wait it out once and
    // retry — that's a per-minute spike clearing. If not, the day is done.
    const soonest = Math.min(...cooldownUntil.values());
    const waitMs = soonest - Date.now();
    if (waitMs > 0 && waitMs <= RPM_COOLDOWN_MS + 5_000) {
      console.warn(`[gemini] all keys cooling — waiting ${Math.ceil(waitMs / 1000)}s for the per-minute window to clear`);
      await sleep(waitMs + 1_000);
      stall++;
      continue;
    }
    break;
  }
  throw new GeminiQuotaError();
}
