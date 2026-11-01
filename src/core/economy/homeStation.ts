// Stacja macierzysta (v0.55, decyzja właściciela): jedna na imperium, na orbicie planety gracza, z rdzeniem SI Matki
// i modułem magazynu orbitalnego — węzłem transportu (transportowce wożą surowce na stację i ze stacji).
// Czysta logika: budowa i rozbudowa (warunki → koszt → nowy stan), pojemność, odczyt z zapisu.
import type { AsteroidStation, Balance, HomeStation, Resources } from '../types.ts';
import { stationLevelAt } from './asteroids.ts';

const isNum = (v: unknown): v is number => typeof v === 'number' && Number.isFinite(v);

/** Czy rdzeń już działa (budowa skończona). */
export const stationReady = (station: HomeStation | null, at: number) => !!station && at >= station.core.readyAt;

/** Pojemność magazynu orbitalnego (metal i kryształy osobno) w chwili `at`; 0 — bez modułu. */
export function stationCapacity(station: HomeStation | null, at: number, balance: Balance): number {
  if (!stationReady(station, at)) return 0;
  const level = stationLevelAt(station!.storage, at);
  if (level <= 0) return 0;
  const h = balance.homeStation;
  return Math.floor(h.storageBase * h.storageGrowth ** (level - 1));
}

export function storageModuleCost(level: number, balance: Balance): Resources {
  const h = balance.homeStation;
  const f = h.storageCostGrowth ** (level - 1);
  return { metal: Math.round(h.storageCost.metal * f), crystal: Math.round(h.storageCost.crystal * f) };
}

export type HomeStationResult = { ok: true; station: HomeStation; cost: Resources; seconds: number } | { ok: false; message: string };

const missingText = (cost: Resources, stock: Resources) => {
  const missing: string[] = [];
  if (stock.metal < cost.metal) missing.push(`${Math.ceil(cost.metal - stock.metal)} metalu`);
  if (stock.crystal < cost.crystal) missing.push(`${Math.ceil(cost.crystal - stock.crystal)} kryształów`);
  return missing.join(', ');
};

/** Budowa rdzenia stacji nad planetą `address` (płaci planeta, nad którą powstaje). */
export function buildHomeStation(
  station: HomeStation | null,
  ctx: { unlocked: boolean; address: string; stock: Resources; now: number },
  balance: Balance,
): HomeStationResult {
  if (!ctx.unlocked) return { ok: false, message: 'Najpierw zbadaj „Moduł orbitalny” (Badania → Stacja i handel).' };
  if (station) return { ok: false, message: 'Stacja macierzysta już istnieje — jedna na imperium.' };
  const cost = balance.homeStation.coreCost;
  const missing = missingText(cost, ctx.stock);
  if (missing) return { ok: false, message: `Stacja macierzysta — brakuje: ${missing}.` };
  const seconds = balance.homeStation.coreSeconds;
  return { ok: true, station: { address: ctx.address, core: { level: 1, readyAt: ctx.now + seconds * 1000 }, stock: { metal: 0, crystal: 0 } }, cost, seconds };
}

/** Rozbudowa magazynu orbitalnego o jeden poziom (płaci aktywna planeta). */
export function upgradeStationStorage(station: HomeStation | null, ctx: { stock: Resources; now: number }, balance: Balance): HomeStationResult {
  if (!station) return { ok: false, message: 'Najpierw zbuduj stację macierzystą.' };
  if (!stationReady(station, ctx.now)) return { ok: false, message: 'Rdzeń stacji jest jeszcze w budowie.' };
  const current = station.storage;
  if (current && ctx.now < current.readyAt) return { ok: false, message: 'Magazyn orbitalny jest właśnie rozbudowywany.' };
  const level = (current?.level ?? 0) + 1;
  const h = balance.homeStation;
  if (level > h.storageMaxLevel) return { ok: false, message: `Magazyn orbitalny ma już najwyższy poziom (${h.storageMaxLevel}).` };
  const cost = storageModuleCost(level, balance);
  const missing = missingText(cost, ctx.stock);
  if (missing) return { ok: false, message: `Magazyn orbitalny poz. ${level} — brakuje: ${missing}.` };
  const seconds = h.storageSecondsPerLevel * level;
  return { ok: true, station: { ...station, storage: { level, readyAt: ctx.now + seconds * 1000 } }, cost, seconds };
}

const ADDRESS = /^\d{1,3}:\d{1,4}:\d{1,2}$/;
const parseLevel = (raw: any): AsteroidStation | undefined =>
  raw && isNum(raw.level) && Number.isInteger(raw.level) && raw.level >= 1 && raw.level <= 100 && isNum(raw.readyAt) ? { level: raw.level, readyAt: raw.readyAt } : undefined;

/** Odczyt z zapisu (błędna = brak stacji; ujemne zapasy = 0). */
export function parseHomeStation(raw: any): HomeStation | null {
  if (!raw || typeof raw.address !== 'string' || !ADDRESS.test(raw.address)) return null;
  const core = parseLevel(raw.core);
  if (!core) return null;
  const storage = parseLevel(raw.storage);
  const shipyard = parseLevel(raw.shipyard);
  const amount = (v: unknown) => (isNum(v) && v > 0 ? v : 0);
  return {
    address: raw.address,
    core,
    ...(storage ? { storage } : {}),
    ...(shipyard ? { shipyard } : {}),
    stock: { metal: amount(raw.stock?.metal), crystal: amount(raw.stock?.crystal) },
  };
}
