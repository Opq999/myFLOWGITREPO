import { GEMINI_MODEL, GEMINI_MS_BETWEEN_CALLS } from '../sources.config';
import { sleep } from './utils';

/** Strips markdown fences / surrounding prose and returns the first JSON object. */
export function extractJson(text: string): string {
  const cleaned = text.replace(/```(?:json)?/g, '');
  const start = cleaned.indexOf('{');
  const end = cleaned.lastIndexOf('}');
  if (start === -1 || end === -1 || end <= start) {
    throw new Error(`No JSON object found in model output: ${text.slice(0, 200)}`);
  }
  return cleaned.slice(start, end + 1);
}

/** Thrown when every fallback model is rate-limited — callers should stop the run gracefully. */
export class GeminiQuotaError extends Error {
  constructor() {
    super('All Gemini models are rate-limited (free-tier quota likely exhausted for today).');
    this.name = 'GeminiQuotaError';
  }
}

/**
 * Each model has its own free-tier quota pool; when one is exhausted (429
 * persisting after backoff) we move to the next and stay there for the run.
 */
const FALLBACK_MODELS = [...new Set([GEMINI_MODEL, 'gemini-2.5-flash-lite', 'gemini-2.0-flash'])];
let modelIndex = 0;

export function currentModel(): string {
  return FALLBACK_MODELS[modelIndex];
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
  // 429 backoff schedule within a single model before declaring it exhausted.
  const backoffsMs = [30_000, 60_000];
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
 * free-tier RPM; falls back across models on persistent rate limits.
 */
export async function geminiJson<T>(prompt: string): Promise<T> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error(
      'GEMINI_API_KEY not set. Create a free key at https://aistudio.google.com and export it (or add it as a GitHub secret).'
    );
  }

  const body = JSON.stringify({
    contents: [{ parts: [{ text: prompt }] }],
    generationConfig: { responseMimeType: 'application/json', temperature: 0.2 },
  });

  while (modelIndex < FALLBACK_MODELS.length) {
    const model = FALLBACK_MODELS[modelIndex];
    const result = await callModel(model, body, apiKey);
    if (result === RATE_LIMITED) {
      modelIndex++;
      if (modelIndex < FALLBACK_MODELS.length) {
        console.warn(`[gemini] ${model} rate-limited — switching to ${FALLBACK_MODELS[modelIndex]}`);
      }
      continue;
    }
    return JSON.parse(extractJson(result)) as T;
  }
  throw new GeminiQuotaError();
}
