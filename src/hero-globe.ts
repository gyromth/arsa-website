// ── Hero interactive globe ─────────────────────────────────
// Orthographic SVG globe rendered in JS from simplified Natural Earth data.
// Drag (mouse/touch) rotates the view; scroll progress drives the sequential
// route reveal forward/reverse with a fixed resting state — no idle loops.
import {
  LAND_RING_FLAT,
  LAND_RING_SPLITS,
  CITY_POLES,
  ROUTE_PAIRS,
} from './globe-data';

const R = 280;
const CX = 300;
const CY = 300;
const D2R = Math.PI / 180;
const BASE_LON0 = 45; // deg, view center longitude at load
const BASE_LAT0 = 15; // deg, view center latitude at load
const LON_WINDOW = 120; // drag window (deg) around base longitude
const LAT_WINDOW = 26; // drag window (deg) around base latitude
const ROUTE_SAMPLES = 44;
const SVG_NS = 'http://www.w3.org/2000/svg';

interface ProjectedPoint {
  x: number;
  y: number;
}

function projectPoint(
  lon: number,
  lat: number,
  lon0: number,
  sLat0: number,
  cLat0: number,
): ProjectedPoint | null {
  const dLon = (lon - lon0) * D2R;
  const sLat = Math.sin(lat * D2R);
  const cLat = Math.cos(lat * D2R);
  const cosD = Math.cos(dLon);
  const cosc = sLat0 * sLat + cLat0 * cLat * cosD;
  if (cosc <= 0.0015) return null;
  const x = R * cLat * Math.sin(dLon);
  const y = R * (cLat0 * sLat - sLat0 * cLat * cosD);
  return { x: CX + x, y: CY - y };
}

function buildLandPath(lon0: number, sLat0: number, cLat0: number): string {
  let d = '';
  let cursor = 0;
  for (const count of LAND_RING_SPLITS) {
    let prev: ProjectedPoint | null = null;
    for (let i = 0; i < count; i++) {
      const p = projectPoint(
        LAND_RING_FLAT[(cursor + i) * 2],
        LAND_RING_FLAT[(cursor + i) * 2 + 1],
        lon0,
        sLat0,
        cLat0,
      );
      if (p) {
        const jump = !prev || Math.abs(p.x - prev.x) + Math.abs(p.y - prev.y) > 70;
        d += jump ? `M${p.x.toFixed(1)} ${p.y.toFixed(1)}` : `L${p.x.toFixed(0)} ${p.y.toFixed(0)}`;
        prev = p;
      } else {
        prev = null;
      }
    }
    cursor += count;
  }
  return d.trim();
}

function buildGridPath(lon0: number, sLat0: number, cLat0: number): string {
  // meridians each 30°, parallels each 30°
  let d = '';
  const push = (p: ProjectedPoint | null, prev: ProjectedPoint | null): string => {
    if (!p) return '';
    if (prev && Math.abs(p.x - prev.x) + Math.abs(p.y - prev.y) < 70) {
      return `L${p.x.toFixed(0)} ${p.y.toFixed(0)}`;
    }
    return `M${p.x.toFixed(0)} ${p.y.toFixed(0)}`;
  };
  for (let lon = -180; lon < 180; lon += 30) {
    let prev: ProjectedPoint | null = null;
    for (let lat = -78; lat <= 78; lat += 6) {
      const p = projectPoint(lon, lat, lon0, sLat0, cLat0);
      d += push(p, prev);
      prev = p;
    }
  }
  for (let lat = -60; lat <= 60; lat += 30) {
    let prev: ProjectedPoint | null = null;
    for (let lon = -180; lon <= 180; lon += 6) {
      const p = projectPoint(lon, lat, lon0, sLat0, cLat0);
      d += push(p, prev);
      prev = p;
    }
  }
  return d.trim();
}

