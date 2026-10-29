import assert from 'node:assert/strict';
import { test } from 'node:test';
import { buildableCount, ensureSeaBorders, buildFieldGrid, fieldGrid, isBuildable } from '../src/core/colony/fieldGrid.ts';
import { choiceCells, fieldCapacity, hasRoomFor, OFF_SITE_FACTOR, reconcilePlots, siteFactors, usedLandFields } from '../src/core/colony/plots.ts';
import { fieldsFor, stageName, stageOf } from '../src/core/economy/footprint.ts';
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

test('siatka pól na mapie powierzchni: dokładnie tyle pól lądu, ile mówi seed; pola obejmują jeden rodzaj terenu, pola morza na końcu', () => {
  for (const def of PLANET_DEFINITIONS) {
    const planet = generatePlanet(def, 'PF-GRID');
    const grid = buildFieldGrid(planet);
    assert.equal(buildableCount(grid), planet.gameplay.fields, `${def.id}: pola lądu = liczba z seeda`);
    grid.cells.forEach((cell, i) => {
      // Ląd i lód najpierw, pola morza (woda, lawa — v0.57) na końcu listy.
      if (i < grid.seaCellStart) assert.ok(cell.kind === 'land' || cell.kind === 'ice', `${def.id}: ląd i lód przed polami morza`);
      else assert.ok(cell.kind === 'water' || cell.kind === 'lava', `${def.id}: pola morza na końcu`);
      assert.ok(Math.abs(Math.hypot(...cell.center) - 1) < 1e-9);
      assert.ok(cell.members.length > 0);
      // Każdy punkt pola ma rodzaj pola (granica nie obejmuje wody) i należy do niego.
      for (const p of cell.members) {
        assert.equal(grid.kinds[p], cell.kind);
        assert.equal(grid.owner[p], i);
      }
      assert.equal(grid.owner[grid.samples.indexOf(cell.center)], i, 'środek leży w polu');
      for (const n of cell.neighbors) assert.ok(grid.cells[n]!.neighbors.includes(i), 'sąsiedztwo symetryczne');
    });
    // Pola podobnej wielkości (wyrównane): największe najwyżej kilka razy większe od mediany.
    const sizes = grid.cells.filter((c) => c.kind === 'land').map((c) => c.members.length).sort((a, b) => a - b);
    assert.ok(sizes[sizes.length - 1]! < sizes[sizes.length >> 1]! * 4, `${def.id}: rozmiary ${sizes[0]}…${sizes[sizes.length - 1]}`);
    assert.ok(grid.borders.length > 0 && grid.borders.every((b) => b.a >= 0 && b.a !== b.b));
    // Granice lądu i lodu nie wskazują pól morza; granice pól morza (dopisane na żądanie) mają pole morza po stronie `a`.
    const land = grid.borders.length;
    assert.equal(land, grid.seaBorderStart, 'bez pól morza w użyciu — same granice lądu i lodu');
    ensureSeaBorders(grid);
    ensureSeaBorders(grid);
    if (grid.cells.length > grid.seaCellStart) assert.ok(grid.borders.length > land, `${def.id}: granice pól morza dopisane`);
    grid.borders.forEach((b, i) => {
      if (i < grid.seaBorderStart) assert.ok(b.a < grid.seaCellStart && b.b < grid.seaCellStart);
      else assert.ok(b.a >= grid.seaCellStart);
    });
    assert.equal(grid.cells[grid.colonyCenter]!.kind, 'land');
    assert.deepEqual(buildFieldGrid(planet).cells.map((c) => c.members.length), grid.cells.map((c) => c.members.length), 'deterministyczna');
  }
});

test('lód ma własne pola (bieguny), brzeg to część pól lądu, nie wszystkie', () => {
  const grid = fieldGrid(generatePlanet(STARTER.definition, STARTER.seed));
  const ice = grid.cells.filter((c) => c.kind === 'ice');
  assert.ok(ice.length > 0, 'czapy polarne podzielone na pola');
  assert.ok(ice.some((c) => Math.abs(c.center[1]) > 0.9), 'pole lodu przy biegunie');
  const land = grid.cells.filter((c) => c.kind === 'land');
  const coast = land.filter((c) => c.coast).length;
  assert.ok(coast > 0.2 * land.length && coast < 0.5 * land.length, `brzeg ${coast}/${land.length}`);
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
  // Planeta startowa: 100 pól do zabudowy (mimo mórz i lodu na biegunach).
  assert.equal(buildableCount(fieldGrid(generatePlanet(STARTER.definition, STARTER.seed))), 100);
});

