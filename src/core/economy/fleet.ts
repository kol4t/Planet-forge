// Flota (v0.58, decyzja właściciela): statki budowane w stoczni — module stacji macierzystej — i trzymane na stanie
// imperium. Lot zabiera statek z floty (transportowiec i holownik wracają po locie, statek kolonizacyjny zostaje na
// nowej kolonii), eskorta leci z transportem albo megakonstruktem. Czysta logika: stocznia, kolejka budowy, odczyt.
import type { Balance, Fleet, HomeStation, Resources, ShipOrder, ShipType } from '../types.ts';
import { stationLevelAt } from './asteroids.ts';

const TYPES: readonly ShipType[] = ['transport', 'colonyShip', 'tug', 'escort'];
const isNum = (v: unknown): v is number => typeof v === 'number' && Number.isFinite(v);

/** Flota na start gry (i dla zapisów sprzed v0.58 — tyle, ile dawało się wysłać naraz). */
export const starterFleet = (balance: Balance): Fleet => ({ docked: { ...balance.fleet.starter }, queue: [] });

/** Działający poziom stoczni w chwili `at` (0 — brak; rdzeń stacji musi działać). */
export function shipyardLevel(station: HomeStation | null, at: number): number {
  if (!station || at < station.core.readyAt) return 0;
  return stationLevelAt(station.shipyard, at);
}

export function shipyardCost(level: number, balance: Balance): Resources {
  const f = balance.fleet;
  const k = f.shipyardCostGrowth ** (level - 1);
  return { metal: Math.round(f.shipyardCost.metal * k), crystal: Math.round(f.shipyardCost.crystal * k) };
}

/** Czas budowy statku (s) w stoczni danego poziomu — wyższy poziom buduje szybciej. */
export function shipSeconds(type: ShipType, level: number, balance: Balance): number {
  const f = balance.fleet;
  return Math.round(f.ships[type].seconds / (1 + f.speedPerLevel * Math.max(0, level - 1)));
}

const missingText = (cost: Resources, stock: Resources) =>
  [stock.metal < cost.metal ? `${Math.ceil(cost.metal - stock.metal)} metalu` : '', stock.crystal < cost.crystal ? `${Math.ceil(cost.crystal - stock.crystal)} kryształów` : '']
    .filter(Boolean)
    .join(', ');

export type ShipyardResult = { ok: true; station: HomeStation; cost: Resources; seconds: number } | { ok: false; message: string };

/** Budowa albo rozbudowa stoczni o poziom (płaci aktywna planeta). */
export function upgradeShipyard(station: HomeStation | null, ctx: { stock: Resources; now: number }, balance: Balance): ShipyardResult {
  if (!station) return { ok: false, message: 'Stocznia jest modułem stacji macierzystej — najpierw zbuduj stację (Imperium).' };
  if (ctx.now < station.core.readyAt) return { ok: false, message: 'Rdzeń stacji jest jeszcze w budowie.' };
  const current = station.shipyard;
  if (current && ctx.now < current.readyAt) return { ok: false, message: 'Stocznia jest właśnie rozbudowywana.' };
  const level = (current?.level ?? 0) + 1;
  const f = balance.fleet;
  if (level > f.shipyardMaxLevel) return { ok: false, message: `Stocznia ma już najwyższy poziom (${f.shipyardMaxLevel}).` };
  const cost = shipyardCost(level, balance);
  const missing = missingText(cost, ctx.stock);
  if (missing) return { ok: false, message: `Stocznia poz. ${level} — brakuje: ${missing}.` };
  const seconds = f.shipyardSecondsPerLevel * level;
  return { ok: true, station: { ...station, shipyard: { level, readyAt: ctx.now + seconds * 1000 } }, cost, seconds };
}

export type OrderResult = { ok: true; fleet: Fleet; order: ShipOrder } | { ok: false; message: string };

/** Zamówienie statku: stocznia działa, miejsce w kolejce, surowce (płaci aktywna planeta); startuje po poprzednim. */
export function orderShip(fleet: Fleet, type: ShipType, ctx: { shipyard: number; stock: Resources; now: number }, balance: Balance): OrderResult {
  if (ctx.shipyard <= 0) return { ok: false, message: 'Najpierw zbuduj stocznię na stacji macierzystej (Imperium → Flota).' };
  if (fleet.queue.length >= balance.fleet.queue) return { ok: false, message: `Kolejka stoczni jest pełna (${balance.fleet.queue} statków).` };
  const cost = balance.fleet.ships[type].cost;
  const missing = missingText(cost, ctx.stock);
  if (missing) return { ok: false, message: `Brakuje: ${missing}.` };
  const last = fleet.queue[fleet.queue.length - 1];
  const startsAt = Math.max(ctx.now, last?.readyAt ?? 0);
  const order: ShipOrder = { type, startsAt, readyAt: startsAt + shipSeconds(type, ctx.shipyard, balance) * 1000, cost };
  return { ok: true, fleet: { ...fleet, queue: [...fleet.queue, order] }, order };
}

/** Statki gotowe do `now` trafiają do floty. */
export function completeOrders(fleet: Fleet, now: number): { fleet: Fleet; done: ShipOrder[] } {
  const done = fleet.queue.filter((o) => o.readyAt <= now);
  if (done.length === 0) return { fleet, done };
  const docked = { ...fleet.docked };
  for (const o of done) docked[o.type]++;
  return { fleet: { docked, queue: fleet.queue.filter((o) => o.readyAt > now) }, done };
}

/** Anulowanie zamówienia (zwrot kosztu); następne zamówienia przesuwają się wcześniej o jego czas. */
export function cancelOrder(fleet: Fleet, index: number, now: number): { fleet: Fleet; refund: Resources } | null {
  const order = fleet.queue[index];
  if (!order) return null;
  // W budowie jest tylko pierwszy statek; kolejne startują po poprzednim — po anulowaniu wcześniej o jego czas.
  const kept = fleet.queue.filter((_, i) => i !== index);
  let at = index > 0 ? kept[index - 1]!.readyAt : now;
  const queue = kept.map((o, i) => {
    if (i < index) return o;
    const startsAt = Math.max(at, now);
    at = startsAt + (o.readyAt - o.startsAt);
    return { ...o, startsAt, readyAt: at };
  });
  return { fleet: { ...fleet, queue }, refund: order.cost };
}

/** Flota z zapisu (brak albo błędna — `null`: kontroler daje flotę startową). */
export function parseFleet(raw: any): Fleet | null {
  if (!raw || typeof raw !== 'object' || !raw.docked || typeof raw.docked !== 'object') return null;
  const docked = Object.fromEntries(TYPES.map((t) => [t, Number.isInteger(raw.docked[t]) && raw.docked[t] >= 0 && raw.docked[t] <= 999 ? raw.docked[t] : 0])) as Record<ShipType, number>;
  const queue: ShipOrder[] = (Array.isArray(raw.queue) ? raw.queue : [])
    .filter((o: any) => o && TYPES.includes(o.type) && isNum(o.startsAt) && isNum(o.readyAt) && o.readyAt >= o.startsAt && isNum(o.cost?.metal) && isNum(o.cost?.crystal))
    .map((o: any) => ({ type: o.type, startsAt: o.startsAt, readyAt: o.readyAt, cost: { metal: Math.max(0, o.cost.metal), crystal: Math.max(0, o.cost.crystal) } }));
  return { docked, queue };
}
