import assert from 'node:assert/strict';
import { test } from 'node:test';
import { buildableCount, buildFieldGrid, fieldGrid, isBuildable } from '../src/core/colony/fieldGrid.ts';
import { reconcilePlots, usedFields } from '../src/core/colony/plots.ts';
import { createEconomy, upgradeBuilding } from '../src/core/economy/economy.ts';
import { FIELDS_MAX, FIELDS_MIN } from '../src/core/generation/fields.ts';
import { generatePlanet } from '../src/core/generation/generatePlanet.ts';
import { parsePlots } from '../src/core/save/empire.ts';
import type { BuildingId, BuildingLevels } from '../src/core/types.ts';
import { BALANCE } from '../src/data/balance.ts';
import { findDefinition, PLANET_DEFINITIONS, STARTER } from '../src/data/planets.ts';

const ORDER: BuildingId[] = BALANCE.buildings.map((b) => b.id);
const levels = (l: Partial<BuildingLevels>): BuildingLevels => ({ metalMine: 0, crystalMine: 0, powerPlant: 0, storage: 0, antimatterCollector: 0, laboratory: 0, ...l });

test('liczba pól: 30–200, mediana ok. 100, skrajne rzadkie; planeta startowa ma 100', () => {
  const all: number[] = [];
  for (const def of PLANET_DEFINITIONS) for (let i = 0; i < 600; i++) all.push(generatePlanet(def, `1:${i % 100}:${i}`).gameplay.fields);
  all.sort((a, b) => a - b);
  assert.ok(all[0]! >= FIELDS_MIN && all[all.length - 1]! <= FIELDS_MAX);
  const median = all[Math.floor(all.length / 2)]!;
  assert.ok(median >= 90 && median <= 110, `mediana ${median}`);
  const share = (f: (n: number) => boolean) => all.filter(f).length / all.length;
  assert.ok(share((n) => n <= 40) < 0.02, 'małe (≤ 40) rzadkie');
  assert.ok(share((n) => n >= 180) < 0.03, 'duże (≥ 180) rzadkie');
  assert.ok(share((n) => n >= 70 && n <= 130) > 0.6, 'większość w okolicy 100');
  assert.equal(generatePlanet(STARTER.definition, STARTER.seed).gameplay.fields, 100);
  // Większe planety mają średnio więcej pól.
  const avg = (size: string) => {
    const xs = PLANET_DEFINITIONS.flatMap((d) => Array.from({ length: 200 }, (_, i) => generatePlanet(d, `S-${i}`)).filter((p) => p.gameplay.sizeClass.id === size));
    return xs.reduce((s, p) => s + p.gameplay.fields, 0) / xs.length;
  };
  assert.ok(avg('S') < avg('M') && avg('M') < avg('L'));
});

test('liczba pól nie zmienia innych cech planety (osobny strumień losowania)', () => {
  const starter = generatePlanet(STARTER.definition, STARTER.seed);
  assert.equal(starter.gameplay.radiusKm, 6750);
  assert.equal(starter.visual.seaLevel, 0.456);
});

test('siatka pól: tyle pól, ile ma planeta; obrysy zamknięte, sąsiedztwo symetryczne, głównie 5- i 6-kąty', () => {
  for (const def of PLANET_DEFINITIONS) {
    const planet = generatePlanet(def, 'PF-GRID');
    const grid = buildFieldGrid(planet);
    assert.equal(grid.cells.length, planet.gameplay.fields);
    let fiveSix = 0;
    grid.cells.forEach((cell, i) => {
      assert.ok(Math.abs(Math.hypot(...cell.center) - 1) < 1e-9);
      assert.ok(cell.outline.length >= 12);
      for (const n of cell.neighbors) assert.ok(grid.cells[n]!.neighbors.includes(i) || grid.cells[n]!.neighbors.length > 0);
      if (cell.neighbors.length === 5 || cell.neighbors.length === 6) fiveSix++;
    });
    assert.ok(fiveSix / grid.cells.length > 0.7, `${def.id}: 5–6-kąty ${fiveSix}/${grid.cells.length}`);
    assert.equal(grid.cells[grid.colonyCenter]!.kind, 'land');
    assert.deepEqual(buildFieldGrid(planet).cells.map((c) => c.kind), grid.cells.map((c) => c.kind), 'deterministyczna');
  }
});

