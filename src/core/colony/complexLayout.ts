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
  /** Jednostka układu (rad): średni promień pola lądu × skala — wielkość obiektów przy rysowaniu. */
  unit: number;
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
const OSADY = { settlement: 3.0, mine: 1.6, mineSpread: (70 * Math.PI) / 180 };
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
  // Klucz kubełka liczbą (bez sklejania napisów przy każdym wyszukiwaniu — wybór środka sprawdza dziesiątki tysięcy punktów).
  const key = (x: number, y: number, z: number) => ((x + 512) * 1024 + (y + 512)) * 1024 + (z + 512);
  const buckets = new Map<number, number[]>();
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
/** Obroty (co 30°) i zwężenia układu próbowane po kolei — zwężenie tylko w ostateczności, najwyżej do 70% (etap 2). */
const ROTATIONS = 12;
export const METAL_SCALES = [1, 0.85, 0.7] as const;
/** Jaka część otoczenia miejsc musi być lądem, żeby układ pasował. */
const FIT_SHARE = 0.9;

interface Fit {
  rotation: number;
  scale: number;
  /** Układ zmieścił się na lądzie (wszystkie środki miejsc i ≥ 90% otoczenia). */
  fits: boolean;
  value: number;
  /** Udział lądu w otoczeniu miejsc (0..1) — do porównania kandydatów na środek. */
  land: number;
}

/**
 * Dopasowanie szablonu fazy do lądu wokół `center`: obroty co 30° w pełnej skali, potem zwężenie (`METAL_SCALES`).
 * Układ pasuje, gdy środek każdego miejsca leży na lądzie, a z otoczenia miejsc (pierścienie wokół nich) na lądzie
 * jest co najmniej `FIT_SHARE` — pojedyncze jeziorka nie zwężają kompleksu. `blocked` — punkt zajęty (np. pole innego
 * budynku) liczy się jak brak lądu.
 */
function fitTemplate(
  grid: FieldGrid,
  seed: string,
  center: Vec3,
  phase: MetalComplexPhase,
  blocked?: (p: Vec3) => boolean,
  /** Wspólny indeks punktów (wybór środka sprawdza wielu kandydatów — jeden indeks całej mapy). */
  shared?: ReturnType<typeof sampleIndex>,
  scales: readonly number[] = METAL_SCALES,
): Fit & { toSphere: (x: number, y: number) => Vec3; unit: number; nearest: ReturnType<typeof sampleIndex> } {
  const unit = landUnit(grid);
  const points = template(phase);
  const maxDist = Math.max(...points.map((p) => Math.hypot(p.x, p.y) + p.reach));
  const nearest = shared ?? sampleIndex(grid, center, maxDist * unit * 1.3 + 0.05);
  const isLandAt = (p: Vec3) => {
    const i = nearest(p, false);
    return i >= 0 && grid.kinds[i] === 'land' && !(blocked && blocked(p));
  };
  const baseRotation = createRng(seed).fork('visual').fork('metalComplex').next() * 2 * Math.PI;
  const toSphere = tangentFrame(center);
  const ringFull = points.length * RING;
  let best: Fit = { rotation: baseRotation, scale: scales[0]!, fits: false, value: -1, land: 0 };
  for (const scale of scales) {
    for (let k = 0; k < ROTATIONS; k++) {
      const rotation = baseRotation + (k * 2 * Math.PI) / ROTATIONS;
      const c = Math.cos(rotation);
      const sn = Math.sin(rotation);
      let centers = 0;
      let ring = 0;
      for (const p of points) {
        const x = (p.x * c - p.y * sn) * scale * unit;
        const y = (p.x * sn + p.y * c) * scale * unit;
        if (isLandAt(toSphere(x, y))) centers++;
        const r = p.reach * scale * unit;
        for (let a = 0; a < RING; a++) {
          const h = (a * 2 * Math.PI) / RING;
          if (isLandAt(toSphere(x + r * Math.cos(h), y + r * Math.sin(h)))) ring++;
        }
      }
      const value = centers * (RING + 1) + ring;
      const land = value / (points.length * (RING + 1));
      if (centers === points.length && ring >= FIT_SHARE * ringFull) return { rotation, scale, fits: true, value, land, toSphere, unit, nearest };
      if (value > best.value) best = { rotation, scale, fits: false, value, land };
    }
  }
  return { ...best, toSphere, unit, nearest };
}

