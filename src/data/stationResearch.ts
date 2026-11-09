// Badania stacji (plan `docs/plan-stacji.md`, etap 2a — decyzje właściciela 2026-11-09): osobne, większe drzewko
// prowadzone w Laboratorium orbitalnym; sześć kategorii połączonych mostami; płaci magazyn stacji; kolejka osobna
// od planet. Efekty działają na całe imperium. Lista 90 badań zaakceptowana przez właściciela (krok 2c, robocze liczby).
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
  /** Premia stacji dla otoczenia: zasięg (planeta → układ → sąsiednie → dalekie układy; etap 2b / 2c). */
  | { kind: 'stationAura'; reach: 1 | 2 | 3 | 4 }
  /** Siła premii stacji (mnożnik; krok 2c). */
  | { kind: 'stationAuraStrength'; factor: number }
  /** Liczby gry zmieniane badaniem stacji dla całego imperium (krok 2c). */
  | { kind: 'stationModifier'; stat: StationStat; value: number }
  /** Nowa rzecz (moduł, poziom rdzenia, statek, automatyka SI) — wchodzi z osobną mechaniką (krok 2c-2). */
  | { kind: 'stationUnlock'; what: string }
  /** Przygotowanie kolejnego etapu planu stacji (bez efektu w grze, do czasu tego etapu). */
  | { kind: 'prepares'; stage: number; what: string };

/**
 * Liczby zmieniane badaniem stacji: paliwo lotów (procent), czas budowy statków (procent), miejsca kolejki stoczni,
 * skuteczność eskorty (dodatek do ułamka ryzyka zdejmowanego przez okręt), czas napraw (procent), straty ładunku od
 * piratów (procent), pojemność magazynu stacji (procent), wydobycie resztek złoża (procent).
 */
export type StationStat = 'fuel' | 'shipTime' | 'shipQueue' | 'escortCut' | 'repairTime' | 'pirateLoss' | 'stationStorage' | 'remnantOutput';

export interface StationResearchNode {
  id: string;
  category: StationCategoryId;
  /** Pierścień galaktyki kategorii: 1 = przy jądrze. */
  ring: number;
  /** Przesunięcie w bok w kategorii (0 = środek) — liczone równo dla badań pierścienia. */
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
  name: string,
  description: string,
  requires: readonly string[],
  effects: readonly StationResearchEffect[],
): StationResearchNode => ({ id, category, ring, lane: 0, name, description, requires, effects, status: 'robocza' });

const both = (percent: number): ResearchEffect[] => [
  { kind: 'output', resource: 'metal', percent },
  { kind: 'output', resource: 'crystal', percent },
];
const mod = (stat: StationStat, value: number): StationResearchEffect => ({ kind: 'stationModifier', stat, value });
const unlock = (what: string): StationResearchEffect => ({ kind: 'stationUnlock', what });
const prep = (stage: number, what: string): StationResearchEffect => ({ kind: 'prepares', stage, what });

