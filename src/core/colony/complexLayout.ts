// Kompleks kopalni metalu — model układu (etap 1, decyzja właściciela 2026-11-01; `docs/kompleks-kopalni-metalu.md`).
// Czysta funkcja: (siatka pól planety, seed, poziom kopalni metalu, faza) → obiekty kompleksu z miejscem na kuli,
// drogi (kopalnia → fabryka) i pasy produkcyjne (fabryka → megakonstrukt). Na razie NIE wpływa na wygląd ani ekonomię —
// rysowanie i budowa megakonstruktu przyjdą w kolejnych etapach. Nazwy „Fabryka” i „Megakonstrukt” są robocze.
//
// Zasady:
// - stałe `slotId` — miejsce slotu zależy tylko od środka dzielnicy, seeda, siatki i fazy, nie od poziomu,
//   więc kolejne poziomy dokładają obiekty, a stare zostają na swoich miejscach;
// - tylko ląd (punkty mapy powierzchni rodzaju „land”); gdy szablon się nie mieści — obrót, potem zwężenie;
// - deterministycznie: strumień `visual` seeda planety (`rng.fork`), bez Math.random.
import { BALANCE } from '../../data/balance.ts';
import { createRng } from '../random/rng.ts';
import type { FieldGrid, Vec3 } from './fieldGrid.ts';

export type MetalComplexPhase = 'osady' | 'konstrukt';
export type MetalObjectType = 'kopalnia' | 'fabryka' | 'megakonstrukt';
export type MetalObjectState = 'aktywny' | 'zniszczony' | 'w_odbudowie';

export interface MetalComplexObject {
  /** Stały identyfikator miejsca, np. „osada2.kopalnia3”, „osada1.fabryka”, „konstrukt”. */
  slotId: string;
  typ: MetalObjectType;
  /** Kopalnia 1–3, fabryka i megakonstrukt — 1. */
  poziom: number;
  stan: MetalObjectState;
  /** Bieżąca wytrzymałość (bez ataków = pełna z `BALANCE.metalComplex.durability`). */
  wytrzymalosc: number;
  /** Punkt na sferze jednostkowej (zawsze na lądzie). */
  pozycja: Vec3;
}

/** Droga: ruda z kopalni do fabryki osady (od zbudowania fabryki). */
export interface MetalComplexRoad {
  from: string;
  to: string;
  points: [Vec3, Vec3];
}

/** Pas produkcyjny: jeden z `beltsPerFactory` równoległych pasów fabryka → megakonstrukt (tylko faza „konstrukt”). */
export interface MetalComplexBelt {
  factory: string;
  /** Numer pasa 0..beltsPerFactory−1 (od lewej). */
  index: number;
  points: [Vec3, Vec3];
}

export interface MetalComplexLayout {
  phase: MetalComplexPhase;
  /** Środek dzielnicy (pusty plac w fazie „osady”, megakonstrukt w fazie „konstrukt”). */
  center: Vec3;
  /** Obrót (rad) i skala układu wybrane przy dopasowaniu do lądu. */
  rotation: number;
  scale: number;
  obiekty: MetalComplexObject[];
  drogi: MetalComplexRoad[];
  pasy: MetalComplexBelt[];
}

/** Zapisany stan obiektu (tylko odstępstwa od „aktywny, pełna wytrzymałość” — na razie zawsze pusto). */
export interface MetalObjectSave {
  stan: MetalObjectState;
  wytrzymalosc: number;
}

/** Stan kompleksu w zapisie planety (`SlotSave.metalComplex`). */
export interface MetalComplexSave {
  /** Środek dzielnicy (sfera jednostkowa) — wybrany raz i nie przestawiany. */
  center: Vec3;
  phase: MetalComplexPhase;
  /** Stany obiektów wg `slotId` (brak = aktywny, pełna wytrzymałość). */
  states?: Record<string, MetalObjectSave>;
}

export const MOBJECT_STATES: readonly MetalObjectState[] = ['aktywny', 'zniszczony', 'w_odbudowie'];
export const METAL_PHASES: readonly MetalComplexPhase[] = ['osady', 'konstrukt'];

const CFG = BALANCE.metalComplex;

/** Ile poziomów budynku przypada na jedną osadę (kopalnie po kolei do maksimum + fabryka). */
export const levelsPerSettlement = () => CFG.minesPerSettlement * CFG.mineMaxLevel + 1;