/** Miejsca slotów fazy (cache: zależą tylko od siatki, seeda, środka i fazy — nie od poziomu). */
interface Places {
  rotation: number;
  scale: number;
  unit: number;
  where: Map<string, Vec3>;
  toSphere: (x: number, y: number) => Vec3;
  nearest: ReturnType<typeof sampleIndex>;
}

const placesCache = new WeakMap<FieldGrid, Map<string, Places>>();

function slotPlaces(grid: FieldGrid, seed: string, center: Vec3, phase: MetalComplexPhase): Places {
  const key = `${seed}|${phase}|${center.map((v) => v.toFixed(6)).join(',')}`;
  let byKey = placesCache.get(grid);
  if (!byKey) placesCache.set(grid, (byKey = new Map()));
  const cached = byKey.get(key);
  if (cached) return cached;
  const fit = fitTemplate(grid, seed, center, phase);
  const { toSphere, unit, nearest } = fit;
  const isLandAt = (p: Vec3) => {
    const i = nearest(p, false);
    return i >= 0 && grid.kinds[i] === 'land';
  };
  const c = Math.cos(fit.rotation);
  const sn = Math.sin(fit.rotation);
  const where = new Map<string, Vec3>();
  for (const p of template(phase)) {
    if (!p.slotId) continue;
    let pos = toSphere((p.x * c - p.y * sn) * fit.scale * unit, (p.x * sn + p.y * c) * fit.scale * unit);
    // Miejsce poza lądem (układ się nie zmieścił) — dosunięte do najbliższego lądu.
    if (!isLandAt(pos)) {
      const near = nearest(pos, true);
      const any = near >= 0 ? near : nearestLand(grid, pos);
      if (any >= 0) pos = [...grid.samples[any]!];
    }
    where.set(p.slotId, pos);
  }
  const places: Places = { rotation: fit.rotation, scale: fit.scale, unit, where, toSphere, nearest };
  byKey.set(key, places);
  return places;
}

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
  const places = slotPlaces(grid, seed, center, phase);
  const where = places.where;
  const best = places;
  const unit = places.unit;
  const toSphere = places.toSphere;

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

  return { phase, center, rotation: best.rotation, scale: best.scale, unit: unit * best.scale, obiekty, drogi, pasy };
}

/** Pola kompleksu: liczone (obszar budynku, `fieldsFor`) i zarezerwowane (dzielnica — inne budynki tu nie staną). */
export interface MetalComplexCells {
  /** Pola zbudowanych obiektów, w kolejności budowy (kopalnia 1 pole, fabryka 2) — obszar kopalni metalu. */
  cells: number[];
  /** Cała dzielnica rozpoczętych osad: pola ich miejsc i dróg oraz plac w środku (zawiera `cells`). */
  reserved: number[];
  /** Pola następnego obiektu (rusztowanie, sprawdzenie miejsca) — puste, gdy komplet. */
  next: number[];
}

const allocationCache = new WeakMap<FieldGrid, Map<string, { slotId: string; cells: number[] }[]>>();

/**
 * Pola wszystkich miejsc fazy „osady” w kolejności budowy: kopalnia — pole pod nią, fabryka — pole pod nią i najbliższe
 * sąsiednie pole lądu. Gdy dwa miejsca wypadają w jednym polu, drugie bierze najbliższe wolne pole lądu obok (liczba pól
 * zawsze jak w modelu). Stałe dla planety i środka — kolejne poziomy tylko odsłaniają kolejne miejsca.
 */
