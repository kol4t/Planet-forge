// Kredyty i kupcy (krok 3b planu stacji, decyzje właściciela 2026-11-09).
// Kredyty (nazwa robocza) — waluta-przedmiot: leży w magazynie stacji, nie jest przypisana do konta; powstaje ze sprzedaży
// na rynku, z zamówień kupców i z opłat za premię stacji. Rynek doku: sprzedaż metalu / kryształów / antymaterii za
// kredyty i kupno metalu / kryształów za kredyty (wymiana surowiec ↔ surowiec idzie przez kredyty).
// Kupcy przylatują co ok. 6 h i zostają 4 h — wizyty wynikają z czasu świata (takie same pod nieobecność), każda
// z 2–3 lepszymi ofertami, czasem statkiem na sprzedaż i jednym zamówieniem z nagrodą. Czysta logika, liczby robocze.
import { createRng } from '../random/rng.ts';
import type { Resources, ShipType } from '../types.ts';
import { driftFactor, marketSpread, TRADE, type TradeGood } from './trade.ts';

export const MERCHANTS = {
  /** Wartość 1 kredytu w jednostkach metalu. */
  creditValue: 10,
  periodMs: 6 * 3600 * 1000,
  stayMs: 4 * 3600 * 1000,
  /** Czas na wykonanie zamówienia od przyjęcia (ms). */
  contractMs: 12 * 3600 * 1000,
  /** Opłata za premię stacji: kredytów na godzinę od planety w pełnym zasięgu (×udział). */
  feePerHour: 12,
  /** Lepsza cena u kupca niż na rynku (ułamek). */
  bonus: 0.15,
  status: 'robocza' as const,
};

/** Robocze nazwy kupców (lore — do uzgodnienia w Projekcie lore). */
const NAMES = ['Karawana „Szary Szlak”', 'Kupiec z Pasa Ruin', 'Barka „Długi Rejs”', 'Kompania Odzysku', 'Wędrowny skład „Echo”', 'Handlarz z Dalekiej Orbity'];

const credit = MERCHANTS.creditValue;

/** Kredyty za 1 jednostkę towaru na rynku (sprzedaż). */
export function sellPrice(good: TradeGood, at: number, level: number, ratesResearch: boolean): number {
  return ((TRADE.value[good] * driftFactor(good, at)) / credit) * (1 - marketSpread(level, ratesResearch) / 2);
}

/** Kredyty za 1 jednostkę towaru na rynku (kupno). */
export function buyPrice(good: 'metal' | 'crystal', at: number, level: number, ratesResearch: boolean): number {
  return ((TRADE.value[good] * driftFactor(good, at)) / credit) * (1 + marketSpread(level, ratesResearch) / 2);
}

export type OfferKind = 'sell' | 'buy';

export interface MerchantOffer {
  /** `sell` — kupiec kupuje od Ciebie (dajesz towar, dostajesz kredyty); `buy` — sprzedaje Tobie (za kredyty). */
  kind: OfferKind;
  good: TradeGood;
  /** Ile towaru najwyżej w tej ofercie. */
  amount: number;
  /** Kredyty za całą ofertę. */
  credits: number;
}

export interface MerchantContract {
  want: 'metal' | 'crystal';
  amount: number;
  reward: { credits: number; antimatter: number; bonus: 'speedup' | 'find' | null };
}

export interface MerchantVisit {
  index: number;
  name: string;
  arrivesAt: number;
  leavesAt: number;
  offers: MerchantOffer[];
  ship: { type: ShipType; credits: number } | null;
  contract: MerchantContract;
}

/** Numer wizyty i czy kupiec jest teraz przy doku. */
export function merchantAt(at: number): { index: number; present: boolean; arrivesAt: number; leavesAt: number; nextAt: number } {
  const index = Math.floor(at / MERCHANTS.periodMs);
  const arrivesAt = index * MERCHANTS.periodMs;
  const leavesAt = arrivesAt + MERCHANTS.stayMs;
  return { index, present: at < leavesAt, arrivesAt, leavesAt, nextAt: arrivesAt + MERCHANTS.periodMs };
}

