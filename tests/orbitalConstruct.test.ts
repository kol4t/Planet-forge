// Krok 3b: megakonstrukt wyrzucony na orbitę i ściągnięty na inną planetę z kompletem osad.
import assert from 'node:assert/strict';
import { test } from 'node:test';
import { GameController } from '../src/app/GameController.ts';
import { landingCheck, landingFuel, orbitalState, parseOrbiting } from '../src/core/economy/orbitalConstruct.ts';
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

test('orbita: stany, warunki lądowania, paliwo rośnie z odległością, zapis z walidacją', () => {
  const o = { origin: '1:1:1', readyAt: 100, fuel: 10 };
  assert.equal(orbitalState(o, 50), 'przygotowanie');
  assert.equal(orbitalState(o, 100), 'na_orbicie');
  assert.equal(orbitalState({ ...o, target: '1:1:2', landsAt: 200 }, 150), 'w_locie');
  const osady = { center: [0, 0, 1] as [number, number, number], phase: 'osady' as const };
  assert.match(landingCheck(osady, 39, false)!, /komplecie 4 osad/);
  assert.match(landingCheck({ ...osady, phase: 'konstrukt' }, 40, false)!, /już megakonstrukt/);
  assert.match(landingCheck(osady, 40, true)!, /leci już/);
  assert.equal(landingCheck(osady, 40, false), null);
  assert.ok(landingFuel(80, BALANCE) > landingFuel(0, BALANCE));
  assert.deepEqual(parseOrbiting([{ ...o, target: '1:1:2', landsAt: 300, lifted: true }, { origin: 'x', readyAt: 1, fuel: 1 }, { ...o, target: '1:1:2', landsAt: 5 }]), [
    { ...o, target: '1:1:2', landsAt: 300, lifted: true },
    o,
  ]);
});

/** Planeta startowa z gotowym megakonstruktem i kolonia z kompletem osad (obie po 40 poz. kopalni metalu). */
function twoPlanets() {
  const game = new GameController(0);
  const colony = game.system(game.homeSystem)!.planets.find((p) => p.body === 'rocky' && game.occupantAt(p) === 'free')!.address;
  assert.ok(colonizeNow(game, colony, 0).ok);
  game.economy = { ...game.economy, levels: { ...game.economy.levels, metalMine: 40, powerPlant: 30, storage: 25 }, stock: rich, antimatter: 200 };
  game.colony();
  assert.ok(game.switchPlanet(0, 0).ok);
  game.research = { done: ['metal-factory', 'megastructures'], current: null };
  game.economy = { ...game.economy, levels: { ...game.economy.levels, metalMine: 40, powerPlant: 30, storage: 25 }, stock: rich, antimatter: 200 };
  assert.ok(game.mergeComplex('metalMine', 0).ok);
  assert.ok(game.startMetalConstruct(0).ok);
  const built = 3 * 3600_000;
  game.tick(built);
  assert.equal(game.colony().metalComplex?.phase, 'konstrukt');
  // Magazyn nie pełny — wydobycie widać w przyroście.
  game.economy = { ...game.economy, stock: { metal: 1000, crystal: 1000 } };
  return { game, colony, built };
}

