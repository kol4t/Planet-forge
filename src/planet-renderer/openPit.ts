// Wielka odkrywka ekstraktora kryształów (etapy „Odkrywka” i „Megaodkrywka”): czysta matematyka (bez three/DOM),
// wspólna dla 3D (wysokość i kolor ścianek lądu, liny-rury) i 2D (koncentryczny rysunek w tarczy).
// Cały obszar zajętych pól to jedna dziura. Głębokość w punkcie zależy od `s` 0..1: 0 na obrysie pól (krawędź
// leży dokładnie na turkusowej linii granicy), 1 na dnie wokół szybu odwiertu. `s = d / (d + a)`, gdzie d — odległość
// od obrysu, a — odległość od dna: płytkie warstwy biegną wzdłuż obrysu, głębsze coraz bardziej okrągłe wokół środka.
// Warstwy: wąska płaska półka + pochyłe zbocze do następnej. Wszystko deterministyczne z układu pól.
import type { FieldGrid } from '../core/colony/fieldGrid.ts';
import { openPitLook, type OpenPitLook } from '../data/openPit.ts';
import { angleBetween, cellLookup, offsetOnSphere, type ColonyComplex, type ColonyLayout, type Vec3 } from './colony.ts';
import { axisFrame, drillParams, drillStage } from './drill.ts';
import { outlineBorders } from './fieldOverlay.ts';

/** Odstęp punktów obrysu po uproszczeniu (rad) — dokładność krawędzi z zapasem względem ścianek lądu (~0,027 rad). */
const OUTLINE_STEP = 0.01;
/** Odcinki obrysu w grupach (szybkie odrzucanie dalekich). */
const CHUNK = 16;
/** Rozdzielczość mapy jeziorek (jak mapa „punkt → pole”). */
const LAKE_RES = 96;
/** Rozdzielczość mapy `s` dla tarczy 2D (komórek na bok ściany sześcianu, ~0,01 rad). */
const TEXEL_RES = 160;

export interface OpenPit {
  look: OpenPitLook;
  /** Środek dziury (szyb, ekstraktor): punkt obszaru najdalej od obrysu. */
  center: Vec3;
  /** Odległość środka od obrysu (rad). */
  centerDistance: number;
  /** Promień kątowy płaskiego dna wokół szybu (rad). */
  floorAngle: number;
  /** Najdalszy punkt obrysu od środka (rad) — poza tym zasięgiem nic nie jest dziurą. */
  reach: number;
  /** Poziom krawędzi (średni promień terenu na obrysie) i dna (promień od środka planety). */
  rim: number;
  floorRadius: number;
  /** Obrys (bez jeziorek w środku obszaru) — uproszczone łamane po sferze. */
  outline: Vec3[][];
  /** Odległość kątowa od obrysu (rad). */
  distance(p: Vec3): number;
  /** Najbliższy punkt obrysu. */
  nearest(p: Vec3): Vec3;
  /** Czy punkt należy do dziury (pole obszaru albo jeziorko w środku obszaru). */
  inside(p: Vec3): boolean;
  /** 0 poza dziurą i na krawędzi … 1 na dnie. */
  s(p: Vec3): number;
  /** `s`, odległość od obrysu (rad) i spadek `s` wzdłuż powierzchni (wektor styczny) — do wygładzania krawędzi. */
  field(p: Vec3): { s: number; d: number; g: Vec3 };
  /** To samo z mapy (2D, szybko; wartość ze środka komórki mapy). */
  sCached(p: Vec3): number;
}

const smooth = (t: number) => {
  const x = Math.max(0, Math.min(1, t));
  return x * x * (3 - 2 * x);
};
const norm = (v: Vec3): Vec3 => {
  const l = Math.hypot(v[0], v[1], v[2]) || 1;
  return [v[0] / l, v[1] / l, v[2] / l];
};
const dot = (a: Vec3, b: Vec3) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];

/** Głębokość pod krawędzią (ułamek promienia) dla `s`: warstwa = pochyłe zbocze, potem płaska półka. Niemalejąca. */
export function pitDepthAt(look: OpenPitLook, s: number): number {
  if (s <= 0) return 0;
  const L = look.layers;
  const x = Math.min(1, s) * L;
  const k = Math.min(L - 1, Math.floor(x));
  return (look.depth / L) * (k + smooth((x - k) / (1 - look.shelf)));
}

