// Premia stacji macierzystej dla jej otoczenia (etap 2b planu stacji, decyzje właściciela 2026-11-09): wydobycie
// i szybsza budowa na planetach w zasięgu, tańsze paliwo lotów na stację, krótszy lot ze stacji (badanie Floty).
// Zasięg z badań stacji: planeta pod stacją → cały układ → sąsiednie układy. Premia słabnie z odległością:
// planeta pod stacją 100%, reszta układu 50%, sąsiednie układy 25%. Siła rośnie z poziomem rdzenia. Czysta logika.
import { findStationResearch } from '../../data/stationResearch.ts';
import type { ResearchEffect } from '../types.ts';

/** Liczby robocze premii (strojenie na końcu). */
export const STATION_AURA = {
  /** Premia przy 100% (planeta pod stacją), procent. */
  output: 5,
  buildTime: -5,
  /** Paliwo lotów na stację z planet w zasięgu (procent, przy 100%). */
  fuelToStation: -30,
  /** Udział premii: planeta pod stacją, reszta układu, sąsiednie układy. */
  share: { planet: 1, system: 0.5, near: 0.25 },
  /** Sąsiednie układy: odległość na mapie galaktyki (jednostki mapy; średnio ok. 4 układy). */
  nearDistance: 20,
  /** Siła premii rośnie o tyle na każdy poziom rdzenia ponad pierwszy. */
  perCoreLevel: 0.25,
  status: 'robocza' as const,
};

/** 0 — brak premii, 1 — planeta pod stacją, 2 — cały układ, 3 — sąsiednie układy. */
export type AuraReach = 0 | 1 | 2 | 3;

export interface AuraStats {
  reach: AuraReach;
  /** Mnożnik siły (rdzeń). */
  strength: number;
  output: number;
  buildTime: number;
  fuelToStation: number;
  /** Lot ze stacji: procent czasu (badanie Floty; ujemny = krócej), niezależnie od zasięgu. */
  fromStationTime: number;
}

/** Premia z badań stacji i poziomu rdzenia. */
export function auraStats(done: readonly string[], coreLevel: number): AuraStats {
  let reach: AuraReach = 0;
  let fromStationTime = 0;
  for (const id of done) {
    for (const e of findStationResearch(id)?.effects ?? []) {
      if (e.kind === 'stationLaunchTime') fromStationTime += e.percent;
      if (e.kind === 'stationAura') reach = Math.max(reach, e.reach) as AuraReach;
    }
  }
  const strength = 1 + STATION_AURA.perCoreLevel * Math.max(0, coreLevel - 1);
  const A = STATION_AURA;
  return {
    reach,
    strength,
    output: reach > 0 ? A.output * strength : 0,
    buildTime: reach > 0 ? A.buildTime * strength : 0,
    fuelToStation: reach > 0 ? A.fuelToStation : 0,
    fromStationTime,
  };
}

/** Udział planety w premii (0–1) z położenia: ta sama planeta / układ / sąsiedni układ (odległość układów). */
export function auraShare(reach: AuraReach, samePlanet: boolean, sameSystem: boolean, systemDistance: number): number {
  const A = STATION_AURA.share;
  if (reach >= 1 && samePlanet) return A.planet;
  if (reach >= 2 && sameSystem) return A.system;
  if (reach >= 3 && !sameSystem && systemDistance <= STATION_AURA.nearDistance) return A.near;
  return 0;
}

/** Efekty premii dla planety o udziale `share` (dodawane do jej balansu jak efekty badań). */
export function auraEffects(stats: AuraStats, share: number): ResearchEffect[] {
  if (share <= 0 || stats.reach === 0) return [];
  const r = (v: number) => Math.round(v * share * 10) / 10;
  return [
    { kind: 'output', resource: 'metal', percent: r(stats.output) },
    { kind: 'output', resource: 'crystal', percent: r(stats.output) },
    { kind: 'buildTime', percent: r(stats.buildTime) },
  ];
}

/** Nazwa zasięgu do interfejsu. */
export const auraReachName = (reach: AuraReach) => ['brak', 'planeta pod stacją', 'cały układ', 'układ i sąsiednie układy'][reach]!;
