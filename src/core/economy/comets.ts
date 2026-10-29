// Przechwyt komet (v0.37.1): holownik z planety przyciąga kometę i wraca z ładunkiem.
// Działa w każdym układzie (także bez pasa asteroid). Ładunek ustalony przy wysłaniu — deterministycznie.
import { createRng } from '../random/rng.ts';
import type { Balance, CometHaul, Resources } from '../types.ts';

const isNum = (v: unknown): v is number => typeof v === 'number' && Number.isFinite(v);
const ADDRESS = /^\d{1,3}:\d{1,4}:\d{1,2}$/;

/** Ładunek komety z adresu planety i chwili wysłania (ten sam wynik przy każdym liczeniu). */
export function cometCargo(planet: string, departedAt: number, balance: Balance): Resources {
  const rng = createRng(`kometa|${planet}|${departedAt}`);
  const { cargoMin: lo, cargoMax: hi } = balance.comet;
  return { metal: Math.round(rng.range(lo.metal, hi.metal)), crystal: Math.round(rng.range(lo.crystal, hi.crystal)) };
}

export interface CometContext {
  unlocked: boolean;
  /** Holownik tej planety już leci (jeden naraz na planetę). */
  busy: boolean;
  stock: Resources;
  now: number;
}

export type CometResult = { ok: true; haul: CometHaul } | { ok: false; message: string };

/** Wysłanie holownika: warunki → koszt (pobiera kontroler) → wyprawa z ładunkiem znanym od startu. */
export function launchComet(planet: string, ctx: CometContext, balance: Balance): CometResult {
  if (!ctx.unlocked) return { ok: false, message: 'Najpierw zbadaj „Przechwyt komet” (Badania → Stacja i handel).' };
  if (ctx.busy) return { ok: false, message: 'Holownik tej planety już leci po kometę.' };
  const cost = balance.comet.cost;
  const missing: string[] = [];
  if (ctx.stock.metal < cost.metal) missing.push(`${Math.ceil(cost.metal - ctx.stock.metal)} metalu`);
  if (ctx.stock.crystal < cost.crystal) missing.push(`${Math.ceil(cost.crystal - ctx.stock.crystal)} kryształów`);
  if (missing.length > 0) return { ok: false, message: `Holownik — brakuje: ${missing.join(', ')}.` };
  return {
    ok: true,
    haul: { planet, departedAt: ctx.now, returnsAt: ctx.now + balance.comet.seconds * 1000, cargo: cometCargo(planet, ctx.now, balance) },
  };
}

/** Holowniki z zapisu — błędne pomijane. */
export function parseComets(raw: unknown): CometHaul[] {
  if (!Array.isArray(raw)) return [];
  return raw.flatMap((c: any) =>
    c &&
    typeof c.planet === 'string' &&
    ADDRESS.test(c.planet) &&
    isNum(c.departedAt) &&
    isNum(c.returnsAt) &&
    c.returnsAt >= c.departedAt &&
    isNum(c.cargo?.metal) &&
    isNum(c.cargo?.crystal) &&
    c.cargo.metal >= 0 &&
    c.cargo.crystal >= 0
      ? [{ planet: c.planet, departedAt: c.departedAt, returnsAt: c.returnsAt, cargo: { metal: c.cargo.metal, crystal: c.cargo.crystal }, ...(c.ship === true ? { ship: true } : {}) }]
      : [],
  );
}
