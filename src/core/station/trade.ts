// Dok handlowy (etap 3a planu stacji, decyzje właściciela 2026-11-09): moduł stacji (po badaniu „Dok handlowy”)
// i stały rynek — wymiana metalu i kryształów z magazynu stacji oraz sprzedaż antymaterii (po badaniu „Handel
// antymaterią”). Kurs = wartości towarów × wahania (co 6 h, z czasu świata — takie same dla wszystkich) × (1 − marża);
// marża maleje z poziomem doku i po badaniu „Kursy wymiany”. Kupcy z lepszymi ofertami — krok 3b. Czysta logika.
import { stationLevelAt } from '../economy/asteroids.ts';
import type { HomeStation, Resources } from '../types.ts';

export type TradeGood = 'metal' | 'crystal' | 'antimatter';

/** Liczby rynku (robocze, strojenie na końcu). */
export const TRADE = {
  /** Wartość jednostki w jednostkach metalu. */
  value: { metal: 1, crystal: 2, antimatter: 1500 } as Record<TradeGood, number>,
  /** Marża rynku: na poz. 1, mniej o `perLevel` z każdym poziomem, najmniej `min`; badanie „Kursy wymiany” — `research`. */
  spread: { base: 0.3, perLevel: 0.04, min: 0.08, research: 0.05 },
  /** Wahania kursu: co `periodMs` nowa wartość w granicach ±`drift`. */
  periodMs: 6 * 3600 * 1000,
  drift: 0.2,
  dock: { cost: { metal: 20_000, crystal: 30_000 } as Resources, costGrowth: 1.6, secondsPerLevel: 1800, maxLevel: 5 },
  status: 'robocza' as const,
};

export const dockLevel = (station: HomeStation | null, at: number) => (station && at >= station.core.readyAt ? stationLevelAt(station.dock, at) : 0);

export function dockCost(level: number): Resources {
  const f = TRADE.dock.costGrowth ** (level - 1);
  return { metal: Math.round(TRADE.dock.cost.metal * f), crystal: Math.round(TRADE.dock.cost.crystal * f) };
}

/** Wahanie kursu towaru w okresie (deterministyczne z numeru okresu): 1 ± drift. */
export function driftFactor(good: TradeGood, at: number): number {
  if (good === 'metal') return 1;
  const period = Math.floor(at / TRADE.periodMs);
  let h = (period * 2654435761 + (good === 'crystal' ? 97 : 193)) >>> 0;
  h = Math.imul(h ^ (h >>> 15), 2246822519) >>> 0;
  h = Math.imul(h ^ (h >>> 13), 3266489917) >>> 0;
  const t = ((h ^ (h >>> 16)) >>> 0) / 4294967295;
  return 1 + TRADE.drift * (t * 2 - 1);
}

/** Marża rynku przy danym poziomie doku. */
export function marketSpread(level: number, ratesResearch: boolean): number {
  const s = TRADE.spread;
  return Math.max(s.min, s.base - s.perLevel * Math.max(0, level - 1) - (ratesResearch ? s.research : 0));
}

/** Ile `take` za 1 `give` na stałym rynku w chwili `at`. */
export function marketRate(give: TradeGood, take: TradeGood, at: number, level: number, ratesResearch: boolean): number {
  const worth = (g: TradeGood) => TRADE.value[g] * driftFactor(g, at);
  return (worth(give) / worth(take)) * (1 - marketSpread(level, ratesResearch));
}

export type TradeResult = { ok: true; received: number; rate: number } | { ok: false; message: string };

/**
 * Wymiana na rynku: dok działa, towar do sprzedania jest (metal i kryształy — w magazynie stacji, antymateria —
 * w portfelu `wallet`), antymateria tylko po badaniu, odbiór tylko metal / kryształy i mieści się w magazynie stacji.
 */
export function marketTrade(
  ctx: { level: number; stock: Resources; wallet: number; capacity: number; antimatterTrade: boolean; ratesResearch: boolean; at: number },
  give: TradeGood,
  amount: number,
  take: 'metal' | 'crystal',
): TradeResult {
  if (ctx.level <= 0) return { ok: false, message: 'Najpierw zbuduj dok handlowy (Moduły stacji).' };
  if (give === take) return { ok: false, message: 'Wybierz dwa różne towary.' };
  if (!(amount > 0)) return { ok: false, message: 'Podaj ilość do wymiany.' };
  if (give === 'antimatter' && !ctx.antimatterTrade) return { ok: false, message: 'Sprzedaż antymaterii odblokowuje badanie „Handel antymaterią” (Badania stacji → Handel).' };
  const have = give === 'antimatter' ? ctx.wallet : ctx.stock[give];
  if (amount > have + 1e-9) return { ok: false, message: give === 'antimatter' ? `Masz tylko ${Math.floor(have * 10) / 10} antymaterii.` : `W magazynie stacji jest tylko ${Math.floor(have)} ${give === 'metal' ? 'metalu' : 'kryształów'}.` };
  const rate = marketRate(give, take, ctx.at, ctx.level, ctx.ratesResearch);
  const received = Math.floor(amount * rate);
  if (received <= 0) return { ok: false, message: 'Za mało, żeby kupiec coś za to dał.' };
  const room = ctx.capacity - ctx.stock[take] + (give === take ? amount : 0);
  if (received > room) return { ok: false, message: `Magazyn stacji zmieści jeszcze tylko ${Math.max(0, Math.floor(room))} ${take === 'metal' ? 'metalu' : 'kryształów'}.` };
  return { ok: true, received, rate };
}