function slerp(
  a: readonly [number, number],
  b: readonly [number, number],
  t: number,
  lon0: number,
  sLat0: number,
  cLat0: number,
): ProjectedPoint | null {
  const λ1 = a[0] * D2R;
  const λ2 = b[0] * D2R;
  const φ1 = a[1] * D2R;
  const φ2 = b[1] * D2R;
  const ax = Math.cos(φ1) * Math.cos(λ1);
  const ay = Math.cos(φ1) * Math.sin(λ1);
  const az = Math.sin(φ1);
  const bx = Math.cos(φ2) * Math.cos(λ2);
  const by = Math.cos(φ2) * Math.sin(λ2);
  const bz = Math.sin(φ2);
  const dot = Math.max(-1, Math.min(1, ax * bx + ay * by + az * bz));
  const θ = Math.acos(dot);
  let x: number, y: number, z: number;
  if (θ < 1e-6) {
    x = ax;
    y = ay;
    z = az;
  } else {
    const s = Math.sin(θ);
    const wA = Math.sin((1 - t) * θ) / s;
    const wB = Math.sin(t * θ) / s;
    x = ax * wA + bx * wB;
    y = ay * wA + by * wB;
    z = az * wA + bz * wB;
  }
  const lat = Math.asin(Math.max(-1, Math.min(1, z))) / D2R;
  const lon = Math.atan2(y, x) / D2R;
  return projectPoint(lon, lat, lon0, sLat0, cLat0);
}

