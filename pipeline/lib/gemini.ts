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
 * Attempt order is model-major: exhaust the best model across EVERY key before
 * downgrading to the next model — so quality stays high as long as any key has
 * quota. A persistent cursor means a (model, key) pair spent for the run isn't
 * retried on every subsequent call.
 */
let attempts: { model: string; keyIndex: number }[] | null = null;
let cursor = 0;

function buildAttempts(keyCount: number): { model: string; keyIndex: number }[] {
  const list: { model: string; keyIndex: number }[] = [];
  for (const model of FALLBACK_MODELS) {
    for (let k = 0; k < keyCount; k++) list.push({ model, keyIndex: k });
  }
  return list;
}

export function currentModel(): string {
  if (!attempts || attempts.length === 0) return FALLBACK_MODELS[0];
  return attempts[Math.min(cursor, attempts.length - 1)].model;
}

const RATE_LIMITED = Symbol('rate-limited');

let lastCallAt = 0;

/** Retries connection-level failures (DNS, timeouts, flaky links) with backoff. */
async function fetchWithRetry(url: string, init: RequestInit): Promise<Response> {
  const delaysMs = [5_000, 20_000, 60_000];
  for (let attempt = 0; ; attempt++) {
    try {
      return await fetch(url, init);
    } catch (err) {
      if (attempt >= delaysMs.length) throw err;
      console.warn(`[gemini] network error, retrying in ${delaysMs[attempt] / 1000}s…`);
      await sleep(delaysMs[attempt]);
    }
  }
}

async function callModel(model: string, body: string, apiKey: string): Promise<string | typeof RATE_LIMITED> {
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;
  // One short retry clears a transient per-minute spike; a persisting 429 means
  // this key/model is daily-exhausted, so rotate quickly to the next pair
  // instead of burning minutes backing off (cheap now that we have many pairs).
  const backoffsMs = [12_000];
  for (let attempt = 0; ; attempt++) {
    const wait = lastCallAt + GEMINI_MS_BETWEEN_CALLS - Date.now();
    if (wait > 0) await sleep(wait);
    lastCallAt = Date.now();

    const res = await fetchWithRetry(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body,
    });
    if (res.status === 429 || res.status === 503) {
      if (attempt < backoffsMs.length) {
        await sleep(backoffsMs[attempt]);
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
 * Calls Gemini (free tier) and parses a strict-JSON response. Throttled to
 * free-tier RPM; rotates across the (model × key) matrix on persistent rate
 * limits or bad keys, and only gives up when every pair is exhausted.
 */
export async function geminiJson<T>(prompt: string): Promise<T> {
  const keys = getApiKeys();
  if (keys.length === 0) {
    throw new Error(
      'GEMINI_API_KEY not set. Create a free key at https://aistudio.google.com and export it (or add it as a GitHub secret). Add more as GEMINI_API_KEY_2, _3, … to raise the free quota.'
    );
  }
  if (attempts === null) attempts = buildAttempts(keys.length);

  const body = JSON.stringify({
    contents: [{ parts: [{ text: prompt }] }],
    generationConfig: { responseMimeType: 'application/json', temperature: 0.2 },
  });

  while (cursor < attempts.length) {
    const { model, keyIndex } = attempts[cursor];
    try {
      const result = await callModel(model, body, keys[keyIndex]);
      if (result !== RATE_LIMITED) return JSON.parse(extractJson(result)) as T;
    } catch (err) {
      // A bad/invalid key (4xx) shouldn't kill the run — skip it and rotate on.
      const msg = err instanceof Error ? err.message : String(err);
      if (!/Gemini API error 4/.test(msg)) throw err;
      console.warn(`[gemini] key ${keyIndex + 1} on ${model} errored (${msg.slice(0, 80)}) — skipping`);
    }
    cursor++;
    if (cursor < attempts.length) {
      const next = attempts[cursor];
      console.warn(
        `[gemini] ${model} (key ${keyIndex + 1}) unavailable — switching to ${next.model} (key ${next.keyIndex + 1} of ${keys.length})`
      );
    }
  }
  throw new GeminiQuotaError();
}
