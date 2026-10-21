// Galaktyka: układy gwiezdne, gwiazdy i planety — deterministycznie z numeru galaktyki.
// Ta sama galaktyka zawsze wygląda tak samo (w przyszłości: jeden serwer = jedna galaktyka).
// Czysty TypeScript — bez DOM/phaser/three.
import { GALAXY_NAMES, GALAXY_RULES, STAR_KINDS, SYSTEM_CATALOGS } from '../../data/galaxy.ts';
import { createRng, type Rng } from '../random/rng.ts';
import type { GalaxyAddress, GalaxyRules, OrbitZone, StarKind, StarKindDef } from '../types.ts';

/**
 * Wersja algorytmu galaktyki. Podbij, jeśli zmiana przesunie układy albo zmieni ich planety
 * (adresy w zapisach wskazywałyby wtedy inne miejsca).
 */
export const GALAXY_VERSION = 1;

/** Układ na mapie galaktyki (bez szczegółów planet). */
export interface SystemSummary {
  /** Numer układu 1..systemCount (część adresu). */
  index: number;
  name: string;
  /** Położenie w galaktyce (jednostki mapy, środek = 0, 0). */
  x: number;
  y: number;
  star: StarKind;
  planetCount: number;
}

/** Kto jest na planecie (z punktu widzenia galaktyki — bez gracza). */
export type PlanetOccupant =
  /** Miejsce startowe gracza (na razie zajmuje je bot; w przyszłości prawdziwy gracz z serwera). */
  | 'home'
  /** Forma obca. */
  | 'alien'
  /** Wolna — do przejęcia. */
  | 'free';

/** Rodzaj ciała na orbicie: planeta skalista (do kolonizacji) albo gazowy olbrzym. */
export type BodyKind = 'rocky' | 'gas-giant';

export interface GasGiantLook {
  /** Kolory pasów od góry do dołu (pikselowe pasy w widoku układu). */
  bands: string[];
  rings: boolean;
}

export interface SystemPlanet {
  position: number;
  body: BodyKind;
  /** Wygląd gazowego olbrzyma (tylko dla `gas-giant`). */
  gas?: GasGiantLook;
  address: string;
  name: string;
  /** Odległość od gwiazdy (jednostki astronomiczne). */
  orbit: number;
  /** Temperatura względem Ziemi (1 = jak Ziemia). */
  temperature: number;
  zone: OrbitZone;
  definitionId: string;
  occupant: PlanetOccupant;
  /** Kąt na orbicie (rad) — tylko do rysowania. */
  angle: number;
}

export interface StarSystem extends SystemSummary {
  planets: SystemPlanet[];
  /** Pas asteroid między orbitą `after` a następną (albo brak). */
  belt: { after: number } | null;
}

export interface Galaxy {
  id: number;
  name: string;
  systems: SystemSummary[];
}

const ADDRESS = /^(\d{1,3}):(\d{1,4}):(\d{1,2})$/;

export function formatAddress(a: GalaxyAddress): string {
  return `${a.galaxy}:${a.system}:${a.position}`;
}

export function parseAddress(text: string): GalaxyAddress | null {
  const m = ADDRESS.exec(text.trim());
  if (!m) return null;
  const [galaxy, system, position] = [Number(m[1]), Number(m[2]), Number(m[3])];
  return galaxy >= 1 && system >= 1 && position >= 1 ? { galaxy, system, position } : null;
}

export function findStar(id: StarKind): StarKindDef {
  return STAR_KINDS.find((s) => s.id === id) ?? STAR_KINDS[0]!;
}

/** Liczba miejsc startowych graczy w układzie (np. do 7 planet: 2, więcej: 3). */
export function homeCount(planetCount: number, rules: GalaxyRules = GALAXY_RULES): number {
  return planetCount <= rules.twoHomesUpTo ? 2 : 3;
}

/** Strefa dla temperatury (pierwsza, której próg osiągnięto). */
export function zoneFor(temperature: number, rules: GalaxyRules = GALAXY_RULES): OrbitZone {
  for (const [zone, min] of rules.zones) if (temperature >= min) return zone;
  return rules.zones[rules.zones.length - 1]![0];
}

