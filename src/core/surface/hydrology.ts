// Woda i lawa na lądzie, liczone raz przy generowaniu (uproszczona hydrologia, nie symulacja fizyczna).
//
// 1. Zalewanie od morza („priority-flood”): woda wypełnia każde zagłębienie lądu do poziomu najniższej
//    przełęczy — tak powstają jeziora z płaskim lustrem. Kolejność zalewania wyznacza też kierunek
//    spływu każdego węzła (do węzła, z którego został zalany), aż do morza.
// 2. Spływ: każdy węzeł lądu dostaje deszcz i oddaje go w dół; gdzie zbiera się dużo wody — rzeka.
//    Rzeka zawsze płynie w dół (albo po lustrze jeziora) i kończy się w morzu lub jeziorze.
// 3. Lawa (profil z lawą): jeziora stają się jeziorami lawy (kaldery), a z kilku najwyższych szczytów
//    spływają strumienie lawy najstromszym spadkiem — nigdy wyżej niż źródło; stygną z odległością.
// Tylko + − × ÷ sqrt i stała kolejność (remis = niższy indeks) — wynik jednakowy w każdej przeglądarce.
import type { SphereGrid } from './types.ts';

export type LiquidKind = 'water' | 'lava' | 'none';

export interface HydrologyParams {
  liquid: LiquidKind;
  /** Najmniejsza głębokość jeziora (różnica lustra i dna). */
  lakeDepth: number;
  /** Najmniejsze jezioro (liczba węzłów). */
  lakeNodes: number;
  /** Spływ (liczba węzłów zlewni), od którego płynie rzeka. */
  riverFlow: number;
  /** Liczba strumieni lawy i ich największa długość (węzły). */
  lavaSources: number;
  lavaLength: number;
}

export const DEFAULT_HYDROLOGY: Omit<HydrologyParams, 'liquid'> = {
  lakeDepth: 0.004,
  lakeNodes: 3,
  riverFlow: 60,
  lavaSources: 6,
  lavaLength: 40,
};

export interface Hydrology {
  /** Lustro jeziora w węźle (−1 = brak jeziora). */
  lakeLevel: Float32Array;
  /** Spływ (węzły zlewni). */
  flow: Float32Array;
  /** Siła rzeki 0..1 (≥ 0,5 = koryto; 0 = brak). */
  river: Float32Array;
  /** Lawa 0..1 (1 = aktywna przy źródle; mniej = stygnąca dalej od źródła; 0 = brak). */
  lava: Float32Array;
  /** Węzeł, do którego spływa woda (−1 = morze albo najniższy punkt). */
  down: Int32Array;
  /** Powierzchnia po zalaniu zagłębień (lustro wody albo grunt) — po niej płynie woda. */
  filled: Float32Array;
  lakes: number;
  riverNodes: number;
}

/** Kopiec binarny (min) po wartości, remis — niższy indeks. */
class MinHeap {
  private items: number[] = [];
  private readonly key: Float32Array;
  constructor(key: Float32Array) {
    this.key = key;
  }
  get size(): number {
    return this.items.length;
  }
  private less(a: number, b: number): boolean {
    const ka = this.key[a]!;
    const kb = this.key[b]!;
    return ka < kb || (ka === kb && a < b);
  }
  push(i: number): void {
    const items = this.items;
    items.push(i);
    let c = items.length - 1;
    while (c > 0) {
      const p = (c - 1) >> 1;
      if (!this.less(items[c]!, items[p]!)) break;
      [items[c], items[p]] = [items[p]!, items[c]!];
      c = p;
    }
  }
  pop(): number {
    const items = this.items;
    const top = items[0]!;
    const last = items.pop()!;
    if (items.length > 0) {
      items[0] = last;
      let p = 0;
      for (;;) {
        const l = p * 2 + 1;
        const r = l + 1;
        let m = p;
        if (l < items.length && this.less(items[l]!, items[m]!)) m = l;
        if (r < items.length && this.less(items[r]!, items[m]!)) m = r;
        if (m === p) break;
        [items[m], items[p]] = [items[p]!, items[m]!];
        p = m;
      }
    }
    return top;
  }
}

