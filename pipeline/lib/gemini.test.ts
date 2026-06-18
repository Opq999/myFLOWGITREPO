import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { extractJson, getApiKeys, parseModelJson } from './gemini';

describe('extractJson', () => {
  it('parses plain JSON', () => {
    expect(JSON.parse(extractJson('{"a": 1}'))).toEqual({ a: 1 });
  });

  it('strips markdown fences', () => {
    const text = '```json\n{"score": 8, "reason": "good"}\n```';
    expect(JSON.parse(extractJson(text))).toEqual({ score: 8, reason: 'good' });
  });

  it('ignores prose around the object', () => {
    const text = 'Here is the result:\n{"ok": true}\nHope that helps!';
    expect(JSON.parse(extractJson(text))).toEqual({ ok: true });
  });

  it('handles nested braces', () => {
    const text = '{"outer": {"inner": [1, 2]}}';
    expect(JSON.parse(extractJson(text))).toEqual({ outer: { inner: [1, 2] } });
  });

  it('throws on output with no JSON object', () => {
    expect(() => extractJson('sorry, I cannot do that')).toThrow(/No JSON object/);
  });

  it('preserves code fences inside string values (regression: stripped fences broke MDX)', () => {
    const text = '{"body": "Run this:\\n```bash\\ncband continue <id>\\n```"}';
    const parsed = JSON.parse(extractJson(text)) as { body: string };
    expect(parsed.body).toContain('```bash');
    expect(parsed.body).toContain('cband continue <id>');
  });
});

describe('parseModelJson', () => {
  it('parses a valid object the same as JSON.parse', () => {
    expect(parseModelJson('{"score": 8, "body": "ok"}')).toEqual({ score: 8, body: 'ok' });
  });

  it('tolerates fences/prose around the object', () => {
    expect(parseModelJson('```json\n{"ok": true}\n```')).toEqual({ ok: true });
  });

  it('quotes the offending text window when JSON is malformed', () => {
    // Unescaped double-quote inside a string value — the recurring draft failure.
    const bad = '{"a": 1, "body": "he said "hi" to me", "c": 2}';
    let caught: Error | undefined;
    try {
      parseModelJson(bad);
    } catch (e) {
      caught = e as Error;
    }
    expect(caught).toBeDefined();
    // Error must point at the malformation, not just an opaque char offset.
    expect(caught!.message).toMatch(/offending JSON near:/);
    expect(caught!.message).toContain('hi');
  });
});

describe('getApiKeys', () => {
  const KEY_VARS = [
    'GEMINI_API_KEYS',
    'GEMINI_API_KEY',
    'GEMINI_API_KEY_2',
    'GEMINI_API_KEY_3',
    'GEMINI_API_KEY_4',
    'GEMINI_API_KEY_5',
    'GEMINI_API_KEY_6',
  ];
  let saved: Record<string, string | undefined>;

  beforeEach(() => {
    saved = Object.fromEntries(KEY_VARS.map((k) => [k, process.env[k]]));
    for (const k of KEY_VARS) delete process.env[k];
  });
  afterEach(() => {
    for (const k of KEY_VARS) {
      if (saved[k] === undefined) delete process.env[k];
      else process.env[k] = saved[k];
    }
  });

  it('returns [] when no key is set', () => {
    expect(getApiKeys()).toEqual([]);
  });

  it('collects the primary key plus numbered keys', () => {
    process.env.GEMINI_API_KEY = 'a';
    process.env.GEMINI_API_KEY_2 = 'b';
    process.env.GEMINI_API_KEY_3 = 'c';
    expect(getApiKeys()).toEqual(['a', 'b', 'c']);
  });

  it('parses the comma-separated GEMINI_API_KEYS and de-duplicates', () => {
    process.env.GEMINI_API_KEYS = 'a, b ,c';
    process.env.GEMINI_API_KEY = 'a'; // duplicate of one already collected
    expect(getApiKeys()).toEqual(['a', 'b', 'c']);
  });
});
