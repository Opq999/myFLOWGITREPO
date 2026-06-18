import { SITE } from '../site.config';

/**
 * Builds the destination for a "Work with me" CTA from a prefilled message.
 *
 * Prefers WhatsApp click-to-chat when `SITE.whatsappNumber` is set (lowest
 * friction for the Nigeria-first audience). Falls back to a `mailto:` link so
 * the CTAs never render broken before the number is configured, same
 * graceful-degradation pattern as the Tally embed on /submit.
 */
export function contactLink(message: string): string {
  const number = SITE.whatsappNumber.replace(/\D/g, '');
  if (number) {
    return `https://wa.me/${number}?text=${encodeURIComponent(message)}`;
  }
  const subject = encodeURIComponent('Work with you, request from the site');
  const body = encodeURIComponent(message);
  return `mailto:${SITE.contactEmail}?subject=${subject}&body=${body}`;
}
