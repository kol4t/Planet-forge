// Wspólny model powierzchni planety (docs/generator-plan.md § 2). Czysty TypeScript — bez phaser/three/DOM.
// Wysokość, ciecz, materiał i cechy są danymi w `core`; renderery tylko je rysują.

/**
 * Metoda generowania terenu (`methods/`). `legacy` = teren z v0.1–v0.21 (fBm z zawinięciem) — punkt
 * odniesienia; `tectonic` = płyty i pasma gór, `erosion` = doliny wyżłobione wodą, `fractured` =
 * kratery, uskoki i płaskowyże.
 */
export type TerrainMethodId = 'legacy' | 'tectonic' | 'erosion' | 'fractured';

/** Ciecz w węźle siatki. Kody są częścią formatu danych modelu — nie zmieniaj istniejących. */
export const LIQUID = {
  none: 0,
  ocean: 1,
  /** Zamarznięte morze: tafla lodu nad wodą (poniżej poziomu morza). */
  frozenSea: 2,
  /** Jezioro na lądzie (lustro powyżej poziomu morza; zamarznięte — materiał `seaIce`). */
  lake: 3,
  /** Rzeka (koryto na lądzie). */
  river: 4,
  /** Lawa na lądzie (jezioro lawy w kalderze albo strumień). */
  lava: 5,
} as const;
export type LiquidCode = (typeof LIQUID)[keyof typeof LIQUID];

/**
 * Materiały powierzchni (indeks = kod w `SurfaceModel.material`). Dopisuj tylko na końcu.
 * Ląd klasyfikowany pasmami wysokości z profilu (`SurfaceProfile.bands`); woda i lód — wspólnie.
 */
export const MATERIALS = [
  'deepWater',
  'shallowWater',
  'seaIce',
  'shore',
  'lowland',
  'highland',
  'peak',
  'glacier',
  // v0.23 — materiały profili:
  'sand',
  'rock',
  'snow',
  'ash',
  'basalt',
  'regolith',
  // v0.24:
  'lava',
] as const;
export type MaterialId = (typeof MATERIALS)[number];

/** Ciągłe pole terenu — można je próbkować w dowolnym punkcie sfery jednostkowej. */
export interface SurfaceField {
  method: TerrainMethodId;
  seaLevel: number;
  /** Wysokość 0..1 w punkcie sfery jednostkowej. */
  height(x: number, y: number, z: number): number;
  /** Pokrycie lodem 0..1 (czapy polarne, lodowce, zamarznięte morze). */
  ice(height: number, x: number, y: number, z: number): number;
  /** Wody śródlądowe i lawa (`hydrology.ts`); brak = tylko morze. */
  inland?: InlandField;
}

/** Jeziora, rzeki i lawa jako ciągłe pole (wartości z siatki hydrologii, interpolowane). */
export interface InlandField {
  /** Lustro jeziora w punkcie (−1 = brak jeziora). */
  lakeLevel(x: number, y: number, z: number): number;
  /** Rzeka 0..1 (≥ 0,5 = koryto). */
  river(x: number, y: number, z: number): number;
  /** Lawa 0..1 (≥ 0,5 = lawa; 1 = najgorętsza). */
  lava(x: number, y: number, z: number): number;
  /** Jeziora są z lawy (planeta z lawą) — także na brzegu, gdzie pole `lava` spada poniżej 0,5. */
  lavaLakes: boolean;
  /** Statystyki (atlas, testy). */
  lakes: number;
  riverNodes: number;
}

/** Siatka geodezyjna sfery: węzły ikosfery (te same co siatka lądu 3D), trójkąty i sąsiedzi. */
export interface SphereGrid {
  /** Szczegółowość ikosfery (jak `IcosahedronGeometry(1, detail)`). */
  detail: number;
  /** Liczba węzłów. */
  count: number;
  /** Kierunki węzłów (x, y, z) na sferze jednostkowej. */
  nodes: Float32Array;
  /** Trójkąty jako trójki indeksów węzłów. */
  triangles: Uint32Array;
  /** Sąsiedzi węzła i: `neighbors[neighborStart[i] .. neighborStart[i + 1])`. */
  neighborStart: Uint32Array;
  neighbors: Uint32Array;
  /** Najbliższy węzeł dla dowolnego kierunku (nie musi być znormalizowany). */
  nearest(x: number, y: number, z: number): number;
}

export interface SurfaceStats {
  /** Udziały węzłów 0..1 (`land` = wszystko powyżej poziomu morza). */
  land: number;
  ocean: number;
  frozenSea: number;
  /** Udziały wód śródlądowych i lawy (wliczone w `land`). */
  lake: number;
  river: number;
  lava: number;
  minHeight: number;
  maxHeight: number;
  /** Czas budowy modelu w ms (tylko informacyjnie — nie wpływa na wynik). */
  buildMs: number;
}

/** Wynik generowania powierzchni na siatce. Ta sama planeta + rozdzielczość + wersja = te same dane. */
export interface SurfaceModel {
  version: number;
  method: TerrainMethodId;
  grid: SphereGrid;
  seaLevel: number;
  /** Wysokość 0..1 na węzeł. */
  height: Float32Array;
  /** `LiquidCode` na węzeł. */
  liquid: Uint8Array;
  /** Indeks w `MATERIALS` na węzeł. */
  material: Uint8Array;
  stats: SurfaceStats;
}
