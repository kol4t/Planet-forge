import assert from 'node:assert/strict';
import { test } from 'node:test';
import { GameController } from '../src/app/GameController.ts';
import { fullGroupCells, mergeCandidate, parseComplexes, reservedCells, validComplexes } from '../src/core/colony/complexes.ts';
import { fieldGrid } from '../src/core/colony/fieldGrid.ts';
import { generatePlanet } from '../src/core/generation/generatePlanet.ts';
import { deserializeEmpire, EMPIRE_KEY } from '../src/core/save/empire.ts';
import { COMPLEX_FAMILIES, findFamily } from '../src/data/complexes.ts';
import { STARTER } from '../src/data/planets.ts';
import { findResearch } from '../src/data/research.ts';

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

const family = findFamily('crystalMine')!;
const lv = (crystalMine: number) => ({ metalMine: 0, crystalMine, powerPlant: 0, storage: 1, antimatterCollector: 0, laboratory: 0 });
const grid = fieldGrid(generatePlanet(STARTER.definition, STARTER.seed));

test('kompleksy: pełne grupy, sąsiedztwo, wolne pole szybu, ważność po zburzeniu', () => {
  // Trzy sąsiednie pola: pole i dwóch jego sąsiadów, którzy też są sąsiadami pierwszego.
  const a = grid.cells.findIndex((c) => c.kind === 'land' && c.neighbors.length >= 4);
  const [b, c] = grid.cells[a]!.neighbors.filter((n) => grid.cells[n]!.kind === 'land');
  const plots = { crystalMine: [a, b!, c!] };
  assert.deepEqual(fullGroupCells(plots, lv(8), 'crystalMine'), [a, b]);
  assert.match((mergeCandidate(grid, plots, lv(8), [], family) as { reason: string }).reason, /3 pełnych pól/);
  const found = mergeCandidate(grid, plots, lv(9), [], family);
  assert.ok(found.ok);
  if (!found.ok) return;
  assert.deepEqual(found.cells, [a, b, c]);
  assert.equal(found.hubs.length, 1);
  assert.ok(![a, b, c].includes(found.hubs[0]!));
  assert.ok(grid.cells[found.hubs[0]!]!.neighbors.some((n) => [a, b, c].includes(n)), 'szyb obok połączonych pól');
  const complex = { family: family.id, building: 'crystalMine' as const, cells: found.cells, hubs: found.hubs };
  assert.equal(validComplexes([complex], plots, lv(9)).length, 1);
  assert.equal(validComplexes([complex], plots, lv(8)).length, 0, 'zburzenie poziomu rozbija kompleks');
  assert.equal(validComplexes([complex], { ...plots, metalMine: [found.hubs[0]!] }, lv(9)).length, 0);
  assert.deepEqual([...reservedCells([complex])], found.hubs);
  // Pola daleko od siebie — brak połączenia.
  const far = grid.cells.map((_, i) => i).filter((i) => grid.cells[i]!.kind === 'land' && ![a, b, c].includes(i) && !grid.cells[a]!.neighbors.includes(i));
  const spread = { crystalMine: [a, far[40]!, far[80]!] };
  assert.match((mergeCandidate(grid, spread, lv(9), [], family) as { reason: string }).reason, /obok siebie/);
  assert.deepEqual(parseComplexes([complex, { family: 'x', cells: [1], hubs: [2] }, { family: family.id, cells: [-1], hubs: [] }], COMPLEX_FAMILIES), [complex]);
});

test('kompleksy: kontroler — badanie, połączenie z kosztem, premia, pole szybu zajęte, rozłączenie, zapis', () => {
  withMemoryStorage(() => {
    const game = new GameController(0);
    assert.deepEqual(findResearch('crystal-complex')!.effects, [{ kind: 'unlock', feature: 'crystal-complex' }]);
    game.economy = { ...game.economy, levels: { ...game.economy.levels, crystalMine: 9, storage: 6 }, stock: { metal: 9000, crystal: 9000 } };
    const view = game.complexView('crystalMine')!;
    assert.equal(view.unlocked, false);
    assert.match(game.mergeComplex('crystalMine', 0).message, /Wspólne szyby/);
    game.research = { done: ['crystal-complex'], current: null };
    const ready = game.complexView('crystalMine')!;
    assert.ok(ready.candidate, ready.reason ?? '');
    assert.ok(ready.candidate!.gainPerMinute > 0);
    const before = { rate: game.rates.crystal, fields: game.fields.used };
    const merged = game.mergeComplex('crystalMine', 0);
    assert.ok(merged.ok, merged.message);
    assert.equal(game.economy.stock.metal, 9000 - family.cost.metal);
    assert.ok(game.rates.crystal > before.rate);
    assert.ok(Math.abs(game.rates.crystal - before.rate - ready.candidate!.gainPerMinute) < 1e-9, 'podgląd = wynik');
    assert.equal(game.fields.used, before.fields + family.extraFields, 'szyb zajmuje pole');
    assert.equal(game.colony().complexes.length, 1);
    const hub = game.colony().complexes[0]!.hubs[0]!;
    assert.ok(!Object.values(game.colony().plots).flat().includes(hub), 'na polu szybu nie stanie budynek');
    assert.equal(deserializeEmpire(localStorage.getItem(EMPIRE_KEY))?.slots[0]?.complexes?.length, 1);
    const again = new GameController(1000);
    assert.equal(again.colony().complexes.length, 1, 'kompleks po wczytaniu');
    assert.ok(again.splitComplex('crystalMine', 2000).ok);
    assert.equal(again.colony().complexes.length, 0);
    assert.equal(again.fields.used, before.fields);
  });
});
