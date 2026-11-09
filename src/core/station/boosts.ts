// Wzmocnienia budowli za antymaterię (krok 3c planu stacji, decyzje właściciela 2026-11-09).
// - Kupowane w doku handlowym za antymaterię (stała lista, część z ryzykiem); kupcy czasem mają lepsze — mocniejsze
//   i bez skutków ubocznych — za antymaterię albo kredyty.
// - Dwa rodzaje: na jeden budynek albo na całą planetę (wszystkie budynki wydobycia). Bez limitu — mnożniki się mnożą.
// - Ryzyko losowane przy zakupie, skutek po końcu działania (zawsze po pełnej nagrodzie): awaria na kilka godzin,
//   utrata 1–3 poziomów, zniszczenie budynku albo szybsze wyczerpanie złoża.
// Czysta logika; liczby i nazwy robocze (balans na końcu).
import type { BuildingId } from '../types.ts';

export type BoostRiskKind = 'outage' | 'levels' | 'destroy' | 'deplete';

export interface BoostRisk {
  chance: number;
  kind: BoostRiskKind;
  /** Awaria — godziny; poziomy — najwyżej tyle (1..amount); złoże — ułamek całego złoża. */
  amount: number;
}

export interface BoostDef {
  id: string;
  name: string;
  scope: 'building' | 'planet';
  /** Mnożnik wydobycia. */
  factor: number;
  hours: number;
  antimatter: number;
  risk: BoostRisk | null;
  /** Tylko kopalnie (metal, kryształy). */
  minesOnly?: boolean;
  description: string;
  status: 'robocza';
}

/** Budynki, które można wzmocnić (wydobycie i energia). */
export const BOOSTABLE: readonly BuildingId[] = ['metalMine', 'crystalMine', 'powerPlant', 'antimatterCollector'];

export const BOOSTS: readonly BoostDef[] = [
  { id: 'steady', name: 'Stabilny wzmacniacz', scope: 'building', factor: 1.25, hours: 4, antimatter: 3, risk: null, description: 'Bezpieczny, łagodny.', status: 'robocza' },
  { id: 'overdrive', name: 'Przeciążenie', scope: 'building', factor: 1.8, hours: 2, antimatter: 5, risk: { chance: 0.1, kind: 'outage', amount: 4 }, description: 'Budynek pracuje ponad normę — może się zepsuć.', status: 'robocza' },
  { id: 'deep-pull', name: 'Głębokie wydobycie', scope: 'building', factor: 2.5, hours: 3, antimatter: 8, risk: { chance: 0.15, kind: 'deplete', amount: 0.05 }, minesOnly: true, description: 'Szybko, ale część złoża może przepaść.', status: 'robocza' },
  { id: 'critical', name: 'Rozruch krytyczny', scope: 'building', factor: 3, hours: 2, antimatter: 12, risk: { chance: 0.12, kind: 'levels', amount: 3 }, description: 'Ogromna moc — ryzyko utraty poziomów.', status: 'robocza' },
  { id: 'ignition', name: 'Zapłon antymaterii', scope: 'building', factor: 5, hours: 1, antimatter: 20, risk: { chance: 0.08, kind: 'destroy', amount: 0 }, description: 'Najmocniejsze — budynek może ulec zniszczeniu.', status: 'robocza' },
  { id: 'surge', name: 'Fala wydobycia', scope: 'planet', factor: 1.4, hours: 3, antimatter: 15, risk: { chance: 0.1, kind: 'outage', amount: 3 }, description: 'Cała planeta pracuje szybciej; awaria trafi jeden budynek.', status: 'robocza' },
  { id: 'storm', name: 'Burza produkcyjna', scope: 'planet', factor: 2, hours: 2, antimatter: 30, risk: { chance: 0.12, kind: 'levels', amount: 2 }, description: 'Podwójne wydobycie planety; jeden budynek może stracić poziomy.', status: 'robocza' },
];

