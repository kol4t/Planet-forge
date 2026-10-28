import assert from 'node:assert/strict';
import { test } from 'node:test';
import { GameController } from '../src/app/GameController.ts';
import { fuelCost, fuelLabel, fuelShortage } from '../src/core/economy/fuel.ts';
import { parseMissions } from '../src/core/save/empire.ts';
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

test('paliwo (v0.53): w układzie stała kwota, między układami rośnie z odległością (wariant umiarkowany)', () => {
  assert.equal(fuelCost('transport', 0, BALANCE), 1);
  assert.equal(fuelCost('colonyShip', 0, BALANCE), 3);
  assert.equal(fuelCost('expedition', 0, BALANCE), 1);
  assert.equal(fuelCost('comet', 0, BALANCE), 1);
  // Najbliższy układ ~10 jedn., typowy ~77.
  assert.equal(fuelCost('transport', 10, BALANCE), 3);
  assert.equal(fuelCost('transport', 77, BALANCE), 6);
  assert.equal(fuelCost('colonyShip', 10, BALANCE), 4);
  assert.equal(fuelCost('colonyShip', 77, BALANCE), 9);
  let last = 0;
  for (let d = 1; d <= 150; d += 7) {
    const f = fuelCost('colonyShip', d, BALANCE);
    assert.ok(Number.isInteger(f) && f >= last, 'całkowite i niemalejące');
    last = f;
  }
  assert.equal(fuelShortage(3, 3), null);
  assert.match(fuelShortage(5, 2)!, /brakuje 3/);
  assert.equal(fuelLabel(1), 'paliwo: 1 antymateria');
  assert.equal(fuelLabel(3), 'paliwo: 3 antymaterie');
});

test('paliwo: kolonizacja we własnym układzie — statek za surowce i paliwo, krótki lot, zawrócenie zwraca wszystko', () => {
  withMemoryStorage(() => {
    const game = new GameController(0);
    const free = game.system(game.homeSystem)!.planets.find((p) => p.body === 'rocky' && game.occupantAt(p) === 'free')!.address;
    // Start gry: za mały magazyn na statek.
    assert.match(game.colonize(free, 0).message, /magazyn/i);
    game.economy = { ...game.economy, levels: { ...game.economy.levels, storage: 6 }, stock: { metal: 5000, crystal: 5000 }, antimatter: 2 };
    assert.match(game.colonize(free, 0).message, /paliwa/);
    game.economy = { ...game.economy, antimatter: 10 };
    const sent = game.colonize(free, 0);
    assert.ok(sent.ok, sent.message);
    assert.equal(game.slotInfo.used, 1, 'kolonia dopiero po przylocie');
    assert.equal(game.economy.antimatter, 10 - BALANCE.fuel.colonyShip.inSystem);
    assert.equal(game.economy.stock.metal, 5000 - BALANCE.colonyShip.cost.metal);
    const mission = game.missionsView(0)[0]!;
    assert.equal(mission.arrivesAt, BALANCE.colonyShip.baseSeconds * 1000, 'lot ok. 2 min');
    assert.match(game.colonize(free, 0).message, /już leci/);
    assert.ok(game.cancelMission(free, 1000).ok);
    assert.ok(Math.abs(game.economy.antimatter - 10) < 0.01);
    assert.ok(game.colonize(free, 1000).ok);
    game.tick(1000 + BALANCE.colonyShip.baseSeconds * 1000);
    assert.equal(game.slotInfo.used, 2, 'przylot zakłada kolonię');
    assert.equal(game.slotAt(free), 1);
  });
});

test('paliwo: transportowiec, ekspedycja i holownik płacą antymaterią; brak paliwa = czytelny błąd, nic nie znika', () => {
  withMemoryStorage(() => {
    const game = new GameController(0);
    const home = game.address;
    const colony = game.system(game.homeSystem)!.planets.find((p) => p.body === 'rocky' && game.occupantAt(p) === 'free')!.address;
    assert.ok(colonizeNow(game, colony, 0).ok);
    game.switchPlanet(0, 0);
    assert.equal(game.address, home);
    game.research = { done: ['fleet-1', 'station-1', 'explore-1', 'station-comet', 'probe-1'], current: null };
    game.economy = { ...game.economy, levels: { ...game.economy.levels, storage: 6 }, stock: { metal: 5000, crystal: 5000 }, antimatter: 0 };
    const cargo = { metal: 100, crystal: 100 };
    assert.equal(game.transportFuelTo(colony), BALANCE.fuel.transport.inSystem);
    const refused = game.sendResources(colony, cargo, 0);
    assert.match(refused.message, /paliwa/);
    assert.equal(game.economy.stock.metal, 5000, 'nic nie zabrane');
    game.economy = { ...game.economy, antimatter: 5 };
    assert.ok(game.sendResources(colony, cargo, 0).ok);
    assert.equal(game.economy.antimatter, 4);
    // Holownik po kometę: lot w układzie.
    assert.equal(game.cometView(0).fuel, BALANCE.fuel.comet.inSystem);
    const comet = game.launchComet(0);
    assert.ok(comet.ok, comet.message);
    assert.equal(game.economy.antimatter, 3);
    // Ekspedycja: paliwo z odległości planu.
    const target = game.galaxy.systems.map((s) => s.index).find((i) => i !== game.homeSystem && game.expeditionPlan(i).ok);
    assert.ok(target !== undefined, 'jest układ w zasięgu wyprawy');
    {
      const plan = game.expeditionPlan(target!);
      assert.equal(game.expeditionFuel(target!), fuelCost('expedition', plan.distance, BALANCE));
      const wallet = game.economy.antimatter;
      const sent = game.sendExpedition(target!, 0);
      assert.ok(sent.ok, sent.message);
      assert.equal(game.economy.antimatter, wallet - game.expeditionFuel(target!));
    }
  });
});

test('paliwo: zapis lotu kolonizacyjnego — paliwo opcjonalne, błędne pomijane', () => {
  const m = { target: '1:16:2', from: '1:16:1', departedAt: 0, arrivesAt: 120_000, cost: { metal: 2500, crystal: 1800 } };
  assert.deepEqual(parseMissions([{ ...m, fuel: 3 }]), [{ ...m, fuel: 3 }]);
  assert.deepEqual(parseMissions([m]), [m], 'stary zapis bez paliwa');
  assert.deepEqual(parseMissions([{ ...m, fuel: 'dużo' }]), [m]);
  assert.deepEqual(parseMissions([{ ...m, fuel: -1 }]), [m]);
});
