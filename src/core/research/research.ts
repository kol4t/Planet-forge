// Badania: czyste funkcje (stan → nowy stan albo błąd po polsku). Bez DOM/phaser/three.
// Badania są wspólne dla imperium; koszt płaci aktywna planeta, antymateria idzie ze wspólnego portfela.
import { BALANCE } from '../../data/balance.ts';
import { findArm, findResearch, RESEARCH_NODES, RESEARCH_RULES } from '../../data/research.ts';
import { fitsInStorage, storageCapacity } from '../economy/economy.ts';
import type { Balance, EconomyState, ResearchNodeDef, ResearchProject, ResearchRules, ResearchState, Resources } from '../types.ts';

export const EMPTY_RESEARCH: ResearchState = { done: [], current: null };

export type ResearchStatus =
  /** Zbadane. */
  | 'done'
  /** Właśnie trwa. */
  | 'running'
  /** Można zacząć (gdy stać i nic innego się nie bada). */
  | 'available'
  /** Najpierw inne badania (bliżej jądra). */
  | 'needs-research'
  /** Za niskie Laboratorium. */
  | 'needs-lab'
  /** Ramię albo gwiazda mistrzowska jeszcze niedostępne. */
  | 'soon';

export interface ResearchCost extends Resources {
  antimatter: number;
}

export type ResearchFailure =
  | 'unknown'
  | 'soon'
  | 'done'
  | 'busy'
  | 'needs-research'
  | 'needs-lab'
  | 'storage-too-small'
  | 'not-enough-resources'
  | 'not-enough-antimatter';

export type StartResearchResult =
  | { ok: true; research: ResearchState; economy: EconomyState; message: string }
  | { ok: false; reason: ResearchFailure; message: string };

/** Najdalszy pierścień dostępny przy danym poziomie Laboratorium (0 = brak Laboratorium). */
export function ringLimit(labLevel: number, rules: ResearchRules = RESEARCH_RULES): number {
  let ring = 0;
  rules.labLevelForRing.forEach((need, i) => {
    if (labLevel >= need) ring = i + 1;
  });
  return ring;
}

/** Poziom Laboratorium potrzebny dla pierścienia. */
export function labLevelFor(ring: number, rules: ResearchRules = RESEARCH_RULES): number {
  return rules.labLevelForRing[ring - 1] ?? Infinity;
}

export function researchCost(node: ResearchNodeDef, doneCount: number, rules: ResearchRules = RESEARCH_RULES): ResearchCost {
  const factor = rules.ringCostGrowth ** (node.ring - 1) * rules.doneCostGrowth ** doneCount;
  return {
    metal: Math.floor(rules.baseCost.metal * factor),
    crystal: Math.floor(rules.baseCost.crystal * factor),
    antimatter: node.ring >= rules.antimatterFromRing ? rules.antimatterBase * (node.ring - rules.antimatterFromRing + 1) : 0,
  };
}

/** Czas badania (s): rośnie z pierścieniem, maleje z poziomem Laboratorium i badaniami. */
export function researchSeconds(
  node: ResearchNodeDef,
  labLevel: number,
  balance: Balance = BALANCE,
  rules: ResearchRules = RESEARCH_RULES,
): number {
  const base = rules.baseSeconds * rules.ringTimeGrowth ** (node.ring - 1);
  const lab = 1 + rules.labSpeedPerLevel * Math.max(0, labLevel - 1);
  return Math.round((base * balance.researchTimeFactor) / lab);
}

export function researchStatus(node: ResearchNodeDef, state: ResearchState, labLevel: number, rules: ResearchRules = RESEARCH_RULES): ResearchStatus {
  if (state.done.includes(node.id)) return 'done';
  if (state.current?.id === node.id) return 'running';
  if (node.master || !findArm(node.arm)?.active) return 'soon';
  if (!node.requires.every((id) => state.done.includes(id))) return 'needs-research';
  if (labLevel < labLevelFor(node.ring, rules)) return 'needs-lab';
  return 'available';
}

/** Postęp trwającego badania 0..1. */
export function researchProgress(state: ResearchState, now: number): number {
  const c = state.current;
  if (!c) return 0;
  const total = c.finishesAt - c.startedAt;
  return total <= 0 ? 1 : Math.min(1, Math.max(0, (now - c.startedAt) / total));
}

