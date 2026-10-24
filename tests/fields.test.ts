import assert from 'node:assert/strict';
import { test } from 'node:test';
import { buildableCount, buildFieldGrid, fieldGrid, isBuildable } from '../src/core/colony/fieldGrid.ts';
import { groupsFor, hasRoomFor, OFF_SITE_FACTOR, reconcilePlots, siteFactors, usedLandFields } from '../src/core/colony/plots.ts';
import { buildingSettings, createEconomy, productionRates, setBuildingSettings, upgradeBuilding } from '../src/core/economy/economy.ts';
import { FIELDS_MAX, FIELDS_MIN } from '../src/core/generation/fields.ts';
import { generatePlanet } from '../src/core/generation/generatePlanet.ts';
import { parsePlots } from '../src/core/save/empire.ts';
import { parseEconomy } from '../src/core/save/save.ts';
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

test('siatka pól: dokładnie tyle pól lądu, ile mówi seed (woda między nimi); głównie 5- i 6-kąty', () => {
  for (const def of PLANET_DEFINITIONS) {
    const planet = generatePlanet(def, 'PF-GRID');
    const grid = buildFieldGrid(planet);
    assert.equal(buildableCount(grid), planet.gameplay.fields, `${def.id}: pola lądu = liczba z seeda`);
    assert.ok(grid.cells.length >= planet.gameplay.fields);
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
  const oceanPlanet = generatePlanet(findDefinition('ocean')!, 'PF-OCEAN');
  const ocean = fieldGrid(oceanPlanet);
  const land = ocean.cells.filter((c) => c.kind === 'land').length;
  assert.equal(buildableCount(ocean), land);
  assert.equal(land, oceanPlanet.gameplay.fields, 'planeta oceaniczna też ma pełną liczbę pól lądu');
  assert.ok(buildableCount(ocean, { water: true }) > land);
  // Planeta startowa: 100 pól do zabudowy (mimo mórz i lodu na biegunach).
  assert.equal(buildableCount(fieldGrid(generatePlanet(STARTER.definition, STARTER.seed))), 100);
});

test('gospodarka: bez miejsca na polach — czytelny błąd; bez limitu — jak dotąd', () => {
  const state = { ...createEconomy(0), stock: { metal: 1e6, crystal: 1e6 } };
  assert.equal(upgradeBuilding(state, 'metalMine', 0, BALANCE, { hasRoom: () => true }).ok, true);
  const full = upgradeBuilding(state, 'metalMine', 0, BALANCE, { hasRoom: () => false });
  assert.equal(full.ok, false);
  assert.equal(full.reason, 'no-fields');
  assert.match(full.message, /brak wolnego pola/);
  assert.equal(upgradeBuilding(state, 'metalMine', 0, BALANCE).ok, true);
});

test('grupy: jedno pole mieści 3 poziomy jednego budynku; przydział stabilny, anulowanie zwalnia pole', () => {
  const grid = fieldGrid(generatePlanet(STARTER.definition, STARTER.seed));
  assert.equal(groupsFor(0), 0);
  assert.equal(groupsFor(3), 1);
  assert.equal(groupsFor(4), 2);
  const a = reconcilePlots(grid, {}, levels({ metalMine: 3, crystalMine: 2, powerPlant: 4 }), ORDER);
  assert.equal(a.metalMine!.length, 1);
  assert.equal(a.crystalMine!.length, 1);
  assert.equal(a.powerPlant!.length, 2);
  const b = reconcilePlots(grid, a, levels({ metalMine: 7, crystalMine: 2, powerPlant: 4, storage: 1 }), ORDER);
  assert.deepEqual(b.metalMine!.slice(0, 1), a.metalMine);
  assert.deepEqual(b.powerPlant, a.powerPlant);
  assert.equal(b.metalMine!.length, 3);
  const cells = Object.values(b).flat();
  assert.equal(new Set(cells).size, cells.length, 'jedno pole — jedna grupa');
  const cancelled = reconcilePlots(grid, b, levels({ metalMine: 6, crystalMine: 2, powerPlant: 4, storage: 1 }), ORDER);
  assert.deepEqual(cancelled.metalMine, b.metalMine!.slice(0, 2));
  assert.equal(usedLandFields(grid, b), cells.filter((c) => grid.cells[c!]!.kind === 'land').length);
});

test('teren: kopalnie metalu na wzgórzach, elektrownie na brzegu, kryształy w dolinach, górach albo na lodzie', () => {
  const grid = fieldGrid(generatePlanet(STARTER.definition, STARTER.seed));
  const lv = levels({ metalMine: 9, crystalMine: 9, powerPlant: 9 });
  const plots = reconcilePlots(grid, {}, lv, ORDER);
  for (const c of plots.metalMine!) assert.equal(grid.cells[c]!.terrain, 'hill');
  for (const c of plots.powerPlant!) assert.ok(grid.cells[c]!.coast, 'elektrownia na brzegu');
  for (const c of plots.crystalMine!) {
    const cell = grid.cells[c]!;
    assert.ok(cell.kind === 'ice' || cell.terrain === 'valley' || cell.terrain === 'mountain');
  }
  const kinds = new Set(grid.cells.filter((c) => c.kind === 'land').map((c) => c.terrain));
  for (const t of ['valley', 'plain', 'hill', 'mountain'] as const) assert.ok(kinds.has(t), t);
  assert.equal(siteFactors(grid, plots, lv).metalMine, 1);
  // Kopalnia na niepasującym polu: 3 z 6 poziomów w 75% → 87,5%.
  const used = Object.values(plots).flat();
  const plain = grid.cells.findIndex((c, i) => c.kind === 'land' && c.terrain === 'plain' && !used.includes(i));
  const mixed = { ...plots, metalMine: [plots.metalMine![0]!, plain] };
  assert.equal(siteFactors(grid, mixed, levels({ metalMine: 6 })).metalMine, 0.875);
  assert.equal(OFF_SITE_FACTOR, 0.75);
});

test('kryształy na lodzie nie zajmują pól lądu; inne budynki na lodzie nie stają; brak miejsca wykrywany', () => {
  const grid = fieldGrid(generatePlanet(findDefinition('ice')!, 'PF-ICE-CRYSTAL'));
  const ice = grid.cells.findIndex((c) => c.kind === 'ice');
  assert.ok(ice >= 0);
  const plots = reconcilePlots(grid, { crystalMine: [ice], metalMine: [ice] }, levels({ crystalMine: 3, metalMine: 3 }), ORDER);
  assert.deepEqual(plots.crystalMine, [ice]);
  assert.notEqual(plots.metalMine![0], ice, 'kopalnia metalu przeniesiona z lodu na ląd');
  assert.equal(usedLandFields(grid, { crystalMine: [ice] }), 0);
  const all = levels({ metalMine: buildableCount(grid) * 3 });
  const placed = reconcilePlots(grid, {}, all, ORDER);
  assert.equal(hasRoomFor(grid, placed, all, 'metalMine', ORDER), false);
  assert.equal(hasRoomFor(grid, {}, levels({ metalMine: 1 }), 'metalMine', ORDER), true);
});

test('zarządzanie: produktywność skaluje wydobycie i energię, pierwszeństwo decyduje przy niedoborze', () => {
  const planet = generatePlanet(STARTER.definition, STARTER.seed);
  const base = { ...createEconomy(0), levels: levels({ metalMine: 10, crystalMine: 10, powerPlant: 6, storage: 1 }) };
  const r0 = productionRates(base, planet);
  assert.ok(r0.efficiency < 1, 'niedobór energii');
  assert.equal(r0.efficiencyBy.metalMine, r0.efficiencyBy.crystalMine, 'równe pierwszeństwo — równa wydajność');
  const r1 = productionRates(setBuildingSettings(base, 'crystalMine', { priority: 0.5 }), planet);
  assert.ok(r1.efficiencyBy.metalMine! > r0.efficiencyBy.metalMine!, 'metal dostaje energię najpierw');
  assert.ok(r1.metal > r0.metal && r1.crystal < r0.crystal);
  const r2 = productionRates(setBuildingSettings(base, 'crystalMine', { work: 0 }), planet);
  assert.ok(r2.energyUsed < r0.energyUsed && r2.crystal === BALANCE.passiveIncome.crystal, 'wyłączony ekstraktor nie zużywa energii');
  assert.deepEqual(buildingSettings(setBuildingSettings(base, 'metalMine', { work: 0.333 }), 'metalMine'), { work: 0.35, priority: 1 });
  assert.ok(productionRates({ ...base, siteFactor: { metalMine: 0.75 } }, planet).metal < r0.metal, 'teren obniża wydobycie');
});

test('zapis pól: poprawne wczytane, błędne pominięte', () => {
  assert.deepEqual(parsePlots({ metalMine: [1, 2, 3], storage: [4, -1, 2.5, 'x'], nieznany: [1] }), { metalMine: [1, 2, 3], storage: [4] });
  assert.deepEqual(parsePlots(null), {});
  const e = parseEconomy({ ...createEconomy(0), settings: { metalMine: { work: 0.5, priority: 0.2 }, storage: { work: 3, priority: 1 } }, siteFactor: { metalMine: 0.875, crystalMine: -1 } });
  assert.deepEqual(e?.settings, { metalMine: { work: 0.5, priority: 0.2 } });
  assert.deepEqual(e?.siteFactor, { metalMine: 0.875 });
});
