// Mapa galaktyki (v0.34.5): spis znanych układów — filtry i wyszukiwanie. Czysta logika (bez Phasera).
import type { DiscoveryLevel } from './discovery.ts';

export type GalaxyFilter = 'all' | 'explored' | 'rare' | 'reachable';

export const GALAXY_FILTERS: readonly { id: GalaxyFilter; label: string }[] = [
  { id: 'all', label: 'Wszystkie' },
  { id: 'explored', label: 'Zbadane' },
  { id: 'rare', label: 'Rzadkie' },
  { id: 'reachable', label: 'W zasięgu' },
];

/** Układ, o którym gracz coś wie (tylko to, co wie — sygnał bez nazwy). */
export interface KnownSystem {
  index: number;
  /** Nazwa (wykryty i dalej) albo „Nieznany sygnał”. */
  name: string;
  level: DiscoveryLevel;
  /** Rzadki obiekt, o którym gracz już wie. */
  rare: boolean;
  /** Odległość od najbliższego układu gracza. */
  distance: number;
  /** Można tam teraz wysłać ekspedycję. */
  reachable: boolean;
  own: boolean;
}

export function matchesGalaxyFilter(s: KnownSystem, filter: GalaxyFilter): boolean {
  switch (filter) {
    case 'all':
      return true;
    case 'explored':
      return s.level >= 4;
    case 'rare':
      return s.rare;
    case 'reachable':
      return s.reachable;
  }
}

/** Tekst bez wielkich liter i polskich znaków („Łąka” → „laka”) — wyszukiwanie odporne na klawiaturę. */
export function fold(text: string): string {
  return text
    .toLowerCase()
    .replace(/ł/g, 'l')
    .normalize('NFD')
    .replace(/\p{M}/gu, '')
    .trim();
}

/**
 * Wyniki wyszukiwania: pasujące do filtra i zapytania (nazwa, „1:42” albo sam numer układu;
 * sygnały — po słowie „sygnał”), najbliższe najpierw; własne układy na początku.
 */
export function searchSystems(list: readonly KnownSystem[], query: string, filter: GalaxyFilter): KnownSystem[] {
  const q = fold(query);
  const number = q.replace(/^1:/, '');
  const hit = (s: KnownSystem) => {
    if (!q) return true;
    if (s.level >= 2 && fold(s.name).includes(q)) return true;
    if (s.level >= 2 && /^\d+$/.test(number) && String(s.index) === number) return true;
    return s.level === 1 && 'nieznany sygnal'.includes(q);
  };
  return list
    .filter((s) => matchesGalaxyFilter(s, filter) && hit(s))
    .sort((a, b) => Number(b.own) - Number(a.own) || a.distance - b.distance || a.index - b.index);
}

/** Liczba pasujących do filtra (etykiety „Zbadane 3”). */
export function galaxyFilterCount(list: readonly KnownSystem[], filter: GalaxyFilter): number {
  return list.filter((s) => matchesGalaxyFilter(s, filter)).length;
}