/** Drzewko badań stacji — lista zaakceptowana przez właściciela 2026-11-09 (`docs/badania-stacji.md`; robocze liczby). */
const NODES: readonly StationResearchNode[] = [
  // ——— Produkcja ———
  n('st-power', 'production', 1, 'Sieć zasilania stacji', 'Uporządkowane zasilanie modułów — podstawa dalszych badań stacji.', [], [{ kind: 'stationResearchTime', percent: -5 }]),
  n('st-aura-planet', 'production', 2, 'Premia stacji: planeta', 'Stacja wspiera planetę, nad którą krąży: więcej wydobycia, szybsza budowa, tańsze paliwo lotów na stację.', ['st-power'], [{ kind: 'stationAura', reach: 1 }]),
  n('st-empire-mining', 'production', 2, 'Wydobycie imperium', 'Koordynacja wydobycia z orbity: wszystkie planety wydobywają więcej.', ['st-power'], both(3)),
  n('st-solar-wings', 'production', 2, 'Skrzydła słoneczne II', 'Większe skrzydła paneli — energia całego imperium rośnie.', ['st-power'], [{ kind: 'output', resource: 'energy', percent: 3 }]),
  n('st-aura-system', 'production', 3, 'Zasięg premii: układ', 'Premia stacji obejmuje cały układ (pozostałe planety — połowa premii).', ['st-aura-planet'], [{ kind: 'stationAura', reach: 2 }]),
  n('st-refinery', 'production', 3, 'Rafinacja orbitalna', 'Rafinacja na orbicie — kolejny wzrost wydobycia imperium.', ['st-empire-mining', 'st-ai-logistics'], both(4)),
  n('st-aura-power', 'production', 3, 'Siła premii I', 'Premia stacji silniejsza.', ['st-aura-planet'], [{ kind: 'stationAuraStrength', factor: 1.25 }]),
  n('st-orbital-foundry', 'production', 3, 'Odlewnia orbitalna', 'Części budynków odlewane na orbicie — budowa tańsza w całym imperium.', ['st-empire-mining'], [{ kind: 'buildCost', percent: -5 }]),
  n('st-aura-near', 'production', 4, 'Zasięg premii: sąsiednie układy', 'Premia stacji sięga sąsiednich układów (ćwierć premii).', ['st-aura-system', 'st-scope'], [{ kind: 'stationAura', reach: 3 }]),
  n('st-deep-refinery', 'production', 4, 'Rafinacja głęboka', 'Głębsza przeróbka urobku — więcej metalu i kryształów.', ['st-refinery'], both(5)),
  n('st-build-crews', 'production', 4, 'Ekipy orbitalne', 'Ekipy montażowe ze stacji — budowa szybsza w całym imperium.', ['st-orbital-foundry', 'st-ai-node'], [{ kind: 'buildTime', percent: -5 }]),
  n('st-aura-power-2', 'production', 5, 'Siła premii II', 'Premia stacji jeszcze silniejsza.', ['st-aura-power', 'st-core-2'], [{ kind: 'stationAuraStrength', factor: 1.5 }]),
  n('st-reactor', 'production', 5, 'Reaktor stacji', 'Reaktor stacji zasila sieć imperium — więcej energii.', ['st-solar-wings', 'st-deep-refinery'], [{ kind: 'output', resource: 'energy', percent: 5 }]),
  n('st-aura-far', 'production', 6, 'Zasięg premii: dalekie układy', 'Premia stacji sięga dalekich układów (do 40 jednostek mapy, 10% premii).', ['st-aura-near', 'st-deep-scope'], [{ kind: 'stationAura', reach: 4 }]),
  n('st-artificial-base', 'production', 6, 'Fundament sztucznej planety', 'Pierwszy krok ku celowi stacji macierzystej — sztucznej planecie.', ['st-reactor', 'st-core-3'], [prep(8, 'sztuczna planeta (cel stacji macierzystej)')]),
  // ——— Flota ———
  n('st-repair-dock', 'fleet', 1, 'Dok remontowy', 'Szybsze naprawy i przeglądy statków przy stacji.', [], [{ kind: 'travelTime', percent: -5 }]),
  n('st-fuel-recovery', 'fleet', 2, 'Start ze stacji', 'Statki startują ze stacji od razu z pełną prędkością — loty ze stacji krótsze.', ['st-repair-dock'], [{ kind: 'stationLaunchTime', percent: -25 }]),
  n('st-drive', 'fleet', 2, 'Napęd stacyjny', 'Silniki serwisowane na stacji — szybsze loty.', ['st-repair-dock'], [{ kind: 'travelTime', percent: -10 }]),
  n('st-courier', 'fleet', 2, 'Kurier', 'Szybki statek z małym ładunkiem.', ['st-repair-dock'], [unlock('nowy statek: Kurier (szybki, mały ładunek)')]),
  n('st-holds', 'fleet', 3, 'Ładownie modułowe', 'Transportowce zabierają więcej.', ['st-drive', 'st-merchants'], [{ kind: 'transportCapacity', percent: 20 }]),
  n('st-fuel-cells', 'fleet', 3, 'Ogniwa paliwowe', 'Oszczędniejsze silniki — wszystkie loty zużywają mniej antymaterii.', ['st-fuel-recovery'], [mod('fuel', -10)]),
  n('st-escort-2', 'fleet', 3, 'Eskorta pancerna', 'Okręty eskorty skuteczniej chronią loty.', ['st-repair-dock', 'st-drive'], [mod('escortCut', 0.1)]),
  n('st-heavy-transport', 'fleet', 4, 'Ciężki transportowiec', 'Dwa razy większy ładunek, wolniejszy lot.', ['st-holds'], [unlock('nowy statek: Ciężki transportowiec (2× ładunek)')]),
  n('st-builder-ship', 'fleet', 4, 'Statek konstrukcyjny', 'Zalążki nowych stacji w kosmosie.', ['st-holds'], [prep(4, 'statek konstrukcyjny i nowe stacje')]),
  n('st-serial-docks', 'fleet', 4, 'Doki seryjne', 'Stocznia buduje statki szybciej.', ['st-escort-2', 'st-orbital-foundry'], [mod('shipTime', -20)]),
  n('st-flight-lanes', 'fleet', 5, 'Korytarze lotów', 'Wytyczone korytarze — loty krótsze.', ['st-fuel-cells', 'st-scope'], [{ kind: 'travelTime', percent: -15 }]),
  n('st-station-engines', 'fleet', 5, 'Silniki stacji', 'Stacja macierzysta może się przenieść.', ['st-builder-ship'], [prep(4, 'przeniesienie stacji macierzystej')]),
  n('st-convoys', 'fleet', 5, 'Konwoje', 'Kilka transportowców w jednym locie, jedno ryzyko.', ['st-heavy-transport', 'st-ai-logistics'], [unlock('konwoje transportowców')]),
  n('st-fleet-hangar', 'fleet', 6, 'Hangar floty', 'Więcej miejsc w kolejce stoczni.', ['st-serial-docks', 'st-core-2'], [mod('shipQueue', 2)]),
  n('st-mega-tug', 'fleet', 6, 'Holownik megakonstruktów', 'Statek do przewożenia megakonstruktów.', ['st-station-engines', 'st-mega-dock-prep'], [prep(7, 'holownik megakonstruktów')]),
  // ——— SI ———
  n('st-ai-node', 'ai', 1, 'Węzeł SI Matki', 'SI Matka planuje pracę laboratorium stacji.', [], [{ kind: 'stationResearchTime', percent: -5 }]),
  n('st-ai-logistics', 'ai', 2, 'SI logistyki', 'SI układa dostawy między planetami i stacją.', ['st-ai-node'], [{ kind: 'transportCapacity', percent: 10 }]),
  n('st-ai-research', 'ai', 2, 'SI badawcza', 'Krótsze badania stacji.', ['st-ai-node'], [{ kind: 'stationResearchTime', percent: -10 }]),
  n('st-ai-queue', 'ai', 2, 'Kolejka stacji', 'Laboratorium orbitalne przyjmuje kolejne badanie do kolejki.', ['st-ai-node'], [unlock('+1 badanie w kolejce stacji')]),
  n('st-core-2', 'ai', 3, 'Rdzeń drugiej generacji', 'Rozbudowa rdzenia: drugi pierścień gniazd, mocniejsza premia stacji.', ['st-ai-research', 'st-power'], [unlock('rdzeń poz. 2: drugi pierścień gniazd, premia stacji ×1,25')]),
  n('st-auto-supply', 'ai', 3, 'Automatyczne dostawy', 'SI sama wysyła nadwyżki planet na stację.', ['st-ai-logistics'], [unlock('automatyczne dostawy na stację')]),
  n('st-ai-night', 'ai', 3, 'SI nocna', 'SI sama wybiera kolejne badania stacji.', ['st-ai-research', 'st-ai-queue'], [unlock('SI wybiera kolejne badania stacji')]),
  n('st-ai-advisor', 'ai', 4, 'Doradca złóż', 'SI wskazuje najlepsze planety do kolonizacji.', ['st-ai-logistics', 'st-orbital-scan'], [unlock('doradca kolonizacji')]),
  n('st-ai-builder', 'ai', 4, 'SI budowniczy', 'Kolejka budowy dłuższa na każdej planecie.', ['st-core-2'], [{ kind: 'buildQueue', add: 1 }]),
  n('st-ai-fleet', 'ai', 4, 'SI floty', 'SI prowadzi naprawy eskorty — dwa razy szybciej.', ['st-auto-supply', 'st-repair-dock'], [mod('repairTime', -50)]),
  n('st-core-3', 'ai', 5, 'Rdzeń trzeciej generacji', 'Trzeci pierścień gniazd, jeszcze mocniejsza premia stacji.', ['st-core-2', 'st-ai-night'], [unlock('rdzeń poz. 3: trzeci pierścień gniazd, premia stacji ×1,5')]),
  n('st-ai-trader', 'ai', 5, 'SI kupiec', 'SI sama zawiera kontrakty z kupcami.', ['st-ai-advisor', 'st-contracts'], [prep(3, 'automatyczne kontrakty')]),
  n('st-ai-autonomy', 'ai', 5, 'Autonomia stacji', 'SI prowadzi stację pod nieobecność: moduły i dostawy.', ['st-ai-night', 'st-ai-builder'], [unlock('autonomia stacji pod nieobecność')]),
  n('st-ai-matrix', 'ai', 6, 'Macierz SI', 'Badania stacji dużo krótsze.', ['st-core-3'], [{ kind: 'stationResearchTime', percent: -20 }]),
  n('st-ai-contact', 'ai', 6, 'SI tłumacz', 'SI przygotowana do spotkań z nieznanym.', ['st-ai-matrix', 'st-listening'], [prep(6, 'spotkania (tłumaczenie sygnałów)')]),
  // ——— Planetologia ———
  n('st-orbital-scan', 'planetology', 1, 'Skan orbitalny', 'Pełniejszy obraz złóż planet imperium.', [], [{ kind: 'deposits', percent: 3 }]),
  n('st-system-maps', 'planetology', 2, 'Mapy złóż układu', 'Złoża planet imperium większe.', ['st-orbital-scan'], [{ kind: 'deposits', percent: 5 }]),
  n('st-weather', 'planetology', 2, 'Prognozy z orbity', 'Środowisko planet łagodniejsze.', ['st-orbital-scan'], [{ kind: 'environment', percent: 5 }]),
  n('st-ice-survey', 'planetology', 2, 'Lód z orbity', 'Złoża lodu z orbity — więcej kryształów.', ['st-orbital-scan'], [{ kind: 'output', resource: 'crystal', percent: 3 }]),
  n('st-climate', 'planetology', 3, 'Stabilizacja klimatu z orbity', 'Środowisko planet łagodniejsze.', ['st-system-maps'], [{ kind: 'environment', percent: 10 }]),
  n('st-mega-dock-prep', 'planetology', 3, 'Cumowanie megakonstruktów', 'Przygotowanie doku megakonstruktów.', ['st-system-maps', 'st-power'], [prep(7, 'dok megakonstruktów')]),
  n('st-deep-scan', 'planetology', 3, 'Skan głęboki', 'Złoża głębsze, niż się wydawało.', ['st-system-maps'], [{ kind: 'deposits', percent: 5 }]),
  n('st-remnants', 'planetology', 4, 'Resztki złóż', 'Resztki złoża (od 80%) wydobywane szybciej.', ['st-deep-scan'], [mod('remnantOutput', 25)]),
  n('st-terra-1', 'planetology', 4, 'Terraformacja z orbity I', 'Środowisko planet łagodniejsze.', ['st-climate'], [{ kind: 'environment', percent: 10 }]),
  n('st-colony-scan', 'planetology', 4, 'Wybór kolonii', 'Lepsze dane z ekspedycji.', ['st-deep-scan', 'st-scope'], [{ kind: 'expedition', stat: 'quality', add: 1 }]),
  n('st-core-samples', 'planetology', 5, 'Próbki jądra', 'Znaleziska megakonstruktów częściej.', ['st-remnants', 'st-mega-dock-prep'], [prep(7, 'częstsze znaleziska megakonstruktów')]),
  n('st-terra-2', 'planetology', 5, 'Terraformacja z orbity II', 'Środowisko planet dużo łagodniejsze.', ['st-terra-1'], [{ kind: 'environment', percent: 15 }]),
  n('st-mega-dock-3', 'planetology', 5, 'Trzecie miejsce w doku', 'Trzecie miejsce cumowania megakonstruktów.', ['st-mega-dock-prep', 'st-core-2'], [prep(7, 'trzecie miejsce w doku megakonstruktów')]),
  n('st-world-heart', 'planetology', 6, 'Serce świata', 'Złoża planet imperium dużo większe.', ['st-core-samples'], [{ kind: 'deposits', percent: 10 }]),
  n('st-planet-forge', 'planetology', 6, 'Kuźnia planet', 'Wiedza potrzebna do sztucznej planety.', ['st-terra-2', 'st-artificial-base'], [prep(8, 'sztuczna planeta')]),
  // ——— Handel ———
  n('st-merchants', 'trade', 1, 'Rejestr kupców', 'Pierwsze kontakty z kupcami sterowanymi przez grę.', [], [prep(3, 'kupcy przy stacji')]),
  n('st-trade-dock', 'trade', 2, 'Dok handlowy', 'Moduł handlowy stacji.', ['st-merchants'], [prep(3, 'dok handlowy')]),
  n('st-market-watch', 'trade', 2, 'Obserwacja rynku', 'Kursy kupców widoczne z wyprzedzeniem.', ['st-merchants'], [prep(3, 'kursy widoczne z wyprzedzeniem')]),
  n('st-containers', 'trade', 2, 'Standard kontenerów', 'Ładunki pakowane ciaśniej — transportowce zabierają więcej.', ['st-merchants'], [{ kind: 'transportCapacity', percent: 10 }]),
  n('st-rates', 'trade', 3, 'Kursy wymiany', 'Lepsze kursy u kupców.', ['st-trade-dock'], [prep(3, 'lepsze kursy wymiany')]),
  n('st-contracts', 'trade', 3, 'Kontrakty długie', 'Zamówienia kupców z większą nagrodą.', ['st-trade-dock', 'st-empire-mining'], [prep(3, 'kontrakty kupców')]),
  n('st-trade-storage', 'trade', 3, 'Magazyn handlowy', 'Większy magazyn stacji.', ['st-trade-dock'], [mod('stationStorage', 25)]),
  n('st-trade-routes', 'trade', 4, 'Szlaki handlowe', 'Szlaki między stacjami.', ['st-rates', 'st-drive'], [prep(9, 'szlaki handlowe między stacjami')]),
  n('st-brokers', 'trade', 4, 'Pośrednicy', 'Kupcy przylatują częściej.', ['st-contracts'], [prep(3, 'częstsze wizyty kupców')]),
  n('st-insurance', 'trade', 4, 'Ubezpieczenie ładunków', 'Mniejsze straty ładunku przy napadach piratów.', ['st-contracts', 'st-escort-2'], [mod('pirateLoss', -50)]),
  n('st-guilds', 'trade', 5, 'Gildie', 'Kontrakty specjalne z gildiami.', ['st-brokers', 'st-trade-routes'], [prep(9, 'kontrakty gildii')]),
  n('st-antimatter-trade', 'trade', 5, 'Handel antymaterią', 'Zakup antymaterii u kupców.', ['st-rates', 'st-trade-storage'], [prep(3, 'zakup antymaterii u kupców')]),
  n('st-trade-storage-2', 'trade', 5, 'Magazyn handlowy II', 'Dużo większy magazyn stacji.', ['st-trade-storage'], [mod('stationStorage', 50)]),
  n('st-trade-hub', 'trade', 6, 'Węzeł handlowy', 'Stacja przyciąga kupców z sąsiednich układów.', ['st-guilds', 'st-aura-near'], [prep(9, 'kupcy z sąsiednich układów')]),
  n('st-credit', 'trade', 6, 'Kredyt kupiecki', 'Moduły budowane na kredyt u kupców.', ['st-antimatter-trade'], [prep(9, 'moduły na kredyt')]),
  // ——— Eksploracja ———
  n('st-scope', 'exploration', 1, 'Teleskop stacji', 'Obserwacja układu i sąsiedztwa z orbity.', [], [{ kind: 'expedition', stat: 'range', add: 2 }]),
  n('st-space-mining', 'exploration', 2, 'Wydobycie z kosmosu', 'Stacje przy olbrzymach i pasach.', ['st-scope', 'st-drive'], [prep(4, 'wydobycie z kosmosu')]),
  n('st-habitat', 'exploration', 2, 'Moduł mieszkalny', 'Załoga stacji.', ['st-scope', 'st-ai-node'], [prep(5, 'moduł mieszkalny i załoga')]),
  n('st-probe-bay', 'exploration', 2, 'Hangar sond', 'Ekspedycje szybsze.', ['st-scope'], [{ kind: 'expedition', stat: 'speed', add: 1 }]),
  n('st-listening', 'exploration', 3, 'Nasłuch', 'Antena sygnałów z głębi kosmosu.', ['st-space-mining', 'st-orbital-scan'], [prep(6, 'nasłuch i spotkania')]),
  n('st-gas-harvest', 'exploration', 3, 'Czerpanie gazu', 'Stacje przy gazowych olbrzymach.', ['st-space-mining'], [prep(4, 'czerpanie gazu')]),
  n('st-crew-quarters', 'exploration', 3, 'Kwatery załogi', 'Więcej miejsc dla załogi.', ['st-habitat'], [prep(5, 'więcej miejsc załogi')]),
  n('st-deep-scope', 'exploration', 3, 'Teleskop głębokiego kosmosu', 'Dalej sięgające sygnały i ekspedycje.', ['st-probe-bay'], [{ kind: 'expedition', stat: 'range', add: 2 }, { kind: 'expedition', stat: 'scan', add: 1 }]),
  n('st-belt-station', 'exploration', 4, 'Stacja górnicza na pasie', 'Stacja wyspecjalizowana na pasie asteroid.', ['st-space-mining'], [prep(4, 'stacja górnicza na pasie')]),
  n('st-crew-morale', 'exploration', 4, 'Morale załogi', 'Zadowolona załoga pracuje wydajniej.', ['st-crew-quarters'], [prep(5, 'morale załogi')]),
  n('st-signal-id', 'exploration', 4, 'Rozpoznawanie sygnałów', 'Sygnały odróżniane od szumu.', ['st-listening'], [prep(6, 'rozpoznawanie sygnałów')]),
  n('st-wrecks', 'exploration', 5, 'Wraki i znaleziska', 'Wraki dryfujące w kosmosie.', ['st-signal-id', 'st-belt-station'], [prep(6, 'wraki i znaleziska')]),
  n('st-life-support', 'exploration', 5, 'Podtrzymanie życia', 'Załoga zużywa mniej zapasów.', ['st-crew-morale', 'st-weather'], [prep(5, 'zapasy załogi −20%')]),
  n('st-first-contact', 'exploration', 6, 'Pierwszy kontakt', 'Spotkanie z nieznanym (robocze — do Projektu lore).', ['st-wrecks', 'st-ai-contact'], [prep(6, 'pierwszy kontakt')]),
  n('st-outpost', 'exploration', 6, 'Placówka między układami', 'Stacja w pustce między układami.', ['st-belt-station', 'st-station-engines'], [prep(4, 'placówka między układami')]),
];

/** Gałęzie (`lane`) rozłożone równo w każdym pierścieniu kategorii. */
export const STATION_RESEARCH: readonly StationResearchNode[] = NODES.map((node) => {
  const same = NODES.filter((x) => x.category === node.category && x.ring === node.ring);
  const i = same.indexOf(node);
  return { ...node, lane: (i - (same.length - 1) / 2) * 1.25 };
});

/** Zasady badań stacji (robocze): wyższe pierścienie drożej, dłużej i z wyższym Laboratorium orbitalnym. */
export const STATION_RESEARCH_RULES = {
  labLevelForRing: [1, 2, 4, 6, 8, 10] as readonly number[],
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
