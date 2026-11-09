// Stacja macierzysta (v0.55, decyzja właściciela): jedna na imperium, na orbicie planety gracza, z rdzeniem SI Matki
// i modułem magazynu orbitalnego — węzłem transportu (transportowce wożą surowce na stację i ze stacji).
// Czysta logika: budowa i rozbudowa (warunki → koszt → nowy stan), pojemność, odczyt z zapisu.
import type { AsteroidStation, Balance, HomeStation, Resources } from '../types.ts';
import { stationLevelAt } from './asteroids.ts';
import { parseStationResearch } from '../station/stationResearch.ts';
import { stationCoreLevel } from '../station/stationScreen.ts';
import { STATION_CORE } from '../../data/stationModules.ts';
import { parseStationAuto } from '../station/stationAuto.ts';

const isNum = (v: unknown): v is number => typeof v === 'number' && Number.isFinite(v);

/** Czy rdzeń już działa (budowa skończona). */
export const stationReady = (station: HomeStation | null, at: number) => !!station && at >= station.core.readyAt;

/** Pojemność magazynu orbitalnego (metal i kryształy osobno) w chwili `at`; 0 — bez modułu. */
export function stationCapacity(station: HomeStation | null, at: number, balance: Balance): number {
  if (!stationReady(station, at)) return 0;
  // Drugi i trzeci magazyn (krok 2d-1) — pojemności się sumują.
  const h = balance.homeStation;
  let total = 0;
  for (const part of [station!.storage, station!.storage2, station!.storage3]) {
    const level = stationLevelAt(part, at);
    if (level > 0) total += Math.floor(h.storageBase * h.storageGrowth ** (level - 1));
  }
  return total;
}

/** Egzemplarz modułu: pierwszy (pierścień 1), drugi albo trzeci (pierścienie 2 i 3 — wymagają rdzenia poz. 2 / 3). */
export type ModuleCopy = 1 | 2 | 3;
const COPY_NAME = ['', '', ' II', ' III'];
export const copyKey = <T extends 'storage' | 'shipyard' | 'lab'>(base: T, copy: ModuleCopy) => (copy === 1 ? base : `${base}${copy}`) as T | `${T}2` | `${T}3`;

/** Czy pierścień egzemplarza `copy` już jest (rdzeń rozbudowany); null — tak, inaczej komunikat. */
export function copyBlocked(station: HomeStation, copy: ModuleCopy, at: number): string | null {
  if (copy === 1) return null;
  return stationCoreLevel(station, at) >= copy ? null : `To gniazdo jest w ${copy === 2 ? 'drugim' : 'trzecim'} pierścieniu — najpierw rozbuduj rdzeń do poz. ${copy}.`;
}

/**
 * Rozbudowa rdzenia o poziom (krok 2d-1): wymaga badania „Rdzeń drugiej / trzeciej generacji”, płaci magazyn stacji,
 * w trakcie rdzeń działa na dotychczasowym poziomie.
 */
export function upgradeCore(station: HomeStation | null, done: readonly string[], now: number): HomeStationResult {
  if (!station) return { ok: false, message: 'Najpierw zbuduj stację macierzystą.' };
  if (!stationReady(station, now)) return { ok: false, message: 'Rdzeń stacji jest jeszcze w budowie.' };
  const up = station.coreUpgrade;
  if (up && now < up.readyAt) return { ok: false, message: 'Rdzeń jest właśnie rozbudowywany.' };
  const level = stationCoreLevel(station, now) + 1;
  if (level > STATION_CORE.maxLevel) return { ok: false, message: `Rdzeń ma już najwyższy poziom (${STATION_CORE.maxLevel}).` };
  const need = STATION_CORE.research[level]!;
  if (!done.includes(need)) return { ok: false, message: `Najpierw zbadaj „Rdzeń ${level === 2 ? 'drugiej' : 'trzeciej'} generacji” (Badania stacji → SI).` };
  const cost = STATION_CORE.cost[level]!;
  const missing = missingText(cost, station.stock);
  if (missing) return { ok: false, message: `Rdzeń poz. ${level} — w magazynie stacji brakuje: ${missing}. Dowieź surowce transportowcem („Na stację”).` };
  const seconds = STATION_CORE.seconds[level]!;
  return { ok: true, station: { ...station, stock: { metal: station.stock.metal - cost.metal, crystal: station.stock.crystal - cost.crystal }, coreUpgrade: { level, readyAt: now + seconds * 1000 } }, cost, seconds };
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
export function upgradeStationStorage(station: HomeStation | null, ctx: { stock: Resources; now: number }, balance: Balance, copy: ModuleCopy = 1): HomeStationResult {
  if (!station) return { ok: false, message: 'Najpierw zbuduj stację macierzystą.' };
  if (!stationReady(station, ctx.now)) return { ok: false, message: 'Rdzeń stacji jest jeszcze w budowie.' };
  const blocked = copyBlocked(station, copy, ctx.now);
  if (blocked) return { ok: false, message: blocked };
  const key = copyKey('storage', copy);
  const current = station[key];
  if (current && ctx.now < current.readyAt) return { ok: false, message: `Magazyn orbitalny${COPY_NAME[copy]} jest właśnie rozbudowywany.` };
  const level = (current?.level ?? 0) + 1;
  const h = balance.homeStation;
  if (level > h.storageMaxLevel) return { ok: false, message: `Magazyn orbitalny ma już najwyższy poziom (${h.storageMaxLevel}).` };
  const cost = storageModuleCost(level, balance);
  const missing = missingText(cost, ctx.stock);
  if (missing) return { ok: false, message: `Magazyn orbitalny${COPY_NAME[copy]} poz. ${level} — brakuje: ${missing}.` };
  const seconds = h.storageSecondsPerLevel * level;
  return { ok: true, station: { ...station, [key]: { level, readyAt: ctx.now + seconds * 1000 } }, cost, seconds };
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
  const lab = parseLevel(raw.lab);
  const extra = Object.fromEntries(
    (['dock', 'coreUpgrade', 'storage2', 'shipyard2', 'lab2', 'storage3', 'shipyard3', 'lab3'] as const).map((k) => [k, parseLevel(raw[k])] as const).filter(([, v]) => v),
  );
  const research = raw.research ? parseStationResearch(raw.research) : null;
  const amount = (v: unknown) => (isNum(v) && v > 0 ? v : 0);
  return {
    address: raw.address,
    core,
    ...(storage ? { storage } : {}),
    ...(shipyard ? { shipyard } : {}),
    ...(lab ? { lab } : {}),
    ...extra,
    ...(parseStationAuto(raw.auto) ? { auto: parseStationAuto(raw.auto)! } : {}),
    ...(research && (research.done.length > 0 || research.current) ? { research } : {}),
    stock: { metal: amount(raw.stock?.metal), crystal: amount(raw.stock?.crystal) },
  };
}
