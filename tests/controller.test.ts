import assert from 'node:assert/strict';
import { test } from 'node:test';
import { GameController, type CompletedBuild } from '../src/app/GameController.ts';
import { SAVE_KEY } from '../src/core/save/save.ts';

/** Prosta pamięć zamiast localStorage przeglądarki. */
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

test('budowa: start → ukończenie zgłoszone raz, z zapisem', () => {
  withMemoryStorage(() => {
    const game = new GameController(0);
    const done: CompletedBuild[] = [];
    game.onBuildComplete((d) => done.push(d));
    assert.ok(game.upgrade('powerPlant', 0).ok);
    assert.equal(game.buildSecondsLeft(30_000), 30);
    assert.equal(game.buildProgress(30_000), 0.5);
    game.tick(59_000);
    assert.equal(done.length, 0);
    game.tick(60_000);
    game.tick(61_000);
    assert.deepEqual(done, [{ building: 'powerPlant', level: 2 }]);
    assert.equal(JSON.parse(localStorage.getItem(SAVE_KEY)!).economy.levels.powerPlant, 2);
  });
});

test('anulowanie przez kontroler zwraca zasoby', () => {
  withMemoryStorage(() => {
    const game = new GameController(0);
    const metal = game.economy.stock.metal;
    game.upgrade('metalMine', 0);
    const r = game.cancelUpgrade(0);
    assert.ok(r.ok);
    assert.equal(game.economy.stock.metal, metal);
  });
});

test('budowa ukończona podczas nieobecności jest zgłaszana po powrocie', () => {
  withMemoryStorage(() => {
    const first = new GameController(0);
    first.upgrade('crystalMine', 0);
    const back = new GameController(10 * 60_000);
    assert.deepEqual(back.completedWhileAway, { building: 'crystalMine', level: 2 });
    assert.equal(back.economy.levels.crystalMine, 2);
    assert.ok(back.offlineGain);
  });
});

test('„Ukończ teraz” w kontrolerze zgłasza ukończenie od razu', () => {
  withMemoryStorage(() => {
    const game = new GameController(0);
    const done: CompletedBuild[] = [];
    game.onBuildComplete((d) => done.push(d));
    game.upgrade('storage', 0);
    assert.ok(game.finishNow(1000).ok);
    assert.deepEqual(done, [{ building: 'storage', level: 2 }]);
    assert.equal(game.capacity, 1600);
  });
});

test('kopiuj zapis → wczytaj w „drugiej kopii gry” przenosi planetę i postęp', () => {
  let exported = '';
  withMemoryStorage(() => {
    const game = new GameController(0);
    game.startNewPlanet('PF-PRZE-NIES', 0);
    game.upgrade('metalMine', 0);
    exported = game.exportSave(1000);
  });
  withMemoryStorage(() => {
    const other = new GameController(5000);
    assert.equal(other.planet.seed, 'KEPLER-186F-ALFA');
    const changes: string[] = [];
    other.onPlanetChange(() => changes.push(other.planet.seed));
    const result = other.importSave(exported, 5000);
    assert.ok(result.ok, result.message);
    assert.equal(other.planet.seed, 'PF-PRZE-NIES');
    assert.equal(other.economy.construction?.building, 'metalMine');
    assert.deepEqual(changes, ['PF-PRZE-NIES']);
    assert.equal(JSON.parse(localStorage.getItem(SAVE_KEY)!).planet.seed, 'PF-PRZE-NIES', 'od razu zapisane');
  });
});

test('nieudany import nie zmienia gry', () => {
  withMemoryStorage(() => {
    const game = new GameController(0);
    const before = game.economy;
    const result = game.importSave('PF1:zepsute', 0);
    assert.equal(result.ok, false);
    assert.equal(game.economy, before);
  });
});
