import type { Workflow } from './workflow-schema';

/** schema.org HowTo JSON-LD for a workflow detail page. */
export function howToJsonLd(workflow: Workflow, steps: string[], pageUrl: string) {
  return {
    '@context': 'https://schema.org',
    '@type': 'HowTo',
    name: workflow.title,
    description: workflow.description,
    tool: workflow.tools.map((t) => ({ '@type': 'HowToTool', name: t.name })),
    step: steps.map((text, i) => ({
      '@type': 'HowToStep',
      position: i + 1,
      text,
    })),
    url: pageUrl,
  };
}
