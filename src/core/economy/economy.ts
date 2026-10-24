import { BALANCE } from '../../data/balance.ts';
import type { Balance, BuildingDef, BuildingId, BuildingLevels, BuildingSettings, Construction, EconomyState, Planet, Resources, YieldId } from '../types.ts';

export interface Rates {
  /** Produkcja na minutę. */
  metal: number;
  crystal: number;
  energyProduced: number;
  energyUsed: number;
  /** Wydajność kopalń 0..1 (spada, gdy brakuje energii) — średnia dla wszystkich odbiorców. */
  efficiency: number;
  /** Wydajność energetyczna każdego odbiorcy 0..1 (zależy od pierwszeństwa przy niedoborze). */
  efficiencyBy: Partial<Record<BuildingId, number>>;
  /** Antymateria na GODZINĘ (przyrost pasywny + kolektor). */
  antimatterPerHour: number;
}

export type UpgradeFailure = 'unknown-building' | 'max-level' | 'not-enough-resources' | 'storage-too-small' | 'busy' | 'no-fields';

/**
 * Ograniczenia planety przy budowie: czy następny poziom budynku zmieści się na polach planety
 * (każde pole mieści 3 poziomy jednego budynku; brak = bez limitu).
 */
export interface BuildLimits {
  hasRoom?: (id: BuildingId, levels: BuildingLevels) => boolean;
}
export type CancelFailure = 'nothing-to-cancel';
export type FinishFailure = 'nothing-to-finish' | 'not-enough-antimatter';

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
    antimatter: balance.antimatter.startingStock,
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

/**
 * Mnożnik środowiska planety dla danego wydobycia. Kary (< 1) słabną z `environmentPenalty`
 * (badania Planetologii); premie (> 1) zostają bez zmian.
 */
export function environmentEffect(planet: Planet, id: YieldId, balance: Balance = BALANCE): number {
  const effect = planet.gameplay.environment.effects[id] ?? 1;
  return effect >= 1 ? effect : 1 - (1 - effect) * Math.max(0, balance.environmentPenalty);
}

export function productionRates(state: EconomyState, planet: Planet, balance: Balance = BALANCE): Rates {
  const env = {
    metal: environmentEffect(planet, 'metal', balance),
    crystal: environmentEffect(planet, 'crystal', balance),
    energy: environmentEffect(planet, 'energy', balance),
  };
  const rich = planet.gameplay.richness;
  const growth = balance.levelGrowth;
  let energyProduced = 0;
  let energyUsed = 0;
  const consumers: { def: BuildingDef; output: number; need: number; priority: number }[] = [];
  for (const def of balance.buildings) {
    const level = state.levels[def.id] ?? 0;
    const { work, priority } = buildingSettings(state, def.id);
    // Produktywność skaluje wydobycie i zużycie energii; teren — tylko wydobycie.
    const output = scaled(def.baseOutput, level, growth) * work * (state.siteFactor?.[def.id] ?? 1);
    const need = scaled(def.baseEnergyUse, level, growth) * work;
    energyUsed += need;
    if (def.produces === 'energy') energyProduced += output * rich.energy * env.energy;
    else consumers.push({ def, output, need, priority });
  }
  // Energia według pierwszeństwa: wyższe najpierw, równe dzielą się proporcjonalnie do potrzeb
  // (wszystkie na 100% = jak dotąd: jedna wspólna wydajność).
  const efficiencyBy: Partial<Record<BuildingId, number>> = {};
  let left = energyProduced;
  const groups = [...new Set(consumers.map((c) => c.priority))].sort((a, b) => b - a);
  for (const p of groups) {
    const group = consumers.filter((c) => c.priority === p);
    const need = group.reduce((sum, c) => sum + c.need, 0);
    const share = need <= 0 ? 1 : Math.min(1, left / need);
    left = Math.max(0, left - need * share);
    for (const c of group) efficiencyBy[c.def.id] = share;
  }
  let metal = 0;
  let crystal = 0;
  let collector = 0;
  for (const c of consumers) {
    const out = c.output * (efficiencyBy[c.def.id] ?? 1);
    if (c.def.produces === 'metal') metal += out * rich.metal * env.metal;
    if (c.def.produces === 'crystal') crystal += out * rich.crystal * env.crystal;
    // Kolektor, jak kopalnie, słabnie przy braku energii; przyrost pasywny — nie.
    if (c.def.produces === 'antimatter') collector += out;
  }
  const efficiency = energyUsed <= 0 ? 1 : Math.min(1, energyProduced / energyUsed);
  return {
    metal: balance.passiveIncome.metal + metal,
    crystal: balance.passiveIncome.crystal + crystal,
    energyProduced,
    energyUsed,
    efficiency,
    efficiencyBy,
    antimatterPerHour: balance.antimatter.passivePerHour + collector,
  };
}

