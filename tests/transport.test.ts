import assert from 'node:assert/strict';
import { test } from 'node:test';
import { GameController } from '../src/app/GameController.ts';
import { checkShipment, parseShipments, transportSeconds } from '../src/core/economy/transport.ts';
import { applyResearch } from '../src/core/research/research.ts';
import { deserializeEmpire, EMPIRE_KEY } from '../src/core/save/empire.ts';
import { BALANCE } from '../src/data/balance.ts';
import { findResearch } from '../src/data/research.ts';
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

const stock = { metal: 3000, crystal: 3000 };

test('transport: sprawdzenie ładunku — pusty, ładowność, zapas, limit naraz, ta sama planeta', () => {
  assert.match((checkShipment({ metal: 0, crystal: 0 }, stock, 0, BALANCE) as { message: string }).message, /Ustaw/);
  assert.match((checkShipment({ metal: 100, crystal: 0 }, stock, 0, BALANCE, true) as { message: string }).message, /inną planetę/);
  const over = BALANCE.transport.capacity;
  assert.match((checkShipment({ metal: over, crystal: 1 }, { metal: 9e9, crystal: 9e9 }, 0, BALANCE) as { message: string }).message, /najwyżej/);
  assert.match((checkShipment({ metal: 3500, crystal: 0 }, stock, 0, BALANCE) as { message: string }).message, /brakuje: 500 metalu/);
  assert.match((checkShipment({ metal: 1, crystal: 0 }, stock, BALANCE.transport.maxActive, BALANCE) as { message: string }).message, /limit/);
  const ok = checkShipment({ metal: 100.7, crystal: 20 }, stock, 0, BALANCE);
  assert.deepEqual(ok, { ok: true, cargo: { metal: 100, crystal: 20 } });
});

test('transport: czas lotu rośnie z odległością; badania Floty — ładowność i krótszy lot', () => {
  assert.equal(transportSeconds(0, BALANCE), BALANCE.transport.baseSeconds);
  assert.ok(transportSeconds(20, BALANCE) > transportSeconds(5, BALANCE));
  assert.deepEqual(findResearch('fleet-1')!.effects, [{ kind: 'unlock', feature: 'transport' }]);
  const big = applyResearch(BALANCE, ['fleet-1', 'fleet-2']);
  assert.equal(big.transport.capacity, BALANCE.transport.capacity * 2);
  const fast = applyResearch(BALANCE, ['fleet-1', 'explore-1', 'fleet-light']);
  assert.ok(transportSeconds(10, fast) < transportSeconds(10, BALANCE));
  assert.ok(fast.colonyShip.secondsPerUnit < BALANCE.colonyShip.secondsPerUnit, 'statek kolonizacyjny też szybszy');
  // Lżejsze kadłuby — most do Eksploracji.
  assert.ok(findResearch('fleet-light')!.requires.includes('explore-1'));
});

test('transport: zapis — błędne przesyłki odrzucane', () => {
  const good = { from: '1:16:1', to: '1:16:3', departedAt: 0, arrivesAt: 60_000, cargo: { metal: 10, crystal: 5 } };
  assert.deepEqual(parseShipments([good]), [good]);
  assert.deepEqual(parseShipments([{ ...good, to: 'x' }, { ...good, arrivesAt: -1 }, { ...good, cargo: { metal: -5, crystal: 0 } }, null]), []);
  assert.deepEqual(parseShipments('zły'), []);
});

test('transport: kontroler — badanie, wysyłka z aktywnej, przylot na nieaktywną raz, zapis', () => {
  withMemoryStorage(() => {
    const game = new GameController(0);
    const home = game.address;
    const colony = game.system(game.homeSystem)!.planets.find((p) => p.body === 'rocky' && game.occupantAt(p) === 'free')!.address;
    assert.ok(colonizeNow(game, colony, 0).ok);
    assert.ok(game.switchPlanet(0, 0).ok);
    assert.equal(game.address, home);
    const cargo = { metal: 100, crystal: 50 };
    assert.match(game.sendResources(colony, cargo, 0).message, /Transportowce/);
    game.research = { done: ['fleet-1'], current: null };
    assert.equal(game.transportView().unlocked, true);
    assert.equal(game.sendResources(home, cargo, 0).ok, false, 'nie do siebie');
    const before = game.economy.stock;
    const sent = game.sendResources(colony, cargo, 0);
    assert.ok(sent.ok, sent.message);
    assert.ok(Math.abs(game.economy.stock.metal - (before.metal - 100)) < 1e-6);
    const seconds = game.transportSecondsTo(colony);
    assert.equal(game.shipmentsView(0).length, 1);
    assert.equal(game.shipmentsView(0)[0]!.toName.length > 0, true);
    // Zapis z przesyłką w drodze.
    assert.equal(deserializeEmpire(localStorage.getItem(EMPIRE_KEY))?.shipments?.length, 1);
    const arrived: string[] = [];
    game.onShipmentArrived((t) => arrived.push(t));
    game.tick(seconds * 1000 + 1);
    game.tick(seconds * 1000 + 2);
    assert.equal(arrived.length, 1, 'przylot zgłoszony raz');
    assert.match(arrived[0]!, /\+100 metalu, \+50 kryształów/);
    assert.equal(game.shipmentsView().length, 0);
    const target = game.overview(seconds * 1000 + 2).find((p) => p.address === colony)!;
    // Ładunek doszedł do zapasu kolonii (plus jej własna produkcja w tym czasie).
    const fresh = new GameController(seconds * 1000 + 2);
    const again = fresh.overview(seconds * 1000 + 2).find((p) => p.address === colony)!;
    assert.ok(target.stock.metal >= 100 && Math.abs(again.stock.metal - target.stock.metal) < 1);
    assert.equal(fresh.shipmentsView().length, 0, 'po wczytaniu nie dociera drugi raz');
  });
});

test('transport: przylot podczas nieobecności — komunikat po starcie', () => {
  withMemoryStorage(() => {
    const game = new GameController(0);
    const colony = game.system(game.homeSystem)!.planets.find((p) => p.body === 'rocky' && game.occupantAt(p) === 'free')!.address;
    colonizeNow(game, colony, 0);
    game.switchPlanet(0, 0);
    game.research = { done: ['fleet-1'], current: null };
    assert.ok(game.sendResources(colony, { metal: 10, crystal: 0 }, 0).ok);
    const later = new GameController(3600_000);
    assert.equal(later.shipmentsWhileAway.length, 1);
    assert.equal(later.shipmentsView().length, 0);
  });
});
