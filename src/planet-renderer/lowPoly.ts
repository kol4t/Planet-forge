// Ląd planety 3D w stylu low-poly: tarasy wysokości (płaskowyże, uskoki), jeden kolor na fasetę,
// ciemniejsze uskoki między tarasami. v0.47 (prototyp A): kolor fasety ze średniej jej wierzchołków (granice biomów
// wzdłuż krawędzi, bez „ząbków”), jasność zmienia się płatami (gładki szum) zamiast losowo co trójkąt („szachownica”),
// przyciemnienie tylko na prawdziwych uskokach tarasów i łagodniejsze (bez czarnych trójkątów).
// Czysta matematyka — bez three, testowalna. Wejście: lista trójkątów na sferze jednostkowej.
import { createNoise3D } from '../core/random/noise.ts';
import type { Planet, SurfaceStyle } from '../core/types.ts';
import type { SurfaceSampler } from './surface.ts';

export interface LowPolyLand {
  /** Pozycje wierzchołków (3 na trójkąt — każda faseta ma własne wierzchołki i kolor). */
  positions: Float32Array;
  colors: Float32Array;
  /** Fasety lawy (osobna, świecąca siatka tuż nad lądem): pozycje i jasność 0..1 na wierzchołek. */
  lava: { positions: Float32Array; heat: Float32Array };
}

/** Siatka lawy wisi tyle nad lądem (ułamek promienia) — bez migotania z lądem pod spodem. */
export const LAVA_LIFT = 1.0025;

const smoothstep = (a: number, b: number, x: number) => {
  const t = Math.min(1, Math.max(0, (x - a) / (b - a)));
  return t * t * (3 - 2 * t);
};

/** Wysokość lądu po „tarasowaniu”: płaskie poziomy z krótkimi zboczami (0..1 nad poziomem morza). */
export function terrace(t: number, steps: number): number {
  if (steps <= 0) return t;
  const x = Math.max(0, t) * steps;
  const floor = Math.floor(x);
  // Większość poziomu płaska, krótka rampa na końcu — czytelne płaskowyże i uskoki bez pęknięć siatki.
  return (floor + smoothstep(0.45, 1, x - floor)) / steps;
}

/**
 * Najniższy ląd stoi tuż nad taflą morza (1,001). Bez tego najniższy taras (promień 1,0) chował się
 * pod wodą i nizinne wybrzeża w 3D wyglądały jak płycizna, choć w grze są lądem (v0.26.3).
 */
export const LAND_BASE_RADIUS = 1.004;

/** Promień powierzchni 3D (ląd tarasowany i wyższy o `relief`, dno morza jak dotąd). */
export function shapedRadius(planet: Planet, h: number): number {
  const v = planet.visual;
  const sea = v.seaLevel;
  if (h < sea) return 1 - (sea - h) * 0.25;
  const t = terrace((h - sea) / (1 - sea), v.style.terraces);
  return LAND_BASE_RADIUS + t * (1 - sea) * v.terrainAmplitude * 2.2 * v.style.relief;
}

/** Wysokość „wyrównana do tarasu” — cały płaskowyż dostaje jeden kolor pasma. */
function bandHeight(planet: Planet, h: number): number {
  const sea = planet.visual.seaLevel;
  if (h < sea) return h;
  return sea + terrace((h - sea) / (1 - sea), planet.visual.style.terraces) * (1 - sea);
}

/** Promień tafli lodu na zamarzniętym morzu (tuż nad powierzchnią wody 1,001). */
export const FROZEN_SEA_RADIUS = 1.004;

/** Częstotliwość płatów jasności (na sferze jednostkowej) — płat obejmuje kilka–kilkanaście faset. */
const SHADE_PATCH_FREQUENCY = 5;
/** Najsilniejsze przyciemnienie uskoku tarasu (wcześniej do 45% — ściany wyglądały jak dziury). */
const MAX_CLIFF_SHADE = 0.25;

/**
 * Normalna fasety przechylona w stronę „w górę” (kierunek od środka planety) w tym stopniu (0 — czysta normalna fasety,
 * 1 — gładka kula). Wysokość terenu zmienia się co wierzchołek, więc czyste normalne faset skakały w losowe strony
 * i światło dawało szachownicę oraz czarne ściany tarasów. 0,5: fasety dalej widoczne, kontrast światła o połowę mniejszy.
 */
export const FACET_NORMAL_BLEND = 0.5;