/** Warstwa (0 — najwyższa) i czy punkt leży na płaskiej półce (nie na zboczu) — do kolorów. */
export function pitBand(look: OpenPitLook, s: number): { layer: number; shelf: boolean } {
  const L = look.layers;
  const x = Math.max(0, Math.min(1, s)) * L;
  const k = Math.min(L - 1, Math.floor(x));
  return { layer: k, shelf: x - k >= 1 - look.shelf || s >= 1 };
}

/**
 * Promień terenu w dziurze (od środka planety): pierwsze zbocze schodzi od terenu na obrysie do poziomu krawędzi `rim`,
 * dalej warstwy pod nim. Nigdy wyżej niż pierwotny teren `ground`.
 */
export function pitRadius(pit: Pick<OpenPit, 'look' | 'rim'>, s: number, ground: number): number {
  if (s <= 0) return ground;
  const w = smooth((s * pit.look.layers) / (1 - pit.look.shelf));
  const top = ground + (pit.rim - ground) * w;
  return Math.min(ground, top - pitDepthAt(pit.look, s));
}

/**
 * Odkrywka dla kompleksu ekstraktora (null — etap bez wielkiej odkrywki). `ground` — promień pierwotnego terenu
 * w punkcie (do poziomu krawędzi). Liczone raz przy zmianie obszaru / etapu.
 */
