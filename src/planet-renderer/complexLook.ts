// Wygląd gruntu kompleksu (v0.45): kolor punktu planety wewnątrz obszaru budynku — wspólny dla 2D (tarcza piksel
// po pikselu) i 3D (kolory ścianek lądu). Czysta matematyka, bez three/DOM.
// Kopalnia metalu: gęsta zabudowa przemysłowa (dachy złote i szare, drogi, żar okien pieców) — gęstsza z etapem.
// Ekstraktor kryształów: odkrywka — tarasowe pierścienie schodzące w głąb (ciemniej ku środkowi), świecące kryształy
// na dnie, zabudowa na krawędzi; dziura rośnie z etapem. Pozostałe budynki — spójny grunt w tym samym stylu.
import { CRATER_DEPTH, drillStage } from './drill.ts';
import { pitBand, type OpenPit } from './openPit.ts';
import type { ColonyComplex, Vec3 } from './colony.ts';
import { angleBetween, hash01 } from './colony.ts';

/** Kolor RGB 0..1 i świecenie 0..1 (widoczne także nocą: okna pieców, kryształy). */
export interface GroundColor {
  rgb: [number, number, number];
  glow: number;
}

const STEEL: [number, number, number] = [0.3, 0.33, 0.33];
const STEEL_DARK: [number, number, number] = [0.17, 0.19, 0.19];
const GOLD: [number, number, number] = [0.79, 0.63, 0.29];
const ROOF: [number, number, number] = [0.52, 0.56, 0.55];
const FURNACE: [number, number, number] = [1, 0.58, 0.22];
const CRYSTAL: [number, number, number] = [0.42, 0.93, 0.98];
const CONCRETE: [number, number, number] = [0.47, 0.49, 0.5];

/** Wielkość działki zabudowy (rad) — około piksela tarczy 2D przy przybliżeniu. */
const LOT = 1 / 95;
/** Kwartał: tyle działek (z ulicą na brzegu). */
const BLOCK = 5;

/** Lokalna płaszczyzna kompleksu (wschód, północ w środku) — siatka ulic równa względem kompleksu, nie świata. */
const bases = new WeakMap<ColonyComplex, { e: Vec3; n: Vec3 }>();
function basis(c: ColonyComplex): { e: Vec3; n: Vec3 } {
  let b = bases.get(c);
  if (!b) {
    const k = c.core;
    const helper: Vec3 = Math.abs(k[1]) < 0.9 ? [0, 1, 0] : [1, 0, 0];
    const e0: Vec3 = [helper[1] * k[2] - helper[2] * k[1], helper[2] * k[0] - helper[0] * k[2], helper[0] * k[1] - helper[1] * k[0]];
    const len = Math.hypot(...e0) || 1;
    const e: Vec3 = [e0[0] / len, e0[1] / len, e0[2] / len];
    const n: Vec3 = [k[1] * e[2] - k[2] * e[1], k[2] * e[0] - k[0] * e[2], k[0] * e[1] - k[1] * e[0]];
    b = { e, n };
    bases.set(c, b);
  }
  return b;
}

/**
 * Działka w siatce kompleksu: kwartały 5×5 działek rozdzielone ulicami. W kwartale jeden rodzaj zabudowy
 * (`kind` 0..1 — stała „losowość” kwartału), `u`/`v` — położenie działki w kwartale (1..4), `road` — ulica.
 */
function lot(c: ColonyComplex, p: Vec3): { kind: number; tint: number; u: number; v: number; road: boolean; ru: number; rv: number } {
  const { e, n } = basis(c);
  const fu = (p[0] * e[0] + p[1] * e[1] + p[2] * e[2]) / LOT;
  const fv = (p[0] * n[0] + p[1] * n[1] + p[2] * n[2]) / LOT;
  const iu = Math.floor(fu);
  const iv = Math.floor(fv);
  const u = ((iu % BLOCK) + BLOCK) % BLOCK;
  const v = ((iv % BLOCK) + BLOCK) % BLOCK;
  const bu = Math.floor(iu / BLOCK);
  const bv = Math.floor(iv / BLOCK);
  const seed = bu * 7349 + bv * 1913 + c.cells[0]! * 31;
  // Współrzędne w kwartale względem jego środka (do zbiorników).
  return { kind: hash01(seed, 1), tint: hash01(seed, 2), u, v, road: u === 0 || v === 0, ru: fu / BLOCK - bu - 0.6, rv: fv / BLOCK - bv - 0.6 };
}

