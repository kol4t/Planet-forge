// Przewodnik SI Matki (etap 11 pętli MVP): który krok jest bieżący, czy jest wykonany, postęp. Czyste funkcje na
// migawce stanu gry (bez UI). Nagrody i dziennik — GameController. Kroki i teksty — `data/guide.ts`.
import type { GuideGoal, GuideStep } from '../../data/guide.ts';
import type { BuildingId } from '../types.ts';

/** Migawka stanu gry potrzebna do sprawdzania kroków (składa ją kontroler). */
export interface GuideSnapshot {
  /** Najwyższe poziomy budynków wśród planet gracza. */
  levels: Partial<Record<BuildingId, number>>;
  researched: number;
  unlocked: (feature: string) => boolean;
  seen: readonly string[];
  complexes: readonly string[];
  stationReady: boolean;
  planets: number;
  konstrukt: boolean;
  transport: boolean;
  exploited: number;
  stellar: boolean;
}

/** Zapis przewodnika (opcjonalne pole `guide`): bieżący krok, wyłączony, rzeczy „zobaczone” (np. widok układu). */
export interface GuideState {
  step: number;
  off?: boolean;
  seen?: string[];
  /** Wysłano transport (krok „transport” — zdarzenie, nie stan). */
  transport?: boolean;
}

/** Postęp kroku: wykonany i ułamek do paska (0..1) z krótkim opisem („3 / 5”). */
export function goalProgress(goal: GuideGoal, s: GuideSnapshot): { done: boolean; value: number; label: string } {
  const ratio = (have: number, need: number) => ({ done: have >= need, value: Math.min(1, have / Math.max(1, need)), label: `${Math.min(have, need)} / ${need}` });
  const flag = (ok: boolean) => ({ done: ok, value: ok ? 1 : 0, label: ok ? 'gotowe' : '' });
  switch (goal.kind) {
    case 'level':
      return ratio(s.levels[goal.building] ?? 0, goal.level);
    case 'researched':
      return ratio(s.researched, goal.count);
    case 'unlocked':
      return flag(s.unlocked(goal.feature));
    case 'seen':
      return flag(s.seen.includes(goal.what));
    case 'complex':
      return flag(s.complexes.includes(goal.family));
    case 'station':
      return flag(s.stationReady);
    case 'planets':
      return ratio(s.planets, goal.count);
    case 'konstrukt':
      return flag(s.konstrukt);
    case 'transport':
      return flag(s.transport);
    case 'exploited':
      return ratio(s.exploited, goal.count);
    case 'stellar':
      return flag(s.stellar);
  }
}

/**
 * Pierwszy niewykonany krok od `from` (dla istniejących zapisów — przewinięcie przez to, co gracz już osiągnął).
 * `steps.length` — wszystko zrobione.
 */
export function firstOpenStep(steps: readonly GuideStep[], s: GuideSnapshot, from = 0): number {
  let i = Math.max(0, from);
  while (i < steps.length && goalProgress(steps[i]!.goal, s).done) i++;
  return i;
}

/** Przewodnik z zapisu — błędny = null (kontroler zacznie od pierwszego niewykonanego kroku, bez nagród). */
export function parseGuide(raw: unknown, stepCount: number): GuideState | null {
  if (!raw || typeof raw !== 'object') return null;
  const g = raw as Record<string, unknown>;
  if (!Number.isInteger(g.step) || (g.step as number) < 0 || (g.step as number) > stepCount) return null;
  const seen = Array.isArray(g.seen) ? g.seen.filter((x): x is string => typeof x === 'string').slice(0, 20) : [];
  return {
    step: g.step as number,
    ...(g.off === true ? { off: true } : {}),
    ...(seen.length > 0 ? { seen } : {}),
    ...(g.transport === true ? { transport: true } : {}),
  };
}
