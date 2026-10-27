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
import { angleBetween, layoutFromPlots } from '../src/planet-renderer/colony.ts';
import { createSurfaceSampler } from '../src/planet-renderer/surface.ts';

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
  // Trzy sąsiednie pola lodu (teren kryształów, v0.38.2): pole i dwóch jego sąsiadów + wolny lód obok.
  const icy = (i: number) => grid.cells[i]!.kind === 'ice';
  const a = grid.cells.findIndex((cell, i) => icy(i) && cell.neighbors.filter(icy).length >= 3);
  const [b, c] = grid.cells[a]!.neighbors.filter(icy);
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
  const far = grid.cells.map((_, i) => i).filter((i) => icy(i) && ![a, b, c].includes(i) && !grid.cells[a]!.neighbors.includes(i) && !grid.cells[b!]!.neighbors.includes(i));
  const spread = { crystalMine: [a, far[far.length - 1]!, far[far.length - 8]!] };
  assert.match((mergeCandidate(grid, spread, lv(9), [], family) as { reason: string }).reason, /obok siebie/);
  // Pełne pola poza lodem nie łączą się (dedykowany teren).
  const land = grid.cells.map((_, i) => i).filter((i) => grid.cells[i]!.kind === 'land');
  assert.match((mergeCandidate(grid, { crystalMine: land.slice(0, 3) }, lv(9), [], family) as { reason: string }).reason, /lód/);
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
    // Szyb stoi na lodzie (teren kryształów) — pola lodu liczą się do limitu dopiero po „Budowie na lodzie”.
    assert.equal(game.footprint('crystalMine').length, 4, 'szyb zajmuje pole');
    assert.equal(game.colony().complexes.length, 1);
    const hub = game.colony().complexes[0]!.hubs[0]!;
    assert.ok(!Object.values(game.colony().plots).flat().includes(hub), 'na polu szybu nie stanie budynek');
    assert.equal(deserializeEmpire(localStorage.getItem(EMPIRE_KEY))?.slots[0]?.complexes?.length, 1);
    const again = new GameController(1000);
    assert.equal(again.colony().complexes.length, 1, 'kompleks po wczytaniu');
    assert.ok(again.splitComplex('crystalMine', 2000).ok);
    assert.equal(again.colony().complexes.length, 0);
    assert.equal(again.footprint('crystalMine').length, 3);
    assert.equal(again.fields.used, before.fields);
  });
});

test('karta budowli i obrys zajętości (v0.38.1): etapy, parametry z gospodarki, kontur bez wewnętrznych krawędzi', async () => {
  const { outlineBorders } = await import('../src/planet-renderer/fieldOverlay.ts');
  const a = grid.cells.findIndex((c) => c.kind === 'land' && c.neighbors.length >= 4);
  const b = grid.cells[a]!.neighbors[0]!;
  const lines = outlineBorders(grid, [a, b]);
  assert.ok(lines.length > 0);
  for (const i of lines) {
    const { a: x, b: y } = grid.borders[i]!;
    assert.ok([a, b].includes(x) !== [a, b].includes(y), 'tylko granica z zewnętrzem');
  }
  withMemoryStorage(() => {
    const game = new GameController(0);
    game.economy = { ...game.economy, levels: { ...game.economy.levels, crystalMine: 9, storage: 6 }, stock: { metal: 9000, crystal: 9000 } };
    let card = game.buildingCard('crystalMine');
    assert.equal(card.stage, 'Wiertło z szybem');
    assert.deepEqual(card.stages.map((s) => s.state), ['done', 'current', 'next', 'locked', 'soon']);
    assert.match(card.next!, /Wspólne szyby/);
    assert.match(card.output!, /kryształów\/min/);
    assert.equal(card.fields, 3);
    game.research = { done: ['crystal-complex'], current: null };
    assert.ok(game.mergeComplex('crystalMine', 0).ok);
    card = game.buildingCard('crystalMine');
    assert.equal(card.stage, 'Kompleks wiertniczy');
    assert.equal(card.fields, 4, 'pole szybu w zajętości budowli');
    assert.equal(game.footprint('crystalMine').length, 4);
    assert.deepEqual(game.buildingCard('storage').stages, []);
  });
});

