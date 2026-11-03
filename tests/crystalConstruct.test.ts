// Megakonstrukt kryształów (v0.69): warunki, budowa (ekstraktor pracuje), anulowanie, praca (+60%, znaleziska), lej rośnie
// z wydobyciem (etapy 1→4), pola leja zajęte na zawsze, wyrzucenie wiertnicy na orbitę (lej zostaje) i lądowanie, zapis.
import assert from 'node:assert/strict';
import { test } from 'node:test';
import { GameController } from '../src/app/GameController.ts';
import { checkCrystalConstruct, craterCenter, craterStageFor, crystalConstructSeconds, parseCrystalComplex, type CrystalComplexSave, type CrystalConstructContext } from '../src/core/economy/crystalConstruct.ts';
import { parseOrbiting } from '../src/core/economy/orbitalConstruct.ts';
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

const rich = { metal: 1e7, crystal: 1e7 };

test('wiertnica: warunki po kolei, odwrotne ceny niż metal, czas 1–2 h stały dla planety', () => {
  const base: CrystalConstructContext = { unlocked: true, level: 40, complexActive: true, save: undefined, stock: rich, busy: false };
  const msg = (ctx: Partial<CrystalConstructContext>) => (checkCrystalConstruct({ ...base, ...ctx }, 'S', BALANCE) as { message: string }).message;
  assert.match(msg({ unlocked: false }), /Megastruktury/);
  assert.match(msg({ complexActive: false }), /kompleks Ekstraktora/);
  assert.match(msg({ level: 39 }), /poz\. 40/);
  assert.match(msg({ busy: true }), /leci już/);
  assert.match(msg({ stock: { metal: 0, crystal: 0 } }), /brakuje/);
  const lej: CrystalComplexSave = { phase: 'konstrukt', cells: [1], center: 1, minedAt: 0, stage: 1 };
  assert.match(msg({ save: lej }), /już działa/);
  const ok = checkCrystalConstruct(base, 'S', BALANCE);
  assert.ok(ok.ok);
  assert.ok(ok.ok && ok.cost.crystal > ok.cost.metal, 'kryształy droższe');
  assert.deepEqual(BALANCE.crystalComplex.constructCost, { metal: BALANCE.metalComplex.constructCost.crystal, crystal: BALANCE.metalComplex.constructCost.metal });
  for (const seed of ['A', 'B', 'C']) {
    const s = crystalConstructSeconds(seed, BALANCE);
    assert.ok(s >= 3600 && s <= 7200);
    assert.equal(s, crystalConstructSeconds(seed, BALANCE));
  }
});

test('lej: etap co 25% wydobycia od startu do progu wyeksploatowania, nigdy mniejszy; środek obszaru; zapis z walidacją', () => {
  const save: CrystalComplexSave = { phase: 'konstrukt', cells: [3, 4, 5], center: 4, minedAt: 200, stage: 1 };
  // Złoże 1000, próg 80% → cel 800; od 200 do 800 = 600 jednostek.
  assert.equal(craterStageFor(save, 200, 1000, BALANCE), 1);
  assert.equal(craterStageFor(save, 349, 1000, BALANCE), 1);
  assert.equal(craterStageFor(save, 350, 1000, BALANCE), 2);
  assert.equal(craterStageFor(save, 500, 1000, BALANCE), 3);
  assert.equal(craterStageFor(save, 650, 1000, BALANCE), 4);
  assert.equal(craterStageFor(save, 999, 1000, BALANCE), 4);
  assert.equal(craterStageFor({ ...save, stage: 3 }, 200, 1000, BALANCE), 3, 'lej się nie zmniejsza');
  assert.equal(craterCenter([0, 1, 2], [[1, 0, 0], [0.8, 0.6, 0], [0, 1, 0]]), 1);
  assert.deepEqual(parseCrystalComplex(save, 10), save);
  assert.equal(parseCrystalComplex({ ...save, center: 9 }, 10), null, 'środek spoza leja');
  assert.equal(parseCrystalComplex({ ...save, cells: [3, 4, 50] }, 10)?.cells.length, 2, 'pola spoza siatki pomijane');
  assert.equal(parseCrystalComplex({ ...save, phase: 'x' }, 10), null);
  assert.equal(parseCrystalComplex({ ...save, phase: 'budowa' }, 10), null, 'budowa bez danych budowy');
  assert.equal(parseCrystalComplex({ ...save, stage: 9 }, 10)?.stage, 1);
  assert.deepEqual(parseOrbiting([{ origin: '1:1:1', readyAt: 1, fuel: 1, kind: 'crystal' }, { origin: '1:1:1', readyAt: 1, fuel: 1, kind: 'x' }]), [
    { origin: '1:1:1', readyAt: 1, fuel: 1, kind: 'crystal' },
    { origin: '1:1:1', readyAt: 1, fuel: 1 },
  ]);
});