test('gospodarka: bez miejsca na polach — czytelny błąd z etapem i liczbą pól; bez limitu — jak dotąd', () => {
  const state = { ...createEconomy(0), levels: { ...createEconomy(0).levels, metalMine: 5 }, stock: { metal: 1e6, crystal: 1e6 } };
  assert.equal(upgradeBuilding(state, 'metalMine', 0, BALANCE, { hasRoom: () => true }).ok, true);
  const full = upgradeBuilding(state, 'metalMine', 0, BALANCE, { hasRoom: () => false });
  assert.equal(full.ok, false);
  assert.equal(full.reason, 'no-fields');
  // Poziom 6 (Zakład przetwórczy) potrzebuje 6 pól, a kopalnia ma 3 — brakuje 3.
  assert.match(full.message, /Kopalnia metalu poz\. 6 \(Zakład przetwórczy\) potrzebuje 6 pól/);
  assert.match(full.message, /3 wolnych pól/);
  assert.equal(upgradeBuilding(state, 'metalMine', 0, BALANCE).ok, true);
});

test('etapy (v0.45): liczba pól rośnie z poziomem w progach (mała instalacja → zakład → wielka fabryka → megakonstrukt)', () => {
  assert.equal(fieldsFor('metalMine', 0), 0);
  assert.deepEqual([1, 2, 5].map((l) => fieldsFor('metalMine', l)), [1, 2, 3]);
  assert.deepEqual([6, 11].map((l) => fieldsFor('metalMine', l)), [6, 10]);
  assert.deepEqual([12, 19].map((l) => fieldsFor('metalMine', l)), [16, 22]);
  assert.deepEqual([20, 25, 40].map((l) => fieldsFor('metalMine', l)), [40, 50, 50]);
  assert.deepEqual([0, 1, 6, 12, 20].map((l) => stageOf('crystalMine', l)), [-1, 0, 1, 2, 3]);
  assert.equal(stageName('crystalMine', 20), 'Megaodkrywka');
  for (const id of ORDER) {
    for (let l = 1; l < 40; l++) assert.ok(fieldsFor(id, l + 1) >= fieldsFor(id, l), `${id} ${l}: pola nie maleją`);
  }
  // Magazyn, Kolektor, Laboratorium — mniejsze kompleksy.
  assert.ok(fieldsFor('storage', 25) < fieldsFor('metalMine', 25));
});

/** Czy pola tworzą jeden spójny kawałek (sąsiedztwo pól siatki). */
function connected(grid: ReturnType<typeof fieldGrid>, cells: readonly number[]): boolean {
  if (cells.length === 0) return true;
  const want = new Set(cells);
  const seen = new Set([cells[0]!]);
  const stack = [cells[0]!];
  while (stack.length > 0) for (const n of grid.cells[stack.pop()!]!.neighbors) if (want.has(n) && !seen.has(n)) (seen.add(n), stack.push(n));
  return seen.size === want.size;
}

test('obszar (v0.45): jeden spójny kawałek, deterministyczny, n+1 ⊇ n, bez nakładania i bez wody; licznik = suma', () => {
  const grid = fieldGrid(generatePlanet(STARTER.definition, STARTER.seed));
  let plots = {};
  let previous: Partial<Record<BuildingId, number[]>> = {};
  for (let l = 1; l <= 16; l++) {
    const lv = levels({ metalMine: l, crystalMine: Math.max(0, l - 2), powerPlant: Math.floor(l / 2), storage: Math.min(l, 8) });
    plots = reconcilePlots(grid, plots, lv, ORDER);
    const p = plots as Partial<Record<BuildingId, number[]>>;
    for (const id of ORDER) {
      const cells = p[id] ?? [];
      assert.equal(cells.length, fieldsFor(id, lv[id]), `${id} poz. ${lv[id]}`);
      assert.ok(connected(grid, cells), `${id} poz. ${lv[id]}: spójny obszar`);
      assert.deepEqual(cells.slice(0, previous[id]?.length ?? 0), previous[id] ?? [], `${id}: obszar n+1 zawiera obszar n`);
      for (const c of cells) assert.notEqual(grid.cells[c]!.kind, 'water');
    }
    const all = Object.values(p).flat();
    assert.equal(new Set(all).size, all.length, 'kompleksy nie nachodzą na siebie');
    assert.equal(usedLandFields(grid, p), all.length, 'licznik pól = suma obszarów');
    previous = Object.fromEntries(Object.entries(p).map(([k, v]) => [k, [...(v ?? [])]]));
  }
  // Deterministycznie: ten sam wynik od zera.
  assert.deepEqual(reconcilePlots(grid, {}, levels({ metalMine: 13 }), ORDER).metalMine, reconcilePlots(grid, {}, levels({ metalMine: 13 }), ORDER).metalMine);
  // Mniejszy poziom (anulowanie, zburzenie) — obszar maleje od końca.
  const big = reconcilePlots(grid, {}, levels({ metalMine: 12 }), ORDER);
  assert.deepEqual(reconcilePlots(grid, big, levels({ metalMine: 11 }), ORDER).metalMine, big.metalMine!.slice(0, 10));
});

