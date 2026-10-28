import type { ResearchArmDef, ResearchEffect, ResearchNodeDef, ResearchRules } from '../core/types.ts';

// Badania — galaktyka (v0.10). Nazwy, efekty i liczby są ROBOCZE (do strojenia po testach).
// Ramiona: Produktywność (z antymaterią) i Planetologia działają; pozostałe są widoczne jako „wkrótce”.

export const RESEARCH_RULES: ResearchRules = {
  labLevelForRing: [1, 2, 4, 6, 8, 10],
  baseCost: { metal: 240, crystal: 320 },
  ringCostGrowth: 2.6,
  doneCostGrowth: 1.03,
  antimatterFromRing: 4,
  antimatterBase: 2,
  baseSeconds: 90,
  ringTimeGrowth: 2.2,
  labSpeedPerLevel: 0.08,
};

export const RESEARCH_ARMS: readonly ResearchArmDef[] = [
  {
    id: 'productivity',
    name: 'Produktywność',
    description: 'Wydobycie, energetyka, inżynieria, logistyka i antymateria.',
    angleDeg: -90,
    color: 0xd8b463,
    active: true,
    status: 'robocza',
  },
  {
    id: 'planetology',
    name: 'Planetologia',
    description: 'Złoża, warunki środowiska, terraformacja i nowe planety.',
    angleDeg: -10,
    color: 0x72c4b6,
    active: true,
    status: 'robocza',
  },
  {
    id: 'exploration',
    name: 'Eksploracja',
    description: 'Sondy, księżyce, ekspedycje, a dalej anomalie i dawne cywilizacje.',
    angleDeg: 40,
    color: 0xb3a58b,
    active: true,
    status: 'robocza',
  },
  {
    id: 'station',
    name: 'Stacja i handel',
    description: 'Stacja kosmiczna od modułu orbitalnego do sztucznej planety; rynek i szlaki handlowe.',
    angleDeg: 90,
    color: 0x8fb0d8,
    active: true,
    status: 'robocza',
  },
  {
    id: 'ai',
    name: 'SI',
    description: 'SI Matka proponuje, SI wykonawcze działają — na tyle samodzielnie, na ile pozwolisz.',
    angleDeg: 140,
    color: 0xb9a8f0,
    active: true,
    status: 'robocza',
  },
  {
    id: 'fleet',
    name: 'Flota',
    description: 'Flota cywilna (bez walki): transportowce wożą surowce między Twoimi planetami.',
    angleDeg: 190,
    color: 0xe08a6d,
    active: true,
    status: 'robocza',
  },
];

const output = (resource: 'metal' | 'crystal' | 'energy' | 'antimatter', percent: number): ResearchEffect => ({
  kind: 'output',
  resource,
  percent,
});

/** Pojedyncze badanie z wymaganiami (także z innych ramion — „mosty”). */
function node(
  arm: ResearchNodeDef['arm'],
  ring: number,
  laneIndex: number,
  id: string,
  name: string,
  description: string,
  requires: string[],
  effects: readonly ResearchEffect[],
): ResearchNodeDef {
  return { id, arm, ring, lane: laneIndex, name, description, requires, effects };
}

/** Gałąź szerokiego ramienia: kolejne pierścienie, każdy wymaga poprzedniego. */
function lane(
  arm: ResearchNodeDef['arm'],
  laneIndex: number,
  firstRing: number,
  after: string,
  nodes: readonly [id: string, name: string, description: string, effects: readonly ResearchEffect[]][],
): ResearchNodeDef[] {
  let previous = after;
  return nodes.map(([id, name, description, effects], i) => {
    const node: ResearchNodeDef = { id, arm, ring: firstRing + i, lane: laneIndex, name, description, requires: [previous], effects };
    previous = id;
    return node;
  });
}

/** Węzeł „wkrótce” (ramię jeszcze nieaktywne) — opis bez efektu. */
const soon = (arm: ResearchNodeDef['arm'], ring: number, id: string, name: string, description: string, requires: string[] = []): ResearchNodeDef => ({
  id,
  arm,
  ring,
  lane: 0,
  name,
  description,
  requires,
  effects: [],
});

const master = (arm: ResearchNodeDef['arm'], id: string, name: string, description: string, requires: string[]): ResearchNodeDef => ({
  id,
  arm,
  ring: 6,
  lane: 0,
  name,
  description,
  requires,
  effects: [],
  master: true,
});

