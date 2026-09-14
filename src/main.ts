import './styles/main.css';

/**
 * ARSA International — Main entry point
 * Handles: scroll reveals, mobile menu, header scroll, counter animation, process line.
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
    { threshold: 0.12, rootMargin: '0px 0px -40px 0px' },
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

// ── Counter Animation ──────────────────────────────────────
function initCounters(): void {
  const prefersReduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  const counters = document.querySelectorAll<HTMLElement>('[data-count]');
  if (!counters.length) return;

  const observer = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          const el = entry.target as HTMLElement;
          const target = parseInt(el.dataset.count ?? '0', 10);
          if (prefersReduced) {
            el.textContent = String(target);
          } else {
            animateCounter(el, target);
          }
          observer.unobserve(el);
        }
      });
    },
    { threshold: 0.5 },
  );

  counters.forEach((c) => observer.observe(c));
}

function animateCounter(el: HTMLElement, target: number): void {
  const duration = 1500;
  const start = performance.now();

  function step(now: number) {
    const elapsed = now - start;
    const progress = Math.min(elapsed / duration, 1);
    const eased = 1 - Math.pow(1 - progress, 3); // ease-out cubic
    el.textContent = String(Math.round(eased * target));
    if (progress < 1) requestAnimationFrame(step);
  }
  requestAnimationFrame(step);
}

// ── Process Line Animation ─────────────────────────────────
function initProcessLine(): void {
  const line = document.querySelector<HTMLElement>('.process__line');
  if (!line) return;

  const observer = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          line.classList.add('animated');
          observer.unobserve(entry.target);
        }
      });
    },
    { threshold: 0.4 },
  );

  observer.observe(line);
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
  initHeaderScroll();
  initCounters();
  initProcessLine();
  initSmoothAnchors();
});