export const BOOST_RULES = {
  /** Awaria zamiast utraty poziomów / zniszczenia, gdy budynek jest w budowie albo ma megakonstrukt (h). */
  shieldOutageHours: 6,
  /** Wersja od kupca: mocniejsza o tyle (mnożnik × (1 + better)) i bez ryzyka; cena × `merchantPrice`. */
  better: 0.2,
  merchantPrice: 1.5,
  /** Kredyty za 1 antymaterię w cenie wzmocnienia u kupca. */
  creditsPerAntimatter: 150,
  status: 'robocza' as const,
};

export const findBoost = (id: string) => BOOSTS.find((b) => b.id === id);

/** Działające albo zakończone wzmocnienie / awaria w zapisie imperium. */
export interface ActiveBoost {
  /** Id definicji; `outage` — awaria po nieudanym wzmocnieniu. */
  def: string;
  name: string;
  address: string;
  /** Budynek; null — cała planeta. */
  building: BuildingId | null;
  startsAt: number;
  endsAt: number;
  /** Mnożnik wydobycia (awaria — 0). */
  factor: number;
  risk: BoostRisk | null;
  /** Wylosowane przy zakupie (0..1) — skutek, gdy < risk.chance. */
  roll: number;
  /** Budynek, który trafi skutek (planeta — wylosowany przy zakupie). */
  target: BuildingId | null;
  resolved?: boolean;
}

export type BuyBoostResult = { ok: true; boost: ActiveBoost } | { ok: false; message: string };

/**
 * Kupno wzmocnienia: budynek pasuje i stoi, starcza antymaterii (albo kredytów u kupca). `roll` i `pick` — losowanie
 * (0..1) ryzyka i budynku, który trafi skutek wzmocnienia planety.
 */
export function buyBoost(
  def: BoostDef,
  ctx: { address: string; building: BuildingId | null; levels: Partial<Record<BuildingId, number>>; antimatter: number; now: number; roll: number; pick: number; price?: number },
): BuyBoostResult {
  const price = ctx.price ?? def.antimatter;
  if (def.scope === 'building') {
    if (!ctx.building || !BOOSTABLE.includes(ctx.building)) return { ok: false, message: 'Wybierz budynek wydobycia: kopalnię, Ekstraktor, elektrownię albo kolektor.' };
    if (def.minesOnly && ctx.building !== 'metalMine' && ctx.building !== 'crystalMine') return { ok: false, message: `${def.name} działa tylko na kopalnie metalu i kryształów.` };
    if ((ctx.levels[ctx.building] ?? 0) <= 0) return { ok: false, message: 'Ten budynek jeszcze nie stoi.' };
  }
  const standing = BOOSTABLE.filter((b) => (ctx.levels[b] ?? 0) > 0 && (!def.minesOnly || b === 'metalMine' || b === 'crystalMine'));
  if (standing.length === 0) return { ok: false, message: 'Na planecie nie ma budynków wydobycia.' };
  if (ctx.antimatter < price) return { ok: false, message: `Potrzeba ${price} antymaterii, masz ${Math.floor(ctx.antimatter * 10) / 10}.` };
  const target = def.scope === 'building' ? ctx.building : standing[Math.min(standing.length - 1, Math.floor(ctx.pick * standing.length))]!;
  return {
    ok: true,
    boost: {
      def: def.id,
      name: def.name,
      address: ctx.address,
      building: def.scope === 'building' ? ctx.building : null,
      startsAt: ctx.now,
      endsAt: ctx.now + def.hours * 3_600_000,
      factor: def.factor,
      risk: def.risk,
      roll: ctx.roll,
      target,
    },
  };
}

/** Wersja wzmocnienia od kupca: mocniejsza, bez ryzyka, droższa. */
export function betterBoost(def: BoostDef): BoostDef {
  return { ...def, id: def.id, name: `${def.name} (kupiecki)`, factor: Math.round(def.factor * (1 + BOOST_RULES.better) * 100) / 100, risk: null, antimatter: Math.ceil(def.antimatter * BOOST_RULES.merchantPrice) };
}

