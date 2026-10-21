// Tło kosmosu (v0.17): rozmieszczenie gwiazd, mgławic i odległych ciał układu.
// Czysta matematyka — bez DOM, testowalna. Rysuje je `spaceBackground.ts`.
// Tylko wygląd: własny strumień RNG z seeda planety (rozgrywka bez zmian).
import { createRng } from '../core/random/rng.ts';
import type { StarSystem } from '../core/galaxy/galaxy.ts';
import type { PlanetDefinition } from '../core/types.ts';

export interface SkyStar {
  x: number;
  y: number;
  /** Promień w pikselach CSS. */
  r: number;
  /** Jasność 0..1. */
  a: number;
  color: string;
  /** Jasna gwiazda z krzyżykiem blasku (tylko bliska warstwa). */
  glint?: boolean;
}

export interface SkyNebula {
  x: number;
  y: number;
  rx: number;
  ry: number;
  rotation: number;
  color: string;
  /** Krycie środka (bardzo małe — mgławica nie konkuruje z planetą). */
  alpha: number;
}

export interface SkyLayout {
  width: number;
  height: number;
  /** Pas Drogi Mlecznej: kąt i przesunięcie środka (piksele). */
  band: { angle: number; offset: number; width: number };
  nebulae: SkyNebula[];
  /** Daleka warstwa: wiele drobnych, ciemnych gwiazd (najwolniejsza paralaksa). */
  far: SkyStar[];
  /** Bliska warstwa: mniej gwiazd, jaśniejsze (szybsza paralaksa). */
  near: SkyStar[];
  /** Kilka gwiazd, które delikatnie migoczą. */
  twinkle: SkyStar[];
}

const STAR_TINTS = ['#ffffff', '#dcecff', '#ffeccc', '#bfe6dc', '#e6dcff'];
/** Bazowe kolory mgławic: granat, turkus, fiolet (paleta gry). */
const NEBULA_TINTS = ['#1d4f6b', '#1f5f5a', '#3f2f6e'];

/**
 * Gwiazdy i mgławice dla obszaru `width × height` (pikseli CSS, z zapasem na paralaksę).
 * Liczba gwiazd rośnie z powierzchnią; `starColor` (gwiazda układu) zabarwia jedną mgławicę.
 */
export function layoutSky(seed: string, width: number, height: number, starColor: string): SkyLayout {
  const rng = createRng(`sky|${seed}`);
  const w = Math.max(1, width);
  const h = Math.max(1, height);
  const area = w * h;
  const diagonal = Math.hypot(w, h);
  const band = { angle: rng.range(-0.9, -0.35), offset: rng.range(-0.18, 0.18) * Math.min(w, h), width: diagonal * rng.range(0.16, 0.22) };
  const cos = Math.cos(band.angle);
  const sin = Math.sin(band.angle);
  /** Punkt blisko pasa (rozkład ~ trójkątny w poprzek pasa). */
  const bandPoint = () => {
    const along = rng.range(-0.6, 0.6) * diagonal;
    const across = (rng.next() + rng.next() - 1) * band.width * 0.7 + band.offset;
    return { x: w / 2 + along * cos - across * sin, y: h / 2 + along * sin + across * cos };
  };
  const inside = (p: { x: number; y: number }) => p.x >= 0 && p.y >= 0 && p.x <= w && p.y <= h;

  const nebulae: SkyNebula[] = [];
  const nebulaCount = 3 + rng.int(0, 1);
  for (let i = 0; i < nebulaCount; i++) {
    // Mgławice leżą wzdłuż pasa, przy krawędziach ekranu (środek zostaje dla planety).
    const t = (i / (nebulaCount - 1) - 0.5) * 1.3 + rng.range(-0.1, 0.1);
    const along = t * diagonal * 0.55;
    const across = band.offset + rng.range(-0.5, 0.5) * band.width;
    const size = diagonal * rng.range(0.16, 0.28);
    nebulae.push({
      x: w / 2 + along * cos - across * sin,
      y: h / 2 + along * sin + across * cos,
      rx: size,
      ry: size * rng.range(0.4, 0.7),
      rotation: band.angle + rng.range(-0.5, 0.5),
      color: i === 1 ? starColor : NEBULA_TINTS[rng.int(0, NEBULA_TINTS.length - 1)]!,
      alpha: i === 1 ? rng.range(0.12, 0.16) : rng.range(0.22, 0.32),
    });
  }

  const star = (x: number, y: number, r: number, a: number): SkyStar => ({
    x,
    y,
    r,
    a,
    color: STAR_TINTS[rng.int(0, STAR_TINTS.length - 1)]!,
  });
  const far: SkyStar[] = [];
  const farCount = Math.round(area / 1500);
  for (let i = 0; i < farCount; i++) {
    // Ok. 45% gwiazd w pasie — niebo nie wygląda jak równomierny wzór.
    const p = rng.next() < 0.45 ? bandPoint() : { x: rng.next() * w, y: rng.next() * h };
    if (!inside(p)) continue;
    far.push(star(p.x, p.y, rng.range(0.35, 0.8), rng.range(0.18, 0.55)));
  }
  const near: SkyStar[] = [];
  const nearCount = Math.round(area / 16000);
  for (let i = 0; i < nearCount; i++) {
    const s = star(rng.next() * w, rng.next() * h, rng.range(0.7, 1.4), rng.range(0.5, 0.95));
    if (i < Math.max(3, Math.round(nearCount / 18))) {
      s.glint = true;
      s.r = rng.range(1.2, 1.7);
      s.a = 1;
    }
    near.push(s);
  }
  const twinkle: SkyStar[] = [];
  for (let i = 0; i < 6; i++) twinkle.push(star(rng.next() * w, rng.next() * h, rng.range(0.9, 1.4), 1));
  return { width: w, height: h, band, nebulae, far, near, twinkle };
}