/** Rozpoczęcie badania: sprawdza warunki, pobiera koszt z gospodarki aktywnej planety. */
export function startResearch(
  state: ResearchState,
  economy: EconomyState,
  id: string,
  labLevel: number,
  paidBy: string,
  now: number,
  balance: Balance = BALANCE,
  rules: ResearchRules = RESEARCH_RULES,
): StartResearchResult {
  const node = findResearch(id);
  if (!node) return { ok: false, reason: 'unknown', message: 'Nieznane badanie.' };
  const status = researchStatus(node, state, labLevel, rules);
  if (status === 'done') return { ok: false, reason: 'done', message: `${node.name}: już zbadane.` };
  if (status === 'soon') {
    return { ok: false, reason: 'soon', message: node.master ? 'Gwiazdy mistrzowskie — wkrótce.' : 'To ramię galaktyki będzie dostępne wkrótce.' };
  }
  if (state.current) {
    const busy = findResearch(state.current.id);
    return { ok: false, reason: 'busy', message: `Najpierw dokończ badanie: ${busy?.name ?? 'inne badanie'}.` };
  }
  if (status === 'needs-research') {
    const missing = node.requires.filter((r) => !state.done.includes(r)).map((r) => findResearch(r)?.name ?? r);
    return { ok: false, reason: 'needs-research', message: `Najpierw zbadaj: ${missing.join(', ')}.` };
  }
  if (status === 'needs-lab') {
    return {
      ok: false,
      reason: 'needs-lab',
      message: `Potrzebne Laboratorium na poz. ${labLevelFor(node.ring, rules)} (masz ${labLevel}).`,
    };
  }
  const cost = researchCost(node, state.done.length, rules);
  if (!fitsInStorage(economy, cost, balance)) {
    return {
      ok: false,
      reason: 'storage-too-small',
      message: `Za mały magazyn (${storageCapacity(economy, balance)}). Najpierw rozbuduj Magazyn.`,
    };
  }
  if (economy.stock.metal < cost.metal || economy.stock.crystal < cost.crystal) {
    const missing: string[] = [];
    if (economy.stock.metal < cost.metal) missing.push(`${Math.ceil(cost.metal - economy.stock.metal)} metalu`);
    if (economy.stock.crystal < cost.crystal) missing.push(`${Math.ceil(cost.crystal - economy.stock.crystal)} kryształów`);
    return { ok: false, reason: 'not-enough-resources', message: `Brakuje: ${missing.join(', ')}.` };
  }
  if (Math.floor(economy.antimatter) < cost.antimatter) {
    return {
      ok: false,
      reason: 'not-enough-antimatter',
      message: `Brakuje antymaterii: potrzeba ${cost.antimatter}, masz ${Math.floor(economy.antimatter)}.`,
    };
  }
  const project: ResearchProject = {
    id,
    startedAt: now,
    finishesAt: now + researchSeconds(node, labLevel, balance, rules) * 1000,
    cost: { metal: cost.metal, crystal: cost.crystal },
    antimatter: cost.antimatter,
    paidBy,
  };
  return {
    ok: true,
    research: { ...state, current: project },
    economy: {
      ...economy,
      stock: { metal: economy.stock.metal - cost.metal, crystal: economy.stock.crystal - cost.crystal },
      antimatter: economy.antimatter - cost.antimatter,
    },
    message: `Rozpoczęto badanie: ${node.name}.`,
  };
}

/** Ukończenie badania, jeśli jego czas minął. */
export function completeResearch(state: ResearchState, now: number): { research: ResearchState; completed: string | null } {
  const c = state.current;
  if (!c || c.finishesAt > now) return { research: state, completed: null };
  return { research: { done: [...state.done, c.id], current: null }, completed: c.id };
}

/**
 * Balans po uwzględnieniu zbadanych efektów. Procenty jednego rodzaju sumują się,
 * a gospodarka liczy dalej zwykłymi funkcjami z `economy.ts`.
 */
