import './styles/main.css';
import { translations, type Lang, type TranslationKey } from './i18n';

/**
 * ARSA International — Main entry point
 * Industrial Premium — i18n, cinematic hero, scroll reveals, mobile menu.
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
  header.classList.add('header--hero');

  let ticking = false;
  window.addEventListener('scroll', () => {
    if (!ticking) {
      requestAnimationFrame(() => {
        const scrolled = window.scrollY > 80;
        header.classList.toggle('header--scrolled', scrolled);
        header.classList.toggle('header--hero', !scrolled);
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
  setTimeout(() => title.classList.add('animated'), 150);
}

// ── Hero Figure Reveal ─────────────────────────────────────
function initHeroFigure(): void {
  const prefersReduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const figure = document.querySelector('.hero__figure');
  if (!figure) return;
  if (prefersReduced) {
    figure.classList.add('visible');
    return;
  }
  setTimeout(() => figure.classList.add('visible'), 500);
}

// ── Connecting Routes — scroll-linked animation ────────────
function initConnectingRoutes(): void {
  const section = document.querySelector<HTMLElement>('.connecting');
  const lines = Array.from(document.querySelectorAll<SVGPathElement>('.route-line'));
  const dots = Array.from(document.querySelectorAll<SVGCircleElement>('.route-dot'));
  if (!section || lines.length === 0) return;

  const prefersReduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  if (prefersReduced) {
    lines.forEach((l) => {
      l.style.strokeDasharray = 'none';
      l.style.strokeDashoffset = '0';
    });
    dots.forEach((d) => { d.style.opacity = '1'; });
    return;
  }

  // Cache path lengths once.
  const lengths = lines.map((l) => {
    try {
      return l.getTotalLength();
    } catch {
      return 1000;
    }
  });

  lines.forEach((l, i) => {
    l.style.strokeDasharray = String(lengths[i]);
    l.style.strokeDashoffset = String(lengths[i]);
  });
  dots.forEach((d) => { d.style.opacity = '0'; });

  let ticking = false;
  let lastProgress = -1;

  const update = (): void => {
    ticking = false;
    const rect = section.getBoundingClientRect();
    const vh = window.innerHeight || 1;
    // Progress: 0 when section top hits viewport bottom, 1 as it reaches 20% from top.
    const raw = (vh - rect.top) / (vh * 0.8);
    const progress = Math.min(1, Math.max(0, raw));
    if (Math.abs(progress - lastProgress) < 0.002) return;
    lastProgress = progress;

    lines.forEach((l, i) => {
      const p = i === 0 ? progress : Math.min(1, Math.max(0, (progress - 0.18) / 0.82));
      l.style.strokeDashoffset = String(lengths[i] * (1 - p));
    });
    dots.forEach((d, i) => {
      const p = Math.min(1, Math.max(0, (progress - 0.3 - i * 0.12) / 0.4));
      d.style.opacity = String(p);
    });
  };

  const onScroll = (): void => {
    if (ticking) return;
    ticking = true;
    requestAnimationFrame(update);
  };

  window.addEventListener('scroll', onScroll, { passive: true });
  window.addEventListener('resize', onScroll, { passive: true });
  update();
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
  initHeroFigure();
  initReveal();
  initMobileMenu();
  initHeaderScroll();
  initConnectingRoutes();
  initSmoothAnchors();
});
