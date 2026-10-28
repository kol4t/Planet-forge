// Zapis „imperium”: kilka miejsc (na razie planety; później księżyce, stacje…),
// aktywne miejsce i wspólny portfel antymaterii. Czysty TypeScript.
import { BALANCE } from '../../data/balance.ts';
import { parseAiLevels, type AiLevel, type AiRuleId } from '../ai/advisor.ts';
import { EMPTY_RESEARCH, parseResearch } from '../research/research.ts';
import { parseSpecialization } from '../economy/specialization.ts';
import { parseStation } from '../economy/asteroids.ts';
import { parseDiscoveries, type Discoveries } from '../galaxy/discovery.ts';
import { parseExpeditions } from '../galaxy/expeditions.ts';
import { parseShipments } from '../economy/transport.ts';
import { parseComets } from '../economy/comets.ts';
import { parseFinds, type FindsState } from '../economy/finds.ts';
import { parseHomeStation } from '../economy/homeStation.ts';
import { parseTransfers } from '../economy/constructTransfer.ts';
import type { AsteroidStation, BuildingId, CometHaul, ConstructTransfer, HomeStation, ColonyMission, EconomyState, Expedition, Shipment, JournalEntry, JournalKind, PlanetSpecialization, ResearchState } from '../types.ts';
import { deserialize, parseEconomy, parsePlanetRef, SAVE_KEY, type SaveData } from './save.ts';
import type { Plots } from '../colony/plots.ts';
import { parseComplexes, type Complex } from '../colony/complexes.ts';
import { COMPLEX_FAMILIES } from '../../data/complexes.ts';

export const EMPIRE_VERSION = 2;
export const EMPIRE_KEY = 'planet-forge.empire.v1';

export type PlanetRef = SaveData['planet'];

/** Rodzaj miejsca. Na razie tylko planeta; nowe rodzaje dopisujemy tutaj. */
export type SlotKind = 'planet';

export interface SlotSave {
  kind: SlotKind;
  planet: PlanetRef;
  /** Gospodarka miejsca. Antymateria NIE jest tu trzymana (portfel wspólny). */
  economy: EconomyState;
  /** Badania tej planety (od v0.15; brak = zapis sprzed v0.15 — badania imperium z pola `research`). */
  research?: ResearchState;
  /** Pola zajęte przez budowle (od v0.26; brak = przydzielane od nowa z poziomów). */
  plots?: Plots;
  /** Wersja siatki pól, do której należy `plots` (od v0.26.3; inna lub brak = przydział od nowa). */
  plotsGrid?: number;
  /** Wersja układu pól (`PLOTS_LAYOUT`; brak = sprzed v0.45: pole na każde 3 poziomy — migracja do spójnego obszaru). */
  plotsLayout?: number;
  /** Kompleksy przemysłowe (od v0.38; numery pól — ważne z tą samą wersją siatki co `plots`). */
  complexes?: Complex[];
  /**
   * Zajęte i wszystkie pola lądu z ostatniego przeliczenia (od v0.30) — lista planet nie liczy siatek
   * nieaktywnych planet przy starcie. Ważne tylko z tą samą wersją siatki (`plotsGrid`).
   */
  fields?: { used: number; buildable: number };
  /** Specjalizacja kolonii (od v0.32.3; brak albo błędna = bez specjalizacji). */
  specialization?: PlanetSpecialization;
  /** Stacja wydobywcza na pasie asteroid (od v0.37; brak albo błędna = brak stacji). */
  asteroidStation?: AsteroidStation;
  /** Kolektor energii gwiazdy na orbicie (od v0.44; brak albo błędny = brak kolektora). */
  starCollector?: AsteroidStation;
  /** Megakonstrukty po transferze — stoją na każdym polu, także na wodzie i lawie (od v0.56, opcjonalne). */
  afloat?: BuildingId[];
}

