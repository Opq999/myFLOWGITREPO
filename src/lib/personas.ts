import type { Persona } from './workflow-schema';

export interface PersonaMeta {
  label: string;
  emoji: string;
}

/**
 * Display metadata for the four Nigerian personas. Emojis are chosen to NOT
 * collide with the category emojis (🎓 academic, 💼 freelancing, 🏪 SME) so a
 * persona chip and a category chip never look identical on the same page.
 * Persona is an axis orthogonal to category, who a workflow serves, not its topic.
 */
export const PERSONA_META: Record<Persona, PersonaMeta> = {
  student: { label: 'Student', emoji: '📚' },
  entrepreneur: { label: 'Entrepreneur', emoji: '💡' },
  'small-business': { label: 'Small business', emoji: '🛒' },
  employee: { label: '9-5 employee', emoji: '🧑‍💼' },
};
