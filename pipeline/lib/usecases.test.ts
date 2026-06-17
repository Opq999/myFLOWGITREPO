import { describe, expect, it } from 'vitest';
import { sanitizeUseCases } from './usecases';

describe('sanitizeUseCases', () => {
  it('keeps valid persona-tagged entries', () => {
    const out = sanitizeUseCases({
      useCases: [{ persona: 'student', scenario: 'Turn your lecture slides into a practice quiz.' }],
    });
    expect(out).toEqual([
      { persona: 'student', scenario: 'Turn your lecture slides into a practice quiz.' },
    ]);
  });

  it('drops entries with an unknown persona', () => {
    const out = sanitizeUseCases({
      useCases: [
        { persona: 'investor', scenario: 'A scenario that is plenty long enough.' },
        { persona: 'student', scenario: 'A genuinely valid scenario goes here.' },
      ],
    });
    expect(out.map((c) => c.persona)).toEqual(['student']);
  });

  it('dedupes repeated personas (first wins) and caps the list at 3', () => {
    const out = sanitizeUseCases({
      useCases: [
        { persona: 'student', scenario: 'First student scenario, long enough.' },
        { persona: 'student', scenario: 'Second student scenario, long enough.' },
        { persona: 'entrepreneur', scenario: 'Entrepreneur scenario, long enough.' },
        { persona: 'small-business', scenario: 'Small-business scenario, long enough.' },
        { persona: 'employee', scenario: 'Employee scenario, long enough.' },
      ],
    });
    expect(out.length).toBe(3);
    expect(new Set(out.map((c) => c.persona)).size).toBe(3);
    expect(out[0].persona).toBe('student');
  });

  it('drops too-short scenarios and trims + caps long ones at 240 chars', () => {
    const long = 'x'.repeat(300);
    const out = sanitizeUseCases({
      useCases: [
        { persona: 'student', scenario: 'short' },
        { persona: 'employee', scenario: `  ${long}  ` },
      ],
    });
    expect(out.length).toBe(1);
    expect(out[0].persona).toBe('employee');
    expect(out[0].scenario.length).toBe(240);
  });

  it('returns [] for malformed input', () => {
    expect(sanitizeUseCases(null)).toEqual([]);
    expect(sanitizeUseCases({})).toEqual([]);
    expect(sanitizeUseCases({ useCases: 'nope' })).toEqual([]);
    expect(sanitizeUseCases({ useCases: [42, { persona: 'student' }] })).toEqual([]);
  });
});
