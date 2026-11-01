import assert from 'node:assert/strict';
import { test } from 'node:test';
import { GameController } from '../src/app/GameController.ts';
import { deserializeEmpire, EMPIRE_KEY, parseStellar } from '../src/core/save/empire.ts';
import { BALANCE } from '../src/data/balance.ts';

function withMemoryStorage(run: () => void): void {
  const store = new Map<string, string>();
  const original = Object.getOwnPropertyDescriptor(globalThis, 'localStorage');
  Object.defineProperty(globalThis, 'localStorage', {
    configurable: true,
    value: { getItem: (k: string) => store.get(k) ?? null, setItem: (k: string, v: string) => void store.set(k, v), removeItem: (k: string) => void store.delete(k) },
  });
  try {
    run();
  } finally {
    if (original) Object.defineProperty(globalThis, 'localStorage', original);
    else delete (globalThis as { localStorage?: unknown }).localStorage;
  }
}

test('imperium gwiezdne (etap 8): 3 wyeksploatowane planety + gotowa stacja zamykają pętlę raz; miejsca do 10; zapis', () => {
  withMemoryStorage(() => {
    const game = new GameController(0);
    const inner = game as unknown as { exploited: string[] };
    assert.equal(game.slotInfo.unlocked, BALANCE.planetSlots.base);
    // 3 planety bez stacji — pętla jeszcze otwarta.
    inner.exploited = ['1:1:1', '1:1:2', '1:1:3'];
    game.tick(1000);
    assert.equal(game.stellarView().closed, false);
    assert.equal(game.loopProgress(1000).stationReady, false);
    // Stacja w budowie — dalej otwarta; gotowa — zamknięta.
    game.research = { done: ['station-orbit'], current: null };
    game.economy = { ...game.economy, levels: { ...game.economy.levels, storage: 14 }, stock: { metal: 100_000, crystal: 100_000 } };
    assert.ok(game.buildStation(1000).ok);
    game.tick(2000);
    assert.equal(game.stellarView().closed, false);
    let fired = 0;
    game.onStellarEmpire(() => fired++);
    const ready = 1000 + BALANCE.homeStation.coreSeconds * 1000;
    game.tick(ready);
    const v = game.stellarView();
    assert.ok(v.closed && v.showBoard);
    assert.equal(fired, 1);
    assert.equal(game.slotInfo.unlocked, BALANCE.planetSlots.max);
    assert.ok(game.journalEntries().some((e) => e.text.startsWith('Pętla zamknięta')));
    game.tick(ready + 1000);
    assert.equal(fired, 1, 'tylko raz');
    // Plansza widziana — zapis pamięta; po wczytaniu nadal zamknięta, plansza się nie pokazuje.
    game.markStellarSeen();
    const saved = deserializeEmpire(localStorage.getItem(EMPIRE_KEY))!;
    assert.deepEqual(saved.stellar, { at: ready, seen: true });
    assert.equal(saved.unlockedSlots, BALANCE.planetSlots.max);
    const fresh = new GameController(ready + 5000);
    assert.equal(fresh.stellarView().closed, true);
    assert.equal(fresh.stellarView().showBoard, false);
    assert.equal(fresh.loopProgress().closed, true);
    // Licznik liczy dalej.
    assert.equal(fresh.loopProgress().exploited.length, 3);
  });
});

test('imperium gwiezdne: błędne pole w zapisie pomijane', () => {
  assert.equal(parseStellar({ at: 'x' }), null);
  assert.equal(parseStellar(null), null);
  assert.deepEqual(parseStellar({ at: 5, seen: 'tak' }), { at: 5 });
});