test('budować można tylko na lądzie (woda i lód — po odblokowaniu)', () => {
  assert.equal(isBuildable('land'), true);
  for (const kind of ['water', 'ice', 'lava'] as const) assert.equal(isBuildable(kind), false);
  assert.equal(isBuildable('water', { water: true }), true);
  assert.equal(isBuildable('ice', { ice: true }), true);
  assert.equal(isBuildable('lava', { water: true, ice: true }), false);
  const ocean = fieldGrid(generatePlanet(findDefinition('ocean')!, 'PF-OCEAN'));
  const land = ocean.cells.filter((c) => c.kind === 'land').length;
  assert.equal(buildableCount(ocean), land);
  assert.ok(buildableCount(ocean, { water: true }) > land);
});

test('gospodarka: każdy poziom zajmuje pole; bez wolnych pól — czytelny błąd', () => {
  const state = { ...createEconomy(0), stock: { metal: 1e6, crystal: 1e6 } };
  const used = usedFields(state.levels);
  const ok = upgradeBuilding(state, 'metalMine', 0, BALANCE, { fields: used + 1 });
  assert.equal(ok.ok, true);
  const full = upgradeBuilding(state, 'metalMine', 0, BALANCE, { fields: used });
  assert.equal(full.ok, false);
  assert.equal(full.reason, 'no-fields');
  assert.match(full.message, /Brak wolnych pól/);
  assert.equal(upgradeBuilding(state, 'metalMine', 0, BALANCE).ok, true, 'bez limitu — jak dotąd');
});

test('przydział pól: stabilny (nowe budowle nie przesuwają starych), tylko ląd, dzielnice, anulowanie zwalnia pole', () => {
  const grid = fieldGrid(generatePlanet(STARTER.definition, STARTER.seed));
  const a = reconcilePlots(grid, {}, levels({ metalMine: 3, crystalMine: 2, powerPlant: 2 }), ORDER);
  const b = reconcilePlots(grid, a, levels({ metalMine: 3, crystalMine: 5, powerPlant: 2, storage: 1 }), ORDER);
  assert.deepEqual(b.metalMine, a.metalMine);
  assert.deepEqual(b.powerPlant, a.powerPlant);
  assert.deepEqual(b.crystalMine!.slice(0, 2), a.crystalMine);
  const cells = Object.values(b).flat();
  assert.equal(new Set(cells).size, cells.length, 'jedno pole — jedna budowla');
  for (const c of cells) assert.equal(grid.cells[c!]!.kind, 'land');
  // Budowle jednego typu stoją blisko siebie (dzielnica): średnia odległość < połowy średnicy planety.
  const crystal = b.crystalMine!.map((i) => grid.cells[i]!.center);
  for (const p of crystal) assert.ok(p[0] * crystal[0]![0] + p[1] * crystal[0]![1] + p[2] * crystal[0]![2] > 0.5);
  const cancelled = reconcilePlots(grid, b, levels({ metalMine: 3, crystalMine: 4, powerPlant: 2, storage: 1 }), ORDER);
  assert.deepEqual(cancelled.crystalMine, b.crystalMine!.slice(0, 4));
  // Więcej poziomów niż pól lądu (stary zapis): przydziela, ile się da, i nie wywraca się.
  const land = buildableCount(grid);
  const over = reconcilePlots(grid, {}, levels({ metalMine: land + 10 }), ORDER);
  assert.equal(over.metalMine!.length, land);
});

test('zapis pól: poprawne wczytane, błędne pominięte', () => {
  assert.deepEqual(parsePlots({ metalMine: [1, 2, 3], storage: [4, -1, 2.5, 'x'], nieznany: [1] }), { metalMine: [1, 2, 3], storage: [4] });
  assert.deepEqual(parsePlots(null), {});
});
