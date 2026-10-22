// Metoda `erosion`: góry i wyżyny z szumu, a potem woda i grawitacja na siatce sfery.
// Erozja hydrauliczna: deszcz spływa do najniższego sąsiada, spływ się sumuje, a woda żłobi doliny
// tym mocniej, im więcej jej płynie i im stromiej (model „stream power”); niesiony osad opada
// tam, gdzie teren się wypłaszcza (podnóża, równiny, dna mórz). Erozja termiczna obsypuje zbyt
// strome stoki. Liczona raz przy generowaniu, z ograniczoną liczbą iteracji.
import { createNoise3D, fbm, ridged } from '../../random/noise.ts';
import type { PlanetVisual } from '../../types.ts';
import type { SphereGrid } from '../types.ts';
import type { TerrainRecipe } from './baked.ts';

export interface ErosionParams {
  iterations: number;
  /** Siła żłobienia przez spływającą wodę. */
  strength: number;
  /** Jaka część nadmiaru osadu opada w węźle. */
  deposition: number;
  /** Największa różnica wysokości z sąsiadem, przy której stok się nie obsypuje. */
  talus: number;
  /** Głębokość dolin rzecznych wcinanych na końcu wzdłuż sieci spływu (0 = bez dolin). */
  valleys: number;
}

export const DEFAULT_EROSION: ErosionParams = { iterations: 20, strength: 0.03, deposition: 0.2, talus: 0.08, valleys: 0.08 };

/** Siatka symulacji (detail 32 ≈ 10,9 tys. węzłów). */
export const EROSION_DETAIL = 32;

export function erosionRecipe(v: PlanetVisual, params: ErosionParams = DEFAULT_EROSION): TerrainRecipe {
  const terrain = createNoise3D(v.noiseSeed ^ 0x3c6ef372);
  const peaks = createNoise3D(v.noiseSeed ^ 0xa54ff53a);
  const fine = createNoise3D(v.noiseSeed ^ 0x510e527f);
  const scale = v.terrainScale;
  return {
    base(x, y, z) {
      const s = scale * 0.8;
      const hills = fbm(terrain, x * s + 3, y * s + 3, z * s + 3, 5);
      const range = ridged(peaks, x * 2.2 + 1, y * 2.2, z * 2.2, 4);
      // Pasma gór tylko na wyżynach (bez gór wyrastających z dna morza).
      return hills + range * 0.3 * Math.min(1, Math.max(0, hills - 0.4) * 5);
    },
    simulate: { detail: EROSION_DETAIL, run: (grid, height, sea) => erode(grid, height, sea, params) },
    detail(x, y, z) {
      const s = scale * 4.6;
      return (fbm(fine, x * s + 4, y * s, z * s, 3) - 0.5) * 0.06;
    },
  };
}

/** Erozja w miejscu (`height` jest modyfikowane). Deterministyczna: stała kolejność węzłów. */
export function erode(grid: SphereGrid, height: Float32Array, sea: number, params: ErosionParams): void {
  const { count, neighborStart, neighbors } = grid;
  const order = new Uint32Array(count);
  const down = new Int32Array(count);
  const flow = new Float32Array(count);
  const sediment = new Float32Array(count);
  const delta = new Float32Array(count);
  for (let i = 0; i < count; i++) order[i] = i;
  // Węzeł p przed q: wyższy pierwszy, przy remisie niższy indeks (kolejność jednoznaczna).
  const before = (p: number, q: number) => height[p]! > height[q]! || (height[p] === height[q] && p < q);
  // Kolejność od najwyższego węzła, najniższy sąsiad każdego węzła i spływ (deszcz + dopływ z góry).
  const drainage = () => {
    // Wysokości zmieniają się między iteracjami niewiele, więc sortowanie przez wstawianie
    // poprzedniej kolejności jest prawie liniowe.
    for (let o = 1; o < count; o++) {
      const node = order[o]!;
      let j = o - 1;
      while (j >= 0 && before(node, order[j]!)) {
        order[j + 1] = order[j]!;
        j--;
      }
      order[j + 1] = node;
    }
    for (let i = 0; i < count; i++) {
      let best = -1;
      let low = height[i]!;
      for (let k = neighborStart[i]!; k < neighborStart[i + 1]!; k++) {
        const n = neighbors[k]!;
        if (height[n]! < low) {
          low = height[n]!;
          best = n;
        }
      }
      down[i] = best;
    }
    flow.fill(1);
    for (let o = 0; o < count; o++) {
      const i = order[o]!;
      const d = down[i]!;
      if (d >= 0 && height[i]! > sea) flow[d] = flow[d]! + flow[i]!;
    }
  };
  for (let it = 0; it < params.iterations; it++) {
    drainage();
    sediment.fill(0);
    for (let o = 0; o < count; o++) {
      const i = order[o]!;
      const d = down[i]!;
      const h = height[i]!;
      if (d < 0 || h <= sea) {
        // Dno morza albo zagłębienie: cały osad zostaje (delty, zasypywanie kotlin).
        height[i] = h + sediment[i]! * (h <= sea ? 1 : 0.5);
        continue;
      }
      const slope = h - height[d]!;
      const power = Math.sqrt(flow[i]!) * slope;
      const cut = Math.min(params.strength * power, slope * 0.5);
      const capacity = power * params.strength * 4;
      let carried = sediment[i]! + cut;
      let deposit = 0;
      if (carried > capacity) {
        deposit = Math.min((carried - capacity) * params.deposition, slope * 0.5);
        carried -= deposit;
      }
      height[i] = h - cut + deposit;
      sediment[d] = sediment[d]! + carried;
    }
    // Erozja termiczna: zbyt strome stoki obsypują się do niższego sąsiada.
    delta.fill(0);
    for (let i = 0; i < count; i++) {
      const h = height[i]!;
      for (let k = neighborStart[i]!; k < neighborStart[i + 1]!; k++) {
        const n = neighbors[k]!;
        const diff = h - height[n]!;
        if (diff > params.talus) {
          const move = (diff - params.talus) * 0.05;
          delta[i] = delta[i]! - move;
          delta[n] = delta[n]! + move;
        }
      }
    }
    for (let i = 0; i < count; i++) height[i] = height[i]! + delta[i]!;
  }
  // Doliny rzeczne wzdłuż sieci spływu: im większy spływ, tym głębiej. Węzeł niżej na tej samej
  // rzece ma co najmniej taki spływ, więc wcina się co najmniej tak samo — rzeka dalej płynie w dół.
  if (params.valleys > 0) {
    drainage();
    for (let i = 0; i < count; i++) {
      if (height[i]! <= sea) continue;
      const carve = params.valleys * Math.sqrt(Math.min(flow[i]!, VALLEY_FLOW) / VALLEY_FLOW);
      height[i] = Math.max(sea, height[i]! - carve);
    }
  }
}

/** Spływ (liczba węzłów zlewni), przy którym dolina osiąga pełną głębokość. */
const VALLEY_FLOW = 150;