/** Normalne „faset” dla ładu (3 wierzchołki na trójkąt, wszystkie z jedną normalną fasety przechyloną ku górze). */
export function facetNormals(positions: Float32Array, blend = FACET_NORMAL_BLEND): Float32Array {
  const normals = new Float32Array(positions.length);
  for (let o = 0; o < positions.length; o += 9) {
    const ax = positions[o + 3]! - positions[o]!;
    const ay = positions[o + 4]! - positions[o + 1]!;
    const az = positions[o + 5]! - positions[o + 2]!;
    const bx = positions[o + 6]! - positions[o]!;
    const by = positions[o + 7]! - positions[o + 1]!;
    const bz = positions[o + 8]! - positions[o + 2]!;
    let nx = ay * bz - az * by;
    let ny = az * bx - ax * bz;
    let nz = ax * by - ay * bx;
    const nl = Math.hypot(nx, ny, nz) || 1;
    let ux = positions[o]! + positions[o + 3]! + positions[o + 6]!;
    let uy = positions[o + 1]! + positions[o + 4]! + positions[o + 7]!;
    let uz = positions[o + 2]! + positions[o + 5]! + positions[o + 8]!;
    const ul = Math.hypot(ux, uy, uz) || 1;
    ux /= ul;
    uy /= ul;
    uz /= ul;
    // Trójkąty sfery są nawinięte na zewnątrz; gdyby nie — odwrócona normalna wskazywałaby do środka.
    const sign = nx * ux + ny * uy + nz * uz < 0 ? -1 : 1;
    nx = (sign * nx) / nl;
    ny = (sign * ny) / nl;
    nz = (sign * nz) / nl;
    let mx = nx * (1 - blend) + ux * blend;
    let my = ny * (1 - blend) + uy * blend;
    let mz = nz * (1 - blend) + uz * blend;
    const ml = Math.hypot(mx, my, mz) || 1;
    mx /= ml;
    my /= ml;
    mz /= ml;
    for (let k = 0; k < 9; k += 3) {
      normals[o + k] = mx;
      normals[o + k + 1] = my;
      normals[o + k + 2] = mz;
    }
  }
  return normals;
}

/**
 * Promień wygładzenia wysokości do koloru (rad, ok. jeden trójkąt siatki). Wysokość terenu zmienia się szybciej niż
 * siatka — kolor pasm z surowej wysokości skakał co wierzchołek (szachownica piasku i skały). Kształt bez zmian.
 */
const COLOR_SMOOTH_RADIUS = 0.028;

/** Średnia wysokość w punkcie i w 6 punktach wokół (płaszczyzna styczna) — tylko do koloru. */
function smoothHeight(sampler: SurfaceSampler, x: number, y: number, z: number): number {
  const hx = Math.abs(y) < 0.9 ? 0 : 1;
  const hy = Math.abs(y) < 0.9 ? 1 : 0;
  // Wschód = pomocniczy × punkt, północ = punkt × wschód.
  let ex = hy * z;
  let ey = -hx * z;
  let ez = hx * y - hy * x;
  const el = Math.hypot(ex, ey, ez) || 1;
  ex /= el;
  ey /= el;
  ez /= el;
  const nx = y * ez - z * ey;
  const ny = z * ex - x * ez;
  const nz = x * ey - y * ex;
  let sum = sampler.height(x, y, z);
  for (let k = 0; k < 6; k++) {
    const a = (k * Math.PI) / 3;
    const c = Math.cos(a) * COLOR_SMOOTH_RADIUS;
    const s = Math.sin(a) * COLOR_SMOOTH_RADIUS;
    const px = x + ex * c + nx * s;
    const py = y + ey * c + ny * s;
    const pz = z + ez * c + nz * s;
    const l = Math.hypot(px, py, pz) || 1;
    sum += sampler.height(px / l, py / l, pz / l);
  }
  return sum / 7;
}

/** Numer tarasu wysokości (−1 — pod wodą), do wykrycia uskoków między tarasami. */
function terraceLevel(planet: Planet, h: number): number {
  const sea = planet.visual.seaLevel;
  if (h < sea) return -1;
  const steps = planet.visual.style.terraces;
  return steps <= 0 ? 0 : Math.floor(Math.max(0, (h - sea) / (1 - sea)) * steps);
}

/**
 * Buduje ląd: `unitTriangles` to trójkąty sfery jednostkowej (x,y,z × 3 na trójkąt).
 * Wysokość liczona raz na wierzchołek (wspólne wierzchołki = szczelna powierzchnia).
 */