test('teren (v0.38.2): obszar rośnie najpierw na dedykowanym terenie; wybór pola obok obszaru; dopasowanie terenu', () => {
  const grid = fieldGrid(generatePlanet(STARTER.definition, STARTER.seed));
  const lv = levels({ metalMine: 3, crystalMine: 3, powerPlant: 3 });
  const plots = reconcilePlots(grid, {}, lv, ORDER);
  assert.ok(['hill', 'mountain'].includes(grid.cells[plots.metalMine![0]!]!.terrain));
  assert.equal(grid.cells[plots.powerPlant![0]!]!.terrain, 'plain', 'elektrownia na równinie');
  assert.equal(grid.cells[plots.crystalMine![0]!]!.kind, 'ice');
  // Wybór gracza: wolne pola dedykowanego terenu stykające się z obszarem; wybrane pole dostaje następne pole obszaru.
  const choices = choiceCells(grid, plots, 'metalMine');
  assert.ok(choices.length > 0);
  for (const c of choices) {
    assert.ok(['hill', 'mountain'].includes(grid.cells[c]!.terrain) && !Object.values(plots).flat().includes(c));
    assert.ok(grid.cells[c]!.neighbors.some((n) => plots.metalMine!.includes(n)), 'obok obszaru');
  }
  const wish = choices[choices.length - 1]!;
  const placed = reconcilePlots(grid, plots, levels({ metalMine: 6, crystalMine: 3, powerPlant: 3 }), ORDER, {}, { metalMine: wish });
  assert.equal(placed.metalMine![plots.metalMine!.length], wish);
  assert.equal(siteFactors(grid, { metalMine: plots.metalMine }, levels({ metalMine: 3 })).metalMine, 1);
  // Obszar w połowie poza terenem: (1 + 0,75) / 2 = 87,5%; premia budynku mnoży wynik.
  const used = Object.values(plots).flat();
  const off = grid.cells.findIndex((c, i) => c.kind === 'land' && c.terrain === 'valley' && !used.includes(i));
  const mixed = { metalMine: [plots.metalMine![0]!, off] };
  assert.equal(siteFactors(grid, mixed, levels({ metalMine: 2 })).metalMine, 0.875);
  assert.equal(siteFactors(grid, mixed, levels({ metalMine: 2 }), () => 1.3).metalMine, 1.138);
  assert.equal(OFF_SITE_FACTOR, 0.75);
});

test('kryształy stoją na lodzie i liczą się do pól; inne budynki na lodzie nie stają; brak miejsca blokuje', () => {
  const grid = fieldGrid(generatePlanet(findDefinition('ice')!, 'PF-ICE-CRYSTAL'));
  const ice = grid.cells.findIndex((c) => c.kind === 'ice');
  assert.ok(ice >= 0);
  const plots = reconcilePlots(grid, { crystalMine: [ice], metalMine: [ice] }, levels({ crystalMine: 1, metalMine: 1 }), ORDER);
  assert.deepEqual(plots.crystalMine, [ice]);
  assert.notEqual(plots.metalMine![0], ice, 'kopalnia metalu przeniesiona z lodu na ląd');
  // Licznik: kryształy na lodzie zajmują pole i powiększają pulę pól (uczciwe „zajęte / wszystkie”).
  assert.equal(usedLandFields(grid, { crystalMine: [ice] }), 1);
  assert.equal(fieldCapacity(grid, { crystalMine: [ice] }), buildableCount(grid) + 1);
  // Brak miejsca: megakonstrukt na małej planecie się nie mieści — następny poziom zablokowany.
  const small = fieldGrid(generatePlanet(findDefinition('arid')!, '1:4:3'));
  const lv = levels({ metalMine: 21 });
  const placed = reconcilePlots(small, {}, lv, ORDER);
  assert.equal(hasRoomFor(small, placed, lv, 'metalMine', ORDER), false, `pól lądu: ${buildableCount(small)}`);
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

test('kryształy najpierw zajmują lód, ląd dopiero gdy obok obszaru wolnego lodu brak (v0.26.3)', () => {
  const grid = fieldGrid(generatePlanet(findDefinition('ice')!, 'PF-ICE-CRYSTAL'));
  const plots = reconcilePlots(grid, {}, levels({ crystalMine: 12 }), ORDER);
  const kinds = plots.crystalMine!.map((c) => grid.cells[c]!.kind);
  assert.equal(kinds[0], 'ice');
  assert.ok(kinds.filter((k) => k === 'ice').length >= kinds.length / 2, kinds.join(','));
});
