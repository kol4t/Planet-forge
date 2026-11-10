// Załoga stacji (etap 5 planu stacji, krok 5a — decyzje właściciela 2026-11-10):
// - Moduł mieszkalny (po badaniu stacji „Moduł mieszkalny”, poz. 1–10, płaci magazyn stacji) daje miejsca;
//   „Kwatery załogi” — więcej miejsc;
// - załoga rośnie sama na stacji (bez przewożenia) do liczby miejsc;
// - skutek łagodny: bez załogi stacja działa jak dotąd; obsada modułów (załoga / potrzeba) daje premię do +25%:
//   szybsze badania stacji i budowa statków, silniejsza premia stacji. Morale i zapasy — krok 5b.
// Czysta logika, liczby robocze.
import { stationLevelAt } from '../economy/asteroids.ts';
import type { AsteroidStation, HomeStation, Resources } from '../types.ts';

export const CREW = {
  research: 'st-habitat',
  quartersResearch: 'st-crew-quarters',
  habitat: { cost: { metal: 25_000, crystal: 20_000 } as Resources, costGrowth: 1.6, secondsPerLevel: 1800, maxLevel: 10 },
  placesPerLevel: 20,
  quartersFactor: 1.5,
  /** Przyrost załogi na godzinę na poziom modułu mieszkalnego. */
  growthPerLevel: 2,
  /** Potrzebna załoga na poziom każdego innego modułu (rdzeń, magazyny, stocznie, laboratoria, dok). */
  needPerModuleLevel: 5,
  /** Najwyższa premia przy pełnej obsadzie. */
  maxBonus: 0.25,
  status: 'robocza' as const,
};

export function habitatCost(level: number): Resources {
  const f = CREW.habitat.costGrowth ** (level - 1);
  return { metal: Math.round(CREW.habitat.cost.metal * f), crystal: Math.round(CREW.habitat.cost.crystal * f) };
}

export const habitatLevel = (station: HomeStation | null, at: number) => (station ? stationLevelAt(station.habitat, at) : 0);

/** Miejsca dla załogi. */
export function crewPlaces(station: HomeStation | null, at: number, done: readonly string[]): number {
  const level = habitatLevel(station, at);
  return Math.round(level * CREW.placesPerLevel * (done.includes(CREW.quartersResearch) ? CREW.quartersFactor : 1));
}

/** Załoga w chwili `at` (rośnie od ostatniego zapisu do liczby miejsc). */
export function crewAt(station: HomeStation | null, at: number, done: readonly string[]): number {
  if (!station) return 0;
  const places = crewPlaces(station, at, done);
  const c = station.crew ?? { count: 0, at };
  // Dwa odcinki: do końca rozbudowy po staremu (poziom niżej), potem z nowym poziomem.
  const h = station.habitat;
  const cut = h && h.readyAt > c.at && h.readyAt <= at ? h.readyAt : null;
  const rate = (t: number) => CREW.growthPerLevel * habitatLevel(station, t);
  const grown = cut !== null ? c.count + ((cut - c.at) / 3_600_000) * rate(c.at) + ((at - cut) / 3_600_000) * rate(at) : c.count + (Math.max(0, at - c.at) / 3_600_000) * rate(at);
  return Math.min(places, Math.max(0, grown));
}

/** Potrzebna załoga: poziomy modułów pracujących (bez modułu mieszkalnego). */
export function crewNeed(station: HomeStation | null, at: number, coreLevel: number): number {
  if (!station) return 0;
  const parts: (AsteroidStation | undefined)[] = [station.storage, station.shipyard, station.lab, station.dock, station.storage2, station.shipyard2, station.lab2, station.storage3, station.shipyard3, station.lab3];
  const levels = coreLevel + parts.reduce((sum, p) => sum + stationLevelAt(p, at), 0);
  return levels * CREW.needPerModuleLevel;
}

/** Obsada 0–1 i premia (0–maxBonus). */
export function crewBonus(count: number, need: number): { share: number; bonus: number } {
  const share = need > 0 ? Math.min(1, count / need) : 0;
  return { share, bonus: share * CREW.maxBonus };
}

export function parseCrew(raw: unknown): { count: number; at: number } | null {
  if (!raw || typeof raw !== 'object') return null;
  const r = raw as Record<string, unknown>;
  if (typeof r.count !== 'number' || !Number.isFinite(r.count) || r.count < 0 || typeof r.at !== 'number' || !Number.isFinite(r.at)) return null;
  return { count: r.count, at: r.at };
}
