import assert from 'node:assert/strict';
import { test } from 'node:test';
import { GameController, type CompletedBuild } from '../src/app/GameController.ts';
import { isColonizable } from '../src/core/galaxy/galaxy.ts';
import { EMPIRE_KEY } from '../src/core/save/empire.ts';
import { FIELD_GRID_VERSION } from '../src/core/colony/fieldGrid.ts';
import { colonizeNow } from './helpers.ts';

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

/** Wolne planety układu startowego (do kolonizacji w testach). */
function freeAddresses(game: GameController): string[] {
  return game.system(game.homeSystem)!.planets.filter((p) => p.body === 'rocky' && game.occupantAt(p) === 'free').map((p) => p.address);
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
  let seed = '';
  withMemoryStorage(() => {
    const game = new GameController(0);
    assert.ok(colonizeNow(game, freeAddresses(game)[0]!, 0).ok);
    seed = game.planet.seed;
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
    assert.equal(other.planet.seed, seed);
    assert.equal(other.economy.construction?.building, 'metalMine');
    assert.deepEqual(changes, [seed]);
    assert.equal(other.slotInfo.used, 2, 'przeniesione całe imperium (planeta startowa + nowa)');
    const stored = JSON.parse(localStorage.getItem(EMPIRE_KEY)!);
    assert.equal(stored.slots[stored.active].planet.seed, seed, 'od razu zapisane');
    assert.equal(stored.slots[stored.active].planet.address, seed, 'adres w zapisie');
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
    const free = freeAddresses(game);
    for (let i = 0; i < 4; i++) assert.ok(colonizeNow(game, free[i]!, 0).ok);
    assert.equal(game.address, free[3], 'nowa planeta staje się aktywna');
    const full = colonizeNow(game, free[4]!, 0);
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
    colonizeNow(game, freeAddresses(game)[0]!, 0);
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
    colonizeNow(game, freeAddresses(game)[0]!, 0);
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

test('mapa: planeta startowa ma adres w układzie startowym, kolonizacja tylko wolnych planet', () => {
  withMemoryStorage(() => {
    const game = new GameController(0);
    const system = game.system(game.homeSystem)!;
    assert.equal(game.planet.seed, 'KEPLER-186F-ALFA', 'planeta startowa bez zmian');
    assert.match(game.address, /^1:\d+:\d+$/);
    assert.ok(system.planets.some((p) => p.address === game.address && p.occupant === 'home'));
    const others = system.planets.filter((p) => p.occupant === 'home' && p.address !== game.address);
    assert.ok(others.length >= 1, 'co najmniej 2 graczy w układzie');
    assert.equal(game.occupantAt(others[0]!), 'bot');
    assert.match(game.colonize(others[0]!.address, 0).message, /innego gracza/);
    const alien = system.planets.find((p) => p.occupant === 'alien');
    if (alien) assert.equal(game.colonize(alien.address, 0).ok, false);
    const target = freeAddresses(game)[0]!;
    const result = colonizeNow(game, target, 0);
    assert.ok(result.ok, result.message);
    assert.equal(game.planet.seed, target, 'seed = adres');
    assert.ok(game.planet.displayName.startsWith(system.name), game.planet.displayName);
    assert.equal(game.occupantAt(system.planets.find((p) => p.address === target)!), 'you');
    // Inny układ: wymaga badania i statku.
    const elsewhere = game.system(game.homeSystem === 1 ? 2 : 1)!.planets.find(isColonizable);
    if (elsewhere) assert.match(game.colonize(elsewhere.address, 0).message, /statku kolonizacyjnego/);
    // Po wczytaniu nazwa i adres zostają.
    const again = new GameController(1000);
    assert.equal(again.address, target);
    assert.equal(again.planet.displayName, game.planet.displayName);
  });
});

test('mapa: stary zapis kilku planet dostaje adresy w układzie startowym (wygląd bez zmian)', () => {
  withMemoryStorage(() => {
    const economy = { stock: { metal: 1, crystal: 1 }, levels: {}, lastUpdate: 0 };
    localStorage.setItem(
      EMPIRE_KEY,
      JSON.stringify({
        saveVersion: 2,
        active: 1,
        unlockedSlots: 5,
        antimatter: 2,
        slots: [
          { kind: 'planet', planet: { definitionId: 'kepler-186f', seed: 'KEPLER-186F-ALFA', generatorVersion: 1 }, economy },
          { kind: 'planet', planet: { definitionId: 'ice', seed: 'PF-STARA', generatorVersion: 1 }, economy },
        ],
      }),
    );
    const game = new GameController(0);
    const addresses = game.planets().map((p) => p.address);
    assert.equal(new Set(addresses).size, 2);
    assert.ok(addresses.every((a) => a.startsWith(`1:${game.homeSystem}:`)));
    assert.equal(game.planet.seed, 'PF-STARA');
    assert.equal(game.planet.definitionId, 'ice');
  });
});

test('statek kolonizacyjny: wymaga badania, statku z floty i paliwa, leci, zakłada kolonię (także podczas nieobecności); dziennik', () => {
  withMemoryStorage(() => {
    const game = new GameController(0);
    const other = game.galaxy.systems.map((s) => game.system(s.index)!).find((s) => s.index !== game.homeSystem && s.planets.some(isColonizable))!;
    const target = other.planets.find(isColonizable)!.address;
    assert.match(game.sendColonyShip(target, 0).message, /Napęd międzygwiezdny/);
    game.research = { done: ['explore-1'], current: null };
    // Statek leci tylko do zbadanego układu (v0.34.2).
    if (game.discoveryLevel(other.index) < 4) {
      assert.match(game.sendColonyShip(target, 0).message, /nie jest zbadany/);
      game.markDiscovered(other.index, 4);
    }
    assert.ok(game.colonyShipUnlocked);
    game.economy = { ...game.economy, levels: { ...game.economy.levels, storage: 6 }, stock: { metal: 9000, crystal: 9000 }, antimatter: 0 };
    // Paliwo (v0.53): bez antymaterii statek nie startuje; koszt rośnie z odległością, zawrócenie go zwraca.
    const fuel = game.colonyFuelTo(target);
    assert.ok(fuel > game.balance.fuel.colonyShip.inSystem, 'lot do innego układu droższy niż w układzie');
    assert.match(game.sendColonyShip(target, 0).message, /paliwa/);
    game.economy = { ...game.economy, antimatter: fuel + 2 };
    const sent = game.sendColonyShip(target, 0);
    assert.ok(sent.ok, sent.message);
    // v0.58: statek z floty (startowy), bez kosztu surowców przy starcie.
    assert.equal(game.economy.stock.metal, 9000);
    assert.equal(game.economy.antimatter, 2);
    assert.equal(game.fleetView(0).ships.find((s) => s.type === 'colonyShip')!.docked, 0);
    assert.match(game.sendColonyShip(target, 0).message, /już leci/);
    const [mission] = game.missionsView(0);
    assert.ok(mission && mission.secondsLeft > 60, 'lot trwa');
    // Zawrócenie zwraca koszt; ponowne wysłanie.
    assert.ok(game.cancelMission(target, 1000).ok);
    assert.equal(game.missionsView(1000).length, 0);
    assert.ok(Math.abs(game.economy.antimatter - (fuel + 2)) < 0.01, 'paliwo zwrócone');
    assert.equal(game.fleetView(1000).ships.find((s) => s.type === 'colonyShip')!.docked, 1, 'statek wrócił do floty');
    assert.ok(game.sendColonyShip(target, 1000).ok);
    const arrivesAt = game.missionsView(1000)[0]!.arrivesAt;
    game.save();
    // Przylot podczas nieobecności: kolonia jest, gracz zostaje na swojej planecie.
    const later = new GameController(arrivesAt + 1000);
    assert.equal(later.slotInfo.used, 2);
    assert.equal(later.slotAt(target), 1);
    assert.equal(later.address, game.address);
    assert.equal(later.arrivedWhileAway.length, 1);
    const texts = later.journalEntries().map((e) => e.text);
    assert.ok(texts.some((t) => t.startsWith('Statek dotarł')), texts.join(' | '));
    assert.ok(texts.some((t) => t.startsWith('Statek kolonizacyjny wyruszył')));
    // Na żywo: zdarzenie przylotu.
    const arrivals: string[] = [];
    game.onColonyArrived((name) => arrivals.push(name));
    game.tick(arrivesAt);
    assert.equal(arrivals.length, 1);
  });
});

test('imperium: zestawienie planet liczy nieaktywne „na teraz”, dziennik zapisuje budowy i kolonie', () => {
  withMemoryStorage(() => {
    const game = new GameController(0);
    game.upgrade('metalMine', 0);
    colonizeNow(game, freeAddresses(game)[0]!, 0);
    const view = game.overview(10 * 60_000);
    assert.equal(view.length, 2);
    const first = view[0]!;
    assert.equal(first.active, false);
    assert.ok(first.stock.metal > 0 && first.rates.metal > 0);
    assert.equal(first.construction, null, 'budowa skończona w czasie nieobecności');
    game.switchPlanet(0, 10 * 60_000);
    const texts = game.journalEntries().map((e) => e.text);
    assert.ok(texts.some((t) => t.includes('Kopalnia metalu — poziom 2 gotowy')), texts.join(' | '));
    assert.ok(texts.some((t) => t.includes('skolonizowano')), texts.join(' | '));
  });
});

test('przydział pól z innej wersji siatki jest odrzucany — budowle dostają pola od nowa (v0.26.3)', () => {
  withMemoryStorage(() => {
    const game = new GameController(0);
    game.save();
    const { grid, plots } = game.colony();
    const own = plots.metalMine![0]!;
    const far = grid.cells.map((c, i) => (c.kind === 'land' && i !== own ? i : -1)).filter((i) => i >= 0).pop()!;
    const plant = (version: number | undefined) => {
      const data = JSON.parse(localStorage.getItem(EMPIRE_KEY)!);
      data.slots[0].plots = { ...data.slots[0].plots, metalMine: [far] };
      if (version === undefined) delete data.slots[0].plotsGrid;
      else data.slots[0].plotsGrid = version;
      localStorage.setItem(EMPIRE_KEY, JSON.stringify(data));
      return new GameController(0).colony().plots.metalMine![0];
    };
    assert.equal(plant(FIELD_GRID_VERSION), far, 'ta sama wersja — przydział zostaje');
    assert.equal(plant(undefined), own, 'zapis sprzed v0.26.3 — przydział od nowa');
  });
});

test('energia gwiazdy (v0.44): kolektor zasila wszystkie planety gracza w układzie, działa od ukończenia, zapis', async () => {
  const { collectorOutput, starFactor, collectorCost } = await import('../src/core/economy/starEnergy.ts');
  const { BALANCE } = await import('../src/data/balance.ts');
  assert.equal(starFactor(1), 1);
  assert.ok(starFactor(3.2) > 2 && starFactor(0.35) < 0.7, 'jaśniejsza gwiazda — więcej energii');
  assert.equal(collectorOutput(0, BALANCE, 1), 0);
  assert.ok(collectorOutput(10, BALANCE, 1) > collectorOutput(9, BALANCE, 1));
  withMemoryStorage(() => {
    const game = new GameController(0);
    assert.ok(colonizeNow(game, freeAddresses(game)[0]!, 0).ok);
    assert.ok(game.switchPlanet(0, 0).ok);
    game.economy = { ...game.economy, stock: { metal: 5000, crystal: 5000 }, levels: { ...game.economy.levels, storage: 5 } };
    assert.equal(game.upgradeStarCollector(0).ok, false, 'bez badania');
    game.research = { done: ['star-energy'], current: null };
    const view = game.collectorView(0);
    assert.equal(view.planets, 2);
    const before = game.rates.energyProduced;
    assert.ok(game.upgradeStarCollector(0).ok);
    assert.equal(game.economy.stock.metal, 5000 - collectorCost(1, BALANCE).metal);
    assert.equal(game.rates.energyProduced, before, 'w budowie — jeszcze bez energii');
    const ready = BALANCE.starCollector.secondsPerLevel * 1000;
    game.tick(ready + 1);
    assert.ok(Math.abs(game.rates.energyProduced - before - view.nextOutput) < 1e-6, `+${view.nextOutput} energii`);
    assert.ok(game.journalEntries().some((e) => e.text.includes('kolektor energii gwiazdy — poziom 1 gotowy')));
    // Druga planeta układu też dostaje energię gwiazdy.
    assert.ok(game.switchPlanet(1, ready + 2).ok);
    assert.ok(game.collectorView(ready + 2).systemEnergy > 0);
    assert.ok(Math.abs((game.balance.extraEnergy ?? 0) - view.nextOutput) < 1e-6, 'energia gwiazdy w produkcji drugiej planety');
    assert.equal(game.collectorView(ready + 2).target, 0, 'kolektor stoi przy pierwszej planecie');
    // Zapis i wczytanie.
    const again = new GameController(ready + 3);
    assert.ok(again.switchPlanet(0, ready + 3).ok);
    assert.equal(again.collectorView(ready + 3).level, 1);
  });
});

test('nieudany zapis (pełna pamięć): komunikat raz, ponownie dopiero po udanym zapisie (audyt v0.46)', () => {
  withMemoryStorage(() => {
    const game = new GameController(0);
    let calls = 0;
    game.onSaveFailed(() => calls++);
    const storage = globalThis.localStorage as unknown as { setItem: (k: string, v: string) => void };
    const ok = storage.setItem;
    storage.setItem = () => {
      throw new Error('QuotaExceededError');
    };
    assert.equal(game.save(), false);
    assert.equal(game.save(), false);
    assert.equal(calls, 1);
    storage.setItem = ok;
    assert.equal(game.save(), true);
    storage.setItem = () => {
      throw new Error('QuotaExceededError');
    };
    game.save();
    assert.equal(calls, 2);
  });
});

test('uszkodzony zapis: gra zaczyna od nowa, zgłasza to i nie nadpisuje kopii (audyt v0.46)', () => {
  withMemoryStorage(() => {
    globalThis.localStorage.setItem(EMPIRE_KEY, '{"saveVersion":1,"slots":"zepsute"}');
    const game = new GameController(0);
    assert.equal(game.brokenSaveFound, true);
    game.save();
    assert.equal(globalThis.localStorage.getItem('planet-forge.empire.broken'), '{"saveVersion":1,"slots":"zepsute"}');
  });
});