export const settlementId = (s: number) => `osada${s + 1}`;
export const mineSlotId = (s: number, m: number) => `${settlementId(s)}.kopalnia${m + 1}`;
export const factorySlotId = (s: number) => `${settlementId(s)}.fabryka`;
export const CONSTRUCT_SLOT = 'konstrukt';

/** Wszystkie znane `slotId` (do walidacji zapisu). */
export function allSlotIds(): string[] {
  const out: string[] = [];
  for (let s = 0; s < CFG.settlements; s++) {
    for (let m = 0; m < CFG.minesPerSettlement; m++) out.push(mineSlotId(s, m));
    out.push(factorySlotId(s));
  }
  out.push(CONSTRUCT_SLOT);
  return out;
}

interface Slot {
  slotId: string;
  typ: MetalObjectType;
  poziom: number;
}

/**
 * Przełożenie poziomu kopalni metalu na obiekty (bez miejsc): poz. 1–3 — kopalnia 1 osady 1 rośnie 1→3,
 * 4–9 — kopalnie 2 i 3, 10 — fabryka osady 1; 11–40 — osady 2–4 tym samym rytmem. Megakonstrukt — w fazie „konstrukt”.
 */
export function metalComplexSlots(level: number, phase: MetalComplexPhase): Slot[] {
  const per = levelsPerSettlement();
  const lv = Math.max(0, Math.min(Math.floor(Number.isFinite(level) ? level : 0), per * CFG.settlements));
  const out: Slot[] = [];
  if (phase === 'konstrukt') out.push({ slotId: CONSTRUCT_SLOT, typ: 'megakonstrukt', poziom: 1 });
  for (let s = 0; s < CFG.settlements; s++) {
    const k = lv - s * per;
    if (k <= 0) break;
    for (let m = 0; m < CFG.minesPerSettlement; m++) {
      const mineLevel = Math.min(CFG.mineMaxLevel, k - m * CFG.mineMaxLevel);
      if (mineLevel > 0) out.push({ slotId: mineSlotId(s, m), typ: 'kopalnia', poziom: mineLevel });
    }
    if (k >= per) out.push({ slotId: factorySlotId(s), typ: 'fabryka', poziom: 1 });
  }
  return out;
}

const fieldsOfType = (t: MetalObjectType) => (t === 'kopalnia' ? CFG.fields.mine : t === 'fabryka' ? CFG.fields.factory : CFG.fields.construct);
const durabilityOf = (t: MetalObjectType) => (t === 'kopalnia' ? CFG.durability.mine : t === 'fabryka' ? CFG.durability.factory : CFG.durability.construct);

/** Pola zajęte przez kompleks na danym poziomie i w fazie (robocze; na razie nie zmienia `fieldsFor`). */
export function metalComplexFields(level: number, phase: MetalComplexPhase): number {
  return metalComplexSlots(level, phase).reduce((sum, s) => sum + fieldsOfType(s.typ), 0);
}

/** Pola kompletu osad (próg megakonstruktu): 4 × (3 kopalnie + fabryka) = 20 pól. */
export const constructThreshold = () => CFG.settlements * (CFG.minesPerSettlement * CFG.fields.mine + CFG.fields.factory);

/** Czy kompleks na tym poziomie osiągnął próg megakonstruktu (komplet osad). */
export const canBuildConstruct = (level: number) => metalComplexFields(level, 'osady') >= constructThreshold();

// ——— geometria ———

const dot = (a: Vec3, b: Vec3) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
const normalize = (v: Vec3): Vec3 => {
  const len = Math.hypot(v[0], v[1], v[2]) || 1;
  return [v[0] / len, v[1] / len, v[2] / len];
};
const cross = (a: Vec3, b: Vec3): Vec3 => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];

/** Płaszczyzna styczna w środku: punkt (x, y) w radianach → punkt na sferze (odwzorowanie wykładnicze). */
function tangentFrame(center: Vec3) {
  const helper: Vec3 = Math.abs(center[1]) < 0.9 ? [0, 1, 0] : [1, 0, 0];
  const east = normalize(cross(helper, center));
  const north = cross(center, east);
  return (x: number, y: number): Vec3 => {
    const d = Math.hypot(x, y);
    if (d < 1e-12) return [...center];
    const tx = (east[0] * x + north[0] * y) / d;
    const ty = (east[1] * x + north[1] * y) / d;
    const tz = (east[2] * x + north[2] * y) / d;
    const c = Math.cos(d);
    const s = Math.sin(d);
    return normalize([center[0] * c + tx * s, center[1] * c + ty * s, center[2] * c + tz * s]);
  };
}

