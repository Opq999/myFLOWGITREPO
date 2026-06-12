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
      [12, 12, 15],
      [9, 9, 11],
    ],
    border: { color: [184, 239, 63], width: 14, side: 'inline-start' },
    padding: 56,
    // Bundled fonts: no network fetch at build time (CI-safe, offline-safe).
    fonts: ['./src/fonts/noto-sans-400.ttf', './src/fonts/noto-sans-700.ttf'],
    font: {
      title: {
        size: 60,
        weight: 'Bold',
        color: [255, 255, 255],
        lineHeight: 1.2,
        families: ['Noto Sans'],
      },
      description: {
        size: 30,
        weight: 'Normal',
        color: [187, 247, 208],
        lineHeight: 1.4,
        families: ['Noto Sans'],
      },
    },
    format: 'PNG',
  }),
});
