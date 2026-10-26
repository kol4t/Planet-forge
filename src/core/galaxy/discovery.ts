// Wiedza gracza o galaktyce (v0.34.2) — osobno od danych galaktyki: układ istnieje (generator),
// a gracz wie o nim tyle, ile odkrył. Zapisywane są tylko poziomy wiedzy (indeks układu → poziom).
import { DISCOVERY_RULES } from '../../data/galaxy.ts';
import type { DiscoveryRules } from '../types.ts';
import type { Galaxy } from './galaxy.ts';

/**
 * Poziom wiedzy o układzie:
 * 0 — nieznany obszar (niewidoczny), 1 — sygnał (coś tam jest, bez szczegółów),
 * 2 — wykryty (położenie i nazwa), 3 — rozpoznany (gwiazda i liczba planet),
 * 4 — zbadany (planety, złoża, widok układu, kolonizacja).
 */
export type DiscoveryLevel = 0 | 1 | 2 | 3 | 4;

export const DISCOVERY = { unknown: 0, signal: 1, detected: 2, recognized: 3, explored: 4 } as const;

export const DISCOVERY_LABELS: Record<DiscoveryLevel, string> = {
  0: 'nieznany obszar',
  1: 'sygnał',
  2: 'wykryty',
  3: 'rozpoznany',
  4: 'zbadany',
};

/** Wiedza o układach: indeks układu → poziom (brak = 0). */
export type Discoveries = Readonly<Record<number, DiscoveryLevel>>;

export function discoveryOf(known: Discoveries, index: number): DiscoveryLevel {
  return known[index] ?? 0;
}

/** Podniesienie wiedzy (nigdy nie maleje). Bez zmian — ten sam obiekt. */
export function raiseDiscovery(known: Discoveries, index: number, level: DiscoveryLevel): Discoveries {
  return level > discoveryOf(known, index) ? { ...known, [index]: level } : known;
}

/**
 * Wiedza na start (nowa gra i zapisy sprzed v0.34.2): układy z planetami i statkami gracza — zbadane,
 * najbliżsi sąsiedzi w zasięgu teleskopu — rozpoznani, dalsze w zasięgu sygnałów — sygnały.
 * Zawsze zapewnia też zbadanie układów, w których gracz jest (`ensureKnown`).
 */
export function initialDiscoveries(galaxy: Galaxy, own: readonly number[], rules: DiscoveryRules = DISCOVERY_RULES): Discoveries {
  let known: Discoveries = {};
  const homes = own.map((i) => galaxy.systems[i - 1]).filter((s) => s !== undefined);
  const distance = (index: number) => {
    const s = galaxy.systems[index - 1]!;
    return Math.min(...homes.map((h) => Math.hypot(h.x - s.x, h.y - s.y)));
  };
  const others = galaxy.systems.filter((s) => !own.includes(s.index)).map((s) => ({ index: s.index, d: distance(s.index) }));
  others.sort((a, b) => a.d - b.d || a.index - b.index);
  others.forEach((o, i) => {
    if (i < rules.telescopeNeighbors) known = raiseDiscovery(known, o.index, DISCOVERY.recognized);
    else if (o.d <= rules.signalRange) known = raiseDiscovery(known, o.index, DISCOVERY.signal);
  });
  return ensureKnown(known, own);
}

/** Układy, w których gracz ma planety albo statki, są zawsze zbadane. */
export function ensureKnown(known: Discoveries, own: readonly number[]): Discoveries {
  let next = known;
  for (const index of own) next = raiseDiscovery(next, index, DISCOVERY.explored);
  return next;
}

/** Odczyt z zapisu: tylko poprawne indeksy i poziomy 1–4 (null — brak w zapisie). */
export function parseDiscoveries(raw: unknown, systemCount = 10_000): Discoveries | null {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return null;
  const out: Record<number, DiscoveryLevel> = {};
  for (const [key, value] of Object.entries(raw as Record<string, unknown>)) {
    const index = Number(key);
    if (!Number.isInteger(index) || index < 1 || index > systemCount) continue;
    if (value === 1 || value === 2 || value === 3 || value === 4) out[index] = value;
  }
  return out;
}

/** Ile układów gracz zna (co najmniej wykrytych). */
export function knownCount(known: Discoveries): number {
  return Object.values(known).filter((level) => level >= DISCOVERY.detected).length;
}
