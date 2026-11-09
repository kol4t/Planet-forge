// Stacje wyspecjalizowane (etap 4 planu stacji, decyzje właściciela 2026-11-09).
// - Statek konstrukcyjny (stocznia, po badaniu „Wydobycie z kosmosu”) leci z miejsca stacji macierzystej na pas asteroid
//   albo do gazowego olbrzyma i rozkłada zalążek stacji (poz. 1); statek się zużywa.
// - 4a: stacja górnicza na pasie — urobek metalu i kryształów trafia do magazynu stacji macierzystej (do jego
//   pojemności). Dawna „stacja na pasie” planety zostaje osobno (decyzja właściciela).
// - 4b: stacja gazowa przy gazowym olbrzymie — wytwarza antymaterię (decyzja właściciela: bez nowego zasobu); trafia
//   do wspólnego portfela antymaterii imperium.
// - Limit stacji z badań stacji; najwyżej jedna stacja na obiekt (pas / olbrzym).
// - Rozbudowa poz. 1–10 płacona z magazynu stacji macierzystej.
// Czysta logika, liczby robocze.
import type { Resources } from '../types.ts';

export type OutpostKind = 'mining' | 'gas';

/** Urobek stacji: metal i kryształy (górnicza) albo antymateria (gazowa). */
export type OutpostYield = Resources & { antimatter: number };

export interface Outpost {
  /** Klucz miejsca: `pas:<układ>` albo `gaz:<adres olbrzyma>`. */
  site: string;
  kind: OutpostKind;
  system: number;
  /** Adres gazowego olbrzyma (stacja gazowa). */
  target?: string;
  /** Przylot statku konstrukcyjnego (od tej chwili stacja działa na poz. 1). */
  arrivesAt: number;
  /** Docelowy poziom i chwila jego osiągnięcia (rozbudowa). */
  level: number;
  readyAt: number;
  /** Ostatnie naliczenie urobku (ms). */
  collectedAt: number;
}

export const OUTPOSTS = {
  /** Badania stacji, z których każde daje 1 miejsce na stację wyspecjalizowaną. */
  limitResearch: ['st-space-mining', 'st-belt-station', 'st-gas-harvest', 'st-outpost'] as readonly string[],
  kinds: {
    mining: {
      name: 'Stacja górnicza',
      research: 'st-belt-station',
      /** Urobek na godzinę na poz. 1 i wzrost na poziom. */
      perHour: { metal: 600, crystal: 300 } as Resources,
      antimatterPerHour: 0,
      growth: 1.3,
    },
    gas: {
      name: 'Stacja gazowa',
      research: 'st-gas-harvest',
      perHour: { metal: 0, crystal: 0 } as Resources,
      /** Antymateria na godzinę na poz. 1 (dla porównania: przyrost podstawowy imperium ~2,5/h). */
      antimatterPerHour: 0.6,
      growth: 1.25,
    },
  },
  upgrade: { cost: { metal: 15_000, crystal: 10_000 } as Resources, growth: 1.6, secondsPerLevel: 1800, maxLevel: 10 },
  /** Lot statku konstrukcyjnego trwa tyle razy dłużej niż transport (ciężki, powolny). */
  flightFactor: 2,
  status: 'robocza' as const,
};

export const siteKey = (kind: OutpostKind, system: number, target?: string) => (kind === 'mining' ? `pas:${system}` : `gaz:${target ?? system}`);

/** Działający poziom w chwili `at` (0 — statek jeszcze leci). */
export function outpostLevel(o: Outpost, at: number): number {
  if (at < o.arrivesAt) return 0;
  return at >= o.readyAt ? o.level : Math.max(1, o.level - 1);
}

/** Miejsca na stacje wyspecjalizowane z badań stacji. */
export function outpostLimit(done: readonly string[]): number {
  return OUTPOSTS.limitResearch.filter((id) => done.includes(id)).length;
}

export function outpostOutput(kind: OutpostKind, level: number): OutpostYield {
  if (level <= 0) return { metal: 0, crystal: 0, antimatter: 0 };
  const k = OUTPOSTS.kinds[kind];
  const f = k.growth ** (level - 1);
  return { metal: k.perHour.metal * f, crystal: k.perHour.crystal * f, antimatter: k.antimatterPerHour * f };
}

export function outpostUpgradeCost(level: number): Resources {
  const f = OUTPOSTS.upgrade.growth ** (level - 2);
  return { metal: Math.round(OUTPOSTS.upgrade.cost.metal * f), crystal: Math.round(OUTPOSTS.upgrade.cost.crystal * f) };
}

