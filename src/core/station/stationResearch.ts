// Badania stacji (etap 2a planu stacji): Laboratorium orbitalne i osobne drzewko badań — płaci magazyn stacji,
// kolejka osobna od planet (jedno badanie naraz), efekty dla całego imperium. Czysta logika: warunki → koszt →
// nowy stan albo czytelny błąd; odczyt z zapisu.
import { findStationResearch, STATION_RESEARCH, STATION_RESEARCH_RULES as R, type StationResearchEffect, type StationResearchNode } from '../../data/stationResearch.ts';
import { stationLevelAt } from '../economy/asteroids.ts';
import type { AsteroidStation, HomeStation, ResearchEffect, Resources } from '../types.ts';

export interface StationResearchState {
  done: string[];
  /** Badanie w toku: id, start i koniec (ms). */
  current: { id: string; startedAt: number; readyAt: number } | null;
}

export const EMPTY_STATION_RESEARCH: StationResearchState = { done: [], current: null };

export type StationResearchStatus = 'done' | 'researching' | 'available' | 'busy' | 'needs-lab' | 'needs-research';

const missingText = (cost: Resources, stock: Resources) =>
  [stock.metal < cost.metal ? `${Math.ceil(cost.metal - stock.metal)} metalu` : '', stock.crystal < cost.crystal ? `${Math.ceil(cost.crystal - stock.crystal)} kryształów` : '']
    .filter(Boolean)
    .join(', ');

// ——— Laboratorium orbitalne ———

export const labLevel = (station: HomeStation | null, at: number) => stationLevelAt(station?.lab, at);

export function labCost(level: number): Resources {
  const f = R.lab.costGrowth ** (level - 1);
  return { metal: Math.round(R.lab.cost.metal * f), crystal: Math.round(R.lab.cost.crystal * f) };
}

export type StationResult = { ok: true; station: HomeStation; cost: Resources; seconds: number } | { ok: false; message: string };

/** Budowa / rozbudowa Laboratorium orbitalnego o poziom — płaci magazyn stacji. */
export function upgradeLab(station: HomeStation | null, now: number): StationResult {
  if (!station) return { ok: false, message: 'Najpierw zbuduj stację macierzystą.' };
  if (now < station.core.readyAt) return { ok: false, message: 'Rdzeń stacji jest jeszcze w budowie.' };
  const current: AsteroidStation | undefined = station.lab;
  if (current && now < current.readyAt) return { ok: false, message: 'Laboratorium orbitalne jest właśnie rozbudowywane.' };
  const level = (current?.level ?? 0) + 1;
  if (level > R.lab.maxLevel) return { ok: false, message: `Laboratorium orbitalne ma już najwyższy poziom (${R.lab.maxLevel}).` };
  const cost = labCost(level);
  const missing = missingText(cost, station.stock);
  if (missing) return { ok: false, message: `Laboratorium orbitalne poz. ${level} — w magazynie stacji brakuje: ${missing}. Dowieź surowce transportowcem („Na stację”).` };
  const seconds = R.lab.secondsPerLevel * level;
  return {
    ok: true,
    station: { ...station, stock: { metal: station.stock.metal - cost.metal, crystal: station.stock.crystal - cost.crystal }, lab: { level, readyAt: now + seconds * 1000 } },
    cost,
    seconds,
  };
}

// ——— badania ———

export function stationResearchCost(node: StationResearchNode): Resources {
  const f = R.ringCostGrowth ** (node.ring - 1);
  return { metal: Math.round(R.baseCost.metal * f), crystal: Math.round(R.baseCost.crystal * f) };
}

/** Procent czasu badań stacji z jej własnych badań (ujemny = szybciej). */
function speedPercent(done: readonly string[]): number {
  let p = 0;
  for (const id of done) for (const e of findStationResearch(id)?.effects ?? []) if (e.kind === 'stationResearchTime') p += e.percent;
  return p;
}

export function stationResearchSeconds(node: StationResearchNode, lab: number, done: readonly string[]): number {
  const base = R.baseSeconds * R.ringTimeGrowth ** (node.ring - 1);
  const speed = 1 + R.labSpeedPerLevel * Math.max(0, lab - 1);
  return Math.max(60, Math.round((base * Math.max(0.3, 1 + speedPercent(done) / 100)) / speed));
}

export const labLevelForRing = (ring: number) => R.labLevelForRing[Math.min(ring, R.labLevelForRing.length) - 1]!;

