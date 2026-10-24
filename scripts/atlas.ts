// `npm run atlas` — wszystkie kombinacje profil × metoda terenu na jednym obrazku + tabela metryk.
// Wynik: docs/atlas/atlas.png i docs/atlas/metryki.md (do obejrzenia na GitHubie, także na iPadzie).
// Ta sama matematyka co gra (widok 2D `discRenderer`), bez przeglądarki.
import { mkdirSync, writeFileSync } from 'node:fs';
import { generatePlanet } from '../src/core/generation/generatePlanet.ts';
import { buildSurface } from '../src/core/surface/buildSurface.ts';
import { TERRAIN_METHODS } from '../src/core/surface/methods/index.ts';
import { surfaceMetrics } from '../src/core/surface/metrics.ts';
import type { TerrainMethodId } from '../src/core/surface/types.ts';
import type { Planet, PlanetDefinition, SurfaceProfile } from '../src/core/types.ts';
import { KEPLER_186F, PLANET_DEFINITIONS } from '../src/data/planets.ts';
import { SURFACE_PROFILES } from '../src/data/profiles/index.ts';
import { discLook, renderDisc } from '../src/planet-renderer/discRenderer.ts';
import { encodePng } from './png.ts';

const METHODS: readonly TerrainMethodId[] = ['tectonic', 'erosion', 'fractured'];
const SEEDS = ['1:17:4', '1:52:3'];
const CELL = 150;
const GAP = 12; // odstęp między grupami metod
const OUT = 'docs/atlas';

const definitionFor = (profile: SurfaceProfile): PlanetDefinition =>
  PLANET_DEFINITIONS.find((d) => d.surface.profile === profile) ?? { ...KEPLER_186F, surface: { profile } };

const cols = METHODS.length * SEEDS.length;
const width = cols * CELL + (METHODS.length - 1) * GAP;
const height = SURFACE_PROFILES.length * CELL;
const image = new Uint8Array(width * height * 4);
for (let i = 0; i < width * height; i++) image.set([8, 11, 16, 255], i * 4);

const rows: string[] = [];
for (const [r, profile] of SURFACE_PROFILES.entries()) {
  const def = definitionFor(profile);
  for (const [m, method] of METHODS.entries()) {
    const incompatible = profile.incompatible?.find((bad) => bad.method === method);
    for (const [s, seed] of SEEDS.entries()) {
      const base = generatePlanet(def, seed);
      const planet: Planet = { ...base, visual: { ...base.visual, terrainMethod: method } };
      const started = performance.now();
      TERRAIN_METHODS[method](planet.visual);
      const bakeMs = performance.now() - started;
      const disc = new Uint8ClampedArray(CELL * CELL * 4);
      renderDisc(disc, CELL, discLook(planet), 0.8, 0.3);
      const x0 = (m * SEEDS.length + s) * CELL + m * GAP;
      const y0 = r * CELL;
      for (let y = 0; y < CELL; y++) {
        for (let x = 0; x < CELL; x++) {
          const src = (y * CELL + x) * 4;
          const dst = ((y0 + y) * width + x0 + x) * 4;
          const a = disc[src + 3]! / 255;
          // Kombinacja niezgodna: przygaszona i przekreślona na czerwono.
          const dim = incompatible ? 0.35 : 1;
          for (let k = 0; k < 3; k++) image[dst + k] = disc[src + k]! * a * dim + image[dst + k]! * (1 - a);
          if (incompatible && (Math.abs(x - y) < 2 || Math.abs(x + y - CELL) < 2)) image.set([200, 60, 50], dst);
        }
      }
      const metrics = surfaceMetrics(buildSurface(planet, 24));
      const f = (v: number, d = 3) => v.toFixed(d).replace('.', ',');
      rows.push(
        `| ${profile.id} | ${method}${method === profile.methods[0]?.id ? ' (preferowana)' : ''}${incompatible ? ' ✗' : ''} | ${seed} | ${f(metrics.land, 2)} | ${f(metrics.chaos)} | ${f(metrics.roughness, 4)} | ${f(metrics.flat)} | ${f(metrics.spike)} | ${bakeMs.toFixed(0)} |`,
      );
    }
  }
}

mkdirSync(OUT, { recursive: true });
writeFileSync(`${OUT}/atlas.png`, encodePng(width, height, image));
const notes = SURFACE_PROFILES.flatMap((p) => (p.incompatible ?? []).map((bad) => `- **${p.id} × ${bad.method}** — ${bad.reason}`));
writeFileSync(
  `${OUT}/metryki.md`,
  `# Atlas profili i metod terenu

Plik generowany przez \`npm run atlas\` — nie edytuj ręcznie.

![Atlas](atlas.png)

**Jak czytać obrazek:** wiersze to profile (od góry): ${SURFACE_PROFILES.map((p) => `${p.id} (${p.label})`).join(', ')}.
Kolumny to trzy grupy metod (od lewej): ${METHODS.join(', ')} — w każdej grupie dwie planety (seedy ${SEEDS.join(' i ')}).
Widok 2D jak w grze. Kombinacja niezgodna z profilem jest przygaszona i przekreślona.

**Kombinacje niezgodne:**
${notes.join('\n') || '- brak'}

**Metryki** (model na siatce detail 24): ląd — udział lądu; chaos — udział drobnych nierówności; stromość — średnia różnica wysokości z sąsiadem; płaskie — udział prawie płaskiego lądu; igła — największe odchylenie od sąsiadów; pieczenie — czas liczenia kształtu (ms, komputer, nie iPad).

| Profil | Metoda | Seed | Ląd | Chaos | Stromość | Płaskie | Igła | Pieczenie (ms) |
|---|---|---|---|---|---|---|---|---|
${rows.join('\n')}
`,
);
console.log(`Atlas: ${OUT}/atlas.png (${width}×${height}), metryki: ${OUT}/metryki.md`);
