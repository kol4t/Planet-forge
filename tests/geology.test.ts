import assert from 'node:assert/strict';
import { test } from 'node:test';
import { GameController } from '../src/app/GameController.ts';
import { advance, createEconomy, depositsLeft, depositTotal } from '../src/core/economy/economy.ts';
import { compareGeology, geologyOf } from '../src/core/economy/geology.ts';
import { generatePlanet } from '../src/core/generation/generatePlanet.ts';
import { findDefinition, STARTER } from '../src/data/planets.ts';
import { geologyLines } from '../src/game/ui/geologyText.ts';

const starter = generatePlanet(STARTER.definition, STARTER.seed);

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

test('geologia: pola i złoże całkowite z modelu złóż; obca planeta bez „zostało”', () => {
  const g = geologyOf(starter);
  assert.equal(g.fields, starter.gameplay.fields);
  assert.deepEqual(g.total, depositTotal(starter));
  assert.equal(g.left, null);
});

test('geologia: własna planeta rozróżnia złoże całkowite i pozostałe', () => {
  const e = createEconomy(0);
  const mined = advance({ ...e, levels: { ...e.levels, powerPlant: 6, storage: 12 } }, starter, 3_600_000);
  const g = geologyOf(starter, mined);
  assert.deepEqual(g.total, depositTotal(starter));
  assert.deepEqual(g.left, depositsLeft(mined, starter));
  assert.ok(g.left!.metal < g.total.metal && g.left!.crystal < g.total.crystal);
});

test('geologia: porównanie potencjału — ułamek złóż i różnica pól; ze sobą = zero', () => {
  const a = geologyOf(starter);
  assert.deepEqual(compareGeology(a, a), { metal: 0, crystal: 0, fields: 0 });
  const b = { fields: 120, total: { metal: a.total.metal * 1.5, crystal: a.total.crystal / 2 }, left: null };
  const d = compareGeology(b, a);
  assert.ok(Math.abs(d.metal - 0.5) < 1e-9 && Math.abs(d.crystal + 0.5) < 1e-9);
  assert.equal(d.fields, 120 - a.fields);
  // Porównanie nie zależy od wydobycia.
  const mined = { ...a, left: { metal: 1, crystal: 1 } };
  assert.deepEqual(compareGeology(mined, a), { metal: 0, crystal: 0, fields: 0 });
});

test('geologia: teksty na mapie (obca, własna, porównanie ze znakami)', () => {
  const g = { fields: 120, total: { metal: 2_900_000, crystal: 1_100_000 }, left: null };
  assert.deepEqual(geologyLines(g), ['Pola: 120 · Złoże: metal 2,9 mln · kryształy 1,1 mln']);
  const own = { ...g, left: { metal: 2_400_000, crystal: 45_500 } };
  assert.equal(geologyLines(own)[0], 'Pola: 120 · Zostało: metal 2,4 mln z 2,9 mln · kryształy 45 tys. z 1,1 mln');
  const lines = geologyLines(g, { name: 'Kepler-186 f', diff: { metal: 0.163, crystal: -0.08, fields: 20 } });
  assert.equal(lines[1], 'Względem Kepler-186 f: metal +16% · kryształy −8% · pola +20');
  assert.equal(geologyLines(g, { name: 'X', diff: { metal: 0, crystal: 0.001, fields: -5 } })[1], 'Względem X: metal ±0% · kryształy ±0% · pola −5');
});

test('geologia: mapa pokazuje to samo złoże, które planeta dostaje po kolonizacji; seed bez zmian', () => {
  withMemoryStorage(() => {
    const game = new GameController(0);
    const free = game.system(game.homeSystem)!.planets.find((p) => p.body === 'rocky' && game.occupantAt(p) === 'free')!;
    // Mapa liczy planetę tak samo jak MapScene (definicja + adres).
    const seen = generatePlanet(findDefinition(free.definitionId)!, free.address);
    const before = game.geologyAt(seen, free.address, 0);
    assert.equal(before.left, null);
    assert.ok(game.colonize(free.address, 0).ok);
    const after = game.geologyAt(seen, free.address, 0);
    assert.deepEqual(after.total, before.total);
    assert.equal(after.fields, before.fields);
    assert.deepEqual(after.left, after.total, 'nowa kolonia ma pełne złoża');
    assert.equal(game.planet.seed, free.address);
    // Odczyt geologii nie zmienia gospodarki.
    const economy = JSON.stringify(game.economy);
    game.geologyAt(starter, game.address, 0);
    assert.equal(JSON.stringify(game.economy), economy);
  });
});
