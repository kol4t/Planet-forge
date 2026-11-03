// Megakonstrukt kryształów (v0.69, decyzje właściciela 2026-11-02/03, `docs/megakonstrukt-krysztalow.md`): wiertnica
// zawieszona na linach nad lejem w obszarze Ekstraktora. Warunki jak megakonstrukt metalu (poz. 40, „Megastruktury”,
// działający kompleks), odwrotne ceny, budowa 1–2 h (ekstraktor pracuje). Po ukończeniu ekstraktor działa jak
// megakompleks (+60%, znaleziska). Lej rośnie etapami 1→4 z wydobyciem złoża kryształów (od startu konstruktu do progu
// wyeksploatowania), na etapie 4 sięga jądra planety. Lej zostaje na zawsze: jego pól nie da się zabudować, także gdy
// wiertnica odleci na orbitę albo ekstraktor zostanie zburzony. Czysta logika, liczby robocze.
import { createRng } from '../random/rng.ts';
import type { Balance, Resources } from '../types.ts';

/** `budowa` — wiertnica powstaje; `konstrukt` — pracuje nad lejem; `lej` — wiertnica odleciała, został lej. */
export type CrystalPhase = 'budowa' | 'konstrukt' | 'lej';
export type CraterStage = 1 | 2 | 3 | 4;

export interface CrystalComplexSave {
  phase: CrystalPhase;
  /** Pola leja (obszar Ekstraktora w chwili budowy) — zajęte na zawsze. */
  cells: number[];
  /** Pole środka leja. */
  center: number;
  /** Kryształy wydobyte ze złoża planety w chwili, gdy wiertnica zaczęła pracę (od tego liczy się wzrost leja). */
  minedAt: number;
  /** Największy osiągnięty etap leja (lej się nie zmniejsza). */
  stage: CraterStage;
  /** Budowa w toku: start, koniec (ms), zapłacony koszt (zwrot przy anulowaniu); `fresh` — lej powstał z tą budową. */
  build?: { startedAt: number; readyAt: number; cost: Resources; fresh?: boolean };
}

export const CRYSTAL_PHASES: readonly CrystalPhase[] = ['budowa', 'konstrukt', 'lej'];

/** Czas budowy (s) — stały dla planety, w przedziale `constructSeconds` (strumień `gameplay` seeda, osobny od metalu). */
export function crystalConstructSeconds(seed: string, balance: Balance): number {
  const { min, max } = balance.crystalComplex.constructSeconds;
  const t = createRng(seed).fork('gameplay').fork('crystalConstruct').next();
  return Math.round((min + (max - min) * t) / 60) * 60;
}

export interface CrystalConstructContext {
  /** Badanie „Megastruktury” zbadane. */
  unlocked: boolean;
  /** Poziom Ekstraktora kryształów. */
  level: number;
  /** Działa kompleks Ekstraktora kryształów. */
  complexActive: boolean;
  save: CrystalComplexSave | undefined;
  stock: Resources;
  /** Wiertnica tej planety jest przygotowywana do startu albo na tę planetę leci wiertnica z orbity. */
  busy: boolean;
}

export type CrystalConstructCheck = { ok: true; cost: Resources; seconds: number } | { ok: false; message: string };

/** Czy można zacząć budowę wiertnicy: nic tu nie stoi ani nie leci, badanie, kompleks, poz. 40, surowce. */
export function checkCrystalConstruct(ctx: CrystalConstructContext, seed: string, balance: Balance): CrystalConstructCheck {
  const save = ctx.save;
  if (save?.phase === 'konstrukt') return { ok: false, message: 'Megakonstrukt kryształów już działa.' };
  if (save?.phase === 'budowa') return { ok: false, message: 'Megakonstrukt kryształów jest już w budowie.' };
  if (ctx.busy) return { ok: false, message: 'Na tę planetę leci już wiertnica z orbity.' };
  if (!ctx.unlocked) return { ok: false, message: 'Najpierw zbadaj „Megastruktury” (Badania → Produktywność).' };
  if (!ctx.complexActive) return { ok: false, message: 'Najpierw uruchom kompleks Ekstraktora kryształów.' };
  const need = balance.crystalComplex.level;
  if (ctx.level < need) return { ok: false, message: `Megakonstrukt kryształów stanie od Ekstraktora kryształów poz. ${need}.` };
  const cost = balance.crystalComplex.constructCost;
  const missing = [
    ctx.stock.metal < cost.metal ? `${Math.ceil(cost.metal - ctx.stock.metal)} metalu` : '',
    ctx.stock.crystal < cost.crystal ? `${Math.ceil(cost.crystal - ctx.stock.crystal)} kryształów` : '',
  ].filter(Boolean);
  if (missing.length > 0) return { ok: false, message: `Megakonstrukt kryształów — brakuje: ${missing.join(', ')}.` };
  return { ok: true, cost: { ...cost }, seconds: crystalConstructSeconds(seed, balance) };
}

