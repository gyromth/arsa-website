import './styles/main.css';

/**
 * ARSA International — Main entry point
 * Warm editorial design — scroll reveals, mobile menu, header, hero SVG animation.
 */

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
  initReveal();
  initMobileMenu();
  initHeroLines();
  initSmoothAnchors();
});
