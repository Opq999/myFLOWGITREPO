import { OGImageRoute } from 'astro-og-canvas';
import { getCollection } from 'astro:content';

const workflows = await getCollection('workflows', (e) => e.data.published);

/** One generated PNG per workflow: /og/{slug}.png */
export const { getStaticPaths, GET } = await OGImageRoute({
  param: 'route',
  pages: Object.fromEntries(workflows.map((w) => [w.id, w.data])),
  getImageOptions: (_path, page) => ({
    title: page.title,
    description: page.description,
    bgGradient: [
      [20, 83, 45],
      [9, 41, 22],
    ],
    border: { color: [22, 163, 74], width: 14, side: 'inline-start' },
    padding: 56,
    font: {
      title: { size: 60, weight: 'Bold', color: [255, 255, 255], lineHeight: 1.2 },
      description: { size: 30, weight: 'Normal', color: [187, 247, 208], lineHeight: 1.4 },
    },
    format: 'PNG',
  }),
});