/** Wizyta kupca o numerze `index` (deterministyczna; wielkość ofert rośnie z poziomem doku). */
export function merchantVisit(index: number, dockLevel: number): MerchantVisit {
  const rng = createRng(`kupiec-${index}`);
  const scale = 1 + 0.5 * Math.max(0, dockLevel - 1);
  const at = index * MERCHANTS.periodMs;
  const goods: TradeGood[] = ['metal', 'crystal', 'antimatter'];
  const count = 2 + (rng.next() < 0.5 ? 1 : 0);
  const offers: MerchantOffer[] = [];
  for (let i = 0; i < count; i++) {
    const kind: OfferKind = rng.next() < 0.5 ? 'sell' : 'buy';
    const good: TradeGood = kind === 'buy' ? (rng.next() < 0.5 ? 'metal' : 'crystal') : goods[Math.floor(rng.next() * goods.length)]!;
    const base = good === 'antimatter' ? 5 + Math.floor(rng.next() * 10) : Math.round((good === 'metal' ? 20_000 : 10_000) * (0.5 + rng.next()) * scale);
    const unit = (TRADE.value[good] * driftFactor(good, at)) / credit;
    const credits = Math.round(base * unit * (kind === 'sell' ? 1 + MERCHANTS.bonus : 1 - MERCHANTS.bonus));
    offers.push({ kind, good, amount: base, credits });
  }
  const shipRoll = rng.next();
  const ship: MerchantVisit['ship'] =
    shipRoll < 0.4 ? { type: (['transport', 'escort', 'courier'] as const)[Math.floor(rng.next() * 3)]!, credits: Math.round((300 + rng.next() * 300) * scale) } : null;
  const want = rng.next() < 0.5 ? 'metal' : 'crystal';
  const amount = Math.round((want === 'metal' ? 60_000 : 30_000) * (0.6 + rng.next() * 0.8) * scale);
  const worth = (amount * TRADE.value[want]) / credit;
  const bonusRoll = rng.next();
  const contract: MerchantContract = {
    want,
    amount,
    reward: { credits: Math.round(worth * 1.3), antimatter: 5 + Math.floor(rng.next() * 10), bonus: bonusRoll < 0.35 ? 'speedup' : bonusRoll < 0.6 ? 'find' : null },
  };
  return { index, name: NAMES[Math.floor(rng.next() * NAMES.length)]!, arrivesAt: at, leavesAt: at + MERCHANTS.stayMs, offers, ship, contract };
}

/** Stan kupców w zapisie stacji: zużyte oferty bieżącej wizyty i przyjęte zamówienie. */
export interface MerchantSave {
  visit: number;
  used: number[];
  shipSold?: boolean;
  contract?: { visit: number; acceptedAt: number; contract: MerchantContract };
}

export function parseMerchantSave(raw: unknown): MerchantSave | null {
  if (!raw || typeof raw !== 'object') return null;
  const r = raw as Record<string, any>;
  if (!Number.isInteger(r.visit)) return null;
  const used = Array.isArray(r.used) ? (r.used as unknown[]).filter((x): x is number => Number.isInteger(x) && (x as number) >= 0 && (x as number) < 5) : [];
  const c = r.contract;
  const okContract =
    c && Number.isInteger(c.visit) && Number.isFinite(c.acceptedAt) && (c.contract?.want === 'metal' || c.contract?.want === 'crystal') && Number.isFinite(c.contract?.amount) && Number.isFinite(c.contract?.reward?.credits);
  return {
    visit: r.visit,
    used,
    ...(r.shipSold === true ? { shipSold: true } : {}),
    ...(okContract
      ? {
          contract: {
            visit: c.visit,
            acceptedAt: c.acceptedAt,
            contract: {
              want: c.contract.want,
              amount: Math.max(1, c.contract.amount),
              reward: { credits: Math.max(0, c.contract.reward.credits), antimatter: Math.max(0, Number(c.contract.reward.antimatter) || 0), bonus: c.contract.reward.bonus === 'speedup' || c.contract.reward.bonus === 'find' ? c.contract.reward.bonus : null },
            },
          },
        }
      : {}),
  };
}

