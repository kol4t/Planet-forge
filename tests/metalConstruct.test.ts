// Kompleks kopalni metalu, etap 3: megakonstrukt — warunki, budowa (kopalnia pracuje), anulowanie, ukończenie
// (układ promienisty, +60%, znaleziska), zastąpienie megakompleksu metalu, zapis.
import assert from 'node:assert/strict';
import { test } from 'node:test';
import { GameController } from '../src/app/GameController.ts';
import { complexLayout, metalComplexFields, parseMetalComplex } from '../src/core/colony/complexLayout.ts';
import { checkConstruct, constructSeconds } from '../src/core/economy/metalConstruct.ts';
import { deserializeEmpire, EMPIRE_KEY } from '../src/core/save/empire.ts';
import { BALANCE } from '../src/data/balance.ts';
import { metalPieces, beltSegments, METAL_LOOK } from '../src/planet-renderer/metalComplexMeshes.ts';
import { fieldGrid } from '../src/core/colony/fieldGrid.ts';

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
const save: import('../src/core/colony/complexLayout.ts').MetalComplexSave = { center: [0, 0, 1], phase: 'osady' };

test('megakonstrukt: warunki po kolei (badanie, wielka fabryka, komplet osad, miejsce, surowce), czas 1–2 h stały dla planety', () => {
  const base: import('../src/core/economy/metalConstruct.ts').ConstructContext = { unlocked: true, level: 40, complexActive: true, save, stock: rich, blocked: 0 };
  const msg = (ctx: Partial<import('../src/core/economy/metalConstruct.ts').ConstructContext>) => (checkConstruct({ ...base, ...ctx }, 'S', BALANCE) as { message: string }).message;
  assert.match(msg({ unlocked: false }), /Megastruktury/);
  assert.match(msg({ complexActive: false }), /wielką fabrykę/);
  assert.match(msg({ level: 39 }), /poz\. 40/);
  assert.match(msg({ blocked: 3 }), /3 pól innych budynków/);
  assert.match(msg({ stock: { metal: 0, crystal: 0 } }), /brakuje/);
  assert.match(msg({ save: { ...save, build: { startedAt: 0, readyAt: 1, cost: { metal: 1, crystal: 1 } } } }), /już w budowie/);
  assert.match(msg({ save: { ...save, phase: 'konstrukt' } }), /już działa/);
  const ok = checkConstruct(base, 'S', BALANCE);
  assert.ok(ok.ok);
  const { min, max } = BALANCE.metalComplex.constructSeconds;
  for (const seed of ['A', 'B', 'C', 'D']) {
    const s = constructSeconds(seed, BALANCE);
    assert.ok(s >= min && s <= max, `${seed}: ${s}`);
    assert.equal(s, constructSeconds(seed, BALANCE), 'stały dla planety');
  }
});

test('megakonstrukt: zapis budowy z walidacją (tylko w fazie osad)', () => {
  const build = { startedAt: 10, readyAt: 20, cost: { metal: 5, crystal: 6 } };
  assert.deepEqual(parseMetalComplex({ ...save, build })?.build, build);
  assert.equal(parseMetalComplex({ ...save, build: { startedAt: 30, readyAt: 20, cost: build.cost } })?.build, undefined);
  assert.equal(parseMetalComplex({ ...save, phase: 'konstrukt', build })?.build, undefined);
});