/** Kształt spirali (wspólny dla rozmieszczenia układów i rysowania tła galaktyki). */
export const SPIRAL = {
  arms: 2,
  /** Kąt nachylenia ramion spirali logarytmicznej (rad) — mniejszy = ciaśniej nawinięte. */
  pitch: 0.36,
  /** Promień, od którego zaczynają się ramiona (ułamek promienia galaktyki). */
  start: 0.12,
} as const;

/** Punkt na osi ramienia `arm` w odległości `r` od środka (spirala logarytmiczna). */
export function spiralPoint(arm: number, r: number, radius: number): { x: number; y: number } {
  const a = (arm / SPIRAL.arms) * Math.PI * 2 + Math.log(Math.max(r, radius * SPIRAL.start) / (radius * SPIRAL.start)) / Math.tan(SPIRAL.pitch);
  return { x: Math.cos(a) * r, y: Math.sin(a) * r };
}

/** Rozkład normalny (Box–Muller) z deterministycznego RNG. */
function gauss(rng: Rng): number {
  const u = Math.max(1e-9, rng.next());
  return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * rng.next());
}

const galaxyCache = new Map<number, Galaxy>();

/** Galaktyka z numeru: położenia, gwiazdy i liczby planet wszystkich układów. */
export function generateGalaxy(id = 1, rules: GalaxyRules = GALAXY_RULES): Galaxy {
  const cached = rules === GALAXY_RULES ? galaxyCache.get(id) : undefined;
  if (cached) return cached;
  const rng = createRng(`galaxy|${id}|v${GALAXY_VERSION}`);
  const place = rng.fork('positions');
  const names = rng.fork('names');
  const used = new Set<string>();
  const systems: SystemSummary[] = [];
  for (let index = 1; index <= rules.systemCount; index++) {
    // Jak prawdziwa galaktyka spiralna: część układów w zgrubieniu centralnym, reszta wzdłuż
    // dwóch ramion spirali logarytmicznej z rozrzutem; zachowany odstęp między układami.
    // (Położenia to tylko wygląd mapy — adresy i planety układów od nich nie zależą.)
    let x = 0;
    let y = 0;
    for (let attempt = 0; attempt < 60; attempt++) {
      if (place.next() < 0.14) {
        const r = rules.radius * 0.22 * Math.abs(gauss(place));
        const a = place.range(0, Math.PI * 2);
        x = Math.cos(a) * r;
        y = Math.sin(a) * r * 0.85;
      } else {
        const r = rules.radius * (0.18 + 0.8 * place.next() ** 0.85);
        const p = spiralPoint(place.int(0, SPIRAL.arms - 1), r, rules.radius);
        const spread = r * 0.16;
        x = p.x + gauss(place) * spread;
        y = p.y + gauss(place) * spread;
      }
      if (Math.hypot(x, y) > rules.radius) continue;
      if (systems.every((s) => Math.hypot(s.x - x, s.y - y) >= rules.minSpacing)) break;
    }
    const detail = createRng(`galaxy|${id}|v${GALAXY_VERSION}|system-${index}`);
    const star = detail.weighted(STAR_KINDS).id;
    const planetCount = detail.int(rules.planetCount[0], rules.planetCount[1]);
    let name = '';
    do {
      name = `${SYSTEM_CATALOGS[names.int(0, SYSTEM_CATALOGS.length - 1)]}-${names.int(100, 999)}`;
    } while (used.has(name));
    used.add(name);
    systems.push({ index, name, x: Math.round(x * 10) / 10, y: Math.round(y * 10) / 10, star, planetCount });
  }
  const galaxy: Galaxy = { id, name: GALAXY_NAMES[id] ?? `Galaktyka ${id}`, systems };
  if (rules === GALAXY_RULES) galaxyCache.set(id, galaxy);
  return galaxy;
}

