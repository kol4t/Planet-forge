// Odwiert planetarny (v0.48): czysta geometria (bez three) — studnia od krawędzi niecki kryształów w głąb planety,
// warstwy geologiczne na ścianach, pęknięcia i rozgrzane dno (blask), na etapie 8 jaskinia płaszcza z jądrem.
// Wszystko w układzie planety (promień powierzchni ≈ 1): studnia przypięta do niecki, obraca się razem z planetą.
// PlanetView ukrywa ląd w otworze (wierzchołki przypięte do okręgu krawędzi) i rysuje to jako dwie siatki.
import { DRILL_STAGE_LEVELS, type DrillLook } from '../data/drill.ts';
import { hash01, type Vec3 } from './colony.ts';

/** Etap odwiertu 1…8 z poziomu budynku (0 — brak budynku). */
export function drillStage(level: number): number {
  let stage = 0;
  for (const from of DRILL_STAGE_LEVELS) if (level >= from) stage++;
  return stage;
}

/** Głębokość krateru (niecki) na etapie — ułamek promienia planety. */
export const CRATER_DEPTH = [0, 0.025, 0.04, 0.055, 0.07, 0.08, 0.09, 0.1, 0.11] as const;
/** Promień kątowy otworu studni na etapie (rad, od środka niecki); etap 1 — bez studni (urządzenia na powierzchni). */
const SHAFT_ANGLE = [0, 0, 0.05, 0.07, 0.09, 0.11, 0.14, 0.18, 0.26] as const;
/** Dno studni (promień od środka planety); etapy 2–3 — względem krawędzi (płytko). */
const SHAFT_BOTTOM = [0, 0, -0.035, -0.07, 0.8, 0.73, 0.67, 0.63, 0.6] as const;
/** Jaskinia płaszcza i jądro (etap 8). */
export const CAVITY_RADIUS = 0.6;
export const CORE_RADIUS = 0.3;
/** Granice warstw (promień od środka planety): skorupa / głębsza skorupa / płaszcz / strefa gorąca. */
export const LAYER_RADII = [0.9, 0.78, 0.66] as const;

export interface DrillParams {
  stage: number;
  /** Promień kątowy otworu (rad) i promień krawędzi (od środka planety). */
  rimAngle: number;
  rimRadius: number;
  /** Dno studni (promień od środka planety). */
  bottom: number;
  /** Etap 8: jaskinia płaszcza i jądro (promienie); wcześniej null. */
  cavity: number | null;
  core: number | null;
}

/**
 * Parametry studni dla etapu. `craterAngle` — promień kątowy niecki (otwór najwyżej 55% niecki), `rimRadius` —
 * wysokość dna niecki na krawędzi otworu. Etap < 2 — null (bez studni).
 */
export function drillParams(stage: number, craterAngle: number, rimRadius: number): DrillParams | null {
  const s = Math.max(0, Math.min(8, Math.floor(stage)));
  if (s < 2) return null;
  const rimAngle = Math.min(SHAFT_ANGLE[s]!, craterAngle * 0.55);
  const raw = SHAFT_BOTTOM[s]!;
  const bottom = raw < 0 ? rimRadius + raw : Math.min(raw, rimRadius - 0.1);
  return { stage: s, rimAngle, rimRadius, bottom, cavity: s >= 8 ? CAVITY_RADIUS : null, core: s >= 8 ? CORE_RADIUS : null };
}

/** Promień kątowy otworu studni dla poziomu budynku i niecki (0 — bez studni) — kolonia stawia obok niego budowle. */
export const shaftAngle = (level: number, craterAngle: number) => drillParams(drillStage(level), craterAngle, 1)?.rimAngle ?? 0;

/** Warstwa (0 — skorupa … 3 — strefa gorąca) na danym promieniu od środka planety. */
export function layerAt(radius: number): number {
  let layer = 0;
  for (const r of LAYER_RADII) if (radius < r) layer++;
  return layer;
}

type Rgb = [number, number, number];
const hex = (h: string): Rgb => {
  const n = parseInt(h.replace('#', ''), 16);
  return [((n >> 16) & 255) / 255, ((n >> 8) & 255) / 255, (n & 255) / 255];
};
const mix = (a: Rgb, b: Rgb, t: number): Rgb => [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t];
const scale = (a: Rgb, k: number): Rgb => [Math.min(1, a[0] * k), Math.min(1, a[1] * k), Math.min(1, a[2] * k)];

const norm = (v: Vec3): Vec3 => {
  const l = Math.hypot(v[0], v[1], v[2]) || 1;
  return [v[0] / l, v[1] / l, v[2] / l];
};
const cross = (a: Vec3, b: Vec3): Vec3 => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];