export function buildLowPolyLand(planet: Planet, sampler: SurfaceSampler, unitTriangles: Float32Array): LowPolyLand {
  const style: SurfaceStyle = planet.visual.style;
  const faces = unitTriangles.length / 9;
  const positions = new Float32Array(unitTriangles.length);
  const colors = new Float32Array(unitTriangles.length);
  const sea = planet.visual.seaLevel;
  const cache = new Map<number, { h: number; r: number; level: number; color: readonly number[] }>();
  const patches = createNoise3D(planet.visual.noiseSeed ^ 0x2c1b3c6d);
  const vertex = (x: number, y: number, z: number) => {
    // Klucz liczbowy z współrzędnych zaokrąglonych do 1e-5 (dokładna liczba całkowita < 2^53) —
    // wielokrotnie szybszy niż tekstowy, a wspólne wierzchołki trafiają w ten sam wpis.
    const key = ((Math.round(x * 1e5) + 100000) * 200001 + Math.round(y * 1e5) + 100000) * 200001 + Math.round(z * 1e5) + 100000;
    let v = cache.get(key);
    if (!v) {
      const h = sampler.height(x, y, z);
      // Zamarznięte morze: płaska tafla lodu tuż nad wodą (inaczej lód chowa się pod oceanem).
      const frozen = h < sea && sampler.ice(h, x, y, z) > 0.5;
      // Jezioro: płaskie lustro na poziomie przelewu (dno pod nim nie jest widoczne).
      const level = h >= sea ? sampler.lakeLevel(x, y, z) : -1;
      const r = frozen ? FROZEN_SEA_RADIUS : level > h ? shapedRadius(planet, level) : shapedRadius(planet, h);
      // Kolor z wysokości wygładzonej, ale woda i ląd rozróżniane po prawdziwej wysokości (brzeg w tym samym miejscu).
      const soft = smoothHeight(sampler, x, y, z);
      const tone = h >= sea ? Math.max(sea, soft) : Math.min(soft, sea - 1e-6);
      v = { h, r, level: terraceLevel(planet, h), color: sampler.color(bandHeight(planet, tone), x, y, z) };
      cache.set(key, v);
    }
    return v;
  };
  const p = [0, 0, 0, 0, 0, 0, 0, 0, 0];
  const lavaPositions: number[] = [];
  const lavaHeat: number[] = [];
  const rgb = [0, 0, 0];
  for (let f = 0; f < faces; f++) {
    let hSum = 0;
    let lowest = Infinity;
    let highest = -Infinity;
    rgb[0] = rgb[1] = rgb[2] = 0;
    let cx = 0;
    let cy = 0;
    let cz = 0;
    for (let k = 0; k < 3; k++) {
      const o = f * 9 + k * 3;
      const len = Math.hypot(unitTriangles[o]!, unitTriangles[o + 1]!, unitTriangles[o + 2]!) || 1;
      const x = unitTriangles[o]! / len;
      const y = unitTriangles[o + 1]! / len;
      const z = unitTriangles[o + 2]! / len;
      const v = vertex(x, y, z);
      hSum += v.h;
      lowest = Math.min(lowest, v.level);
      highest = Math.max(highest, v.level);
      rgb[0] += v.color[0]! / 3;
      rgb[1] += v.color[1]! / 3;
      rgb[2] += v.color[2]! / 3;
      p[k * 3] = x * v.r;
      p[k * 3 + 1] = y * v.r;
      p[k * 3 + 2] = z * v.r;
      cx += x;
      cy += y;
      cz += z;
    }
    const cl = Math.hypot(cx, cy, cz) || 1;
    cx /= cl;
    cy /= cl;
    cz /= cl;
    // Normalna fasety vs kierunek „w górę”: im bardziej stroma, tym ciemniejsza (klif, szczelina).
    const ax = p[3]! - p[0]!;
    const ay = p[4]! - p[1]!;
    const az = p[5]! - p[2]!;
    const bx = p[6]! - p[0]!;
    const by = p[7]! - p[1]!;
    const bz = p[8]! - p[2]!;
    let nx = ay * bz - az * by;
    let ny = az * bx - ax * bz;
    let nz = ax * by - ay * bx;
    const nl = Math.hypot(nx, ny, nz) || 1;
    nx /= nl;
    ny /= nl;
    nz /= nl;
    const slope = 1 - Math.abs(nx * cx + ny * cy + nz * cz);
    const h = hSum / 3;
    const [r, g, b] = rgb as [number, number, number];
    // Tylko lawa na lądzie — morze lawy ma własną teksturę skorupy (PlanetView).
    const heat = h >= sea ? sampler.glow(h, cx, cy, cz) : 0;
    if (heat > 0.05) {
      for (let k = 0; k < 9; k++) lavaPositions.push(p[k]! * LAVA_LIFT);
      lavaHeat.push(heat, heat, heat);
    }
    // Uskok = faseta łącząca dwa tarasy lądu; płaskie fasety tarasu nie są przyciemniane.
    const step = lowest >= 0 && highest > lowest;
    const cliff = step ? Math.min(MAX_CLIFF_SHADE, style.cliffShade * 0.6) * smoothstep(0.03, 0.2, slope) : 0;
    const shade = (1 - cliff) * (1 + style.facetJitter * patches(cx * SHADE_PATCH_FREQUENCY, cy * SHADE_PATCH_FREQUENCY, cz * SHADE_PATCH_FREQUENCY));
    for (let k = 0; k < 3; k++) {
      const o = f * 9 + k * 3;
      positions[o] = p[k * 3]!;
      positions[o + 1] = p[k * 3 + 1]!;
      positions[o + 2] = p[k * 3 + 2]!;
      colors[o] = Math.min(1, r * shade);
      colors[o + 1] = Math.min(1, g * shade);
      colors[o + 2] = Math.min(1, b * shade);
    }
  }
  return { positions, colors, lava: { positions: new Float32Array(lavaPositions), heat: new Float32Array(lavaHeat) } };
}