/** Postęp budowy 0..1 (null — nic się nie buduje). */
export function crystalBuildProgress(save: CrystalComplexSave | undefined, now: number): number | null {
  const b = save?.phase === 'budowa' ? save.build : undefined;
  if (!b) return null;
  return Math.min(1, Math.max(0, (now - b.startedAt) / Math.max(1, b.readyAt - b.startedAt)));
}

/**
 * Etap leja z wydobycia: postęp = kryształy wydobyte od startu wiertnicy / (próg wyeksploatowania złoża − stan na
 * starcie); co `1/stages` postępu lej rośnie o etap (etap 4 — jądro). Nigdy mniej niż już osiągnięty etap.
 */
export function craterStageFor(save: CrystalComplexSave, mined: number, deposit: number, balance: Balance): CraterStage {
  const goal = deposit * balance.exploitation.threshold - save.minedAt;
  const progress = goal > 0 ? (mined - save.minedAt) / goal : 1;
  const stages = balance.crystalComplex.stages;
  const stage = Math.max(1, Math.min(4, 1 + Math.floor(Math.max(0, progress) * stages))) as CraterStage;
  return Math.max(save.stage, stage) as CraterStage;
}

/** Pole środka leja: pole obszaru najbliżej środka ciężkości obszaru (`centers` — środki pól siatki). */
export function craterCenter(cells: readonly number[], centers: readonly (readonly number[])[]): number {
  if (cells.length === 0) return -1;
  const sum = [0, 0, 0];
  for (const c of cells) for (let k = 0; k < 3; k++) sum[k]! += centers[c]![k]!;
  let best = cells[0]!;
  let bestDot = -Infinity;
  for (const c of cells) {
    const p = centers[c]!;
    const d = p[0]! * sum[0]! + p[1]! * sum[1]! + p[2]! * sum[2]!;
    if (d > bestDot) {
      bestDot = d;
      best = c;
    }
  }
  return best;
}

/** Czy wiertnica tej planety może wystartować na orbitę: pracuje (faza „konstrukt”). */
export function crystalLaunchReason(save: CrystalComplexSave | undefined): string | null {
  return save?.phase === 'konstrukt' ? null : 'Na tej planecie nie ma pracującej wiertnicy kryształów.';
}

/** Czy na planecie może wylądować wiertnica: Ekstraktor poz. 40 z kompleksem, nic tu nie stoi, nie buduje się, nikt nie leci. */
export function crystalLandingReason(save: CrystalComplexSave | undefined, level: number, complexActive: boolean, incoming: boolean, balance: Balance): string | null {
  if (level < balance.crystalComplex.level) return `Wiertnica ląduje tylko nad Ekstraktorem kryształów poz. ${balance.crystalComplex.level}.`;
  if (!complexActive) return 'Wiertnica ląduje tylko nad działającym kompleksem Ekstraktora kryształów.';
  if (save?.phase === 'konstrukt') return 'Na tej planecie pracuje już wiertnica kryształów.';
  if (save?.phase === 'budowa') return 'Na tej planecie trwa budowa wiertnicy kryształów.';
  if (incoming) return 'Na tę planetę leci już wiertnica.';
  return null;
}

const num = (v: unknown): v is number => typeof v === 'number' && Number.isFinite(v);

/** Odczyt z zapisu (`cellCount` — liczba pól siatki planety); błędny — null. */
export function parseCrystalComplex(raw: unknown, cellCount: number): CrystalComplexSave | null {
  if (!raw || typeof raw !== 'object') return null;
  const r = raw as Record<string, any>;
  if (!CRYSTAL_PHASES.includes(r.phase)) return null;
  if (!Array.isArray(r.cells)) return null;
  const cells = [...new Set((r.cells as unknown[]).filter((c): c is number => Number.isInteger(c) && (c as number) >= 0 && (c as number) < cellCount))];
  if (cells.length === 0 || !Number.isInteger(r.center) || !cells.includes(r.center)) return null;
  const stage = [1, 2, 3, 4].includes(r.stage) ? (r.stage as CraterStage) : 1;
  const out: CrystalComplexSave = { phase: r.phase, cells, center: r.center, minedAt: num(r.minedAt) ? Math.max(0, r.minedAt) : 0, stage };
  const b = r.build;
  if (out.phase === 'budowa') {
    if (!b || !num(b.startedAt) || !num(b.readyAt) || b.readyAt < b.startedAt || !num(b.cost?.metal) || !num(b.cost?.crystal)) return null;
    out.build = { startedAt: b.startedAt, readyAt: b.readyAt, cost: { metal: Math.max(0, b.cost.metal), crystal: Math.max(0, b.cost.crystal) }, ...(b.fresh === true ? { fresh: true } : {}) };
  }
  return out;
}
