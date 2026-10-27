import { BALANCE } from '../../data/balance.ts';
import type { BuildingId, BuildingLevels, Construction, EconomyState } from '../types.ts';

export const SAVE_VERSION = 1;
/** Klucz zapisu jednej planety z wersji 0.1–0.6 — od 0.7 tylko odczytywany przy przejściu na imperium (`empire.ts`). */
export const SAVE_KEY = 'planet-forge.save.v1';

export interface SaveData {
  saveVersion: number;
  /** `address` (np. „1:42:7”) — miejsce planety w galaktyce (od v0.11; starsze zapisy go nie mają). */
  planet: { definitionId: string; seed: string; generatorVersion: number; address?: string };
  economy: EconomyState;
}

export function serialize(data: Omit<SaveData, 'saveVersion'>): string {
  return JSON.stringify({ saveVersion: SAVE_VERSION, ...data });
}

const isNum = (value: unknown): value is number => typeof value === 'number' && Number.isFinite(value);

/** Odczyt z walidacją. Uszkodzony lub obcy zapis = null (gra startuje od nowa). */
export function deserialize(raw: string | null): SaveData | null {
  if (!raw) return null;
  let data: any;
  try {
    data = JSON.parse(raw);
  } catch {
    return null;
  }
  if (!data || data.saveVersion !== SAVE_VERSION) return null;
  const planet = parsePlanetRef(data.planet);
  const economy = parseEconomy(data.economy);
  if (!planet || !economy) return null;
  return { saveVersion: SAVE_VERSION, planet, economy };
}

/** Odnośnik do planety (definicja + seed + wersja generatora) albo null. */
export function parsePlanetRef(raw: any): SaveData['planet'] | null {
  if (!raw || typeof raw.definitionId !== 'string' || typeof raw.seed !== 'string' || !isNum(raw.generatorVersion)) {
    return null;
  }
  const ref: SaveData['planet'] = { definitionId: raw.definitionId, seed: raw.seed, generatorVersion: raw.generatorVersion };
  // Błędny adres nie psuje zapisu — planeta dostanie nowe miejsce w układzie startowym.
  if (typeof raw.address === 'string' && /^\d{1,3}:\d{1,4}:\d{1,2}$/.test(raw.address)) ref.address = raw.address;
  return ref;
}

/** Stan gospodarki z walidacją (brakujące nowsze pola → wartości startowe) albo null. */
export function parseEconomy(economy: any): EconomyState | null {
  if (!economy || !economy.stock || !isNum(economy.stock.metal) || !isNum(economy.stock.crystal) || !isNum(economy.lastUpdate)) {
    return null;
  }
  const levels = {} as BuildingLevels;
  for (const def of BALANCE.buildings) {
    // Budynek dodany w nowszej wersji (np. Magazyn) → poziom startowy.
    const level = economy.levels?.[def.id] ?? BALANCE.startingLevels[def.id];
    if (!isNum(level) || level < 0 || level > BALANCE.maxLevel || !Number.isInteger(level)) return null;
    levels[def.id] = level;
  }
  // Budowa jest opcjonalna (zapisy z v0.1–0.2 jej nie mają). Błędna = cały zapis odrzucony.
  let construction: Construction | null = null;
  if (economy.construction != null) {
    construction = parseConstruction(economy.construction, levels);
    if (!construction) return null;
  }
  return {
    stock: { metal: Math.max(0, economy.stock.metal), crystal: Math.max(0, economy.stock.crystal) },
    levels,
    lastUpdate: economy.lastUpdate,
    construction,
    // Zapisy sprzed antymaterii dostają zapas startowy.
    antimatter: isNum(economy.antimatter) ? Math.max(0, economy.antimatter) : BALANCE.antimatter.startingStock,
    ...parseBuildingMaps(economy),
    ...parseMined(economy.mined),
    ...parseQueue(economy.queue),
  };
}

/** Najdłuższa kolejka przyjmowana z zapisu (ochrona przed uszkodzonym tekstem). */
const MAX_SAVED_QUEUE = 10;

/** Kolejka budowy (od v0.32.2; brak = pusta). Nieznane budynki pomijane. */
function parseQueue(raw: any): Pick<EconomyState, 'queue'> {
  if (!Array.isArray(raw)) return {};
  const ids = new Set<string>(BALANCE.buildings.map((b) => b.id));
  const queue = raw.filter((id: unknown): id is BuildingId => typeof id === 'string' && ids.has(id)).slice(0, MAX_SAVED_QUEUE);
  return queue.length ? { queue } : {};
}

/**
 * Wydobycie ze złóż (od v0.27). Starsze zapisy go nie mają = złoża pełne: każda planeta liczy
 * swój zasób z własnego seeda, a zgromadzone surowce i poziomy zostają bez zmian.
 */
function parseMined(raw: any): Pick<EconomyState, 'mined'> {
  const ok = (v: unknown): v is number => isNum(v) && v >= 0;
  if (!raw || (!ok(raw.metal) && !ok(raw.crystal))) return {};
  return { mined: { metal: ok(raw.metal) ? raw.metal : 0, crystal: ok(raw.crystal) ? raw.crystal : 0 } };
}

/** Ustawienia budynków i dopasowanie do terenu (od v0.26.1) — błędne wartości pomijane. */
function parseBuildingMaps(economy: any): Pick<EconomyState, 'settings' | 'siteFactor' | 'energyFactor'> {
  const unit = (v: unknown): v is number => isNum(v) && v >= 0 && v <= 1;
  // Mnożniki terenu i kompleksów mogą przekraczać 1 (premia kompleksu, tryb fabryki — v0.38/v0.39).
  const factor = (v: unknown): v is number => isNum(v) && v >= 0 && v <= 5;
  const out: Pick<EconomyState, 'settings' | 'siteFactor' | 'energyFactor'> = {};
  for (const def of BALANCE.buildings) {
    const s = economy.settings?.[def.id];
    if (s && unit(s.work) && unit(s.priority)) (out.settings ??= {})[def.id] = { work: s.work, priority: s.priority };
    const f = economy.siteFactor?.[def.id];
    if (factor(f)) (out.siteFactor ??= {})[def.id] = f;
    const e = economy.energyFactor?.[def.id];
    if (factor(e)) (out.energyFactor ??= {})[def.id] = e;
  }
  return out;
}

function parseConstruction(raw: any, levels: BuildingLevels): Construction | null {
  const def = BALANCE.buildings.find((b) => b.id === raw?.building);
  if (!def) return null;
  const id = def.id as BuildingId;
  if (
    raw.targetLevel !== levels[id] + 1 ||
    raw.targetLevel > BALANCE.maxLevel ||
    !isNum(raw.startedAt) ||
    !isNum(raw.finishesAt) ||
    raw.finishesAt < raw.startedAt ||
    !isNum(raw.cost?.metal) ||
    !isNum(raw.cost?.crystal) ||
    raw.cost.metal < 0 ||
    raw.cost.crystal < 0
  ) {
    return null;
  }
  return {
    building: id,
    targetLevel: raw.targetLevel,
    startedAt: raw.startedAt,
    finishesAt: raw.finishesAt,
    cost: { metal: raw.cost.metal, crystal: raw.cost.crystal },
  };
}
