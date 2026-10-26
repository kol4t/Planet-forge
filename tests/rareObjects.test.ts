import assert from 'node:assert/strict';
import { test } from 'node:test';
import { GameController } from '../src/app/GameController.ts';
import { DISCOVERY, discoveryOf, initialDiscoveries, isRare, rareBonuses } from '../src/core/galaxy/discovery.ts';
import { expeditionStats, planExpedition, resolveExpedition } from '../src/core/galaxy/expeditions.ts';
import { generateGalaxy } from '../src/core/galaxy/galaxy.ts';
import { applyResearch } from '../src/core/research/research.ts';
import type { Expedition } from '../src/core/types.ts';
import { BALANCE } from '../src/data/balance.ts';
import { RARE_OBJECTS } from '../src/data/galaxy.ts';
import { findResearch } from '../src/data/research.ts';

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
const pulsar = galaxy.systems.find((s) => s.star === 'pulsar')!.index;
const blackHole = galaxy.systems.find((s) => s.star === 'black-hole')!.index;
const base: Expedition = { target: pulsar, from: '1:16:1', departedAt: 1, returnsAt: 2, cost: { metal: 0, crystal: 0 }, chance: 1, quality: 1, scan: 0 };

test('rzadkie obiekty: pulsary i czarne dziury z generatora, deterministycznie; badanie „Astrofizyka ekstremalna” działa', () => {
  assert.deepEqual(RARE_OBJECTS.map((r) => r.star), ['pulsar', 'black-hole']);
  assert.equal(isRare(galaxy, pulsar), true);
  assert.equal(isRare(galaxy, galaxy.systems.find((s) => s.star === 'yellow')!.index), false);
  assert.deepEqual(generateGalaxy(1).systems.map((s) => s.star), galaxy.systems.map((s) => s.star), 'ta sama galaktyka');
  const node = findResearch('astro-x')!;
  assert.equal(node.soon, undefined);
  assert.equal(expeditionStats([['astro-x']]).extreme, true);
  assert.equal(expeditionStats([['probe-1']]).extreme, false);
});

test('rzadkie obiekty: bez badania wyprawa kończy na „wykryty”, potem plan blokuje; z badaniem — rozpoznany i zbadany', () => {
  const known = { [pulsar]: DISCOVERY.signal } as const;
  const blind = resolveExpedition(galaxy, known, base);
  assert.equal(blind.unreadable, true);
  assert.equal(blind.after, DISCOVERY.detected, 'tylko położenie i nazwa');
  assert.equal(resolveExpedition(galaxy, known, { ...base, quality: 3 }).after, DISCOVERY.detected, 'jakość nie pomaga bez badania');
  const stats = expeditionStats([['probe-1']]);
  const blocked = planExpedition(galaxy, blind.known, [galaxy.systems.find((s) => s.index !== pulsar)!.index], [], pulsar, { ...stats, range: 1000 });
  assert.match(blocked.reason!, /Astrofizyka ekstremalna/);
  const read = resolveExpedition(galaxy, blind.known, { ...base, departedAt: 5, extreme: true });
  assert.equal(read.after, DISCOVERY.explored);
  assert.equal(read.unreadable, false);
});

test('rzadkie obiekty: teleskop tylko wykrywa rzadkich sąsiadów; premie z danych rosną do limitu i działają jak badania', () => {
  // Sąsiedzi rzadcy — najwyżej „wykryty” na start.
  for (const s of galaxy.systems) {
    const known = initialDiscoveries(galaxy, [s.index]);
    for (const o of galaxy.systems) if (isRare(galaxy, o.index) && o.index !== s.index) assert.ok(discoveryOf(known, o.index) <= DISCOVERY.detected);
  }
  const pulsars = galaxy.systems.filter((s) => s.star === 'pulsar').map((s) => s.index);
  const all = Object.fromEntries(pulsars.map((i) => [i, DISCOVERY.explored]));
  const bonus = rareBonuses(galaxy, all).find((b) => b.def.star === 'pulsar')!;
  assert.equal(bonus.count, Math.min(pulsars.length, bonus.def.maxCount));
  const b = applyResearch(BALANCE, [], bonus.effects);
  assert.ok(Math.abs(b.antimatter.passivePerHour - (BALANCE.antimatter.passivePerHour + 0.25 * bonus.count)) < 1e-9);
  assert.equal(rareBonuses(galaxy, { [blackHole]: DISCOVERY.recognized }).find((x) => x.def.star === 'black-hole')!.count, 0, 'tylko zbadane');
});

test('rzadkie obiekty: kontroler — zbadana czarna dziura skraca badania na planecie gracza', () => {
  withMemoryStorage(() => {
    const game = new GameController(0);
    const before = game.balance.researchTimeFactor;
    game.markDiscovered(blackHole, DISCOVERY.explored);
    assert.ok(game.balance.researchTimeFactor < before);
    assert.equal(game.rareBonuses.find((x) => x.label === 'Czarna dziura')!.count, 1);
    assert.equal(game.knownRare(blackHole), true);
  });
});
