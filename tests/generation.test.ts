import assert from 'node:assert/strict';
import { resolveLook } from '../src/core/surface/profile.ts';
import { test } from 'node:test';
import {
  GENERATOR_VERSION,
  generatePlanet,
  pickDefinition,
  validateDefinition,
} from '../src/core/generation/generatePlanet.ts';
import { KEPLER_186F, PLANET_DEFINITIONS, STARTER, findDefinition } from '../src/data/planets.ts';

const SEEDS = Array.from({ length: 40 }, (_, i) => `PF-TEST-${i}`);

test('wersja generatora = 1 (podbicie unieważnia zapisy graczy)', () => {
  assert.equal(GENERATOR_VERSION, 1);
});

test('ten sam seed i definicja = identyczna planeta', () => {
  for (const def of PLANET_DEFINITIONS) {
    assert.deepEqual(generatePlanet(def, 'PF-ABCD-2345'), generatePlanet(def, ' PF-ABCD-2345 '));
  }
});

test('regresja: planeta startowa i planeta ze screena się nie zmieniły', () => {
  const starter = generatePlanet(STARTER.definition, STARTER.seed);
  assert.equal(starter.displayName, 'Kepler-186 f');
  assert.equal(starter.gameplay.radiusKm, 6750);
  assert.equal(starter.visual.seaLevel, 0.456);

  // Wartości z gry właściciela (seed PF-A2TQ-7QWR, wersja 0.1).
  const owner = generatePlanet(KEPLER_186F, 'PF-A2TQ-7QWR');
  assert.equal(owner.gameplay.sizeClass.label, 'Średnia');
  assert.equal(owner.gameplay.radiusKm, 5460);
  assert.deepEqual(owner.gameplay.richness, { metal: 0.87, crystal: 1.25, energy: 0.96 });
  assert.equal(owner.gameplay.environment.id, 'stable');
});

test('pusty seed jest odrzucany', () => {
  assert.throws(() => generatePlanet(KEPLER_186F, '   '), /Seed/);
});

test('wszystkie definicje są poprawne i mają unikalne id', () => {
  for (const def of PLANET_DEFINITIONS) assert.deepEqual(validateDefinition(def), [], def.id);
  assert.equal(new Set(PLANET_DEFINITIONS.map((d) => d.id)).size, PLANET_DEFINITIONS.length);
  assert.ok(PLANET_DEFINITIONS.length >= 5);
  assert.ok(PLANET_DEFINITIONS.every((d) => d.status === 'robocza'), 'dane czekają na Lore Bible');
});

test('walidacja wykrywa błędne dane', () => {
  const broken = {
    ...KEPLER_186F,
    weight: 0,
    visual: { seaLevel: [0.7, 0.2] as const, atmosphereColor: 'zielony' },
  };
  const problems = validateDefinition(broken);
  assert.ok(problems.some((p) => p.includes('waga')));
  assert.ok(problems.some((p) => p.includes('seaLevel')));
  assert.ok(problems.some((p) => p.includes('atmosphereColor')));
});

test('wartości wylosowane mieszczą się w zakresach definicji', () => {
  for (const def of PLANET_DEFINITIONS) {
    for (const seed of SEEDS) {
      const p = generatePlanet(def, seed);
      const size = def.generation.sizeClasses.find((s) => s.id === p.gameplay.sizeClass.id)!;
      assert.ok(p.gameplay.radiusKm >= size.radiusKm[0] - 10 && p.gameplay.radiusKm <= size.radiusKm[1] + 10);
      for (const id of ['metal', 'crystal', 'energy'] as const) {
        const [min, max] = def.generation.resourceRange[id];
        assert.ok(p.gameplay.richness[id] >= min - 0.005 && p.gameplay.richness[id] <= max + 0.005, `${def.id} ${id}`);
      }
      const sea = resolveLook(def).seaLevel;
      assert.ok(p.visual.seaLevel >= sea[0] && p.visual.seaLevel <= sea[1]);
      assert.ok(p.visual.axialTiltDeg >= 5 && p.visual.axialTiltDeg <= 28);
      assert.ok(def.generation.environmentModifiers.some((e) => e.id === p.gameplay.environment.id));
    }
  }
});

test('nazwy generowane z seeda są stabilne i katalogowe', () => {
  for (const def of PLANET_DEFINITIONS.filter((d) => !d.displayName)) {
    const name = generatePlanet(def, 'PF-NAME-TEST').displayName;
    assert.equal(name, generatePlanet(def, 'PF-NAME-TEST').displayName);
    assert.match(name, /^[A-Za-z]+-\d{2,3} [b-g]$/);
  }
});

test('typ nowej planety wynika z seeda i każdy typ jest osiągalny', () => {
  assert.equal(pickDefinition('PF-1', PLANET_DEFINITIONS).id, pickDefinition('PF-1', PLANET_DEFINITIONS).id);
  const seen = new Set(Array.from({ length: 300 }, (_, i) => pickDefinition(`PF-${i}`, PLANET_DEFINITIONS).id));
  assert.equal(seen.size, PLANET_DEFINITIONS.length);
});

test('findDefinition zwraca definicję lub undefined', () => {
  assert.equal(findDefinition('kepler-186f'), KEPLER_186F);
  assert.equal(findDefinition('nie-ma'), undefined);
});
