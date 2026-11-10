// Przeniesienie stacji macierzystej (krok 4c planu stacji, decyzje właściciela 2026-11-10):
// - po badaniu stacji „Silniki stacji”; koszt — paliwo (dużo antymaterii, rośnie z odległością) i 2 h rozkładania;
// - cel: dowolne miejsce w galaktyce — nad Twoją planetą, wolną planetą, planetą innego gracza, gazowym olbrzymem
//   albo przy pasie asteroid;
// - w czasie lotu stacja DZIAŁA (badania, stocznia, dok, premia — w starym miejscu do przylotu);
// - ryzyko piratów między układami: opóźnienie i strata części magazynu stacji (metal, kryształy, kredyty);
//   eskorta zmniejsza ryzyko.
// Czysta logika, liczby robocze.
import type { MissionIncident } from '../types.ts';

export const STATION_MOVE = {
  research: 'st-station-engines',
  prepareSeconds: 2 * 3600,
  /** Lot stacji trwa tyle razy dłużej niż transportowca (najmniej `minSeconds`). */
  flightFactor: 3,
  minSeconds: 30 * 60,
  /** Paliwo: tyle razy więcej niż lot statku kolonizacyjnego na tę odległość. */
  fuelFactor: 10,
  maxEscort: 5,
  status: 'robocza' as const,
};

export interface StationMove {
  /** Adres obiektu docelowego (planeta / olbrzym; przy pasie — dowolna planeta układu). */
  to: string;
  /** `belt` — stacja stanie przy pasie asteroid układu. */
  at?: 'belt';
  startedAt: number;
  departsAt: number;
  arrivesAt: number;
  fuel: number;
  escort: number;
  incident?: MissionIncident;
}

export type MoveCheck = { ok: true } | { ok: false; message: string };

/** Warunki przenosin (bez paliwa — sprawdza kontroler). */
export function moveCheck(ctx: { done: readonly string[]; ready: boolean; moving: boolean; same: boolean; validTarget: boolean; escort: number; escortDocked: number }): MoveCheck {
  if (!ctx.ready) return { ok: false, message: 'Najpierw zbuduj stację macierzystą.' };
  if (!ctx.done.includes(STATION_MOVE.research)) return { ok: false, message: 'Przeniesienie stacji odblokowuje badanie stacji „Silniki stacji” (Badania stacji → Flota).' };
  if (ctx.moving) return { ok: false, message: 'Stacja już się przenosi.' };
  if (!ctx.validTarget) return { ok: false, message: 'Tu stacji nie da się postawić.' };
  if (ctx.same) return { ok: false, message: 'Stacja już tu jest.' };
  if (ctx.escort < 0 || ctx.escort > Math.min(STATION_MOVE.maxEscort, ctx.escortDocked)) return { ok: false, message: 'Za mało okrętów eskorty na stanie.' };
  return { ok: true };
}

export function moveSeconds(transportSeconds: number): number {
  return Math.max(STATION_MOVE.minSeconds, Math.round(transportSeconds * STATION_MOVE.flightFactor));
}

/** Odczyt z zapisu (błędny — null). */
export function parseStationMove(raw: any, parseIncident: (r: unknown) => MissionIncident | null): StationMove | null {
  if (!raw || typeof raw !== 'object' || typeof raw.to !== 'string' || !/^\d+:\d+:\d+$/.test(raw.to)) return null;
  if (![raw.startedAt, raw.departsAt, raw.arrivesAt, raw.fuel].every((v) => typeof v === 'number' && Number.isFinite(v))) return null;
  const incident = raw.incident ? parseIncident(raw.incident) : null;
  return {
    to: raw.to,
    ...(raw.at === 'belt' ? { at: 'belt' as const } : {}),
    startedAt: raw.startedAt,
    departsAt: raw.departsAt,
    arrivesAt: raw.arrivesAt,
    fuel: Math.max(0, raw.fuel),
    escort: Number.isInteger(raw.escort) ? Math.min(STATION_MOVE.maxEscort, Math.max(0, raw.escort)) : 0,
    ...(incident ? { incident } : {}),
  };
}