export function applyResearch(base: Balance, done: readonly string[]): Balance {
  const sum = new Map<string, number>();
  const add = (key: string, v: number) => sum.set(key, (sum.get(key) ?? 0) + v);
  for (const id of done) {
    for (const e of findResearch(id)?.effects ?? []) {
      if (e.kind === 'output') add(`output:${e.resource}`, e.percent);
      else if (e.kind === 'offlineHours') add(e.kind, e.hours);
      else if (e.kind === 'antimatterPassive') add(e.kind, e.perHour);
      else if (e.kind === 'freeFinish') add(e.kind, e.levels);
      else if (e.kind === 'planetSlots') add(e.kind, e.add);
      else add(e.kind, e.percent);
    }
  }
  if (sum.size === 0) return base;
  const mult = (key: string) => Math.max(0, 1 + (sum.get(key) ?? 0) / 100);
  const plus = (key: string) => sum.get(key) ?? 0;
  return {
    ...base,
    maxOfflineSeconds: base.maxOfflineSeconds + plus('offlineHours') * 3600,
    buildSecondsPerLevel: base.buildSecondsPerLevel * mult('buildTime'),
    freeFinishMaxLevel: base.freeFinishMaxLevel + plus('freeFinish'),
    storage: { ...base.storage, base: base.storage.base * mult('storage') },
    planetSlots: { ...base.planetSlots, base: Math.min(base.planetSlots.max, base.planetSlots.base + plus('planetSlots')) },
    antimatter: {
      ...base.antimatter,
      passivePerHour: base.antimatter.passivePerHour + plus('antimatterPassive'),
      // Tańsze ukończenie = więcej sekund budowy na jedną antymaterię.
      finishSecondsPerUnit: base.antimatter.finishSecondsPerUnit / Math.max(0.1, mult('finishPrice')),
    },
    environmentPenalty: base.environmentPenalty * mult('environment'),
    researchTimeFactor: base.researchTimeFactor * mult('researchTime'),
    buildings: base.buildings.map((def) => {
      const out = def.produces === 'storage' || def.produces === 'research' ? 1 : mult(`output:${def.produces}`);
      const cost = mult('buildCost');
      return {
        ...def,
        baseOutput: def.baseOutput * out,
        baseEnergyUse: def.baseEnergyUse * mult('energyUse'),
        baseCost: { metal: def.baseCost.metal * cost, crystal: def.baseCost.crystal * cost },
      };
    }),
  };
}

/** Czytelny opis efektów badania („+10% metalu · −10% zużycia energii”). */
export function describeEffects(node: ResearchNodeDef): string {
  const pct = (v: number) => `${v > 0 ? '+' : '−'}${Math.abs(v)}%`;
  const names = { metal: 'metalu', crystal: 'kryształów', energy: 'energii', antimatter: 'antymaterii z Kolektora' } as const;
  const parts = node.effects.map((e) => {
    switch (e.kind) {
      case 'output':
        return `${pct(e.percent)} ${names[e.resource]}`;
      case 'energyUse':
        return `${pct(e.percent)} zużycia energii`;
      case 'buildTime':
        return `${pct(e.percent)} czasu budowy`;
      case 'buildCost':
        return `${pct(e.percent)} kosztu budynków`;
      case 'storage':
        return `${pct(e.percent)} pojemności magazynu`;
      case 'offlineHours':
        return `+${e.hours} h pracy podczas nieobecności`;
      case 'antimatterPassive':
        return `+${String(e.perHour).replace('.', ',')} antymaterii/h`;
      case 'finishPrice':
        return `${pct(e.percent)} ceny „Ukończ teraz”`;
      case 'freeFinish':
        return `darmowe „Ukończ teraz” o ${e.levels} poz. dłużej`;
      case 'researchTime':
        return `${pct(e.percent)} czasu badań`;
      case 'environment':
        return `kary środowiska ${pct(e.percent)}`;
      case 'planetSlots':
        return `+${e.add} miejsce na planetę`;
    }
  });
  return parts.join(' · ');
}

/** Odczyt badań z zapisu: nieznane id są pomijane, błędne trwające badanie — odrzucane. */
export function parseResearch(raw: any): ResearchState {
  if (!raw || typeof raw !== 'object') return EMPTY_RESEARCH;
  const done: string[] = Array.isArray(raw.done)
    ? [...new Set<string>(raw.done.filter((id: unknown): id is string => typeof id === 'string' && findResearch(id) !== undefined))]
    : [];
  const c = raw.current;
  const isNum = (v: unknown): v is number => typeof v === 'number' && Number.isFinite(v);
  let current: ResearchProject | null = null;
  if (
    c &&
    typeof c.id === 'string' &&
    findResearch(c.id) &&
    !done.includes(c.id) &&
    isNum(c.startedAt) &&
    isNum(c.finishesAt) &&
    c.finishesAt >= c.startedAt &&
    isNum(c.cost?.metal) &&
    isNum(c.cost?.crystal) &&
    c.cost.metal >= 0 &&
    c.cost.crystal >= 0 &&
    isNum(c.antimatter) &&
    c.antimatter >= 0 &&
    typeof c.paidBy === 'string'
  ) {
    current = {
      id: c.id,
      startedAt: c.startedAt,
      finishesAt: c.finishesAt,
      cost: { metal: c.cost.metal, crystal: c.cost.crystal },
      antimatter: c.antimatter,
      paidBy: c.paidBy,
    };
  }
  return { done, current };
}

/** Liczba badań możliwych w tym etapie (aktywne ramiona, bez gwiazd mistrzowskich). */
export function researchableCount(): number {
  return RESEARCH_NODES.filter((n) => !n.master && findArm(n.arm)?.active).length;
}
