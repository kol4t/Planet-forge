import assert from 'node:assert/strict';
import { test } from 'node:test';
import { GameController } from '../src/app/GameController.ts';
import { parseStation, stationCost, stationLevelAt, stationOutput, upgradeStation, withStation } from '../src/core/economy/asteroids.ts';
import { generateGalaxy, generateSystem } from '../src/core/galaxy/galaxy.ts';
import { applyResearch } from '../src/core/research/research.ts';
import { deserializeEmpire, EMPIRE_KEY } from '../src/core/save/empire.ts';
import { BALANCE } from '../src/data/balance.ts';
import { findResearch } from '../src/data/research.ts';

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
const ctx = { hasBelt: true, unlocked: true, takenBy: null, stock: rich, now: 0 };

test('asteroidy: urobek i koszt rosną z poziomem; badanie Rafinacji zwiększa urobek', () => {
  assert.deepEqual(stationOutput(0, BALANCE), { metal: 0, crystal: 0 });
  assert.deepEqual(stationOutput(1, BALANCE), BALANCE.asteroid.output);
  assert.ok(stationOutput(3, BALANCE).metal > 3 * BALANCE.asteroid.output.metal);
  assert.ok(stationCost(2, BALANCE).metal > stationCost(1, BALANCE).metal);
  const refined = applyResearch(BALANCE, ['station-refine']);
  assert.equal(stationOutput(1, refined).metal, BALANCE.asteroid.output.metal * 1.5);
  // Urobek doliczony do przyrostu podstawowego — nie zużywa złóż planety.
  assert.equal(withStation(BALANCE, 1).passiveIncome.metal, BALANCE.passiveIncome.metal + BALANCE.asteroid.output.metal);
  assert.deepEqual(findResearch('station-1')!.effects, [{ kind: 'unlock', feature: 'asteroid-mining' }]);
  assert.ok(findResearch('station-refine')!.requires.includes('mining-1'), 'most z Produktywności');
});

test('asteroidy: budowa — badanie, pas, jedna stacja na pas, rozbudowa w toku, surowce, poziom działa od readyAt', () => {
  assert.match((upgradeStation(undefined, { ...ctx, unlocked: false }, BALANCE) as { message: string }).message, /Górnictwo asteroid/);
  assert.match((upgradeStation(undefined, { ...ctx, hasBelt: false }, BALANCE) as { message: string }).message, /nie ma pasa/);
  assert.match((upgradeStation(undefined, { ...ctx, takenBy: 'X' }, BALANCE) as { message: string }).message, /jedna stacja/);
  assert.match((upgradeStation(undefined, { ...ctx, stock: { metal: 0, crystal: 0 } }, BALANCE) as { message: string }).message, /brakuje: 800 metalu, 500 kryształów/);
  const first = upgradeStation(undefined, ctx, BALANCE);
  assert.ok(first.ok);
  if (!first.ok) return;
  assert.deepEqual(first.station, { level: 1, readyAt: BALANCE.asteroid.secondsPerLevel * 1000 });
  assert.equal(stationLevelAt(first.station, 0), 0);
  assert.equal(stationLevelAt(first.station, first.station.readyAt), 1);
  assert.match((upgradeStation(first.station, { ...ctx, now: 1000 }, BALANCE) as { message: string }).message, /rozbudowywana/);
  const max = upgradeStation({ level: BALANCE.asteroid.maxLevel, readyAt: 0 }, { ...ctx, now: 1 }, BALANCE);
  assert.equal(max.ok, false);
  assert.equal(parseStation({ level: 2, readyAt: 5 })?.level, 2);
  assert.equal(parseStation({ level: 0, readyAt: 5 }), undefined);
  assert.equal(parseStation({ level: 2 }), undefined);
});