export function buildOpenPit(grid: FieldGrid, layout: ColonyLayout, c: ColonyComplex, ground: (dir: Vec3) => number): OpenPit | null {
  const look = c.building === 'crystalMine' ? openPitLook(c.stage) : null;
  if (!look) return null;
  const index = layout.complexes.indexOf(c);
  const lookup = cellLookup(grid);
  const lakeInside = enclosedWater(lookup, layout.owner, index, c.core, c.radius + 0.06);
  const inLake = (p: Vec3) => lakeInside[cubeTexel(p, LAKE_RES)] === 1;

  // Obrys w pętle (łączenie odcinków po wspólnych końcach).
  const borders = outlineBorders(grid, c.cells).map((i) => grid.borders[i]!);
  const key = (p: readonly number[]) => `${p[0]!.toFixed(6)},${p[1]!.toFixed(6)},${p[2]!.toFixed(6)}`;
  const ends = new Map<string, number[]>();
  borders.forEach((b, i) => {
    for (const p of [b.from, b.to]) {
      const k = key(p);
      const list = ends.get(k);
      if (list) list.push(i);
      else ends.set(k, [i]);
    }
  });
  const used = new Uint8Array(borders.length);
  const loops: { points: Vec3[]; water: boolean }[] = [];
  for (let start = 0; start < borders.length; start++) {
    if (used[start]) continue;
    used[start] = 1;
    const first = borders[start]!;
    const points: Vec3[] = [[...first.from] as Vec3, [...first.to] as Vec3];
    let water = first.b < 0;
    // W obie strony od pierwszego odcinka (łańcuch może zaczynać się w środku).
    for (const forward of [true, false]) {
      for (;;) {
        const at = forward ? points[points.length - 1]! : points[0]!;
        const next = (ends.get(key(at)) ?? []).find((i) => !used[i]);
        if (next === undefined) break;
        used[next] = 1;
        const b = borders[next]!;
        water &&= b.b < 0;
        const to = [...(key(b.from) === key(at) ? b.to : b.from)] as Vec3;
        if (forward) points.push(to);
        else points.unshift(to);
      }
    }
    loops.push({ points, water });
  }
  // Brzegi jeziorek w środku obszaru (woda otoczona polami ekstraktora) — część dziury, bez krawędzi wokół nich.
  const lakeShore = (points: Vec3[]) => {
    const mid = points[Math.floor(points.length / 2)]!;
    return [0, 1, 2, 3, 4, 5].some((k) => inLake(offsetOnSphere(mid, (k * Math.PI) / 3, 0.015)));
  };
  const outline: Vec3[][] = [];
  for (const loop of loops) {
    if (loop.water && lakeShore(loop.points)) continue;
    // Uproszczenie: punkty co ~OUTLINE_STEP (końce zostają).
    const kept: Vec3[] = [loop.points[0]!];
    let acc = 0;
    for (let i = 1; i < loop.points.length; i++) {
      acc += angleBetween(loop.points[i - 1]!, loop.points[i]!);
      if (acc >= OUTLINE_STEP || i === loop.points.length - 1) {
        kept.push(loop.points[i]!);
        acc = 0;
      }
    }
    outline.push(kept);
  }

  // Odcinki obrysu: końce, środek i połowa długości cięciwy (szybkie odrzucanie dalekich odcinków).
  const segs: number[] = [];
  for (const line of outline) {
    for (let i = 1; i < line.length; i++) {
      const a = line[i - 1]!;
      const b = line[i]!;
      const half = Math.hypot(b[0] - a[0], b[1] - a[1], b[2] - a[2]) / 2;
      segs.push(a[0], a[1], a[2], b[0], b[1], b[2], (a[0] + b[0]) / 2, (a[1] + b[1]) / 2, (a[2] + b[2]) / 2, half);
    }
  }
  const S = Float64Array.from(segs);
  const count = S.length / 10;
  // Grupy po CHUNK kolejnych odcinków (sąsiednich na obrysie) z kulą otaczającą — dalekie grupy pomijane w całości.
  const chunks: number[] = [];
  for (let first = 0; first < count; first += CHUNK) {
    const end = Math.min(count, first + CHUNK);
    let cx = 0, cy = 0, cz = 0;
    for (let i = first; i < end; i++) {
      cx += S[i * 10 + 6]!;
      cy += S[i * 10 + 7]!;
      cz += S[i * 10 + 8]!;
    }
    const n = end - first;
    cx /= n;
    cy /= n;
    cz /= n;
    let r = 0;
    for (let i = first; i < end; i++) {
      const o = i * 10;
      r = Math.max(r, Math.hypot(S[o + 6]! - cx, S[o + 7]! - cy, S[o + 8]! - cz) + S[o + 9]!);
    }
    chunks.push(cx, cy, cz, r, first, end);
  }
  let last = 0;
  // Najbliższy punkt obrysu (cięciwy ≈ łuki dla krótkich odcinków); zaczyna od ostatnio najbliższego odcinka.
  const closest = (p: Vec3): { d2: number; q: Vec3 } => {
    const [px, py, pz] = p;
    let best2 = Infinity;
    let best = -1;
    let bestT = 0;
    let bestD = Infinity;
    const test = (i: number) => {
      const o = i * 10;
      const ax = S[o]!, ay = S[o + 1]!, az = S[o + 2]!;
      const ex = S[o + 3]! - ax, ey = S[o + 4]! - ay, ez = S[o + 5]! - az;
      const l2 = ex * ex + ey * ey + ez * ez;
      const t = l2 > 0 ? Math.max(0, Math.min(1, ((px - ax) * ex + (py - ay) * ey + (pz - az) * ez) / l2)) : 0;
      const dx = px - ax - ex * t, dy = py - ay - ey * t, dz = pz - az - ez * t;
      const d2 = dx * dx + dy * dy + dz * dz;
      if (d2 < best2) {
        best2 = d2;
        best = i;
        bestT = t;
        bestD = Math.sqrt(d2);
      }
    };
    if (count > 0) test(Math.min(last, count - 1));
    for (let c = 0; c < chunks.length; c += 6) {
      const lim = chunks[c + 3]! + bestD;
      const cx = px - chunks[c]!, cy = py - chunks[c + 1]!, cz = pz - chunks[c + 2]!;
      if (cx * cx + cy * cy + cz * cz > lim * lim) continue;
      for (let i = chunks[c + 4]!, end = chunks[c + 5]!; i < end; i++) {
        const o = i * 10;
        const dx = px - S[o + 6]!, dy = py - S[o + 7]!, dz = pz - S[o + 8]!;
        const l = S[o + 9]! + bestD;
        if (dx * dx + dy * dy + dz * dz <= l * l) test(i);
      }
    }
    if (best < 0) return { d2: Infinity, q: p };
    last = best;
    const o = best * 10;
    const q: Vec3 = [S[o]! + (S[o + 3]! - S[o]!) * bestT, S[o + 1]! + (S[o + 4]! - S[o + 1]!) * bestT, S[o + 2]! + (S[o + 5]! - S[o + 2]!) * bestT];
    return { d2: best2, q };
  };
  const distance = (p: Vec3) => {
    const { d2 } = closest(p);
    return d2 === Infinity ? 0 : 2 * Math.asin(Math.min(1, Math.sqrt(d2) / 2));
  };
  const inside = (p: Vec3) => {
    const cell = lookup(p[0], p[1], p[2]);
    return cell >= 0 ? layout.owner[cell] === index : inLake(p);
  };

  // Środek: z punktów pól ten najdalej od obrysu, potem dociągnięty krokami w ośmiu kierunkach.
  let center = c.core;
  let centerDistance = -1;
  for (const p of [...c.spots.map((s) => s.dir), ...c.cells.map((i) => grid.cells[i]!.center)]) {
    if (!inside(p)) continue;
    const d = distance(p);
    if (d > centerDistance) {
      centerDistance = d;
      center = p;
    }
  }
  if (centerDistance < 0) centerDistance = distance(center);
  for (const step of [0.04, 0.02, 0.01, 0.005]) {
    for (let moved = true, guard = 0; moved && guard < 20; guard++) {
      moved = false;
      for (let k = 0; k < 8; k++) {
        const p = offsetOnSphere(center, (k * Math.PI) / 4, step);
        if (!inside(p)) continue;
        const d = distance(p);
        if (d > centerDistance + 1e-9) {
          centerDistance = d;
          center = p;
          moved = true;
        }
      }
    }
  }

  const shaft = drillParams(drillStage(c.level), Math.PI, 1)?.rimAngle ?? 0;
  const floorAngle = Math.min(shaft > 0 ? shaft * look.floor : centerDistance * 0.3, centerDistance * 0.45);
  let reach = 0;
  let rimSum = 0;
  let rimCount = 0;
  for (const line of outline) {
    for (const p of line) {
      reach = Math.max(reach, angleBetween(center, p));
      rimSum += ground(p);
      rimCount++;
    }
  }
  const rim = rimCount > 0 ? rimSum / rimCount : ground(center);

  const s = (p: Vec3) => {
    const a = angleBetween(center, p);
    if (a > reach + 0.01 || !inside(p)) return 0;
    const over = a - floorAngle;
    if (over <= 0) return 1;
    const d = distance(p);
    return d / (d + over);
  };
  // Spadek s = d / (d + o): ∂s/∂d = o / (d + o)², ∂s/∂o = −d / (d + o)²; d rośnie od najbliższego punktu obrysu,
  // o (odległość od dna) — od środka.
  const away = (p: Vec3, from: Vec3): Vec3 => {
    const w: Vec3 = [p[0] - from[0], p[1] - from[1], p[2] - from[2]];
    const k = dot(w, p);
    return norm([w[0] - k * p[0], w[1] - k * p[1], w[2] - k * p[2]]);
  };
  const field = (p: Vec3) => {
    const { d2, q } = closest(p);
    const d = d2 === Infinity ? 0 : 2 * Math.asin(Math.min(1, Math.sqrt(d2) / 2));
    const zero: Vec3 = [0, 0, 0];
    const a = angleBetween(center, p);
    if (a > reach + 0.01 || !inside(p)) return { s: 0, d, g: zero };
    const over = a - floorAngle;
    if (over <= 0) return { s: 1, d, g: zero };
    const td = away(p, q);
    const ta = away(p, center);
    const k = 1 / ((d + over) * (d + over));
    return { s: d / (d + over), d, g: [(over * td[0] - d * ta[0]) * k, (over * td[1] - d * ta[1]) * k, (over * td[2] - d * ta[2]) * k] as Vec3 };
  };
  const cache = new Float32Array(6 * TEXEL_RES * TEXEL_RES).fill(NaN);
  const sCached = (p: Vec3) => {
    const t = cubeTexel(p, TEXEL_RES);
    let v = cache[t]!;
    if (Number.isNaN(v)) {
      v = s(texelCenter(t, TEXEL_RES));
      cache[t] = v;
    }
    return v;
  };
  const pit = { look, center, centerDistance, floorAngle, reach, rim, floorRadius: 0, outline, distance, nearest: (p: Vec3) => norm(closest(p).q), inside, s, field, sCached };
  pit.floorRadius = pitRadius(pit, 1, ground(center));
  return pit;
}

