// Krater megakonstruktu kryształów (prototyp wyglądu, decyzje właściciela 2026-11-02): okrągły, tarasowy krater
// poszerza się wokół jednego miejsca z etapem rozbudowy; nad środkiem unosi się wiertnica. Dziura zostaje na zawsze.
// Czysta matematyka (bez three/DOM): ta sama postać co wielka odkrywka (`OpenPit`), więc ląd 3D, wycięcie oceanu
// i gładkie krawędzie tarasów działają bez zmian w rendererze. Liczby robocze.
import type { OpenPitLook } from '../data/openPit.ts';
import { angleBetween, type Vec3 } from './colony.ts';
import { pitRadius, type OpenPit } from './openPit.ts';

/** Wygląd krateru wg etapu (1–4): promień kątowy, liczba tarasów, głębokość (ułamek promienia planety). Robocze. */
export const CRATER_STAGES: Readonly<Record<1 | 2 | 3 | 4, { radius: number; layers: number; depth: number }>> = {
  1: { radius: 0.07, layers: 2, depth: 0.035 },
  2: { radius: 0.12, layers: 3, depth: 0.06 },
  3: { radius: 0.18, layers: 4, depth: 0.09 },
  4: { radius: 0.25, layers: 5, depth: 0.13 },
};

const norm = (v: Vec3): Vec3 => {
  const l = Math.hypot(v[0], v[1], v[2]) || 1;
  return [v[0] / l, v[1] / l, v[2] / l];
};
const dot = (a: Vec3, b: Vec3) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];

/** Kierunek styczny w punkcie `p` od środka `c` (w stronę rosnącej odległości od środka). */
function away(p: Vec3, c: Vec3): Vec3 {
  const k = dot(p, c);
  return norm([p[0] * k - c[0], p[1] * k - c[1], p[2] * k - c[2]]);
}

/** Punkt na okręgu o promieniu `angle` wokół `c` w kierunku punktu `p` (po wielkim kole). */
function onCircle(c: Vec3, p: Vec3, angle: number): Vec3 {
  const k = dot(p, c);
  let d: Vec3 = [p[0] - c[0] * k, p[1] - c[1] * k, p[2] - c[2] * k];
  if (Math.hypot(...d) < 1e-9) d = Math.abs(c[0]) < 0.9 ? [0, -c[2], c[1]] : [-c[2], 0, c[0]];
  d = norm(d);
  return norm([c[0] * Math.cos(angle) + d[0] * Math.sin(angle), c[1] * Math.cos(angle) + d[1] * Math.sin(angle), c[2] * Math.cos(angle) + d[2] * Math.sin(angle)]);
}

/**
 * Okrągły krater o środku `center` i etapie `stage` (1–4). `ground` — promień pierwotnego terenu (poziom krawędzi =
 * średnia terenu na obwodzie). Zwraca obiekt jak wielka odkrywka — renderer liczy z niego teren i krawędzie.
 */
export function buildCrater(center: Vec3, stage: 1 | 2 | 3 | 4, ground: (dir: Vec3) => number): OpenPit {
  const st = CRATER_STAGES[stage];
  const R = st.radius;
  const floorAngle = R * 0.16;
  const look: OpenPitLook = { layers: st.layers, depth: st.depth, shelf: 0.35, floor: 1.9, hang: 0.3, cables: 0, sag: 0, status: 'robocza' };
  const c = norm(center);
  const outline: Vec3[] = Array.from({ length: 129 }, (_, i) => {
    const a = (i / 128) * Math.PI * 2;
    // Dowolny punkt w kierunku a: obrót wokół środka.
    const t0 = norm(Math.abs(c[0]) < 0.9 ? [0, -c[2], c[1]] : [-c[2], 0, c[0]]);
    const t1: Vec3 = [c[1] * t0[2] - c[2] * t0[1], c[2] * t0[0] - c[0] * t0[2], c[0] * t0[1] - c[1] * t0[0]];
    const d: Vec3 = [t0[0] * Math.cos(a) + t1[0] * Math.sin(a), t0[1] * Math.cos(a) + t1[1] * Math.sin(a), t0[2] * Math.cos(a) + t1[2] * Math.sin(a)];
    return norm([c[0] * Math.cos(R) + d[0] * Math.sin(R), c[1] * Math.cos(R) + d[1] * Math.sin(R), c[2] * Math.cos(R) + d[2] * Math.sin(R)]);
  });
  const rim = outline.reduce((sum, p) => sum + ground(p), 0) / outline.length;
  const s = (p: Vec3) => {
    const a = angleBetween(c, p);
    if (a >= R) return 0;
    if (a <= floorAngle) return 1;
    return (R - a) / (R - floorAngle);
  };
  const field = (p: Vec3) => {
    const a = angleBetween(c, p);
    const d = Math.abs(R - a);
    if (a >= R) return { s: 0, d, g: [0, 0, 0] as Vec3 };
    if (a <= floorAngle) return { s: 1, d, g: [0, 0, 0] as Vec3 };
    // `s` maleje na zewnątrz: spadek = −kierunek od środka / szerokość zbocza.
    const t = away(p, c);
    const k = -1 / (R - floorAngle);
    return { s: (R - a) / (R - floorAngle), d, g: [t[0] * k, t[1] * k, t[2] * k] as Vec3 };
  };
  const pit: OpenPit = {
    look,
    center: c,
    centerDistance: R,
    floorAngle,
    reach: R,
    rim,
    floorRadius: 0,
    outline: [outline],
    distance: (p) => Math.abs(R - angleBetween(c, p)),
    nearest: (p) => onCircle(c, p, R),
    inside: (p) => angleBetween(c, p) < R,
    s,
    field,
    sCached: s,
  };
  pit.floorRadius = pitRadius(pit, 1, ground(c));
  return pit;
}
