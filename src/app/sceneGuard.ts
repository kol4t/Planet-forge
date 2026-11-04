// Osłona pętli scen (v0.69.2, audyt 2026-11 punkt 2): wyjątek w `update()` sceny Phaser zatrzymywał po cichu odświeżanie
// paneli (Phaser go nie łapie). Teraz błąd trafia do dziennika diagnostyki (raz na treść), gracz widzi komunikat
// z odświeżeniem, a scena próbuje działać dalej w następnej klatce. Bez DOM — komunikat pokazuje `onError` (main.ts).

export interface Guardable {
  update?: (...args: never[]) => unknown;
}

/**
 * Owija `update` podanych scen. `onError(message, where, first)` — przy każdym błędzie; `first` = pierwszy raz
 * z tą treścią (do zapisu w diagnostyce bez zalewania dziennika co klatkę). Zwraca liczbę owiniętych scen.
 */
export function guardScenes(scenes: Record<string, Guardable>, onError: (message: string, where: string, first: boolean) => void): number {
  const seen = new Set<string>();
  let count = 0;
  for (const [name, scene] of Object.entries(scenes)) {
    const original = scene.update;
    if (typeof original !== 'function') continue;
    scene.update = function (this: unknown, ...args: never[]) {
      try {
        return original.apply(this, args);
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        const key = `${name}|${message}`;
        const first = !seen.has(key);
        seen.add(key);
        onError(message, `scena ${name}`, first);
        return undefined;
      }
    } as typeof original;
    count++;
  }
  return count;
}