/**
 * Kotwa liny na krawędzi w kierunku `bearing` od środka: pierwsze wyjście z obszaru na promieniu (od środka na zewnątrz),
 * dosunięte do najbliższego punktu obrysu — leży na turkusowej linii granicy.
 */
export function rimAnchor(pit: OpenPit, bearing: number): Vec3 {
  let lo = pit.floorAngle;
  let hi = lo;
  for (const step = 0.01; hi < Math.PI; hi += step) {
    if (!pit.inside(offsetOnSphere(pit.center, bearing, hi + step))) {
      lo = hi;
      hi += step;
      break;
    }
  }
  for (let i = 0; i < 12; i++) {
    const mid = (lo + hi) / 2;
    if (pit.inside(offsetOnSphere(pit.center, bearing, mid))) lo = mid;
    else hi = mid;
  }
  return pit.nearest(offsetOnSphere(pit.center, bearing, lo));
}

/**
 * Lina-rura od `start` do `end` (punkty w układzie planety): po łuku sfery, wysokość liniowo między końcami, lekki zwis
 * (`sag` w połowie), zawsze co najmniej `clearance` nad terenem (`groundAt` — promień terenu pod punktem).
 */
export function cablePath(start: Vec3, end: Vec3, sag: number, segments: number, groundAt: (dir: Vec3) => number, clearance: number): Vec3[] {
  const rs = Math.hypot(...start);
  const re = Math.hypot(...end);
  const a = norm(start);
  const b = norm(end);
  const omega = angleBetween(a, b);
  const out: Vec3[] = [];
  for (let i = 0; i <= segments; i++) {
    const t = i / segments;
    let dir: Vec3;
    if (omega < 1e-6) dir = a;
    else {
      const ka = Math.sin((1 - t) * omega) / Math.sin(omega);
      const kb = Math.sin(t * omega) / Math.sin(omega);
      dir = norm([a[0] * ka + b[0] * kb, a[1] * ka + b[1] * kb, a[2] * ka + b[2] * kb]);
    }
    const r = Math.max(rs + (re - rs) * t - sag * Math.sin(Math.PI * t), groundAt(dir) + clearance);
    out.push([dir[0] * r, dir[1] * r, dir[2] * r]);
  }
  return out;
}

