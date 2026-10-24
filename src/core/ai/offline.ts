// SI podczas nieobecności (po badaniu „Autonomia”): symulacja czasu bez gracza — SI zaczyna budowy
// według reguł „działa samo”, ale każda budowa trwa dłużej (decyzja właściciela: ~50%). Czysta funkcja.
import { advance, upgradeBuilding } from '../economy/economy.ts';
import type { Balance, BuildingId, EconomyState, Planet, ResearchState, BuildingLevels } from '../types.ts';
import { suggest, type AiLevel, type AiRuleId } from './advisor.ts';

/** O ile dłużej trwa budowa zlecona przez SI pod nieobecność gracza. */
export const AWAY_BUILD_SLOWDOWN = 1.5;
/** Co ile SI sprawdza, czy stać ją na budowę, gdy nic się nie buduje (ms). */
const CHECK_EVERY_MS = 5 * 60_000;

export interface AwayAiInput {
  economy: EconomyState;
  planet: Planet;
  balance: Balance;
  research: ResearchState;
  levels: Readonly<Record<AiRuleId, AiLevel>>;
  /** Czy następny poziom zmieści się na polach planety (brak = bez limitu). */
  hasRoom?: (id: BuildingId, levels: BuildingLevels) => boolean;
}

export interface AwayAiResult {
  economy: EconomyState;
  /** Budowy zaczęte przez SI (do dziennika). */
  started: { at: number; building: BuildingId; level: number }[];
}

/**
 * Nalicza czas od `economy.lastUpdate` do `until` (w limicie nieobecności z balansu), pozwalając SI
 * zaczynać budowy. Po końcu limitu czas biegnie dalej bez produkcji (jak przy zwykłej nieobecności).
 */
export function simulateAwayAi(input: AwayAiInput, until: number): AwayAiResult {
  const { planet, balance, research, levels } = input;
  const start = input.economy.lastUpdate;
  const end = Math.min(until, start + balance.maxOfflineSeconds * 1000);
  // Limit nieobecności pilnujemy sami (końcem symulacji), a budowy SI są wolniejsze.
  const free: Balance = { ...balance, maxOfflineSeconds: Number.MAX_SAFE_INTEGER };
  const slow: Balance = { ...balance, buildSecondsPerLevel: balance.buildSecondsPerLevel * AWAY_BUILD_SLOWDOWN };
  const started: AwayAiResult['started'] = [];
  let economy = input.economy;
  for (let guard = 0; economy.lastUpdate < end && guard < 1000; guard++) {
    if (!economy.construction) {
      const pick = suggest({ economy, planet, balance, research, labLevel: economy.levels.laboratory ?? 0, hasRoom: input.hasRoom }).find(
        (s) => s.action.kind === 'build' && levels[s.rule] === 'auto',
      );
      if (pick && pick.action.kind === 'build') {
        const result = upgradeBuilding(economy, pick.action.building, economy.lastUpdate, slow, { hasRoom: input.hasRoom });
        if (result.ok) {
          economy = result.state;
          started.push({ at: economy.lastUpdate, building: pick.action.building, level: economy.construction!.targetLevel });
          continue;
        }
      }
    }
    const next = economy.construction ? Math.min(end, economy.construction.finishesAt) : Math.min(end, economy.lastUpdate + CHECK_EVERY_MS);
    economy = advance(economy, planet, next, free);
  }
  if (until > economy.lastUpdate) {
    // Po limicie nieobecności: budowa może się skończyć, ale produkcji już nie ma.
    economy = advance(economy, planet, until, { ...balance, maxOfflineSeconds: 0 });
  }
  return { economy, started };
}
