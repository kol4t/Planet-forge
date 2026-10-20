import { BALANCE } from '../../data/balance.ts';
import type { Balance, BuildingDef, BuildingId, Construction, EconomyState, Planet, Resources } from '../types.ts';

export interface Rates {
  /** Produkcja na minutę. */
  metal: number;
  crystal: number;
  energyProduced: number;
  energyUsed: number;
  /** Wydajność kopalń 0..1 (spada, gdy brakuje energii). */
  efficiency: number;
}

export type UpgradeFailure = 'unknown-building' | 'max-level' | 'not-enough-resources' | 'storage-too-small' | 'busy';
export type CancelFailure = 'nothing-to-cancel';
export type FinishFailure = 'nothing-to-finish' | 'not-free';

export type ActionResult<F extends string> =
  | { ok: true; state: EconomyState; message: string }
  | { ok: false; state: EconomyState; reason: F; message: string };

export type UpgradeResult = ActionResult<UpgradeFailure>;
export type CancelResult = ActionResult<CancelFailure>;
export type FinishResult = ActionResult<FinishFailure>;

export function createEconomy(now: number, balance: Balance = BALANCE): EconomyState {
  return {
    stock: { ...balance.startingStock },
    levels: { ...balance.startingLevels },
    lastUpdate: now,
    construction: null,
  };
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

/** Pojemność magazynu (dla metalu i kryształów osobno). */
export function storageCapacity(state: EconomyState, balance: Balance = BALANCE): number {
  const level = Math.max(1, state.levels.storage ?? 1);
  return Math.floor(balance.storage.base * balance.storage.growth ** (level - 1));
}

/** Pojemność na danym poziomie magazynu (do podglądu „na poz. N”). */
export function capacityAtLevel(level: number, balance: Balance = BALANCE): number {
  return Math.floor(balance.storage.base * balance.storage.growth ** (Math.max(1, level) - 1));
}

/** Czas budowy (s) poziomu `targetLevel`. */
export function buildSeconds(targetLevel: number, balance: Balance = BALANCE): number {
  return balance.buildSecondsPerLevel * targetLevel;
}

/** Postęp trwającej budowy 0..1 (0, gdy nic się nie buduje). */
export function constructionProgress(state: EconomyState, now: number): number {
  const c = state.construction;
  if (!c) return 0;
  const total = c.finishesAt - c.startedAt;
  return total <= 0 ? 1 : Math.min(1, Math.max(0, (now - c.startedAt) / total));
}

/**
 * Naliczenie produkcji do chwili `now` (łącznie maks. `maxOfflineSeconds`).
 * Budowa ukończona po drodze podnosi poziom dokładnie w chwili ukończenia,
 * więc dalsza produkcja liczy się już z nowym poziomem.
 */
export function advance(state: EconomyState, planet: Planet, now: number, balance: Balance = BALANCE): EconomyState {
  let budget = balance.maxOfflineSeconds;
  const produce = (s: EconomyState, until: number): EconomyState => {
    const seconds = Math.min(Math.max(0, (until - s.lastUpdate) / 1000), budget);
    if (seconds === 0) return until > s.lastUpdate ? { ...s, lastUpdate: until } : s;
    budget -= seconds;
    const rates = productionRates(s, planet, balance);
    const minutes = seconds / 60;
    const cap = storageCapacity(s, balance);
    // Pełny magazyn zatrzymuje przyrost; nadwyżki ponad pojemność (np. zwrot kosztu) nie przepadają.
    const fill = (have: number, perMinute: number) => (have >= cap ? have : Math.min(cap, have + perMinute * minutes));
    return {
      ...s,
      stock: { metal: fill(s.stock.metal, rates.metal), crystal: fill(s.stock.crystal, rates.crystal) },
      lastUpdate: until,
    };
  };

  const c = state.construction;
  if (!c || c.finishesAt > now) return produce(state, now);
  const atFinish = produce(state, Math.max(state.lastUpdate, c.finishesAt));
  const built: EconomyState = {
    ...atFinish,
    levels: { ...atFinish.levels, [c.building]: c.targetLevel },
    construction: null,
  };
  return produce(built, now);
}

const canAfford = (state: EconomyState, cost: Resources) =>
  state.stock.metal >= cost.metal && state.stock.crystal >= cost.crystal;

/** Rozpoczęcie ulepszenia: pobiera koszt i zaczyna budowę (naraz tylko jedna). */
export function upgradeBuilding(
  state: EconomyState,
  id: BuildingId,
  now: number,
  balance: Balance = BALANCE,
): UpgradeResult {
  const def = getBuilding(id, balance);
  if (!def) return { ok: false, state, reason: 'unknown-building', message: 'Nieznany budynek.' };
  if (state.construction) {
    const busy = getBuilding(state.construction.building, balance);
    return {
      ok: false,
      state,
      reason: 'busy',
      message: `Najpierw dokończ budowę: ${busy?.name ?? 'budynek'} (poz. ${state.construction.targetLevel}).`,
    };
  }
  const level = state.levels[id] ?? 0;
  if (level >= balance.maxLevel) {
    return { ok: false, state, reason: 'max-level', message: `${def.name}: osiągnięto maksymalny poziom.` };
  }
  const cost = upgradeCost(id, level, balance);
  if (!fitsInStorage(state, cost, balance)) {
    return {
      ok: false,
      state,
      reason: 'storage-too-small',
      message: `Za mały magazyn (${storageCapacity(state, balance)}). Najpierw rozbuduj Magazyn.`,
    };
  }
  if (!canAfford(state, cost)) {
    const missing: string[] = [];
    if (state.stock.metal < cost.metal) missing.push(`${Math.ceil(cost.metal - state.stock.metal)} metalu`);
    if (state.stock.crystal < cost.crystal) missing.push(`${Math.ceil(cost.crystal - state.stock.crystal)} kryształów`);
    return { ok: false, state, reason: 'not-enough-resources', message: `Brakuje: ${missing.join(', ')}.` };
  }
  const targetLevel = level + 1;
  const construction: Construction = {
    building: id,
    targetLevel,
    startedAt: now,
    finishesAt: now + buildSeconds(targetLevel, balance) * 1000,
    cost,
  };
  return {
    ok: true,
    state: {
      ...state,
      stock: { metal: state.stock.metal - cost.metal, crystal: state.stock.crystal - cost.crystal },
      construction,
    },
    message: `${def.name}: rozpoczęto budowę poziomu ${targetLevel}.`,
  };
}

/** Anulowanie budowy: pełny zwrot kosztu, poziom bez zmian. */
export function cancelConstruction(state: EconomyState, balance: Balance = BALANCE): CancelResult {
  const c = state.construction;
  if (!c) return { ok: false, state, reason: 'nothing-to-cancel', message: 'Nic się teraz nie buduje.' };
  const def = getBuilding(c.building, balance);
  return {
    ok: true,
    state: {
      ...state,
      stock: { metal: state.stock.metal + c.cost.metal, crystal: state.stock.crystal + c.cost.crystal },
      construction: null,
    },
    message: `${def?.name ?? 'Budowa'}: anulowano, zwrócono ${c.cost.metal} metalu i ${c.cost.crystal} kryształów.`,
  };
}

/** Natychmiastowe ukończenie budowy — za darmo do `freeFinishMaxLevel`. Wywołuj po `advance` do „teraz”. */
export function finishConstructionNow(state: EconomyState, balance: Balance = BALANCE): FinishResult {
  const c = state.construction;
  if (!c) return { ok: false, state, reason: 'nothing-to-finish', message: 'Nic się teraz nie buduje.' };
  const def = getBuilding(c.building, balance);
  if (c.targetLevel > balance.freeFinishMaxLevel) {
    return {
      ok: false,
      state,
      reason: 'not-free',
      message: `Natychmiastowe ukończenie za darmo działa do poziomu ${balance.freeFinishMaxLevel}.`,
    };
  }
  return {
    ok: true,
    state: { ...state, levels: { ...state.levels, [c.building]: c.targetLevel }, construction: null },
    message: `${def?.name ?? 'Budynek'} — poziom ${c.targetLevel} gotowy.`,
  };
}

/** Czy koszt w ogóle mieści się w magazynie. */
export function fitsInStorage(state: EconomyState, cost: Resources, balance: Balance = BALANCE): boolean {
  const cap = storageCapacity(state, balance);
  return cost.metal <= Math.max(cap, state.stock.metal) && cost.crystal <= Math.max(cap, state.stock.crystal);
}

/**
 * Sekundy do uzbierania `cost` przy obecnej produkcji
 * (0 = już stać, Infinity = nigdy — brak produkcji albo za mały magazyn).
 */
export function secondsUntilAffordable(state: EconomyState, cost: Resources, rates: Rates, balance: Balance = BALANCE): number {
  if (!fitsInStorage(state, cost, balance)) return Infinity;
  const wait = (have: number, need: number, perMinute: number) =>
    have >= need ? 0 : perMinute <= 0 ? Infinity : ((need - have) / perMinute) * 60;
  return Math.max(wait(state.stock.metal, cost.metal, rates.metal), wait(state.stock.crystal, cost.crystal, rates.crystal));
}
