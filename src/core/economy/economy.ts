import { BALANCE } from '../../data/balance.ts';
import type { Balance, BuildingDef, BuildingId, EconomyState, Planet, Resources } from '../types.ts';

export interface Rates {
  /** Produkcja na minutę. */
  metal: number;
  crystal: number;
  energyProduced: number;
  energyUsed: number;
  /** Wydajność kopalń 0..1 (spada, gdy brakuje energii). */
  efficiency: number;
}

export type UpgradeFailure = 'unknown-building' | 'max-level' | 'not-enough-resources';

export type UpgradeResult =
  | { ok: true; state: EconomyState; message: string }
  | { ok: false; state: EconomyState; reason: UpgradeFailure; message: string };

export function createEconomy(now: number, balance: Balance = BALANCE): EconomyState {
  return { stock: { ...balance.startingStock }, levels: { ...balance.startingLevels }, lastUpdate: now };
}

export function getBuilding(id: BuildingId, balance: Balance = BALANCE): BuildingDef | undefined {
  return balance.buildings.find((b) => b.id === id);
}

/** Wartość „na poziomie” (wydobycie lub zużycie energii). */
export const scaled = (base: number, level: number, growth: number) =>
  level <= 0 ? 0 : base * level * growth ** level;

/** Koszt ulepszenia z poziomu `level` na `level + 1`. */
export function upgradeCost(id: BuildingId, level: number, balance: Balance = BALANCE): Resources {
  const def = getBuilding(id, balance);
  if (!def) throw new Error(`Nieznany budynek: ${id}`);
  const factor = def.costGrowth ** level;
  return {
    metal: Math.floor(def.baseCost.metal * factor),
    crystal: Math.floor(def.baseCost.crystal * factor),
  };
}

export function productionRates(state: EconomyState, planet: Planet, balance: Balance = BALANCE): Rates {
  const env = planet.gameplay.environment.effects;
  const rich = planet.gameplay.richness;
  const growth = balance.levelGrowth;
  let energyProduced = 0;
  let energyUsed = 0;
  let metal = 0;
  let crystal = 0;
  for (const def of balance.buildings) {
    const level = state.levels[def.id] ?? 0;
    const output = scaled(def.baseOutput, level, growth);
    energyUsed += scaled(def.baseEnergyUse, level, growth);
    if (def.produces === 'energy') energyProduced += output * rich.energy * (env.energy ?? 1);
    if (def.produces === 'metal') metal += output * rich.metal * (env.metal ?? 1);
    if (def.produces === 'crystal') crystal += output * rich.crystal * (env.crystal ?? 1);
  }
  const efficiency = energyUsed <= 0 ? 1 : Math.min(1, energyProduced / energyUsed);
  return {
    metal: balance.passiveIncome.metal + metal * efficiency,
    crystal: balance.passiveIncome.crystal + crystal * efficiency,
    energyProduced,
    energyUsed,
    efficiency,
  };
}

/** Naliczenie produkcji do chwili `now` (maks. `maxOfflineSeconds`). */
export function advance(state: EconomyState, planet: Planet, now: number, balance: Balance = BALANCE): EconomyState {
  const seconds = Math.min(Math.max(0, (now - state.lastUpdate) / 1000), balance.maxOfflineSeconds);
  if (seconds === 0) return now > state.lastUpdate ? { ...state, lastUpdate: now } : state;
  const rates = productionRates(state, planet, balance);
  const minutes = seconds / 60;
  return {
    ...state,
    stock: {
      metal: state.stock.metal + rates.metal * minutes,
      crystal: state.stock.crystal + rates.crystal * minutes,
    },
    lastUpdate: now,
  };
}

const canAfford = (state: EconomyState, cost: Resources) =>
  state.stock.metal >= cost.metal && state.stock.crystal >= cost.crystal;

export function upgradeBuilding(state: EconomyState, id: BuildingId, balance: Balance = BALANCE): UpgradeResult {
  const def = getBuilding(id, balance);
  if (!def) return { ok: false, state, reason: 'unknown-building', message: 'Nieznany budynek.' };
  const level = state.levels[id] ?? 0;
  if (level >= balance.maxLevel) {
    return { ok: false, state, reason: 'max-level', message: `${def.name}: osiągnięto maksymalny poziom.` };
  }
  const cost = upgradeCost(id, level, balance);
  if (!canAfford(state, cost)) {
    const missing: string[] = [];
    if (state.stock.metal < cost.metal) missing.push(`${Math.ceil(cost.metal - state.stock.metal)} metalu`);
    if (state.stock.crystal < cost.crystal) missing.push(`${Math.ceil(cost.crystal - state.stock.crystal)} kryształów`);
    return { ok: false, state, reason: 'not-enough-resources', message: `Brakuje: ${missing.join(', ')}.` };
  }
  return {
    ok: true,
    state: {
      ...state,
      stock: { metal: state.stock.metal - cost.metal, crystal: state.stock.crystal - cost.crystal },
      levels: { ...state.levels, [id]: level + 1 },
    },
    message: `${def.name} — poziom ${level + 1}.`,
  };
}

/** Sekundy do uzbierania `cost` przy obecnej produkcji (0 = już stać, Infinity = nigdy). */
export function secondsUntilAffordable(state: EconomyState, cost: Resources, rates: Rates): number {
  const wait = (have: number, need: number, perMinute: number) =>
    have >= need ? 0 : perMinute <= 0 ? Infinity : ((need - have) / perMinute) * 60;
  return Math.max(wait(state.stock.metal, cost.metal, rates.metal), wait(state.stock.crystal, cost.crystal, rates.crystal));
}
