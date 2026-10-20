import { createRng, hashString } from '../random/rng.ts';
import type { Planet, PlanetDefinition, Range, YieldId } from '../types.ts';

/**
 * Wersja algorytmu generowania. Podbij, jeśli zmiana sprawi, że stare seedy
 * dadzą inne planety (rozgrywkowo). Dodanie nowej definicji jej nie wymaga.
 */
export const GENERATOR_VERSION = 1;

const YIELDS: readonly YieldId[] = ['metal', 'crystal', 'energy'];
const NAME_LETTERS = 'bcdefg';

const round = (value: number, digits: number) => Math.round(value * 10 ** digits) / 10 ** digits;

const DEFAULT_OCEAN = { opacity: 0.55, roughness: 0.32 } as const;
const DEFAULT_CLOUDS = { threshold: [0.52, 0.52] as Range, opacity: 200 / 255, color: '#f5f5f5' };
const DEFAULT_POLAR_CAP = 0.78;

/** Planeta z definicji i seeda. Ten sam seed + definicja + wersja = ta sama planeta. */
export function generatePlanet(definition: PlanetDefinition, seedInput: string): Planet {
  const seed = seedInput.trim();
  if (seed.length === 0) throw new Error('Seed nie może być pusty.');

  const root = createRng(`${definition.id}|${seed}|v${GENERATOR_VERSION}`);
  const gameplay = root.fork('gameplay');
  const visual = root.fork('visual');

  // Strumień „gameplay” — kolejność losowań jest częścią formatu (nie zmieniaj).
  const sizeClass = gameplay.weighted(definition.generation.sizeClasses);
  const radiusKm = Math.round(gameplay.range(sizeClass.radiusKm[0], sizeClass.radiusKm[1]) / 10) * 10;
  const richness = {} as Record<YieldId, number>;
  for (const id of YIELDS) {
    const [min, max] = definition.generation.resourceRange[id];
    richness[id] = round(gameplay.range(min, max), 2);
  }
  const environment = gameplay.weighted(definition.generation.environmentModifiers);

  // Strumień „visual” — nowe losowania dopisuj wyłącznie na końcu.
  const pick = (range: Range, digits = 3) => round(visual.range(range[0], range[1]), digits);
  const v = definition.visual;
  const noiseSeed = hashString(`${seed}:noise`) ^ visual.int(0, 65535);
  const seaLevel = pick(v.seaLevel);
  const terrainAmplitude = pick(v.terrainAmplitude);
  const terrainScale = pick(v.terrainScale);
  const axialTiltDeg = pick([5, 28], 1);
  const clouds = v.clouds ?? DEFAULT_CLOUDS;
  const cloudThreshold = pick(clouds.threshold);

  return {
    definitionId: definition.id,
    displayName: definition.displayName ?? generateName(definition, seed),
    category: definition.category,
    seed,
    generatorVersion: GENERATOR_VERSION,
    gameplay: {
      sizeClass: { id: sizeClass.id, label: sizeClass.label },
      radiusKm,
      richness,
      environment: {
        id: environment.id,
        label: environment.label,
        description: environment.description,
        effects: { ...environment.effects },
      },
    },
    visual: {
      noiseSeed,
      seaLevel,
      terrainAmplitude,
      terrainScale,
      axialTiltDeg,
      palette: { ...v.palette },
      roughness: v.roughness,
      atmosphereColor: v.atmosphereColor,
      atmosphereIntensity: v.atmosphereIntensity,
      ocean: { ...DEFAULT_OCEAN, ...v.ocean },
      clouds: { threshold: cloudThreshold, opacity: clouds.opacity, color: clouds.color },
      polarCap: v.polarCap ?? DEFAULT_POLAR_CAP,
    },
  };
}

/** Nazwa katalogowa z seeda, np. „TOI-412 c”. Osobny strumień — nie wpływa na resztę. */
function generateName(definition: PlanetDefinition, seed: string): string {
  const catalogs = definition.catalogs?.length ? definition.catalogs : ['PF'];
  const rng = createRng(`${definition.id}|${seed}|name`);
  const catalog = catalogs[rng.int(0, catalogs.length - 1)]!;
  const number = rng.int(12, 998);
  const letter = NAME_LETTERS[rng.int(0, NAME_LETTERS.length - 1)]!;
  return `${catalog}-${number} ${letter}`;
}

/** Typ planety dla nowego seeda (losowanie ważone, deterministyczne). */
export function pickDefinition(seedInput: string, definitions: readonly PlanetDefinition[]): PlanetDefinition {
  return createRng(`type|${seedInput.trim()}`).weighted(definitions);
}

const HEX_COLOR = /^#[0-9a-f]{6}$/i;

/** Lista problemów w definicji (pusta = definicja poprawna). */
export function validateDefinition(def: PlanetDefinition): string[] {
  const problems: string[] = [];
  const checkRange = (name: string, range: Range, min = -Infinity, max = Infinity) => {
    if (!(range[0] <= range[1])) problems.push(`${name}: min > max`);
    if (range[0] < min || range[1] > max) problems.push(`${name}: poza zakresem ${min}..${max}`);
  };
  const checkColor = (name: string, value: string | undefined) => {
    if (value !== undefined && !HEX_COLOR.test(value)) problems.push(`${name}: zły kolor ${value}`);
  };

  if (!def.id) problems.push('brak id');
  if (!def.displayName && !def.catalogs?.length) problems.push('brak nazwy i katalogów');
  if (!(def.weight > 0)) problems.push('waga musi być > 0');

  const v = def.visual;
  checkRange('seaLevel', v.seaLevel, 0, 1);
  checkRange('terrainAmplitude', v.terrainAmplitude, 0, 0.2);
  checkRange('terrainScale', v.terrainScale, 0.2, 6);
  for (const [key, color] of Object.entries(v.palette)) checkColor(`palette.${key}`, color);
  checkColor('atmosphereColor', v.atmosphereColor);
  checkColor('ocean.emissive', v.ocean?.emissive);
  checkColor('clouds.color', v.clouds?.color);
  if (v.clouds) checkRange('clouds.threshold', v.clouds.threshold, 0, 1.2);
  if (v.polarCap !== undefined && !(v.polarCap >= 0 && v.polarCap <= 1.2)) problems.push('polarCap poza 0..1.2');

  const g = def.generation;
  if (g.sizeClasses.length === 0) problems.push('brak klas wielkości');
  for (const size of g.sizeClasses) {
    checkRange(`sizeClasses.${size.id}`, size.radiusKm, 500, 20000);
    if (!(size.weight > 0)) problems.push(`sizeClasses.${size.id}: waga musi być > 0`);
  }
  for (const id of YIELDS) checkRange(`resourceRange.${id}`, g.resourceRange[id], 0.1, 3);
  if (g.environmentModifiers.length === 0) problems.push('brak modyfikatorów środowiska');
  for (const env of g.environmentModifiers) {
    if (!(env.weight > 0)) problems.push(`environment.${env.id}: waga musi być > 0`);
    for (const [key, value] of Object.entries(env.effects)) {
      if (!(value! > 0.5 && value! < 2)) problems.push(`environment.${env.id}.${key}: mnożnik poza 0.5..2`);
    }
  }
  return problems;
}