/** Ortonormalna baza wokół osi `n` (u, v ⟂ n). */
export function axisFrame(n: Vec3): [Vec3, Vec3] {
  const helper: Vec3 = Math.abs(n[1]) < 0.9 ? [0, 1, 0] : [1, 0, 0];
  const u = norm(cross(helper, n));
  return [u, cross(n, u)];
}

/** Punkt okręgu krawędzi otworu w kierunku `bearing` (rad) — tam PlanetView przypina ląd z wnętrza otworu. */
export function rimPoint(n: Vec3, p: DrillParams, bearing: number): Vec3 {
  const [u, v] = axisFrame(n);
  const c = Math.cos(p.rimAngle) * p.rimRadius;
  const w = Math.sin(p.rimAngle) * p.rimRadius;
  const cb = Math.cos(bearing);
  const sb = Math.sin(bearing);
  return [n[0] * c + (u[0] * cb + v[0] * sb) * w, n[1] * c + (u[1] * cb + v[1] * sb) * w, n[2] * c + (u[2] * cb + v[2] * sb) * w];
}

/** Kierunek (bearing) punktu wokół osi `n` — do przypięcia wierzchołka lądu do krawędzi. */
export function bearingOf(n: Vec3, q: Vec3): number {
  const [u, v] = axisFrame(n);
  return Math.atan2(q[0] * v[0] + q[1] * v[1] + q[2] * v[2], q[0] * u[0] + q[1] * u[1] + q[2] * u[2]);
}

export interface DrillMesh {
  position: Float32Array;
  color: Float32Array;
}

/** Liczba boków studni (low-poly). */
const SIDES = 18;
/** Krok pierścieni ścian w głąb (ułamek promienia planety). */
const RING_STEP = 0.028;

/**
 * Geometria odwiertu: `walls` — ściany studni z półkami między warstwami, dno albo (etap 8) jaskinia płaszcza z otworem
 * (cieniowane, kolory wpieczone: ciemniej w głąb, poświata jądra przy dnie); `glow` — pęknięcia, rozgrzane dno,
 * odłamki i jądro (bez cieniowania, świecą). Deterministyczna z `seed`.
 */