function slotAllocation(grid: FieldGrid, seed: string, center: Vec3): { slotId: string; cells: number[] }[] {
  const key = `${seed}|${center.map((v) => v.toFixed(6)).join(',')}`;
  let byKey = allocationCache.get(grid);
  if (!byKey) allocationCache.set(grid, (byKey = new Map()));
  const cached = byKey.get(key);
  if (cached) return cached;
  const places = slotPlaces(grid, seed, center, 'osady');
  const used = new Set<number>();
  const cellAt = (p: Vec3) => {
    const i = places.nearest(p, false);
    return i >= 0 ? grid.owner[i]! : -1;
  };
  const isLandCell = (c: number) => c >= 0 && c < grid.seaCellStart && grid.cells[c]!.kind === 'land';
  /** `count` pól dla miejsca `p`: najpierw pole pod nim, potem najbliższe wolne pola lądu (po sąsiedztwie). */
  const take = (p: Vec3, count: number): number[] => {
    const out: number[] = [];
    const start = cellAt(p);
    const queue = isLandCell(start) ? [start] : [];
    const seen = new Set(queue);
    while (out.length < count && queue.length > 0) {
      queue.sort((a, b) => dot(grid.cells[b]!.center, p) - dot(grid.cells[a]!.center, p));
      const c = queue.shift()!;
      if (!used.has(c)) {
        out.push(c);
        used.add(c);
      }
      for (const n of grid.cells[c]!.neighbors) {
        if (!seen.has(n) && isLandCell(n)) {
          seen.add(n);
          queue.push(n);
        }
      }
    }
    return out;
  };
  const out: { slotId: string; cells: number[] }[] = [];
  for (const slot of metalComplexSlots(levelsPerSettlement() * CFG.settlements, 'osady')) {
    if (out.some((o) => o.slotId === slot.slotId)) continue;
    out.push({ slotId: slot.slotId, cells: take(places.where.get(slot.slotId)!, fieldsOfType(slot.typ)) });
  }
  byKey.set(key, out);
  return out;
}

/**
 * Pola kompleksu na danym poziomie (faza „osady”): liczone — pola zbudowanych obiektów (tyle, ile w modelu: kopalnia 1,
 * fabryka 2, najwyżej 20); zarezerwowane — plac w środku i cała dzielnica każdej rozpoczętej osady (miejsca kopalń
 * i fabryki, pola pod drogami), żeby żaden inny budynek nie stanął w jej obrębie.
 */
export function metalComplexCells(grid: FieldGrid, seed: string, center: Vec3, level: number): MetalComplexCells {
  const lv = Math.max(0, Math.floor(Number.isFinite(level) ? level : 0));
  if (lv <= 0) return { cells: [], reserved: [], next: [] };
  const allocation = slotAllocation(grid, seed, center);
  const bySlot = new Map(allocation.map((a) => [a.slotId, a.cells]));
  const built = metalComplexSlots(lv, 'osady');
  const cells: number[] = [];
  for (const slot of built) for (const c of bySlot.get(slot.slotId) ?? []) if (!cells.includes(c)) cells.push(c);
  const nextSlot = metalComplexSlots(lv + 1, 'osady').find((s) => !built.some((b) => b.slotId === s.slotId));
  const next = nextSlot ? (bySlot.get(nextSlot.slotId) ?? []).filter((c) => !cells.includes(c)) : [];
  const reserved = new Set(cells);
  const places = slotPlaces(grid, seed, center, 'osady');
  const cellAt = (p: Vec3) => {
    const i = places.nearest(p, false);
    return i >= 0 ? grid.owner[i]! : -1;
  };
  const addLand = (c: number) => {
    if (c >= 0 && c < grid.seaCellStart && grid.cells[c]!.kind === 'land') reserved.add(c);
  };
  // Plac w środku (miejsce na przyszły megakonstrukt): pole pod środkiem i pola w promieniu placu.
  addLand(cellAt(center));
  const plaza = REACH.plac * places.scale * places.unit;
  for (let a = 0; a < 8; a++) addLand(cellAt(places.toSphere(plaza * Math.cos((a * Math.PI) / 4), plaza * Math.sin((a * Math.PI) / 4))));
  // Rozpoczęte osady: wszystkie ich miejsca i pola pod drogami kopalnia → fabryka.
  const started = Math.min(CFG.settlements, Math.ceil(lv / levelsPerSettlement()));
  for (let s = 0; s < started; s++) {
    const ids = [...Array.from({ length: CFG.minesPerSettlement }, (_, m) => mineSlotId(s, m)), factorySlotId(s)];
    for (const id of ids) for (const c of bySlot.get(id) ?? []) addLand(c);
    const f = places.where.get(factorySlotId(s))!;
    for (let m = 0; m < CFG.minesPerSettlement; m++) {
      const a = places.where.get(mineSlotId(s, m))!;
      for (let k = 1; k < 4; k++) {
        const t = k / 4;
        addLand(cellAt(normalize([a[0] + (f[0] - a[0]) * t, a[1] + (f[1] - a[1]) * t, a[2] + (f[2] - a[2]) * t])));
      }
    }
  }
  return { cells, reserved: [...reserved], next };
}