test('orbita: wyrzucenie (30 min bez premii, anulowanie), na orbicie osady zostają, ściągnięcie na komplet osad, lądowanie', () => {
  withMemoryStorage(() => {
    const { game, colony, built } = twoPlanets();
    // Złoża po 3 h budowy przy poz. 40 bywają już wybrane — premię widać w mnożniku budynku (`siteFactor`).
    const withMega = game.economy.siteFactor!.metalMine!;
    const am = game.economy.antimatter;
    const launched = game.launchConstruct(built);
    assert.ok(launched.ok, launched.message);
    assert.ok(game.economy.antimatter <= am - BALANCE.metalComplex.orbit.launchFuel + 0.01);
    assert.ok(game.economy.siteFactor!.metalMine! < withMega, 'w czasie przygotowania bez premii');
    assert.ok(game.orbitView(built).launch.preparing);
    assert.match(game.launchConstruct(built).message, /już przygotowywany/);
    // Anulowanie: premia i paliwo wracają.
    assert.ok(game.cancelLaunch(built + 1000).ok);
    assert.ok(Math.abs(game.economy.siteFactor!.metalMine! - withMega) < 1e-9, 'premia wraca');
    assert.ok(game.launchConstruct(built + 2000).ok);
    const inOrbit = built + 2000 + BALANCE.metalComplex.orbit.prepareSeconds * 1000;
    game.tick(inOrbit + 1);
    assert.equal(game.colony().metalComplex?.phase, 'osady', 'na planecie zostały osady');
    assert.equal(game.economy.levels.metalMine, 40);
    assert.equal(game.orbitingView(inOrbit + 1)[0]!.state, 'na_orbicie');
    assert.equal(game.constructsInOrbitHere(inOrbit + 1), 1);
    assert.equal(deserializeEmpire(localStorage.getItem(EMPIRE_KEY))!.orbiting?.[0]?.lifted, true);
    // Ściągnięcie na kolonię z kompletem osad.
    const index = game.planets().findIndex((p) => p.address === colony);
    assert.ok(game.switchPlanet(index, inOrbit + 2).ok);
    const view = game.orbitView(inOrbit + 2);
    assert.equal(view.landingReason, null, view.landingReason ?? '');
    assert.equal(view.inOrbit.length, 1);
    game.economy = { ...game.economy, antimatter: 200 };
    const landed = game.landConstruct(view.inOrbit[0]!.index, inOrbit + 2);
    assert.ok(landed.ok, landed.message);
    assert.equal(game.orbitView(inOrbit + 2).incoming?.originName.length! > 0, true);
    const arrives = inOrbit + 2 + view.inOrbit[0]!.seconds * 1000;
    game.tick(arrives + 1);
    assert.equal(game.colony().metalComplex?.phase, 'konstrukt', 'na kolonii układ promienisty');
    assert.equal(game.colony().complexes.find((c) => c.building === 'metalMine')?.mega, true);
    assert.equal(game.orbitingView(arrives + 1).length, 0);
    assert.ok(game.journalEntries().some((e) => e.text.startsWith('Megakonstrukt wylądował')));
    // Po wczytaniu: tu konstrukt, na starej planecie osady.
    const fresh = new GameController(arrives + 2);
    assert.equal(fresh.colony().metalComplex?.phase, 'konstrukt');
    assert.ok(fresh.switchPlanet(0, arrives + 2).ok);
    assert.equal(fresh.colony().metalComplex?.phase, 'osady');
  });
});

test('orbita: lądowanie tylko na komplecie osad; cel, który przestał się nadawać — konstrukt wraca na orbitę', () => {
  withMemoryStorage(() => {
    const { game, colony, built } = twoPlanets();
    assert.ok(game.launchConstruct(built).ok);
    const inOrbit = built + BALANCE.metalComplex.orbit.prepareSeconds * 1000 + 1;
    game.tick(inOrbit);
    // Ta sama planeta (osady 40) — może ściągnąć z powrotem; kolonia z poz. 10 — nie.
    const index = game.planets().findIndex((p) => p.address === colony);
    assert.ok(game.switchPlanet(index, inOrbit).ok);
    game.economy = { ...game.economy, levels: { ...game.economy.levels, metalMine: 10 }, antimatter: 200 };
    assert.match(game.landConstruct(game.orbitView(inOrbit).inOrbit[0]!.index, inOrbit).message, /komplecie 4 osad/);
    game.economy = { ...game.economy, levels: { ...game.economy.levels, metalMine: 40 } };
    assert.ok(game.landConstruct(0, inOrbit).ok);
    // W czasie lotu kopalnia celu spada poniżej kompletu osad (zburzenie) — konstrukt wraca na orbitę.
    game.economy = { ...game.economy, levels: { ...game.economy.levels, metalMine: 30 } };
    game.tick(inOrbit + 3600_000);
    const left = game.orbitingView(inOrbit + 3600_000);
    assert.equal(left.length, 1);
    assert.equal(left[0]!.state, 'na_orbicie');
    assert.ok(game.journalEntries().some((e) => e.text.includes('wrócił na orbitę')));
  });
});
