import assert from 'node:assert/strict';
import { test } from 'node:test';
import { generatePlanet, validateDefinition } from '../src/core/generation/generatePlanet.ts';
import { buildSurface, validateSurface } from '../src/core/surface/buildSurface.ts';
import { TERRAIN_METHOD_IDS } from '../src/core/surface/methods/index.ts';
import { pickTerrainMethod, resolveLook, validateProfile } from '../src/core/surface/profile.ts';
import { MATERIALS, type TerrainMethodId } from '../src/core/surface/types.ts';
import type { PlanetDefinition, SurfaceProfile } from '../src/core/types.ts';
import { KEPLER_186F, PLANET_DEFINITIONS, STARTER } from '../src/data/planets.ts';
import { SURFACE_PROFILES, TERRESTRIAL } from '../src/data/profiles/index.ts';

const NEW_METHODS = TERRAIN_METHOD_IDS.filter((m) => m !== 'legacy');

/** Typ planety używający danego profilu (każdy profil ma co najmniej jeden). */
const definitionFor = (profile: SurfaceProfile): PlanetDefinition =>
  PLANET_DEFINITIONS.find((d) => d.surface.profile === profile) ?? { ...KEPLER_186F, surface: { profile } };

test('profile: sześć profili, dane poprawne, każdy używany przez typ planety', () => {
  assert.deepEqual(
    SURFACE_PROFILES.map((p) => p.id),
    ['terrestrial', 'arid', 'ice', 'oceanic', 'volcanic', 'barren'],
  );
  for (const profile of SURFACE_PROFILES) {
    assert.deepEqual(validateProfile(profile), [], profile.id);
    assert.equal(profile.status, 'robocza');
    // Każda metoda jest albo dozwolona, albo jawnie oznaczona jako niezgodna (z powodem).
    for (const method of NEW_METHODS) {
      const allowed = profile.methods.some((m) => m.id === method);
      const flagged = (profile.incompatible ?? []).some((bad) => bad.method === method);
      assert.ok(allowed !== flagged, `${profile.id} × ${method}`);
    }
    assert.ok(PLANET_DEFINITIONS.some((d) => d.surface.profile === profile), `${profile.id} bez typu planety`);
  }
  for (const def of PLANET_DEFINITIONS) assert.deepEqual(validateDefinition(def), [], def.id);
});

test('profile: walidacja wykrywa złe dane', () => {
  const broken: SurfaceProfile = {
    ...TERRESTRIAL,
    methods: [
      { id: 'tectonic', weight: 0 },
      { id: 'nieznana' as TerrainMethodId, weight: 1 },
    ],
    incompatible: [{ method: 'tectonic', reason: '' }],
    bands: [
      { upTo: 0.5, material: 'rock', color: 'szary' },
      { upTo: 0.4, material: 'lawa' as 'rock', color: '#123456' },
    ],
  };
  const problems = validateProfile(broken).join('\n');
  for (const part of ['waga', 'nieznana metoda', 'jednocześnie', 'bez powodu', 'rosnąć', 'nieznany materiał', 'sięgać 1', 'zły kolor']) {
    assert.ok(problems.includes(part), `brak: ${part}\n${problems}`);
  }
});

test('profile: każda kombinacja profil × metoda daje poprawny model z udziałem lądu w granicach profilu', () => {
  for (const profile of SURFACE_PROFILES) {
    const def = definitionFor(profile);
    for (const method of NEW_METHODS) {
      for (const seed of ['PF-PROF-1', 'PF-PROF-2']) {
        const planet = generatePlanet(def, seed);
        const model = buildSurface({ ...planet, visual: { ...planet.visual, terrainMethod: method } }, 16);
        assert.deepEqual(validateSurface(model), [], `${profile.id} × ${method}`);
        const [lo, hi] = profile.expect.land;
        assert.ok(model.stats.land >= lo && model.stats.land <= hi, `${profile.id} × ${method} ${seed}: ląd ${model.stats.land}`);
      }
    }
  }
});

test('profile: materiały lądu z pasm profilu (piasek na pustyni, bazalt na wulkanicznej)', () => {
  const used = (profileId: string) => {
    const profile = SURFACE_PROFILES.find((p) => p.id === profileId)!;
    const model = buildSurface(generatePlanet(definitionFor(profile), 'PF-MAT'), 16);
    return new Set([...model.material].map((code) => MATERIALS[code]));
  };
  assert.ok(used('arid').has('sand'));
  assert.ok(used('volcanic').has('basalt'));
  assert.ok(used('barren').has('regolith'));
  assert.ok(!used('arid').has('lowland'), 'pustynia nie ma zielonych nizin');
});

test('profile: metoda losowana z wag (preferowana najczęściej, niezgodna nigdy), planeta startowa bez zmian', () => {
  for (const profile of SURFACE_PROFILES) {
    const def = definitionFor(profile);
    const counts = new Map<string, number>();
    for (let i = 0; i < 300; i++) {
      const method = pickTerrainMethod(def, `1:${i}:3`);
      counts.set(method, (counts.get(method) ?? 0) + 1);
    }
    const preferred = profile.methods[0]!.id;
    const top = [...counts.entries()].sort((a, b) => b[1] - a[1])[0]![0];
    assert.equal(top, preferred, profile.id);
    for (const bad of profile.incompatible ?? []) assert.ok(!counts.has(bad.method), `${profile.id}: ${bad.method}`);
  }
  // Losowanie metody ma własny strumień — reszta planety (rozgrywka i wygląd) bez zmian.
  const starter = generatePlanet(STARTER.definition, STARTER.seed);
  assert.equal(starter.visual.terrainMethod, 'tectonic');
  assert.equal(starter.visual.seaLevel, 0.456);
});

test('profile: nowy profil dodany tylko w danych działa bez zmian generatora', () => {
  const dusk: SurfaceProfile = {
    ...TERRESTRIAL,
    id: 'test-dusk',
    label: 'testowy',
    methods: [{ id: 'erosion', weight: 1 }],
    bands: [
      { upTo: 0.5, material: 'ash', color: '#444444' },
      { upTo: 1, material: 'snow', color: '#eeeeee' },
    ],
    look: { ...TERRESTRIAL.look, seaLevel: [0.3, 0.32], atmosphereColor: '#aa66cc' },
    expect: { land: [0.5, 1] },
  };
  const def: PlanetDefinition = { ...KEPLER_186F, id: 'test-dusk-world', displayName: undefined, catalogs: ['TST'], surface: { profile: dusk } };
  assert.deepEqual(validateDefinition(def), []);
  const planet = generatePlanet(def, 'PF-DUSK');
  assert.equal(planet.visual.profile, 'test-dusk');
  assert.equal(planet.visual.terrainMethod, 'erosion');
  assert.equal(planet.visual.atmosphereColor, '#aa66cc');
  const model = buildSurface(planet, 16);
  assert.deepEqual(validateSurface(model), []);
  const materials = new Set([...model.material].map((code) => MATERIALS[code]));
  assert.ok(materials.has('ash') && materials.has('snow'));
  // Nadpisanie wyglądu w definicji wygrywa z profilem.
  assert.equal(resolveLook({ ...def, visual: { atmosphereColor: '#000000' } }).atmosphereColor, '#000000');
});
