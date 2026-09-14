/**
 * ARSA International — Website Configuration
 * ============================================
 * All text content, contacts, and tunable constants live here.
 * Replace placeholder values before production deploy.
 */

export const config = {
  brand: {
    name: 'ARSA International',
    tagline: 'International Recruitment & Workforce Solutions',
  },

  contacts: {
    telegram: 'https://t.me/YOUR_TELEGRAM_HANDLE',
    email: 'info@arsa-international.com',
  },

  hero: {
    eyebrow: 'International Recruitment',
    title: 'People who help your business move forward',
    subtitle:
      'We connect companies with skilled professionals from around the world — reliably, transparently, and with full support at every stage.',
    cta: 'Let\'s talk',
  },

  about: {
    text: 'ARSA International is a recruitment company that helps businesses find the right people. We work across international markets — building reliable channels for hiring professionals from Asia and other regions, so employers can focus on growth while we handle the workforce.',
  },

  services: {
    heading: 'What we do',
    items: [
      {
        number: '01',
        title: 'International recruitment',
        text: 'We source and place qualified professionals from international markets, matching skills and experience to your specific roles.',
      },
      {
        number: '02',
        title: 'Workforce solutions',
        text: 'From single specialist hires to large-scale staffing projects — we structure the hiring process around your business needs.',
      },
      {
        number: '03',
        title: 'Full-cycle support',
        text: 'We manage the entire journey — from initial screening and candidate presentation through onboarding and ongoing coordination.',
      },
    ],
  },

  process: {
    heading: 'How it works',
    steps: [
      { number: '01', title: 'You describe the task', text: 'Roles, volume, timeline, location.' },
      { number: '02', title: 'We shape the solution', text: 'Markets, format, terms.' },
      { number: '03', title: 'We deliver results', text: 'People ready to work, fully supported.' },
    ],
  },

  cta: {
    heading: 'Ready to discuss your staffing needs?',
    text: 'Tell us what you need — we\'ll propose a solution and outline the timeline.',
    button: 'Write to Telegram',
  },

  footer: {
    copyright: `© ${new Date().getFullYear()} ARSA International`,
  },

  seo: {
    title: 'ARSA International — International Recruitment & Workforce Solutions',
    description:
      'ARSA International helps businesses find skilled professionals from international markets. Recruitment, workforce solutions, and full-cycle hiring support.',
  },
} as const;

export type SiteConfig = typeof config;
