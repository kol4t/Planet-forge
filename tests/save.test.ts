import assert from 'node:assert/strict';
import { test } from 'node:test';
import { createEconomy } from '../src/core/economy/economy.ts';
import { deserialize, loadSave, serialize, writeSave } from '../src/core/save/save.ts';

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
    assert.equal(writeSave(data), false);
    assert.equal(loadSave(), null);
  } finally {
    if (original) Object.defineProperty(globalThis, 'localStorage', original);
    else delete (globalThis as { localStorage?: unknown }).localStorage;
  }
});
