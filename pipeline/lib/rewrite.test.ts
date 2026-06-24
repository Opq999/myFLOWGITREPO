import { describe, expect, it } from 'vitest';
import { sanitizeRewrite } from './rewrite';

const goodBody = `## What you'll get\n\nA clear, concrete outcome described in enough plain words to comfortably clear the minimum length bar this sanitizer enforces for a real, substantial rewritten body that a beginner could actually follow without getting stuck anywhere.\n\n## Steps\n\n1. Do the first thing, then check you can see the expected result before moving on.`;

describe('sanitizeRewrite', () => {
  it('keeps a substantial body and a valid difficulty', () => {
    const out = sanitizeRewrite({ mode: 'recipe', difficulty: 'advanced', body: goodBody }, 'beginner');
    expect(out).toEqual({ mode: 'recipe', difficulty: 'advanced', body: goodBody.trim() });
  });

  it('falls back to the current difficulty when the model omits or mangles it', () => {
    expect(sanitizeRewrite({ body: goodBody }, 'intermediate')?.difficulty).toBe('intermediate');
    expect(sanitizeRewrite({ difficulty: 'wizard', body: goodBody }, 'beginner')?.difficulty).toBe('beginner');
  });

  it('defaults mode to recipe when missing or unknown', () => {
    expect(sanitizeRewrite({ body: goodBody }, 'beginner')?.mode).toBe('recipe');
    expect(sanitizeRewrite({ mode: 'essay', body: goodBody }, 'beginner')?.mode).toBe('recipe');
    expect(sanitizeRewrite({ mode: 'concept', body: goodBody }, 'beginner')?.mode).toBe('concept');
  });

  it('rejects a body that is too short or has no H2 sections', () => {
    expect(sanitizeRewrite({ body: 'too short' }, 'beginner')).toBeNull();
    expect(sanitizeRewrite({ body: 'x'.repeat(400) }, 'beginner')).toBeNull();
  });

  it('returns null for malformed input', () => {
    expect(sanitizeRewrite(null, 'beginner')).toBeNull();
    expect(sanitizeRewrite('nope', 'beginner')).toBeNull();
    expect(sanitizeRewrite({}, 'beginner')).toBeNull();
    expect(sanitizeRewrite({ body: 42 }, 'beginner')).toBeNull();
  });
});
