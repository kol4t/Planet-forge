import assert from 'node:assert/strict';
import { test } from 'node:test';
import { GameController } from '../src/app/GameController.ts';
import { buildColonyStation, colonyStationReady, parseColonyStations, relayFuel, relaySeconds } from '../src/core/economy/colonyStation.ts';
import { buildHomeStation } from '../src/core/economy/homeStation.ts';
import { deserializeEmpire, EMPIRE_KEY } from '../src/core/save/empire.ts';
import { BALANCE } from '../src/data/balance.ts';
import { colonizeNow } from './helpers.ts';

function withMemoryStorage(run: () => void): void {
  const store = new Map<string, string>();
  const original = Object.getOwnPropertyDescriptor(globalThis, 'localStorage');
  Object.defineProperty(globalThis, 'localStorage', {
    configurable: true,
    value: { getItem: (k: string) => store.get(k) ?? null, setItem: (k: string, v: string) => void store.set(k, v), removeItem: (k: string) => void store.delete(k) },
  });
  try {
    run();
  } finally {
    if (original) Object.defineProperty(globalThis, 'localStorage', original);
    else delete (globalThis as { localStorage?: unknown }).localStorage;
  }
}

const rich = { metal: 1e6, crystal: 1e6 };

test('stacje kolonii (etap 9): warunki budowy — gotowa stacja macierzysta, nie jej planeta, jedna na kolonię, koszt', () => {
  const ctx = (home: any, now = 0, address = '1:1:2', stock = rich) => ({ address, home, stock, now });
  assert.match((buildColonyStation([], ctx(null), BALANCE) as { message: string }).message, /stację macierzystą/);
  const home = (buildHomeStation(null, { unlocked: true, address: '1:1:1', stock: rich, now: 0 }, BALANCE) as { station: any }).station;
  assert.match((buildColonyStation([], ctx(home, 0), BALANCE) as { message: string }).message, /w budowie/);
  const ready = BALANCE.homeStation.coreSeconds * 1000;
  assert.match((buildColonyStation([], ctx(home, ready, '1:1:1'), BALANCE) as { message: string }).message, /stacja macierzysta/);
  assert.match((buildColonyStation([], ctx(home, ready, '1:1:2', { metal: 0, crystal: 0 }), BALANCE) as { message: string }).message, /Brakuje/);
  const ok = buildColonyStation([], ctx(home, ready), BALANCE);
  assert.ok(ok.ok);
  assert.equal(ok.station.readyAt, ready + BALANCE.colonyStation.seconds * 1000);
  assert.match((buildColonyStation([ok.station], ctx(home, ready), BALANCE) as { message: string }).message, /w budowie/);
  assert.match((buildColonyStation([ok.station], ctx(home, ok.station.readyAt), BALANCE) as { message: string }).message, /ma już/);
  assert.equal(colonyStationReady([ok.station], '1:1:2', ok.station.readyAt - 1), false);
  assert.equal(colonyStationReady([ok.station], '1:1:2', ok.station.readyAt), true);
  // Przekaźnik: połowa paliwa (w górę, min. 1) i połowa czasu.
  assert.equal(relayFuel(7, BALANCE), 4);
  assert.equal(relayFuel(1, BALANCE), 1);
  assert.equal(relaySeconds(600, BALANCE), 300);
  assert.deepEqual(parseColonyStations([{ address: '1:1:2', readyAt: 5 }, { address: '1:1:2', readyAt: 9 }, { address: 'x', readyAt: 1 }, null]), [{ address: '1:1:2', readyAt: 5 }]);
});

test('stacje kolonii: kontroler — budowa nad kolonią, loty na stację i ze stacji szybsze, zapis, usunięcie planety', () => {
  withMemoryStorage(() => {
    const game = new GameController(0);
    const colony = game.system(game.homeSystem)!.planets.find((p) => p.body === 'rocky' && game.occupantAt(p) === 'free')!.address;
    assert.ok(colonizeNow(game, colony, 0).ok);
    assert.ok(game.switchPlanet(0, 0).ok);
    game.research = { done: ['station-orbit', 'fleet-1'], current: null };
    const fill = () => {
      game.economy = { ...game.economy, levels: { ...game.economy.levels, storage: 12 }, stock: { metal: 50_000, crystal: 50_000 }, antimatter: 100 };
    };
    fill();
    assert.ok(game.buildStation(0).ok);
    let now = BALANCE.homeStation.coreSeconds * 1000;
    assert.ok(game.upgradeStationStorage(now).ok);
    now += BALANCE.homeStation.storageSecondsPerLevel * 1000;
    game.tick(now);
    assert.equal(game.colonyStationView(now).isHome, true);
    assert.match(game.buildColonyStation(now).message, /stacja macierzysta/);
    // Kolonia: budowa stacji kolonii.
    assert.ok(game.switchPlanet(1, now).ok);
    fill();
    const plain = game.stationView(now).seconds;
    let v = game.colonyStationView(now);
    assert.equal(v.reason, null);
    assert.equal(v.flight.relay, Math.round(plain * BALANCE.colonyStation.timeFactor));
    const built = game.buildColonyStation(now);
    assert.ok(built.ok, built.message);
    assert.equal(game.economy.stock.metal, 50_000 - BALANCE.colonyStation.cost.metal);
    v = game.colonyStationView(now);
    assert.ok(v.built && !v.ready && v.secondsLeft === BALANCE.colonyStation.seconds);
    assert.equal(game.stationView(now).seconds, plain, 'w budowie — jeszcze bez przekaźnika');
    now += BALANCE.colonyStation.seconds * 1000;
    game.tick(now);
    v = game.colonyStationView(now);
    assert.ok(v.ready);
    assert.equal(v.count, 1);
    assert.equal(game.colonyStationHere(now)!.ready, true);
    const fast = game.stationView(now);
    assert.equal(fast.relay, true);
    assert.equal(fast.seconds, Math.round(plain * BALANCE.colonyStation.timeFactor));
    // Lot na stację trwa krócej; ze stacji do kolonii też.
    const sent = game.sendToStation({ metal: 100, crystal: 0 }, now);
    assert.ok(sent.ok, sent.message);
    const ship = game.shipmentsView(now).find((s) => s.station === 'to')!;
    assert.equal(ship.arrivesAt - ship.departedAt, fast.seconds * 1000);
    assert.equal(game.stationRoutes().find((r) => r.address === colony)!.relay, true);
    // Zapis i usunięcie planety.
    assert.deepEqual(deserializeEmpire(localStorage.getItem(EMPIRE_KEY))!.colonyStations, [{ address: colony, readyAt: now }]);
    assert.ok(game.switchPlanet(0, now).ok);
    assert.ok(game.removePlanet(1).ok);
    assert.equal(game.colonyStationView(now).count, 0);
    assert.equal(deserializeEmpire(localStorage.getItem(EMPIRE_KEY))!.colonyStations, undefined);
  });
});
