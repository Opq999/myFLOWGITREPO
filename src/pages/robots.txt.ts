import type { APIRoute } from 'astro';

/**
 * Served at /robots.txt. Generated (not a static file) so the Sitemap URL always
 * tracks the `site` value in astro.config.mjs, even after the custom domain lands.
 */
export const GET: APIRoute = ({ site }) => {
  const base = site ?? new URL('https://opqai.solutions/');
  const body = `User-agent: *
Allow: /
Disallow: /gallery/

Sitemap: ${new URL('sitemap-index.xml', base).href}
`;
  return new Response(body, {
    headers: { 'Content-Type': 'text/plain; charset=utf-8' },
  });
};
