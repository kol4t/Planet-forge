import assert from 'node:assert/strict';
import { test } from 'node:test';
import {
  advance,
  buildSeconds,
  cancelConstruction,
  constructionProgress,
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

test('ulepszenie: pobiera koszt i rozpoczyna budowę, poziom rośnie dopiero po czasie', () => {
  const e = createEconomy(0);
  const r = upgradeBuilding(e, 'powerPlant', 1000);
  assert.ok(r.ok);
  assert.equal(r.state.levels.powerPlant, 1, 'poziom jeszcze bez zmian');
  assert.equal(r.state.stock.metal, e.stock.metal - upgradeCost('powerPlant', 1).metal);
  assert.deepEqual(r.state.construction, {
    building: 'powerPlant',
    targetLevel: 2,
    startedAt: 1000,
    finishesAt: 1000 + buildSeconds(2) * 1000,
    cost: upgradeCost('powerPlant', 1),
  });
  assert.equal(buildSeconds(2), 60, '30 s × poziom');
  assert.equal(e.levels.powerPlant, 1, 'stan wejściowy niezmieniony');
  assert.equal(e.construction, null);
});

test('naraz tylko jedna budowa', () => {
  const first = upgradeBuilding(createEconomy(0), 'powerPlant', 0);
  assert.ok(first.ok);
  const second = upgradeBuilding(first.state, 'metalMine', 10);
  assert.equal(!second.ok && second.reason, 'busy');
  assert.match(second.message, /Najpierw dokończ budowę: Elektrownia \(poz\. 2\)/);
  assert.equal(second.state, first.state);
});

test('ukończenie budowy w advance, produkcja z nowym poziomem od chwili ukończenia', () => {
  const start = upgradeBuilding(createEconomy(0), 'metalMine', 0);
  assert.ok(start.ok);
  const finishAt = start.state.construction!.finishesAt;
  const before = advance(start.state, planet, finishAt - 1);
  assert.equal(before.levels.metalMine, 1);
  assert.notEqual(before.construction, null);
  assert.ok(constructionProgress(before, finishAt - 1) > 0.99);

  const later = finishAt + 120_000;
  const done = advance(start.state, planet, later);
  assert.equal(done.levels.metalMine, 2);
  assert.equal(done.construction, null);
  // Ręcznie: produkcja do ukończenia (poziom 1) + 2 minuty na poziomie 2.
  const r1 = productionRates(start.state, planet);
  const r2 = productionRates({ ...start.state, levels: { ...start.state.levels, metalMine: 2 } }, planet);
  const expected = start.state.stock.metal + (r1.metal * finishAt) / 60_000 + r2.metal * 2;
  assert.ok(Math.abs(done.stock.metal - expected) < 1e-6);
});

test('budowa kończy się także podczas długiej nieobecności (limit offline nadal działa)', () => {
  const start = upgradeBuilding(createEconomy(0), 'crystalMine', 0);
  assert.ok(start.ok);
  const week = advance(start.state, planet, 7 * 24 * 3600_000);
  assert.equal(week.levels.crystalMine, 2);
  const cap = advance(start.state, planet, BALANCE.maxOfflineSeconds * 1000);
  assert.ok(Math.abs(week.stock.crystal - cap.stock.crystal) < 1e-6);
});

test('anulowanie zwraca pełny koszt i nie zmienia poziomu', () => {
  const e = createEconomy(0);
  const start = upgradeBuilding(e, 'metalMine', 0);
  assert.ok(start.ok);
  const cancel = cancelConstruction(start.state);
  assert.ok(cancel.ok);
  assert.deepEqual(cancel.state.stock, e.stock);
  assert.equal(cancel.state.levels.metalMine, 1);
  assert.equal(cancel.state.construction, null);
  assert.match(cancel.message, /anulowano, zwrócono 90 metalu i 22 kryształów/);
  const again = cancelConstruction(cancel.state);
  assert.equal(!again.ok && again.reason, 'nothing-to-cancel');
});

test('ulepszenie bez zasobów zwraca czytelny błąd', () => {
  const e = { ...createEconomy(0), stock: { metal: 0, crystal: 0 } };
  const r = upgradeBuilding(e, 'metalMine', 0);
  assert.equal(r.ok, false);
  assert.equal(!r.ok && r.reason, 'not-enough-resources');
  assert.match(r.message, /Brakuje: 90 metalu, 22 kryształów/);
  assert.equal(r.state, e);
});

test('maksymalny poziom blokuje ulepszenie', () => {
  const e = { ...createEconomy(0), levels: { ...BALANCE.startingLevels, metalMine: BALANCE.maxLevel } };
  const r = upgradeBuilding(e, 'metalMine', 0);
  assert.equal(!r.ok && r.reason, 'max-level');
});

test('czas oczekiwania na zasoby', () => {
  const e = { ...createEconomy(0), stock: { metal: 0, crystal: 100 } };
  const rates = { metal: 30, crystal: 10, energyProduced: 0, energyUsed: 0, efficiency: 1 };
  assert.equal(secondsUntilAffordable(e, { metal: 60, crystal: 50 }, rates), 120);
  assert.equal(secondsUntilAffordable(e, { metal: 0, crystal: 50 }, rates), 0);
  assert.equal(secondsUntilAffordable(e, { metal: 10, crystal: 0 }, { ...rates, metal: 0 }), Infinity);
});