export function stationResearchStatus(node: StationResearchNode, state: StationResearchState, lab: number): StationResearchStatus {
  if (state.done.includes(node.id)) return 'done';
  if (state.current?.id === node.id) return 'researching';
  if (!node.requires.every((id) => state.done.includes(id))) return 'needs-research';
  if (lab < labLevelForRing(node.ring)) return 'needs-lab';
  if (state.current) return 'busy';
  return 'available';
}

export type StationResearchResult = { ok: true; research: StationResearchState; station: HomeStation; cost: Resources; seconds: number } | { ok: false; message: string };

/** Start badania: wymagania, laboratorium, wolna kolejka, surowce w magazynie stacji. */
export function startStationResearch(state: StationResearchState, station: HomeStation | null, id: string, now: number): StationResearchResult {
  const node = findStationResearch(id);
  if (!node) return { ok: false, message: 'Nie ma takiego badania.' };
  if (!station) return { ok: false, message: 'Najpierw zbuduj stację macierzystą.' };
  const lab = labLevel(station, now);
  if (lab <= 0) return { ok: false, message: 'Najpierw zbuduj Laboratorium orbitalne (Moduły stacji).' };
  const status = stationResearchStatus(node, state, lab);
  if (status === 'done') return { ok: false, message: `„${node.name}” już zbadane.` };
  if (status === 'researching') return { ok: false, message: `„${node.name}” jest właśnie badane.` };
  if (status === 'needs-research') {
    const missing = node.requires.filter((r) => !state.done.includes(r)).map((r) => `„${findStationResearch(r)?.name ?? r}”`);
    return { ok: false, message: `Najpierw zbadaj: ${missing.join(', ')}.` };
  }
  if (status === 'needs-lab') return { ok: false, message: `To badanie wymaga Laboratorium orbitalnego poz. ${labLevelForRing(node.ring)}.` };
  if (status === 'busy') return { ok: false, message: 'Laboratorium orbitalne prowadzi już badanie — stacja bada jedno naraz.' };
  const cost = stationResearchCost(node);
  const missing = missingText(cost, station.stock);
  if (missing) return { ok: false, message: `„${node.name}” — w magazynie stacji brakuje: ${missing}. Dowieź surowce transportowcem („Na stację”).` };
  const seconds = stationResearchSeconds(node, lab, state.done);
  return {
    ok: true,
    research: { done: state.done, current: { id, startedAt: now, readyAt: now + seconds * 1000 } },
    station: { ...station, stock: { metal: station.stock.metal - cost.metal, crystal: station.stock.crystal - cost.crystal } },
    cost,
    seconds,
  };
}

/** Ukończenie badania w toku (gdy minął czas). */
export function completeStationResearch(state: StationResearchState, now: number): { research: StationResearchState; completed: string | null } {
  const c = state.current;
  if (!c || now < c.readyAt) return { research: state, completed: null };
  return { research: { done: [...state.done, c.id], current: null }, completed: c.id };
}

export function stationResearchProgress(state: StationResearchState, now: number): number {
  const c = state.current;
  if (!c) return 0;
  return Math.min(1, Math.max(0, (now - c.startedAt) / Math.max(1, c.readyAt - c.startedAt)));
}

/** Efekty zbadanych badań stacji, które działają na każdą planetę imperium (zwykłe efekty badań). */
export function stationEmpireEffects(done: readonly string[]): ResearchEffect[] {
  const out: ResearchEffect[] = [];
  for (const id of done) {
    for (const e of findStationResearch(id)?.effects ?? []) if (isEmpireEffect(e)) out.push(e);
  }
  return out;
}

const isEmpireEffect = (e: StationResearchEffect): e is ResearchEffect => e.kind !== 'stationResearchTime' && e.kind !== 'prepares';

/** Odczyt z zapisu: nieznane i powtórzone badania pomijane, błędne „w toku” — bez badania. */
export function parseStationResearch(raw: any): StationResearchState {
  if (!raw || typeof raw !== 'object') return { done: [], current: null };
  const known = new Set(STATION_RESEARCH.map((n) => n.id));
  const done = Array.isArray(raw.done) ? [...new Set((raw.done as unknown[]).filter((x): x is string => typeof x === 'string' && known.has(x)))] : [];
  const c = raw.current;
  const ok = c && typeof c.id === 'string' && known.has(c.id) && !done.includes(c.id) && Number.isFinite(c.startedAt) && Number.isFinite(c.readyAt) && c.readyAt >= c.startedAt;
  return { done, current: ok ? { id: c.id, startedAt: c.startedAt, readyAt: c.readyAt } : null };
}