export type CreditResult = { ok: true; credits: number } | { ok: false; message: string };

const GOOD_NAME: Record<TradeGood, string> = { metal: 'metalu', crystal: 'kryształów', antimatter: 'antymaterii' };

/**
 * Sprzedaż na rynku za kredyty: dok działa, towar jest (metal i kryształy — magazyn stacji, antymateria — portfel,
 * po badaniu „Handel antymaterią”). Zwraca kredyty do dopisania.
 */
export function marketSell(
  ctx: { level: number; stock: Resources; wallet: number; antimatterTrade: boolean; ratesResearch: boolean; at: number },
  good: TradeGood,
  amount: number,
): CreditResult {
  if (ctx.level <= 0) return { ok: false, message: 'Najpierw zbuduj dok handlowy (Moduły stacji).' };
  if (!(amount > 0)) return { ok: false, message: 'Podaj ilość.' };
  if (good === 'antimatter' && !ctx.antimatterTrade) return { ok: false, message: 'Sprzedaż antymaterii odblokowuje badanie „Handel antymaterią” (Badania stacji → Handel).' };
  const have = good === 'antimatter' ? ctx.wallet : ctx.stock[good];
  if (amount > have + 1e-9) return { ok: false, message: `Masz tylko ${Math.floor(have)} ${GOOD_NAME[good]}${good === 'antimatter' ? '' : ' w magazynie stacji'}.` };
  const credits = Math.floor(amount * sellPrice(good, ctx.at, ctx.level, ctx.ratesResearch));
  if (credits <= 0) return { ok: false, message: 'Za mało, żeby dostać choć 1 kredyt.' };
  return { ok: true, credits };
}

/** Kupno metalu / kryształów za kredyty (towar trafia do magazynu stacji). Zwraca koszt w kredytach. */
export function marketBuy(
  ctx: { level: number; stock: Resources; credits: number; capacity: number; ratesResearch: boolean; at: number },
  good: 'metal' | 'crystal',
  amount: number,
): CreditResult {
  if (ctx.level <= 0) return { ok: false, message: 'Najpierw zbuduj dok handlowy (Moduły stacji).' };
  if (!(amount > 0)) return { ok: false, message: 'Podaj ilość.' };
  const cost = Math.ceil(amount * buyPrice(good, ctx.at, ctx.level, ctx.ratesResearch));
  if (cost > ctx.credits) return { ok: false, message: `Potrzeba ${cost} kredytów, na stacji jest ${Math.floor(ctx.credits)}.` };
  const room = ctx.capacity - ctx.stock[good];
  if (amount > room) return { ok: false, message: `Magazyn stacji zmieści jeszcze tylko ${Math.max(0, Math.floor(room))} ${GOOD_NAME[good]}.` };
  return { ok: true, credits: cost };
}

/** Kredyty z opłat za premię stacji za okres `ms`: suma udziałów planet w zasięgu × stawka (robocze). */
export function auraFees(shares: readonly number[], ms: number): number {
  const sum = shares.reduce((a, s) => a + Math.max(0, s), 0);
  return (sum * MERCHANTS.feePerHour * Math.max(0, ms)) / 3_600_000;
}

/** Zamówienie przyjęte i jeszcze nie przeterminowane. */
export function contractOpen(save: MerchantSave | undefined, at: number): boolean {
  return !!save?.contract && at < save.contract.acceptedAt + MERCHANTS.contractMs;
}
