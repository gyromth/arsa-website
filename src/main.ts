import './styles/main.css';
import { translations, type Lang, type TranslationKey } from './i18n';
import { config } from './config';

/**
 * ARSA International — Main entry point
 * Industrial Premium — i18n, cinematic hero, scroll-linked motion, mobile menu.
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
  document.documentElement.setAttribute('data-lang', lang);
  restartTypewriter();
}

// ── Hero accent typewriter ─────────────────────────────────
const TYPE_MS = 85; // type per char
const DELETE_MS = 55; // delete per char
const HOLD_MS = 1300; // pause after full phrase
const GAP_MS = 450; // pause before next phrase

let typewriterTimer = 0;

function heroTypewriterPhrases(lang: Lang): string[] {
  const t = translations[lang];
  return [t['hero.typewriter.1'], t['hero.typewriter.2'], t['hero.typewriter.3']];
}

function startTypewriter(): void {
  const text = document.querySelector<HTMLElement>('.title-accent__text');
  const wrap = document.querySelector<HTMLElement>('.title-accent');
  if (!text || !wrap) return;

  const phrases = heroTypewriterPhrases(getCurrentLang()).filter(Boolean);
  if (phrases.length === 0) return;

  const prefersReduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  if (prefersReduced || phrases.length === 1) {
    // Static final phrase, no typing/blinking
    text.textContent = phrases[0];
    wrap.classList.remove('is-typing');
    return;
  }

  wrap.classList.add('is-typing');
  text.textContent = '';

  let idx = 0;
  let count = 0;
  let deleting = false;

  const tick = (): void => {
    const phrase = phrases[idx];
    if (!deleting) {
      count += 1;
      text.textContent = phrase.slice(0, count);
      if (count >= phrase.length) {
        deleting = true;
        typewriterTimer = window.setTimeout(tick, HOLD_MS);
        return;
      }
      typewriterTimer = window.setTimeout(tick, TYPE_MS);
    } else {
      count -= 1;
      text.textContent = phrase.slice(0, Math.max(0, count));
      if (count <= 0) {
        deleting = false;
        idx = (idx + 1) % phrases.length;
        typewriterTimer = window.setTimeout(tick, GAP_MS);
        return;
      }
      typewriterTimer = window.setTimeout(tick, DELETE_MS);
    }
  };

  typewriterTimer = window.setTimeout(tick, 150); // start typing quickly (no empty-line flash)
}

function restartTypewriter(): void {
  window.clearTimeout(typewriterTimer);
  startTypewriter();
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

  const twTitle = document.querySelector('meta[name="twitter:title"]');
  if (twTitle) twTitle.setAttribute('content', t['seo.og:title']);
  const twDesc = document.querySelector('meta[name="twitter:description"]');
  if (twDesc) twDesc.setAttribute('content', t['seo.og:description']);
}

// ── Site URL (canonical / og:url) ──────────────────────────
function applySiteUrl(): void {
  const canonical = document.querySelector<HTMLLinkElement>('link[rel="canonical"]');
  if (canonical) canonical.href = config.site.url;
  const ogUrl = document.querySelector('meta[property="og:url"]');
  if (ogUrl) ogUrl.setAttribute('content', config.site.url);
}

function initLangSwitch(): void {
  const lang = getCurrentLang();
  applyTranslations(lang);
  updateSwitcherUI(lang);
  updateSEO(lang);
  document.documentElement.lang = lang;
  document.documentElement.setAttribute('data-lang', lang);

  // Language applied — reveal the page (removes the pre-paint guard).
  document.documentElement.classList.remove('html--booting');

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

  // Activate the opaque/blurred header before hero content reaches it.
  const threshold = Math.round(header.offsetHeight * 0.5) || 36;

  let ticking = false;
  const update = (): void => {
    ticking = false;
    const scrolled = window.scrollY > threshold;
    header.classList.toggle('header--scrolled', scrolled);
    header.classList.toggle('header--hero', !scrolled);
  };

  window.addEventListener('scroll', () => {
    if (!ticking) {
      ticking = true;
      requestAnimationFrame(update);
    }
  }, { passive: true });

  update();
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
  setTimeout(() => figure.classList.add('visible'), 400);
}

// ── Reusable cursor-follow glow (desktop, fine pointer, motion allowed) ──
function initPointerGlow(block: HTMLElement, glow: HTMLElement): void {
  let targetX = block.clientWidth / 2;
  let targetY = block.clientHeight / 2;
  let curX = targetX;
  let curY = targetY;
  let raf = 0;
  let inView = false;

  const render = (): void => {
    curX += (targetX - curX) * 0.06;
    curY += (targetY - curY) * 0.06;
    glow.style.transform = `translate3d(${curX.toFixed(1)}px, ${curY.toFixed(1)}px, 0)`;
    // Stop the loop as soon as the glow has settled — no continuous work.
    if (Math.abs(targetX - curX) > 0.5 || Math.abs(targetY - curY) > 0.5) {
      raf = requestAnimationFrame(render);
    } else {
      raf = 0;
    }
  };

  const start = (): void => {
    if (inView && !raf) raf = requestAnimationFrame(render);
  };

  const onMove = (e: PointerEvent): void => {
    const rect = block.getBoundingClientRect();
    targetX = e.clientX - rect.left;
    targetY = e.clientY - rect.top;
    glow.classList.add('is-active');
    start();
  };

  const onLeave = (): void => {
    glow.classList.remove('is-active');
    if (raf) {
      cancelAnimationFrame(raf);
      raf = 0;
    }
  };

  block.addEventListener('pointermove', onMove, { passive: true });
  block.addEventListener('pointerleave', onLeave, { passive: true });

  const io = new IntersectionObserver(
    (entries) => {
      inView = entries[0].isIntersecting;
      if (!inView && raf) {
        cancelAnimationFrame(raf);
        raf = 0;
      }
      if (inView && glow.classList.contains('is-active') && !raf) start();
    },
    { threshold: 0 },
  );
  io.observe(block);
}

function initPointerGlows(): void {
  // Touch / coarse-pointer devices: the mouse-follow feature is fully off —
  // no listeners are attached and no RAF loop ever runs.
  const finePointer = window.matchMedia('(hover: hover) and (pointer: fine)').matches;
  const prefersReduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  if (!finePointer || prefersReduced) return;

  document.querySelectorAll<HTMLElement>('[data-pointer-glow]').forEach((block) => {
    const glow = block.querySelector<HTMLElement>('.pointer-glow, .hero__pointer-glow');
    if (glow) initPointerGlow(block, glow);
  });
}

// ── Connecting Globe — scroll-driven rotation + sequential routes ──
function initGlobe(): void {
  const section = document.querySelector<HTMLElement>('.connecting');
  const world = document.querySelector<SVGGElement>('.globe__world');
  const routes = Array.from(document.querySelectorAll<SVGPathElement>('.globe__route'));
  const markers = Array.from(document.querySelectorAll<SVGGElement>('.globe__plane'));
  if (!section || !world || routes.length === 0) return;

  const prefersReduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  // Cache path lengths once — never recalculate during scroll.
  const lengths = routes.map((r) => {
    try {
      return r.getTotalLength();
    } catch {
      return 1000;
    }
  });

  const draw = (p: number): void => {
    // Globe rotation follows scroll (forward / reverse).
    const rotation = -22 + 44 * p;
    world.style.transform = `rotate(${rotation.toFixed(2)}deg)`;

    const total = routes.length;
    const idx = Math.min(total - 1, Math.floor(p * total));
    const local = Math.min(1, Math.max(0, p * total - idx));

    routes.forEach((r, i) => {
      if (i === idx) {
        const drawP = Math.min(1, local / 0.8);
        r.style.strokeDashoffset = String(lengths[i] * (1 - drawP));
        r.style.opacity = local > 0.8 ? String(Math.max(0, 1 - (local - 0.8) / 0.2)) : '1';
      } else {
        r.style.opacity = '0';
      }
    });
    markers.forEach((m, i) => {
      if (i === idx && local < 0.8) {
        const drawP = Math.min(1, local / 0.8);
        const t = lengths[idx] * drawP;
        const pt = routes[idx].getPointAtLength(t);
        // Tangent direction for the plane's heading.
        const t2 = Math.min(lengths[idx], t + 2);
        const pt2 = routes[idx].getPointAtLength(t2);
        const ang = (Math.atan2(pt2.y - pt.y, pt2.x - pt.x) * 180) / Math.PI;
        m.setAttribute(
          'transform',
          `translate(${pt.x.toFixed(1)} ${pt.y.toFixed(1)}) rotate(${(ang + 90).toFixed(1)})`,
        );
        m.style.opacity = '1';
      } else {
        m.style.opacity = '0';
      }
    });
  };

  if (prefersReduced) {
    // Static globe: several routes drawn, no markers, no rotation motion.
    routes.forEach((r, i) => {
      r.style.strokeDasharray = 'none';
      r.style.strokeDashoffset = '0';
      r.style.opacity = i < 3 ? String(0.75 - i * 0.2) : '0';
    });
    markers.forEach((m) => { m.style.opacity = '0'; });
    world.style.transform = 'rotate(-8deg)';
    return;
  }

  routes.forEach((r, i) => {
    r.style.strokeDasharray = String(lengths[i]);
    r.style.strokeDashoffset = String(lengths[i]);
  });
  markers.forEach((m) => { m.style.opacity = '0'; });
  draw(0);

  let ticking = false;
  let lastProgress = -1;

  const update = (): void => {
    ticking = false;
    const rect = section.getBoundingClientRect();
    const vh = window.innerHeight || 1;
    // Full traversal: section top at viewport bottom (0) → section bottom at viewport top (1).
    const total = vh + rect.height;
    const passed = vh - rect.top;
    const progress = Math.min(1, Math.max(0, passed / total));
    if (Math.abs(progress - lastProgress) < 0.002) return;
    lastProgress = progress;
    draw(progress);
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
  applySiteUrl();
  startTypewriter();
  initHeroFigure();
  initPointerGlows();
  initReveal();
  initMobileMenu();
  initHeaderScroll();
  initGlobe();
  initSmoothAnchors();
});
