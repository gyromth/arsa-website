import './styles/main.css';
import { translations, type Lang, type TranslationKey } from './i18n';

/**
 * ARSA International — Main entry point
 * Warm editorial design — i18n, scroll reveals, mobile menu, header, hero SVG animation.
 */

const STORAGE_KEY = 'arsa-lang';
const DEFAULT_LANG: Lang = 'en';

// ── i18n ───────────────────────────────────────────────────
function getCurrentLang(): Lang {
  const stored = localStorage.getItem(STORAGE_KEY);
  if (stored === 'ru' || stored === 'en') return stored;
  return DEFAULT_LANG;
}

function setLang(lang: Lang): void {
  localStorage.setItem(STORAGE_KEY, lang);
  applyTranslations(lang);
  updateSwitcherUI(lang);
  updateSEO(lang);
  document.documentElement.lang = lang;
}

function applyTranslations(lang: Lang): void {
  const t = translations[lang];

  // Text content
  document.querySelectorAll<HTMLElement>('[data-i18n]').forEach((el) => {
    const key = el.getAttribute('data-i18n') as TranslationKey;
    if (t[key]) {
      el.innerHTML = t[key];
    }
  });

  // Attributes (aria-label, etc.)
  document.querySelectorAll<HTMLElement>('[data-i18n-attr]').forEach((el) => {
    const spec = el.getAttribute('data-i18n-attr');
    if (!spec) return;
    const [key, attr] = spec.split(':') as [TranslationKey, string];
    if (t[key] && attr) {
      el.setAttribute(attr, t[key]);
    }
  });
}

function updateSwitcherUI(lang: Lang): void {
  document.querySelectorAll<HTMLButtonElement>('.lang-switch__btn').forEach((btn) => {
    const isActive = btn.dataset.lang === lang;
    btn.classList.toggle('lang-switch__btn--active', isActive);
    btn.setAttribute('aria-pressed', String(isActive));
  });
}

function updateSEO(lang: Lang): void {
  const t = translations[lang];
  document.title = t['seo.title'];

  const desc = document.querySelector('meta[name="description"]');
  if (desc) desc.setAttribute('content', t['seo.description']);

  const ogTitle = document.querySelector('meta[property="og:title"]');
  if (ogTitle) ogTitle.setAttribute('content', t['seo.og:title']);

  const ogDesc = document.querySelector('meta[property="og:description"]');
  if (ogDesc) ogDesc.setAttribute('content', t['seo.og:description']);

  const ogLocale = document.querySelector('meta[property="og:locale"]');
  if (ogLocale) ogLocale.setAttribute('content', t['seo.og:locale']);
}

function initLangSwitch(): void {
  const lang = getCurrentLang();
  applyTranslations(lang);
  updateSwitcherUI(lang);
  updateSEO(lang);
  document.documentElement.lang = lang;

  document.querySelectorAll<HTMLButtonElement>('.lang-switch__btn').forEach((btn) => {
    btn.addEventListener('click', () => {
      const newLang = btn.dataset.lang as Lang;
      if (newLang) setLang(newLang);
    });
  });
}

// ── Scroll Reveal ──────────────────────────────────────────
function initReveal(): void {
  const prefersReduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  if (prefersReduced) {
    document.querySelectorAll('.reveal').forEach((el) => el.classList.add('visible'));
    return;
  }

  const observer = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.classList.add('visible');
          observer.unobserve(entry.target);
        }
      });
    },
    { threshold: 0.1, rootMargin: '0px 0px -30px 0px' },
  );

  document.querySelectorAll('.reveal').forEach((el) => observer.observe(el));
}

// ── Mobile Menu ────────────────────────────────────────────
function initMobileMenu(): void {
  const burger = document.querySelector<HTMLButtonElement>('.header__burger');
  const mobileNav = document.getElementById('mobile-nav');
  if (!burger || !mobileNav) return;

  burger.addEventListener('click', () => {
    const isOpen = burger.getAttribute('aria-expanded') === 'true';
    burger.setAttribute('aria-expanded', String(!isOpen));
    mobileNav.hidden = isOpen;
  });

  mobileNav.querySelectorAll('a').forEach((link) => {
    link.addEventListener('click', () => {
      burger.setAttribute('aria-expanded', 'false');
      mobileNav.hidden = true;
    });
  });
}

// ── Hero SVG Line Animation ────────────────────────────────
function initHeroLines(): void {
  const prefersReduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  if (prefersReduced) {
    document.querySelectorAll('.hero-line-path').forEach((el) => el.classList.add('animated'));
    const orbit = document.querySelector('.hero__orbit');
    if (orbit) orbit.classList.add('visible');
    return;
  }

  const observer = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          document.querySelectorAll('.hero-line-path').forEach((path, i) => {
            setTimeout(() => path.classList.add('animated'), i * 400);
          });
          const orbit = document.querySelector('.hero__orbit');
          if (orbit) setTimeout(() => orbit.classList.add('visible'), 600);
          observer.unobserve(entry.target);
        }
      });
    },
    { threshold: 0.2 },
  );

  const hero = document.getElementById('hero');
  if (hero) observer.observe(hero);
}

// ── Smooth Anchor ──────────────────────────────────────────
function initSmoothAnchors(): void {
  document.querySelectorAll<HTMLAnchorElement>('a[href^="#"]').forEach((link) => {
    link.addEventListener('click', (e) => {
      const id = link.getAttribute('href');
      if (!id || id === '#') return;
      const target = document.querySelector(id);
      if (target) {
        e.preventDefault();
        target.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
    });
  });
}

// ── Init ───────────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', () => {
  initLangSwitch();
  initReveal();
  initMobileMenu();
  initHeroLines();
  initSmoothAnchors();
});
