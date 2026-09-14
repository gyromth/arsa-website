// Build-time generator for the Global Reach globe (run: node scripts/build-globe.mjs)
// Projects Natural Earth land polygons, a graticule, city points and great-circle
// routes onto an orthographic sphere and splices the result into index.html.
// No runtime dependency: generated SVG paths are committed statically.
import { readFileSync, writeFileSync } from 'node:fs';
import * as topojson from 'topojson-client';
import {
  geoOrthographic,
  geoPath,
  geoGraticule,
  geoInterpolate,
} from 'd3-geo';

const R = 280;
const CX = 300;
const CY = 300;

// View centered on 45E / 15N: shows Europe, Africa, Asia, Australia and the
// Antarctic rim while keeping all route endpoints on the near hemisphere.
const projection = geoOrthographic()
  .rotate([-45, -15])
  .translate([CX, CY])
  .scale(R)
  .clipAngle(90);
const path = geoPath(projection).pointRadius(3);

const land = topojson.feature(
  JSON.parse(readFileSync(new URL('./land-110m.json', import.meta.url), 'utf8')),
  'land',
);

const cities = {
  delhi: [77.2, 28.6],
  moscow: [37.6, 55.75],
  bangkok: [100.5, 13.75],
  frankfurt: [8.68, 50.1],
  singapore: [103.8, 1.35],
  london: [-0.1, 51.5],
};

// Same six route pairs as before (west -> hub, hub -> Asia): the former
// New York / Tokyo endpoints are re-anchored to London / Singapore so every
// arc lies fully on the visible hemisphere.
const routePairs = [
  ['delhi', 'moscow'],
  ['delhi', 'bangkok'],
  ['london', 'bangkok'],
  ['delhi', 'frankfurt'],
  ['delhi', 'singapore'],
  ['london', 'frankfurt'],
];

function fmt(n) {
  return Math.round(n * 10) / 10;
}

function projectPoint(city) {
  const [x, y] = projection(cities[city]);
  return [fmt(x), fmt(y)];
}

function routePath(a, b) {
  const interp = geoInterpolate(cities[a], cities[b]);
  const pts = [];
  const N = 64;
  for (let i = 0; i <= N; i++) {
    const [x, y] = projection(interp(i / N));
    if (x === undefined) return null;
    pts.push(`${i === 0 ? 'M' : 'L'}${fmt(x)} ${fmt(y)}`);
  }
  return pts.join(' ');
}

const routesHTML = routePairs
  .map(([a, b]) => {
    const d = routePath(a, b);
    if (!d) throw new Error(`Route ${a}->${b} crosses the horizon`);
    return `                <path class="globe__route" d="${d}"/>`;
  })
  .join('\n');

const pointsHTML = routePairs
  .flatMap(([a, b]) => [a, b])
  .filter((c, i, arr) => arr.indexOf(c) === i)
  .map((c) => {
    const [x, y] = projectPoint(c);
    const r = c === 'delhi' ? 3.5 : c === 'moscow' || c === 'bangkok' ? 3 : 2.5;
    return `                <circle class="globe__point" cx="${x}" cy="${y}" r="${r}"/>`;
  })
  .join('\n');

const planesHTML = routePairs
  .map(
    () =>
      `                <g class="globe__plane"><path d="M0 -7 L3 -2 L3 4 L0 6 L-3 4 L-3 -2 Z"/></g>`,
  )
  .join('\n');

const graticulePath = path(geoGraticule().step([30, 30])());
const landHTML = geoPath(projection)(land);
if (!graticulePath || !landHTML) throw new Error('land or graticule is null');

if (landHTML.length > 40000) {
  console.log(`land path size: ${(landHTML.length / 1024).toFixed(1)} kB`);
}

const worldBlock = `              <clipPath id="globeClip"><circle cx="300" cy="300" r="${R}"/></clipPath>
              <clipPath id="globeClip"><circle cx="300" cy="300" r="279"/></clipPath>
              <g clip-path="url(#globeClip)"><g class="globe__world">
                <path class="globe__grid" d="${graticulePath}" stroke="rgba(255,255,255,0.06)" stroke-width="1"/>
                <line x1="20" y1="300" x2="580" y2="300" stroke="rgba(255,255,255,0.1)" stroke-width="1"/>
                <g class="globe__land" fill="rgba(56,189,248,0.05)" stroke="rgba(56,189,248,0.3)" stroke-width="1">
                  <path d="${landHTML}"/>
                </g>
${pointsHTML}
${routesHTML}
${planesHTML}
              </g></g>
              <circle cx="300" cy="300" r="380.7" fill="none" stroke="#e8ecf2" stroke-width="200"/>`;

let html = readFileSync('index.html', 'utf8');
const re =
  /<clipPath id="globeClip">[\s\S]*?<\/svg>|<g class="globe__world"[\s\S]*?<\/g>\n\s*<\/svg>/;
if (!re.test(html)) {
  throw new Error('globe__world block not found');
}
html = html.replace(re, `${worldBlock}\n            </svg>`);
writeFileSync('index.html', html);

// Report visibility check for every route endpoint.
for (const c of Object.keys(cities)) {
  const d = projection(cities[c]);
  const dx = d[0] - CX;
  const dy = d[1] - CY;
  console.log(
    `${c.padEnd(10)} x=${fmt(d[0])} y=${fmt(d[1])} dist=${(Math.hypot(dx, dy) / R).toFixed(3)}`,
  );
}
console.log('index.html updated');
