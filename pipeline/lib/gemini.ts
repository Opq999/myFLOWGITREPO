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

let lastCallAt = 0;

/**
 * Calls Gemini (free tier) and parses a strict-JSON response.
 * Throttled to free-tier RPM; one retry after 60s on 429.
 */
export async function geminiJson<T>(prompt: string): Promise<T> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error(
      'GEMINI_API_KEY not set. Create a free key at https://aistudio.google.com and export it (or add it as a GitHub secret).'
    );
  }

  const wait = lastCallAt + GEMINI_MS_BETWEEN_CALLS - Date.now();
  if (wait > 0) await sleep(wait);

  const url = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent?key=${apiKey}`;
  const body = JSON.stringify({
    contents: [{ parts: [{ text: prompt }] }],
    generationConfig: { responseMimeType: 'application/json', temperature: 0.2 },
  });

  for (let attempt = 0; attempt < 2; attempt++) {
    lastCallAt = Date.now();
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body,
    });
    if (res.status === 429) {
      if (attempt === 0) {
        await sleep(60_000);
        continue;
      }
      throw new Error('Gemini rate limit (429) persisted after retry — reduce caps or spacing.');
    }
    if (!res.ok) {
      throw new Error(`Gemini API error ${res.status}: ${(await res.text()).slice(0, 300)}`);
    }
    const data = (await res.json()) as {
      candidates?: { content?: { parts?: { text?: string }[] } }[];
    };
    const text = data.candidates?.[0]?.content?.parts?.map((p) => p.text ?? '').join('') ?? '';
    if (!text) throw new Error('Gemini returned an empty response.');
    return JSON.parse(extractJson(text)) as T;
  }
  throw new Error('unreachable');
}
