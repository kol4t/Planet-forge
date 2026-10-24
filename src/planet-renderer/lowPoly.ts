// Ląd planety 3D w stylu low-poly: tarasy wysokości (płaskowyże, uskoki), jeden kolor na fasetę
// (ostre granice biomów zamiast rozmytych plam), ciemniejsze strome ściany (klify, szczeliny).
// Czysta matematyka — bez three, testowalna. Wejście: lista trójkątów na sferze jednostkowej.
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

/** Promień powierzchni 3D (ląd tarasowany i wyższy o `relief`, dno morza jak dotąd). */
export function shapedRadius(planet: Planet, h: number): number {
  const v = planet.visual;
  const sea = v.seaLevel;
  if (h < sea) return 1 - (sea - h) * 0.25;
  const t = terrace((h - sea) / (1 - sea), v.style.terraces);
  return 1 + t * (1 - sea) * v.terrainAmplitude * 2.2 * v.style.relief;
}

/** Wysokość „wyrównana do tarasu” — cały płaskowyż dostaje jeden kolor pasma. */
function bandHeight(planet: Planet, h: number): number {
  const sea = planet.visual.seaLevel;
  if (h < sea) return h;
  return sea + terrace((h - sea) / (1 - sea), planet.visual.style.terraces) * (1 - sea);
}

/** Promień tafli lodu na zamarzniętym morzu (tuż nad powierzchnią wody 1,001). */
export const FROZEN_SEA_RADIUS = 1.004;

/** Stała „losowość” fasety z jej indeksu (tylko wygląd). */
function jitter(i: number): number {
  const s = Math.sin(i * 12.9898 + 78.233) * 43758.5453;
  return s - Math.floor(s) - 0.5;
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
  const cache = new Map<string, { h: number; r: number }>();
  const vertex = (x: number, y: number, z: number) => {
    const key = `${x.toFixed(5)},${y.toFixed(5)},${z.toFixed(5)}`;
    let v = cache.get(key);
    if (!v) {
      const h = sampler.height(x, y, z);
      // Zamarznięte morze: płaska tafla lodu tuż nad wodą (inaczej lód chowa się pod oceanem).
      const frozen = h < sea && sampler.ice(h, x, y, z) > 0.5;
      // Jezioro: płaskie lustro na poziomie przelewu (dno pod nim nie jest widoczne).
      const level = h >= sea ? sampler.lakeLevel(x, y, z) : -1;
      const r = frozen ? FROZEN_SEA_RADIUS : level > h ? shapedRadius(planet, level) : shapedRadius(planet, h);
      v = { h, r };
      cache.set(key, v);
    }
    return v;
  };
  const p = [0, 0, 0, 0, 0, 0, 0, 0, 0];
  const lavaPositions: number[] = [];
  const lavaHeat: number[] = [];
  for (let f = 0; f < faces; f++) {
    let hSum = 0;
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
    const [r, g, b] = sampler.color(bandHeight(planet, h), cx, cy, cz);
    const heat = sampler.glow(cx, cy, cz);
    if (heat > 0.05) {
      for (let k = 0; k < 9; k++) lavaPositions.push(p[k]! * LAVA_LIFT);
      lavaHeat.push(heat, heat, heat);
    }
    const shade = (1 - style.cliffShade * smoothstep(0.02, 0.18, slope)) * (1 + style.facetJitter * jitter(f));
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
