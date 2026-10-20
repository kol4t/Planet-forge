import assert from 'node:assert/strict';
import { test } from 'node:test';
import {
  advance,
  createEconomy,
  productionRates,
  secondsUntilAffordable,
  upgradeBuilding,
  upgradeCost,
} from '../src/core/economy/economy.ts';
import { generatePlanet } from '../src/core/generation/generatePlanet.ts';
import { BALANCE } from '../src/data/balance.ts';
import { KEPLER_186F } from '../src/data/planets.ts';

const planet = generatePlanet(KEPLER_186F, 'PF-ECON-TEST');

test('start: zasoby i poziomy z balansu', () => {
  const e = createEconomy(1000);
  assert.deepEqual(e.stock, BALANCE.startingStock);
  assert.deepEqual(e.levels, BALANCE.startingLevels);
  assert.equal(e.lastUpdate, 1000);
});

test('koszt rośnie wykładniczo i jest całkowity', () => {
  assert.deepEqual(upgradeCost('metalMine', 0), { metal: 60, crystal: 15 });
  assert.deepEqual(upgradeCost('metalMine', 1), { metal: 90, crystal: 22 });
  assert.ok(upgradeCost('powerPlant', 10).metal > upgradeCost('powerPlant', 9).metal);
});

test('brak energii obniża wydajność kopalń', () => {
  const e = createEconomy(0);
  const low = productionRates({ ...e, levels: { metalMine: 6, crystalMine: 6, powerPlant: 1 } }, planet);
  assert.ok(low.efficiency < 1);
  const ok = productionRates(e, planet);
  assert.ok(ok.metal > BALANCE.passiveIncome.metal);
});

test('produkcja naliczana w czasie, z limitem offline', () => {
  const e = createEconomy(0);
  const rates = productionRates(e, planet);
  const minute = advance(e, planet, 60_000);
  assert.ok(Math.abs(minute.stock.metal - (e.stock.metal + rates.metal)) < 1e-9);
  const week = advance(e, planet, 7 * 24 * 3600_000);
  const cap = advance(e, planet, BALANCE.maxOfflineSeconds * 1000);
  assert.equal(week.stock.metal, cap.stock.metal);
  assert.equal(advance(e, planet, 0), e, 'brak upływu czasu = ten sam stan');
});

test('ulepszenie: odejmuje koszt i podnosi poziom', () => {
  const e = createEconomy(0);
  const r = upgradeBuilding(e, 'powerPlant');
  assert.ok(r.ok);
  assert.equal(r.state.levels.powerPlant, 2);
  assert.equal(r.state.stock.metal, e.stock.metal - upgradeCost('powerPlant', 1).metal);
  assert.equal(e.levels.powerPlant, 1, 'stan wejściowy niezmieniony');
});

test('ulepszenie bez zasobów zwraca czytelny błąd', () => {
  const e = { ...createEconomy(0), stock: { metal: 0, crystal: 0 } };
  const r = upgradeBuilding(e, 'metalMine');
  assert.equal(r.ok, false);
  assert.equal(!r.ok && r.reason, 'not-enough-resources');
  assert.match(r.message, /Brakuje: 90 metalu, 22 kryształów/);
  assert.equal(r.state, e);
});

test('maksymalny poziom blokuje ulepszenie', () => {
  const e = { ...createEconomy(0), levels: { ...BALANCE.startingLevels, metalMine: BALANCE.maxLevel } };
  const r = upgradeBuilding(e, 'metalMine');
  assert.equal(!r.ok && r.reason, 'max-level');
});

test('czas oczekiwania na zasoby', () => {
  const e = { ...createEconomy(0), stock: { metal: 0, crystal: 100 } };
  const rates = { metal: 30, crystal: 10, energyProduced: 0, energyUsed: 0, efficiency: 1 };
  assert.equal(secondsUntilAffordable(e, { metal: 60, crystal: 50 }, rates), 120);
  assert.equal(secondsUntilAffordable(e, { metal: 0, crystal: 50 }, rates), 0);
  assert.equal(secondsUntilAffordable(e, { metal: 10, crystal: 0 }, { ...rates, metal: 0 }), Infinity);
});