/** Planeta startowa z Ekstraktorem poz. 40 i kompleksem wiertniczym (gotowa do budowy wiertnicy). */
function readyGame() {
  const game = new GameController(0);
  game.research = { done: ['crystal-complex', 'megastructures'], current: null };
  game.economy = { ...game.economy, levels: { ...game.economy.levels, crystalMine: 40, powerPlant: 30, storage: 25 }, stock: rich, antimatter: 200 };
  game.colony();
  return game;
}

test('wiertnica: kontroler — budowa (ekstraktor pracuje), anulowanie, ukończenie (+60%, znaleziska), lej rośnie, pola zajęte na zawsze, zapis', () => {
  withMemoryStorage(() => {
    const game = readyGame();
    assert.match(game.startCrystalConstruct(0).message, /kompleks Ekstraktora/);
    assert.ok(game.mergeComplex('crystalMine', 0).ok);
    assert.match(game.mergeMega('crystalMine', 0).message, /megakonstrukt/);
    const view = game.crystalConstructView(0);
    assert.equal(view.reason, null, view.reason ?? '');
    assert.equal(view.kind, 'crystal');
    const crystal = game.economy.stock.crystal;
    const started = game.startCrystalConstruct(0);
    assert.ok(started.ok, started.message);
    assert.equal(game.economy.stock.crystal, crystal - BALANCE.crystalComplex.constructCost.crystal);
    assert.ok(game.crystalConstructView(0).building);
    assert.equal(game.craterState()?.rig, true);
    // Anulowanie: koszt wraca, nowy lej znika.
    assert.ok(game.cancelCrystalConstruct(0).ok);
    assert.equal(game.economy.stock.crystal, crystal);
    assert.equal(game.craterState(), null);
    assert.ok(game.startCrystalConstruct(0).ok);
    assert.match(game.demolish('crystalMine', 0).message, /wiertnica/);
    const built = 3 * 3600_000;
    game.economy = { ...game.economy, stock: { metal: 1000, crystal: 1000 } };
    game.tick(built);
    const state = game.craterState()!;
    assert.equal(game.crystalConstructView(built).built, true);
    assert.equal(game.colony().complexes.find((c) => c.building === 'crystalMine')?.mega, true, '+60% jak megakompleks');
    assert.ok(game.findsView().total >= 0);
    assert.ok(state.cells.length > 0 && state.cells.includes(state.center));
    assert.deepEqual([...game.colony().plots.crystalMine!].sort(), [...state.cells].sort(), 'obszar Ekstraktora = lej');
    // Lej rośnie z wydobyciem: wydobycie do progu wyeksploatowania → etap 4.
    game.economy = { ...game.economy, mined: { metal: game.economy.mined?.metal ?? 0, crystal: 1e12 } };
    game.tick(built + 1000);
    assert.equal(game.craterState()!.stage, 4);
    assert.ok(game.journalEntries().some((e) => e.text.includes('sięgnął jądra')));
    // Zapis i wczytanie.
    const saved = deserializeEmpire(localStorage.getItem(EMPIRE_KEY))!;
    game.save();
    assert.equal(deserializeEmpire(localStorage.getItem(EMPIRE_KEY))!.slots[0]!.crystalComplex?.stage, 4);
    assert.ok(saved);
    const fresh = new GameController(built + 2000);
    assert.equal(fresh.craterState()?.stage, 4);
    assert.equal(fresh.crystalConstructView(built + 2000).built, true);
  });
});

