// Energia gwiazdy (v0.44): kolektor na orbicie planety gracza zbiera światło gwiazdy układu i oddaje energię
// wszystkim planetom gracza w tym układzie. Energia doliczana do produkcji jak z elektrowni — bez złóż,
// niezależnie od pierwszeństwa budynków. Poziom działa od `readyAt` (jak stacja na pasie). Czysta logika.
import type { AsteroidStation, Balance, Resources } from '../types.ts';
import { stationLevelAt } from './asteroids.ts';

/** Kolektor ma ten sam kształt zapisu co stacja na pasie: poziom docelowy i chwila ukończenia. */
export type StarCollector = AsteroidStation;

export const collectorLevelAt = stationLevelAt;

/** Mnożnik jasności gwiazdy (robocze): czerwony karzeł ~0,7, żółta 1, niebieski olbrzym ~2,1. */
export const starFactor = (luminosity: number) => 0.5 + 0.5 * Math.max(0, luminosity);

/** Energia kolektora na danym poziomie przy danej gwieździe. */
export function collectorOutput(level: number, balance: Balance, factor: number): number {
  if (level <= 0) return 0;
  const c = balance.starCollector;
  return c.output * level * c.growth ** (level - 1) * factor;
}

export function collectorCost(level: number, balance: Balance): Resources {
  const c = balance.starCollector;
  const f = c.costGrowth ** (level - 1);
  return { metal: Math.round(c.cost.metal * f), crystal: Math.round(c.cost.crystal * f) };
}

/** Balans z energią kolektorów układu doliczoną do produkcji energii planety. */
export function withStarEnergy(balance: Balance, energy: number): Balance {
  return energy > 0 ? { ...balance, extraEnergy: (balance.extraEnergy ?? 0) + energy } : balance;
}

export type CollectorResult = { ok: true; collector: StarCollector; cost: Resources; seconds: number } | { ok: false; message: string };

/** Budowa albo rozbudowa kolektora o jeden poziom: warunki → koszt → nowy stan. */
export function upgradeCollector(
  collector: StarCollector | undefined,
  ctx: { unlocked: boolean; stock: Resources; now: number },
  balance: Balance,
): CollectorResult {
  if (!ctx.unlocked) return { ok: false, message: 'Najpierw zbadaj „Energia gwiazdy” (Badania → Produktywność).' };
  if (collector && ctx.now < collector.readyAt) return { ok: false, message: 'Kolektor jest właśnie rozbudowywany.' };
  const level = (collector?.level ?? 0) + 1;
  if (level > balance.starCollector.maxLevel) return { ok: false, message: `Kolektor ma już najwyższy poziom (${balance.starCollector.maxLevel}).` };
  const cost = collectorCost(level, balance);
  const missing: string[] = [];
  if (ctx.stock.metal < cost.metal) missing.push(`${Math.ceil(cost.metal - ctx.stock.metal)} metalu`);
  if (ctx.stock.crystal < cost.crystal) missing.push(`${Math.ceil(cost.crystal - ctx.stock.crystal)} kryształów`);
  if (missing.length > 0) return { ok: false, message: `Kolektor poz. ${level} — brakuje: ${missing.join(', ')}.` };
  const seconds = balance.starCollector.secondsPerLevel * level;
  return { ok: true, collector: { level, readyAt: ctx.now + seconds * 1000 }, cost, seconds };
}
