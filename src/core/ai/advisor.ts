// SI Matka: obserwuje gospodarkę i proponuje działania. Czyste funkcje — nic tu nie zmienia stanu;
// wykonanie (po zgodzie gracza albo samodzielnie) robi kontroler zwykłymi akcjami gry.
import { BALANCE } from '../../data/balance.ts';
import { RESEARCH_NODES } from '../../data/research.ts';
import { fitsInStorage, getBuilding, productionRates, scaled, storageCapacity, upgradeCost } from '../economy/economy.ts';
import { researchCost, researchStatus } from '../research/research.ts';
import type { Balance, BuildingId, EconomyState, Planet, ResearchState, Resources } from '../types.ts';

export type AiRuleId = 'energy' | 'storage' | 'research' | 'mines';

/** Samodzielność SI dla reguły: tylko podpowiada, pyta o zgodę albo działa sama (i raportuje). */
export type AiLevel = 'propose' | 'ask' | 'auto';

export interface AiRuleDef {
  id: AiRuleId;
  name: string;
  description: string;
}

/** Reguły w kolejności ważności (pierwsza pasująca wygrywa). */
export const AI_RULES: readonly AiRuleDef[] = [
  { id: 'energy', name: 'Energia', description: 'Ulepsza Elektrownię, gdy brakuje energii albo kolejna kopalnia by jej zabrakło.' },
  { id: 'storage', name: 'Magazyn', description: 'Rozbudowuje Magazyn, gdy metal albo kryształy zajmują ≥ 90% pojemności.' },
  { id: 'research', name: 'Badania', description: 'Zaczyna najtańsze dostępne badanie, gdy Laboratorium nic nie bada (bez antymaterii).' },
  { id: 'mines', name: 'Kopalnie', description: 'Ulepsza kopalnię tego surowca, którego masz mniej, gdy nic się nie buduje.' },
];

export const DEFAULT_AI_LEVELS: Readonly<Record<AiRuleId, AiLevel>> = {
  energy: 'ask',
  storage: 'ask',
  research: 'ask',
  mines: 'ask',
};

export type AiAction = { kind: 'build'; building: BuildingId } | { kind: 'research'; id: string };

export interface AiSuggestion {
  rule: AiRuleId;
  action: AiAction;
  /** Co SI proponuje („Ulepszyć Elektrownię do poz. 5?”). */
  text: string;
  /** Dlaczego („Energia wystarcza kopalniom w 89%.”). */
  reason: string;
  /** Rozpoznawanie tej samej propozycji między odświeżeniami. */
  key: string;
}

export interface AdvisorInput {
  economy: EconomyState;
  planet: Planet;
  balance: Balance;
  research: ResearchState;
  labLevel: number;
}

/** Propozycje SI w kolejności ważności (tylko takie, które da się wykonać teraz). */
export function suggest(input: AdvisorInput): AiSuggestion[] {
  const { economy, planet, balance } = input;
  const out: AiSuggestion[] = [];
  const builderFree = economy.construction === null;
  const canBuild = (id: BuildingId) => {
    const level = economy.levels[id] ?? 0;
    if (level >= balance.maxLevel) return null;
    const cost = upgradeCost(id, level, balance);
    return affordable(economy, cost, balance) ? { level, cost } : null;
  };
  const build = (rule: AiRuleId, id: BuildingId, reason: string) => {
    const ok = canBuild(id);
    if (!builderFree || !ok) return;
    const name = accusative(getBuilding(id, balance)?.name ?? id);
    out.push({
      rule,
      action: { kind: 'build', building: id },
      text: `Ulepszyć ${name} do poz. ${ok.level + 1}? (${costText(ok.cost)})`,
      reason,
      key: `${rule}:${id}:${ok.level}`,
    });
  };

  const rates = productionRates(economy, planet, balance);
  const surplus = rates.energyProduced - rates.energyUsed;
  const nextMineUse = Math.min(
    ...(['metalMine', 'crystalMine'] as const).map((id) => {
      const def = getBuilding(id, balance)!;
      const level = economy.levels[id] ?? 0;
      return scaled(def.baseEnergyUse, level + 1, balance.levelGrowth) - scaled(def.baseEnergyUse, level, balance.levelGrowth);
    }),
  );
  if (rates.efficiency < 1) {
    build('energy', 'powerPlant', `Energia wystarcza kopalniom w ${Math.round(rates.efficiency * 100)}% — wydobycie zwalnia.`);
  } else if (surplus < nextMineUse) {
    build('energy', 'powerPlant', 'Zapas energii nie wystarczy na kolejny poziom kopalni.');
  }

  const cap = storageCapacity(economy, balance);
  const fullest = Math.max(economy.stock.metal, economy.stock.crystal) / cap;
  if (fullest >= 0.9) {
    build('storage', 'storage', `Magazyn zapełniony w ${Math.min(100, Math.round(fullest * 100))}% — wkrótce wydobycie stanie.`);
  }

  const research = cheapestResearch(input);
  if (research) {
    out.push({
      rule: 'research',
      action: { kind: 'research', id: research.id },
      text: `Zacząć badanie „${research.name}”? (${costText(research.cost)})`,
      reason: 'Laboratorium nic teraz nie bada.',
      key: `research:${research.id}`,
    });
  }

  if (surplus >= nextMineUse) {
    // Kopalnia surowca, którego jest mniej (względem tempa przyrostu nie komplikujemy — prosta reguła).
    const first: BuildingId = economy.stock.crystal < economy.stock.metal ? 'crystalMine' : 'metalMine';
    const second: BuildingId = first === 'metalMine' ? 'crystalMine' : 'metalMine';
    const pick = canBuild(first) ? first : second;
    build('mines', pick, 'Nic się teraz nie buduje, a energii wystarczy.');
  }
  return out;
}

function cheapestResearch(input: AdvisorInput): { id: string; name: string; cost: Resources } | null {
  const { economy, research, labLevel, balance } = input;
  if (research.current) return null;
  let best: { id: string; name: string; cost: Resources; total: number } | null = null;
  for (const node of RESEARCH_NODES) {
    if (researchStatus(node, research, labLevel) !== 'available') continue;
    const cost = researchCost(node, research.done.length);
    if (cost.antimatter > 0 || !affordable(economy, cost, balance)) continue;
    const total = cost.metal + cost.crystal;
    if (!best || total < best.total) best = { id: node.id, name: node.name, cost, total };
  }
  return best;
}

function affordable(economy: EconomyState, cost: Resources, balance: Balance = BALANCE): boolean {
  return fitsInStorage(economy, cost, balance) && economy.stock.metal >= cost.metal && economy.stock.crystal >= cost.crystal;
}

/** „Elektrownia” → „Elektrownię”, „Kopalnia metalu” → „Kopalnię metalu” (biernik pierwszego słowa). */
export function accusative(name: string): string {
  const [first = '', ...rest] = name.split(' ');
  return [first.endsWith('a') ? `${first.slice(0, -1)}ę` : first, ...rest].join(' ');
}

const costText = (cost: Resources) => `${Math.floor(cost.metal)} metalu, ${Math.floor(cost.crystal)} kryształów`;

/** Poziomy SI z zapisu (brakujące / błędne → domyślne „pyta”). */
export function parseAiLevels(raw: unknown): Record<AiRuleId, AiLevel> {
  const levels = { ...DEFAULT_AI_LEVELS };
  if (raw && typeof raw === 'object') {
    for (const rule of AI_RULES) {
      const v = (raw as Record<string, unknown>)[rule.id];
      if (v === 'propose' || v === 'ask' || v === 'auto') levels[rule.id] = v;
    }
  }
  return levels;
}
