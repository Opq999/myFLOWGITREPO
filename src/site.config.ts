/**
 * Central site configuration. Every value that depends on a decision or an
 * external account lives here, so launch config is a one-file edit.
 */
export const SITE = {
  /** Placeholder working name, final name decided before Phase 4 launch. */
  name: 'OPQAI',
  tagline: 'Proven AI workflows, exact steps, exact prompts, real sources',
  description:
    'A free library of reproducible AI workflows for students, freelancers and small businesses. Every workflow has exact steps, copy-paste prompts and a real human source.',
  /** The ONE place the site URL lives. astro.config.mjs reads this, and canonical
   *  tags, sitemap, robots.txt, OG image URLs and JSON-LD all derive from it.
   *  Changing this single line is the whole "switch to my custom domain" step. */
  url: 'https://opqai.pages.dev',
  /** Fill with your Buttondown username to enable the newsletter form. */
  buttondownUsername: 'opq',
  /** Fill with your Tally form ID to enable the /submit embed. */
  tallyFormId: '',
  /** WhatsApp number for the "Work with me" CTAs, E.164 digits only (no +), e.g. '2348012345678'. Empty ⇒ CTAs fall back to email. */
  whatsappNumber: '2348179428064',
  /** Contact email used as the fallback for service CTAs and on /submit. */
  contactEmail: 'opeyemiolowosoke@gmail.com',
  /** Twitter/X handle incl. leading '@' (e.g. '@opqai'). Empty ⇒ no twitter:site/creator tags. */
  twitterHandle: '',
  /** Fill with your Cloudflare Web Analytics token to enable analytics. */
  cloudflareAnalyticsToken: '050bb38fc66d4caa896908a4ef25fd39',
};