export interface EmpireSave {
  saveVersion: number;
  /** Indeks aktywnego miejsca w `slots`. */
  active: number;
  /** Ile miejsc jest odblokowanych (base..max z balansu). */
  unlockedSlots: number;
  /** Wspólna antymateria całego imperium. */
  antimatter: number;
  slots: SlotSave[];
  /** Badania (wspólne dla imperium). Brak w zapisach sprzed v0.10 = nic nie zbadano. */
  research: ResearchState;
  /** Miejsce startowe gracza w galaktyce (np. „1:42:3”). Brak w zapisach sprzed v0.11. */
  home?: string;
  /** Statki kolonizacyjne w drodze (od v0.13; brak = żadnych). */
  missions?: ColonyMission[];
  /** Dziennik ekspedycji (od v0.13; najnowsze na końcu). */
  journal?: JournalEntry[];
  /** Samodzielność SI Matki dla każdej reguły (od v0.14; brak = „pyta”). */
  ai?: Record<AiRuleId, AiLevel>;
  /** Wiedza o galaktyce: indeks układu → poziom 1–4 (od v0.34.2; brak = wyliczana na start). */
  discoveries?: Discoveries;
  /** Ekspedycje w drodze (od v0.34.3; brak = żadnych). */
  expeditions?: Expedition[];
  /** Transportowce w drodze (od v0.36; brak = żadnych). */
  shipments?: Shipment[];
  /** Holowniki po komety (od v0.37.1; brak = żadnych). */
  comets?: CometHaul[];
  /** Znaleziska megakompleksów i ich terminy (od v0.43.1; brak = żadnych). */
  finds?: FindsState;
  /** Planety wyeksploatowane (≥ 80% obu złóż) — adresy, każda liczona raz (od v0.54; brak = żadnych). */
  exploited?: string[];
  /** Stacja macierzysta (od v0.55; brak = nie zbudowana). */
  station?: HomeStation;
  /** Megakonstrukty w transferze (od v0.56, opcjonalne). */
  transfers?: ConstructTransfer[];
}

const ADDRESS = /^\d{1,3}:\d{1,4}:\d{1,2}$/;
const JOURNAL_KINDS: readonly JournalKind[] = ['build', 'research', 'colony', 'ship', 'away', 'empire', 'ai', 'expedition', 'find'];
/** Ile wpisów dziennika trzymamy (starsze wypadają). */
export const JOURNAL_LIMIT = 80;

/** Zajęte pola z zapisu — tylko znane budynki i liczby całkowite ≥ 0 (resztę pomijamy). */
export function parsePlots(raw: unknown): Plots {
  const plots: Plots = {};
  if (!raw || typeof raw !== 'object') return plots;
  for (const def of BALANCE.buildings) {
    const list = (raw as Record<string, unknown>)[def.id];
    if (Array.isArray(list)) plots[def.id] = list.filter((v): v is number => Number.isInteger(v) && v >= 0 && v < 10_000);
  }
  return plots;
}

/** Statki z zapisu — błędne pomijane (nie psują reszty zapisu). */
/** Lista wyeksploatowanych planet z zapisu — tylko poprawne, niepowtarzające się adresy. */
export function parseExploited(raw: unknown): string[] {
  if (!Array.isArray(raw)) return [];
  return [...new Set(raw.filter((a): a is string => typeof a === 'string' && ADDRESS.test(a)))];
}

export function parseMissions(raw: unknown): ColonyMission[] {
  if (!Array.isArray(raw)) return [];
  return raw.flatMap((m: any) =>
    m &&
    typeof m.target === 'string' &&
    ADDRESS.test(m.target) &&
    typeof m.from === 'string' &&
    isNum(m.departedAt) &&
    isNum(m.arrivesAt) &&
    m.arrivesAt >= m.departedAt &&
    isNum(m.cost?.metal) &&
    isNum(m.cost?.crystal)
      ? [
          {
            target: m.target,
            from: m.from,
            departedAt: m.departedAt,
            arrivesAt: m.arrivesAt,
            cost: { metal: m.cost.metal, crystal: m.cost.crystal },
            // Paliwo (v0.53) — opcjonalne; błędne pomijane.
            ...(isNum(m.fuel) && m.fuel > 0 ? { fuel: m.fuel } : {}),
          },
        ]
      : [],
  );
}

