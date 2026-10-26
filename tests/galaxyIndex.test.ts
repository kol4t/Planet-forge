import assert from 'node:assert/strict';
import { test } from 'node:test';
import { GameController } from '../src/app/GameController.ts';
import { fold, galaxyFilterCount, matchesGalaxyFilter, searchSystems, type KnownSystem } from '../src/core/galaxy/galaxyIndex.ts';

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

const sys = (index: number, over: Partial<KnownSystem>): KnownSystem => ({
  index,
  name: `Układ-${index}`,
  level: 3,
  rare: false,
  distance: index,
  reachable: false,
  own: false,
  ...over,
});
const list = [
  sys(16, { name: 'TOI-843', level: 4, own: true, distance: 0 }),
  sys(64, { name: 'Lacaille-445', level: 4, rare: true, distance: 46 }),
  sys(4, { name: 'Wolf-122', reachable: true, distance: 10 }),
  sys(30, { name: 'Nieznany sygnał', level: 1, distance: 37, reachable: true }),
  sys(50, { name: 'Łódź-7', level: 2, distance: 20 }),
];

test('wyszukiwarka: nazwa bez wielkich liter i polskich znaków, numer układu, sygnały po słowie „sygnał”', () => {
  assert.equal(fold('Łódź-7 '), 'lodz-7');
  assert.deepEqual(searchSystems(list, 'lac', 'all').map((s) => s.index), [64]);
  assert.deepEqual(searchSystems(list, 'LODZ', 'all').map((s) => s.index), [50]);
  assert.deepEqual(searchSystems(list, '1:4', 'all').map((s) => s.index), [4]);
  assert.deepEqual(searchSystems(list, '64', 'all').map((s) => s.index), [64]);
  assert.deepEqual(searchSystems(list, 'sygnał', 'all').map((s) => s.index), [30]);
  // Numer sygnału nie zdradza go (sygnał nie ma nazwy ani numeru dla gracza).
  assert.deepEqual(searchSystems(list, '30', 'all'), []);
  // Bez zapytania: własny układ pierwszy, potem od najbliższych.
  assert.deepEqual(searchSystems(list, '', 'all').map((s) => s.index), [16, 4, 50, 30, 64]);
});

test('wyszukiwarka: filtry zbadane / rzadkie / w zasięgu i liczniki', () => {
  assert.equal(galaxyFilterCount(list, 'explored'), 2);
  assert.equal(galaxyFilterCount(list, 'rare'), 1);
  assert.equal(galaxyFilterCount(list, 'reachable'), 2);
  assert.deepEqual(searchSystems(list, '', 'reachable').map((s) => s.index), [4, 30]);
  assert.equal(matchesGalaxyFilter(list[0]!, 'all'), true);
});

test('wyszukiwarka: kontroler — spis tylko znanych układów, sygnały bez nazwy', () => {
  withMemoryStorage(() => {
    const game = new GameController(0);
    const known = game.knownSystemsList();
    assert.equal(known.length, game.galaxy.systems.filter((s) => game.discoveryLevel(s.index) > 0).length);
    for (const k of known) {
      if (k.level === 1) assert.equal(k.name, 'Nieznany sygnał');
      else assert.equal(k.name, game.galaxy.systems[k.index - 1]!.name);
    }
    assert.ok(known.some((k) => k.own && k.index === game.homeSystem && k.distance === 0));
    assert.ok(known.every((k) => !k.reachable), 'bez sond nic nie jest w zasięgu');
  });
});
