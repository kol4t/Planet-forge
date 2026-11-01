import { parseIncident } from './missionRisk.ts';
// Megakonstrukt kopalni metalu na orbicie (krok 3b, decyzje właściciela 2026-11-01): konstrukt nie da się przenieść
// inaczej niż „wyrzucając” go na orbitę i ściągając na inną planetę. Wyrzucenie: przygotowanie 30 min (konstrukt nie daje
// premii; anulowanie zwraca paliwo), start za antymaterię — na planecie zostają 4 osady z pustym placem. Ściągnięcie: tylko
// na planetę z kompletem osad (Kopalnia metalu poz. 40, faza osad, bez budowy konstruktu), lot zależny od odległości za
// antymaterię; po lądowaniu osady przechodzą w układ promienisty (+60%, znaleziska). Czysta logika, liczby robocze.
import { canBuildConstruct, type MetalComplexSave } from '../colony/complexLayout.ts';
import { fuelCost } from './fuel.ts';
import { transportSeconds } from './transport.ts';
import type { Balance, OrbitalConstruct } from '../types.ts';

export type OrbitalState = 'przygotowanie' | 'na_orbicie' | 'w_locie';

export function orbitalState(o: OrbitalConstruct, now: number): OrbitalState {
  if (now < o.readyAt) return 'przygotowanie';
  return o.target ? 'w_locie' : 'na_orbicie';
}

/** Paliwo lądowania i czas lotu z orbity planety `origin` na planetę w odległości `distance`. */
export const landingFuel = (distance: number, balance: Balance) => balance.metalComplex.orbit.landingFuelFactor * fuelCost('transport', distance, balance);
export const landingSeconds = (distance: number, balance: Balance) => Math.round(transportSeconds(distance, balance) * balance.metalComplex.orbit.speedFactor);

/** Czy konstrukt z planety można wyrzucić: działa (faza „konstrukt”), nie startuje już. */
export function launchCheck(save: MetalComplexSave | undefined, launching: boolean, antimatter: number, balance: Balance): { ok: true; fuel: number } | { ok: false; message: string } {
  if (save?.phase !== 'konstrukt') return { ok: false, message: 'Na tej planecie nie ma megakonstruktu.' };
  if (launching) return { ok: false, message: 'Megakonstrukt jest już przygotowywany do startu.' };
  const fuel = balance.metalComplex.orbit.launchFuel;
  if (antimatter < fuel) return { ok: false, message: `Brak paliwa: start kosztuje ${fuel} antymaterii, brakuje ${Math.ceil(fuel - antimatter)}.` };
  return { ok: true, fuel };
}

/** Czy na planecie może wylądować konstrukt: komplet 4 osad (poz. 40), faza osad, bez budowy, nikt tu nie leci. */
export function landingCheck(save: MetalComplexSave | undefined, level: number, incoming: boolean): string | null {
  if (!save || !canBuildConstruct(level)) return 'Konstrukt ląduje tylko na komplecie 4 osad — Kopalnia metalu poz. 40.';
  if (save.phase === 'konstrukt') return 'Na tej planecie stoi już megakonstrukt.';
  if (save.build) return 'Na placu trwa budowa megakonstruktu.';
  if (incoming) return 'Na tę planetę leci już megakonstrukt.';
  return null;
}

const ADDRESS = /^\d{1,3}:\d{1,4}:\d{1,2}$/;
const isNum = (v: unknown): v is number => typeof v === 'number' && Number.isFinite(v);

/** Konstrukty na orbicie z zapisu — błędne pomijane. */
export function parseOrbiting(raw: unknown): OrbitalConstruct[] {
  if (!Array.isArray(raw)) return [];
  const out: OrbitalConstruct[] = [];
  for (const o of raw as any[]) {
    if (!o || typeof o.origin !== 'string' || !ADDRESS.test(o.origin) || !isNum(o.readyAt) || !isNum(o.fuel)) continue;
    const flying = typeof o.target === 'string' && ADDRESS.test(o.target) && isNum(o.landsAt) && o.landsAt >= o.readyAt;
    out.push({
      origin: o.origin,
      readyAt: o.readyAt,
      fuel: Math.max(0, o.fuel),
      ...(flying ? { target: o.target, landsAt: o.landsAt } : {}),
      ...(o.lifted === true ? { lifted: true } : {}),
      ...(flying && parseIncident(o.incident) ? { incident: parseIncident(o.incident)! } : {}),
    });
  }
  return out;
}
