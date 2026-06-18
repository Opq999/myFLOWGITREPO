import { defineCollection } from 'astro:content';
import { glob } from 'astro/loaders';
import { workflowSchema } from './lib/workflow-schema';

const workflows = defineCollection({
  loader: glob({ pattern: '**/*.mdx', base: './src/content/workflows' }),
  schema: workflowSchema,
});

// Score 5-6 pipeline output lives in ./src/content/drafts for an optional human
// glance and for dedupe (read directly from disk in pipeline/lib/dedupe.ts).
// It is deliberately NOT a built collection: drafts are never rendered, and a
// single malformed LLM-generated draft would otherwise crash the whole site
// build (and block the Cloudflare deploy). Keeping it off the build means bad
// drafts can never take production down.
export const collections = { workflows };
