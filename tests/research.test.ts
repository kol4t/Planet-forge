import assert from 'node:assert/strict';
import { test } from 'node:test';
import { GameController } from '../src/app/GameController.ts';
import { createEconomy, productionRates, storageCapacity } from '../src/core/economy/economy.ts';
import { generatePlanet } from '../src/core/generation/generatePlanet.ts';
import {
  applyResearch,
  completeResearch,
  EMPTY_RESEARCH,
  parseResearch,
  researchCost,
  researchSeconds,
  researchStatus,
  ringLimit,
  startResearch,
} from '../src/core/research/research.ts';
import { isColonizable } from '../src/core/galaxy/galaxy.ts';
import { deserializeEmpire, EMPIRE_KEY, serializeEmpire } from '../src/core/save/empire.ts';
import type { EconomyState } from '../src/core/types.ts';
import { BALANCE } from '../src/data/balance.ts';
import { findDefinition, STARTER } from '../src/data/planets.ts';
import { findArm, findResearch, RESEARCH_ARMS, RESEARCH_NODES } from '../src/data/research.ts';
import { galaxyLayout, GALAXY_RADIUS, hitTest } from '../src/game/ui/galaxy.ts';

const planet = generatePlanet(STARTER.definition, STARTER.seed);
const rich = (economy: EconomyState): EconomyState => ({
  ...economy,
  stock: { metal: 900, crystal: 900 },
  antimatter: 50,
});
const node = (id: string) => findResearch(id)!;

test('dane badań: unikalne id, wymagania istnieją i leżą bliżej jądra', () => {
  const ids = new Set<string>();
  for (const n of RESEARCH_NODES) {
    assert.ok(!ids.has(n.id), n.id);
    ids.add(n.id);
    assert.ok(findArm(n.arm), n.id);
    assert.ok(n.ring >= 1 && n.ring <= 6, n.id);
    for (const r of n.requires) {
      assert.ok(findResearch(r), `${n.id} → ${r}`);
      assert.ok(findResearch(r)!.ring < n.ring, `${n.id} → ${r}`);
    }
    if (!n.master && !n.soon && findArm(n.arm)!.active) assert.ok(n.effects.length > 0, `${n.id}: brak efektu`);
  }
  assert.equal(RESEARCH_ARMS.length, 6);
  assert.deepEqual(RESEARCH_ARMS.filter((a) => a.active).map((a) => a.id), ['productivity', 'planetology', 'exploration', 'ai']);
});

test('Laboratorium ogranicza pierścień: brak = nic, poz. 1 = pierścień 1, poz. 8 = 5', () => {
  assert.equal(ringLimit(0), 0);
  assert.equal(ringLimit(1), 1);
  assert.equal(ringLimit(3), 2);
  assert.equal(ringLimit(8), 5);
  assert.equal(researchStatus(node('prod-core'), EMPTY_RESEARCH, 0), 'needs-lab');
  assert.equal(researchStatus(node('prod-core'), EMPTY_RESEARCH, 1), 'available');
  assert.equal(researchStatus(node('mining-1'), EMPTY_RESEARCH, 5), 'needs-research');
  assert.equal(researchStatus(node('mining-1'), { done: ['prod-core'], current: null }, 1), 'needs-lab');
  assert.equal(researchStatus(node('explore-2'), { done: ['explore-1'], current: null }, 10), 'soon');
  assert.equal(researchStatus(node('explore-1'), EMPTY_RESEARCH, 1), 'available');
  assert.equal(researchStatus(node('prod-master'), EMPTY_RESEARCH, 10), 'soon');
});

test('koszt rośnie z pierścieniem i z liczbą zbadanych; antymateria od pierścienia 4', () => {
  const a = researchCost(node('prod-core'), 0);
  const b = researchCost(node('mining-1'), 0);
  assert.ok(b.metal > a.metal && b.crystal > a.crystal);
  assert.ok(researchCost(node('mining-1'), 5).metal > b.metal);
  assert.equal(a.antimatter, 0);
  assert.ok(researchCost(node('mining-3'), 0).antimatter > 0);
  assert.ok(researchSeconds(node('prod-core'), 5) < researchSeconds(node('prod-core'), 1), 'wyższe Laboratorium bada szybciej');
});

