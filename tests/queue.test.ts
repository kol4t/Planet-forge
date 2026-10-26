import assert from 'node:assert/strict';
import { test } from 'node:test';
import { suggest } from '../src/core/ai/advisor.ts';
import {
  advance,
  buildSeconds,
  createEconomy,
  enqueueBuilding,
  plannedLevels,
  removeQueued,
  startQueued,
  upgradeBuilding,
  upgradeCost,
} from '../src/core/economy/economy.ts';
import { generatePlanet } from '../src/core/generation/generatePlanet.ts';
import { applyResearch, describeEffects, EMPTY_RESEARCH } from '../src/core/research/research.ts';
import { deserialize, serialize } from '../src/core/save/save.ts';
import type { EconomyState } from '../src/core/types.ts';
import { BALANCE } from '../src/data/balance.ts';
import { STARTER } from '../src/data/planets.ts';
import { findResearch } from '../src/data/research.ts';

const planet = generatePlanet(STARTER.definition, STARTER.seed);
const S = 1000;
const rich = (): EconomyState => ({ ...createEconomy(0), stock: { metal: 5000, crystal: 5000 } });
const building = (e: EconomyState): EconomyState => {
  const r = upgradeBuilding(e, 'metalMine', 0);
  assert.ok(r.ok);
  return r.state;
};

test('kolejka: 1 miejsce na start, dopisanie nic nie pobiera, drugie się nie mieści', () => {
  assert.equal(BALANCE.buildQueue, 1);
  const busy = building(rich());
  const q = enqueueBuilding(busy, 'crystalMine');
  assert.ok(q.ok, q.message);
  assert.deepEqual(q.state.queue, ['crystalMine']);
  assert.deepEqual(q.state.stock, busy.stock, 'koszt dopiero przy starcie');
  const full = enqueueBuilding(q.state, 'powerPlant');
  assert.equal(full.ok, false);
  assert.equal(!full.ok && full.reason, 'queue-full');
  assert.match(full.message, /Kolejka pełna/);
});

test('kolejka: badania SI dodają miejsca', () => {
  const one = applyResearch(BALANCE, ['ai-1', 'ai-queue-1']);
  assert.equal(one.buildQueue, 2);
  assert.equal(applyResearch(BALANCE, ['ai-1', 'ai-queue-1', 'ai-queue-2']).buildQueue, 3);
  assert.equal(findResearch('ai-queue-1')?.arm, 'ai');
  assert.match(describeEffects(findResearch('ai-queue-1')!), /kolejce budowy/);
  let s = enqueueBuilding(building(rich()), 'crystalMine', one).state;
  const second = enqueueBuilding(s, 'powerPlant', one);
  assert.ok(second.ok);
  s = second.state;
  assert.equal(enqueueBuilding(s, 'storage', one).ok, false);
});

test('kolejka: ten sam budynek kilka razy — poziomy liczone po kolei', () => {
  const balance = { ...BALANCE, buildQueue: 3 };
  let s = building(rich());
  for (let i = 0; i < 2; i++) s = enqueueBuilding(s, 'metalMine', balance).state;
  assert.deepEqual(s.queue, ['metalMine', 'metalMine']);
  assert.equal(plannedLevels(s).metalMine, 4);
  const done = advance(s, planet, 3600 * S, balance);
  assert.equal(done.levels.metalMine, 4);
  assert.equal(done.queue, undefined);
  assert.equal(done.construction, null);
});

test('kolejka: następna budowa rusza w chwili ukończenia poprzedniej, koszt pobrany wtedy', () => {
  const busy = building(rich());
  const finish = busy.construction!.finishesAt;
  const s = enqueueBuilding(busy, 'crystalMine').state;
  const before = advance(s, planet, finish - S);
  assert.equal(before.construction?.building, 'metalMine');
  const after = advance(s, planet, finish + 5 * S);
  assert.equal(after.levels.metalMine, 2);
  assert.equal(after.construction?.building, 'crystalMine');
  assert.equal(after.construction?.startedAt, finish);
  assert.equal(after.construction?.finishesAt, finish + buildSeconds(2) * S);
  assert.equal(after.queue, undefined);
  // Zapas = to, co było w chwili ukończenia − koszt kryształów poz. 2 + produkcja 5 s.
  const atFinish = advance({ ...busy }, planet, finish);
  const cost = upgradeCost('crystalMine', 1);
  assert.ok(after.stock.crystal < atFinish.stock.crystal - cost.crystal + 1);
});