/** Sąsiednie ciało układu widoczne w oddali (prawdziwe dane z mapy galaktyki). */
export interface DistantBody {
  name: string;
  kind: 'rocky' | 'gas-giant';
  /** Planeta skalista: definicja i seed (= adres) — rysowana tym samym generatorem co mapa. */
  definition?: PlanetDefinition;
  seed: string;
  /** Kolory pasów gazowego olbrzyma. */
  colors: string[];
  rings: boolean;
  /** Promień jako ułamek promienia planety gracza. */
  size: number;
  /** Położenie względem środka planety gracza (w jej promieniach). */
  dx: number;
  dy: number;
}

/**
 * Do dwóch sąsiadów planety na orbicie `position` (najbliższe orbity). Bliżej gwiazdy —
 * z prawej, nieco wyżej; dalej — z lewej, nieco niżej. Brak układu → brak ciał.
 */
export function distantBodies(
  system: StarSystem | null,
  position: number,
  definitions: readonly PlanetDefinition[],
): DistantBody[] {
  if (!system) return [];
  const others = system.planets
    .filter((p) => p.position !== position)
    .sort((a, b) => Math.abs(a.position - position) - Math.abs(b.position - position))
    .slice(0, 2);
  const rng = createRng(`sky-bodies|${system.index}|${position}`);
  return others.map((p, i) => {
    const inner = p.position < position;
    const gas = p.body === 'gas-giant';
    const def = definitions.find((d) => d.id === p.definitionId);
    const colors = p.gas?.bands ?? ['#c9a77a', '#8f6b4a'];
    // Dalsza orbita = mniejsza tarcza; olbrzymy większe od planet skalistych.
    const distance = Math.abs(p.position - position);
    const size = (gas ? 0.2 : 0.075) / (0.7 + distance * 0.3);
    const angle = (inner ? -0.4 : 2.65) + rng.range(-0.2, 0.2) + i * 0.15;
    const reach = rng.range(1.3, 1.5);
    return {
      name: p.name,
      kind: gas || !def ? 'gas-giant' : 'rocky',
      ...(def && !gas ? { definition: def } : {}),
      seed: p.address,
      colors,
      rings: Boolean(gas && p.gas?.rings),
      size,
      dx: Math.cos(angle) * reach,
      dy: Math.sin(angle) * reach,
    };
  });
}
