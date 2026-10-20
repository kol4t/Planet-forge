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