test('start badania: pobiera koszt, jedno naraz, błędy po polsku; ukończenie po czasie', () => {
  const economy = rich(createEconomy(0));
  const r = startResearch(EMPTY_RESEARCH, economy, 'prod-core', 1, 'SEED', 0);
  assert.ok(r.ok);
  const cost = researchCost(node('prod-core'), 0);
  assert.equal(r.economy.stock.metal, 900 - cost.metal);
  const busy = startResearch(r.research, r.economy, 'planet-1', 1, 'SEED', 0);
  assert.ok(!busy.ok && busy.reason === 'busy' && /dokończ/.test(busy.message));
  const poor = startResearch(EMPTY_RESEARCH, createEconomy(0), 'planet-1', 1, 'SEED', 0);
  assert.ok(!poor.ok && poor.reason === 'not-enough-resources' && /Brakuje/.test(poor.message));
  const noLab = startResearch(EMPTY_RESEARCH, economy, 'prod-core', 0, 'SEED', 0);
  assert.ok(!noLab.ok && /Laboratorium/.test(noLab.message));
  const finishesAt = r.research.current!.finishesAt;
  assert.equal(completeResearch(r.research, finishesAt - 1).completed, null);
  const done = completeResearch(r.research, finishesAt);
  assert.equal(done.completed, 'prod-core');
  assert.deepEqual(done.research, { done: ['prod-core'], current: null });
});

test('efekty badań zmieniają balans gry', () => {
  const economy = { ...createEconomy(0), levels: { ...createEconomy(0).levels, powerPlant: 5 } };
  const before = productionRates(economy, planet);
  const after = productionRates(economy, planet, applyResearch(BALANCE, ['prod-core', 'mining-1']));
  assert.ok(after.metal > before.metal && after.crystal > before.crystal);
  const b = applyResearch(BALANCE, ['eng-1', 'log-1', 'log-2', 'am-4', 'planet-3']);
  assert.ok(b.buildSecondsPerLevel < BALANCE.buildSecondsPerLevel);
  assert.ok(storageCapacity(economy, b) > storageCapacity(economy));
  assert.equal(b.maxOfflineSeconds, BALANCE.maxOfflineSeconds + 4 * 3600);
  assert.equal(b.freeFinishMaxLevel, BALANCE.freeFinishMaxLevel + 2);
  assert.equal(b.planetSlots.base, BALANCE.planetSlots.base + 1);
  assert.equal(applyResearch(BALANCE, []), BALANCE, 'bez badań — ten sam balans');
});

test('Planetologia łagodzi kary środowiska (premie zostają)', () => {
  const penalized = findDefinition('arid') ?? STARTER.definition;
  for (let i = 0; i < 40; i++) {
    const p = generatePlanet(penalized, `ENV-${i}`);
    const effects = p.gameplay.environment.effects;
    const bad = (['metal', 'crystal', 'energy'] as const).find((id) => (effects[id] ?? 1) < 1);
    if (!bad) continue;
    const economy = { ...createEconomy(0), levels: { ...createEconomy(0).levels, powerPlant: 6 } };
    const base = productionRates(economy, p);
    const half = productionRates(economy, p, applyResearch(BALANCE, ['planet-1', 'planet-2']));
    const none = applyResearch(BALANCE, ['planet-2', 'planet-5']);
    assert.equal(none.environmentPenalty, 0);
    const key = bad === 'energy' ? 'energyProduced' : bad;
    assert.ok(half[key] > base[key], `${bad}: ${base[key]} → ${half[key]}`);
    return;
  }
  assert.fail('brak planety z karą środowiska w próbce');
});

