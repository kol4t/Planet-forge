import assert from 'node:assert/strict';
import { test } from 'node:test';
import { GameController } from '../src/app/GameController.ts';
import { buildableCount, fieldGrid } from '../src/core/colony/fieldGrid.ts';
import { usedLandFields } from '../src/core/colony/plots.ts';
import { createEconomy, demolishBuilding, depositTotal, upgradeBuilding } from '../src/core/economy/economy.ts';
import { generatePlanet } from '../src/core/generation/generatePlanet.ts';
import { applyResearch } from '../src/core/research/research.ts';
import { BALANCE } from '../src/data/balance.ts';
import { PLANET_DEFINITIONS, STARTER } from '../src/data/planets.ts';
import { findResearch, RESEARCH_NODES } from '../src/data/research.ts';

function withMemoryStorage(run: () => void): void {
  const store = new Map<string, string>();
  const original = Object.getOwnPropertyDescriptor(globalThis, 'localStorage');
  Object.defineProperty(globalThis, 'localStorage', {
    configurable: true,
    value: {
      getItem: (k: string) => store.get(k) ?? null,
      setItem: (k: string, v: string) => void store.set(k, v),
      removeItem: (k: string) => void store.delete(k),
    },
  });
  try {
    run();
  } finally {
    if (original) Object.defineProperty(globalThis, 'localStorage', original);
    else delete (globalThis as { localStorage?: unknown }).localStorage;
  }
}

const planet = generatePlanet(STARTER.definition, STARTER.seed);

test('Planetologia w trzech ścieżkach i mosty między ramionami', () => {
  const lanes = new Set(RESEARCH_NODES.filter((n) => n.arm === 'planetology' && !n.master).map((n) => n.lane));
  assert.ok(lanes.has(-1) && lanes.has(0) && lanes.has(1), 'Środowisko, Geologia, Osadnictwo');
  // Mosty: badanie wymaga wiedzy z innego ramienia albo innej gałęzi (poza jądrem ramienia).
  const other = (n: (typeof RESEARCH_NODES)[number], r: string) => {
    const req = findResearch(r)!;
    return !req.master && req.id !== 'prod-core' && (req.arm !== n.arm || req.lane !== n.lane);
  };
  const bridges = RESEARCH_NODES.filter((n) => n.requires.some((r) => other(n, r)));
  assert.ok(bridges.length >= 10, `mostów: ${bridges.length}`);
  assert.ok(RESEARCH_NODES.filter((n) => n.requires.some((r) => findResearch(r)!.arm !== n.arm)).length >= 6, 'między ramionami');
  assert.ok(findResearch('mining-3')!.requires.includes('planet-4'));
  assert.ok(findResearch('planet-4')!.requires.includes('mining-1'));
  assert.equal(findResearch('shore')!.soon, true, 'Platformy przybrzeżne — wkrótce');
});

test('Geologia głębinowa i Głębokie szyby powiększają złoża planety', () => {
  const base = depositTotal(planet).metal;
  const deep = depositTotal(planet, applyResearch(BALANCE, ['planet-4'])).metal;
  const both = depositTotal(planet, applyResearch(BALANCE, ['planet-4', 'mining-3'])).metal;
  assert.ok(Math.abs(deep / base - 1.2) < 0.01);
  assert.ok(Math.abs(both / base - 1.35) < 0.01, 'procenty jednego rodzaju sumują się');
});

test('Budowa na lodzie: pola lodu liczą się do pól planety (lodowa planeta przestaje być ciasna)', () => {
  const ice = PLANET_DEFINITIONS.find((d) => d.id === 'ice')!;
  const icy = generatePlanet(ice, 'LÓD-7');
  const grid = fieldGrid(icy);
  const iceCells = grid.cells.filter((c) => c.kind === 'ice').length;
  assert.ok(iceCells > 0, 'lodowa planeta ma pola lodu');
  if (iceCells > 0) assert.ok(buildableCount(grid, { ice: true }) > buildableCount(grid));
  // Od v0.45 licznik to suma obszarów (każde zajęte pole, także lód).
  if (iceCells > 0) {
    const plots = { metalMine: [grid.cells.findIndex((c) => c.kind === 'ice')] };
    assert.equal(usedLandFields(grid, plots), 1);
  }
});

test('Zburzenie poziomu: −1 poziom od razu, bez zwrotu; nie w trakcie budowy ani w kolejce; Magazyn min. 1', () => {
  const e = { ...createEconomy(0), levels: { ...createEconomy(0).levels, metalMine: 4 } };
  const r = demolishBuilding(e, 'metalMine');
  assert.ok(r.ok);
  assert.equal(r.state.levels.metalMine, 3);
  assert.deepEqual(r.state.stock, e.stock);
  assert.equal(demolishBuilding({ ...e, levels: { ...e.levels, antimatterCollector: 0 } }, 'antimatterCollector').ok, false);
  assert.equal(demolishBuilding(e, 'storage').ok, false, 'Magazyn poz. 1 zostaje');
  const building = upgradeBuilding({ ...e, stock: { metal: 9999, crystal: 9999 }, levels: { ...e.levels, storage: 8 } }, 'metalMine', 0);
  assert.ok(building.ok);
  assert.match(demolishBuilding(building.state, 'metalMine').message, /anuluj budowę/);
  assert.match(demolishBuilding({ ...e, queue: ['metalMine'] }, 'metalMine').message, /kolejki/);
});

test('Zburzenie w kontrolerze: obszar kompleksu maleje, gdy mniejszy poziom potrzebuje mniej pól; wpis w dzienniku', () => {
  withMemoryStorage(() => {
    const game = new GameController(0);
    game.economy = { ...game.economy, levels: { ...game.economy.levels, metalMine: 6 } };
    const before = game.fields.used;
    assert.ok(game.demolish('metalMine', 0).ok);
    assert.equal(game.economy.levels.metalMine, 5);
    assert.equal(game.fields.used, before - 3, 'poz. 6 (zakład) = 6 pól, poz. 5 (instalacja) = 3 pola');
    assert.ok(game.journalEntries().some((e) => e.text.includes('zburzono')));
  });
});
