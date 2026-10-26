import assert from 'node:assert/strict';
import { test } from 'node:test';
import { GameController } from '../src/app/GameController.ts';
import { DISCOVERY, discoveryOf, initialDiscoveries, type Discoveries } from '../src/core/galaxy/discovery.ts';
import { expeditionStats, parseExpeditions, planExpedition, resolveExpedition } from '../src/core/galaxy/expeditions.ts';
import { generateGalaxy } from '../src/core/galaxy/galaxy.ts';
import type { Expedition } from '../src/core/types.ts';
import { EXPEDITION_RULES } from '../src/data/galaxy.ts';

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

const galaxy = generateGalaxy(1);
const HOME = 16;
const known = initialDiscoveries(galaxy, [HOME]);
const signals = galaxy.systems.filter((s) => discoveryOf(known, s.index) === DISCOVERY.signal).map((s) => s.index);

test('ekspedycje: badania — odblokowanie z dowolnej planety, parametry z najlepszej', () => {
  assert.equal(expeditionStats([[]]).unlocked, false);
  const one = expeditionStats([['probe-1'], ['probe-1', 'probe-2', 'probe-3']]);
  assert.equal(one.unlocked, true);
  assert.equal(one.range, 45);
  assert.equal(one.speed, 25);
  assert.equal(expeditionStats([['astro-1'], ['astro-2']]).quality, 1);
  assert.equal(expeditionStats([['astro-1'], ['astro-2']]).success, 8);
});

test('ekspedycje: plan — badanie, cel znany, w zasięgu, bez powtórek, limit naraz; dalej = dłużej, drożej, mniejsza szansa', () => {
  const none = expeditionStats([[]]);
  const stats = expeditionStats([['probe-1']]);
  const target = signals[0]!;
  assert.match(planExpedition(galaxy, known, [HOME], [], target, none).reason!, /Sondy zwiadowcze/);
  assert.ok(planExpedition(galaxy, known, [HOME], [], target, stats).ok, 'sygnał w zasięgu startowym');
  // Wszystkie sygnały na start są osiągalne (zasięg = zasięg sygnałów).
  for (const s of signals) assert.ok(planExpedition(galaxy, known, [HOME], [], s, stats).ok);
  assert.match(planExpedition(galaxy, known, [HOME], [], HOME, stats).reason!, /już zbadany/);
  const unknown = galaxy.systems.find((s) => discoveryOf(known, s.index) === 0)!.index;
  assert.match(planExpedition(galaxy, known, [HOME], [], unknown, stats).reason!, /nic nie wiadomo/);
  const flying: Expedition = { target, from: '1:16:1', departedAt: 0, returnsAt: 1, cost: { metal: 0, crystal: 0 }, chance: 1, quality: 1, scan: 1 };
  assert.match(planExpedition(galaxy, known, [HOME], [flying], target, stats).reason!, /już leci/);
  const busy = Array.from({ length: EXPEDITION_RULES.maxActive }, (_, i) => ({ ...flying, target: 1000 + i }));
  assert.match(planExpedition(galaxy, known, [HOME], busy, target, stats).reason!, /najwyżej/);
  // Daleki cel poza zasięgiem; po badaniu sond — w zasięgu.
  const far = { ...known, [unknown]: DISCOVERY.signal } as Discoveries;
  const farPlan = planExpedition(galaxy, far, [HOME], [], unknown, stats);
  if (farPlan.distance > farPlan.range) {
    assert.match(farPlan.reason!, /Poza zasięgiem/);
  }
  const near = planExpedition(galaxy, known, [HOME], [], signals[0]!, stats);
  const further = signals.map((s) => planExpedition(galaxy, known, [HOME], [], s, stats)).sort((a, b) => b.distance - a.distance)[0]!;
  assert.ok(further.seconds >= near.seconds && further.cost.metal >= near.cost.metal && further.chance <= near.chance);
  const faster = planExpedition(galaxy, known, [HOME], [], signals[0]!, expeditionStats([['probe-1', 'probe-2', 'probe-3']]));
  assert.ok(faster.seconds < near.seconds);
});