test('zapis: badania przechodzą przez zapis; stare zapisy = nic nie zbadano; śmieci odrzucone', () => {
  const research = {
    done: ['prod-core', 'planet-1'],
    current: { id: 'eng-1', startedAt: 1, finishesAt: 2, cost: { metal: 3, crystal: 4 }, antimatter: 0, paidBy: 'X' },
  };
  const slot = { kind: 'planet' as const, planet: { definitionId: STARTER.definition.id, seed: STARTER.seed, generatorVersion: 1 }, economy: createEconomy(0) };
  const raw = serializeEmpire({ active: 0, unlockedSlots: 5, antimatter: 1, slots: [slot], research });
  assert.deepEqual(deserializeEmpire(raw)?.research, research);
  const old = JSON.parse(raw);
  delete old.research;
  assert.deepEqual(deserializeEmpire(JSON.stringify(old))?.research, EMPTY_RESEARCH);
  assert.deepEqual(parseResearch({ done: ['nie-ma', 'prod-core', 'prod-core', 7], current: { id: 'eng-1' } }), {
    done: ['prod-core'],
    current: null,
  });
});

/** Prosta pamięć zamiast localStorage przeglądarki. */
function withMemoryStorage(run: () => void): void {
  const store = new Map<string, string>();
  const original = Object.getOwnPropertyDescriptor(globalThis, 'localStorage');
  Object.defineProperty(globalThis, 'localStorage', {
    configurable: true,
    value: { getItem: (k: string) => store.get(k) ?? null, setItem: (k: string, v: string) => void store.set(k, v) },
  });
  try {
    run();
  } finally {
    if (original) Object.defineProperty(globalThis, 'localStorage', original);
    else delete (globalThis as { localStorage?: unknown }).localStorage;
  }
}

test('kontroler: Laboratorium → badanie → ukończenie (także po wczytaniu), anulowanie zwraca koszt', () => {
  withMemoryStorage(() => {
    const game = new GameController(0);
    assert.equal(game.labLevel, 0);
    assert.ok(!game.startResearch('prod-core', 0).ok);
    game.economy = { ...game.economy, stock: { metal: 950, crystal: 950 } };
    assert.ok(game.upgrade('laboratory', 0).ok);
    game.tick(31_000);
    assert.equal(game.labLevel, 1);
    const stock = { ...game.economy.stock };
    assert.ok(game.startResearch('prod-core', 31_000).ok);
    assert.ok(game.economy.stock.metal < stock.metal);
    const cancelled = game.cancelResearch(32_000);
    assert.ok(cancelled.ok && /zwrócono/.test(cancelled.message));
    assert.ok(game.economy.stock.metal >= stock.metal);

    const done: string[] = [];
    game.onResearchComplete((id) => done.push(id));
    assert.ok(game.startResearch('prod-core', 33_000).ok);
    const finishesAt = game.research.current!.finishesAt;
    game.save();
    // Wczytanie po czasie: badanie ukończone „podczas nieobecności”.
    const later = new GameController(finishesAt + 60_000);
    assert.deepEqual(later.research.done, ['prod-core']);
    assert.deepEqual(later.researchedWhileAway, ['prod-core']);
    game.tick(finishesAt);
    assert.deepEqual(done, ['prod-core']);
    assert.deepEqual(JSON.parse(localStorage.getItem(EMPIRE_KEY)!).slots[0].research.done, ['prod-core'], 'badania przy planecie');
    assert.ok(game.rates.metal > productionRates(game.economy, game.planet).metal, 'efekt działa od razu');
  });
});

test('kontroler: Osadnictwo daje 6. miejsce na planetę, które przetrwa zapis', () => {
  withMemoryStorage(() => {
    const game = new GameController(0);
    game.research = { done: ['planet-1', 'planet-2', 'planet-3'], current: null };
    assert.equal(game.slotInfo.unlocked, 6);
    const free = game.system(game.homeSystem)!.planets.filter(isColonizable).map((p) => p.address);
    assert.ok(free.length >= 5, `wolnych planet w układzie startowym: ${free.length}`);
    for (let i = 0; i < 5; i++) assert.ok(game.colonize(free[i]!, 0).ok, `planeta ${i + 2}`);
    assert.equal(game.slotInfo.used, 6);
    const loaded = new GameController(1000);
    assert.equal(loaded.slotInfo.used, 6);
  });
});

