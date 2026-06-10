import { describe, expect, it } from 'vitest';
import { extractJson } from './gemini';

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
});
