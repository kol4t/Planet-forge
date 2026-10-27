// Górnictwo asteroid (v0.37): stacja wydobywcza na pasie asteroid układu planety gracza.
// Urobek trafia do magazynu planety jak przyrost podstawowy — nie zużywa złóż planety ani energii.
import type { AsteroidStation, Balance, Resources } from '../types.ts';

const isNum = (v: unknown): v is number => typeof v === 'number' && Number.isFinite(v);

/** Poziom działający w chwili `at` (rozbudowa trwa — działa poprzedni). */
export function stationLevelAt(station: AsteroidStation | undefined, at: number): number {
  if (!station) return 0;
  return at >= station.readyAt ? station.level : station.level - 1;
}

/** Urobek stacji na minutę na danym poziomie (z efektami badań w `balance`). */
export function stationOutput(level: number, balance: Balance): Resources {
  if (level <= 0) return { metal: 0, crystal: 0 };
  const a = balance.asteroid;
  const f = level * a.growth ** (level - 1);
  return { metal: a.output.metal * f, crystal: a.output.crystal * f };
}

/** Koszt budowy poziomu `level`. */
export function stationCost(level: number, balance: Balance): Resources {
  const a = balance.asteroid;
  const f = a.costGrowth ** (level - 1);
  return { metal: Math.round(a.cost.metal * f), crystal: Math.round(a.cost.crystal * f) };
}

/** Balans z urobkiem stacji doliczonym do przyrostu podstawowego planety. */
export function withStation(balance: Balance, level: number): Balance {
  if (level <= 0) return balance;
  const out = stationOutput(level, balance);
  return { ...balance, passiveIncome: { metal: balance.passiveIncome.metal + out.metal, crystal: balance.passiveIncome.crystal + out.crystal } };
}

export interface StationContext {
  /** Czy układ planety ma pas asteroid. */
  hasBelt: boolean;
  /** Czy badanie „Górnictwo asteroid” jest zbadane (gdziekolwiek w imperium). */
  unlocked: boolean;
  /** Nazwa innej Twojej planety, która ma już stację na tym pasie (albo null). */
  takenBy: string | null;
  stock: Resources;
  now: number;
}

export type StationResult = { ok: true; station: AsteroidStation; cost: Resources; seconds: number } | { ok: false; message: string };

/** Budowa albo rozbudowa stacji o jeden poziom: warunki → koszt → nowy stan (czas budowy jak budynki). */
export function upgradeStation(station: AsteroidStation | undefined, ctx: StationContext, balance: Balance): StationResult {
  if (!ctx.unlocked) return { ok: false, message: 'Najpierw zbadaj „Górnictwo asteroid” (Badania → Stacja i handel).' };
  if (!ctx.hasBelt) return { ok: false, message: 'W tym układzie nie ma pasa asteroid. Pas ma mniej więcej co drugi układ — sprawdź na mapie.' };
  if (ctx.takenBy) return { ok: false, message: `Na tym pasie stoi już stacja planety ${ctx.takenBy} — jeden pas, jedna stacja.` };
  if (station && ctx.now < station.readyAt) return { ok: false, message: 'Stacja jest właśnie rozbudowywana.' };
  const level = (station?.level ?? 0) + 1;
  if (level > balance.asteroid.maxLevel) return { ok: false, message: `Stacja ma już najwyższy poziom (${balance.asteroid.maxLevel}).` };
  const cost = stationCost(level, balance);
  const missing: string[] = [];
  if (ctx.stock.metal < cost.metal) missing.push(`${Math.ceil(cost.metal - ctx.stock.metal)} metalu`);
  if (ctx.stock.crystal < cost.crystal) missing.push(`${Math.ceil(cost.crystal - ctx.stock.crystal)} kryształów`);
  if (missing.length > 0) return { ok: false, message: `Stacja poz. ${level} — brakuje: ${missing.join(', ')}.` };
  const seconds = balance.asteroid.secondsPerLevel * level;
  return { ok: true, station: { level, readyAt: ctx.now + seconds * 1000 }, cost, seconds };
}

/** Odczyt z zapisu (błędna = brak stacji). */
export function parseStation(raw: any): AsteroidStation | undefined {
  if (!raw || !isNum(raw.level) || !Number.isInteger(raw.level) || raw.level < 1 || raw.level > 100) return undefined;
  if (!isNum(raw.readyAt)) return undefined;
  return { level: raw.level, readyAt: raw.readyAt };
}