export function buildDrill(n: Vec3, p: DrillParams, look: DrillLook, seed = 0): { walls: DrillMesh; glow: DrillMesh } {
  const [u, v] = axisFrame(n);
  const layers = [hex(look.crust), hex(look.deepCrust), hex(look.mantle), hex(look.hot)];
  const glowRgb = hex(look.glow);
  const coreRgb = hex(look.core);
  const walls: { pos: number[]; col: number[] } = { pos: [], col: [] };
  const glow: { pos: number[]; col: number[] } = { pos: [], col: [] };
  const at = (h: number, w: number, bearing: number): Vec3 => {
    const cb = Math.cos(bearing);
    const sb = Math.sin(bearing);
    return [n[0] * h + (u[0] * cb + v[0] * sb) * w, n[1] * h + (u[1] * cb + v[1] * sb) * w, n[2] * h + (u[2] * cb + v[2] * sb) * w];
  };
  const tri = (m: typeof walls, a: Vec3, b: Vec3, c: Vec3, ca: Rgb, cb: Rgb = ca, cc: Rgb = ca) => {
    m.pos.push(...a, ...b, ...c);
    m.col.push(...ca, ...cb, ...cc);
  };
  // Poświata jądra / gorącego dna na ścianach (wpieczona — bez dynamicznego światła).
  const heat = (r: number) => {
    if (p.stage < 6) return 0;
    const reach = p.stage >= 8 ? 0.22 : p.stage >= 7 ? 0.14 : 0.07;
    const t = Math.max(0, 1 - (r - p.bottom) / reach);
    return t * t * (p.stage >= 8 ? 0.75 : p.stage >= 7 ? 0.55 : 0.25);
  };
  const wallColor = (r: number, ring: number, j: number): Rgb => {
    const layer = layerAt(r);
    const depth = Math.max(0, Math.min(1, (p.rimRadius - r) / Math.max(0.05, p.rimRadius - p.bottom)));
    const strata = ring % 2 === 0 ? 1 : 0.9;
    const grain = 0.94 + 0.12 * hash01(ring * 31 + j, seed + 3);
    // Studnia jest głęboka i wąska — mniej światła w głębi (wpieczone, ściany i tak są oświetlone słońcem).
    return mix(scale(layers[layer]!, 0.82 * (1 - 0.62 * depth) * strata * grain), glowRgb, heat(r));
  };

  // Pierścienie ścian: od okręgu krawędzi (dokładnie tam, gdzie przypięty ląd) w głąb; na granicach warstw półka
  // (zwężenie), nieregularność promienia i kąta (skaliste, nie walec).
  const top = Math.cos(p.rimAngle) * p.rimRadius;
  const w0 = Math.sin(p.rimAngle) * p.rimRadius;
  const rings: { h: number; w: number }[] = [{ h: top, w: w0 }];
  let w = w0;
  for (let h = top - RING_STEP; h > p.bottom + 1e-6; h -= RING_STEP) {
    const crossed = layerAt(h) !== layerAt(h + RING_STEP);
    if (crossed) {
      rings.push({ h: h + RING_STEP * 0.3, w });
      w *= 0.86;
      rings.push({ h: h + RING_STEP * 0.25, w });
    }
    w *= 0.985;
    rings.push({ h, w });
  }
  rings.push({ h: p.bottom, w: w * 0.97 });
  const jitter = (k: number, j: number) => (k === 0 ? 1 : 0.92 + 0.16 * hash01(k * 97 + j, seed + 1));
  const bearingAt = (k: number, j: number) => ((j + (k === 0 ? 0 : (hash01(k * 13 + j, seed + 2) - 0.5) * 0.35)) / SIDES) * Math.PI * 2;
  const ringPoint = (k: number, j: number) => {
    const ring = rings[k]!;
    const jj = j % SIDES;
    return at(ring.h, ring.w * jitter(k, jj), bearingAt(k, jj));
  };
  for (let k = 0; k + 1 < rings.length; k++) {
    for (let j = 0; j < SIDES; j++) {
      const a = ringPoint(k, j);
      const b = ringPoint(k, j + 1);
      const c = ringPoint(k + 1, j);
      const d = ringPoint(k + 1, j + 1);
      const ca = wallColor(rings[k]!.h, k, j);
      const cc = wallColor(rings[k + 1]!.h, k + 1, j);
      tri(walls, a, c, b, ca, cc, ca);
      tri(walls, b, c, d, ca, cc, cc);
    }
  }
  // Pęknięcia (od etapu 5 — oznaki ciepła): wąskie, świecące szczeliny na ścianach w głębi.
  if (p.stage >= 5) {
    const count = p.stage >= 7 ? 10 : 4;
    for (let i = 0; i < count; i++) {
      const k = Math.max(1, Math.floor(rings.length * (0.45 + 0.5 * hash01(i, seed + 5))));
      if (k + 1 >= rings.length) continue;
      const j = Math.floor(hash01(i, seed + 6) * SIDES);
      const r0 = rings[k]!;
      const r1 = rings[Math.min(rings.length - 1, k + 2)]!;
      const b0 = bearingAt(k, j) + 0.06;
      const shrink = 0.97;
      const g = mix(glowRgb, coreRgb, p.stage >= 8 ? 0.5 : 0.2);
      tri(glow, at(r0.h, r0.w * shrink, b0), at(r1.h, r1.w * shrink, b0 + 0.05), at(r0.h, r0.w * shrink, b0 + 0.08), g);
    }
  }
  const last = rings[rings.length - 1]!;
  const bottomCenter = at(last.h, 0, 0);
  if (p.cavity === null) {
    // Dno studni: wachlarz; od etapu 7 — rozgrzana, świecąca materia z odłamkami.
    const hot = p.stage >= 7;
    for (let j = 0; j < SIDES; j++) {
      const a = ringPoint(rings.length - 1, j);
      const b = ringPoint(rings.length - 1, j + 1);
      if (hot) tri(glow, a, at(last.h - 0.01, 0, 0), b, mix(glowRgb, coreRgb, 0.3), coreRgb, mix(glowRgb, coreRgb, 0.3));
      else tri(walls, a, bottomCenter, b, wallColor(last.h, rings.length, j), scale(wallColor(last.h, rings.length, j), 0.7));
    }
    if (hot) {
      for (let i = 0; i < 6; i++) {
        const b = hash01(i, seed + 8) * Math.PI * 2;
        const rr = last.w * (0.2 + 0.6 * hash01(i, seed + 9));
        const h = last.h + 0.008 + 0.01 * hash01(i, seed + 10);
        const s = 0.012;
        const rock = scale(layers[3]!, 0.5);
        tri(walls, at(h + s, rr, b), at(h, rr + s, b + 0.4), at(h, rr - s, b - 0.4), rock);
      }
    }
  } else {
    // Etap 8: jaskinia płaszcza (kula od środka) z otworem pod studnią i jądro w głębi.
    const R = p.cavity;
    const open = Math.asin(Math.min(1, (last.w * 1.02) / R));
    const latSteps = 9;
    const lonSteps = 20;
    const cavityPoint = (i: number, j: number): Vec3 => {
      // θ od osi `n` (0 — strona studni) do π; otwór: θ < open.
      const theta = open + ((Math.PI - open) * i) / latSteps;
      const phi = (j / lonSteps) * Math.PI * 2;
      const rr = R * (i === 0 ? 1 : 0.94 + 0.12 * hash01(i * 41 + (j % lonSteps), seed + 11));
      return at(Math.cos(theta) * rr, Math.sin(theta) * rr, phi);
    };
    const cavityColor = (i: number): Rgb => {
      // Bliżej jądra (dalsza strona) — jaśniej od poświaty; płaszcz → strefa gorąca.
      const t = i / latSteps;
      return mix(scale(mix(layers[2]!, layers[3]!, t), 0.8), glowRgb, 0.35 + 0.35 * t);
    };
    // Krótka szyja łącząca dno studni z otworem jaskini.
    const neckH = Math.cos(open) * R;
    for (let j = 0; j < SIDES; j++) {
      const a = ringPoint(rings.length - 1, j);
      const b = ringPoint(rings.length - 1, j + 1);
      const ba = bearingAt(rings.length - 1, j);
      const bb = bearingAt(rings.length - 1, j + 1);
      const c = at(neckH, Math.sin(open) * R, ba);
      const d = at(neckH, Math.sin(open) * R, bb);
      const ca = wallColor(last.h, rings.length, j);
      const cc = mix(ca, glowRgb, 0.5);
      tri(walls, a, c, b, ca, cc, ca);
      tri(walls, b, c, d, ca, cc, cc);
    }
    for (let i = 0; i < latSteps; i++) {
      for (let j = 0; j < lonSteps; j++) {
        const a = cavityPoint(i, j);
        const b = cavityPoint(i, j + 1);
        const c = cavityPoint(i + 1, j);
        const d = cavityPoint(i + 1, j + 1);
        tri(walls, a, c, b, cavityColor(i), cavityColor(i + 1), cavityColor(i));
        tri(walls, b, c, d, cavityColor(i), cavityColor(i + 1), cavityColor(i + 1));
      }
    }
    // Jądro: dwudziestościan podzielony (low-poly), jaśniejszy ku środkowi ścianek.
    const core = p.core ?? CORE_RADIUS;
    const ico = icosphere(1);
    for (let f = 0; f < ico.length; f += 3) {
      const tint = 0.85 + 0.3 * hash01(f, seed + 12);
      const cA = scale(mix(coreRgb, glowRgb, 0.25 * hash01(f, seed + 13)), tint);
      const pts = [ico[f]!, ico[f + 1]!, ico[f + 2]!].map((q) => [q[0] * core, q[1] * core, q[2] * core] as Vec3);
      tri(glow, pts[0]!, pts[1]!, pts[2]!, cA, scale(cA, 1.1), cA);
    }
  }
  return {
    walls: { position: new Float32Array(walls.pos), color: new Float32Array(walls.col) },
    glow: { position: new Float32Array(glow.pos), color: new Float32Array(glow.col) },
  };
}

