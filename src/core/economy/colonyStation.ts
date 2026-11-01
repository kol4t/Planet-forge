import type { Balance, ColonyStation, HomeStation, Resources } from '../types.ts';
import { stationReady } from './homeStation.ts';

/**
 * Stacje kolonii (etap 9, decyzje właściciela; nazwa robocza): mała stacja na orbicie kolonii — jedna przy każdej
 * planecie oprócz tej ze stacją macierzystą, budowana po gotowej stacji macierzystej (płaci kolonia). Działa jako
 * przekaźnik transportu: loty między tą kolonią a stacją macierzystą są szybsze i tańsze w paliwie.
 */

/** Stacja kolonii na planecie `address` gotowa w chwili `at`. */
export function colonyStationReady(list: readonly ColonyStation[], address: string, at: number): boolean {
  return list.some((s) => s.address === address && at >= s.readyAt);
}

/** Paliwo i czas lotu kolonia ↔ stacja macierzysta przez przekaźnik (paliwo zaokrąglone w górę, min. 1). */
export function relayFuel(fuel: number, balance: Balance): number {
  return Math.max(1, Math.ceil(fuel * balance.colonyStation.fuelFactor));
}

export function relaySeconds(seconds: number, balance: Balance): number {
  return Math.max(1, Math.round(seconds * balance.colonyStation.timeFactor));
}

export type ColonyStationResult = { ok: true; station: ColonyStation; cost: Resources; seconds: number } | { ok: false; message: string };

/** Budowa stacji kolonii nad planetą `address` (warunki: gotowa stacja macierzysta, nie jej planeta, jedna na kolonię). */
export function buildColonyStation(
  list: readonly ColonyStation[],
  ctx: { address: string; home: HomeStation | null; stock: Resources; now: number },
  balance: Balance,
): ColonyStationResult {
  const rule = balance.colonyStation;
  if (!ctx.home) return { ok: false, message: 'Najpierw zbuduj stację macierzystą — stacje kolonii łączą się z nią.' };
  if (!stationReady(ctx.home, ctx.now)) return { ok: false, message: 'Stacja macierzysta jest jeszcze w budowie.' };
  if (ctx.home.address === ctx.address) return { ok: false, message: 'Nad tą planetą krąży stacja macierzysta — stacja kolonii nie jest tu potrzebna.' };
  const existing = list.find((s) => s.address === ctx.address);
  if (existing) return { ok: false, message: ctx.now < existing.readyAt ? 'Stacja kolonii jest już w budowie.' : 'Ta kolonia ma już stację.' };
  const missing = [
    ctx.stock.metal < rule.cost.metal ? `${Math.ceil(rule.cost.metal - ctx.stock.metal)} metalu` : '',
    ctx.stock.crystal < rule.cost.crystal ? `${Math.ceil(rule.cost.crystal - ctx.stock.crystal)} kryształów` : '',
  ].filter(Boolean);
  if (missing.length > 0) return { ok: false, message: `Brakuje: ${missing.join(' i ')}.` };
  return { ok: true, station: { address: ctx.address, readyAt: ctx.now + rule.seconds * 1000 }, cost: rule.cost, seconds: rule.seconds };
}

/** Stacje kolonii z zapisu — błędne i powtórzone adresy pomijane. */
export function parseColonyStations(raw: unknown): ColonyStation[] {
  if (!Array.isArray(raw)) return [];
  const seen = new Set<string>();
  const out: ColonyStation[] = [];
  for (const s of raw as any[]) {
    if (!s || typeof s.address !== 'string' || !/^\d{1,3}:\d{1,4}:\d{1,2}$/.test(s.address) || typeof s.readyAt !== 'number' || !Number.isFinite(s.readyAt)) continue;
    if (seen.has(s.address)) continue;
    seen.add(s.address);
    out.push({ address: s.address, readyAt: s.readyAt });
  }
  return out;
}