test('galaktyka: gwiazdy nie nachodzą na siebie i mieszczą się w promieniu; dotknięcie trafia w gwiazdę', () => {
  const positions = galaxyLayout(RESEARCH_ARMS, RESEARCH_NODES);
  assert.equal(positions.size, RESEARCH_NODES.length);
  const list = [...positions.entries()];
  for (let i = 0; i < list.length; i++) {
    const [id, p] = list[i]!;
    assert.ok(Math.hypot(p.x, p.y) < GALAXY_RADIUS - 0.5, id);
    assert.ok(Math.hypot(p.x, p.y) > 1, `${id}: za blisko jądra`);
    for (let j = i + 1; j < list.length; j++) {
      const [other, q] = list[j]!;
      assert.ok(Math.hypot(p.x - q.x, p.y - q.y) >= 0.7, `${id} ↔ ${other}`);
    }
  }
  const core = positions.get('prod-core')!;
  assert.equal(hitTest(positions, core.x + 0.1, core.y, 0.4), 'prod-core');
  assert.equal(hitTest(positions, 0, 0, 0.4), null);
});

test('badania przypisane do planety: efekty tylko tam; odblokowania (statek, SI, miejsca) dla całego imperium; stary zapis → wszystkie planety', () => {
  withMemoryStorage(() => {
    const game = new GameController(0);
    game.research = { done: ['prod-core', 'explore-1'], current: null };
    const metalHere = game.rates.metal;
    const free = game.system(game.homeSystem)!.planets.filter(isColonizable).map((p) => p.address);
    assert.ok(game.colonize(free[0]!, 0).ok);
    assert.deepEqual(game.research.done, [], 'nowa kolonia bada od zera');
    assert.ok(game.colonyShipUnlocked, 'statek odblokowany badaniem innej planety');
    game.switchPlanet(0, 0);
    assert.equal(game.rates.metal, metalHere, 'efekt na planecie, która zbadała');
  });
  withMemoryStorage(() => {
    const economy = { stock: { metal: 1, crystal: 1 }, levels: {}, lastUpdate: 0 };
    const planet = (seed: string, def = 'ice') => ({ kind: 'planet', planet: { definitionId: def, seed, generatorVersion: 1 }, economy });
    localStorage.setItem(
      EMPIRE_KEY,
      JSON.stringify({
        saveVersion: 2,
        active: 0,
        unlockedSlots: 5,
        antimatter: 1,
        slots: [planet('KEPLER-186F-ALFA', 'kepler-186f'), planet('PF-B')],
        research: {
          done: ['prod-core'],
          current: { id: 'planet-1', startedAt: 0, finishesAt: 9e12, cost: { metal: 1, crystal: 1 }, antimatter: 0, paidBy: 'PF-B' },
        },
      }),
    );
    const game = new GameController(1000);
    assert.deepEqual(game.research.done, ['prod-core']);
    assert.equal(game.research.current?.id, undefined, 'trwające badanie zostaje przy planecie, która płaciła');
    game.switchPlanet(1, 1000);
    assert.deepEqual(game.research.done, ['prod-core']);
    assert.equal(game.research.current?.id, 'planet-1');
  });
});

test('badania bez podwójnych efektów: ponowne ukończenie i powtórzony wpis nie dublują premii; zbadane nie da się zacząć', () => {
  const economy = rich(createEconomy(0));
  const r = startResearch(EMPTY_RESEARCH, economy, 'prod-core', 1, 'SEED', 0);
  assert.ok(r.ok);
  const done = completeResearch(r.research, r.research.current!.finishesAt).research;
  // Drugie ukończenie nic nie robi (brak trwającego badania).
  assert.deepEqual(completeResearch(done, Number.MAX_SAFE_INTEGER).research, done);
  const again = startResearch(done, economy, 'prod-core', 1, 'SEED', 0);
  assert.ok(!again.ok && again.reason === 'done');
  // Nawet gdyby badanie trafiło na listę dwa razy, efekt liczy się raz.
  const once = applyResearch(BALANCE, ['prod-core']);
  const twice = applyResearch(BALANCE, ['prod-core', 'prod-core']);
  assert.deepEqual(twice.buildings.map((b) => b.baseOutput), once.buildings.map((b) => b.baseOutput));
});
