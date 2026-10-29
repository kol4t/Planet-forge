import assert from 'node:assert/strict';
import { test } from 'node:test';
import { GameController } from '../src/app/GameController.ts';
import { cancelOrder, completeOrders, orderShip, parseFleet, shipSeconds, shipyardLevel, starterFleet, upgradeShipyard } from '../src/core/economy/fleet.ts';
import { buildHomeStation } from '../src/core/economy/homeStation.ts';
import { deserializeEmpire, EMPIRE_KEY } from '../src/core/save/empire.ts';
import { BALANCE } from '../src/data/balance.ts';
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
const core = (now = 0) => (buildHomeStation(null, { unlocked: true, address: '1:1:1', stock: rich, now }, BALANCE) as { station: any }).station;

test('flota (v0.58): stocznia jako moduł stacji — budowa po rdzeniu, poziomy, szybsza budowa statków', () => {
  assert.deepEqual(starterFleet(BALANCE), { docked: { transport: 3, colonyShip: 1, tug: 1, escort: 0 }, queue: [] });
  assert.match((upgradeShipyard(null, { stock: rich, now: 0 }, BALANCE) as { message: string }).message, /stację/);
  const station = core();
  assert.match((upgradeShipyard(station, { stock: rich, now: 0 }, BALANCE) as { message: string }).message, /w budowie/);
  const ready = BALANCE.homeStation.coreSeconds * 1000;
  assert.equal(shipyardLevel(station, ready), 0);
  const built = upgradeShipyard(station, { stock: rich, now: ready }, BALANCE);
  assert.ok(built.ok);
  assert.equal(shipyardLevel(built.station, ready), 0, 'w budowie — jeszcze nie działa');
  assert.equal(shipyardLevel(built.station, ready + built.seconds * 1000), 1);
  assert.match((upgradeShipyard(built.station, { stock: { metal: 0, crystal: 0 }, now: ready + built.seconds * 1000 }, BALANCE) as { message: string }).message, /brakuje/);
  assert.ok(shipSeconds('escort', 5, BALANCE) < shipSeconds('escort', 1, BALANCE));
  assert.equal(shipSeconds('transport', 1, BALANCE), BALANCE.fleet.ships.transport.seconds);
});

test('flota: kolejka stoczni — po kolei, gotowe trafiają do floty, anulowanie przesuwa następne', () => {
  let fleet = starterFleet(BALANCE);
  assert.match((orderShip(fleet, 'transport', { shipyard: 0, stock: rich, now: 0 }, BALANCE) as { message: string }).message, /stocznię/);
  assert.match((orderShip(fleet, 'escort', { shipyard: 1, stock: { metal: 0, crystal: 0 }, now: 0 }, BALANCE) as { message: string }).message, /Brakuje/);
  const t = BALANCE.fleet.ships;
  for (const type of ['transport', 'escort', 'tug'] as const) {
    const r = orderShip(fleet, type, { shipyard: 1, stock: rich, now: 0 }, BALANCE);
    assert.ok(r.ok);
    fleet = r.fleet;
  }
  assert.equal(fleet.queue[1]!.startsAt, t.transport.seconds * 1000, 'drugi startuje po pierwszym');
  assert.equal(fleet.queue[2]!.readyAt, (t.transport.seconds + t.escort.seconds + t.tug.seconds) * 1000);
  // Anulowanie pierwszego (w budowie) — następne startują od razu.
  const cancelled = cancelOrder(fleet, 0, 1000)!;
  assert.deepEqual(cancelled.refund, t.transport.cost);
  assert.equal(cancelled.fleet.queue[0]!.type, 'escort');
  assert.equal(cancelled.fleet.queue[0]!.startsAt, 1000);
  assert.equal(cancelled.fleet.queue[1]!.readyAt, 1000 + (t.escort.seconds + t.tug.seconds) * 1000);
  const done = completeOrders(cancelled.fleet, 1000 + t.escort.seconds * 1000);
  assert.equal(done.done.length, 1);
  assert.equal(done.fleet.docked.escort, 1);
  assert.equal(done.fleet.queue.length, 1);
  // Kolejka ma limit.
  let full = starterFleet(BALANCE);
  for (let i = 0; i < BALANCE.fleet.queue; i++) full = (orderShip(full, 'tug', { shipyard: 1, stock: rich, now: 0 }, BALANCE) as { fleet: any }).fleet;
  assert.match((orderShip(full, 'tug', { shipyard: 1, stock: rich, now: 0 }, BALANCE) as { message: string }).message, /pełna/);
});

test('flota: odczyt z zapisu z walidacją', () => {
  assert.equal(parseFleet(null), null);
  assert.equal(parseFleet({}), null);
  const ok = { docked: { transport: 2, colonyShip: 0, tug: 1, escort: 4 }, queue: [{ type: 'escort', startsAt: 0, readyAt: 10, cost: { metal: 1, crystal: 2 } }] };
  assert.deepEqual(parseFleet(ok), ok);
  const bad = parseFleet({ docked: { transport: -1, escort: 2.5, colonyShip: 'x' }, queue: [{ type: 'zamek', startsAt: 0, readyAt: 1 }, { type: 'tug', startsAt: 5, readyAt: 1, cost: { metal: 0, crystal: 0 } }] })!;
  assert.deepEqual(bad.docked, { transport: 0, colonyShip: 0, tug: 0, escort: 0 });
  assert.deepEqual(bad.queue, []);
});