/** Mnożnik wydobycia budynku planety w chwili `at` (iloczyn działających wzmocnień i awarii). */
export function boostFactor(boosts: readonly ActiveBoost[], address: string, building: BuildingId, at: number): number {
  let f = 1;
  for (const b of boosts) {
    if (b.address !== address || at < b.startsAt || at >= b.endsAt) continue;
    if (b.building === null ? b.def !== 'outage' && BOOSTABLE.includes(building) : b.building === building) f *= b.factor;
  }
  return f;
}

/** Chwile zmian mnożników planety (początki i końce) — do dzielenia naliczania produkcji. */
export function boostSplits(boosts: readonly ActiveBoost[], address: string): number[] {
  return boosts.filter((b) => b.address === address).flatMap((b) => [b.startsAt, b.endsAt]);
}

export interface BoostOutcome {
  kind: BoostRiskKind | 'none';
  building: BuildingId | null;
  /** Utracone poziomy / godziny awarii / ułamek złoża. */
  amount: number;
}

/** Skutek po końcu wzmocnienia: brak, gdy los był łaskawy albo bez ryzyka. */
export function boostOutcome(b: ActiveBoost): BoostOutcome {
  if (b.def === 'outage' || !b.risk || b.roll >= b.risk.chance) return { kind: 'none', building: null, amount: 0 };
  const r = b.risk;
  // Wielkość skutku z tej samej liczby losowej (im niższa, tym gorzej).
  const severity = 1 - b.roll / r.chance;
  const amount = r.kind === 'levels' ? 1 + Math.min(r.amount - 1, Math.floor(severity * r.amount)) : r.amount;
  return { kind: r.kind, building: b.target, amount };
}

/** Awaria (wpis z mnożnikiem 0) po skutku `outage` albo zamiast utraty poziomów (osłona). */
export function outageBoost(address: string, building: BuildingId, at: number, hours: number): ActiveBoost {
  return { def: 'outage', name: 'Awaria', address, building, startsAt: at, endsAt: at + hours * 3_600_000, factor: 0, risk: null, roll: 1, target: null };
}

/** Odczyt z zapisu z walidacją (błędne pomijane). */
export function parseBoosts(raw: unknown): ActiveBoost[] {
  if (!Array.isArray(raw)) return [];
  const out: ActiveBoost[] = [];
  const isBuilding = (v: unknown): v is BuildingId => typeof v === 'string' && ['metalMine', 'crystalMine', 'powerPlant', 'storage', 'antimatterCollector', 'laboratory'].includes(v);
  for (const r of raw as Record<string, any>[]) {
    if (!r || typeof r !== 'object') continue;
    if (typeof r.def !== 'string' || typeof r.address !== 'string' || !Number.isFinite(r.startsAt) || !Number.isFinite(r.endsAt) || !Number.isFinite(r.factor) || r.factor < 0) continue;
    const risk = r.risk && ['outage', 'levels', 'destroy', 'deplete'].includes(r.risk.kind) && Number.isFinite(r.risk.chance) && Number.isFinite(r.risk.amount) ? { chance: r.risk.chance, kind: r.risk.kind as BoostRiskKind, amount: r.risk.amount } : null;
    out.push({
      def: r.def,
      name: typeof r.name === 'string' ? r.name : r.def,
      address: r.address,
      building: isBuilding(r.building) ? r.building : null,
      startsAt: r.startsAt,
      endsAt: r.endsAt,
      factor: r.factor,
      risk,
      roll: Number.isFinite(r.roll) ? Math.min(1, Math.max(0, r.roll)) : 1,
      target: isBuilding(r.target) ? r.target : null,
      ...(r.resolved === true ? { resolved: true } : {}),
    });
  }
  return out;
}