test('ekspedycje: wynik deterministyczny; udana podnosi wiedzę i łapie sygnały wokół, nieudana — nic', () => {
  const base: Expedition = { target: signals[0]!, from: '1:16:1', departedAt: 1000, returnsAt: 2000, cost: { metal: 1, crystal: 1 }, chance: 1, quality: 1, scan: 30 };
  const ok = resolveExpedition(galaxy, known, base);
  assert.equal(ok.success, true);
  assert.equal(ok.before, DISCOVERY.signal);
  assert.equal(ok.after, DISCOVERY.recognized, 'sygnał → rozpoznany (jakość 1)');
  assert.deepEqual(resolveExpedition(galaxy, known, base), ok, 'ten sam wynik za każdym razem');
  for (const i of ok.revealed) assert.ok(discoveryOf(ok.known, i) >= DISCOVERY.signal);
  // Druga wyprawa do rozpoznanego — zbadany.
  assert.equal(resolveExpedition(galaxy, ok.known, { ...base, departedAt: 5000 }).after, DISCOVERY.explored);
  // Jakość 2: od razu zbadany.
  assert.equal(resolveExpedition(galaxy, known, { ...base, quality: 2 }).after, DISCOVERY.explored);
  const fail = resolveExpedition(galaxy, known, { ...base, chance: 0 });
  assert.equal(fail.success, false);
  assert.equal(fail.known, known);
  // Przy szansie 80% część wypraw (różne chwile wysłania) się nie udaje.
  const results = Array.from({ length: 200 }, (_, i) => resolveExpedition(galaxy, known, { ...base, chance: 0.8, departedAt: i * 7919 }).success);
  const failed = results.filter((x) => !x).length;
  assert.ok(failed > 15 && failed < 70, `porażek: ${failed}`);
  assert.deepEqual(parseExpeditions([base, { target: 'x' }, null]), [base]);
});

test('ekspedycje: kontroler — koszt, raport w dzienniku, rozliczenie raz, także po nieobecności', () => {
  withMemoryStorage(() => {
    const game = new GameController(0);
    const target = game.galaxy.systems.find((s) => game.discoveryLevel(s.index) === DISCOVERY.signal)!.index;
    assert.match(game.sendExpedition(target, 0).message, /Sondy zwiadowcze/);
    game.research = { done: ['probe-1'], current: null };
    game.economy = { ...game.economy, levels: { ...game.economy.levels, storage: 6 }, stock: { metal: 9000, crystal: 9000 } };
    const plan = game.expeditionPlan(target);
    const sent = game.sendExpedition(target, 0);
    assert.ok(sent.ok, sent.message);
    assert.equal(game.economy.stock.metal, 9000 - plan.cost.metal);
    assert.equal(game.expeditionsView(0).length, 1);
    const back = game.expeditionsView(0)[0]!;
    assert.ok(back.secondsLeft > 60);
    game.save();
    // Powrót podczas nieobecności: rozliczona raz, wpis w dzienniku, raport do pokazania.
    const later = new GameController(plan.seconds * 1000 + 5000);
    assert.equal(later.expeditionsView().length, 0);
    assert.equal(later.expeditionsWhileAway.length, 1);
    const report = later.expeditionsWhileAway[0]!;
    if (report.success) assert.ok(later.discoveryLevel(target) >= DISCOVERY.recognized);
    else assert.equal(later.discoveryLevel(target), DISCOVERY.signal);
    const entries = later.journalEntries().filter((e) => e.kind === 'expedition');
    assert.equal(entries.length, 2, 'wyruszyła + wróciła');
    // Ponowne uruchomienie nie rozlicza drugi raz.
    later.save();
    const again = new GameController(plan.seconds * 1000 + 9000);
    assert.equal(again.expeditionsWhileAway.length, 0);
    assert.equal(again.journalEntries().filter((e) => e.kind === 'expedition').length, 2);
    assert.equal(again.discoveryLevel(target), later.discoveryLevel(target));
  });
});
