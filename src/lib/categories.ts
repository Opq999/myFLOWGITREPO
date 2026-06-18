import type { Category } from './workflow-schema';

export interface CategoryMeta {
  label: string;
  blurb: string;
  emoji: string;
}

export const CATEGORY_META: Record<Category, CategoryMeta> = {
  'content-creation': {
    label: 'Content Creation',
    blurb:
      'Turn one piece of content into many, videos into posts, ideas into scripts, drafts into polished work, with AI doing the heavy lifting.',
    emoji: '✍️',
  },
  freelancing: {
    label: 'Freelancing',
    blurb:
      'Win and deliver client work faster: proposals, pricing, project delivery and client communication, all sharpened with AI.',
    emoji: '💼',
  },
  'academic-research': {
    label: 'Academic & Research',
    blurb:
      'Study smarter, summarize lectures, digest papers, prepare for exams and structure research with free AI tools.',
    emoji: '🎓',
  },
  'job-hunting': {
    label: 'Job Hunting',
    blurb:
      'Stand out in applications: tailored CVs, cover letters, interview prep and job-search systems that actually get responses.',
    emoji: '🧭',
  },
  'sme-operations': {
    label: 'SME Operations',
    blurb:
      'Run a leaner business, customer replies, bookkeeping, inventory, marketing and daily admin handled with AI on a budget.',
    emoji: '🏪',
  },
  coding: {
    label: 'Coding',
    blurb:
      'Ship software faster, debugging, code review, building features and learning to code with AI assistants.',
    emoji: '💻',
  },
};
