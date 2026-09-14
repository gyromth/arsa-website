// ── Hero interactive globe ─────────────────────────────────
// Orthographic SVG globe rendered in JS from simplified Natural Earth data.
// Drag (mouse/touch) rotates the view freely by 360°; demo flights play as a
// sequential route sequence while the hero is on screen (no idle CPU work).
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
const LAT_WINDOW = 24; // gentle vertical drag window (deg)
const ROUTE_SAMPLES = 44;
const ROUTE_DRAW_MS = 3000; // route draw duration
const ROUTE_HOLD_MS = 1100; // pause between routes
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

  // Free 360° rotation: lonOffset is unbounded; sin/cos are periodic so the
  // projection stays continuous across the ±180° wrap without jumps.
  const view = { lon: 0, lat: 0 };
  const lengths: number[] = [];
  const routePts: (ProjectedPoint | null)[][] = [];

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

  let renderQueued = false;
  const render = (): void => {
    if (renderQueued) return;
    renderQueued = true;
    requestAnimationFrame(() => {
      renderQueued = false;
      renderSync();
      drawActive();
    });
  };

  const hint = wrap.querySelector<HTMLElement>('.hero-globe__hint');

  // ── Sequential demo flights A → B (rAF only while the hero is visible) ──
  let activeIdx = 0;
  let tPhase = 'draw';
  let tPhaseT = 0;
  let seqRaf = 0;
  let seqLast = 0;
  let heroVisible = true;

  const drawActive = (): void => {
    const t = tPhase === 'draw' ? Math.min(1, tPhaseT) : 1;
    routes.forEach((r, i) => {
      const L = lengths[i];
      if (i !== activeIdx) {
        r.style.opacity = '0';
        planes[i].style.opacity = '0';
        return;
      }
      if (!L) {
        // partial route (poles not both on the visible hemisphere):
        // keep visible segments steady, no animated plane
        r.style.strokeDasharray = 'none';
        r.style.strokeDashoffset = '0';
        r.style.opacity = '0.5';
        planes[i].style.opacity = '0';
        return;
      }
      r.style.strokeDasharray = String(L);
      r.style.strokeDashoffset = String(L * (1 - t));
      r.style.opacity = tPhase === 'hold' ? '0.55' : '0.95';
      const plane = planes[i];
      const samples = routePts[i];
      if (plane && samples && samples.length > 2) {
        const ti = t * (samples.length - 1);
        const i0 = Math.max(0, Math.min(samples.length - 2, Math.floor(ti)));
        const pt = samples[i0];
        const pt2 = samples[i0 + 1];
        if (pt && pt2) {
          const ang = (Math.atan2(pt2.y - pt.y, pt2.x - pt.x) * 180) / Math.PI;
          plane.setAttribute(
            'transform',
            `translate(${pt.x.toFixed(1)} ${pt.y.toFixed(1)}) rotate(${(ang + 90).toFixed(1)})`,
          );
          plane.style.opacity = '1';
        } else {
          plane.style.opacity = '0';
        }
      }
    });
  };

  const seqStep = (now: number): void => {
    if (!heroVisible) {
      seqRaf = 0;
      return;
    }
    const dt = Math.min(64, now - seqLast);
    seqLast = now;
    if (tPhase === 'draw') {
      tPhaseT += dt / ROUTE_DRAW_MS;
      if (tPhaseT >= 1) {
        tPhaseT = 1;
        tPhase = 'hold';
      }
    } else {
      tPhaseT += dt / ROUTE_HOLD_MS;
      if (tPhaseT >= 1) {
        tPhase = 'draw';
        tPhaseT = 0;
        activeIdx = (activeIdx + 1) % routes.length;
        routes.forEach((r, i) => {
          if (i !== activeIdx) r.style.opacity = '0';
        });
      }
    }
    drawActive();
    seqRaf = requestAnimationFrame(seqStep);
  };

  const startSeq = (): void => {
    if (seqRaf || prefersReduced) return;
    seqLast = performance.now();
    seqRaf = requestAnimationFrame(seqStep);
  };
  const stopSeq = (): void => {
    if (seqRaf) cancelAnimationFrame(seqRaf);
    seqRaf = 0;
  };

  renderSync();

  if (prefersReduced) {
    // Static premium globe: several routes drawn, no planes, no motion.
    routes.forEach((r, i) => {
      r.style.strokeDasharray = 'none';
      r.style.strokeDashoffset = '0';
      if (i < 3) r.style.opacity = String(0.8 - i * 0.22);
    });
    planes.forEach((m) => (m.style.opacity = '0'));
    return;
  }

  drawActive();
  const visibleObserver = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        heroVisible = entry.isIntersecting;
        if (heroVisible) startSeq();
        else stopSeq();
      });
    },
    { threshold: 0.08 },
  );
  visibleObserver.observe(section);
  startSeq();

  // ── Drag to rotate (mouse + touch), free 360° — natural direction ──
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

  wrap.addEventListener('pointermove', (e: PointerEvent) => {
    if (!dragging) return;
    const dx = e.clientX - lastX;
    const dy = e.clientY - lastY;
    lastX = e.clientX;
    lastY = e.clientY;
    // lonOffset accumulates freely — sin/cos are periodic, so projection stays
    // continuous across ±180°; the surface follows the cursor direction.
    view.lon -= dx * 0.28;
    view.lat = Math.max(-LAT_WINDOW, Math.min(LAT_WINDOW, view.lat + dy * 0.18));
    velLon = -dx * 0.28;
    render();
    e.preventDefault();
  });

  const endDrag = (): void => {
    if (!dragging) return;
    dragging = false;
    wrap.style.cursor = '';
    if (hint) hint.style.opacity = '0.55';
    if (inertiaRaf) {
      cancelAnimationFrame(inertiaRaf);
      inertiaRaf = 0;
    }
    if (Math.abs(velLon) > 0.05) {
      let prevNow = performance.now();
      const loop = (now: number): void => {
        const dt = Math.min(48, now - prevNow);
        prevNow = now;
        view.lon += velLon * dt * 0.82;
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

  wrap.addEventListener('pointerup', endDrag);
  wrap.addEventListener('pointercancel', endDrag);
  window.addEventListener('pointerup', endDrag);
}