/** Punkt szablonu w jednostkach promienia pola: (x, y) i promień zajmowanego miejsca. */
interface TemplatePoint {
  slotId: string;
  x: number;
  y: number;
  reach: number;
}

/** Odległości szablonów (w promieniach pola) — robocze, do dopracowania przy rysowaniu (etap 2). */
const OSADY = { settlement: 2.8, mine: 1.3, mineSpread: (70 * Math.PI) / 180 };
const KONSTRUKT = { factory: 2.4, mine: 3.9, mineSpread: (17 * Math.PI) / 180, beltGap: 0.35, beltFrom: 0.6, beltTo: 0.95 };
/** Promień (w promieniach pola) miejsca: kopalnia, fabryka, megakonstrukt, plac. */
const REACH = { kopalnia: 0.4, fabryka: 0.6, megakonstrukt: 0.95, plac: 1.0 };

const armHeading = (s: number) => (s * 2 * Math.PI) / CFG.settlements;

/** Wszystkie miejsca fazy (niezależnie od poziomu — stałe sloty). */
function template(phase: MetalComplexPhase): TemplatePoint[] {
  const out: TemplatePoint[] = [];
  const at = (slotId: string, dist: number, heading: number, reach: number, base?: [number, number]) => {
    const [bx, by] = base ?? [0, 0];
    out.push({ slotId, x: bx + dist * Math.cos(heading), y: by + dist * Math.sin(heading), reach });
  };
  if (phase === 'osady') {
    // Pusty plac w środku też musi stać na lądzie (miejsce na przyszły megakonstrukt).
    out.push({ slotId: '', x: 0, y: 0, reach: REACH.plac });
    for (let s = 0; s < CFG.settlements; s++) {
      const h = armHeading(s);
      const base: [number, number] = [OSADY.settlement * Math.cos(h), OSADY.settlement * Math.sin(h)];
      out.push({ slotId: factorySlotId(s), x: base[0], y: base[1], reach: REACH.fabryka });
      for (let m = 0; m < CFG.minesPerSettlement; m++) {
        const spread = CFG.minesPerSettlement > 1 ? (m / (CFG.minesPerSettlement - 1) - 0.5) * 2 * OSADY.mineSpread : 0;
        at(mineSlotId(s, m), OSADY.mine, h + spread, REACH.kopalnia, base);
      }
    }
  } else {
    out.push({ slotId: CONSTRUCT_SLOT, x: 0, y: 0, reach: REACH.megakonstrukt });
    for (let s = 0; s < CFG.settlements; s++) {
      const h = armHeading(s);
      at(factorySlotId(s), KONSTRUKT.factory, h, REACH.fabryka);
      for (let m = 0; m < CFG.minesPerSettlement; m++) {
        const spread = CFG.minesPerSettlement > 1 ? (m / (CFG.minesPerSettlement - 1) - 0.5) * 2 * KONSTRUKT.mineSpread : 0;
        at(mineSlotId(s, m), KONSTRUKT.mine, h + spread, REACH.kopalnia);
      }
    }
  }
  return out;
}

/** Średni promień kątowy pola lądu — jednostka szablonu. */
function landUnit(grid: FieldGrid): number {
  let sum = 0;
  let n = 0;
  for (let i = 0; i < grid.seaCellStart; i++) {
    const c = grid.cells[i]!;
    if (c.kind === 'land') {
      sum += c.radius;
      n++;
    }
  }
  return n > 0 ? sum / n : 0.1;
}

/**
 * Indeks punktów mapy powierzchni w okolicy środka: kubełki 3D o boku ~2 odstępów punktów — najbliższy punkt
 * szukany w 27 sąsiednich kubełkach zamiast w całej mapie (dopasowanie układu sprawdza kilka tysięcy punktów).
 */
