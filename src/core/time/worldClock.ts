// Wspólny czas świata (v0.34). Jedno źródło czasu dla ruchu planet (a dalej ekspedycji):
// położenia wylicza się z czasu, nie z liczby klatek ani chwili otwarcia ekranu.
// Na razie zegar urządzenia; źródło można podmienić (testy, w przyszłości zegar serwera).

/** Epoka świata (ms): stała chwila odniesienia dla faz orbit — nie zapisywana, nie resetowana. */
export const WORLD_EPOCH = Date.UTC(2026, 0, 1);

let source: () => number = () => Date.now();

/** Czas świata (ms, jak `Date.now()`). */
export function worldNow(): number {
  return source();
}

/** Podmiana źródła czasu (testy, przyszły zegar serwera). Zwraca funkcję przywracającą poprzednie. */
export function setTimeSource(next: () => number): () => void {
  const previous = source;
  source = next;
  return () => {
    source = previous;
  };
}

/** Sekundy świata od epoki. */
export function worldSeconds(at: number = worldNow()): number {
  return (at - WORLD_EPOCH) / 1000;
}
