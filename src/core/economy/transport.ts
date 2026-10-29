// Transportowce (v0.36): przesyłanie metalu i kryształów między planetami gracza.
// Czysta logika — kontroler pobiera ładunek z planety nadawcy i dodaje go odbiorcy w chwili przylotu.
import type { Balance, Resources, Shipment } from '../types.ts';

const isNum = (v: unknown): v is number => typeof v === 'number' && Number.isFinite(v);
const ADDRESS = /^\d{1,3}:\d{1,4}:\d{1,2}$/;

/** Czas lotu transportowca (s) na odległość `distance` (jednostki mapy; ten sam układ = 0). */
export function transportSeconds(distance: number, balance: Balance): number {
  const t = balance.transport;
  return Math.round(t.baseSeconds + Math.max(0, distance) * t.secondsPerUnit);
}

export type ShipmentCheck = { ok: true; cargo: Resources } | { ok: false; message: string };

/**
 * Sprawdzenie przesyłki: ładunek w całych jednostkach, nie pusty, w ładowności,
 * nie większy niż zapas nadawcy, limit transportowców w drodze.
 */
export function checkShipment(
  cargo: Resources,
  stock: Resources,
  active: number,
  balance: Balance,
  sameSlot = false,
): ShipmentCheck {
  if (sameSlot) return { ok: false, message: 'Wybierz inną planetę — to jest planeta nadawcy.' };
  const load = { metal: Math.max(0, Math.floor(cargo.metal || 0)), crystal: Math.max(0, Math.floor(cargo.crystal || 0)) };
  if (load.metal + load.crystal <= 0) return { ok: false, message: 'Ustaw, ile metalu albo kryształów wysłać.' };
  const t = balance.transport;
  if (active >= t.maxActive) return { ok: false, message: `W drodze jest już ${active} transportowców (limit ${t.maxActive}). Poczekaj, aż któryś dotrze.` };
  if (load.metal + load.crystal > t.capacity) {
    return { ok: false, message: `Transportowiec zabiera najwyżej ${t.capacity} (metal + kryształy razem).` };
  }
  const missing: string[] = [];
  if (load.metal > stock.metal) missing.push(`${Math.ceil(load.metal - stock.metal)} metalu`);
  if (load.crystal > stock.crystal) missing.push(`${Math.ceil(load.crystal - stock.crystal)} kryształów`);
  if (missing.length > 0) return { ok: false, message: `Na planecie nadawcy brakuje: ${missing.join(', ')}.` };
  return { ok: true, cargo: load };
}

/** Przesyłki z zapisu — błędne pomijane. */
export function parseShipments(raw: unknown): Shipment[] {
  if (!Array.isArray(raw)) return [];
  return raw.flatMap((s: any) =>
    s &&
    typeof s.from === 'string' &&
    typeof s.to === 'string' &&
    ADDRESS.test(s.from) &&
    ADDRESS.test(s.to) &&
    isNum(s.departedAt) &&
    isNum(s.arrivesAt) &&
    s.arrivesAt >= s.departedAt &&
    isNum(s.cargo?.metal) &&
    isNum(s.cargo?.crystal) &&
    s.cargo.metal >= 0 &&
    s.cargo.crystal >= 0
      ? [
          {
            from: s.from,
            to: s.to,
            departedAt: s.departedAt,
            arrivesAt: s.arrivesAt,
            cargo: { metal: s.cargo.metal, crystal: s.cargo.crystal },
            // Lot na stację macierzystą albo ze stacji (v0.55) — opcjonalne; inne wartości pomijane.
            ...(s.station === 'to' || s.station === 'from' ? { station: s.station } : {}),
            // Statek floty i eskorta (v0.58) — opcjonalne.
            ...(s.ship === true ? { ship: true } : {}),
            ...(Number.isInteger(s.escort) && s.escort > 0 && s.escort <= 999 ? { escort: s.escort } : {}),
          },
        ]
      : [],
  );
}