/** Pełny układ: orbity, strefy, typy planet, miejsca startowe i formy obce. */
export function generateSystem(galaxy: Galaxy, index: number, rules: GalaxyRules = GALAXY_RULES): StarSystem | null {
  const summary = galaxy.systems[index - 1];
  if (!summary) return null;
  const rng = createRng(`galaxy|${galaxy.id}|v${GALAXY_VERSION}|system-${index}|planets`);
  const star = findStar(summary.star);
  const n = summary.planetCount;
  // Miejsca startowe graczy: 2 albo 3 różne orbity.
  const positions = Array.from({ length: n }, (_, i) => i + 1);
  const homes = new Set<number>();
  while (homes.size < homeCount(n, rules)) homes.add(positions[rng.int(0, n - 1)]!);
  const planets: SystemPlanet[] = [];
  let orbit = rng.range(0.25, 0.45);
  for (let position = 1; position <= n; position++) {
    if (position > 1) orbit *= rng.range(1.35, 1.75);
    const temperature = Math.sqrt(star.luminosity / orbit);
    const zone = zoneFor(temperature, rules);
    const types = Object.entries(rules.zoneTypes[zone]).map(([id, weight]) => ({ id, weight }));
    const definitionId = rng.weighted(types).id;
    const alien = rng.next() < rules.alienChance;
    const angle = rng.range(0, Math.PI * 2);
    const home = homes.has(position);
    planets.push({
      position,
      address: formatAddress({ galaxy: galaxy.id, system: index, position }),
      // Jak u planet pozasłonecznych: b, c, d… w kolejności od gwiazdy.
      name: `${summary.name} ${String.fromCharCode(97 + position)}`,
      orbit: Math.round(orbit * 100) / 100,
      temperature: Math.round(temperature * 100) / 100,
      zone,
      definitionId,
      occupant: home ? 'home' : alien ? 'alien' : 'free',
      angle,
      body: 'rocky',
    });
  }
  // Typy dodane później: osobny strumień na każdy typ, więc dotychczasowe planety mapy się nie zmieniają.
  for (const later of rules.laterTypes) {
    const roll = createRng(`galaxy|${galaxy.id}|v${GALAXY_VERSION}|system-${index}|type-${later.id}`);
    for (const planet of planets) {
      const hit = roll.next() < later.chance[planet.zone];
      if (hit && planet.occupant !== 'home') planet.definitionId = later.id;
    }
  }
  // Osobny strumień: gazowe olbrzymy i pasy asteroid nie zmieniają planet skalistych ani miejsc startowych.
  const extra = createRng(`galaxy|${galaxy.id}|v${GALAXY_VERSION}|system-${index}|bodies`);
  for (const planet of planets) {
    const chance = rules.gasGiantChance[planet.zone];
    if (planet.occupant === 'home' || extra.next() >= chance) continue;
    const warm = planet.zone === 'hot' || planet.zone === 'warm' || planet.zone === 'temperate';
    const palettes = warm ? rules.gasPalettes.warm : rules.gasPalettes.cold;
    const palette = palettes[extra.int(0, palettes.length - 1)]!;
    planet.body = 'gas-giant';
    planet.occupant = 'free';
    planet.gas = { bands: [...palette], rings: extra.next() < rules.gasRingsChance };
  }
  // Pas asteroid za 3. albo 4. planetą (decyzja właściciela), gdy układ jest na tyle duży.
  let belt: StarSystem['belt'] = null;
  const after = extra.int(3, 4);
  if (n > after && extra.next() < rules.beltChance) belt = { after };
  return { ...summary, planets, belt };
}

/** Czy planetę można skolonizować (skalista i wolna — bez sprawdzania gracza). */
export function isColonizable(planet: SystemPlanet): boolean {
  return planet.body === 'rocky' && planet.occupant === 'free';
}

/** Planeta pod adresem (albo null, gdy adres poza galaktyką). */
export function planetAt(galaxy: Galaxy, address: GalaxyAddress): SystemPlanet | null {
  if (address.galaxy !== galaxy.id) return null;
  return generateSystem(galaxy, address.system)?.planets[address.position - 1] ?? null;
}

/**
 * Układ startowy gracza: pierwszy (od `from`, po kolei) z co najmniej `minFree` wolnymi planetami
 * i miejscem startowym w strefie umiarkowanej (to ono przypada graczowi).
 */
export function starterSystem(galaxy: Galaxy, minFree: number, from = 1): { system: StarSystem; home: SystemPlanet } {
  const count = galaxy.systems.length;
  for (let i = 0; i < count; i++) {
    const system = generateSystem(galaxy, ((from - 1 + i) % count) + 1)!;
    const free = system.planets.filter(isColonizable).length;
    // Planeta startowa jest umiarkowana — szukamy miejsca startowego w strefie umiarkowanej.
    const home = system.planets.find((p) => p.occupant === 'home' && p.zone === 'temperate');
    if (home && free >= minFree) return { system, home };
  }
  throw new Error('Brak układu startowego w galaktyce.');
}