/** Urobek od `collectedAt` do `at` (z podziałem w chwili końca rozbudowy). */
export function outpostYield(o: Outpost, at: number): OutpostYield {
  const from = Math.max(o.collectedAt, o.arrivesAt);
  if (at <= from) return { metal: 0, crystal: 0, antimatter: 0 };
  const cuts = [from, ...(o.readyAt > from && o.readyAt < at ? [o.readyAt] : []), at];
  const out = { metal: 0, crystal: 0, antimatter: 0 };
  for (let i = 0; i < cuts.length - 1; i++) {
    const r = outpostOutput(o.kind, outpostLevel(o, cuts[i]!));
    const h = (cuts[i + 1]! - cuts[i]!) / 3_600_000;
    out.metal += r.metal * h;
    out.crystal += r.crystal * h;
    out.antimatter += r.antimatter * h;
  }
  return out;
}

export type SendResult = { ok: true; outpost: Outpost } | { ok: false; message: string };

/** Wysłanie statku konstrukcyjnego: warunki i nowa stacja (przylot po `seconds`). */
export function sendConstructionShip(
  outposts: readonly Outpost[],
  ctx: { kind: OutpostKind; system: number; target?: string; hasSite: boolean; done: readonly string[]; ships: number; stationReady: boolean; now: number; seconds: number },
): SendResult {
  const k = OUTPOSTS.kinds[ctx.kind];
  const gas = ctx.kind === 'gas';
  if (!ctx.stationReady) return { ok: false, message: 'Statek konstrukcyjny startuje ze stacji macierzystej — najpierw ją zbuduj.' };
  if (!ctx.done.includes(k.research)) return { ok: false, message: `${k.name}: najpierw badanie stacji „${gas ? 'Czerpanie gazu' : 'Stacja górnicza na pasie'}” (Badania stacji → Eksploracja).` };
  if (!ctx.hasSite) return { ok: false, message: gas ? 'Stację gazową stawia się tylko przy gazowym olbrzymie.' : 'W tym układzie nie ma pasa asteroid.' };
  const key = siteKey(ctx.kind, ctx.system, ctx.target);
  if (outposts.some((o) => o.site === key)) return { ok: false, message: gas ? 'Przy tym olbrzymie już jest Twoja stacja.' : 'Na tym pasie już jest Twoja stacja.' };
  const limit = outpostLimit(ctx.done);
  if (outposts.length >= limit) return { ok: false, message: `Masz już ${outposts.length} z ${limit} stacji wyspecjalizowanych — kolejne miejsca dają badania stacji (Eksploracja).` };
  if (ctx.ships <= 0) return { ok: false, message: 'Brak statku konstrukcyjnego — zbuduj go w stoczni (Imperium → Flota).' };
  const arrivesAt = ctx.now + ctx.seconds * 1000;
  return { ok: true, outpost: { site: key, kind: ctx.kind, system: ctx.system, ...(gas && ctx.target ? { target: ctx.target } : {}), arrivesAt, level: 1, readyAt: arrivesAt, collectedAt: arrivesAt } };
}

export type UpgradeResult = { ok: true; outpost: Outpost; cost: Resources; seconds: number } | { ok: false; message: string };

/** Rozbudowa stacji wyspecjalizowanej (płaci magazyn stacji macierzystej). */
export function upgradeOutpost(o: Outpost, stock: Resources, now: number): UpgradeResult {
  if (now < o.arrivesAt) return { ok: false, message: 'Statek konstrukcyjny jeszcze leci.' };
  if (now < o.readyAt) return { ok: false, message: 'Rozbudowa już trwa.' };
  if (o.level >= OUTPOSTS.upgrade.maxLevel) return { ok: false, message: 'To najwyższy poziom.' };
  const next = o.level + 1;
  const cost = outpostUpgradeCost(next);
  if (stock.metal < cost.metal || stock.crystal < cost.crystal) return { ok: false, message: `W magazynie stacji macierzystej brakuje surowców (potrzeba ${cost.metal} metalu i ${cost.crystal} kryształów).` };
  const seconds = OUTPOSTS.upgrade.secondsPerLevel * o.level;
  return { ok: true, outpost: { ...o, level: next, readyAt: now + seconds * 1000 }, cost, seconds };
}

/** Odczyt z zapisu z walidacją (błędne pomijane, jedna stacja na miejsce). */
export function parseOutposts(raw: unknown): Outpost[] {
  if (!Array.isArray(raw)) return [];
  const out: Outpost[] = [];
  for (const r of raw as Record<string, any>[]) {
    if (!r || typeof r !== 'object' || (r.kind !== 'mining' && r.kind !== 'gas')) continue;
    if (r.kind === 'gas' && typeof r.target !== 'string') continue;
    if (!Number.isInteger(r.system) || r.system < 1 || typeof r.site !== 'string') continue;
    if (![r.arrivesAt, r.readyAt, r.collectedAt].every(Number.isFinite) || !Number.isInteger(r.level)) continue;
    if (out.some((o) => o.site === r.site)) continue;
    out.push({ site: r.site, kind: r.kind, system: r.system, ...(r.kind === 'gas' ? { target: r.target } : {}), arrivesAt: r.arrivesAt, level: Math.min(OUTPOSTS.upgrade.maxLevel, Math.max(1, r.level)), readyAt: r.readyAt, collectedAt: r.collectedAt });
  }
  return out;
}