const NODES: readonly ResearchNodeDef[] = [
  // ——— Produktywność: pień i pięć gałęzi ———
  {
    id: 'prod-core',
    arm: 'productivity',
    ring: 1,
    lane: 0,
    name: 'Podstawy przemysłu',
    description: 'Wspólne normy dla kopalń wszystkich planet.',
    requires: [],
    effects: [output('metal', 5), output('crystal', 5)],
  },
  ...lane('productivity', -2, 2, 'prod-core', [
    ['mining-1', 'Wiertła diamentowe', 'Wydobycie: twardsze ostrza, szybsze szyby.', [output('metal', 10)]],
    ['mining-2', 'Rezonans kryształów', 'Wydobycie: kryształy pękają wzdłuż drgań.', [output('crystal', 10)]],
    ['mining-3', 'Głębokie szyby', 'Wydobycie: złoża poniżej skorupy — szybciej i więcej do wydobycia.', [output('metal', 15), output('crystal', 15), { kind: 'deposits', percent: 15 }]],
    ['mining-4', 'Automatyczne rafinerie', 'Wydobycie: urobek oczyszczany na miejscu.', [output('metal', 20), output('crystal', 20)]],
  ]),
  // Przemysł (v0.38, robocze): łączenie pełnych pól wierteł kryształu w kompleks wiertniczy.
  node('productivity', 4, -3, 'crystal-complex', 'Wspólne szyby', 'Inżynieria wydobywcza: trzy sąsiednie pola wierteł kryształu łączą się w kompleks ze wspólnym szybem.', ['mining-2'], [
    { kind: 'unlock', feature: 'crystal-complex' },
  ]),
  node('productivity', 3, -3, 'metal-factory', 'Metalurgia przemysłowa', 'Inżynieria wydobywcza: trzy sąsiednie zakłady na wzgórzach i w górach łączą się w wielką fabrykę z trybami pracy.', ['mining-1'], [
    { kind: 'unlock', feature: 'metal-factory' },
  ]),
  node('productivity', 6, -1, 'star-energy', 'Energia gwiazdy', 'Energetyka: kolektor na orbicie zbiera światło gwiazdy i zasila wszystkie Twoje planety w układzie — im jaśniejsza gwiazda, tym więcej energii.', ['energy-4', 'tesla-grid'], [
    { kind: 'unlock', feature: 'star-energy' },
  ]),
  node('productivity', 6, -3, 'megastructures', 'Megastruktury', 'Inżynieria wydobywcza: dwa stykające się kompleksy tej samej rodziny łączą się w megakompleks — większa premia i głębokie wykopy.', ['mining-3'], [
    { kind: 'unlock', feature: 'megastructures' },
  ]),
  node('productivity', 5, -3, 'tesla-grid', 'Przesył bezprzewodowy', 'Energetyka: trzy sąsiednie węzły elektrowni na równinach łączą się w sieć Tesli z wieżą przesyłową.', ['energy-2'], [
    { kind: 'unlock', feature: 'tesla-grid' },
  ]),
  ...lane('productivity', -1, 2, 'prod-core', [
    ['energy-1', 'Sieci nadprzewodzące', 'Energetyka: mniej strat na przesyle.', [{ kind: 'energyUse', percent: -10 }]],
    ['energy-2', 'Ogniwa fuzyjne', 'Energetyka: wydajniejsze elektrownie.', [output('energy', 15)]],
    ['energy-3', 'Inteligentna sieć', 'Energetyka: zużycie dopasowane do potrzeb.', [{ kind: 'energyUse', percent: -15 }]],
    ['energy-4', 'Reaktor gwiazdowy', 'Energetyka: energia jak z małego słońca.', [output('energy', 25)]],
  ]),
  ...lane('productivity', 0, 2, 'prod-core', [
    ['eng-1', 'Prefabrykaty', 'Inżynieria: gotowe moduły budynków.', [{ kind: 'buildTime', percent: -10 }]],
    ['eng-2', 'Lekkie stopy', 'Inżynieria: mniej materiału na tę samą konstrukcję.', [{ kind: 'buildCost', percent: -8 }]],
    ['eng-3', 'Roboty budowlane', 'Inżynieria: budowa trwa także w nocy planety.', [{ kind: 'buildTime', percent: -15 }]],
    ['eng-4', 'Nanomontaż', 'Inżynieria: konstrukcje składają się same.', [{ kind: 'buildTime', percent: -20 }]],
  ]),
  ...lane('productivity', 1, 2, 'prod-core', [
    ['log-1', 'Zagęszczanie ładunków', 'Logistyka: więcej w tym samym magazynie.', [{ kind: 'storage', percent: 20 }]],
    ['log-2', 'Autonomiczne kopalnie', 'Logistyka: kopalnie pracują dłużej bez nadzoru.', [{ kind: 'offlineHours', hours: 4 }]],
    ['log-3', 'Magazyny próżniowe', 'Logistyka: składowanie w próżni.', [{ kind: 'storage', percent: 30 }]],
    ['log-4', 'Ciągłość produkcji', 'Logistyka: imperium pracuje, gdy śpisz.', [{ kind: 'offlineHours', hours: 4 }]],
  ]),
  ...lane('productivity', 2, 2, 'prod-core', [
    ['am-1', 'Pułapki magnetyczne', 'Antymateria: Kolektor łapie więcej cząstek.', [output('antimatter', 25)]],
    ['am-2', 'Kondensacja próżni', 'Antymateria: odrobina z pustej przestrzeni.', [{ kind: 'antimatterPassive', perHour: 0.5 }]],
    ['am-3', 'Stabilne pola', 'Antymateria: tańsze „Ukończ teraz”.', [{ kind: 'finishPrice', percent: -25 }]],
    ['am-4', 'Skok czasowy', 'Antymateria: darmowe „Ukończ teraz” o 2 poziomy dłużej.', [{ kind: 'freeFinish', levels: 2 }]],
  ]),
  master('productivity', 'prod-master', 'Przemysłowe imperium', 'Gwiazda mistrzowska Produktywności.', ['mining-4', 'energy-4', 'eng-4', 'log-4', 'am-4']),

  // ——— Planetologia ———
  // Planetologia w trzech ścieżkach (v0.35, nazwy robocze): Geologia (środek), Środowisko (−1),
  // Osadnictwo (+1); mosty do Produktywności (wydobycie, inżynieria) — badania z dwóch ramion.
  node('planetology', 1, 0, 'planet-1', 'Badania geologiczne', 'Geologia: mapy złóż wszystkich planet.', [], [output('metal', 5), output('crystal', 5)]),
  node('planetology', 3, 0, 'planet-4', 'Geologia głębinowa', 'Geologia: złoża sięgają głębiej — większy zasób złóż planety.', ['planet-1', 'mining-1'], [
    { kind: 'deposits', percent: 20 },
  ]),
  node('planetology', 2, -1, 'planet-2', 'Adaptacja do środowiska', 'Środowisko: kary środowiska planet słabsze o połowę.', ['planet-1'], [{ kind: 'environment', percent: -50 }]),
  node('planetology', 5, -1, 'planet-5', 'Terraformacja', 'Środowisko: planety bez kar środowiska.', ['planet-2', 'planet-4'], [{ kind: 'environment', percent: -50 }]),
  node('planetology', 2, 1, 'ice-build', 'Budowa na lodzie', 'Osadnictwo: wszystkie budynki także na polach lodu — lodowe światy przestają być ciasne.', ['planet-1'], [
    { kind: 'unlock', feature: 'build-ice' },
  ]),
  node('planetology', 3, 1, 'planet-3', 'Osadnictwo', 'Osadnictwo: miejsce na jeszcze jedną planetę.', ['ice-build'], [{ kind: 'planetSlots', add: 1 }]),
  {
    ...node('planetology', 4, 1, 'shore', 'Platformy przybrzeżne', 'Osadnictwo: pola na płytkiej wodzie — oceaniczne światy przestają być ciasne.', ['planet-3', 'eng-2'], [
      { kind: 'unlock', feature: 'build-water' },
    ]),
    soon: true,
  },
  node('planetology', 3, 2, 'planet-spec', 'Przebudowa kolonii', 'Planetę można przestawić na inną specjalizację (zmiana trwa 1 godzinę).', ['planet-1'], [
    { kind: 'unlock', feature: 'specialization-change' },
  ]),
  master('planetology', 'planet-master', 'Architekt światów', 'Gwiazda mistrzowska Planetologii.', ['planet-5', 'planet-3']),

  // ——— ramiona „wkrótce” ———
  {
    id: 'explore-1',
    arm: 'exploration',
    ring: 1,
    lane: 0,
    name: 'Napęd międzygwiezdny',
    description: 'Statek kolonizacyjny doleci do innych układów galaktyki.',
    requires: [],
    effects: [{ kind: 'unlock', feature: 'colony-ship' }],
  },
  { ...soon('exploration', 2, 'explore-2', 'Księżyce', 'Księżyc jako nowe miejsce imperium.', ['explore-1']), soon: true },
  // v0.34.3 — ekspedycje (nazwy robocze): sondy (zasięg, szybkość), astronomia (dokładność, szansa),
  // analiza sygnałów (wykrywanie wokół celu); astrofizyka ekstremalna — rzadkie obiekty (v0.34.4).
  {
    id: 'probe-1',
    arm: 'exploration',
    ring: 2,
    lane: 1,
    name: 'Sondy zwiadowcze',
    description: 'Ekspedycje do sygnałów i znanych z daleka układów.',
    requires: [],
    effects: [{ kind: 'unlock', feature: 'expeditions' }],
  },
  ...lane('exploration', 1, 3, 'probe-1', [
    ['probe-2', 'Sondy dalekiego zasięgu', 'Sondy: dalej od własnych układów.', [{ kind: 'expedition', stat: 'range', add: 20 }]],
    ['probe-3', 'Napęd jonowy sond', 'Sondy: jeszcze dalej i szybciej.', [{ kind: 'expedition', stat: 'range', add: 25 }, { kind: 'expedition', stat: 'speed', add: 25 }]],
  ]),
  ...lane('exploration', 2, 3, 'probe-1', [
    ['astro-1', 'Teleskop orbitalny', 'Astronomia: dokładniejsze raporty — więcej wiedzy z jednej wyprawy.', [{ kind: 'expedition', stat: 'quality', add: 1 }]],
    ['astro-2', 'Spektroskopia gwiazd', 'Astronomia: mniej nieudanych wypraw.', [{ kind: 'expedition', stat: 'success', add: 8 }]],
  ]),
  ...lane('exploration', -1, 4, 'astro-1', [
    ['anom-1', 'Analiza sygnałów', 'Anomalie: wyprawa wychwytuje sygnały dalej wokół celu.', [{ kind: 'expedition', stat: 'scan', add: 10 }]],
  ]),
  {
    id: 'astro-x',
    arm: 'exploration',
    ring: 5,
    lane: -1,
    name: 'Astrofizyka ekstremalna',
    description: 'Pulsary i czarne dziury: rozpoznawanie i badanie — dane z nich dają premie całemu imperium.',
    requires: ['probe-3', 'anom-1'],
    effects: [{ kind: 'unlock', feature: 'extreme-astrophysics' }],
  },
  master('exploration', 'explore-master', 'Pionier', 'Gwiazda mistrzowska Eksploracji.', ['probe-3', 'astro-2']),
  // Stacja i handel (v0.37, nazwy robocze): najpierw wydobycie z pasa asteroid — drugie źródło surowców
  // po wyczerpaniu złóż planety (decyzja właściciela); moduł orbitalny, komety i handel — później.
  node('station', 1, 0, 'station-1', 'Górnictwo asteroid', 'Stacja wydobywcza na pasie asteroid w układzie z Twoją planetą.', [], [
    { kind: 'unlock', feature: 'asteroid-mining' },
  ]),
  node('station', 3, 0, 'station-refine', 'Rafinacja w próżni', 'Stacja na pasie wydobywa o połowę więcej.', ['station-1', 'mining-1'], [
    { kind: 'asteroidOutput', percent: 50 },
  ]),
  node('station', 2, 1, 'station-orbit', 'Moduł orbitalny', 'Stacja macierzysta z rdzeniem SI Matki na orbicie Twojej planety — magazyn orbitalny i węzeł transportu (Imperium).', ['station-1'], [
    { kind: 'unlock', feature: 'home-station' },
  ]),
  node('station', 2, 0, 'station-comet', 'Przechwyt komet', 'Holownik przyciąga kometę — surowce w każdym układzie, także bez pasa.', ['station-1', 'explore-1'], [
    { kind: 'unlock', feature: 'comet-capture' },
  ]),
  { ...node('station', 3, 1, 'station-2', 'Dok handlowy', 'Stacja przyjmuje statki kupców.', ['station-orbit'], []), soon: true },
  { ...node('station', 4, 1, 'station-3', 'Rynek galaktyczny', 'Handel z kupcami i szlaki handlowe.', ['station-2'], []), soon: true },
  master('station', 'station-master', 'Planeta-stacja', 'Gwiazda mistrzowska Stacji i handlu.', ['station-3', 'station-comet']),
  {
    id: 'ai-1',
    arm: 'ai',
    ring: 1,
    lane: 0,
    name: 'SI Matka',
    description: 'Obserwuje imperium i proponuje działania — pyta o zgodę.',
    requires: [],
    effects: [{ kind: 'unlock', feature: 'ai-mother' }],
  },
  {
    id: 'ai-2',
    arm: 'ai',
    ring: 2,
    lane: 0,
    name: 'SI wykonawcze',
    description: 'SI może działać sama i zdawać raport w dzienniku.',
    requires: ['ai-1'],
    effects: [{ kind: 'unlock', feature: 'ai-executors' }],
  },
  {
    id: 'ai-3',
    arm: 'ai',
    ring: 3,
    lane: 0,
    name: 'Autonomia',
    description: 'SI buduje także przy zamkniętej grze — wolniej o 50%.',
    requires: ['ai-2'],
    effects: [{ kind: 'unlock', feature: 'ai-offline' }],
  },
  {
    id: 'ai-queue-1',
    arm: 'ai',
    ring: 2,
    lane: 1,
    name: 'Plan budowy',
    description: 'SI układa budowy w kolejce — jeszcze jedno miejsce w kolejce budowy.',
    requires: ['ai-1'],
    effects: [{ kind: 'buildQueue', add: 1 }],
  },
  {
    id: 'ai-queue-2',
    arm: 'ai',
    ring: 3,
    lane: 1,
    name: 'Harmonogram',
    description: 'SI planuje dalej naprzód — kolejne miejsce w kolejce budowy.',
    requires: ['ai-queue-1'],
    effects: [{ kind: 'buildQueue', add: 1 }],
  },
  master('ai', 'ai-master', 'Świadoma Matka', 'Gwiazda mistrzowska SI.', ['ai-3']),
  // Flota cywilna (v0.36, nazwy robocze; bez walki — K-005): transport surowców między planetami.
  node('fleet', 1, 0, 'fleet-1', 'Transportowce', 'Statki towarowe przewożą metal i kryształy między Twoimi planetami.', [], [
    { kind: 'unlock', feature: 'transport' },
  ]),
  node('fleet', 2, 0, 'fleet-2', 'Ładownie modułowe', 'Transportowiec zabiera dwa razy więcej.', ['fleet-1'], [{ kind: 'transportCapacity', percent: 100 }]),
  node('fleet', 2, 1, 'fleet-light', 'Lżejsze kadłuby', 'Statki — transportowce i kolonizacyjny — lecą krócej.', ['fleet-1', 'explore-1'], [
    { kind: 'travelTime', percent: -30 },
  ]),
  { ...node('fleet', 3, 0, 'fleet-3', 'Szlaki konwojów', 'Stałe trasy: nadwyżka z kolonii płynie sama.', ['fleet-2', 'ai-2'], []), soon: true },
  master('fleet', 'fleet-master', 'Admiralicja', 'Gwiazda mistrzowska Floty.', ['fleet-3', 'fleet-light']),
];