test('wybór pola przez gracza (v0.38.2): tylko gdy poziom otwiera nowe pole, tylko dedykowany teren, budowa na wybranym polu', () => {
  withMemoryStorage(() => {
    const game = new GameController(0);
    game.economy = { ...game.economy, levels: { ...game.economy.levels, metalMine: 3, storage: 6 }, stock: { metal: 50000, crystal: 50000 } };
    const choice = game.placement('metalMine');
    assert.equal(choice.needed, true, 'poziom 4 otwiera nowe pole');
    assert.equal(choice.terrain, 'wzgórza i góry');
    assert.ok(choice.cells.length > 0);
    const plain = game.colony().grid.cells.findIndex((c) => c.kind === 'land' && c.terrain === 'plain');
    assert.equal(game.upgradeAt('metalMine', plain, 0).ok, false, 'równina to nie teren kopalni');
    const wish = choice.cells[choice.cells.length - 1]!;
    const result = game.upgradeAt('metalMine', wish, 0);
    assert.ok(result.ok, result.message);
    assert.equal(game.colony().plots.metalMine![1], wish, 'nowa grupa stoi na wybranym polu');
    assert.equal(game.placement('metalMine').needed, false, 'w trakcie budowy — bez wyboru');
    assert.equal(game.buildingCard('metalMine').placement, null);
  });
});

test('wielka fabryka (v0.39): łączenie zakładów na wzgórzach i w górach, tryby pracy zmieniają metal i energię, zapis', () => {
  withMemoryStorage(() => {
    const game = new GameController(0);
    game.economy = { ...game.economy, levels: { ...game.economy.levels, metalMine: 9, powerPlant: 12, storage: 7 }, stock: { metal: 50000, crystal: 50000 } };
    game.research = { done: ['metal-factory'], current: null };
    const view = game.complexView('metalMine')!;
    assert.equal(view.name, 'Wielka fabryka');
    assert.ok(view.candidate, view.reason ?? '');
    const grid = game.colony().grid;
    for (const c of [...view.candidate!.cells, ...view.candidate!.hubs]) assert.ok(['hill', 'mountain'].includes(grid.cells[c]!.terrain));
    assert.ok(game.mergeComplex('metalMine', 0).ok);
    const factory = game.factoryView('metalMine')!;
    assert.equal(factory.complexes.length, 1);
    const [balanced, max, eco] = factory.complexes[0]!.modes;
    assert.equal(balanced!.active, true);
    assert.ok(max!.energyUse > balanced!.energyUse && eco!.energyUse < balanced!.energyUse, 'energia zależy od trybu');
    assert.ok(eco!.outputPerMinute < balanced!.outputPerMinute);
    // Wybór trybu: gra liczy dokładnie to, co pokazał podgląd.
    assert.ok(game.setComplexMode(factory.complexes[0]!.index, 'eco', 0).ok);
    assert.ok(Math.abs(game.rates.energyUsed - eco!.energyUse) < 1e-6);
    assert.ok(Math.abs(game.rates.fromDeposits.metal - eco!.outputPerMinute) < 1e-6);
    assert.equal(game.buildingCard('metalMine').factory, 'Ekran: wielka fabryka');
    assert.equal(game.setComplexMode(0, 'turbo', 0).ok, false);
    // Zapis: tryb, mnożnik energii i premia > 1 (wcześniej odrzucana przy odczycie) przetrwają wczytanie.
    const saved = deserializeEmpire(localStorage.getItem(EMPIRE_KEY))!;
    assert.equal(saved.slots[0]!.complexes![0]!.mode, 'eco');
    assert.ok((saved.slots[0]!.economy.energyFactor?.metalMine ?? 1) < 1);
    const again = new GameController(1000);
    assert.equal(again.factoryView('metalMine')!.complexes[0]!.mode, 'eco');
  });
});