function sampleIndex(grid: FieldGrid, center: Vec3, maxAngle: number) {
  const minDot = Math.cos(Math.min(Math.PI, maxAngle));
  const size = 2 * Math.sqrt((4 * Math.PI) / Math.max(1, grid.samples.length));
  const key = (x: number, y: number, z: number) => `${x},${y},${z}`;
  const buckets = new Map<string, number[]>();
  grid.samples.forEach((p, i) => {
    if (dot(p, center) < minDot) return;
    const k = key(Math.floor(p[0] / size), Math.floor(p[1] / size), Math.floor(p[2] / size));
    const list = buckets.get(k);
    if (list) list.push(i);
    else buckets.set(k, [i]);
  });
  /** Najbliższy punkt mapy w okolicy (`landOnly` — tylko ląd); −1 — brak w sąsiednich kubełkach. */
  return (p: Vec3, landOnly: boolean): number => {
    const bx = Math.floor(p[0] / size);
    const by = Math.floor(p[1] / size);
    const bz = Math.floor(p[2] / size);
    let best = -1;
    let bestDot = -Infinity;
    for (let dx = -1; dx <= 1; dx++)
      for (let dy = -1; dy <= 1; dy++)
        for (let dz = -1; dz <= 1; dz++) {
          for (const i of buckets.get(key(bx + dx, by + dy, bz + dz)) ?? []) {
            if (landOnly && grid.kinds[i] !== 'land') continue;
            const d = dot(grid.samples[i]!, p);
            if (d > bestDot) {
              bestDot = d;
              best = i;
            }
          }
        }
    return best;
  };
}

/** Najbliższy punkt lądu w całej mapie (rzadki przypadek — dosunięcie miejsca). −1 — brak lądu. */
function nearestLand(grid: FieldGrid, p: Vec3): number {
  let best = -1;
  let bestDot = -Infinity;
  grid.samples.forEach((q, i) => {
    if (grid.kinds[i] !== 'land') return;
    const d = dot(q, p);
    if (d > bestDot) {
      bestDot = d;
      best = i;
    }
  });
  return best;
}

/** Kąty (wokół punktu) sprawdzane przy dopasowaniu miejsca do lądu. */
const RING = 6;
/** Obroty (co 30°) i zwężenia układu próbowane po kolei. */
const ROTATIONS = 12;
const SCALES = [1, 0.85, 0.7, 0.55, 0.4];
/** Jaka część otoczenia miejsc musi być lądem, żeby układ pasował. */
const FIT_SHARE = 0.9;

/**
 * Układ kompleksu kopalni metalu. `center` — środek dzielnicy z zapisu (brak = wybór automatyczny, jak przy migracji);
 * `states` — zapisane stany obiektów.
 */