const shade = (c: readonly number[], k: number): [number, number, number] => [c[0]! * k, c[1]! * k, c[2]! * k];

/** Promień odkrywki względem obszaru (rośnie z etapem). */
export const pitShare = (stage: number) => [0.42, 0.55, 0.66, 0.74][Math.max(0, Math.min(3, stage))]!;

/** Liczba tarasów odkrywki. */
export const pitTerraces = (stage: number) => 2 + Math.max(0, Math.min(3, stage));

/**
 * Wyrobisko kryształów w 3D (v0.47, prośba i szkic właściciela): równa, wyraźna niecka w planecie — kulisty profil
 * (płaskie dno, coraz bardziej strome ściany przy krawędzi), liczony od wysokości środka kompleksu, nie od lokalnego
 * terenu. Od v0.48 to krater odwiertu: głębokość z etapu odwiertu (`drill.ts`, 8 etapów z poziomu), a w jego dnie
 * zaczyna się studnia w głąb planety. Może zejść poniżej poziomu morza (tafla oceanu nad nią wycięta — PlanetView).
 */
export const pitDepthMax = (level: number) => CRATER_DEPTH[drillStage(level)]!;

/** Głębokość niecki w punkcie (ułamek promienia planety, poniżej wysokości środka kompleksu); 0 poza wyrobiskiem. */
export function pitSink3d(c: ColonyComplex, p: Vec3): number {
  if (c.building !== 'crystalMine') return 0;
  const s = angleBetween(c.core, p) / (c.radius * pitShare(c.stage));
  if (s >= 1) return 0;
  return Math.sqrt(1 - s * s) * pitDepthMax(c.level);
}

/**
 * Głębokość odkrywki 0..1 w punkcie (1 — dno): tarasy schodkami. 0 poza odkrywką (wzór gruntu 2D).
 */
export function pitDepth(c: ColonyComplex, p: Vec3): number {
  if (c.building !== 'crystalMine') return 0;
  const s = angleBetween(c.core, p) / (c.radius * pitShare(c.stage));
  if (s >= 1) return 0;
  const n = pitTerraces(c.stage);
  return 1 - Math.floor(s * n) / n;
}

/**
 * Kwartał przemysłowy: hala (jasna kalenica, dach, ciemna ściana z oknami pieców), dwie hale z alejką,
 * zbiornik (złoty pierścień) albo plac z hałdami rudy. `dense` 0..1 — im wyższy etap, tym mniej placów.
 */
function industrial(b: ReturnType<typeof lot>, dense: number, furnaces: number): GroundColor {
  if (b.road) return { rgb: STEEL_DARK, glow: 0 };
  const roof = b.tint < 0.55 ? GOLD : ROOF;
  if (b.kind < 0.4) {
    // Duża hala: kalenica, dach, ściana z oknami.
    if (b.v === 4) return b.u % 2 === 1 && b.tint < furnaces + 0.35 ? { rgb: FURNACE, glow: 0.9 } : { rgb: shade(roof, 0.45), glow: 0 };
    return { rgb: shade(roof, b.v === 1 ? 1.15 : b.v === 3 ? 0.8 : 1), glow: 0 };
  }
  if (b.kind < 0.62) {
    // Dwie hale z alejką.
    if (b.u === 2) return { rgb: STEEL_DARK, glow: 0 };
    if (b.v === 4) return b.tint < furnaces ? { rgb: FURNACE, glow: 0.85 } : { rgb: shade(roof, 0.45), glow: 0 };
    return { rgb: shade(roof, b.v === 1 ? 1.12 : 0.95), glow: 0 };
  }
  if (b.kind < 0.72) {
    // Zbiornik: złoty pierścień z ciemnym środkiem.
    const d = Math.hypot(b.ru, b.rv);
    return d < 0.18 ? { rgb: [0.2, 0.22, 0.22], glow: 0 } : d < 0.32 ? { rgb: GOLD, glow: 0 } : { rgb: STEEL, glow: 0 };
  }
  if (b.kind < 1 - dense * 0.25) {
    // Plac z hałdami rudy.
    return { rgb: (b.u + b.v) % 3 === 0 ? [0.42, 0.33, 0.27] : [0.3, 0.28, 0.26], glow: 0 };
  }
  return { rgb: STEEL, glow: 0 };
}

