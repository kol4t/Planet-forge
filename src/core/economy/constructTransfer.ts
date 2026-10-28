// Transfer megakonstruktu (v0.56, decyzja właściciela): gotowy megakompleks można wysłać na inną planetę gracza.
// Rozkładanie do lotu trwa `prepareSeconds` (budynek nie pracuje; anulowanie zwraca koszty), potem lot zależny od
// odległości; na planecie nadawcy zostają puste pola, na celu konstrukt staje z tym samym poziomem i megakompleksem —
// także na oceanie i lawie, ale tylko gdy cel ma dość wolnych pól. Koszt: paliwo i część kosztu budynku.
// Czysta logika: koszty, czasy, miejsce na celu, odczyt z zapisu.
import { fieldsFor } from './footprint.ts';
import { fuelCost } from './fuel.ts';
import { transportSeconds } from './transport.ts';
import { upgradeCost } from './economy.ts';
import { reconcilePlots, type Plots } from '../colony/plots.ts';
import type { BuildRules, FieldGrid } from '../colony/fieldGrid.ts';
import type { Balance, BuildingId, BuildingLevels, ConstructTransfer, Resources } from '../types.ts';

/** Surowce na rozłożenie konstruktu: `costShare` × koszt ostatniego (osiągniętego) poziomu budynku. */
export function transferCost(id: BuildingId, level: number, balance: Balance): Resources {
  const c = upgradeCost(id, Math.max(0, level - 1), balance);
  const share = balance.transfer.costShare;
  return { metal: Math.round(c.metal * share), crystal: Math.round(c.crystal * share) };
}

/** Paliwo (antymateria) za lot konstruktu: `fuelFactor` × paliwo transportowca na tej odległości. */
export const transferFuel = (distance: number, balance: Balance) => balance.transfer.fuelFactor * fuelCost('transport', distance, balance);

/** Czas lotu konstruktu (s) — ciężki ładunek leci wolniej niż transportowiec. */
export const transferFlightSeconds = (distance: number, balance: Balance) => Math.round(transportSeconds(distance, balance) * balance.transfer.speedFactor);

/** Zasady pól dla planety z megakonstruktami po transferze (stoją na każdym polu). */
export function withAnywhere(rules: BuildRules, afloat: readonly BuildingId[] | undefined): BuildRules {
  return afloat && afloat.length > 0 ? { ...rules, anywhere: [...new Set([...(rules.anywhere ?? []), ...afloat])] } : rules;
}

/**
 * Miejsce na celu: ile pól potrzebuje konstrukt (`fieldsFor` jego poziomu) i ile dostanie (spójny obszar wolnych pól
 * dowolnego rodzaju — ląd, lód, woda, lawa). Budynek tego samego typu na celu zostaje zastąpiony (jego pola się zwalniają).
 */
export function transferRoom(
  grid: FieldGrid,
  plots: Plots,
  levels: BuildingLevels,
  id: BuildingId,
  level: number,
  order: readonly BuildingId[],
  rules: BuildRules,
): { needed: number; available: number } {
  const { [id]: _replaced, ...rest } = plots;
  const placed = reconcilePlots(grid, rest, { ...levels, [id]: level }, order, withAnywhere(rules, [id]));
  return { needed: fieldsFor(id, level), available: placed[id]?.length ?? 0 };
}

const isNum = (v: unknown): v is number => typeof v === 'number' && Number.isFinite(v);
const ADDRESS = /^\d{1,3}:\d{1,4}:\d{1,2}$/;

/** Transfery z zapisu — błędne pomijane. */
export function parseTransfers(raw: unknown, buildings: readonly BuildingId[]): ConstructTransfer[] {
  if (!Array.isArray(raw)) return [];
  const out: ConstructTransfer[] = [];
  for (const t of raw as any[]) {
    if (!t || typeof t.from !== 'string' || !ADDRESS.test(t.from) || typeof t.to !== 'string' || !ADDRESS.test(t.to) || t.from === t.to) continue;
    if (!buildings.includes(t.building) || !Number.isInteger(t.level) || t.level < 1 || t.level > 100) continue;
    if (typeof t.family !== 'string' || !isNum(t.startedAt) || !isNum(t.departsAt) || !isNum(t.arrivesAt) || t.arrivesAt < t.departsAt) continue;
    if (!isNum(t.cost?.metal) || !isNum(t.cost?.crystal) || !isNum(t.fuel)) continue;
    out.push({
      from: t.from,
      to: t.to,
      building: t.building,
      level: t.level,
      family: t.family,
      ...(typeof t.mode === 'string' ? { mode: t.mode } : {}),
      startedAt: t.startedAt,
      departsAt: t.departsAt,
      arrivesAt: t.arrivesAt,
      cost: { metal: Math.max(0, t.cost.metal), crystal: Math.max(0, t.cost.crystal) },
      fuel: Math.max(0, t.fuel),
      ...(t.departed === true ? { departed: true } : {}),
    });
  }
  return out;
}
