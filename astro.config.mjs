// @ts-check
import { defineConfig } from 'astro/config';
import mdx from '@astrojs/mdx';
import sitemap from '@astrojs/sitemap';
import tailwindcss from '@tailwindcss/vite';
import { SITE } from './src/site.config';

// https://astro.build/config
export default defineConfig({
  // Single source of truth: the site URL lives only in src/site.config.ts.
  // When the custom domain lands, change SITE.url there and everything (canonical
  // tags, sitemap, robots.txt, OG image URLs, JSON-LD) follows automatically.
  site: SITE.url,
  integrations: [mdx(), sitemap({ filter: (page) => !page.includes('/gallery') })],
  vite: {
    plugins: [tailwindcss()],
  },
});