/**
 * Wielka odkrywka w tarczy 2D: koncentryczne warstwy wzdłuż obrysu (jasna półka, ciemne zbocze, głębiej ciemniej),
 * ciemne dno z kryształami i czarny szyb w środku.
 */
function openPitGround(pit: OpenPit, p: Vec3): GroundColor {
  const a = angleBetween(pit.center, p);
  if (a < pit.floorAngle / pit.look.floor) return { rgb: [0.02, 0.04, 0.05], glow: 0 };
  const s = pit.sCached(p);
  if (s >= 0.999) return lotCrystal(p, 0.06) ? { rgb: CRYSTAL, glow: 0.8 } : { rgb: [0.08, 0.1, 0.11], glow: 0 };
  const { layer, shelf } = pitBand(pit.look, s);
  const dark = 1 - 0.55 * (layer / Math.max(1, pit.look.layers - 1));
  if (!shelf && lotCrystal(p, 0.02)) return { rgb: CRYSTAL, glow: 0.5 };
  return { rgb: shade(shelf ? [0.62, 0.6, 0.62] : [0.3, 0.28, 0.31], dark), glow: 0 };
}

/** Kolor gruntu kompleksu w punkcie; `pit` — wielka odkrywka ekstraktora (cały obszar to dziura). */
export function complexGround(c: ColonyComplex, p: Vec3, pit: OpenPit | null = null): GroundColor {
  if (pit) return openPitGround(pit, p);
  const t = angleBetween(c.core, p) / c.radius;
  const b = lot(c, p);
  const stage = c.stage + (c.mega ? 1 : 0);
  switch (c.building) {
    case 'metalMine':
      // Skraj obszaru — żwir i hałdy; w środku gęsta zabudowa huty (gęściej i goręcej z etapem).
      if (t > 0.93) return { rgb: b.kind < 0.5 ? [0.36, 0.33, 0.3] : [0.27, 0.25, 0.23], glow: 0 };
      return industrial(b, Math.min(1, stage / 3), 0.15 + 0.1 * stage);
    case 'crystalMine': {
      const share = pitShare(c.stage);
      if (t < share) {
        const s = t / share;
        const n = pitTerraces(c.stage);
        const ring = Math.floor(s * n);
        const f = s * n - ring;
        // Dno: ciemne, z turkusowymi kryształami.
        if (ring === 0) return lotCrystal(p, 0.3) ? { rgb: CRYSTAL, glow: 0.9 } : { rgb: [0.04, 0.08, 0.1], glow: 0 };
        // Tarasy: zewnętrzna krawędź półki jasna, ściana ku środkowi ciemna; głębiej — ciemniej.
        const depth = 0.45 + 0.55 * (ring / n);
        const rgb: [number, number, number] = f > 0.72 ? [0.62, 0.6, 0.62] : f > 0.45 ? [0.42, 0.39, 0.42] : [0.2, 0.18, 0.21];
        return lotCrystal(p, 0.03) ? { rgb: CRYSTAL, glow: 0.6 } : { rgb: shade(rgb, depth), glow: 0 };
      }
      // Krawędź odkrywki: hale i żółte maszyny, beton.
      if (b.road) return { rgb: CONCRETE, glow: 0 };
      if (b.kind < 0.3 + 0.08 * stage) return { rgb: b.v === 4 ? shade(ROOF, 0.5) : b.tint < 0.5 ? [0.85, 0.68, 0.22] : ROOF, glow: 0 };
      return { rgb: [0.4, 0.43, 0.45], glow: 0 };
    }
    case 'powerPlant': {
      if (c.stage === 1) {
        // Generator fuzyjny: betonowy plac, w ulicach świecące przewody plazmy, okrągłe podstawy cewek.
        if (b.road) return b.kind < 0.3 && (b.u === 2 || b.v === 2) ? { rgb: [0.85, 0.4, 0.7], glow: 0.45 } : { rgb: STEEL_DARK, glow: 0 };
        const d = Math.hypot(b.ru, b.rv);
        return d < 0.3 && b.kind < 0.5 ? { rgb: d < 0.14 ? [0.3, 0.33, 0.33] : [0.62, 0.66, 0.65], glow: 0 } : { rgb: CONCRETE, glow: 0 };
      }
      if (c.stage >= 3) {
        // Reaktor antymaterii: ciemna metalowa posadzka, fioletowe przewody paliwa, okrągłe podstawy zbiorników.
        if (b.road) return b.kind < 0.35 && (b.u === 2 || b.v === 2) ? { rgb: [0.62, 0.52, 0.95], glow: 0.5 } : { rgb: STEEL_DARK, glow: 0 };
        const d = Math.hypot(b.ru, b.rv);
        return d < 0.3 && b.kind < 0.5 ? { rgb: d < 0.14 ? [0.78, 0.72, 0.98] : [0.62, 0.66, 0.65], glow: d < 0.14 ? 0.4 : 0 } : { rgb: [0.3, 0.32, 0.34], glow: 0 };
      }
      if (c.stage === 2) {
        // Elektrownia jądrowa: beton, okrągłe podstawy chłodni, rzadkie niebieskie baseny paliwa.
        if (b.road) return { rgb: STEEL_DARK, glow: 0 };
        const d = Math.hypot(b.ru, b.rv);
        if (b.kind < 0.025 && b.u >= 2 && b.v >= 2) return { rgb: [0.31, 0.71, 1], glow: 0.6 };
        return d < 0.32 && b.kind < 0.55 ? { rgb: d < 0.16 ? [0.27, 0.3, 0.3] : [0.66, 0.69, 0.67], glow: 0 } : { rgb: CONCRETE, glow: 0 };
      }
      if (b.road) return { rgb: STEEL_DARK, glow: 0 };
      // Pola paneli i chłodni; brzegi paneli jasne.
      if (b.kind < 0.55 + 0.1 * stage) return b.v === 4 ? { rgb: [0.75, 0.96, 1], glow: 0.55 } : { rgb: shade([0.15, 0.25, 0.38], b.u % 2 ? 1 : 0.85), glow: 0 };
      const d = Math.hypot(b.ru, b.rv);
      return d < 0.3 ? { rgb: d < 0.15 ? [0.3, 0.33, 0.33] : [0.62, 0.66, 0.65], glow: 0 } : { rgb: [0.27, 0.31, 0.33], glow: 0 };
    }
    case 'storage': {
      // Port kontenerowy: jasny beton z białymi liniami, rzędy kolorowych kontenerów (niebieskie, czerwone, turkusowe, białe).
      if (b.road) return { rgb: b.u === 0 && b.v === 0 ? [0.93, 0.95, 0.94] : [0.7, 0.73, 0.71], glow: 0 };
      const palette: [number, number, number][] = [[0.24, 0.44, 0.71], [0.75, 0.27, 0.23], [0.18, 0.61, 0.57], [0.89, 0.91, 0.9], [0.82, 0.54, 0.18]];
      // Jeden kolor na rząd (wzdłuż u), przerwa między rzędami; część kwartałów — pusty plac.
      if (b.kind >= 0.4 + 0.06 * stage || b.v === 2) return { rgb: [0.76, 0.79, 0.77], glow: 0 };
      return { rgb: shade(palette[Math.floor(((b.tint + b.v * 0.37) % 1) * palette.length)]!, b.u % 2 ? 1 : 0.88), glow: 0 };
    }
    case 'antimatterCollector': {
      // Koncentryczne pierścienie pułapek.
      const ring = (t * (3 + stage)) % 1;
      if (ring < 0.16) return { rgb: [0.72, 0.52, 1], glow: 0.75 };
      return { rgb: b.road ? [0.24, 0.2, 0.33] : [0.17, 0.14, 0.24], glow: 0 };
    }
    case 'laboratory': {
      if (b.road) return { rgb: [0.3, 0.6, 0.58], glow: 0.3 };
      const d = Math.hypot(b.ru, b.rv);
      // Kopuły (jasne koła) na zieleni kampusu.
      return d < 0.3 && b.kind < 0.5 + 0.1 * stage ? { rgb: d < 0.12 ? [0.95, 0.97, 0.97] : [0.8, 0.85, 0.85], glow: 0 } : { rgb: [0.45, 0.55, 0.5], glow: 0 };
    }
  }
}

/** Kryształ w punkcie (drobne ziarno niezależne od siatki ulic). */
function lotCrystal(p: Vec3, share: number): boolean {
  const k = 160;
  return hash01(Math.floor(p[0] * k) * 92821 + Math.floor(p[1] * k) * 68917 + Math.floor(p[2] * k) * 1237, 4) < share;
}
