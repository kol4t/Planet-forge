// Zapis „imperium”: kilka miejsc (na razie planety; później księżyce, stacje…),
// aktywne miejsce i wspólny portfel antymaterii. Czysty TypeScript.
import { BALANCE } from '../../data/balance.ts';
import { EMPTY_RESEARCH, parseResearch } from '../research/research.ts';
import type { ColonyMission, EconomyState, JournalEntry, JournalKind, ResearchState } from '../types.ts';
import { deserialize, parseEconomy, parsePlanetRef, SAVE_KEY, type SaveData } from './save.ts';

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
}

const ADDRESS = /^\d{1,3}:\d{1,4}:\d{1,2}$/;
const JOURNAL_KINDS: readonly JournalKind[] = ['build', 'research', 'colony', 'ship', 'away', 'empire'];
/** Ile wpisów dziennika trzymamy (starsze wypadają). */
export const JOURNAL_LIMIT = 80;

/** Statki z zapisu — błędne pomijane (nie psują reszty zapisu). */
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
      ? [{ target: m.target, from: m.from, departedAt: m.departedAt, arrivesAt: m.arrivesAt, cost: { metal: m.cost.metal, crystal: m.cost.crystal } }]
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
    slots.push({ kind: 'planet', planet, economy: { ...economy, antimatter: 0 } });
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
  };
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

export function loadEmpire(): EmpireSave | null {
  try {
    const storage = globalThis.localStorage;
    if (!storage) return null;
    const empire = deserializeEmpire(storage.getItem(EMPIRE_KEY));
    if (empire) return empire;
    // Przejście ze starego zapisu jednej planety (stary klucz zostaje jako kopia zapasowa).
    const legacy = deserialize(storage.getItem(SAVE_KEY));
    return legacy ? empireFromLegacy(legacy) : null;
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
