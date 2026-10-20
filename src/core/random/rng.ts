// Jedyny generator liczb pseudolosowych w logice gry (zakaz Math.random).

/** Hash FNV-1a z dodatkowym mieszaniem — stabilny między przeglądarkami. */
export function hashString(text: string): number {
  let h = 2166136261;
  for (let i = 0; i < text.length; i++) {
    h ^= text.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  h ^= h >>> 16;
  h = Math.imul(h, 2246822507);
  h ^= h >>> 13;
  h = Math.imul(h, 3266489909);
  h ^= h >>> 16;
  return h >>> 0;
}

export interface Rng {
  /** Liczba z przedziału [0, 1). */
  next(): number;
  range(min: number, max: number): number;
  /** Liczba całkowita z przedziału [min, max] (obustronnie domkniętego). */
  int(min: number, max: number): number;
  weighted<T extends { weight: number }>(items: readonly T[]): T;
  /** Niezależny strumień o nazwie `name` — nie zużywa losowań rodzica. */
  fork(name: string): Rng;
}

export function createRng(seed: string | number): Rng {
  const base = typeof seed === 'string' ? hashString(seed) : seed >>> 0;
  let state = base;
  const next = (): number => {
    state = (state + 1831565813) >>> 0;
    let t = state;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
  return {
    next,
    range: (min, max) => min + (max - min) * next(),
    int: (min, max) => Math.floor(min + (max - min + 1) * next()),
    weighted(items) {
      if (items.length === 0) throw new Error('weighted(): pusta lista');
      const total = items.reduce((sum, item) => sum + Math.max(0, item.weight), 0);
      let roll = next() * total;
      for (const item of items) {
        roll -= Math.max(0, item.weight);
        if (roll < 0) return item;
      }
      return items[items.length - 1]!;
    },
    fork: (name) => createRng(hashString(`${base}:${name}`)),
  };
}
