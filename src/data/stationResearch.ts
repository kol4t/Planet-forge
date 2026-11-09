// Badania stacji (plan `docs/plan-stacji.md`, etap 2a — decyzje właściciela 2026-11-09): osobne, większe drzewko
// prowadzone w Laboratorium orbitalnym; sześć kategorii połączonych mostami; płaci magazyn stacji; kolejka osobna
// od planet. Efekty działają na całe imperium. Lista badań to SZKIC ROBOCZY — docelową ustala właściciel (krok 2c).
import type { ResearchEffect, Resources } from '../core/types.ts';

export type StationCategoryId = 'production' | 'fleet' | 'ai' | 'planetology' | 'trade' | 'exploration';

export interface StationCategoryDef {
  id: StationCategoryId;
  name: string;
  description: string;
  color: number;
  status: 'robocza';
}

export const STATION_CATEGORIES: readonly StationCategoryDef[] = [
  { id: 'production', name: 'Produkcja', description: 'Wydobycie całego imperium, zasilanie stacji i premia stacji dla jej otoczenia.', color: 0xd8b463, status: 'robocza' },
  { id: 'fleet', name: 'Flota', description: 'Loty, paliwo, ładownie i nowe statki.', color: 0x8fb0d8, status: 'robocza' },
  { id: 'ai', name: 'SI', description: 'SI Matka na stacji: kolejki, logistyka, szybsze badania, rozbudowa rdzenia.', color: 0xb9a8f0, status: 'robocza' },
  { id: 'planetology', name: 'Planetologia', description: 'Planety widziane z orbity: złoża, klimat, megakonstrukty.', color: 0x72c4b6, status: 'robocza' },
  { id: 'trade', name: 'Handel', description: 'Kupcy, kursy wymiany i kontrakty (dok handlowy — etap 3).', color: 0xe0a070, status: 'robocza' },
  { id: 'exploration', name: 'Eksploracja', description: 'Teleskop stacji, kosmos wokół układu, załoga i nasłuch.', color: 0xb3a58b, status: 'robocza' },
];

/** Efekt badania stacji: zwykłe efekty badań (dla wszystkich planet) albo efekty samej stacji. */
export type StationResearchEffect =
  | ResearchEffect
  /** Szybsze badania stacji (procent czasu). */
  | { kind: 'stationResearchTime'; percent: number }
  /** Lot ze stacji macierzystej: procent czasu (etap 2b — start od razu z pełną prędkością). */
  | { kind: 'stationLaunchTime'; percent: number }
  /** Premia stacji dla otoczenia: zasięg (planeta → układ → sąsiednie układy; etap 2b). */
  | { kind: 'stationAura'; reach: 1 | 2 | 3 }
  /** Przygotowanie kolejnego etapu planu stacji (bez efektu w grze, do czasu tego etapu). */
  | { kind: 'prepares'; stage: number; what: string };

export interface StationResearchNode {
  id: string;
  category: StationCategoryId;
  /** Pierścień galaktyki kategorii: 1 = przy jądrze. */
  ring: number;
  /** Przesunięcie w bok w kategorii (0 = środek). */
  lane: number;
  name: string;
  description: string;
  /** Wymagane badania — z innej kategorii to **most**. */
  requires: readonly string[];
  effects: readonly StationResearchEffect[];
  status: 'robocza';
}

const n = (
  id: string,
  category: StationCategoryId,
  ring: number,
  lane: number,
  name: string,
  description: string,
  requires: readonly string[],
  effects: readonly StationResearchEffect[],
): StationResearchNode => ({ id, category, ring, lane, name, description, requires, effects, status: 'robocza' });

