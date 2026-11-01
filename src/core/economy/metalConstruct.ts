// Megakonstrukt kopalni metalu (etap 3 kompleksu, decyzje właściciela 2026-11-01): po komplecie 4 osad (poz. 40, 20 pól)
// na placu w środku powstaje megakonstrukt — budowa 1–2 h (kopalnia pracuje), po ukończeniu kompleks przechodzi
// w układ promienisty (faza „konstrukt”) i działa jak dawny megakompleks: +60% i znaleziska. Zastępuje megakompleks
// kopalni metalu (od poz. 20). Nie da się go przenieść (wyrzucenie na orbitę — krok 3b). Czysta logika, liczby robocze.
import { canBuildConstruct, type MetalComplexSave } from '../colony/complexLayout.ts';
import { createRng } from '../random/rng.ts';
import type { Balance, Resources } from '../types.ts';

/** Czas budowy (s) — stały dla planety, w przedziale `constructSeconds` (strumień `gameplay` seeda). */
export function constructSeconds(seed: string, balance: Balance): number {
  const { min, max } = balance.metalComplex.constructSeconds;
  const t = createRng(seed).fork('gameplay').fork('metalConstruct').next();
  return Math.round((min + (max - min) * t) / 60) * 60;
}

export interface ConstructContext {
  /** Badanie „Megastruktury” zbadane. */
  unlocked: boolean;
  level: number;
  /** Działa wielka fabryka (kompleks kopalni metalu). */
  complexActive: boolean;
  save: MetalComplexSave | undefined;
  stock: Resources;
  /** Pola układu promienistego zajęte przez inne budynki (konstrukt by na nie wszedł). */
  blocked: number;
}

export type ConstructCheck = { ok: true; cost: Resources; seconds: number } | { ok: false; message: string };

/** Czy można zacząć budowę megakonstruktu: badanie, wielka fabryka, komplet osad, wolne miejsce, surowce. */
export function checkConstruct(ctx: ConstructContext, seed: string, balance: Balance): ConstructCheck {
  const save = ctx.save;
  if (save?.phase === 'konstrukt') return { ok: false, message: 'Megakonstrukt już działa.' };
  if (save?.build) return { ok: false, message: 'Megakonstrukt jest już w budowie.' };
  if (!ctx.unlocked) return { ok: false, message: 'Najpierw zbadaj „Megastruktury” (Badania → Produktywność).' };
  if (!ctx.complexActive) return { ok: false, message: 'Najpierw uruchom wielką fabrykę (kompleks kopalni metalu).' };
  if (!save || !canBuildConstruct(ctx.level)) return { ok: false, message: 'Megakonstrukt stanie po komplecie 4 osad — Kopalnia metalu poz. 40 (20 pól).' };
  if (ctx.blocked > 0) {
    return { ok: false, message: `Układ wokół megakonstruktu zajmuje ${ctx.blocked} ${ctx.blocked === 1 ? 'pole' : 'pól'} innych budynków — zwolnij je (zburz poziom).` };
  }
  const cost = balance.metalComplex.constructCost;
  const missing = [
    ctx.stock.metal < cost.metal ? `${Math.ceil(cost.metal - ctx.stock.metal)} metalu` : '',
    ctx.stock.crystal < cost.crystal ? `${Math.ceil(cost.crystal - ctx.stock.crystal)} kryształów` : '',
  ].filter(Boolean);
  if (missing.length > 0) return { ok: false, message: `Megakonstrukt — brakuje: ${missing.join(', ')}.` };
  return { ok: true, cost: { ...cost }, seconds: constructSeconds(seed, balance) };
}

/** Postęp budowy 0..1 (null — nic się nie buduje). */
export function constructProgress(save: MetalComplexSave | undefined, now: number): number | null {
  const b = save?.build;
  if (!b) return null;
  return Math.min(1, Math.max(0, (now - b.startedAt) / Math.max(1, b.readyAt - b.startedAt)));
}