/** Wierzchołki trójkątów dwudziestościanu podzielonego `detail` razy (na kuli jednostkowej). */
function icosphere(detail: number): Vec3[] {
  const t = (1 + Math.sqrt(5)) / 2;
  const base: Vec3[] = [
    [-1, t, 0], [1, t, 0], [-1, -t, 0], [1, -t, 0], [0, -1, t], [0, 1, t], [0, -1, -t], [0, 1, -t], [t, 0, -1], [t, 0, 1], [-t, 0, -1], [-t, 0, 1],
  ].map((q) => norm(q as Vec3));
  const faces = [
    [0, 11, 5], [0, 5, 1], [0, 1, 7], [0, 7, 10], [0, 10, 11], [1, 5, 9], [5, 11, 4], [11, 10, 2], [10, 7, 6], [7, 1, 8],
    [3, 9, 4], [3, 4, 2], [3, 2, 6], [3, 6, 8], [3, 8, 9], [4, 9, 5], [2, 4, 11], [6, 2, 10], [8, 6, 7], [9, 8, 1],
  ];
  let tris: Vec3[] = faces.flatMap((f) => f.map((i) => base[i]!));
  for (let d = 0; d < detail; d++) {
    const next: Vec3[] = [];
    for (let i = 0; i < tris.length; i += 3) {
      const [a, b, c] = [tris[i]!, tris[i + 1]!, tris[i + 2]!];
      const ab = norm([(a[0] + b[0]) / 2, (a[1] + b[1]) / 2, (a[2] + b[2]) / 2]);
      const bc = norm([(b[0] + c[0]) / 2, (b[1] + c[1]) / 2, (b[2] + c[2]) / 2]);
      const ca = norm([(c[0] + a[0]) / 2, (c[1] + a[1]) / 2, (c[2] + a[2]) / 2]);
      next.push(a, ab, ca, ab, b, bc, ca, bc, c, ab, bc, ca);
    }
    tris = next;
  }
  return tris;
}
