import assert from 'node:assert/strict';
import { test } from 'node:test';
import { GameController } from '../src/app/GameController.ts';
import {
  DISCOVERY,
  discoveryOf,
  ensureKnown,
  initialDiscoveries,
  knownCount,
  parseDiscoveries,
  raiseDiscovery,
} from '../src/core/galaxy/discovery.ts';
import { generateGalaxy } from '../src/core/galaxy/galaxy.ts';
import { deserializeEmpire, EMPIRE_KEY } from '../src/core/save/empire.ts';
import { DISCOVERY_RULES } from '../src/data/galaxy.ts';

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

test('odkrycia: wiedza tylko rośnie, nieznane = 0, zapis odrzuca błędne wpisy', () => {
  let k = raiseDiscovery({}, 7, DISCOVERY.recognized);
  assert.equal(discoveryOf(k, 7), 3);
  assert.equal(discoveryOf(k, 8), 0);
  assert.equal(raiseDiscovery(k, 7, DISCOVERY.signal), k, 'niższy poziom nic nie zmienia');
  k = raiseDiscovery(k, 7, DISCOVERY.explored);
  assert.equal(discoveryOf(k, 7), 4);
  assert.deepEqual(parseDiscoveries({ '3': 4, '5': 1, '0': 4, x: 2, '9': 7, '11': 'tak' }), { 3: 4, 5: 1 });
  assert.equal(parseDiscoveries(null), null);
  assert.equal(parseDiscoveries([1, 2]), null);
  assert.equal(knownCount({ 1: 4, 2: 3, 3: 2, 4: 1 }), 3);
});

test('odkrycia: na start — własne układy zbadane, najbliżsi sąsiedzi rozpoznani, dalej sygnały, reszta nieznana', () => {
  const galaxy = generateGalaxy(1);
  const home = 16;
  const known = initialDiscoveries(galaxy, [home]);
  assert.equal(discoveryOf(known, home), DISCOVERY.explored);
  const levels = galaxy.systems.map((s) => discoveryOf(known, s.index));
  assert.equal(levels.filter((l) => l === DISCOVERY.recognized).length, DISCOVERY_RULES.telescopeNeighbors);
  assert.ok(levels.filter((l) => l === DISCOVERY.unknown).length > 50, 'większość galaktyki nieznana');
  // Rozpoznani to najbliżsi.
  const h = galaxy.systems[home - 1]!;
  const dist = (i: number) => Math.hypot(galaxy.systems[i - 1]!.x - h.x, galaxy.systems[i - 1]!.y - h.y);
  const recognized = galaxy.systems.filter((s) => discoveryOf(known, s.index) === DISCOVERY.recognized).map((s) => dist(s.index));
  const others = galaxy.systems.filter((s) => s.index !== home && discoveryOf(known, s.index) < DISCOVERY.recognized).map((s) => dist(s.index));
  assert.ok(Math.max(...recognized) <= Math.min(...others));
  // Sygnały tylko w zasięgu.
  for (const s of galaxy.systems) if (discoveryOf(known, s.index) === DISCOVERY.signal) assert.ok(dist(s.index) <= DISCOVERY_RULES.signalRange);
  // Deterministycznie.
  assert.deepEqual(initialDiscoveries(galaxy, [home]), known);
  // Układy z planetami/statkami gracza zawsze zbadane, także z zapisanej wiedzy.
  assert.equal(discoveryOf(ensureKnown({ 5: 1 }, [5, 9]), 5), 4);
  assert.equal(discoveryOf(ensureKnown({}, [9]), 9), 4);
});

test('odkrycia: kontroler — stary zapis dostaje wiedzę na start, zapis i odczyt, statek tylko do zbadanych', () => {
  withMemoryStorage(() => {
    const game = new GameController(0);
    assert.equal(game.discoveryLevel(game.homeSystem), 4);
    assert.ok(game.knownSystems >= 1 + DISCOVERY_RULES.telescopeNeighbors);
    game.save();
    const saved = deserializeEmpire(localStorage.getItem(EMPIRE_KEY))!;
    assert.equal(saved.discoveries?.[game.homeSystem], 4);
    // Zapis sprzed v0.34.2 (bez wiedzy) — wiedza liczona na start, ta sama co w nowej grze.
    const raw = JSON.parse(localStorage.getItem(EMPIRE_KEY)!);
    delete raw.discoveries;
    localStorage.setItem(EMPIRE_KEY, JSON.stringify(raw));
    const old = new GameController(1000);
    assert.equal(old.knownSystems, game.knownSystems);
    // Odkrycie trafia do zapisu i zostaje po ponownym uruchomieniu.
    const far = old.galaxy.systems.find((s) => old.discoveryLevel(s.index) === 0)!;
    old.markDiscovered(far.index, 2);
    old.markDiscovered(far.index, 1);
    const again = new GameController(2000);
    assert.equal(again.discoveryLevel(far.index), 2);
  });
});