test('megakonstrukt: kontroler — budowa (kopalnia pracuje), anulowanie, ukończenie: układ promienisty, +60%, znaleziska, zapis', () => {
  withMemoryStorage(() => {
    const game = new GameController(0);
    game.research = { done: ['metal-factory', 'megastructures'], current: null };
    game.economy = { ...game.economy, levels: { ...game.economy.levels, metalMine: 40, powerPlant: 30, storage: 25 }, stock: rich };
    assert.match(game.startMetalConstruct(0).message, /wielką fabrykę/);
    assert.ok(game.mergeComplex('metalMine', 0).ok);
    // Megakompleks metalu zastąpiony megakonstruktem.
    assert.match(game.mergeMega('metalMine', 0).message, /megakonstrukt/);
    assert.equal(game.complexView('metalMine')!.mega.candidate, null);
    const view = game.metalConstructView(0);
    assert.equal(view.reason, null, view.reason ?? '');
    const metalBefore = game.rates.metal;
    const stock = game.economy.stock.metal;
    const started = game.startMetalConstruct(0);
    assert.ok(started.ok, started.message);
    assert.equal(game.economy.stock.metal, stock - BALANCE.metalComplex.constructCost.metal);
    assert.ok(Math.abs(game.rates.metal - metalBefore) < 1e-9, 'kopalnia pracuje w czasie budowy');
    assert.ok(game.metalConstructView(0).building);
    assert.match(game.splitComplex('metalMine', 0).message, /megakonstruktu/);
    // Anulowanie: koszt wraca, można zacząć znowu.
    assert.ok(game.cancelMetalConstruct(1000).ok);
    assert.ok(game.economy.stock.metal >= stock - 1, `koszt zwrócony (${game.economy.stock.metal} ≥ ${stock})`);
    assert.ok(game.startMetalConstruct(2000).ok);
    const seconds = view.seconds;
    assert.equal(deserializeEmpire(localStorage.getItem(EMPIRE_KEY))!.slots[0]!.metalComplex?.build?.readyAt, 2000 + seconds * 1000);
    const done = 2000 + seconds * 1000 + 1;
    game.tick(done);
    const after = game.metalConstructView(done);
    assert.equal(after.built, true);
    assert.equal(after.building, null);
    const { plots, metalComplex, complexes } = game.colony();
    assert.equal(metalComplex?.phase, 'konstrukt');
    assert.equal(complexes.find((c) => c.building === 'metalMine')?.mega, true);
    assert.equal(plots.metalMine!.length, metalComplexFields(40, 'konstrukt'), 'konstrukt + osady = 24 pola');
    assert.ok(game.rates.metal > metalBefore * 1.15, 'premia megakonstruktu (+60% zamiast +30%)');
    assert.equal(game.findsView(done).upcoming.length, 1, 'znaleziska zaplanowane');
    assert.match(game.splitMega('metalMine', done).message, /na stałe/);
    assert.match(game.transferView('metalMine', done).reason!, /orbitę/);
    assert.ok(game.journalEntries().some((e) => e.text.includes('megakonstrukt kopalni metalu gotowy')));
    // Po wczytaniu — dalej układ promienisty.
    const fresh = new GameController(done + 1);
    assert.equal(fresh.colony().metalComplex?.phase, 'konstrukt');
    assert.equal(fresh.metalConstructView(done + 1).built, true);
  });
});

test('megakonstrukt: ukończenie podczas nieobecności (nieaktywna planeta też)', () => {
  withMemoryStorage(() => {
    const game = new GameController(0);
    game.research = { done: ['metal-factory', 'megastructures'], current: null };
    game.economy = { ...game.economy, levels: { ...game.economy.levels, metalMine: 40, powerPlant: 30, storage: 25 }, stock: rich };
    assert.ok(game.mergeComplex('metalMine', 0).ok);
    assert.ok(game.startMetalConstruct(0).ok);
    const later = new GameController(3 * 3600_000);
    assert.equal(later.colony().metalComplex?.phase, 'konstrukt');
    assert.ok(later.shipmentsWhileAway.some((t) => t.includes('megakonstrukt')));
  });
});

test('wygląd układu promienistego: konstrukt w środku, 4 fabryki, 12 pasów po odcinkach, bez placu', () => {
  withMemoryStorage(() => {
    const game = new GameController(0);
    const grid = fieldGrid(game.planet);
    game.economy = { ...game.economy, levels: { ...game.economy.levels, metalMine: 40 } };
    const center = game.colony().metalComplex!.center;
    const layout = complexLayout(grid, game.planet.seed, 40, 'konstrukt', { center });
    const pieces = metalPieces(layout, true);
    assert.equal(pieces.filter((p) => p.kind === 'plaza').length, 0);
    assert.deepEqual(pieces.filter((p) => p.kind === 'mega').map((p) => p.slotId), ['konstrukt']);
    assert.equal(pieces.filter((p) => p.kind === 'factory').length, 4);
    assert.equal(beltSegments(layout).length, 12 * METAL_LOOK.beltSteps);
  });
});
