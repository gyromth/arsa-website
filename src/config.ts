/**
 * ARSA International — Site Configuration
 * ============================================
 * Single place for site-level values: canonical/OG URL and contact placeholders.
 * Replace the placeholder URL with the production domain once assigned.
 */

export const config = {
  site: {
    name: 'ARSA International',
    // TODO: replace with the production domain once assigned.
    url: 'https://arsa.37-46-18-131.sslip.io/',
  },
  contacts: {
    telegram: 'https://t.me/YOUR_TELEGRAM_HANDLE',
    email: 'info@arsa-international.com',
  },
} as const;