export function complexLayout(
  grid: FieldGrid,
  seed: string,
  level: number,
  phase: MetalComplexPhase,
  options: { center?: Vec3; states?: Record<string, MetalObjectSave> } = {},
): MetalComplexLayout {
  const center = options.center ? normalize(options.center) : chooseMetalCenter(grid, seed);
  const unit = landUnit(grid);
  const points = template(phase);
  const maxDist = Math.max(...points.map((p) => Math.hypot(p.x, p.y) + p.reach));
  const nearest = sampleIndex(grid, center, maxDist * unit * 1.3 + 0.05);
  const isLandAt = (p: Vec3) => {
    const i = nearest(p, false);
    return i >= 0 && grid.kinds[i] === 'land';
  };
  const rng = createRng(seed).fork('visual').fork('metalComplex');
  const baseRotation = rng.next() * 2 * Math.PI;
  const toSphere = tangentFrame(center);

  // Dopasowanie: najpierw obroty (co 30°) w pełnej skali, potem zwężenie. Układ pasuje, gdy środek każdego miejsca
  // leży na lądzie, a z otoczenia miejsc (pierścienie wokół nich) na lądzie jest co najmniej `FIT_SHARE` — pojedyncze
  // jeziorka i zatoczki nie zwężają całego kompleksu. Gdy nic nie pasuje — najlepszy wynik, a miejsca poza lądem
  // dosuwane do najbliższego lądu.
  const place = (rotation: number, scale: number) => {
    const c = Math.cos(rotation);
    const s = Math.sin(rotation);
    return points.map((p) => {
      const x = (p.x * c - p.y * s) * scale * unit;
      const y = (p.x * s + p.y * c) * scale * unit;
      return { p, x, y };
    });
  };
  const score = (placed: ReturnType<typeof place>, scale: number) => {
    let centers = 0;
    let ring = 0;
    for (const { p, x, y } of placed) {
      if (isLandAt(toSphere(x, y))) centers++;
      const r = p.reach * scale * unit;
      for (let a = 0; a < RING; a++) {
        const h = (a * 2 * Math.PI) / RING;
        if (isLandAt(toSphere(x + r * Math.cos(h), y + r * Math.sin(h)))) ring++;
      }
    }
    return { centers, ring, value: centers * (RING + 1) + ring };
  };
  const ringFull = points.length * RING;
  let best = { rotation: baseRotation, scale: SCALES[0]!, value: -1 };
  search: for (const scale of SCALES) {
    for (let k = 0; k < ROTATIONS; k++) {
      const rotation = baseRotation + (k * 2 * Math.PI) / ROTATIONS;
      const fit = score(place(rotation, scale), scale);
      if (fit.centers === points.length && fit.ring >= FIT_SHARE * ringFull) {
        best = { rotation, scale, value: fit.value };
        break search;
      }
      if (fit.value > best.value) best = { rotation, scale, value: fit.value };
    }
  }

  const placed = place(best.rotation, best.scale);
  const where = new Map<string, Vec3>();
  for (const { p, x, y } of placed) {
    if (!p.slotId) continue;
    let pos = toSphere(x, y);
    if (!isLandAt(pos)) {
      const near = nearest(pos, true);
      const any = near >= 0 ? near : nearestLand(grid, pos);
      if (any >= 0) pos = [...grid.samples[any]!];
    }
    where.set(p.slotId, pos);
  }

  const states = options.states ?? {};
  const obiekty: MetalComplexObject[] = metalComplexSlots(level, phase).map((slot) => {
    const saved = states[slot.slotId];
    const max = durabilityOf(slot.typ);
    return {
      ...slot,
      stan: saved?.stan ?? 'aktywny',
      wytrzymalosc: saved ? Math.max(0, Math.min(max, saved.wytrzymalosc)) : max,
      pozycja: where.get(slot.slotId)!,
    };
  });
  const built = new Set(obiekty.map((o) => o.slotId));

  // Drogi: z każdej zbudowanej kopalni do fabryki osady — dopiero gdy fabryka stoi.
  const drogi: MetalComplexRoad[] = [];
  for (let s = 0; s < CFG.settlements; s++) {
    const f = factorySlotId(s);
    if (!built.has(f)) continue;
    for (let m = 0; m < CFG.minesPerSettlement; m++) {
      const id = mineSlotId(s, m);
      if (built.has(id)) drogi.push({ from: id, to: f, points: [where.get(id)!, where.get(f)!] });
    }
  }

  // Pasy: w fazie „konstrukt” po `beltsPerFactory` równoległych pasów od każdej fabryki do konstruktu.
  const pasy: MetalComplexBelt[] = [];
  if (phase === 'konstrukt') {
    const c = Math.cos(best.rotation);
    const sn = Math.sin(best.rotation);
    const u = best.scale * unit;
    const rot = (x: number, y: number): [number, number] => [(x * c - y * sn) * u, (x * sn + y * c) * u];
    for (let s = 0; s < CFG.settlements; s++) {
      const f = factorySlotId(s);
      if (!built.has(f)) continue;
      const h = armHeading(s);
      const along: [number, number] = [Math.cos(h), Math.sin(h)];
      const side: [number, number] = [-along[1], along[0]];
      for (let b = 0; b < CFG.beltsPerFactory; b++) {
        const off = (b - (CFG.beltsPerFactory - 1) / 2) * KONSTRUKT.beltGap;
        const end = (d: number) => {
          const [x, y] = rot(along[0] * d + side[0] * off, along[1] * d + side[1] * off);
          return toSphere(x, y);
        };
        pasy.push({ factory: f, index: b, points: [end(KONSTRUKT.factory - KONSTRUKT.beltFrom), end(KONSTRUKT.beltTo)] });
      }
    }
  }

  return { phase, center, rotation: best.rotation, scale: best.scale, obiekty, drogi, pasy };
}

/**
 * Środek dzielnicy kompleksu (migracja starych zapisów i nowe planety): gdy kopalnia metalu ma już obszar pól —
 * pole najbliżej jego środka ciężkości; inaczej pole lądu z największą ilością lądu w promieniu dzielnicy
 * (wzgórza i góry — teren kopalni — mają pierwszeństwo). Remisy rozstrzyga strumień `visual` seeda. Punkt zawsze na lądzie.
 */