/** Ilu najlepszych kandydatów na środek sprawdzać pełnym dopasowaniem układu. */
const CENTER_CANDIDATES = 24;

/**
 * Środek dzielnicy kompleksu (nowe planety i migracja): miejsce, gdzie CAŁY układ (komplet osad i plac) mieści się
 * na wolnym lądzie bez zwężania (etap 2 — dawniej układ zwężał się nawet do 40%). Kandydaci: pola lądu z największą
 * ilością lądu wokół (wzgórza i góry — teren kopalni — mają pierwszeństwo), potem dla najlepszych pełne dopasowanie:
 * wygrywa największa skala, przy równej — więcej lądu wokół miejsc. `occupied` — pola innych budynków (dzielnica ich
 * nie zajmie). Remisy rozstrzyga strumień `visual` seeda. Punkt zawsze na lądzie.
 */
export function chooseMetalCenter(grid: FieldGrid, seed: string, occupied: readonly number[] = []): Vec3 {
  const taken = new Set(occupied);
  const land: number[] = [];
  for (let i = 0; i < grid.seaCellStart; i++) if (grid.cells[i]?.kind === 'land' && !taken.has(i)) land.push(i);
  if (land.length === 0) return [0, 0, 1];
  const rng = createRng(seed).fork('visual').fork('metalComplexCenter');
  const reach = Math.cos(landUnit(grid) * 4.5);
  const rough = land.map((i) => {
    const c = grid.cells[i]!;
    let around = 0;
    let hills = 0;
    for (const j of land) {
      if (dot(grid.cells[j]!.center, c.center) < reach) continue;
      around++;
      const t = grid.cells[j]!.terrain;
      if (t === 'hill' || t === 'mountain') hills++;
    }
    return { i, value: around + 0.5 * hills + rng.next() * 0.5, hills };
  });
  rough.sort((a, b) => b.value - a.value || a.i - b.i);
  const pointOf = (cell: number): Vec3 => {
    const field = grid.cells[cell]!;
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
  };
  // Punkt zajęty przez inny budynek — jak brak lądu (dzielnica go omija).
  const blocked =
    taken.size === 0
      ? undefined
      : (() => {
          let lookup: ((p: Vec3) => number) | null = null;
          return (p: Vec3) => {
            lookup ??= ownerLookup(grid);
            return taken.has(lookup(p));
          };
        })();
  // Najpierw pełna skala u wszystkich kandydatów; zwężenie sprawdzane dopiero, gdy nigdzie się nie mieści (najlepsi z 1. przebiegu).
  const shared = sampleIndex(grid, [0, 0, 1], Math.PI);
  const first = rough.slice(0, CENTER_CANDIDATES).map((cand) => ({ cand, fit: fitTemplate(grid, seed, pointOf(cand.i), 'osady', blocked, shared, [1]) }));
  const rank = (a: { cand: { value: number }; fit: Fit }) => (a.fit.fits ? a.fit.scale : 0) * 1000 + a.fit.land * 100 + a.cand.value * 0.01;
  let results = first;
  if (!first.some((r) => r.fit.fits)) {
    const promising = [...first].sort((a, b) => b.fit.land - a.fit.land).slice(0, 8);
    results = promising.map(({ cand }) => ({ cand, fit: fitTemplate(grid, seed, pointOf(cand.i), 'osady', blocked, shared, METAL_SCALES.slice(1)) }));
  }
  const pick = results.reduce((a, b) => (rank(b) > rank(a) ? b : a)).cand;
  return pointOf(pick.i);
}

/** Pole siatki pod punktem (najbliższy punkt mapy → jego pole; −1 — woda, lawa bez pola). */
function ownerLookup(grid: FieldGrid, shared?: ReturnType<typeof sampleIndex>): (p: Vec3) => number {
  const nearest = shared ?? sampleIndex(grid, [0, 0, 1], Math.PI);
  return (p: Vec3) => {
    const i = nearest(p, false);
    return i >= 0 ? grid.owner[i]! : -1;
  };
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
  /** Pola innych budynków — dzielnica ich nie zajmie (pola dawnej kopalni metalu wracają do puli). */
  occupied: readonly number[] = [],
): MetalComplexSave | undefined {
  if (saved) return saved;
  if (Math.floor(level) <= 0) return undefined;
  return { center: chooseMetalCenter(grid, seed, occupied).map(round) as Vec3, phase: 'osady' };
}
