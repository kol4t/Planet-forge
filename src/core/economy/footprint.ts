// Zajętość pól budynku (v0.45): liczba pól rośnie z poziomem w etapach (dane: `src/data/footprint.ts`).
// Obszar budynku to jeden spójny kawałek sąsiednich pól (`core/colony/plots.ts`). Czysta logika.
import { FOOTPRINT, LAST_STAGE_LEVELS, STAGE_NAMES } from '../../data/footprint.ts';
import type { BuildingId } from '../types.ts';

/** Etap budynku 0..3 (−1 — budynek jeszcze nie stoi). */
export function stageOf(id: BuildingId, level: number): number {
  const lv = Math.floor(level);
  if (lv < 1) return -1;
  let stage = 0;
  FOOTPRINT[id].forEach((s, i) => {
    if (lv >= s.from) stage = i;
  });
  return stage;
}

/** Ile pól zajmuje budynek na danym poziomie (rosnąco z poziomem; 0 — nie stoi). */
export function fieldsFor(id: BuildingId, level: number): number {
  const lv = Math.floor(level);
  const stage = stageOf(id, lv);
  if (stage < 0) return 0;
  const stages = FOOTPRINT[id];
  const s = stages[stage]!;
  const span = stage + 1 < stages.length ? stages[stage + 1]!.from - s.from : LAST_STAGE_LEVELS;
  const k = Math.min(lv - s.from, span - 1);
  return s.fields[0] + (span <= 1 ? 0 : Math.ceil(((s.fields[1] - s.fields[0]) * k) / (span - 1)));
}

/** Nazwa etapu (np. „Huta”). */
export function stageName(id: BuildingId, level: number): string {
  const stage = stageOf(id, level);
  return stage < 0 ? '' : STAGE_NAMES[id][stage]!;
}

/** Od którego poziomu zaczyna się następny etap (null — ostatni). */
export function nextStageFrom(id: BuildingId, level: number): number | null {
  const stage = stageOf(id, level);
  return FOOTPRINT[id][stage + 1]?.from ?? null;
}

/** Komunikat blokady: następny poziom potrzebuje więcej sąsiednich pól, niż jest wolnych obok budynku. */
export function noRoomMessage(id: BuildingId, name: string, level: number): string {
  const need = fieldsFor(id, level + 1);
  const have = fieldsFor(id, level);
  return (
    `${name} poz. ${level + 1} (${stageName(id, level + 1)}) potrzebuje ${need} ${need === 1 ? 'pola' : 'pól'} w jednym kawałku — ` +
    `obok budynku nie ma ${need - have === 1 ? 'wolnego pola' : `${need - have} wolnych pól`} lądu. Zwolnij miejsce (zburz poziom innego budynku) albo zbadaj budowę na lodzie.`
  );
}
