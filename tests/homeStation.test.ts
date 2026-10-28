import assert from 'node:assert/strict';
import { test } from 'node:test';
import { GameController } from '../src/app/GameController.ts';
import { buildHomeStation, parseHomeStation, stationCapacity, storageModuleCost, upgradeStationStorage } from '../src/core/economy/homeStation.ts';
import { parseShipments } from '../src/core/economy/transport.ts';
import { deserializeEmpire, EMPIRE_KEY } from '../src/core/save/empire.ts';
import { BALANCE } from '../src/data/balance.ts';
import { findResearch } from '../src/data/research.ts';
import { collectorOrbit, HOME_STATION_ORBIT, stationOrbit } from '../src/planet-renderer/colony.ts';
import { stationModules } from '../src/planet-renderer/PlanetDisplay.ts';
import { createStationMesh } from '../src/planet-renderer/stationMesh.ts';
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

const rich = { metal: 1e6, crystal: 1e6 };

test('stacja macierzysta (v0.55): odblokowanie „Moduł orbitalny”, budowa jednej stacji, rdzeń w czasie', () => {
  assert.deepEqual(findResearch('station-orbit')!.effects, [{ kind: 'unlock', feature: 'home-station' }]);
  assert.match((buildHomeStation(null, { unlocked: false, address: '1:1:1', stock: rich, now: 0 }, BALANCE) as { message: string }).message, /Moduł orbitalny/);
  assert.match((buildHomeStation(null, { unlocked: true, address: '1:1:1', stock: { metal: 0, crystal: 0 }, now: 0 }, BALANCE) as { message: string }).message, /brakuje: 8000 metalu, 5000 kryształów/);
  const built = buildHomeStation(null, { unlocked: true, address: '1:1:1', stock: rich, now: 0 }, BALANCE);
  assert.ok(built.ok);
  assert.deepEqual(built.cost, BALANCE.homeStation.coreCost);
  assert.equal(built.station.core.readyAt, BALANCE.homeStation.coreSeconds * 1000);
  assert.match((buildHomeStation(built.station, { unlocked: true, address: '1:1:1', stock: rich, now: 0 }, BALANCE) as { message: string }).message, /jedna na imperium/);
  // Bez magazynu — pojemność 0; magazyn tylko po zbudowaniu rdzenia.
  assert.equal(stationCapacity(built.station, 1e9, BALANCE), 0);
  assert.match((upgradeStationStorage(built.station, { stock: rich, now: 0 }, BALANCE) as { message: string }).message, /w budowie/);
});

test('stacja macierzysta: magazyn orbitalny — poziomy, koszt i pojemność rosną, maks. poziom', () => {
  let station = (buildHomeStation(null, { unlocked: true, address: '1:1:1', stock: rich, now: 0 }, BALANCE) as { station: any }).station;
  let now = BALANCE.homeStation.coreSeconds * 1000;
  let lastCapacity = 0;
  for (let level = 1; level <= BALANCE.homeStation.storageMaxLevel; level++) {
    const r = upgradeStationStorage(station, { stock: rich, now }, BALANCE);
    assert.ok(r.ok, `poz. ${level}`);
    assert.deepEqual(r.cost, storageModuleCost(level, BALANCE));
    assert.match((upgradeStationStorage(r.station, { stock: rich, now }, BALANCE) as { message: string }).message, /rozbudowywany/);
    assert.equal(stationCapacity(r.station, now, BALANCE), lastCapacity, 'w trakcie rozbudowy stara pojemność');
    now += r.seconds * 1000;
    const capacity = stationCapacity(r.station, now, BALANCE);
    assert.ok(capacity > lastCapacity);
    lastCapacity = capacity;
    station = r.station;
  }
  assert.equal(stationCapacity(station, now, BALANCE), Math.floor(BALANCE.homeStation.storageBase * BALANCE.homeStation.storageGrowth ** (BALANCE.homeStation.storageMaxLevel - 1)));
  assert.match((upgradeStationStorage(station, { stock: rich, now }, BALANCE) as { message: string }).message, /najwyższy poziom/);
});

