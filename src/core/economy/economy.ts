import { noRoomMessage } from './footprint.ts';
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
  /** Część `metal`/`crystal` z kopalń (na minutę) — tyle ubywa ze złóż, gdy magazyn ma miejsce. */
  fromDeposits: Resources;
}

export type UpgradeFailure = 'unknown-building' | 'max-level' | 'not-enough-resources' | 'storage-too-small' | 'busy' | 'no-fields';

/**
 * Ograniczenia planety przy budowie: czy następny poziom budynku zmieści się na polach planety
 * (obszar budynku rośnie z etapem — `core/economy/footprint.ts`; brak = bez limitu).
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

const RESOURCES = ['metal', 'crystal'] as const;
/** Resztka złoża mniejsza od tej liczby jednostek = złoże wyczerpane (błędy zaokrągleń). */
const DEPOSIT_EPSILON = 1e-3;

/**
 * Początkowy zasób złóż planety: deterministyczny z danych planety (bogactwo złóż i liczba pól,
 * oba z seeda) — bez nowych losowań, więc seed, wygląd i `GENERATOR_VERSION` bez zmian.
 */
export function depositTotal(planet: Planet, balance: Balance = BALANCE): Resources {
  const g = planet.gameplay;
  const size = g.fields / 100;
  return {
    metal: Math.round(balance.deposits.perHundredFields.metal * g.richness.metal * size),
    crystal: Math.round(balance.deposits.perHundredFields.crystal * g.richness.crystal * size),
  };
}

/** Ile zostało w złożach (0 = wyczerpane). */
export function depositsLeft(state: EconomyState, planet: Planet, balance: Balance = BALANCE): Resources {
  const total = depositTotal(planet, balance);
  const left = (id: (typeof RESOURCES)[number]) => {
    const rest = total[id] - (state.mined?.[id] ?? 0);
    return rest < DEPOSIT_EPSILON ? 0 : rest;
  };
  return { metal: left('metal'), crystal: left('crystal') };
}

/** Część złoża już wydobyta (0..1) dla każdego surowca. */
export function minedShare(state: EconomyState, planet: Planet, balance: Balance = BALANCE): Resources {
  const total = depositTotal(planet, balance);
  const share = (id: (typeof RESOURCES)[number]) => (total[id] > 0 ? Math.min(1, (state.mined?.[id] ?? 0) / total[id]) : 1);
  return { metal: share('metal'), crystal: share('crystal') };
}

/** Które złoża są już „resztkami” (wydobyto ≥ próg, z tolerancją 1 jednostki na zaokrąglenia). */
function remnants(state: EconomyState, planet: Planet, balance: Balance): Record<(typeof RESOURCES)[number], boolean> {
  const total = depositTotal(planet, balance);
  const th = balance.exploitation.threshold;
  const is = (id: (typeof RESOURCES)[number]) => (state.mined?.[id] ?? 0) >= total[id] * th - 1;
  return { metal: is('metal'), crystal: is('crystal') };
}

/** Planeta wyeksploatowana: oba złoża wydobyte co najmniej w progu (domyślnie 80%). */
export function isExploited(state: EconomyState, planet: Planet, balance: Balance = BALANCE): boolean {
  const r = remnants(state, planet, balance);
  return r.metal && r.crystal;
}

