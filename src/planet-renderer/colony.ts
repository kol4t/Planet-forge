// Rozmieszczenie budowli kolonii na powierzchni planety. Czysta matematyka (bez three),
// deterministyczna z seeda — ta sama planeta zawsze ma kolonię w tym samym miejscu.
import { createRng, type Rng } from '../core/random/rng.ts';
import type { BuildingId, Planet } from '../core/types.ts';
import type { SurfaceSampler } from './surface.ts';

export type Vec3 = [number, number, number];

/** Maksymalna liczba osobnych budowli jednego typu (wydajność iPada). */
export const MAX_STRUCTURES = 10;

const MIN_SPACING = 0.058; // rad — odstęp między budowlami
const SITE_SPREAD = 0.2; // rad — odległość dzielnic od centrum kolonii

export interface ColonySlot {
  /** Kierunek od środka planety (wektor jednostkowy). */
  dir: Vec3;
  /** Promień powierzchni w tym miejscu (podstawa budowli). */
  surface: number;
  /** Obrót wokół normalnej (rad) — żeby budowle nie stały jak od linijki. */
  spin: number;
  /** Indywidualny mnożnik wielkości 0.85..1.15. */
  size: number;
  onLand: boolean;
}

export interface ColonyLayout {
  center: Vec3;
  slots: Record<BuildingId, ColonySlot[]>;
}

/** Ile budowli danego typu widać na danym poziomie. */
export function visibleStructures(level: number): number {
  return Math.max(0, Math.min(MAX_STRUCTURES, Math.floor(level)));
}

/** Skala budowli: po zapełnieniu dzielnicy kolejne poziomy powiększają zabudowę. */
export function structureScale(level: number): number {
  const extra = Math.max(0, level - MAX_STRUCTURES);
  return 1 + Math.min(0.6, extra * 0.03);
}

const normalize = (v: Vec3): Vec3 => {
  const len = Math.hypot(v[0], v[1], v[2]) || 1;
  return [v[0] / len, v[1] / len, v[2] / len];
};
const cross = (a: Vec3, b: Vec3): Vec3 => [
  a[1] * b[2] - a[2] * b[1],
  a[2] * b[0] - a[0] * b[2],
  a[0] * b[1] - a[1] * b[0],
];
export const angleBetween = (a: Vec3, b: Vec3) =>
  Math.acos(Math.min(1, Math.max(-1, a[0] * b[0] + a[1] * b[1] + a[2] * b[2])));

/** Punkt odsunięty od `center` o kąt `distance` w kierunku `heading` (po powierzchni sfery). */
export function offsetOnSphere(center: Vec3, heading: number, distance: number): Vec3 {
  const helper: Vec3 = Math.abs(center[1]) < 0.9 ? [0, 1, 0] : [1, 0, 0];
  const east = normalize(cross(helper, center));
  const north = cross(center, east);
  const t: Vec3 = [
    east[0] * Math.cos(heading) + north[0] * Math.sin(heading),
    east[1] * Math.cos(heading) + north[1] * Math.sin(heading),
    east[2] * Math.cos(heading) + north[2] * Math.sin(heading),
  ];
  const c = Math.cos(distance);
  const s = Math.sin(distance);
  return normalize([center[0] * c + t[0] * s, center[1] * c + t[1] * s, center[2] * c + t[2] * s]);
}

function randomDir(rng: Rng, maxLatitude: number): Vec3 {
  const y = rng.range(-maxLatitude, maxLatitude);
  const a = rng.range(0, Math.PI * 2);
  const r = Math.sqrt(1 - y * y);
  return [r * Math.cos(a), y, r * Math.sin(a)];
}

/** Ile lądu jest wokół punktu (0..1) — kolonia woli większe wyspy/kontynenty. */
function landScore(sampler: SurfaceSampler, dir: Vec3): number {
  let land = 0;
  const probes = 12;
  for (let i = 0; i < probes; i++) {
    const p = offsetOnSphere(dir, (i / probes) * Math.PI * 2, i % 2 ? 0.09 : 0.17);
    if (sampler.isLand(sampler.height(...p), ...p)) land++;
  }
  const h = sampler.height(...dir);
  return sampler.isLand(h, ...dir) ? land / probes : -1;
}

export function layoutColony(planet: Planet, sampler: SurfaceSampler, ids: readonly BuildingId[]): ColonyLayout {
  const rng = createRng(`${planet.definitionId}|${planet.seed}|colony`);

  // 1. Centrum kolonii: najlepszy z kilkudziesięciu kandydatów (dużo lądu, z dala od biegunów).
  let center: Vec3 = randomDir(rng, 0.6);
  let best = -Infinity;
  for (let i = 0; i < 48; i++) {
    const dir = randomDir(rng, 0.6);
    const score = landScore(sampler, dir);
    if (score > best) {
      best = score;
      center = dir;
    }
  }

  // 2. Dzielnice: każdy typ budynku ma swój skrawek wokół centrum.
  const taken: Vec3[] = [];
  const slots = {} as Record<BuildingId, ColonySlot[]>;
  const baseHeading = rng.range(0, Math.PI * 2);
  ids.forEach((id, index) => {
    // Dzielnica w swoim kierunku od centrum, ale tam, gdzie jest najwięcej lądu.
    const heading = baseHeading + (index / ids.length) * Math.PI * 2;
    let site = offsetOnSphere(center, heading, SITE_SPREAD);
    let siteScore = landScore(sampler, site);
    for (const distance of [0.6, 0.35, 1.4]) {
      for (const turn of [0, -0.6, 0.6]) {
        const candidate = offsetOnSphere(center, heading + turn, SITE_SPREAD * distance);
        const score = landScore(sampler, candidate);
        if (score > siteScore + 0.05 && !taken.some((t) => angleBetween(t, candidate) < MIN_SPACING)) {
          site = candidate;
          siteScore = score;
        }
      }
    }
    const list: ColonySlot[] = [];
    for (let attempt = 0; attempt < 600 && list.length < MAX_STRUCTURES; attempt++) {
      // Po 300 nieudanych próbach krąg poszukiwań się poszerza (dzielnica otoczona wodą albo sąsiadami).
      const ring = 0.02 + 0.05 * list.length ** 0.6 + rng.range(0, 0.05) + Math.max(0, attempt - 300) * 0.001;
      const dir = list.length === 0 && attempt === 0 ? site : offsetOnSphere(site, rng.range(0, Math.PI * 2), ring);
      const h = sampler.height(...dir);
      const onLand = sampler.isLand(h, ...dir);
      // Po wielu próbach dopuszczamy platformy na wodzie (planety oceaniczne).
      if (!onLand && attempt < 300) continue;
      if (taken.some((other) => angleBetween(other, dir) < MIN_SPACING)) continue;
      taken.push(dir);
      list.push({
        dir,
        // Platforma: na morzu tuż nad wodą, na jeziorze — na jego lustrze (rzeka, lawa: na gruncie).
        surface: onLand ? sampler.radius(h) : sampler.isLand(h) ? sampler.radius(Math.max(h, sampler.lakeLevel(...dir))) : 1.001,
        spin: rng.range(0, Math.PI * 2),
        size: rng.range(0.85, 1.15),
        onLand,
      });
    }
    slots[id] = list;
  });

  return { center, slots };
}