test('stacja macierzysta: odczyt z zapisu z walidacją, przesyłki z polem „station”', () => {
  const ok = { address: '1:5:3', core: { level: 1, readyAt: 10 }, storage: { level: 2, readyAt: 20 }, stock: { metal: 5, crystal: -3 } };
  assert.deepEqual(parseHomeStation(ok), { ...ok, stock: { metal: 5, crystal: 0 } });
  assert.equal(parseHomeStation({ ...ok, address: 'zły' }), null);
  assert.equal(parseHomeStation({ ...ok, core: { level: 0, readyAt: 1 } }), null);
  assert.equal(parseHomeStation(null), null);
  assert.equal(parseHomeStation({ ...ok, storage: { level: 'x' } })?.storage, undefined, 'błędny moduł pomijany');
  const ship = { from: '1:1:1', to: '1:1:2', departedAt: 0, arrivesAt: 5, cargo: { metal: 1, crystal: 2 } };
  const parsed = parseShipments([{ ...ship, station: 'to' }, { ...ship, station: 'from' }, { ...ship, station: 'gdzieś' }]);
  assert.deepEqual(parsed.map((s) => s.station), ['to', 'from', undefined]);
});

test('stacja macierzysta: kontroler — budowa, magazyn, lot na stację i ze stacji za paliwo, zapis', () => {
  withMemoryStorage(() => {
    const game = new GameController(0);
    const home = game.address;
    const colony = game.system(game.homeSystem)!.planets.find((p) => p.body === 'rocky' && game.occupantAt(p) === 'free')!.address;
    assert.ok(colonizeNow(game, colony, 0).ok);
    assert.ok(game.switchPlanet(0, 0).ok);
    assert.equal(game.stationView(0).unlocked, false);
    assert.match(game.buildStation(0).message, /Moduł orbitalny/);
    game.research = { done: ['station-orbit', 'fleet-1'], current: null };
    const fill = () => {
      game.economy = { ...game.economy, levels: { ...game.economy.levels, storage: 12 }, stock: { metal: 50_000, crystal: 50_000 }, antimatter: 100 };
    };
    fill();
    const built = game.buildStation(0);
    assert.ok(built.ok, built.message);
    assert.equal(game.economy.stock.metal, 50_000 - BALANCE.homeStation.coreCost.metal);
    let view = game.stationView(0);
    assert.equal(view.built && !view.ready, true);
    assert.equal(view.planetName.length > 0, true);
    assert.match(game.sendToStation({ metal: 10, crystal: 0 }, 0).message, /nie jest jeszcze gotowa/);
    let now = BALANCE.homeStation.coreSeconds * 1000;
    fill();
    assert.match(game.sendToStation({ metal: 10, crystal: 0 }, now).message, /magazynu/);
    assert.ok(game.upgradeStationStorage(now).ok);
    now += BALANCE.homeStation.storageSecondsPerLevel * 1000;
    game.tick(now);
    fill();
    view = game.stationView(now);
    assert.equal(view.storageLevel, 1);
    assert.equal(view.capacity, BALANCE.homeStation.storageBase);
    assert.equal(view.fuel, BALANCE.fuel.transport.inSystem, 'stacja nad aktywną — lot w układzie');
    // Na stację: zabiera surowce i paliwo; miejsce liczy ładunki w drodze.
    const before = game.economy;
    const sent = game.sendToStation({ metal: 1000, crystal: 500 }, now);
    assert.ok(sent.ok, sent.message);
    assert.equal(game.economy.antimatter, before.antimatter - view.fuel);
    assert.ok(Math.abs(game.economy.stock.metal - (before.stock.metal - 1000)) < 1e-6);
    assert.deepEqual(game.stationView(now).incoming, { metal: 1000, crystal: 500 });
    const inner = game as unknown as { station: { stock: { metal: number; crystal: number } } };
    inner.station.stock = { metal: 48_000, crystal: 0 };
    assert.match(game.sendToStation({ metal: 2000, crystal: 0 }, now).message, /zmieści się jeszcze 1000 metalu/);
    inner.station.stock = { metal: 0, crystal: 0 };
    game.economy = { ...game.economy, antimatter: 0 };
    assert.match(game.sendToStation({ metal: 10, crystal: 0 }, now).message, /paliwa/);
    game.economy = { ...game.economy, antimatter: 100 };
    const arrive = now + game.transportSecondsTo(home) * 1000 + 1;
    game.tick(arrive);
    assert.deepEqual(game.stationView(arrive).stock, { metal: 1000, crystal: 500 });
    assert.deepEqual(game.stationView(arrive).incoming, { metal: 0, crystal: 0 });
    // Ze stacji na kolonię: zapas stacji maleje, ładunek trafia do kolonii.
    assert.match(game.sendFromStation(colony, { metal: 5000, crystal: 0 }, arrive).message, /Na stacji/);
    assert.match(game.sendFromStation('9:9:9', { metal: 10, crystal: 0 }, arrive).message, /Twoich planet/);
    const out = game.sendFromStation(colony, { metal: 600, crystal: 100 }, arrive);
    assert.ok(out.ok, out.message);
    assert.deepEqual(game.stationView(arrive).stock, { metal: 400, crystal: 400 });
    const saved = deserializeEmpire(localStorage.getItem(EMPIRE_KEY))!;
    assert.deepEqual(saved.station?.stock, { metal: 400, crystal: 400 });
    assert.equal(saved.shipments?.[0]?.station, 'from');
    const colonyBefore = game.overview(arrive).find((p) => p.address === colony)!.stock.metal;
    const later = arrive + 600_000;
    game.tick(later);
    const colonyAfter = game.overview(later).find((p) => p.address === colony)!.stock.metal;
    assert.ok(colonyAfter >= colonyBefore + 600 - 1, 'ładunek dotarł do kolonii');
    // Po wczytaniu: ta sama stacja.
    const fresh = new GameController(later);
    assert.deepEqual(fresh.stationView(later).stock, { metal: 400, crystal: 400 });
    assert.equal(fresh.stationView(later).storageLevel, 1);
    assert.match(fresh.buildStation(later).message, /jedna na imperium/);
  });
});