export function computeHydrology(grid: SphereGrid, height: Float32Array, sea: number, params: HydrologyParams): Hydrology {
  const { count, neighborStart, neighbors } = grid;
  const filled = new Float32Array(count);
  const down = new Int32Array(count).fill(-1);
  const order = new Int32Array(count);
  const visited = new Uint8Array(count);
  const heap = new MinHeap(filled);
  // Zalewanie od morza; bez morza — od najniższego punktu planety.
  let seeds = 0;
  for (let i = 0; i < count; i++) {
    if (height[i]! < sea) {
      filled[i] = height[i]!;
      visited[i] = 1;
      heap.push(i);
      seeds++;
    }
  }
  if (seeds === 0) {
    let low = 0;
    for (let i = 1; i < count; i++) if (height[i]! < height[low]!) low = i;
    filled[low] = height[low]!;
    visited[low] = 1;
    heap.push(low);
  }
  let n = 0;
  while (heap.size > 0) {
    const cur = heap.pop();
    order[n++] = cur;
    for (let k = neighborStart[cur]!; k < neighborStart[cur + 1]!; k++) {
      const nb = neighbors[k]!;
      if (visited[nb]) continue;
      visited[nb] = 1;
      filled[nb] = Math.max(height[nb]!, filled[cur]!);
      down[nb] = height[nb]! < sea ? -1 : cur;
      heap.push(nb);
    }
  }

  // Jeziora: zagłębienia lądu wypełnione co najmniej do `lakeDepth`, w grupach ≥ `lakeNodes`.
  const lakeLevel = new Float32Array(count).fill(-1);
  let lakes = 0;
  if (params.liquid !== 'none') {
    const candidate = (i: number) => height[i]! >= sea && filled[i]! - height[i]! > 0;
    const seen = new Uint8Array(count);
    const stack: number[] = [];
    const members: number[] = [];
    for (let i = 0; i < count; i++) {
      if (seen[i] || !candidate(i)) continue;
      // Jedno jezioro = spójna grupa węzłów pod tym samym lustrem.
      const level = filled[i]!;
      members.length = 0;
      stack.push(i);
      seen[i] = 1;
      let deepest = 0;
      while (stack.length > 0) {
        const c = stack.pop()!;
        members.push(c);
        deepest = Math.max(deepest, level - height[c]!);
        for (let k = neighborStart[c]!; k < neighborStart[c + 1]!; k++) {
          const nb = neighbors[k]!;
          if (!seen[nb] && candidate(nb) && filled[nb] === level) {
            seen[nb] = 1;
            stack.push(nb);
          }
        }
      }
      if (members.length >= params.lakeNodes && deepest >= params.lakeDepth) {
        lakes++;
        for (const m of members) lakeLevel[m] = level;
      }
    }
  }

  // Spływ: od ostatnio zalanych (najwyżej w zlewni) do morza.
  const flow = new Float32Array(count);
  for (let i = 0; i < count; i++) flow[i] = height[i]! >= sea ? 1 : 0;
  for (let o = count - 1; o >= 0; o--) {
    const i = order[o]!;
    const d = down[i]!;
    if (d >= 0) flow[d] = flow[d]! + flow[i]!;
  }

  const river = new Float32Array(count);
  const lava = new Float32Array(count);
  let riverNodes = 0;
  if (params.liquid === 'water') {
    for (let i = 0; i < count; i++) {
      if (height[i]! < sea || lakeLevel[i]! >= 0 || flow[i]! < params.riverFlow) continue;
      // 0,5 na progu, 1 przy ośmiokrotnie większym spływie (szersze koryto).
      river[i] = Math.min(1, 0.5 + (0.5 * (flow[i]! / params.riverFlow - 1)) / 7);
      riverNodes++;
    }
  } else if (params.liquid === 'lava') {
    // Jeziora lawy (kaldery): zastygła skorupa (po wzmocnieniu pól liniowych ×1,8 ≈ 0,65),
    // żarzą się tylko pęknięcia; pełny żar mają strumienie przy źródłach.
    for (let i = 0; i < count; i++) if (lakeLevel[i]! >= 0) lava[i] = 0.36;
    // Źródła: najwyższe szczyty (lokalne maksima), nie bliżej siebie niż 4 skoki po siatce.
    const peaks: number[] = [];
    for (let i = 0; i < count; i++) {
      let top = height[i]! >= sea;
      for (let k = neighborStart[i]!; top && k < neighborStart[i + 1]!; k++) if (height[neighbors[k]!]! > height[i]!) top = false;
      if (top) peaks.push(i);
    }
    peaks.sort((a, b) => height[b]! - height[a]! || a - b);
    const near = new Uint8Array(count);
    const mark = (start: number, hops: number) => {
      let ring = [start];
      near[start] = 1;
      for (let h = 0; h < hops; h++) {
        const next: number[] = [];
        for (const c of ring) {
          for (let k = neighborStart[c]!; k < neighborStart[c + 1]!; k++) {
            const nb = neighbors[k]!;
            if (!near[nb]) {
              near[nb] = 1;
              next.push(nb);
            }
          }
        }
        ring = next;
      }
    };
    let sources = 0;
    for (const peak of peaks) {
      if (sources >= params.lavaSources) break;
      if (near[peak]) continue;
      mark(peak, 4);
      sources++;
      // Najstromszy spadek: zawsze w dół, koniec w morzu lawy, jeziorze lawy albo w zagłębieniu.
      let cur = peak;
      for (let step = 0; step < params.lavaLength; step++) {
        lava[cur] = Math.max(lava[cur]!, 1 - (0.6 * step) / params.lavaLength);
        if (height[cur]! < sea || lakeLevel[cur]! >= 0) break;
        let next = -1;
        let low = height[cur]!;
        for (let k = neighborStart[cur]!; k < neighborStart[cur + 1]!; k++) {
          const nb = neighbors[k]!;
          if (height[nb]! < low) {
            low = height[nb]!;
            next = nb;
          }
        }
        if (next < 0) break;
        cur = next;
      }
    }
  }
  return { lakeLevel, flow, river, lava, down, filled, lakes, riverNodes };
}
