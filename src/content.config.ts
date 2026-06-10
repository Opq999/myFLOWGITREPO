import { defineCollection } from 'astro:content';
import { glob } from 'astro/loaders';
import { z } from 'astro/zod';
import { workflowSchema } from './lib/workflow-schema';

const workflows = defineCollection({
  loader: glob({ pattern: '**/*.mdx', base: './src/content/workflows' }),
  schema: workflowSchema,
});

/** Score 5–6 pipeline output: kept out of the published site, optional human glance. */
const drafts = defineCollection({
  loader: glob({ pattern: '**/*.mdx', base: './src/content/drafts' }),
  schema: workflowSchema.extend({ published: z.boolean().default(false) }),
});

export const collections = { workflows, drafts };