test('flota: kontroler — transportowce na stanie, lot zabiera i oddaje statek, eskorta, stocznia buduje, zapis', () => {
  withMemoryStorage(() => {
    const game = new GameController(0);
    const colony = game.system(game.homeSystem)!.planets.find((p) => p.body === 'rocky' && game.occupantAt(p) === 'free')!.address;
    assert.ok(colonizeNow(game, colony, 0).ok);
    assert.ok(game.switchPlanet(0, 0).ok);
    game.research = { done: ['fleet-1', 'station-orbit'], current: null };
    game.economy = { ...game.economy, levels: { ...game.economy.levels, storage: 14 }, stock: { metal: 200_000, crystal: 200_000 }, antimatter: 200 };
    const docked = (type: string) => game.fleetView(0).ships.find((s) => s.type === type)!.docked;
    assert.equal(docked('transport'), 3);
    const cargo = { metal: 10, crystal: 0 };
    for (let i = 0; i < 3; i++) assert.ok(game.sendResources(colony, cargo, 0).ok);
    assert.equal(docked('transport'), 0);
    assert.equal(game.transportView().maxActive, 3);
    assert.match(game.sendResources(colony, cargo, 0).message, /Wszystkie transportowce są w drodze/);
    assert.match(game.sendResources(colony, cargo, 0, 1).message, /transportowce/);
    // Stocznia: stacja → moduł → statki.
    assert.match(game.orderShip('transport', 0).message, /stocznię/);
    assert.ok(game.buildStation(0).ok);
    let now = BALANCE.homeStation.coreSeconds * 1000;
    assert.ok(game.upgradeShipyard(now).ok, 'stocznia poz. 1');
    now += BALANCE.fleet.shipyardSecondsPerLevel * 1000;
    game.tick(now);
    assert.equal(game.fleetView(now).shipyard.level, 1);
    assert.equal(docked('transport'), 3, 'transportowce wróciły z lotu');
    const before = game.economy.stock.metal;
    assert.ok(game.orderShip('escort', now).ok);
    assert.equal(game.economy.stock.metal, before - BALANCE.fleet.ships.escort.cost.metal);
    assert.ok(game.orderShip('escort', now).ok);
    assert.equal(game.fleetView(now).queue.length, 2);
    now += 2 * BALANCE.fleet.ships.escort.seconds * 1000;
    game.tick(now);
    assert.equal(docked('escort'), 2);
    // Transport z eskortą — oba wracają po przylocie.
    assert.ok(game.sendResources(colony, cargo, now, 2).ok);
    assert.equal(docked('escort'), 0);
    assert.equal(game.fleetView(now).ships.find((s) => s.type === 'escort')!.flying, 2);
    assert.equal(game.shipmentsView(now)[0]!.escort, 2);
    const saved = deserializeEmpire(localStorage.getItem(EMPIRE_KEY))!;
    assert.equal(saved.fleet?.docked.escort, 0);
    assert.equal(saved.shipments?.[0]?.escort, 2);
    const fresh = new GameController(now + 3600_000);
    assert.equal(fresh.fleetView().ships.find((s) => s.type === 'escort')!.docked, 2, 'po wczytaniu i przylocie eskorta na stanie');
    assert.equal(fresh.fleetView().ships.find((s) => s.type === 'transport')!.docked, 3);
  });
});

test('flota: holownik i statek kolonizacyjny z floty; stary zapis bez floty dostaje flotę startową', () => {
  withMemoryStorage(() => {
    const game = new GameController(0);
    game.research = { done: ['station-comet'], current: null };
    game.economy = { ...game.economy, stock: { metal: 5000, crystal: 5000 }, antimatter: 50 };
    assert.ok(game.launchComet(0).ok);
    assert.equal(game.fleetView(0).ships.find((s) => s.type === 'tug')!.docked, 0);
    game.tick(BALANCE.comet.seconds * 1000 + 1);
    assert.equal(game.fleetView().ships.find((s) => s.type === 'tug')!.docked, 1, 'holownik wrócił');
    // Zapis sprzed v0.58 (bez pola fleet).
    const raw = JSON.parse(localStorage.getItem(EMPIRE_KEY)!);
    delete raw.fleet;
    localStorage.setItem(EMPIRE_KEY, JSON.stringify(raw));
    const old = new GameController(BALANCE.comet.seconds * 1000 + 2);
    assert.deepEqual(
      old.fleetView().ships.map((s) => s.docked),
      ['transport', 'colonyShip', 'tug', 'escort'].map((t) => BALANCE.fleet.starter[t as 'tug']),
    );
  });
});
