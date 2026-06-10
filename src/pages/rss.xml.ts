import rss from '@astrojs/rss';
import type { APIContext } from 'astro';
import { getCollection } from 'astro:content';
import { SITE } from '../site.config';

export async function GET(context: APIContext) {
  const workflows = (await getCollection('workflows', (e) => e.data.published)).sort(
    (a, b) => b.data.ingestedAt.valueOf() - a.data.ingestedAt.valueOf()
  );

  return rss({
    title: SITE.name,
    description: SITE.description,
    site: context.site!,
    items: workflows.map((w) => ({
      title: w.data.title,
      description: w.data.description,
      link: `/workflows/${w.id}/`,
      pubDate: w.data.ingestedAt,
    })),
  });
}