function cubeTexel(p: Vec3, res: number): number {
  const [x, y, z] = p;
  const ax = Math.abs(x);
  const ay = Math.abs(y);
  const az = Math.abs(z);
  let face: number;
  let u: number;
  let v: number;
  if (ax >= ay && ax >= az) {
    face = x > 0 ? 0 : 1;
    u = z / ax;
    v = y / ax;
  } else if (ay >= az) {
    face = y > 0 ? 2 : 3;
    u = x / ay;
    v = z / ay;
  } else {
    face = z > 0 ? 4 : 5;
    u = x / az;
    v = y / az;
  }
  const iu = Math.min(res - 1, Math.max(0, Math.floor(((u + 1) / 2) * res)));
  const iv = Math.min(res - 1, Math.max(0, Math.floor(((v + 1) / 2) * res)));
  return face * res * res + iv * res + iu;
}

function texelCenter(t: number, res: number): Vec3 {
  const face = Math.floor(t / (res * res));
  const iv = Math.floor((t % (res * res)) / res);
  const iu = t % res;
  const u = ((iu + 0.5) / res) * 2 - 1;
  const v = ((iv + 0.5) / res) * 2 - 1;
  const sign = face % 2 === 0 ? 1 : -1;
  if (face < 2) return norm([sign, v, u]);
  if (face < 4) return norm([u, sign, v]);
  return norm([u, v, sign]);
}

/**
 * Wycięcie tafli oceanu nad dziurą: odległość od obrysu ze znakiem (+ w dziurze, − poza nią), wpisywana do wierzchołków
 * tafli. Interpolowana między wierzchołkami zmienia znak na obrysie, więc brzeg wycięcia biegnie wzdłuż krawędzi dziury.
 */
