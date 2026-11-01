import { createRng } from '../random/rng.ts';
import type { Balance, MissionIncident } from '../types.ts';

/**
 * Ryzyko misji (etap 7, decyzja właściciela 2026-11-01): loty między układami mogą zostać przechwycone przez piratów
 * (boty; nazwy robocze). Ryzyko rośnie z odległością i przy gniazdach piratów blisko trasy; każdy okręt eskorty
 * je zmniejsza. Skutek łagodny: transport traci część ładunku i się spóźnia, statek kolonizacyjny i megakonstrukt
 * tylko się spóźniają, eskorta może wrócić uszkodzona do naprawy. Lot w obrębie jednego układu jest bezpieczny.
 */

/** Punkt na mapie galaktyki (układ). */
export interface MapPoint {
  index: number;
  x: number;
  y: number;
}

/** Rozbicie ryzyka trasy (do okien: procent i krótkie wyjaśnienie). */
export interface RouteRisk {
  /** Ryzyko bez eskorty (0..cap). */
  base: number;
  /** Ryzyko z eskortą. */
  risk: number;
  /** Gniazda piratów blisko trasy. */
  nests: number;
  /** Lot w jednym układzie — bez ryzyka. */
  safe: boolean;
}

/**
 * Gniazda piratów: stała (z id galaktyki) część układów, z wyjątkiem `exclude` (układ startowy gracza).
 * Osobny strumień losowania — nie zmienia niczego innego w galaktyce.
 */
export function pirateNests(galaxy: { id: number; systems: readonly MapPoint[] }, balance: Balance, exclude: readonly number[] = []): MapPoint[] {
  const rng = createRng(`galaxy|${galaxy.id}|pirates`);
  const candidates = galaxy.systems.filter((s) => !exclude.includes(s.index));
  const count = Math.min(candidates.length, Math.round(galaxy.systems.length * balance.missionRisk.nestShare));
  const pool = [...candidates];
  const out: MapPoint[] = [];
  for (let i = 0; i < count; i++) out.push(pool.splice(rng.int(0, pool.length - 1), 1)[0]!);
  return out.sort((a, b) => a.index - b.index);
}

/** Odległość punktu od odcinka a–b. */
function segmentDistance(p: MapPoint, a: MapPoint, b: MapPoint): number {
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  const len = dx * dx + dy * dy;
  const t = len === 0 ? 0 : Math.max(0, Math.min(1, ((p.x - a.x) * dx + (p.y - a.y) * dy) / len));
  return Math.hypot(p.x - (a.x + t * dx), p.y - (a.y + t * dy));
}

/** Ryzyko po eskorcie: każdy okręt zdejmuje `escortCut` ryzyka bazowego (3 okręty ≈ prawie zero). */
export function withEscort(base: number, escort: number, balance: Balance): number {
  const cut = Math.max(0, 1 - balance.missionRisk.escortCut * Math.max(0, escort));
  return Math.round(base * cut * 1000) / 1000;
}

/** Ryzyko trasy z układu `from` do `to` z `escort` okrętami eskorty. */
export function routeRisk(from: MapPoint, to: MapPoint, nests: readonly MapPoint[], escort: number, balance: Balance): RouteRisk {
  if (from.index === to.index) return { base: 0, risk: 0, nests: 0, safe: true };
  const r = balance.missionRisk;
  const distance = Math.hypot(to.x - from.x, to.y - from.y);
  const near = nests.filter((n) => segmentDistance(n, from, to) <= r.nestRange).length;
  const base = Math.min(r.cap, Math.round((distance * r.perUnit + near * r.perNest) * 1000) / 1000);
  return { base, risk: withEscort(base, escort, balance), nests: near, safe: false };
}

/** Rodzaj lotu: transport traci część ładunku, kolonizacja i konstrukt tylko się spóźniają. */
export type IncidentKind = 'cargo' | 'delay';

/**
 * Losowanie przechwycenia przy starcie lotu (deterministycznie z `key` — trasy i chwili startu). null — lot spokojny.
 * Zdarzenie ma swoją chwilę (`at`, w połowie lotu ±20%): dopiero wtedy gracz się o nim dowiaduje.
 */
export function rollIncident(
  key: string,
  risk: number,
  kind: IncidentKind,
  flight: { departedAt: number; seconds: number },
  escort: number,
  balance: Balance,
): MissionIncident | null {
  if (risk <= 0) return null;
  const r = balance.missionRisk;
  const rng = createRng(`risk|${key}`);
  if (rng.next() >= risk) return null;
  const at = Math.round(flight.departedAt + flight.seconds * 1000 * rng.range(0.3, 0.7));
  const delaySeconds = Math.round(flight.seconds * rng.range(r.delayShare.min, r.delayShare.max));
  const lossShare = Math.round(rng.range(r.lossShare.min, r.lossShare.max) * 100) / 100;
  let damaged = 0;
  for (let i = 0; i < escort; i++) if (rng.next() < r.escortDamage) damaged++;
  return { at, delaySeconds, ...(kind === 'cargo' ? { lossShare } : {}), ...(damaged > 0 ? { damaged } : {}) };
}

/** Ładunek po przechwyceniu (strata zaokrąglona w górę — nigdy ujemny). */
export function cargoAfter(cargo: { metal: number; crystal: number }, lossShare: number): { kept: { metal: number; crystal: number }; lost: { metal: number; crystal: number } } {
  const lost = { metal: Math.min(cargo.metal, Math.ceil(cargo.metal * lossShare)), crystal: Math.min(cargo.crystal, Math.ceil(cargo.crystal * lossShare)) };
  return { kept: { metal: cargo.metal - lost.metal, crystal: cargo.crystal - lost.crystal }, lost };
}

/** Procent do okien („12%”, „< 1%”, „0%”). */
export function riskLabel(risk: number): string {
  if (risk <= 0) return '0%';
  const pct = risk * 100;
  return pct < 1 ? '< 1%' : `${Math.round(pct)}%`;
}

/** Zdarzenie z zapisu — błędne pomijane (null). */
export function parseIncident(raw: any): MissionIncident | null {
  const isNum = (v: unknown): v is number => typeof v === 'number' && Number.isFinite(v);
  if (!raw || typeof raw !== 'object' || !isNum(raw.at) || !isNum(raw.delaySeconds) || raw.delaySeconds < 0) return null;
  return {
    at: raw.at,
    delaySeconds: Math.min(raw.delaySeconds, 30 * 24 * 3600),
    ...(isNum(raw.lossShare) && raw.lossShare > 0 && raw.lossShare < 1 ? { lossShare: raw.lossShare } : {}),
    ...(Number.isInteger(raw.damaged) && raw.damaged > 0 && raw.damaged <= 999 ? { damaged: raw.damaged } : {}),
    ...(raw.done === true ? { done: true } : {}),
  };
}