export function chooseMetalCenter(grid: FieldGrid, seed: string, metalCells: readonly number[] = []): Vec3 {
  const land: number[] = [];
  for (let i = 0; i < grid.seaCellStart; i++) if (grid.cells[i]?.kind === 'land') land.push(i);
  const cells = metalCells.filter((c) => land.includes(c));
  let pick = -1;
  if (cells.length > 0) {
    const sum: Vec3 = [0, 0, 0];
    for (const c of cells) for (let k = 0; k < 3; k++) sum[k] += grid.cells[c]!.center[k]!;
    const mid = normalize(sum);
    pick = cells.reduce((a, b) => (dot(grid.cells[b]!.center, mid) > dot(grid.cells[a]!.center, mid) ? b : a));
  } else if (land.length > 0) {
    const rng = createRng(seed).fork('visual').fork('metalComplexCenter');
    const reach = Math.cos(landUnit(grid) * 4.5);
    let bestScore = -Infinity;
    for (const i of land) {
      const c = grid.cells[i]!;
      let around = 0;
      for (const j of land) if (dot(grid.cells[j]!.center, c.center) >= reach) around++;
      const value = around + (c.terrain === 'hill' || c.terrain === 'mountain' ? 1.5 : 0) + rng.next() * 0.5;
      if (value > bestScore) {
        bestScore = value;
        pick = i;
      }
    }
  }
  if (pick < 0) return [0, 0, 1];
  // Punkt mapy pola najbliżej jego środka — zawsze ląd.
  const field = grid.cells[pick]!;
  let best = field.center;
  let bestDot = -Infinity;
  for (const m of field.members) {
    if (grid.kinds[m] !== 'land') continue;
    const d = dot(grid.samples[m]!, field.center);
    if (d > bestDot) {
      bestDot = d;
      best = grid.samples[m]!;
    }
  }
  return [...best];
}

// ——— zapis ———

const round = (v: number) => Math.round(v * 1e6) / 1e6;

/**
 * Stan kompleksu z zapisu (walidacja; błędne pola pomijane). Środek musi być wektorem jednostkowym (±10%),
 * faza jedną ze znanych, stany — znane `slotId` i stany. Brak lub błędny środek = null (migracja wybierze nowy).
 */
export function parseMetalComplex(raw: unknown): MetalComplexSave | null {
  if (!raw || typeof raw !== 'object') return null;
  const r = raw as { center?: unknown; phase?: unknown; states?: unknown };
  if (!Array.isArray(r.center) || r.center.length !== 3 || !r.center.every((v) => typeof v === 'number' && Number.isFinite(v))) return null;
  const c = r.center as Vec3;
  const len = Math.hypot(c[0], c[1], c[2]);
  if (len < 0.9 || len > 1.1) return null;
  const out: MetalComplexSave = {
    center: normalize(c).map(round) as Vec3,
    phase: METAL_PHASES.includes(r.phase as MetalComplexPhase) ? (r.phase as MetalComplexPhase) : 'osady',
  };
  if (r.states && typeof r.states === 'object') {
    const ids = new Set(allSlotIds());
    const states: Record<string, MetalObjectSave> = {};
    for (const [id, s] of Object.entries(r.states as Record<string, any>)) {
      if (!ids.has(id) || !s || !MOBJECT_STATES.includes(s.stan) || typeof s.wytrzymalosc !== 'number' || !Number.isFinite(s.wytrzymalosc) || s.wytrzymalosc < 0) continue;
      states[id] = { stan: s.stan, wytrzymalosc: s.wytrzymalosc };
    }
    if (Object.keys(states).length > 0) out.states = states;
  }
  return out;
}

/**
 * Migracja: kompleks z zapisu albo — gdy go brak (zapis sprzed etapu 1, także import PF2) — nowy w fazie „osady”
 * ze środkiem wybranym automatycznie i deterministycznie. Planeta bez kopalni metalu (poziom 0) — bez kompleksu.
 */
export function ensureMetalComplex(
  saved: MetalComplexSave | undefined,
  grid: FieldGrid,
  seed: string,
  level: number,
  metalCells: readonly number[] = [],
): MetalComplexSave | undefined {
  if (saved) return saved;
  if (Math.floor(level) <= 0) return undefined;
  return { center: chooseMetalCenter(grid, seed, metalCells).map(round) as Vec3, phase: 'osady' };
}