export function oceanCutValue(pit: OpenPit, dir: Vec3): number {
  if (angleBetween(pit.center, dir) > pit.reach + 0.12) return -1;
  const d = Math.min(0.2, pit.distance(dir));
  return pit.inside(dir) ? d : -d;
}

/** Ścianki lądu 3D mają ok. 0,027 rad — punkt bliżej linii niż tyle (rad) jest na nią dosuwany. */
export const SNAP_REACH = 0.012;

/**
 * Wygładzenie krawędzi: punkt siatki lądu leżący blisko obrysu albo linii warstwy (początek zbocza, początek półki)
 * dosunięty dokładnie na tę linię (wzdłuż powierzchni). Ścianki nie przecinają wtedy krawędzi półek w przypadkowych
 * miejscach — krawędzie są gładkie, bez ząbków. Decyzja tylko z położenia punktu (wspólne wierzchołki — bez szczelin).
 */
export function snapToContours(pit: OpenPit, dir: Vec3): Vec3 {
  if (angleBetween(pit.center, dir) > pit.reach + SNAP_REACH * 2) return dir;
  const { s, d, g } = pit.field(dir);
  // Krawędź dziury: na najbliższy punkt obrysu (z obu stron).
  if (d < SNAP_REACH) return pit.nearest(dir);
  if (s <= 0 || s >= 1) return dir;
  const L = pit.look.layers;
  const slope = 1 - pit.look.shelf;
  const k = Math.floor(s * L);
  const lines = [k / L, (k + slope) / L, (k + 1) / L].filter((b) => b > 0 && b < 1);
  let target = lines[0] ?? s;
  for (const b of lines) if (Math.abs(b - s) < Math.abs(target - s)) target = b;
  const g2 = dot(g, g);
  if (Math.abs(target - s) < 1e-6 || g2 < 1e-9) return dir;
  // Przesunięcie wzdłuż spadku `s` do linii (w przybliżeniu liniowym).
  const m = (target - s) / g2;
  if (Math.sqrt(g2) * Math.abs(m) > SNAP_REACH) return dir;
  return norm([dir[0] + g[0] * m, dir[1] + g[1] * m, dir[2] + g[2] * m]);
}

/**
 * Jeziorka w środku obszaru: spójne kawałki wody (pole −1) w zasięgu `reach` od `core`, które stykają się wyłącznie
 * z polami kompleksu `index` (nie z morzem za zasięgiem ani z innymi polami). 1 — woda należy do dziury.
 */
function enclosedWater(lookup: (x: number, y: number, z: number) => number, owner: Int32Array, index: number, core: Vec3, reach: number): Uint8Array {
  const res = LAKE_RES;
  const total = 6 * res * res;
  const out = new Uint8Array(total);
  const seen = new Uint8Array(total);
  const cosReach = Math.cos(reach);
  const step = 1.2 / res;
  const neighbors = (t: number): number[] => {
    const p = texelCenter(t, res);
    const [u, v] = axisFrame(p);
    return [u, v, [-u[0], -u[1], -u[2]] as Vec3, [-v[0], -v[1], -v[2]] as Vec3].map((d) => cubeTexel(norm([p[0] + d[0] * step, p[1] + d[1] * step, p[2] + d[2] * step]), res));
  };
  const isWater = (t: number) => {
    const p = texelCenter(t, res);
    return lookup(p[0], p[1], p[2]) < 0;
  };
  for (let t = 0; t < total; t++) {
    if (seen[t]) continue;
    const p = texelCenter(t, res);
    if (dot(p, core) < cosReach || !isWater(t)) continue;
    // Wypełnienie kawałka wody; zamknięty, gdy nigdzie nie wychodzi poza zasięg ani na obce pole.
    const queue = [t];
    seen[t] = 1;
    let enclosed = true;
    for (let i = 0; i < queue.length; i++) {
      for (const n of neighbors(queue[i]!)) {
        if (n === queue[i] || seen[n]) continue;
        const q = texelCenter(n, res);
        if (dot(q, core) < cosReach) {
          enclosed = false;
          continue;
        }
        const cell = lookup(q[0], q[1], q[2]);
        if (cell < 0) {
          seen[n] = 1;
          queue.push(n);
        } else if (owner[cell] !== index) enclosed = false;
      }
    }
    if (enclosed) for (const k of queue) out[k] = 1;
  }
  return out;
}
