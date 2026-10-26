import assert from 'node:assert/strict';
import { test } from 'node:test';
import { GameController, type PlanetOverview } from '../src/app/GameController.ts';
import { planetBadges, planetBars } from '../src/game/ui/empireCards.ts';

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

test('Imperium: znaczki i paski kart wynikają z danych gry', () => {
  withMemoryStorage(() => {
    const game = new GameController(0);
    const p = game.overview(0)[0]!;
    const labels = (o: PlanetOverview) => planetBadges(o).map((b) => b.label);
    assert.ok(labels(p).includes('Tu jesteś'));
    const rich = p.planet.gameplay.richness.metal >= 1.2;
    assert.equal(labels(p).includes('bogata w metal'), rich);
    // Pełny magazyn i wyczerpane złoże.
    const full: PlanetOverview = { ...p, stock: { metal: p.capacity, crystal: 0 }, deposits: { ...p.deposits, left: { metal: 0, crystal: 5 } } };
    assert.ok(labels(full).includes('magazyn pełny') && labels(full).includes('złoże wyczerpane'));
    const bars = planetBars(full);
    assert.deepEqual(bars.map((b) => b.label), ['Magazyn', 'Złoża', 'Pola']);
    assert.equal(bars[0]!.value, 1);
    assert.equal(bars[0]!.tone, 'danger');
    assert.equal(bars[2]!.text, `${p.fields.used}/${p.fields.buildable}`);
    // Nowa planeta: złoża pełne.
    assert.equal(planetBars(p)[1]!.text, '100%');
  });
});

test('Imperium: suma — produkcja na godzinę, pola, antymateria (przyrost pasywny raz, kolektory wszystkie)', () => {
  withMemoryStorage(() => {
    const game = new GameController(0);
    const free = game.system(game.homeSystem)!.planets.find((p) => p.body === 'rocky' && game.occupantAt(p) === 'free')!;
    assert.ok(game.colonize(free.address, 0).ok);
    const overview = game.overview(0);
    const totals = game.empireTotals(overview);
    const metal = overview.reduce((s, p) => s + p.rates.metal, 0) * 60;
    assert.ok(Math.abs(totals.metalPerHour - metal) < 1e-9);
    assert.equal(totals.fieldsBuildable, overview.reduce((s, p) => s + p.fields.buildable, 0));
    // Bez kolektorów: tylko przyrost pasywny, liczony raz mimo 2 planet.
    assert.equal(totals.antimatterPerHour, game.balance.antimatter.passivePerHour);
  });
});
