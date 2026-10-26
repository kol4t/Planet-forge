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
    active: false,
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
    description: 'Flota cywilna: transportowce i statki ekspedycyjne. Walka w kolejnym etapie.',
    angleDeg: 190,
    color: 0xe08a6d,
    active: false,
    status: 'robocza',
  },
];

const output = (resource: 'metal' | 'crystal' | 'energy' | 'antimatter', percent: number): ResearchEffect => ({
  kind: 'output',
  resource,
  percent,
});

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

export const RESEARCH_NODES: readonly ResearchNodeDef[] = [
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
    ['mining-3', 'Głębokie szyby', 'Wydobycie: złoża poniżej skorupy.', [output('metal', 15), output('crystal', 15)]],
    ['mining-4', 'Automatyczne rafinerie', 'Wydobycie: urobek oczyszczany na miejscu.', [output('metal', 20), output('crystal', 20)]],
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
  ...lane('planetology', 0, 1, '', [
    ['planet-1', 'Badania geologiczne', 'Mapy złóż wszystkich planet.', [output('metal', 5), output('crystal', 5)]],
    ['planet-2', 'Adaptacja do środowiska', 'Kary środowiska planet słabsze o połowę.', [{ kind: 'environment', percent: -50 }]],
    ['planet-3', 'Osadnictwo', 'Miejsce na jeszcze jedną planetę.', [{ kind: 'planetSlots', add: 1 }]],
    ['planet-4', 'Geologia głębinowa', 'Złoża głęboko pod powierzchnią.', [output('metal', 15), output('crystal', 15)]],
    ['planet-5', 'Terraformacja', 'Planety bez kar środowiska.', [{ kind: 'environment', percent: -50 }]],
  ]).map((node) => (node.ring === 1 ? { ...node, requires: [] } : node)),
  {
    id: 'planet-spec',
    arm: 'planetology',
    ring: 2,
    lane: 1,
    name: 'Przebudowa kolonii',
    description: 'Planetę można przestawić na inną specjalizację (zmiana trwa 1 godzinę).',
    requires: ['planet-1'],
    effects: [{ kind: 'unlock', feature: 'specialization-change' }],
  },
  master('planetology', 'planet-master', 'Architekt światów', 'Gwiazda mistrzowska Planetologii.', ['planet-5']),

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
  { ...soon('exploration', 3, 'explore-3', 'Ekspedycje', 'Wyprawy w nieznane rejony galaktyki.', ['explore-2']), soon: true },
  master('exploration', 'explore-master', 'Pionier', 'Gwiazda mistrzowska Eksploracji.', ['explore-3']),
  soon('station', 1, 'station-1', 'Moduł orbitalny', 'Pierwszy moduł stacji kosmicznej.'),
  soon('station', 2, 'station-2', 'Dok handlowy', 'Stacja przyjmuje statki kupców.', ['station-1']),
  soon('station', 3, 'station-3', 'Rynek galaktyczny', 'Handel z kupcami i szlaki handlowe.', ['station-2']),
  master('station', 'station-master', 'Planeta-stacja', 'Gwiazda mistrzowska Stacji i handlu.', ['station-3']),
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
  soon('fleet', 1, 'fleet-1', 'Transportowce', 'Przewóz surowców między planetami.'),
  soon('fleet', 2, 'fleet-2', 'Statki ekspedycyjne', 'Statki dla Eksploracji.', ['fleet-1']),
  soon('fleet', 3, 'fleet-3', 'Szlaki konwojów', 'Stałe trasy transportowe.', ['fleet-2']),
  master('fleet', 'fleet-master', 'Admiralicja', 'Gwiazda mistrzowska Floty.', ['fleet-3']),
];

export function findResearch(id: string): ResearchNodeDef | undefined {
  return RESEARCH_NODES.find((node) => node.id === id);
}

export function findArm(id: string): ResearchArmDef | undefined {
  return RESEARCH_ARMS.find((arm) => arm.id === id);
}
