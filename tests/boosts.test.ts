import assert from 'node:assert/strict';
import test from 'node:test';
import { BOOSTS, betterBoost, boostFactor, boostOutcome, buyBoost, findBoost, outageBoost, parseBoosts } from '../src/core/station/boosts.ts';
import { merchantVisit } from '../src/core/station/merchants.ts';
import { deserializeEmpire, EMPIRE_KEY } from '../src/core/save/empire.ts';
import { GameController } from '../src/app/GameController.ts';

const levels = { metalMine: 10, crystalMine: 8, powerPlant: 10, storage: 3, antimatterCollector: 0, laboratory: 1 };
const ctx = { address: '1:1:1', building: 'metalMine' as const, levels, antimatter: 100, now: 0, roll: 0.5, pick: 0 };

test('wzmocnienia: zakup — budynek wydobycia, kopalnie, antymateria; planeta losuje cel wśród stojących', () => {
  const ign = findBoost('ignition')!;
  assert.ok(buyBoost(ign, ctx).ok);
  assert.match((buyBoost(ign, { ...ctx, building: 'storage' as never }) as { message: string }).message, /wydobycia/);
  assert.match((buyBoost(ign, { ...ctx, building: 'antimatterCollector' as never }) as { message: string }).message, /nie stoi/);
  assert.match((buyBoost(findBoost('deep-pull')!, { ...ctx, building: 'powerPlant' as never }) as { message: string }).message, /kopalnie/);
  assert.match((buyBoost(ign, { ...ctx, antimatter: 1 }) as { message: string }).message, /antymaterii/);
  const storm = buyBoost(findBoost('storm')!, { ...ctx, building: null, pick: 0.99 });
  assert.ok(storm.ok);
  assert.equal(storm.boost.building, null);
  assert.equal(storm.boost.target, 'powerPlant', 'kolektor nie stoi — losowanie wśród stojących');
  // Każde wzmocnienie z ryzykiem daje więcej niż bezpieczne (adekwatna nagroda).
  const safe = findBoost('steady')!.factor;
  for (const b of BOOSTS) if (b.risk && b.scope === 'building') assert.ok(b.factor > safe);
});

test('wzmocnienia: mnożniki się mnożą, planeta obejmuje budynki wydobycia, awaria zeruje', () => {
  const a = (buyBoost(findBoost('overdrive')!, ctx) as { boost: any }).boost;
  const p = (buyBoost(findBoost('surge')!, { ...ctx, building: null }) as { boost: any }).boost;
  const list = [a, p];
  assert.equal(boostFactor(list, '1:1:1', 'metalMine', 1000), 1.8 * 1.4);
  assert.equal(boostFactor(list, '1:1:1', 'crystalMine', 1000), 1.4);
  assert.equal(boostFactor(list, '1:1:1', 'storage', 1000), 1);
  assert.equal(boostFactor(list, '1:1:2', 'metalMine', 1000), 1, 'inna planeta');
  assert.equal(boostFactor(list, '1:1:1', 'metalMine', 2 * 3600_000), 1.4, 'przeciążenie skończone');
  assert.equal(boostFactor([...list, outageBoost('1:1:1', 'metalMine', 0, 1)], '1:1:1', 'metalMine', 1000), 0);
});

test('wzmocnienia: skutek po końcu — z wylosowanej liczby; kupiecka wersja mocniejsza i bez ryzyka', () => {
  const crit = findBoost('critical')!;
  const lucky = (buyBoost(crit, { ...ctx, roll: 0.5 }) as { boost: any }).boost;
  assert.equal(boostOutcome(lucky).kind, 'none');
  const worst = (buyBoost(crit, { ...ctx, roll: 0 }) as { boost: any }).boost;
  assert.deepEqual(boostOutcome(worst), { kind: 'levels', building: 'metalMine', amount: 3 });
  const mild = (buyBoost(crit, { ...ctx, roll: crit.risk!.chance * 0.99 }) as { boost: any }).boost;
  assert.equal(boostOutcome(mild).amount, 1);
  const better = betterBoost(crit);
  assert.equal(better.risk, null);
  assert.ok(better.factor > crit.factor && better.antimatter > crit.antimatter);
  // Kupcy czasem przywożą wzmocnienie.
  assert.ok(Array.from({ length: 40 }, (_, i) => merchantVisit(i, 1).boost).some((b) => b && findBoost(b)));
});

