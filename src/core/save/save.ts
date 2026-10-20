import { BALANCE } from '../../data/balance.ts';
import type { BuildingLevels, EconomyState } from '../types.ts';

export const SAVE_VERSION = 1;
export const SAVE_KEY = 'planet-forge.save.v1';

export interface SaveData {
  saveVersion: number;
  planet: { definitionId: string; seed: string; generatorVersion: number };
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
  const planet = data.planet;
  const economy = data.economy;
  if (
    !planet ||
    typeof planet.definitionId !== 'string' ||
    typeof planet.seed !== 'string' ||
    !isNum(planet.generatorVersion) ||
    !economy ||
    !economy.stock ||
    !isNum(economy.stock.metal) ||
    !isNum(economy.stock.crystal) ||
    !isNum(economy.lastUpdate)
  ) {
    return null;
  }
  const levels = {} as BuildingLevels;
  for (const def of BALANCE.buildings) {
    const level = economy.levels?.[def.id];
    if (!isNum(level) || level < 0 || level > BALANCE.maxLevel || !Number.isInteger(level)) return null;
    levels[def.id] = level;
  }
  return {
    saveVersion: SAVE_VERSION,
    planet: { definitionId: planet.definitionId, seed: planet.seed, generatorVersion: planet.generatorVersion },
    economy: {
      stock: { metal: Math.max(0, economy.stock.metal), crystal: Math.max(0, economy.stock.crystal) },
      levels,
      lastUpdate: economy.lastUpdate,
    },
  };
}

// Bezpieczny dostęp do localStorage (tryb prywatny Safari może rzucać wyjątki).

export function loadSave(): SaveData | null {
  try {
    return deserialize(globalThis.localStorage?.getItem(SAVE_KEY) ?? null);
  } catch {
    return null;
  }
}

export function writeSave(data: Omit<SaveData, 'saveVersion'>): boolean {
  try {
    globalThis.localStorage?.setItem(SAVE_KEY, serialize(data));
    return true;
  } catch {
    return false;
  }
}

export function clearSave(): void {
  try {
    globalThis.localStorage?.removeItem(SAVE_KEY);
  } catch {
    // brak dostępu do pamięci — nic do usunięcia
  }
}
