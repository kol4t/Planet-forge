// Znaleziska megakompleksów (v0.43.1): co kilka godzin każdy megakompleks coś znajduje (także offline).
// Wynik deterministyczny z klucza megakompleksu i chwili — wczytanie zapisu niczego nie zmienia. Czysta logika.
import { FIND_DEFS, FIND_RULES, type FindDef } from '../../data/finds.ts';
import { createRng } from '../random/rng.ts';
import type { ResearchEffect } from '../types.ts';

export interface FindsState {
  /** Zebrane znaleziska: id → liczba sztuk. */
  items: Record<string, number>;
  /** Chwila następnego znaleziska każdego megakompleksu (klucz `seed planety:numer megakompleksu`). */
  next: Record<string, number>;
}

export const EMPTY_FINDS: FindsState = { items: {}, next: {} };

/** Odstęp do następnego znaleziska (ms) po chwili `at`. */
export function findInterval(key: string, at: number): number {
  const [lo, hi] = FIND_RULES.intervalHours;
  return Math.round(createRng(`znalezisko-czas|${key}|${at}`).range(lo, hi) * 3600_000);
}

/** Co znalazł megakompleks rodziny `family` w chwili `at` (pomija znaleziska z pełnym limitem; null — nic nowego). */
export function rollFind(key: string, at: number, family: string, items: Record<string, number>): FindDef | null {
  const pool = FIND_DEFS.filter((f) => (f.families.length === 0 || f.families.includes(family)) && (items[f.id] ?? 0) < f.max);
  if (pool.length === 0) return null;
  const rng = createRng(`znalezisko|${key}|${at}`);
  return rng.weighted(pool.map((f) => ({ f, weight: FIND_RULES.weights[f.rarity] }))).f;
}

/** Premia `count` sztuk znaleziska (sumowana). */
export function scaleEffect(effect: ResearchEffect, count: number): ResearchEffect {
  if ('percent' in effect) return { ...effect, percent: effect.percent * count } as ResearchEffect;
  if (effect.kind === 'antimatterPassive') return { ...effect, perHour: effect.perHour * count };
  return effect;
}

/** Premie wszystkich zebranych znalezisk (dla każdej planety imperium). */
export function findEffects(items: Record<string, number>): ResearchEffect[] {
  return FIND_DEFS.flatMap((f) => ((items[f.id] ?? 0) > 0 ? [scaleEffect(f.effect, Math.min(f.max, items[f.id]!))] : []));
}

/** Odczyt z zapisu (nieznane id i błędne liczby pomijane). */
export function parseFinds(raw: any): FindsState {
  const items: Record<string, number> = {};
  const next: Record<string, number> = {};
  for (const f of FIND_DEFS) {
    const n = raw?.items?.[f.id];
    if (Number.isInteger(n) && n > 0) items[f.id] = Math.min(n, f.max);
  }
  if (raw?.next && typeof raw.next === 'object') {
    for (const [k, v] of Object.entries(raw.next)) if (/^.+:\d+$/.test(k) && typeof v === 'number' && Number.isFinite(v)) next[k] = v;
  }
  return { items, next };
}