test('asteroidy: kontroler — układ bez pasa, stacja na planecie z pasem, urobek po budowie, zapis', () => {
  withMemoryStorage(() => {
    const game = new GameController(0);
    game.research = { done: ['station-1'], current: null };
    const home = game.asteroidView(0);
    assert.equal(home.unlocked, true);
    assert.equal(home.hasBelt, false, 'układ startowy nie ma pasa');
    assert.match(game.upgradeAsteroidStation(0).message, /nie ma pasa/);
    // Planeta w układzie z pasem (na potrzeby testu przenosimy adres aktywnej planety).
    const galaxy = generateGalaxy(1);
    const beltSystem = galaxy.systems.map((s) => generateSystem(galaxy, s.index)!).find((s) => s.belt)!;
    (game as unknown as { slots: { address: string }[] }).slots[0]!.address = beltSystem.planets[0]!.address;
    assert.equal(game.asteroidView(0).hasBelt, true);
    game.economy = { ...game.economy, stock: { metal: 900, crystal: 900 } };
    const before = game.rates.metal;
    const built = game.upgradeAsteroidStation(0);
    assert.ok(built.ok, built.message);
    assert.ok(Math.abs(game.economy.stock.metal - 100) < 1e-6);
    assert.equal(game.rates.metal, before, 'w budowie — bez urobku');
    const ready = BALANCE.asteroid.secondsPerLevel * 1000;
    game.tick(ready + 60_000);
    assert.equal(game.asteroidView(ready + 60_000).level, 1);
    assert.ok(Math.abs(game.rates.metal - before - BALANCE.asteroid.output.metal) < 1e-9);
    assert.equal(game.overview(ready + 60_000)[0]!.asteroidLevel, 1);
    const saved = deserializeEmpire(localStorage.getItem(EMPIRE_KEY));
    assert.deepEqual(saved?.slots[0]?.asteroidStation, { level: 1, readyAt: ready });
  });
});

test('komety: holownik — badanie, jeden naraz, koszt, ładunek deterministyczny w granicach, zapis', async () => {
  const { cometCargo, launchComet, parseComets } = await import('../src/core/economy/comets.ts');
  const c = BALANCE.comet;
  const ctx = { unlocked: true, busy: false, stock: rich, now: 1000 };
  assert.match((launchComet('1:16:4', { ...ctx, unlocked: false }, BALANCE) as { message: string }).message, /Przechwyt komet/);
  assert.match((launchComet('1:16:4', { ...ctx, busy: true }, BALANCE) as { message: string }).message, /już leci/);
  assert.match((launchComet('1:16:4', { ...ctx, stock: { metal: 0, crystal: 0 } }, BALANCE) as { message: string }).message, /brakuje: 200 metalu, 100 kryształów/);
  const ok = launchComet('1:16:4', ctx, BALANCE);
  assert.ok(ok.ok);
  if (!ok.ok) return;
  assert.equal(ok.haul.returnsAt, 1000 + c.seconds * 1000);
  assert.deepEqual(ok.haul.cargo, cometCargo('1:16:4', 1000, BALANCE));
  for (let t = 0; t < 50; t++) {
    const cargo = cometCargo('1:16:4', t * 7919, BALANCE);
    assert.ok(cargo.metal >= c.cargoMin.metal && cargo.metal <= c.cargoMax.metal);
    assert.ok(cargo.crystal >= c.cargoMin.crystal && cargo.crystal <= c.cargoMax.crystal);
  }
  assert.deepEqual(parseComets([ok.haul]), [ok.haul]);
  assert.deepEqual(parseComets([{ ...ok.haul, planet: 'x' }, { ...ok.haul, returnsAt: 0 }]), []);
  // Badanie wcześnie w drzewie: wymaga tylko Górnictwa asteroid i Eksploracji (most).
  assert.deepEqual(findResearch('station-comet')!.requires, ['station-1', 'explore-1']);
});

test('komety: kontroler — także w układzie bez pasa, powrót raz z ładunkiem, nieobecność', () => {
  withMemoryStorage(() => {
    const game = new GameController(0);
    assert.equal(game.asteroidView(0).hasBelt, false);
    assert.match(game.launchComet(0).message, /Przechwyt komet/);
    game.research = { done: ['station-1', 'explore-1', 'station-comet'], current: null };
    const before = game.economy.stock;
    const sent = game.launchComet(0);
    assert.ok(sent.ok, sent.message);
    assert.equal(game.launchComet(0).ok, false, 'jeden holownik naraz');
    const cargo = game.cometView(0).flying!.cargo;
    assert.equal(game.cometsView(0).length, 1);
    const back = BALANCE.comet.seconds * 1000;
    const texts: string[] = [];
    game.onShipmentArrived((t) => texts.push(t));
    game.tick(back);
    game.tick(back + 1);
    assert.equal(texts.length, 1);
    assert.match(texts[0]!, /Kometa przyholowana/);
    assert.equal(game.cometsView().length, 0);
    assert.ok(game.economy.stock.metal >= before.metal - BALANCE.comet.cost.metal + cargo.metal - 1e-6);
    // Drugi holownik wraca podczas nieobecności.
    assert.ok(game.launchComet(back + 2).ok);
    const later = new GameController(back * 3);
    assert.equal(later.shipmentsWhileAway.length, 1);
    assert.match(later.shipmentsWhileAway[0]!, /Kometa/);
  });
});
