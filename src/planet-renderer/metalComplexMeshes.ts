// Kompleks kopalni metalu na planecie (etap 2, decyzja właściciela 2026-11-01; `docs/kompleks-kopalni-metalu.md`).
// Czysta matematyka (bez three): z modelu `complexLayout` — kopalnie (3 wielkości wg poziomu 1–3), fabryki (ok. 2× większe),
// plac w środku (zarys fundamentu, miejsce na przyszły megakonstrukt) i drogi kopalnia → fabryka jako odcinki wstęgi
// tuż nad terenem. Rysuje `ColonyMeshes` (instancje, kilka rysowań), wysokość terenu podaje PlanetView.
import { complexLayout, type MetalComplexLayout, type MetalComplexObject, type MetalComplexPhase } from '../core/colony/complexLayout.ts';
import type { FieldGrid } from '../core/colony/fieldGrid.ts';
import { hash01, type Vec3 } from './colony.ts';

/** Wielkość modeli w jednostkach układu (średni promień pola × skala) — robocze, do oceny na zrzutach. */
export const METAL_LOOK = {
  /** Kopalnia poziomu 1, 2, 3 (szyb z wieżą wyciągową i hałdą). */
  mine: [0.5, 0.6, 0.7] as const,
  /** Fabryka (hala z kominem) — ok. 2× kopalnia. */
  factory: 1.35,
  /** Zarys placu (promień ≈ promień placu z modelu). */
  plaza: 1.0,
  /** Dotychczasowy megakompleks metalu, gdy działa — tymczasowo na placu (decyzja przed etapem 3). */
  mega: 1.9,
  /** Szerokość drogi i liczba odcinków na drogę. */
  road: 0.14,
  roadSteps: 6,
  /** Wysokość drogi nad terenem (ułamek promienia planety). */
  roadLift: 0.0015,
} as const;

export type MetalPieceKind = 'mine' | 'factory' | 'plaza' | 'mega';

export interface MetalPiece {
  kind: MetalPieceKind;
  slotId: string;
  dir: Vec3;
  /** Wielkość modelu (rad). */
  size: number;
  spin: number;
  /** Poziom kopalni 1–3 (inne — 1). */
  level: number;
}

export interface RoadSegment {
  from: Vec3;
  to: Vec3;
  width: number;
}

const slotHash = (id: string) => {
  let h = 0;
  for (let i = 0; i < id.length; i++) h = (h * 31 + id.charCodeAt(i)) | 0;
  return Math.abs(h);
};

/** Wielkość obiektu modelu (rad). */
export function metalObjectSize(o: Pick<MetalComplexObject, 'typ' | 'poziom'>, unit: number): number {
  if (o.typ === 'kopalnia') return METAL_LOOK.mine[Math.max(0, Math.min(2, o.poziom - 1))]! * unit;
  if (o.typ === 'fabryka') return METAL_LOOK.factory * unit;
  return METAL_LOOK.mega * unit;
}

/** Obiekty do narysowania: plac (zawsze), kopalnie i fabryki z modelu, megakompleks na placu, gdy działa. */
export function metalPieces(layout: MetalComplexLayout, mega: boolean): MetalPiece[] {
  const out: MetalPiece[] = [{ kind: 'plaza', slotId: 'plac', dir: layout.center, size: METAL_LOOK.plaza * layout.unit, spin: layout.rotation, level: 1 }];
  if (mega) out.push({ kind: 'mega', slotId: 'megakompleks', dir: layout.center, size: METAL_LOOK.mega * layout.unit, spin: layout.rotation, level: 1 });
  for (const o of layout.obiekty) {
    if (o.typ === 'megakonstrukt') continue;
    out.push({
      kind: o.typ === 'kopalnia' ? 'mine' : 'factory',
      slotId: o.slotId,
      dir: o.pozycja,
      size: metalObjectSize(o, layout.unit),
      spin: hash01(slotHash(o.slotId), 7) * Math.PI * 2,
      level: o.poziom,
    });
  }
  return out;
}

const normalize = (v: Vec3): Vec3 => {
  const l = Math.hypot(v[0], v[1], v[2]) || 1;
  return [v[0] / l, v[1] / l, v[2] / l];
};
/** Punkt na łuku wielkiego koła a → b (t 0..1). */
export function slerp(a: Vec3, b: Vec3, t: number): Vec3 {
  return normalize([a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t]);
}

/**
 * Drogi kopalnia → fabryka podzielone na krótkie odcinki po powierzchni kuli (każdy odcinek kładzie się na terenie
 * w swoim środku — droga nie przenika gruntu). Zaczynają się na skraju płyty kopalni, kończą na skraju fabryki.
 */
export function roadSegments(layout: MetalComplexLayout): RoadSegment[] {
  const out: RoadSegment[] = [];
  const size = new Map(layout.obiekty.map((o) => [o.slotId, metalObjectSize(o, layout.unit)]));
  const steps = METAL_LOOK.roadSteps;
  for (const road of layout.drogi) {
    const [a, b] = road.points;
    const length = Math.acos(Math.min(1, Math.max(-1, a[0] * b[0] + a[1] * b[1] + a[2] * b[2])));
    if (length <= 1e-6) continue;
    // Od skraju płyty kopalni (płyta ≈ 0,46 wielkości) do skraju płyty fabryki (≈ 0,5).
    const t0 = Math.min(0.45, ((size.get(road.from) ?? 0) * 0.42) / length);
    const t1 = Math.max(0.55, 1 - ((size.get(road.to) ?? 0) * 0.46) / length);
    for (let k = 0; k < steps; k++) {
      const from = slerp(a, b, t0 + ((t1 - t0) * k) / steps);
      const to = slerp(a, b, t0 + ((t1 - t0) * (k + 1)) / steps);
      out.push({ from, to, width: METAL_LOOK.road * layout.unit });
    }
  }
  return out;
}

/**
 * Następny obiekt kompleksu (poziom +1): nowa kopalnia, rosnąca kopalnia albo fabryka — tam stoi rusztowanie trwającej
 * budowy. Null — komplet osad (poz. 40+).
 */
export function nextMetalObject(grid: FieldGrid, seed: string, center: Vec3, phase: MetalComplexPhase, level: number): MetalComplexObject | null {
  const now = complexLayout(grid, seed, level, phase, { center });
  const next = complexLayout(grid, seed, level + 1, phase, { center });
  const before = new Map(now.obiekty.map((o) => [o.slotId, o.poziom]));
  return next.obiekty.find((o) => before.get(o.slotId) !== o.poziom) ?? null;
}