test('zapis (v0.39): premia kompleksu w siteFactor > 1 nie jest odrzucana', () => {
  withMemoryStorage(() => {
    const game = new GameController(0);
    game.economy = { ...game.economy, levels: { ...game.economy.levels, crystalMine: 9, storage: 6 }, stock: { metal: 9000, crystal: 9000 } };
    game.research = { done: ['crystal-complex'], current: null };
    assert.ok(game.mergeComplex('crystalMine', 0).ok);
    const saved = deserializeEmpire(localStorage.getItem(EMPIRE_KEY))!;
    assert.ok((saved.slots[0]!.economy.siteFactor?.crystalMine ?? 0) > 1);
  });
});

test('sieć Tesli (v0.40): łączenie węzłów elektrowni na równinach, +energia, etapy rozwoju', () => {
  withMemoryStorage(() => {
    const game = new GameController(0);
    game.economy = { ...game.economy, levels: { ...game.economy.levels, powerPlant: 12, storage: 7 }, stock: { metal: 50000, crystal: 50000 } };
    const locked = game.complexView('powerPlant')!;
    assert.equal(locked.unlocked, false);
    assert.equal(locked.research, '„Przesył bezprzewodowy” (Badania → Produktywność)');
    assert.equal(game.mergeComplex('powerPlant', 0).ok, false);
    game.research = { done: ['tesla-grid'], current: null };
    const view = game.complexView('powerPlant')!;
    assert.equal(view.name, 'Sieć Tesli');
    assert.equal(view.resource, 'energy');
    assert.ok(view.candidate, view.reason ?? '');
    const grid = game.colony().grid;
    for (const c of [...view.candidate!.cells, ...view.candidate!.hubs]) assert.equal(grid.cells[c]!.terrain, 'plain');
    const before = game.rates.energyProduced;
    assert.ok(view.candidate!.gainPerMinute > 0);
    assert.ok(game.mergeComplex('powerPlant', 0).ok);
    assert.ok(Math.abs(game.rates.energyProduced - before - view.candidate!.gainPerMinute) < 1e-6, 'podgląd = gra');
    const card = game.buildingCard('powerPlant');
    assert.equal(card.factory, null, 'sieć bez trybów — bez ekranu fabryki');
    assert.ok(card.stages.some((s) => s.name === 'Sieć Tesli' && s.state === 'current'));
    // Na planecie: wieża przesyłowa z trzema węzłami.
    const col = game.colony();
    const layout = layoutFromPlots(col.grid, col.plots, createSurfaceSampler(game.planet), ['powerPlant'], col.complexes);
    const hub = layout.hubs.find((h) => h.building === 'powerPlant')!;
    assert.equal(hub.members.length, 3);
    assert.equal(layout.rigs.filter((r) => r.building === 'powerPlant').length, 4, 'poz. 12 = 4 pełne pola');
  });
});

test('poziomy wizualne (v0.41): etap co 5 poziomów, karta pokazuje bieżący i następny', async () => {
  const { visualTier, VISUAL_TIERS } = await import('../src/data/industry.ts');
  assert.equal(VISUAL_TIERS.length, 6);
  assert.deepEqual([0, 1, 5, 6, 10, 11, 16, 21, 26, 30, 40].map(visualTier), [1, 1, 1, 2, 2, 3, 4, 5, 6, 6, 6]);
  withMemoryStorage(() => {
    const game = new GameController(0);
    game.economy = { ...game.economy, levels: { ...game.economy.levels, metalMine: 12 } };
    const look = game.buildingCard('metalMine').look;
    assert.deepEqual(look, { tier: 3, max: 6, name: 'Hale boczne', nextFrom: 16, nextName: 'Przewody i maszt' });
    game.economy = { ...game.economy, levels: { ...game.economy.levels, metalMine: 30 } };
    assert.equal(game.buildingCard('metalMine').look.nextFrom, null);
  });
});

