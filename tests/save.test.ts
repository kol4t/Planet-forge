import assert from 'node:assert/strict';
import { test } from 'node:test';
import { createEconomy } from '../src/core/economy/economy.ts';
import { loadEmpire, writeEmpire, empireFromLegacy } from '../src/core/save/empire.ts';
import { deserialize, serialize } from '../src/core/save/save.ts';

const data = {
  planet: { definitionId: 'ice', seed: 'PF-SAVE-TEST', generatorVersion: 1 },
  economy: createEconomy(123),
};

test('zapis i odczyt dają ten sam stan', () => {
  const back = deserialize(serialize(data));
  assert.deepEqual(back?.planet, data.planet);
  assert.deepEqual(back?.economy, data.economy);
});

test('uszkodzony lub obcy zapis = null', () => {
  assert.equal(deserialize(null), null);
  assert.equal(deserialize('{nie json'), null);
  assert.equal(deserialize(JSON.stringify({ ...JSON.parse(serialize(data)), saveVersion: 99 })), null);
  const bad = JSON.parse(serialize(data));
  bad.economy.levels.metalMine = 2.5;
  assert.equal(deserialize(JSON.stringify(bad)), null);
  bad.economy.levels.metalMine = 999;
  assert.equal(deserialize(JSON.stringify(bad)), null);
  const nan = JSON.parse(serialize(data));
  nan.economy.stock.metal = 'dużo';
  assert.equal(deserialize(JSON.stringify(nan)), null);
});

test('trwająca budowa przetrwa zapis; stary zapis bez budowy też działa', () => {
  const building = {
    ...data,
    economy: {
      ...data.economy,
      construction: {
        building: 'metalMine' as const,
        targetLevel: 2,
        startedAt: 100,
        finishesAt: 60_100,
        cost: { metal: 60, crystal: 15 },
      },
    },
  };
  assert.deepEqual(deserialize(serialize(building))?.economy.construction, building.economy.construction);

  const old = JSON.parse(serialize(data));
  delete old.economy.construction;
  assert.equal(deserialize(JSON.stringify(old))?.economy.construction, null);

  const wrongLevel = JSON.parse(serialize(building));
  wrongLevel.economy.construction.targetLevel = 5;
  assert.equal(deserialize(JSON.stringify(wrongLevel)), null);
  const unknown = JSON.parse(serialize(building));
  unknown.economy.construction.building = 'stocznia';
  assert.equal(deserialize(JSON.stringify(unknown)), null);
});

test('zapis sprzed magazynu wczytuje się z Magazynem na poz. 1', () => {
  const old = JSON.parse(serialize(data));
  delete old.economy.levels.storage;
  assert.equal(deserialize(JSON.stringify(old))?.economy.levels.storage, 1);
});

test('zapis sprzed antymaterii: zapas startowy i kolektor na poz. 0', () => {
  const old = JSON.parse(serialize(data));
  delete old.economy.antimatter;
  delete old.economy.levels.antimatterCollector;
  const back = deserialize(JSON.stringify(old));
  assert.equal(back?.economy.antimatter, 5);
  assert.equal(back?.economy.levels.antimatterCollector, 0);
  const kept = deserialize(serialize({ ...data, economy: { ...data.economy, antimatter: 2.5 } }));
  assert.equal(kept?.economy.antimatter, 2.5);
});

test('ujemne zasoby są przycinane do zera', () => {
  const raw = JSON.parse(serialize(data));
  raw.economy.stock.metal = -50;
  assert.equal(deserialize(JSON.stringify(raw))?.economy.stock.metal, 0);
});

test('brak localStorage (tryb prywatny) nie wywraca gry', () => {
  const original = Object.getOwnPropertyDescriptor(globalThis, 'localStorage');
  Object.defineProperty(globalThis, 'localStorage', {
    configurable: true,
    get() {
      throw new Error('SecurityError');
    },
  });
  try {
    assert.equal(writeEmpire(empireFromLegacy({ saveVersion: 1, ...data })), false);
    assert.equal(loadEmpire(), null);
  } finally {
    if (original) Object.defineProperty(globalThis, 'localStorage', original);
    else delete (globalThis as { localStorage?: unknown }).localStorage;
  }
});