export function initHeroGlobe(): void {
  const section = document.querySelector<HTMLElement>('.hero');
  const wrap = document.querySelector<HTMLElement>('.hero-globe-wrap');
  const world = document.querySelector<SVGGElement>('.hero-globe__world');
  const gridPath = document.querySelector<SVGPathElement>('.hero-globe__grid');
  const landPath = document.querySelector<SVGPathElement>('.hero-globe__land');
  const pointsG = document.querySelector<SVGGElement>('.hero-globe__points');
  const routesG = document.querySelector<SVGGElement>('.hero-globe__routes');
  const planesG = document.querySelector<SVGGElement>('.hero-globe__planes');
  if (!section || !wrap || !world || !gridPath || !landPath || !pointsG || !routesG || !planesG) return;
  // Desktop-only interactive globe; mobile keeps the existing composition
  if (!window.matchMedia('(min-width: 960px)').matches) return;

  const prefersReduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const hint = wrap.querySelector<HTMLElement>('.hero-globe__hint');

  // Build runtime elements once.
  const routes: SVGPathElement[] = [];
  const planes: SVGGElement[] = [];
  for (let i = 0; i < ROUTE_PAIRS.length; i++) {
    const routeEl = document.createElementNS(SVG_NS, 'path');
    routeEl.setAttribute('class', 'hero-globe__route');
    routesG.appendChild(routeEl);
    routes.push(routeEl);

    const planeG = document.createElementNS(SVG_NS, 'g');
    planeG.setAttribute('class', 'hero-globe__plane');
    const planeShape = document.createElementNS(SVG_NS, 'path');
    planeShape.setAttribute('d', 'M0 -7 L3 -2 L3 4 L0 6 L-3 4 L-3 -2 Z');
    planeG.appendChild(planeShape);
    planesG.appendChild(planeG);
    planes.push(planeG);
  }
  const pointEls: SVGCircleElement[] = [];
  for (let i = 0; i < CITY_POLES.length; i++) {
    const halo = document.createElementNS(SVG_NS, 'circle');
    halo.setAttribute('class', 'hero-globe__point-halo');
    const core = document.createElementNS(SVG_NS, 'circle');
    core.setAttribute('class', 'hero-globe__point-core');
    pointsG.appendChild(halo);
    pointsG.appendChild(core);
    pointEls.push(halo, core);
  }

  // Rotation state (degrees around the base view)
  const view = { lon: 0, lat: 0 };
  const lengths: number[] = [];
  const routePts: (ProjectedPoint | null)[][] = [];

  let renderQueued = false;
  const renderSync = (): void => {
    const lon0 = BASE_LON0 + view.lon;
    const lat0 = BASE_LAT0 + view.lat;
    const sLat0 = Math.sin(lat0 * D2R);
    const cLat0 = Math.cos(lat0 * D2R);
    landPath.setAttribute('d', buildLandPath(lon0, sLat0, cLat0));
    gridPath.setAttribute('d', buildGridPath(lon0, sLat0, cLat0));

    CITY_POLES.forEach((pole, i) => {
      const p = projectPoint(pole[0], pole[1], lon0, sLat0, cLat0);
      const halo = pointEls[i * 2];
      const core = pointEls[i * 2 + 1];
      if (!p) {
        halo.style.opacity = '0';
        core.style.opacity = '0';
        return;
      }
      halo.style.opacity = '';
      core.style.opacity = '';
      halo.setAttribute('cx', p.x.toFixed(1));
      halo.setAttribute('cy', p.y.toFixed(1));
      core.setAttribute('cx', p.x.toFixed(1));
      core.setAttribute('cy', p.y.toFixed(1));
    });

    for (let r = 0; r < ROUTE_PAIRS.length; r++) {
      const poleA = CITY_POLES[ROUTE_PAIRS[r][0]];
      const poleB = CITY_POLES[ROUTE_PAIRS[r][1]];
      const pts: (ProjectedPoint | null)[] = [];
      let d = '';
      let prev: ProjectedPoint | null = null;
      for (let s = 0; s <= ROUTE_SAMPLES; s++) {
        const p = slerp(poleA, poleB, s / ROUTE_SAMPLES, lon0, sLat0, cLat0);
        pts.push(p);
        if (p && prev) d += `L${p.x.toFixed(0)} ${p.y.toFixed(0)}`;
        else if (p) d += `M${p.x.toFixed(0)} ${p.y.toFixed(0)}`;
        prev = p;
      }
      routePts[r] = pts;
      routes[r].setAttribute('d', d.trim());
      let L = 0;
      for (let s = 1; s < pts.length; s++) {
        if (!pts[s] || !pts[s - 1]) {
          L = 0;
          break;
        }
        L += Math.hypot(pts[s]!.x - pts[s - 1]!.x, pts[s]!.y - pts[s - 1]!.y);
      }
      lengths[r] = L;
    }
  };

  const render = (): void => {
    if (renderQueued) return;
    renderQueued = true;
    requestAnimationFrame(() => {
      renderQueued = false;
      renderSync();
      drawRoute(currentProgress);
    });
  };

  // ── Scroll-driven route reveal ──
  let currentProgress = 0;
  let scrollQueued = false;

  const drawRoute = (p: number): void => {
    if (prefersReduced) return;
    const total = routes.length;
    const idx = Math.min(total - 1, Math.floor(p * total));
    const local = Math.min(1, Math.max(0, p * total - idx));
    routes.forEach((r, i) => {
      if (i === idx) {
        const drawP = Math.min(1, local / 0.78);
        const L = lengths[i] || 1;
        r.style.strokeDasharray = String(L);
        r.style.strokeDashoffset = String(L * (1 - drawP));
        r.style.opacity = local > 0.8 ? String(Math.max(0, 1 - (local - 0.8) / 0.2)) : '1';
        const plane = planes[i];
        if (local < 0.78 && routePts[i] && routePts[i].length > 2) {
          const t = drawP * (routePts[i].length - 1);
          const i0 = Math.max(0, Math.min(routePts[i].length - 2, Math.floor(t)));
          const pt = routePts[i][i0];
          const pt2 = routePts[i][i0 + 1];
          if (pt && pt2) {
            const ang = (Math.atan2(pt2.y - pt.y, pt2.x - pt.x) * 180) / Math.PI;
            plane.setAttribute(
              'transform',
              `translate(${pt.x.toFixed(1)} ${pt.y.toFixed(1)}) rotate(${(ang + 90).toFixed(1)})`,
            );
            plane.style.opacity = '1';
          }
        } else {
          plane.style.opacity = '0';
        }
      } else {
        r.style.opacity = '0';
        planes[i].style.opacity = '0';
      }
    });
  };

  const onScroll = (): void => {
    if (scrollQueued) return;
    scrollQueued = true;
    requestAnimationFrame(() => {
      scrollQueued = false;
      const rect = section.getBoundingClientRect();
      const vh = window.innerHeight || 1;
      // Hero is the first screen: progress starts at 0 on load and reaches 1
      // as the hero scrolls out of the viewport.
      currentProgress = Math.min(1, Math.max(0, -rect.top / (vh * 0.92)));
      world.style.transform = `rotate(${(-10 + 12 * currentProgress).toFixed(2)}deg)`;
      drawRoute(currentProgress);
    });
  };
  window.addEventListener('scroll', onScroll, { passive: true });
  window.addEventListener('resize', onScroll, { passive: true });
  onScroll();

  if (prefersReduced) {
    // Static beautiful globe: several routes drawn, no planes, no drag motion
    renderSync();
    routes.forEach((r, i) => {
      r.style.strokeDasharray = 'none';
      r.style.strokeDashoffset = '0';
      if (i < 3) {
        r.style.opacity = String(0.85 - i * 0.25);
      }
    });
    planes.forEach((m) => (m.style.opacity = '0'));
    return;
  }

  // ── Drag to rotate (mouse + touch) ──
  let dragging = false;
  let lastX = 0;
  let lastY = 0;
  let velLon = 0;
  let inertiaRaf = 0;

  wrap.addEventListener('pointerdown', (e: PointerEvent) => {
    if (e.button !== undefined && e.button !== 0) return;
    dragging = true;
    lastX = e.clientX;
    lastY = e.clientY;
    velLon = 0;
    wrap.style.cursor = 'grabbing';
    if (hint) hint.style.opacity = '0.3';
    try {
      wrap.setPointerCapture(e.pointerId);
    } catch {
      /* ignore */
    }
    e.preventDefault();
  });

  const endDrag = (): void => {
    if (!dragging) return;
    dragging = false;
    wrap.style.cursor = '';
    if (hint) {
      hint.style.opacity = '0.55';
    }
    if (inertiaRaf) {
      cancelAnimationFrame(inertiaRaf);
      inertiaRaf = 0;
    }
    if (Math.abs(velLon) > 0.05 && !prefersReduced) {
      let prevNow = performance.now();
      const loop = (now: number): void => {
        const dt = Math.min(48, now - prevNow);
        prevNow = now;
        view.lon = Math.max(-LON_WINDOW, Math.min(LON_WINDOW, view.lon + velLon * dt * 0.82));
        velLon *= 0.916;
        render();
        if (Math.abs(velLon) > 0.04) {
          inertiaRaf = requestAnimationFrame(loop);
        } else {
          velLon = 0;
        }
      };
      inertiaRaf = requestAnimationFrame(loop);
    }
  };

  wrap.addEventListener('pointermove', (e: PointerEvent) => {
    if (!dragging) return;
    const dx = e.clientX - lastX;
    const dy = e.clientY - lastY;
    lastX = e.clientX;
    lastY = e.clientY;
    view.lon = Math.max(-LON_WINDOW, Math.min(LON_WINDOW, view.lon - dx * 0.3));
    view.lat = Math.max(-LAT_WINDOW, Math.min(LAT_WINDOW, view.lat + dy * 0.18));
    velLon = -dx * 0.3;
    render();
    e.preventDefault();
  });

  wrap.addEventListener('pointerup', endDrag);
  wrap.addEventListener('pointercancel', endDrag);
  window.addEventListener('pointerup', endDrag);

  renderSync();
}
