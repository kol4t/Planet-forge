// Liczba pól planety (rozgrywka): ile budowli zmieści planeta — każdy poziom budynku zajmuje jedno pole.
// Osobny strumień losowania (`<typ>|<seed>|fields`) — nie zmienia żadnych innych cech planety.
// Tylko + − × ÷ i zaokrąglenie: ten sam wynik w każdej przeglądarce.
import { createRng } from '../random/rng.ts';
import type { PlanetDefinition } from '../types.ts';

/** Zakres liczby pól (decyzja właściciela): 30 i 200 rzadko, typowo ok. 100. */
export const FIELDS_MIN = 30;
export const FIELDS_MAX = 200;
/** Środek rozkładu i rozrzut w dół / w górę (zakres jest niesymetryczny: 70 pól w dół, 100 w górę). */
const FIELDS_CENTER = 100;
const SPREAD_DOWN = 20;
const SPREAD_UP = 32;
/** O ile pól różni się najmniejsza i największa planeta danego typu (przy tym samym losie). */
const SIZE_EFFECT = 70;

/**
 * Liczba pól: większa planeta = więcej pól (od −35 do +35 względem środka), do tego losowy rozrzut
 * o rozkładzie zbliżonym do normalnego (suma czterech losowań). Mediana ok. 100; ≤ 40 pól ma ok. 0,6%
 * planet, ≥ 180 — ok. 1%. Typ planety może ustalić liczbę pól dla konkretnego seeda (planeta startowa).
 */
export function planetFields(definition: PlanetDefinition, seed: string, radiusKm: number): number {
  const fixed = definition.generation.fixedFields?.[seed];
  if (fixed !== undefined) return fixed;
  const sizes = definition.generation.sizeClasses;
  const minR = Math.min(...sizes.map((s) => s.radiusKm[0]));
  const maxR = Math.max(...sizes.map((s) => s.radiusKm[1]));
  const t = maxR > minR ? Math.min(1, Math.max(0, (radiusKm - minR) / (maxR - minR))) : 0.5;
  const rng = createRng(`${definition.id}|${seed}|fields`);
  // Suma 4 liczb z [0, 1): średnia 2, odchylenie √(4/12) ≈ 0,577 → przeskalowana do N(0, 1).
  const z = (rng.next() + rng.next() + rng.next() + rng.next() - 2) / 0.5773502691896258;
  const value = FIELDS_CENTER + (t - 0.5) * SIZE_EFFECT + z * (z < 0 ? SPREAD_DOWN : SPREAD_UP);
  return Math.round(Math.min(FIELDS_MAX, Math.max(FIELDS_MIN, value)));
}