test('wiertnica: wyrzucenie na orbitę (lej zostaje, pola dalej zajęte), lądowanie na kolonii z Ekstraktorem poz. 40', () => {
  withMemoryStorage(() => {
    const game = new GameController(0);
    const colony = game.system(game.homeSystem)!.planets.find((p) => p.body === 'rocky' && game.occupantAt(p) === 'free')!.address;
    assert.ok(colonizeNow(game, colony, 0).ok);
    game.research = { done: ['crystal-complex', 'megastructures'], current: null };
    game.economy = { ...game.economy, levels: { ...game.economy.levels, crystalMine: 40, powerPlant: 30, storage: 25 }, stock: rich, antimatter: 200 };
    assert.ok(game.mergeComplex('crystalMine', 0).ok);
    assert.ok(game.switchPlanet(0, 0).ok);
    game.research = { done: ['crystal-complex', 'megastructures'], current: null };
    game.economy = { ...game.economy, levels: { ...game.economy.levels, crystalMine: 40, powerPlant: 30, storage: 25 }, stock: rich, antimatter: 200 };
    assert.ok(game.mergeComplex('crystalMine', 0).ok);
    assert.ok(game.startCrystalConstruct(0).ok);
    const built = 3 * 3600_000;
    game.economy = { ...game.economy, stock: { metal: 1000, crystal: 1000 } };
    game.tick(built);
    const cells = game.craterState()!.cells;
    const launched = game.launchCrystal(built);
    assert.ok(launched.ok, launched.message);
    assert.ok(game.crystalOrbitView(built).launch.preparing);
    assert.ok(game.cancelCrystalLaunch(built + 1).ok);
    assert.ok(game.launchCrystal(built + 2).ok);
    const inOrbit = built + 2 + BALANCE.metalComplex.orbit.prepareSeconds * 1000 + 1;
    game.tick(inOrbit);
    assert.equal(game.craterState()?.rig, false, 'wiertnica odleciała');
    assert.equal(game.crystalConstructView(inOrbit).crater?.left, true);
    assert.equal(game.colony().complexes.find((c) => c.building === 'crystalMine')?.mega, false);
    assert.equal(game.orbitingView(inOrbit)[0]!.crystal, true);
    // Pola leja zostają zajęte nawet po zburzeniu Ekstraktora do zera.
    game.economy = { ...game.economy, levels: { ...game.economy.levels, crystalMine: 0 } };
    const plots = game.colony().plots;
    for (const [id, list] of Object.entries(plots)) for (const c of list ?? []) assert.ok(!cells.includes(c), `${id} na polu leja`);
    // Lądowanie na kolonii.
    const index = game.planets().findIndex((p) => p.address === colony);
    assert.ok(game.switchPlanet(index, inOrbit).ok);
    game.economy = { ...game.economy, antimatter: 200 };
    const view = game.crystalOrbitView(inOrbit);
    assert.equal(view.landingReason, null, view.landingReason ?? '');
    assert.equal(game.orbitView(inOrbit).inOrbit.length, 0, 'okno metalu nie widzi wiertnicy');
    const landed = game.landCrystal(view.inOrbit[0]!.index, inOrbit);
    assert.ok(landed.ok, landed.message);
    game.tick(inOrbit + view.inOrbit[0]!.seconds * 1000 + 3600_000);
    assert.equal(game.craterState()?.rig, true);
    assert.equal(game.colony().complexes.find((c) => c.building === 'crystalMine')?.mega, true);
    assert.ok(game.journalEntries().some((e) => e.text.startsWith('Wiertnica kryształów wylądowała')));
  });
});