/** Ustawienia budynku (domyślnie praca 100%, pierwszeństwo 100%). */
export function buildingSettings(state: EconomyState, id: BuildingId): BuildingSettings {
  const s = state.settings?.[id];
  return { work: clamp01(s?.work ?? 1), priority: clamp01(s?.priority ?? 1) };
}

const clamp01 = (v: number) => (Number.isFinite(v) ? Math.min(1, Math.max(0, v)) : 1);

/** Zmiana ustawień budynku z panelu „Zarządzanie” (wartości 0..1, zaokrąglane do 5%). */
export function setBuildingSettings(state: EconomyState, id: BuildingId, change: Partial<BuildingSettings>): EconomyState {
  const current = buildingSettings(state, id);
  const round = (v: number) => Math.round(clamp01(v) * 20) / 20;
  const next: BuildingSettings = {
    work: change.work !== undefined ? round(change.work) : current.work,
    priority: change.priority !== undefined ? round(change.priority) : current.priority,
  };
  return { ...state, settings: { ...state.settings, [id]: next } };
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
      antimatter: s.antimatter + (rates.antimatterPerHour * seconds) / 3600,
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
  limits: BuildLimits = {},
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
  // Pola planety: każde mieści grupę 3 poziomów jednego budynku (od v0.26.1).
  if (limits.hasRoom && !limits.hasRoom(id, state.levels)) {
    return {
      ok: false,
      state,
      reason: 'no-fields',
      message: `${def.name}: brak wolnego pola. Każde pole mieści 3 poziomy jednego budynku — wolne pola się skończyły.`,
    };
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

/**
 * Cena natychmiastowego ukończenia w antymaterii: 0 do `freeFinishMaxLevel`,
 * wyżej 1 za każde rozpoczęte `finishSecondsPerUnit` pozostałej budowy.
 */
export function finishCost(state: EconomyState, now: number, balance: Balance = BALANCE): number {
  const c = state.construction;
  if (!c || c.targetLevel <= balance.freeFinishMaxLevel) return 0;
  const remaining = Math.max(0, (c.finishesAt - now) / 1000);
  return Math.max(1, Math.ceil(remaining / balance.antimatter.finishSecondsPerUnit));
}

/** Natychmiastowe ukończenie budowy. Wywołuj po `advance` do `now`. */
export function finishConstructionNow(state: EconomyState, now: number, balance: Balance = BALANCE): FinishResult {
  const c = state.construction;
  if (!c) return { ok: false, state, reason: 'nothing-to-finish', message: 'Nic się teraz nie buduje.' };
  const def = getBuilding(c.building, balance);
  const price = finishCost(state, now, balance);
  const have = Math.floor(state.antimatter);
  if (price > have) {
    return {
      ok: false,
      state,
      reason: 'not-enough-antimatter',
      message: `Brakuje antymaterii: potrzeba ${price}, masz ${have}.`,
    };
  }
  return {
    ok: true,
    state: {
      ...state,
      levels: { ...state.levels, [c.building]: c.targetLevel },
      construction: null,
      antimatter: state.antimatter - price,
    },
    message: `${def?.name ?? 'Budynek'} — poziom ${c.targetLevel} gotowy${price > 0 ? ` (−${antimatterAmount(price)})` : ''}.`,
  };
}

/** „1 antymateria”, „3 antymaterie”, „5 antymaterii”. */
export function antimatterAmount(n: number): string {
  const last = n % 10;
  const lastTwo = n % 100;
  const word =
    n === 1 ? 'antymateria' : last >= 2 && last <= 4 && (lastTwo < 12 || lastTwo > 14) ? 'antymaterie' : 'antymaterii';
  return `${n} ${word}`;
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