/** Dziennik z zapisu — błędne wpisy pomijane. */
export function parseJournal(raw: unknown): JournalEntry[] {
  if (!Array.isArray(raw)) return [];
  return raw
    .flatMap((e: any) =>
      e && isNum(e.at) && JOURNAL_KINDS.includes(e.kind) && typeof e.text === 'string'
        ? [{ at: e.at, kind: e.kind as JournalKind, text: e.text.slice(0, 300) }]
        : [],
    )
    .slice(-JOURNAL_LIMIT);
}

const isNum = (v: unknown): v is number => typeof v === 'number' && Number.isFinite(v);
const isFieldCount = (v: unknown): v is number => Number.isInteger(v) && (v as number) >= 0 && (v as number) <= 10_000;

export function serializeEmpire(empire: Omit<EmpireSave, 'saveVersion'>): string {
  return JSON.stringify({ ...empire, saveVersion: EMPIRE_VERSION });
}

/** Odczyt z walidacją (null = uszkodzony lub obcy zapis). */
export function deserializeEmpire(raw: string | null): EmpireSave | null {
  if (!raw) return null;
  let data: any;
  try {
    data = JSON.parse(raw);
  } catch {
    return null;
  }
  if (!data || data.saveVersion !== EMPIRE_VERSION || !Array.isArray(data.slots)) return null;
  const { base, max } = BALANCE.planetSlots;
  const unlocked = isNum(data.unlockedSlots) && Number.isInteger(data.unlockedSlots) ? data.unlockedSlots : base;
  if (unlocked < base || unlocked > max) return null;
  if (data.slots.length === 0 || data.slots.length > unlocked) return null;
  const slots: SlotSave[] = [];
  for (const raw of data.slots) {
    if (raw?.kind !== 'planet') return null;
    const planet = parsePlanetRef(raw.planet);
    const economy = parseEconomy(raw.economy);
    if (!planet || !economy) return null;
    slots.push({
      kind: 'planet',
      planet,
      economy: { ...economy, antimatter: 0 },
      ...(raw.research ? { research: parseResearch(raw.research) } : {}),
      ...(raw.plots ? { plots: parsePlots(raw.plots) } : {}),
      ...(isNum(raw.plotsGrid) ? { plotsGrid: raw.plotsGrid } : {}),
      ...(isNum(raw.plotsLayout) ? { plotsLayout: raw.plotsLayout } : {}),
      ...(parseComplexes(raw.complexes, COMPLEX_FAMILIES).length > 0 ? { complexes: parseComplexes(raw.complexes, COMPLEX_FAMILIES) } : {}),
      ...(isFieldCount(raw.fields?.used) && isFieldCount(raw.fields?.buildable) ? { fields: { used: raw.fields.used, buildable: raw.fields.buildable } } : {}),
      ...(parseSpecialization(raw.specialization) ? { specialization: parseSpecialization(raw.specialization) } : {}),
      ...(parseStation(raw.asteroidStation) ? { asteroidStation: parseStation(raw.asteroidStation) } : {}),
      ...(parseStation(raw.starCollector) ? { starCollector: parseStation(raw.starCollector) } : {}),
      ...(parseAfloat(raw.afloat).length > 0 ? { afloat: parseAfloat(raw.afloat) } : {}),
    });
  }
  if (!isNum(data.active) || !Number.isInteger(data.active) || data.active < 0 || data.active >= slots.length) return null;
  if (!isNum(data.antimatter) || data.antimatter < 0) return null;
  return {
    saveVersion: EMPIRE_VERSION,
    active: data.active,
    unlockedSlots: unlocked,
    antimatter: data.antimatter,
    slots,
    research: parseResearch(data.research),
    ...(typeof data.home === 'string' && ADDRESS.test(data.home) ? { home: data.home } : {}),
    missions: parseMissions(data.missions),
    journal: parseJournal(data.journal),
    ai: parseAiLevels(data.ai),
    ...(parseDiscoveries(data.discoveries) ? { discoveries: parseDiscoveries(data.discoveries)! } : {}),
    ...(parseExpeditions(data.expeditions).length > 0 ? { expeditions: parseExpeditions(data.expeditions) } : {}),
    ...(parseShipments(data.shipments).length > 0 ? { shipments: parseShipments(data.shipments) } : {}),
    ...(parseComets(data.comets).length > 0 ? { comets: parseComets(data.comets) } : {}),
    ...(data.finds ? { finds: parseFinds(data.finds) } : {}),
    ...(parseExploited(data.exploited).length > 0 ? { exploited: parseExploited(data.exploited) } : {}),
    ...(parseHomeStation(data.station) ? { station: parseHomeStation(data.station)! } : {}),
    ...(parseTransfers(data.transfers, BUILDING_IDS).length > 0 ? { transfers: parseTransfers(data.transfers, BUILDING_IDS) } : {}),
  };
}