test('przemieniony teren (v0.42): wokół kompleksu, nie pod konstrukcjami, ten sam z zapisu', () => {
  withMemoryStorage(() => {
    const game = new GameController(0);
    game.economy = { ...game.economy, levels: { ...game.economy.levels, powerPlant: 12, storage: 7 }, stock: { metal: 50000, crystal: 50000 } };
    game.research = { done: ['tesla-grid'], current: null };
    const sampler = createSurfaceSampler(game.planet);
    const before = game.colony();
    assert.equal(layoutFromPlots(before.grid, before.plots, sampler, ['powerPlant'], before.complexes).marks.length, 0, 'bez kompleksu — teren bez zmian');
    assert.ok(game.mergeComplex('powerPlant', 0).ok);
    const col = game.colony();
    const layout = layoutFromPlots(col.grid, col.plots, sampler, ['powerPlant'], col.complexes);
    assert.ok(layout.marks.length > 20, `elementów: ${layout.marks.length}`);
    assert.ok(layout.marks.every((m) => m.kind === 'charged' && m.hub === 0));
    const hub = layout.hubs[0]!;
    assert.ok(layout.marks.every((m) => angleBetween(m.dir, hub.dir) >= 0.09), 'wolny krąg wokół wieży');
    const near = new Set(col.complexes[0]!.cells.concat(col.complexes[0]!.hubs).flatMap((c) => [c, ...col.grid.cells[c]!.neighbors]));
    assert.ok(layout.marks.every((m) => near.has(col.grid.owner[col.grid.samples.indexOf(m.dir)]!)), 'tylko pola kompleksu i sąsiednie');
    // Wczytana gra: ten sam teren.
    const again = new GameController(1000);
    const col2 = again.colony();
    assert.deepEqual(layoutFromPlots(col2.grid, col2.plots, sampler, ['powerPlant'], col2.complexes).marks, layout.marks);
  });
});

test('megakompleks (v0.43): dwa stykające się kompleksy, premia +60%, zapis, rozpad przy rozłączeniu', () => {
  withMemoryStorage(() => {
    const game = new GameController(0);
    game.research = { done: ['metal-factory'], current: null };
    game.economy = { ...game.economy, levels: { ...game.economy.levels, metalMine: 18, powerPlant: 30, storage: 10 }, stock: { metal: 90000, crystal: 90000 } };
    assert.ok(game.mergeComplex('metalMine', 0).ok);
    assert.equal(game.complexView('metalMine')!.mega.reason, 'Potrzeba 2 kompleksów poza megakompleksem — masz 1.');
    assert.ok(game.mergeComplex('metalMine', 0).ok);
    assert.equal(game.mergeMega('metalMine', 0).ok, false, 'bez badania');
    game.research = { done: ['metal-factory', 'megastructures'], current: null };
    const view = game.complexView('metalMine')!.mega;
    assert.ok(view.candidate && view.candidate.gainPerMinute > 0);
    const before = game.rates.metal;
    const stock = game.economy.stock.metal;
    assert.ok(game.mergeMega('metalMine', 0).ok);
    assert.equal(game.economy.stock.metal, stock - 6000);
    assert.ok(Math.abs(game.rates.metal - before - view.candidate!.gainPerMinute) < 1e-6, 'podgląd = gra');
    assert.equal(game.complexView('metalMine')!.mega.count, 1);
    assert.equal(game.buildingCard('metalMine').stage, 'Megakompleks metalowy');
    // Na planecie: główny przewód między konstrukcjami pary, obie oznaczone jako megakompleks.
    const col = game.colony();
    const layout = layoutFromPlots(col.grid, col.plots, createSurfaceSampler(game.planet), ['metalMine'], col.complexes);
    assert.ok(layout.hubs.every((h) => h.mega));
    assert.equal(layout.hubs.reduce((n, h) => n + h.members.length, 0), 3 + 3 + 1);
    // Zapis i wczytanie.
    const again = new GameController(1000);
    assert.equal(again.complexView('metalMine')!.mega.count, 1);
    // Rozłączenie kompleksu rozbija megakompleks (drugi kompleks zostaje).
    assert.ok(again.splitComplex('metalMine', 2000).ok);
    assert.equal(again.complexView('metalMine')!.mega.count, 0);
    assert.equal(again.complexView('metalMine')!.count, 1);
  });
});
