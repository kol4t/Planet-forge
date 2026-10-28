import assert from 'node:assert/strict';
import { test } from 'node:test';
import { GameController } from '../src/app/GameController.ts';
import { fieldGrid } from '../src/core/colony/fieldGrid.ts';
import { reconcilePlots, fieldCapacity, canStand } from '../src/core/colony/plots.ts';
import { parseTransfers, transferCost, transferFlightSeconds, transferFuel, transferRoom, withAnywhere } from '../src/core/economy/constructTransfer.ts';
import { fieldsFor } from '../src/core/economy/footprint.ts';
import { generatePlanet } from '../src/core/generation/generatePlanet.ts';
import { deserializeEmpire, EMPIRE_KEY, parseAfloat } from '../src/core/save/empire.ts';
import type { BuildingId } from '../src/core/types.ts';
import { BALANCE } from '../src/data/balance.ts';
import { PLANET_DEFINITIONS } from '../src/data/planets.ts';
import { colonizeNow } from './helpers.ts';

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

const ORDER: BuildingId[] = BALANCE.buildings.map((b) => b.id);
const LEVELS = { metalMine: 25, crystalMine: 0, powerPlant: 0, storage: 0, antimatterCollector: 0, laboratory: 0 };

test('transfer (v0.56): koszt, paliwo i czas — robocze reguły z BALANCE.transfer', () => {
  const t = BALANCE.transfer;
  assert.equal(t.prepareSeconds, 1800);
  assert.equal(transferFuel(0, BALANCE), t.fuelFactor * BALANCE.fuel.transport.inSystem);
  assert.ok(transferFuel(80, BALANCE) > transferFuel(0, BALANCE), 'między układami więcej paliwa');
  assert.ok(transferFlightSeconds(80, BALANCE) > transferFlightSeconds(0, BALANCE));
  const cost = transferCost('metalMine', 22, BALANCE);
  assert.ok(cost.metal > 0 && cost.crystal > 0 && Number.isInteger(cost.metal));
  assert.ok(transferCost('metalMine', 25, BALANCE).metal > cost.metal, 'wyższy poziom — drożej');
});

test('transfer: konstrukt staje „na każdym polu” (np. kopalnia metalu na lodzie bez badania), licznik pól uczciwy', () => {
  for (const id of ['ice', 'kepler-186f']) {
    const def = PLANET_DEFINITIONS.find((d) => d.id === id)!;
    const planet = generatePlanet(def, `PF-TR-${id}`);
    const grid = fieldGrid(planet);
    const ice = grid.cells.find((c) => c.kind === 'ice');
    assert.ok(ice, `${id}: są pola lodu`);
    assert.equal(canStand('metalMine', ice!, {}), false);
    assert.equal(canStand('metalMine', ice!, withAnywhere({}, ['metalMine'])), true);
    assert.equal(canStand('powerPlant', ice!, withAnywhere({}, ['metalMine'])), false, 'tylko konstrukt, nie inne budynki');
    const room = transferRoom(grid, {}, { ...LEVELS, metalMine: 0 }, 'metalMine', 25, ORDER, {});
    assert.equal(room.needed, fieldsFor('metalMine', 25));
    assert.equal(room.available, room.needed);
    // Bez „na każdym polu” obszar mógłby być mniejszy (sam ląd) — nigdy większy.
    const landOnly = reconcilePlots(grid, {}, LEVELS, ORDER, {}).metalMine!.length;
    assert.ok(landOnly <= room.available);
    const rules = withAnywhere({}, ['metalMine']);
    const plots = reconcilePlots(grid, {}, LEVELS, ORDER, rules);
    const onIce = plots.metalMine!.filter((c) => grid.cells[c]!.kind === 'ice').length;
    assert.equal(fieldCapacity(grid, plots, rules), fieldCapacity(grid, {}, {}) + onIce, 'zajęte pola lodu liczą się do pól planety');
  }
});

test('transfer: odczyt z zapisu z walidacją', () => {
  const ok = { from: '1:1:1', to: '1:1:2', building: 'metalMine', level: 22, family: 'metal-factory', mode: 'eco', startedAt: 0, departsAt: 10, arrivesAt: 20, cost: { metal: 5, crystal: 6 }, fuel: 5 };
  assert.deepEqual(parseTransfers([ok], ORDER), [ok]);
  assert.deepEqual(parseTransfers([{ ...ok, departed: true }], ORDER)[0]!.departed, true);
  for (const bad of [{ ...ok, to: ok.from }, { ...ok, building: 'zamek' }, { ...ok, level: 0 }, { ...ok, arrivesAt: 5 }, { ...ok, cost: null }, null]) {
    assert.deepEqual(parseTransfers([bad], ORDER), []);
  }
  assert.deepEqual(parseTransfers('x', ORDER), []);
  assert.deepEqual(parseAfloat(['metalMine', 'metalMine', 'zamek', 3]), ['metalMine']);
});

function megaGame() {
  const game = new GameController(0);
  const home = game.address;
  const colony = game.system(game.homeSystem)!.planets.find((p) => p.body === 'rocky' && game.occupantAt(p) === 'free')!.address;
  assert.ok(colonizeNow(game, colony, 0).ok);
  assert.ok(game.switchPlanet(0, 0).ok);
  game.research = { done: ['crystal-complex', 'megastructures'], current: null };
  game.economy = { ...game.economy, levels: { ...game.economy.levels, crystalMine: 20, powerPlant: 25, storage: 14 }, stock: { metal: 500_000, crystal: 500_000 }, antimatter: 100 };
  assert.ok(game.mergeComplex('crystalMine', 0).ok);
  assert.ok(game.mergeMega('crystalMine', 0).ok);
  return { game, home, colony };
}