test('kolejka: przy braku surowców czeka i rusza, gdy produkcja je uzbiera', () => {
  const poor: EconomyState = { ...createEconomy(0), stock: upgradeCost('metalMine', 1) };
  let s = upgradeBuilding(poor, 'metalMine', 0).state;
  assert.deepEqual(s.stock, { metal: 0, crystal: 0 });
  s = enqueueBuilding(s, 'storage').state;
  const finish = s.construction!.finishesAt;
  const waiting = advance(s, planet, finish + S);
  assert.equal(waiting.construction, null, 'za mało surowców — czeka');
  assert.deepEqual(waiting.queue, ['storage']);
  // Po dłuższym czasie produkcja uzbiera koszt — start dokładnie wtedy, gdy stać (nie wcześniej).
  const end = finish + 3 * 3600 * S;
  const later = advance(s, planet, end);
  assert.equal(later.queue, undefined);
  assert.equal(later.levels.storage, 2);
  // Gra na bieżąco (co minutę) daje to samo co nadrobienie naraz.
  let step = s;
  for (let t = 60 * S; t < end; t += 60 * S) {
    step = advance(step, planet, t);
    assert.ok(step.stock.metal >= 0 && step.stock.crystal >= 0);
  }
  step = advance(step, planet, end);
  assert.equal(step.levels.storage, 2);
  assert.ok(Math.abs(step.stock.metal - later.stock.metal) < 1, `${step.stock.metal} vs ${later.stock.metal}`);
  assert.ok(Math.abs(step.stock.crystal - later.stock.crystal) < 1);
});

test('kolejka: pozycja niemożliwa do zbudowania wypada; usunięcie nic nie zwraca', () => {
  const s: EconomyState = { ...rich(), queue: ['metalMine'], levels: { ...rich().levels, metalMine: BALANCE.maxLevel } };
  const r = startQueued(s, 0);
  assert.equal(r.state.queue, undefined);
  assert.match(r.message ?? '', /Usunięto z kolejki/);
  const q = enqueueBuilding(building(rich()), 'crystalMine').state;
  const removed = removeQueued(q, 0);
  assert.equal(removed.queue, undefined);
  assert.deepEqual(removed.stock, q.stock);
  assert.equal(removeQueued(q, 5), q);
});

test('kolejka: sprawdza pola i magazyn względem stanu po wcześniejszych budowach', () => {
  const balance = { ...BALANCE, buildQueue: 2 };
  const busy = building(rich());
  const noRoom = enqueueBuilding(busy, 'metalMine', balance, { hasRoom: (id, levels) => (levels[id] ?? 0) < 2 });
  assert.equal(!noRoom.ok && noRoom.reason, 'no-fields');
  const big = { ...busy, levels: { ...busy.levels, crystalMine: 25 } };
  const tooBig = enqueueBuilding(big, 'crystalMine', balance);
  assert.equal(!tooBig.ok && tooBig.reason, 'storage-too-small');
});

test('kolejka: zapis i odczyt; stary zapis bez kolejki, błędne pozycje pomijane', () => {
  const s = enqueueBuilding(building(rich()), 'crystalMine').state;
  const ref = { definitionId: STARTER.definition.id, seed: STARTER.seed, generatorVersion: 1 };
  assert.deepEqual(deserialize(serialize({ planet: ref, economy: s }))?.economy.queue, ['crystalMine']);
  const raw = JSON.parse(serialize({ planet: ref, economy: s }));
  raw.economy.queue = ['crystalMine', 'statek', 5];
  assert.deepEqual(deserialize(JSON.stringify(raw))?.economy.queue, ['crystalMine']);
  delete raw.economy.queue;
  assert.equal(deserialize(JSON.stringify(raw))?.economy.queue, undefined);
});

test('kolejka: SI nie wpycha się przed kolejkę gracza', () => {
  const e: EconomyState = { ...rich(), levels: { ...rich().levels, powerPlant: 6 } };
  const builds = (economy: EconomyState) =>
    suggest({ economy, planet, balance: BALANCE, research: EMPTY_RESEARCH, labLevel: 10 }).some((s) => s.action.kind === 'build');
  assert.ok(builds(e));
  assert.equal(builds({ ...e, queue: ['storage'] }), false);
});
