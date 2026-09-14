import './styles/main.css';
import { translations, type Lang, type TranslationKey } from './i18n';

/**
 * ARSA International — Main entry point
 * Premium B2B — i18n, cinematic hero, scroll reveals, mobile menu.
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

  document.querySelectorAll<HTMLElement>('[data-i18n]').forEach((el) => {
    const key = el.getAttribute('data-i18n') as TranslationKey;
    if (t[key]) el.innerHTML = t[key];
  });

  document.querySelectorAll<HTMLElement>('[data-i18n-attr]').forEach((el) => {
    const spec = el.getAttribute('data-i18n-attr');
    if (!spec) return;
    const [key, attr] = spec.split(':') as [TranslationKey, string];
    if (t[key] && attr) el.setAttribute(attr, t[key]);
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
    { threshold: 0.08, rootMargin: '0px 0px -40px 0px' },
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

// ── Header Scroll ──────────────────────────────────────────
function initHeaderScroll(): void {
  const header = document.getElementById('header');
  if (!header) return;

  let ticking = false;
  window.addEventListener('scroll', () => {
    if (!ticking) {
      requestAnimationFrame(() => {
        header.classList.toggle('header--scrolled', window.scrollY > 50);
        ticking = false;
      });
      ticking = true;
    }
  });
}

// ── Hero Title Animation ───────────────────────────────────
function initHeroTitle(): void {
  const prefersReduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const title = document.querySelector('.hero__title');
  if (!title) return;

  if (prefersReduced) {
    title.classList.add('animated');
    return;
  }

  // Wrap each line in a span for animation
  const html = title.innerHTML;
  const lines = html.split('<br>');
  title.innerHTML = lines
    .map((line) => `<span class="title-line">${line}</span>`)
    .join('');

  // Trigger animation after a short delay
  setTimeout(() => title.classList.add('animated'), 100);
}

// ── Hero Visual Reveal ─────────────────────────────────────
function initHeroVisual(): void {
  const prefersReduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const frame = document.querySelector('.hero__visual-frame');
  if (!frame) return;

  if (prefersReduced) {
    frame.classList.add('visible');
    return;
  }

  setTimeout(() => frame.classList.add('visible'), 400);
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
  initHeroTitle();
  initHeroVisual();
  initReveal();
  initMobileMenu();
  initHeaderScroll();
  initSmoothAnchors();
});