/** Szkic drzewka (robocze nazwy, efekty i liczby). */
export const STATION_RESEARCH: readonly StationResearchNode[] = [
  // Produkcja
  n('st-power', 'production', 1, 0, 'Sieć zasilania stacji', 'Uporządkowane zasilanie modułów — podstawa dalszych badań stacji.', [], [{ kind: 'stationResearchTime', percent: -5 }]),
  n('st-aura-planet', 'production', 2, -1, 'Premia stacji: planeta', 'Stacja wspiera planetę, nad którą krąży: więcej wydobycia, szybsza budowa, tańsze paliwo lotów na stację.', ['st-power'], [{ kind: 'stationAura', reach: 1 }]),
  n('st-empire-mining', 'production', 2, 1, 'Wydobycie imperium', 'Koordynacja wydobycia z orbity: wszystkie planety wydobywają więcej.', ['st-power'], [{ kind: 'output', resource: 'metal', percent: 3 }, { kind: 'output', resource: 'crystal', percent: 3 }]),
  n('st-aura-system', 'production', 3, -1, 'Zasięg premii: układ', 'Premia stacji obejmuje cały układ (pozostałe planety — połowa premii).', ['st-aura-planet'], [{ kind: 'stationAura', reach: 2 }]),
  n('st-refinery', 'production', 3, 1, 'Rafinacja orbitalna', 'Rafinacja na orbicie — kolejny wzrost wydobycia imperium.', ['st-empire-mining', 'st-ai-logistics'], [{ kind: 'output', resource: 'metal', percent: 4 }, { kind: 'output', resource: 'crystal', percent: 4 }]),
  n('st-aura-near', 'production', 4, 0, 'Zasięg premii: sąsiednie układy', 'Premia stacji sięga sąsiednich układów (ćwierć premii).', ['st-aura-system', 'st-scope'], [{ kind: 'stationAura', reach: 3 }]),
  // Flota
  n('st-repair-dock', 'fleet', 1, 0, 'Dok remontowy', 'Szybsze naprawy i przeglądy statków przy stacji.', [], [{ kind: 'travelTime', percent: -5 }]),
  n('st-fuel-recovery', 'fleet', 2, -1, 'Start ze stacji', 'Statki startują ze stacji od razu z pełną prędkością — loty ze stacji krótsze.', ['st-repair-dock'], [{ kind: 'stationLaunchTime', percent: -25 }]),
  n('st-drive', 'fleet', 2, 1, 'Napęd stacyjny', 'Silniki serwisowane na stacji — szybsze loty.', ['st-repair-dock'], [{ kind: 'travelTime', percent: -10 }]),
  n('st-holds', 'fleet', 3, 0, 'Ładownie modułowe', 'Transportowce zabierają więcej.', ['st-drive', 'st-merchants'], [{ kind: 'transportCapacity', percent: 20 }]),
  n('st-builder-ship', 'fleet', 4, 0, 'Statek konstrukcyjny', 'Zalążki nowych stacji w kosmosie (etap 4).', ['st-holds'], [{ kind: 'prepares', stage: 4, what: 'statek konstrukcyjny i nowe stacje' }]),
  // SI
  n('st-ai-node', 'ai', 1, 0, 'Węzeł SI Matki', 'SI Matka planuje pracę laboratorium stacji.', [], [{ kind: 'stationResearchTime', percent: -5 }]),
  n('st-ai-logistics', 'ai', 2, -1, 'SI logistyki', 'SI układa dostawy między planetami i stacją.', ['st-ai-node'], [{ kind: 'transportCapacity', percent: 10 }]),
  n('st-ai-research', 'ai', 2, 1, 'SI badawcza', 'Krótsze badania stacji.', ['st-ai-node'], [{ kind: 'stationResearchTime', percent: -10 }]),
  n('st-core-2', 'ai', 3, 0, 'Rdzeń drugiej generacji', 'Rozbudowa rdzenia i drugi pierścień gniazd (kolejne etapy).', ['st-ai-research', 'st-power'], [{ kind: 'prepares', stage: 3, what: 'rozbudowa rdzenia i drugi pierścień gniazd' }]),
  // Planetologia
  n('st-orbital-scan', 'planetology', 1, 0, 'Skan orbitalny', 'Pełniejszy obraz złóż planet imperium.', [], [{ kind: 'deposits', percent: 3 }]),
  n('st-system-maps', 'planetology', 2, 0, 'Mapy złóż układu', 'Złoża planet imperium większe.', ['st-orbital-scan'], [{ kind: 'deposits', percent: 5 }]),
  n('st-climate', 'planetology', 3, -1, 'Stabilizacja klimatu z orbity', 'Środowisko planet łagodniejsze.', ['st-system-maps'], [{ kind: 'environment', percent: 10 }]),
  n('st-mega-dock-prep', 'planetology', 3, 1, 'Cumowanie megakonstruktów', 'Przygotowanie doku megakonstruktów (etap 7).', ['st-system-maps', 'st-power'], [{ kind: 'prepares', stage: 7, what: 'dok megakonstruktów' }]),
  // Handel
  n('st-merchants', 'trade', 1, 0, 'Rejestr kupców', 'Pierwsze kontakty z kupcami sterowanymi przez grę.', [], [{ kind: 'prepares', stage: 3, what: 'kupcy przy stacji' }]),
  n('st-trade-dock', 'trade', 2, 0, 'Dok handlowy', 'Moduł handlowy stacji (etap 3).', ['st-merchants'], [{ kind: 'prepares', stage: 3, what: 'dok handlowy' }]),
  n('st-rates', 'trade', 3, -1, 'Kursy wymiany', 'Lepsze kursy u kupców (etap 3).', ['st-trade-dock'], [{ kind: 'prepares', stage: 3, what: 'lepsze kursy wymiany' }]),
  n('st-contracts', 'trade', 3, 1, 'Kontrakty długie', 'Zamówienia kupców z większą nagrodą (etap 3).', ['st-trade-dock', 'st-empire-mining'], [{ kind: 'prepares', stage: 3, what: 'kontrakty kupców' }]),
  // Eksploracja
  n('st-scope', 'exploration', 1, 0, 'Teleskop stacji', 'Obserwacja układu i sąsiedztwa z orbity.', [], [{ kind: 'expedition', stat: 'range', add: 2 }]),
  n('st-space-mining', 'exploration', 2, -1, 'Wydobycie z kosmosu', 'Stacje przy olbrzymach i pasach (etap 4).', ['st-scope', 'st-drive'], [{ kind: 'prepares', stage: 4, what: 'wydobycie z kosmosu' }]),
  n('st-habitat', 'exploration', 2, 1, 'Moduł mieszkalny', 'Załoga stacji (etap 5).', ['st-scope', 'st-ai-node'], [{ kind: 'prepares', stage: 5, what: 'moduł mieszkalny i załoga' }]),
  n('st-listening', 'exploration', 3, 0, 'Nasłuch', 'Antena sygnałów z głębi kosmosu (etap 6).', ['st-space-mining', 'st-orbital-scan'], [{ kind: 'prepares', stage: 6, what: 'nasłuch i spotkania' }]),
];

/** Zasady badań stacji (robocze): wyższe pierścienie drożej, dłużej i z wyższym Laboratorium orbitalnym. */
export const STATION_RESEARCH_RULES = {
  labLevelForRing: [1, 2, 4, 6] as readonly number[],
  baseCost: { metal: 6000, crystal: 9000 } as Resources,
  ringCostGrowth: 2.5,
  baseSeconds: 1800,
  ringTimeGrowth: 2,
  labSpeedPerLevel: 0.06,
  /** Laboratorium orbitalne: koszt poz. 1, wzrost, czas na poziom (s), maks. poziom. */
  lab: { cost: { metal: 8000, crystal: 12000 } as Resources, costGrowth: 1.7, secondsPerLevel: 900, maxLevel: 10 },
  status: 'robocza' as const,
};

export const findStationResearch = (id: string) => STATION_RESEARCH.find((x) => x.id === id);
export const findStationCategory = (id: StationCategoryId) => STATION_CATEGORIES.find((c) => c.id === id)!;
