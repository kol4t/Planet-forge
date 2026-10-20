import assert from 'node:assert/strict';
import { test } from 'node:test';
import { GameController, type CompletedBuild } from '../src/app/GameController.ts';
import { EMPIRE_KEY } from '../src/core/save/empire.ts';

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
    assert.equal(JSON.parse(localStorage.getItem(EMPIRE_KEY)!).slots[0].economy.levels.powerPlant, 2);
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
    assert.ok(game.addPlanet('PF-PRZE-NIES', 0).ok);
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
    assert.equal(other.slotInfo.used, 2, 'przeniesione całe imperium (planeta startowa + nowa)');
    const stored = JSON.parse(localStorage.getItem(EMPIRE_KEY)!);
    assert.equal(stored.slots[stored.active].planet.seed, 'PF-PRZE-NIES', 'od razu zapisane');
  });
});

test('nieudany import nie zmienia gry', () => {
  withMemoryStorage(() => {
    const game = new GameController(0);
    const before = game.economy;
    const result = game.importSave('PF2:zepsute', 0);
    assert.equal(result.ok, false);
    assert.equal(game.economy, before);
  });
});

test('kilka planet: dodawanie, przełączanie, limit 5 miejsc, usuwanie', () => {
  withMemoryStorage(() => {
    const game = new GameController(0);
    assert.deepEqual(game.slotInfo, { used: 1, unlocked: 5, max: 10 });
    for (let i = 1; i < 5; i++) assert.ok(game.addPlanet(`PF-SLOT-${i}`, 0).ok);
    assert.equal(game.planet.seed, 'PF-SLOT-4', 'nowa planeta staje się aktywna');
    const full = game.addPlanet('PF-SLOT-5', 0);
    assert.equal(full.ok, false);
    assert.match(full.message, /Wszystkie miejsca \(5\) są zajęte/);

    assert.ok(game.switchPlanet(0, 1000).ok);
    assert.equal(game.planet.seed, 'KEPLER-186F-ALFA');
    assert.equal(game.planets().filter((p) => p.active).length, 1);
    assert.equal(game.removePlanet(0).ok, false, 'aktywnej nie da się usunąć');
    assert.ok(game.removePlanet(2).ok);
    assert.equal(game.slotInfo.used, 4);
    assert.equal(game.planet.seed, 'KEPLER-186F-ALFA', 'aktywna bez zmian po usunięciu innej');

    // Po „ponownym uruchomieniu” wszystko wraca z zapisu.
    const again = new GameController(2000);
    assert.equal(again.slotInfo.used, 4);
    assert.equal(again.planet.seed, 'KEPLER-186F-ALFA');
  });
});

test('nieaktywna planeta dalej produkuje i kończy budowy (jak podczas nieobecności)', () => {
  withMemoryStorage(() => {
    const game = new GameController(0);
    game.upgrade('metalMine', 0); // budowa poz. 2 na planecie startowej (1 min)
    const metalBefore = game.economy.stock.metal;
    game.addPlanet('PF-DRUGA', 0);
    const done: string[] = [];
    game.onBuildComplete((d) => done.push(d.building));
    game.switchPlanet(0, 10 * 60_000);
    assert.equal(game.economy.levels.metalMine, 2);
    assert.ok(game.economy.stock.metal > metalBefore);
    assert.deepEqual(game.completedWhileAway, { building: 'metalMine', level: 2 });
  });
});

test('antymateria jest wspólna: przyrost pasywny liczony raz, kolektory wszystkich planet dodają', () => {
  withMemoryStorage(() => {
    const game = new GameController(0);
    const start = game.economy.antimatter;
    game.addPlanet('PF-DRUGA', 0);
    assert.equal(game.economy.antimatter, start, 'nowa planeta nie dodaje zapasu startowego');
    game.switchPlanet(0, 3600_000);
    // Godzina: +1 pasywnie (raz), planety bez kolektora nic nie dodają.
    assert.ok(Math.abs(game.economy.antimatter - (start + 1)) < 1e-9);
    const stored = JSON.parse(localStorage.getItem(EMPIRE_KEY)!);
    assert.ok(stored.slots.every((s: { economy: { antimatter: number } }) => s.economy.antimatter === 0));
    assert.ok(Math.abs(stored.antimatter - (start + 1)) < 1e-9);
  });
});

test('stary zapis jednej planety (v0.1–0.6) przechodzi do imperium', () => {
  withMemoryStorage(() => {
    localStorage.setItem(
      'planet-forge.save.v1',
      JSON.stringify({
        saveVersion: 1,
        planet: { definitionId: 'ice', seed: 'PF-STARY', generatorVersion: 1 },
        economy: { stock: { metal: 500, crystal: 300 }, levels: { metalMine: 4 }, lastUpdate: 0, antimatter: 3 },
      }),
    );
    const game = new GameController(0);
    assert.equal(game.planet.seed, 'PF-STARY');
    assert.equal(game.economy.levels.metalMine, 4);
    assert.equal(game.economy.antimatter, 3);
    assert.equal(game.slotInfo.used, 1);
  });
});
