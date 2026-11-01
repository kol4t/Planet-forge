// Kompleks kopalni metalu na planecie (etap 2, decyzja właściciela 2026-11-01; `docs/kompleks-kopalni-metalu.md`).
// Czysta matematyka (bez three): z modelu `complexLayout` — kopalnie (3 wielkości wg poziomu 1–3), fabryki (ok. 2× większe),
// plac w środku (zarys fundamentu, miejsce na przyszły megakonstrukt) i drogi kopalnia → fabryka jako odcinki wstęgi
// tuż nad terenem. Rysuje `ColonyMeshes` (instancje, kilka rysowań), wysokość terenu podaje PlanetView.
import { complexLayout, type MetalComplexLayout, type MetalComplexObject, type MetalComplexPhase } from '../core/colony/complexLayout.ts';
import type { FieldGrid } from '../core/colony/fieldGrid.ts';
import { hash01, type Vec3 } from './colony.ts';
import type { PickTarget } from './pick.ts';

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
  /** Najmniejszy odstęp między płytami obiektów (w jednostkach układu). */
  gap: 0.05,
  /** Przybliżenie, od którego kopalnie zaczynają się pojawiać i przy którym są już całe (LOD — z daleka fabryki, plac i drogi). */
  mineZoom: [1.35, 1.8] as const,
} as const;

/** Widoczność kopalń 0..1 przy danym przybliżeniu (płynnie, bez skoku). */
export function mineDetail(zoom: number): number {
  const [from, to] = METAL_LOOK.mineZoom;
  const t = Math.min(1, Math.max(0, (zoom - from) / (to - from)));
  return t * t * (3 - 2 * t);
}

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
  // Bez nachodzenia: gdy układ był zwężony, a miejsce dosunięte do lądu, dwa obiekty potrafią stanąć za blisko —
  // mniejszy (kopalnia) maleje tak, żeby płyty się nie stykały (najwyżej do połowy; plac i megakompleks bez zmian).
  for (const a of out) {
    if (a.kind !== 'mine' && a.kind !== 'factory') continue;
    for (const b of out) {
      if (b === a || b.kind === 'plaza' || b.kind === 'mega') continue;
      if (a.kind === 'factory' && b.kind === 'mine') continue;
      const d = angle(a.dir, b.dir);
      const gap = d - PLATE[b.kind] * b.size - METAL_LOOK.gap * layout.unit;
      const room = gap / PLATE[a.kind];
      if (room >= a.size) continue;
      if (room >= a.size * 0.5) {
        a.size = room;
        continue;
      }
      // Za blisko nawet dla połowy wielkości — odsunięcie od sąsiada (wzdłuż łuku od niego) na styk płyt.
      a.size *= 0.7;
      const want = PLATE[b.kind] * b.size + METAL_LOOK.gap * layout.unit + PLATE[a.kind] * a.size;
      const k = d > 1e-6 ? want / d : 1;
      a.dir = normalize([b.dir[0] + (a.dir[0] - b.dir[0]) * k, b.dir[1] + (a.dir[1] - b.dir[1]) * k, b.dir[2] + (a.dir[2] - b.dir[2]) * k]);
    }
  }
  return out;
}

/** Promień płyty modelu względem wielkości (kopalnia ≈ 0,46, fabryka ≈ 0,5). */
const PLATE: Record<MetalPieceKind, number> = { mine: 0.46, factory: 0.5, plaza: 1, mega: 0.56 };
const angle = (a: Vec3, b: Vec3) => Math.acos(Math.min(1, Math.max(-1, a[0] * b[0] + a[1] * b[1] + a[2] * b[2])));

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
export function roadSegments(layout: MetalComplexLayout, pieces: readonly MetalPiece[] = metalPieces(layout, false)): RoadSegment[] {
  const out: RoadSegment[] = [];
  // Końce dróg z obiektów do narysowania (po ewentualnym odsunięciu i zmniejszeniu — `metalPieces`).
  const byId = new Map(pieces.map((p) => [p.slotId, p]));
  const size = new Map(pieces.map((p) => [p.slotId, p.size]));
  const steps = METAL_LOOK.roadSteps;
  for (const road of layout.drogi) {
    const a = byId.get(road.from)?.dir ?? road.points[0];
    const b = byId.get(road.to)?.dir ?? road.points[1];
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

/**
 * Cele dotyku kompleksu (etap 2): każdy obiekt (kopalnia, fabryka, plac, megakompleks) i środek każdego odcinka drogi
 * otwiera panel kopalni metalu. Zasięg = promień płyty obiektu (na ekranie co najmniej 44 pt — `pickComplex`).
 */
export function metalPickTargets(layout: MetalComplexLayout, mega: boolean, ground: (dir: Vec3) => number = () => 1): PickTarget[] {
  const pieces = metalPieces(layout, mega);
  const out: PickTarget[] = pieces.map((p) => ({ id: 'metalMine', dir: p.dir, surface: ground(p.dir), reach: PLATE[p.kind] * p.size }));
  for (const seg of roadSegments(layout, pieces)) {
    const mid = slerp(seg.from, seg.to, 0.5);
    out.push({ id: 'metalMine', dir: mid, surface: ground(mid), reach: angle(seg.from, seg.to) / 2 });
  }
  return out;
}