test('stacja macierzysta: wygląd — orbita poza planetą i inna niż kolektora, moduły z poziomem, model 3D bez NaN', () => {
  for (let t = 0; t < 80; t += 3.7) {
    const p = stationOrbit(t);
    assert.ok(Math.hypot(...p) >= HOME_STATION_ORBIT.radius - 1e-9 && Math.hypot(...p) > 1.2, 'nad planetą');
    const c = collectorOrbit(t);
    assert.ok(Math.hypot(p[0] - c[0], p[1] - c[1], p[2] - c[2]) > 0.05 || t === 0, 'nie w tym samym miejscu co kolektor');
  }
  assert.ok(stationOrbit(0, true)[2] > 0, '„Ogranicz ruch” — stacja z przodu');
  assert.equal(stationModules(0), 0);
  let last = 0;
  for (let level = 1; level <= BALANCE.homeStation.storageMaxLevel; level++) {
    const n = stationModules(level);
    assert.ok(n >= last && n >= 2 && n <= 8);
    last = n;
  }
  for (const look of [{ modules: 0, building: true }, { modules: 8, building: false }]) {
    const mesh = createStationMesh(look);
    let meshes = 0;
    mesh.group.traverse((node) => {
      const geometry = (node as { geometry?: { getAttribute(n: string): { count: number; getX(i: number): number } } }).geometry;
      if (!geometry) return;
      meshes++;
      const position = geometry.getAttribute('position');
      for (let i = 0; i < position.count; i++) assert.ok(Number.isFinite(position.getX(i)));
    });
    assert.ok(meshes <= 8, `najwyżej 8 rysowań (${meshes})`);
    mesh.update(0.5, false);
  }
});
