import type { Workflow } from './workflow-schema';
import { SITE } from '../site.config';
import { CATEGORY_META } from './categories';

/** schema.org Organization + WebSite for the homepage, so search engines can
 *  build a knowledge entry and tie every page back to the site. */
export function siteJsonLd(siteUrl: URL | string) {
  const origin = new URL(siteUrl).origin;
  return {
    '@context': 'https://schema.org',
    '@graph': [
      {
        '@type': 'Organization',
        '@id': `${origin}/#organization`,
        name: SITE.name,
        url: `${origin}/`,
        logo: `${origin}/icon-512.png`,
      },
      {
        '@type': 'WebSite',
        '@id': `${origin}/#website`,
        name: SITE.name,
        description: SITE.description,
        url: `${origin}/`,
        publisher: { '@id': `${origin}/#organization` },
      },
    ],
  };
}

/** schema.org BreadcrumbList for a workflow detail page (Home → Category → Workflow). */
export function breadcrumbJsonLd(workflow: Workflow, pageUrl: string) {
  const origin = new URL(pageUrl).origin;
  return {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: [
      { '@type': 'ListItem', position: 1, name: 'Home', item: `${origin}/` },
      {
        '@type': 'ListItem',
        position: 2,
        name: CATEGORY_META[workflow.category].label,
        item: `${origin}/categories/${workflow.category}/`,
      },
      { '@type': 'ListItem', position: 3, name: workflow.title, item: pageUrl },
    ],
  };
}

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
