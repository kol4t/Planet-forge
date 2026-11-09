// Statki ładunkowe (krok 2d-2 planu stacji, decyzje właściciela 2026-11-09): transportowiec, kurier (3× szybszy,
// 1/5 ładowności), ciężki transportowiec (2× ładunek, 1,5× wolniej, 1,5× paliwa). Konwój (badanie „Konwoje”): kilka
// statków w jednym locie — ładunek się sumuje, lot w tempie najwolniejszego, ryzyko piratów liczone raz, eskorta
// chroni całość, paliwo za każdy statek. Czysta logika.
import type { Balance, CargoFleet, CargoShip, Fleet } from '../types.ts';

export const CARGO_SHIPS: readonly CargoShip[] = ['transport', 'courier', 'heavyTransport'];

const DEFAULT_CARGO = {
  ships: { transport: { capacity: 1, time: 1, fuel: 1 }, courier: { capacity: 1, time: 1, fuel: 1 }, heavyTransport: { capacity: 1, time: 1, fuel: 1 } },
  convoyMax: 1,
};
const rules = (balance: Balance) => balance.fleet.cargo ?? DEFAULT_CARGO;

/** Ile statków w składzie (tylko dodatnie liczby całkowite). */
export function cargoCount(ships: CargoFleet): number {
  return CARGO_SHIPS.reduce((n, t) => n + Math.max(0, Math.floor(ships[t] ?? 0)), 0);
}

/** Ładowność składu (z ładownością transportowca po badaniach — `balance.transport.capacity`). */
export function cargoCapacity(ships: CargoFleet, balance: Balance): number {
  const r = rules(balance);
  return Math.floor(CARGO_SHIPS.reduce((sum, t) => sum + Math.max(0, ships[t] ?? 0) * balance.transport.capacity * r.ships[t].capacity, 0));
}

/** Mnożnik czasu lotu: tempo najwolniejszego statku w składzie. */
export function cargoTimeFactor(ships: CargoFleet, balance: Balance): number {
  const r = rules(balance);
  const used = CARGO_SHIPS.filter((t) => (ships[t] ?? 0) > 0);
  return used.length === 0 ? 1 : Math.max(...used.map((t) => r.ships[t].time));
}

/** Mnożnik paliwa: suma za każdy statek (paliwo transportowca × mnożnik typu). */
export function cargoFuelFactor(ships: CargoFleet, balance: Balance): number {
  const r = rules(balance);
  const n = CARGO_SHIPS.reduce((sum, t) => sum + Math.max(0, ships[t] ?? 0) * r.ships[t].fuel, 0);
  return n > 0 ? n : 1;
}

/**
 * Czy skład można wysłać: statki na stanie, odblokowane typy, konwój tylko po badaniu i najwyżej `convoyMax`.
 * `locked` — typ statku, którego jeszcze nie odblokowano (komunikat), `convoy` — zbadane „Konwoje”.
 */
export function cargoFleetProblem(ships: CargoFleet, fleet: Fleet, balance: Balance, convoy: boolean): string | null {
  const count = cargoCount(ships);
  if (count <= 0) return 'Wybierz statek do lotu.';
  if (count > 1 && !convoy) return 'Kilka statków w jednym locie to konwój — najpierw zbadaj „Konwoje” (Badania stacji → Flota).';
  const max = rules(balance).convoyMax;
  if (count > max) return `Konwój może mieć najwyżej ${max} statków.`;
  for (const t of CARGO_SHIPS) {
    const want = Math.floor(ships[t] ?? 0);
    if (want > (fleet.docked[t] ?? 0)) return `Za mało statków na stanie (${t === 'transport' ? 'transportowce' : t === 'courier' ? 'kurierzy' : 'ciężkie transportowce'}: ${fleet.docked[t] ?? 0}).`;
  }
  return null;
}

/** Skład z zapisu (brak — jeden transportowiec, jak przed krokiem 2d-2). */
export function parseCargoFleet(raw: unknown): CargoFleet | null {
  if (!raw || typeof raw !== 'object') return null;
  const out: CargoFleet = {};
  for (const t of CARGO_SHIPS) {
    const v = (raw as Record<string, unknown>)[t];
    if (typeof v === 'number' && Number.isInteger(v) && v > 0 && v <= 20) out[t] = v;
  }
  return cargoCount(out) > 0 ? out : null;
}
