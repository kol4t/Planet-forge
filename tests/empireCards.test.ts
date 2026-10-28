import assert from 'node:assert/strict';
import { test } from 'node:test';
import { GameController, type PlanetOverview } from '../src/app/GameController.ts';
import { planetBadges, planetBars } from '../src/game/ui/empireCards.ts';
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
    assert.equal(bars[2]!.text, `${p.fields.used}/${p.fields.buildable} · ${p.fields.buildable - p.fields.used} wolnych`);
    assert.match(bars[0]!.text, /pełny$/);
    // Nowa planeta: złoża pełne.
    assert.match(planetBars(p)[1]!.text, /· 100%$/);
  });
});

test('Imperium: suma — produkcja na godzinę, pola, antymateria (przyrost pasywny raz, kolektory wszystkie)', () => {
  withMemoryStorage(() => {
    const game = new GameController(0);
    const free = game.system(game.homeSystem)!.planets.find((p) => p.body === 'rocky' && game.occupantAt(p) === 'free')!;
    assert.ok(colonizeNow(game, free.address, 0).ok);
    const overview = game.overview(0);
    const totals = game.empireTotals(overview);
    const metal = overview.reduce((s, p) => s + p.rates.metal, 0) * 60;
    assert.ok(Math.abs(totals.metalPerHour - metal) < 1e-9);
    assert.equal(totals.fieldsBuildable, overview.reduce((s, p) => s + p.fields.buildable, 0));
    // Bez kolektorów: tylko przyrost pasywny, liczony raz mimo 2 planet.
    assert.equal(totals.antimatterPerHour, game.balance.antimatter.passivePerHour);
  });
});

test('Imperium: alerty — pilne najpierw, prowadzą do planety, badań albo mapy; sortowanie po problemach i wolnych polach', async () => {
  const { empireAlerts, sortPlanets, storageFullIn } = await import('../src/game/ui/empireCards.ts');
  withMemoryStorage(() => {
    const game = new GameController(0);
    const free = game.system(game.homeSystem)!.planets.find((p) => p.body === 'rocky' && game.occupantAt(p) === 'free')!;
    assert.ok(colonizeNow(game, free.address, 0).ok);
    const [a, b] = game.overview(0);
    const full: PlanetOverview = { ...b!, stock: { metal: b!.capacity, crystal: 0 } };
    const dark: PlanetOverview = { ...a!, rates: { ...a!.rates, efficiency: 0.5 }, labLevel: 2, researching: false };
    const alerts = empireAlerts([dark, full], 1);
    assert.equal(alerts[0]!.level, 0);
    assert.ok(alerts.some((x) => /pełny/.test(x.text) && x.target.kind === 'planet' && x.target.index === full.index));
    assert.ok(alerts.some((x) => /energii/.test(x.text)));
    assert.ok(alerts.some((x) => x.target.kind === 'research' && x.target.index === dark.index));
    assert.ok(alerts.some((x) => x.target.kind === 'map'));
    // Poziomy rosnąco (pilne, ostrzeżenia, okazje).
    assert.deepEqual([...alerts.map((x) => x.level)], [...alerts.map((x) => x.level)].sort());
    assert.equal(storageFullIn(full), 0);
    // Magazyn zapełniający się w ciągu 30 min — ostrzeżenie z czasem.
    const soon: PlanetOverview = { ...a!, stock: { metal: a!.capacity - a!.rates.metal * 10, crystal: 0 } };
    assert.ok(empireAlerts([soon], 0).some((x) => x.level === 1 && /zapełni się za 1[01] min/.test(x.text)));
    // Sortowanie: problemy — planeta z pilnym alertem pierwsza; wolne pola — malejąco.
    assert.equal(sortPlanets([dark, full], 'problems', alerts)[0]!.index, dark.index);
    const roomy: PlanetOverview = { ...full, fields: { used: 0, buildable: 150 } };
    assert.equal(sortPlanets([dark, roomy], 'free')[0]!.index, roomy.index);
    assert.deepEqual(sortPlanets([full, dark], 'default').map((p) => p.index), [dark.index, full.index].sort((x, y) => x - y));
  });
});