const BUILDING_IDS: readonly BuildingId[] = BALANCE.buildings.map((b) => b.id);

/** Lista budynków „na każdym polu” (znane id, bez powtórzeń; błędne pomijane). */
export function parseAfloat(raw: unknown): BuildingId[] {
  if (!Array.isArray(raw)) return [];
  return [...new Set(raw.filter((id): id is BuildingId => BUILDING_IDS.includes(id)))];
}

/** Zapis jednej planety (v0.1–0.6) → imperium z jednym miejscem; antymateria trafia do portfela. */
export function empireFromLegacy(save: SaveData): EmpireSave {
  return {
    saveVersion: EMPIRE_VERSION,
    active: 0,
    unlockedSlots: BALANCE.planetSlots.base,
    antimatter: save.economy.antimatter,
    slots: [{ kind: 'planet', planet: save.planet, economy: { ...save.economy, antimatter: 0 } }],
    research: EMPTY_RESEARCH,
  };
}

/** Czy da się dodać kolejną planetę. */
export function hasFreeSlot(used: number, unlocked: number): boolean {
  return used < unlocked;
}

// Bezpieczny dostęp do localStorage (tryb prywatny Safari może rzucać wyjątki).

/** Kopia zapisu, którego nie dało się wczytać (audyt v0.46) — nowa gra go nie nadpisuje. */
export const BROKEN_KEY = 'planet-forge.empire.broken';

export function loadEmpire(): EmpireSave | null {
  return inspectStoredEmpire().empire;
}

/**
 * Odczyt zapisu imperium. Gdy zapis istnieje, ale jest uszkodzony (albo z nowszej wersji gry), jego tekst trafia
 * pod `BROKEN_KEY` (`broken: true`) — nowa gra zapisze się pod zwykłym kluczem, a stary postęp nie przepada.
 */
export function inspectStoredEmpire(): { empire: EmpireSave | null; broken: boolean } {
  try {
    const storage = globalThis.localStorage;
    if (!storage) return { empire: null, broken: false };
    const raw = storage.getItem(EMPIRE_KEY);
    const empire = deserializeEmpire(raw);
    if (empire) return { empire, broken: false };
    if (raw) {
      try {
        storage.setItem(BROKEN_KEY, raw);
      } catch {
        // Brak miejsca — kopia się nie zmieści; zostaje komunikat.
      }
      return { empire: null, broken: true };
    }
    // Przejście ze starego zapisu jednej planety (stary klucz zostaje jako kopia zapasowa).
    const legacy = deserialize(storage.getItem(SAVE_KEY));
    return { empire: legacy ? empireFromLegacy(legacy) : null, broken: false };
  } catch {
    return { empire: null, broken: false };
  }
}

/** Tekst zachowanego uszkodzonego zapisu (do zgłoszenia) albo null. */
export function brokenSaveText(): string | null {
  try {
    return globalThis.localStorage?.getItem(BROKEN_KEY) ?? null;
  } catch {
    return null;
  }
}

export function writeEmpire(empire: Omit<EmpireSave, 'saveVersion'>): boolean {
  try {
    globalThis.localStorage?.setItem(EMPIRE_KEY, serializeEmpire(empire));
    return true;
  } catch {
    return false;
  }
}