test('wzmocnienia: zapis z walidacją', () => {
  const ok = (buyBoost(findBoost('overdrive')!, ctx) as { boost: any }).boost;
  assert.deepEqual(parseBoosts([ok, { def: 'x' }, null, { ...ok, factor: -1 }]), [ok]);
  assert.deepEqual(parseBoosts('nie'), []);
});

function withMemoryStorage(run: () => void): void {
  const store = new Map<string, string>();
  const original = Object.getOwnPropertyDescriptor(globalThis, 'localStorage');
  Object.defineProperty(globalThis, 'localStorage', { configurable: true, value: { getItem: (k: string) => store.get(k) ?? null, setItem: (k: string, v: string) => void store.set(k, v), removeItem: (k: string) => void store.delete(k) } });
  try {
    run();
  } finally {
    if (original) Object.defineProperty(globalThis, 'localStorage', original);
    else delete (globalThis as { localStorage?: unknown }).localStorage;
  }
}

function game(now: number): GameController {
  const c = new GameController(now);
  (c as unknown as { station: unknown }).station = { address: c.address, core: { level: 1, readyAt: 0 }, storage: { level: 5, readyAt: 0 }, dock: { level: 1, readyAt: 0 }, stock: { metal: 0, crystal: 0 }, research: { done: ['st-merchants', 'st-trade-dock'], current: null } };
  c.economy = { ...c.economy, levels: { ...c.economy.levels, metalMine: 12, powerPlant: 14 }, antimatter: 200 };
  return c;
}

test('wzmocnienia w grze: zakup podnosi wydobycie, po końcu wraca; skutek ryzyka zabiera poziomy; zapis', () => {
  withMemoryStorage(() => {
    const now = 10_000;
    const c = game(now);
    const before = c.rates.metal;
    const r = c.buyBoost('steady', c.address, 'metalMine', now);
    assert.ok(r.ok, r.message);
    assert.equal(c.economy.antimatter, 200 - findBoost('steady')!.antimatter);
    assert.ok(c.rates.metal > before * 1.1, 'wydobycie wyższe');
    assert.equal(c.boostsView(now).active.length, 1);
    assert.equal(deserializeEmpire(localStorage.getItem(EMPIRE_KEY))!.boosts?.length, 1);
    const end = now + 4 * 3600_000 + 1;
    c.tick(end);
    assert.ok(Math.abs(c.rates.metal - before) < 1e-6, 'po końcu jak przed');
    assert.equal(c.boostsView(end).active.length, 0);
    // Ryzyko, które się spełnia: wymuszony los.
    const real = Math.random;
    Math.random = () => 0;
    try {
      assert.ok(c.buyBoost('critical', c.address, 'metalMine', end).ok);
    } finally {
      Math.random = real;
    }
    c.tick(end + 2 * 3600_000 + 1);
    assert.equal(c.economy.levels.metalMine, 9, 'najgorszy los: −3 poziomy');
    // Budynek w budowie — osłona: awaria zamiast utraty poziomów.
    Math.random = () => 0;
    try {
      assert.ok(c.buyBoost('ignition', c.address, 'powerPlant', end + 2 * 3600_000 + 2).ok);
    } finally {
      Math.random = real;
    }
    c.economy = { ...c.economy, construction: { building: 'powerPlant', targetLevel: 15, startedAt: 0, finishesAt: 1e15, cost: { metal: 0, crystal: 0 } } as never };
    const t = end + 3 * 3600_000 + 3;
    c.tick(t);
    assert.equal(c.economy.levels.powerPlant, 14);
    assert.ok(c.boostsView(t).active.some((a) => a.outage), 'awaria');
  });
});