test('transfer: kontroler — rozkładanie (nie pracuje, blokady), anulowanie ze zwrotem, odlot, lądowanie z megakompleksem, zapis', () => {
  withMemoryStorage(() => {
    const { game, home, colony } = megaGame();
    assert.match(game.transferView('metalMine').reason!, /megakompleks/);
    const view = game.transferView('crystalMine', 0);
    assert.equal(view.reason, null);
    const target = view.targets.find((t) => t.address === colony)!;
    assert.ok(target.available >= target.needed && target.needed === fieldsFor('crystalMine', 20));
    assert.ok(target.energy > 0 && target.energy < 1, 'młoda kolonia — po lądowaniu zabraknie energii (ostrzeżenie w oknie)');
    const before = { stock: game.economy.stock, antimatter: game.economy.antimatter };
    const crystalBefore = game.rates.crystal;
    assert.ok(crystalBefore > 0);
    const sent = game.startTransfer('crystalMine', colony, 0);
    assert.ok(sent.ok, sent.message);
    assert.equal(game.economy.antimatter, before.antimatter - target.fuel);
    assert.equal(game.economy.stock.metal, before.stock.metal - view.cost.metal);
    assert.ok(game.rates.crystal < crystalBefore * 0.05, 'rozkładany konstrukt nie wydobywa');
    assert.ok(game.transferView('crystalMine', 0).packing);
    assert.equal(game.upgrade('crystalMine', 0).ok, false);
    assert.equal(game.demolish('crystalMine', 0).ok, false);
    assert.equal(game.splitMega('crystalMine', 0).ok, false);
    assert.equal(game.transfersView(0)[0]!.phase, 'packing');
    // Anulowanie: wszystko wraca.
    assert.ok(game.cancelTransfer('crystalMine', 1000).ok);
    assert.ok(Math.abs(game.economy.antimatter - before.antimatter) < 0.01);
    assert.ok(Math.abs(game.rates.crystal - crystalBefore) < 1e-6, 'pracuje jak przed wysyłką');
    // Jeszcze raz — do końca.
    assert.ok(game.startTransfer('crystalMine', colony, 2000).ok);
    const departs = 2000 + BALANCE.transfer.prepareSeconds * 1000;
    const arrives = departs + target.seconds * 1000;
    game.tick(departs + 1);
    assert.equal(game.economy.levels.crystalMine, 0, 'na planecie nadawcy puste pola');
    assert.equal(game.colony().plots.crystalMine?.length ?? 0, 0);
    assert.equal(game.colony().complexes.some((c) => c.building === 'crystalMine'), false);
    assert.equal(game.transfersView(departs + 1)[0]!.phase, 'flight');
    assert.equal(deserializeEmpire(localStorage.getItem(EMPIRE_KEY))?.transfers?.[0]?.departed, true);
    game.tick(arrives + 1);
    assert.equal(game.transfersView(arrives + 1).length, 0);
    assert.ok(game.switchPlanet(game.planets().findIndex((p) => p.address === colony), arrives + 2).ok);
    assert.equal(game.economy.levels.crystalMine, 20);
    assert.equal(game.colony().complexes.find((c) => c.building === 'crystalMine')?.mega, true);
    assert.equal(game.colony().plots.crystalMine!.length, fieldsFor('crystalMine', 20));
    assert.ok(game.rates.crystal > 0);
    // Po wczytaniu: konstrukt stoi, „na każdym polu” zapamiętane.
    const saved = deserializeEmpire(localStorage.getItem(EMPIRE_KEY))!;
    assert.deepEqual(saved.slots.find((s) => s.planet.address === colony)?.afloat, ['crystalMine']);
    assert.equal(saved.transfers, undefined);
    const fresh = new GameController(arrives + 3);
    assert.equal(fresh.economy.levels.crystalMine, 20);
    assert.equal(game.planets()[0]!.address, home);
  });
});

test('transfer: przeszkody — brak paliwa, zły cel; rozkładanie przetrwa wczytanie', () => {
  withMemoryStorage(() => {
    const { game, colony } = megaGame();
    game.economy = { ...game.economy, antimatter: 0 };
    assert.match(game.startTransfer('crystalMine', colony, 0).message, /paliwa/);
    game.economy = { ...game.economy, antimatter: 100 };
    assert.match(game.startTransfer('crystalMine', '9:9:9', 0).message, /inną swoją planetę/);
    assert.ok(game.startTransfer('crystalMine', colony, 0).ok);
    // Rozkładanie przetrwa wczytanie: budynek dalej nie pracuje i nie da się go ulepszyć.
    const fresh = new GameController(10_000);
    const idle = fresh.rates.crystal;
    assert.equal(fresh.upgrade('crystalMine', 10_000).ok, false);
    assert.ok(fresh.cancelTransfer('crystalMine', 10_000).ok);
    assert.ok(fresh.rates.crystal > idle * 10, 'po anulowaniu pracuje');
  });
});

test('zapis tekstem (PF2): eksport i wczytanie zachowują transfer w toku, stację macierzystą i licznik wyeksploatowanych', () => {
  withMemoryStorage(() => {
    const { game, colony } = megaGame();
    game.research = { done: [...game.research.done, 'station-orbit'], current: null };
    assert.ok(game.buildStation(0).ok);
    assert.ok(game.startTransfer('crystalMine', colony, 0).ok);
    const text = game.exportSave(1000);
    const other = new GameController(1000);
    const loaded = other.importSave(text, 1000);
    assert.ok(loaded.ok, loaded.message);
    assert.equal(other.transfersView(1000).length, 1);
    assert.equal(other.stationView(1000).built, true);
    assert.equal(other.upgrade('crystalMine', 1000).ok, false, 'po wczytaniu nadal rozkładany');
  });
});