/**
 * Mosty między ramionami i gałęziami (v0.35, decyzja właściciela: „więcej takich połączeń”): badanie
 * wymaga też wiedzy z innej dziedziny — jak Astrofizyka ekstremalna z dwóch gałęzi Eksploracji.
 */
const BRIDGES: Readonly<Record<string, readonly string[]>> = {
  'mining-3': ['planet-4'], // Głębokie szyby ← Geologia głębinowa
  'energy-4': ['am-2'], // Reaktor gwiazdowy ← Kondensacja próżni
  'eng-4': ['log-3'], // Nanomontaż ← Magazyny próżniowe
  'am-4': ['eng-3'], // Skok czasowy ← Roboty budowlane
  'log-4': ['ai-3'], // Ciągłość produkcji ← Autonomia (SI)
  'ai-queue-2': ['eng-1'], // Harmonogram ← Prefabrykaty
  'probe-3': ['energy-2'], // Napęd jonowy sond ← Ogniwa fuzyjne
  'astro-2': ['planet-1'], // Spektroskopia gwiazd ← Badania geologiczne
};

export const RESEARCH_NODES: readonly ResearchNodeDef[] = NODES.map((n) =>
  BRIDGES[n.id] ? { ...n, requires: [...n.requires, ...BRIDGES[n.id]!.filter((r) => !n.requires.includes(r))] } : n,
);

export function findResearch(id: string): ResearchNodeDef | undefined {
  return RESEARCH_NODES.find((node) => node.id === id);
}

export function findArm(id: string): ResearchArmDef | undefined {
  return RESEARCH_ARMS.find((arm) => arm.id === id);
}