export function productionRates(state: EconomyState, planet: Planet, balance: Balance = BALANCE): Rates {
  const env = {
    metal: environmentEffect(planet, 'metal', balance),
    crystal: environmentEffect(planet, 'crystal', balance),
    energy: environmentEffect(planet, 'energy', balance),
  };
  const rich = planet.gameplay.richness;
  const growth = balance.levelGrowth;
  const deposits = depositsLeft(state, planet, balance);
  const remnant = remnants(state, planet, balance);
  let energyProduced = 0;
  let energyUsed = 0;
  const consumers: { def: BuildingDef; output: number; need: number; priority: number }[] = [];
  for (const def of balance.buildings) {
    const level = state.levels[def.id] ?? 0;
    const { work: setWork, priority } = buildingSettings(state, def.id);
    // Kopalnia na wyczerpanym złożu stoi i nie pobiera energii (dostaną ją inne budynki).
    const dry = (def.produces === 'metal' || def.produces === 'crystal') && deposits[def.produces] <= 0;
    const work = dry ? 0 : setWork;
    // Produktywność skaluje wydobycie i zużycie energii; teren — tylko wydobycie.
    // Resztki złoża (≥ 80% wydobyte) — kopalnia wydobywa wolniej, energię bierze jak dotąd.
    const slower = def.produces === 'metal' || def.produces === 'crystal' ? (remnant[def.produces] ? balance.exploitation.remnantOutput : 1) : 1;
    const output = scaled(def.baseOutput, level, growth) * work * (state.siteFactor?.[def.id] ?? 1) * slower;
    const need = scaled(def.baseEnergyUse, level, growth) * work * (state.energyFactor?.[def.id] ?? 1);
    energyUsed += need;
    if (def.produces === 'energy') energyProduced += output * rich.energy * env.energy;
    else consumers.push({ def, output, need, priority });
  }
  // Energia gwiazdy z kolektorów układu (v0.44) — bez bogactwa i środowiska planety.
  energyProduced += balance.extraEnergy ?? 0;
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
    fromDeposits: { metal, crystal },
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
 * więc dalsza produkcja liczy się już z nowym poziomem. `limits` — jak przy ulepszeniu (start z kolejki).
 */
export function advance(state: EconomyState, planet: Planet, now: number, balance: Balance = BALANCE, limits: BuildLimits = {}): EconomyState {
  let budget = balance.maxOfflineSeconds;
  const produce = (start: EconomyState, until: number): EconomyState => {
    let s = start;
    // Wyczerpanie złoża zmienia podział energii, więc od tej chwili liczymy od nowa (najwyżej
    // kilka odcinków: każdy kończy się czasem `until`, wyczerpaniem złoża albo pełnym magazynem).
    for (let round = 0; ; round++) {
      const seconds = Math.min(Math.max(0, (until - s.lastUpdate) / 1000), budget);
      if (seconds === 0) return until > s.lastUpdate ? { ...s, lastUpdate: until } : s;
      const rates = productionRates(s, planet, balance);
      const cap = storageCapacity(s, balance);
      const left = depositsLeft(s, planet, balance);
      let span = seconds;
      if (round < 8) {
        // Odcinek kończy się wyczerpaniem złoża albo przejściem progu resztek (wtedy kopalnia zwalnia).
        const total = depositTotal(planet, balance);
        const keep = 1 - balance.exploitation.threshold;
        for (const id of RESOURCES) {
          const perMinute = rates.fromDeposits[id];
          if (!(perMinute > 0) || s.stock[id] >= cap) continue;
          span = Math.min(span, (left[id] / perMinute) * 60);
          const toThreshold = left[id] - total[id] * keep;
          if (toThreshold > 1) span = Math.min(span, (toThreshold / perMinute) * 60);
        }
      }
      budget -= span;
      const minutes = span / 60;
      const stock = { ...s.stock };
      const mined = { metal: s.mined?.metal ?? 0, crystal: s.mined?.crystal ?? 0 };
      let dug = false;
      for (const id of RESOURCES) {
        const fromDeposit = Math.min(left[id], rates.fromDeposits[id] * minutes);
        const potential = (rates[id] - rates.fromDeposits[id]) * minutes + fromDeposit;
        const have = s.stock[id];
        // Pełny magazyn zatrzymuje przyrost; nadwyżki ponad pojemność (np. zwrot kosztu) nie przepadają.
        if (have >= cap || potential <= 0) continue;
        stock[id] = Math.min(cap, have + potential);
        // Złoże traci tylko to, co faktycznie trafiło do magazynu (część kopalń w przyroście).
        const used = fromDeposit * ((stock[id] - have) / potential);
        if (used > 0) {
          mined[id] += left[id] - used < DEPOSIT_EPSILON ? left[id] : used;
          dug = true;
        }
      }
      const done = span >= seconds;
      s = {
        ...s,
        stock,
        ...(dug || s.mined ? { mined } : {}),
        antimatter: s.antimatter + (rates.antimatterPerHour * span) / 3600,
        lastUpdate: done ? until : s.lastUpdate + span * 1000,
      };
      if (done) return s;
    }
  };

  // Budowy po kolei: ukończenie w swojej chwili, potem start następnej z kolejki — także offline.
  // Gdy brakuje surowców, kolejka czeka do chwili, w której produkcja je uzbiera.
  let s = state;
  for (let step = 0; step < 64; step++) {
    const c = s.construction;
    if (c) {
      if (c.finishesAt > now) break;
      const atFinish = produce(s, Math.max(s.lastUpdate, c.finishesAt));
      s = { ...atFinish, levels: { ...atFinish.levels, [c.building]: c.targetLevel }, construction: null };
      continue;
    }
    if (!s.queue?.length) break;
    // Pola sprawdzane przy starcie: od dopisania do kolejki gracz mógł zająć miejsce inną budową (audyt v0.46).
    const started = startQueued(s, s.lastUpdate, balance, limits);
    if (started.state !== s) {
      s = started.state;
      continue;
    }
    // Czeka na surowce: przewiń produkcję do chwili, gdy będzie stać (z sekundą zapasu na zaokrąglenia).
    const cost = upgradeCost(s.queue[0], s.levels[s.queue[0]] ?? 0, balance);
    const wait = secondsUntilAffordable(s, cost, productionRates(s, planet, balance), balance);
    const at = s.lastUpdate + (Math.ceil(wait) + 1) * 1000;
    if (!Number.isFinite(wait) || at >= now || budget <= 0) break;
    s = produce(s, at);
  }
  return produce(s, now);
}

/**
 * Start pierwszej budowy z kolejki, jeśli nic się nie buduje. Koszt pobierany dopiero teraz.
 * Brak surowców = kolejka czeka (stan bez zmian); pozycja, której nie da się już zbudować
 * (maks. poziom, za mały magazyn, brak pól), wypada z kolejki z komunikatem.
 */
export function startQueued(
  state: EconomyState,
  now: number,
  balance: Balance = BALANCE,
  limits: BuildLimits = {},
): { state: EconomyState; message: string | null } {
  if (state.construction || !state.queue?.length) return { state, message: null };
  const [next, ...rest] = state.queue;
  const { queue: _all, ...without } = state;
  const tried = upgradeBuilding(without, next, now, balance, limits);
  const queue = rest.length ? { queue: rest } : {};
  if (tried.ok) return { state: { ...tried.state, ...queue }, message: `Z kolejki — ${tried.message}` };
  if (tried.reason === 'not-enough-resources') return { state, message: null };
  return { state: { ...without, ...queue }, message: `Usunięto z kolejki — ${tried.message}` };
}

/** Poziomy budynków po ukończeniu trwającej budowy i całej kolejki. */
export function plannedLevels(state: EconomyState): BuildingLevels {
  const levels = { ...state.levels };
  if (state.construction) levels[state.construction.building] = state.construction.targetLevel;
  for (const id of state.queue ?? []) levels[id] = (levels[id] ?? 0) + 1;
  return levels;
}

export type QueueFailure = 'unknown-building' | 'queue-full' | 'max-level' | 'storage-too-small' | 'no-fields';
export type QueueResult = ActionResult<QueueFailure>;

/**
 * Dopisanie budynku do kolejki (gdy coś się już buduje). Nic nie pobiera — koszt przy starcie.
 * Poziom, pola i magazyn sprawdzane względem stanu po wszystkich wcześniejszych budowach.
 */
export function enqueueBuilding(
  state: EconomyState,
  id: BuildingId,
  balance: Balance = BALANCE,
  limits: BuildLimits = {},
): QueueResult {
  const def = getBuilding(id, balance);
  if (!def) return { ok: false, state, reason: 'unknown-building', message: 'Nieznany budynek.' };
  const queue = state.queue ?? [];
  if (queue.length >= balance.buildQueue) {
    return {
      ok: false,
      state,
      reason: 'queue-full',
      message: `Kolejka pełna (${queue.length}/${balance.buildQueue}). Kolejne miejsca dają badania SI.`,
    };
  }
  const levels = plannedLevels(state);
  const level = levels[id] ?? 0;
  if (level >= balance.maxLevel) {
    return { ok: false, state, reason: 'max-level', message: `${def.name}: osiągnięto maksymalny poziom.` };
  }
  if (limits.hasRoom && !limits.hasRoom(id, levels)) {
    return { ok: false, state, reason: 'no-fields', message: noRoomMessage(id, def.name, levels[id] ?? 0) };
  }
  const cost = upgradeCost(id, level, balance);
  const cap = capacityAtLevel(levels.storage ?? 1, balance);
  if (cost.metal > cap || cost.crystal > cap) {
    return {
      ok: false,
      state,
      reason: 'storage-too-small',
      message: `Za mały magazyn (${cap}). Najpierw rozbuduj Magazyn.`,
    };
  }
  return {
    ok: true,
    state: { ...state, queue: [...queue, id] },
    message: `${def.name} (poz. ${level + 1}) w kolejce — koszt pobierzemy przy starcie budowy.`,
  };
}

/** Usunięcie pozycji z kolejki (nic nie było pobrane, więc nic nie wraca). */
export function removeQueued(state: EconomyState, index: number): EconomyState {
  const queue = state.queue ?? [];
  if (index < 0 || index >= queue.length) return state;
  const rest = queue.filter((_, i) => i !== index);
  const { queue: _drop, ...without } = state;
  return rest.length ? { ...without, queue: rest } : without;
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
  // Pola planety: obszar budynku rośnie z etapem (v0.45) — brak wolnych pól obok obszaru blokuje ulepszenie.
  if (limits.hasRoom && !limits.hasRoom(id, state.levels)) {
    return {
      ok: false,
      state,
      reason: 'no-fields',
      message: noRoomMessage(id, def.name, state.levels[id] ?? 0),
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

export type DemolishFailure = 'unknown-building' | 'nothing-to-demolish' | 'busy';
export type DemolishResult = ActionResult<DemolishFailure>;

/**
 * Zburzenie jednego poziomu budynku (v0.35, decyzja właściciela: po wyczerpaniu złóż gracz może
 * zburzyć kopalnie i zwolnić pola, np. pod Laboratorium). Od razu i bez kosztu, bez zwrotu surowców.
 * Nie wtedy, gdy ten budynek się buduje albo czeka w kolejce; Magazyn nie schodzi poniżej poziomu 1.
 * Zapas ponad nową pojemność magazynu nie przepada.
 */
export function demolishBuilding(state: EconomyState, id: BuildingId, balance: Balance = BALANCE): DemolishResult {
  const def = getBuilding(id, balance);
  if (!def) return { ok: false, state, reason: 'unknown-building', message: 'Nieznany budynek.' };
  const level = state.levels[id] ?? 0;
  const floor = id === 'storage' ? 1 : 0;
  if (level <= floor) {
    return { ok: false, state, reason: 'nothing-to-demolish', message: `${def.name}: nie ma czego burzyć.` };
  }
  if (state.construction?.building === id || state.queue?.includes(id)) {
    return { ok: false, state, reason: 'busy', message: `${def.name}: najpierw anuluj budowę albo usuń go z kolejki.` };
  }
  return {
    ok: true,
    state: { ...state, levels: { ...state.levels, [id]: level - 1 } },
    message: `${def.name}: zburzono poziom ${level} — teraz poz. ${level - 1}.`,
  };
}
