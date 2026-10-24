import assert from 'node:assert/strict';
import { test } from 'node:test';
import {
  advance,
  buildSeconds,
  cancelConstruction,
  constructionProgress,
  capacityAtLevel,
  createEconomy,
  antimatterAmount,
  finishConstructionNow,
  finishCost,
  fitsInStorage,
  storageCapacity,
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
  const low = productionRates({ ...e, levels: { metalMine: 6, crystalMine: 6, powerPlant: 1, storage: 1, antimatterCollector: 0, laboratory: 0 } }, planet);
  assert.ok(low.efficiency < 1);
  const ok = productionRates(e, planet);
  assert.ok(ok.metal > BALANCE.passiveIncome.metal);
});

test('produkcja naliczana w czasie, z limitem offline', () => {
  // Duży magazyn, żeby limit pojemności nie mieszał się z limitem czasu.
  const e = { ...createEconomy(0), levels: { ...BALANCE.startingLevels, storage: 20 } };
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
  const rates = { metal: 30, crystal: 10, energyProduced: 0, energyUsed: 0, efficiency: 1, efficiencyBy: {}, antimatterPerHour: 1 };
  assert.equal(secondsUntilAffordable(e, { metal: 60, crystal: 50 }, rates), 120);
  assert.equal(secondsUntilAffordable(e, { metal: 0, crystal: 50 }, rates), 0);
  assert.equal(secondsUntilAffordable(e, { metal: 10, crystal: 0 }, { ...rates, metal: 0 }), Infinity);
});

test('magazyn: pojemność rośnie z poziomem', () => {
  assert.equal(capacityAtLevel(1), 1000);
  assert.equal(capacityAtLevel(2), 1600);
  assert.equal(storageCapacity(createEconomy(0)), 1000);
});

test('pełny magazyn zatrzymuje wydobycie, ale nie zabiera nadwyżki', () => {
  const e = createEconomy(0);
  const day = advance(e, planet, 24 * 3600_000);
  assert.equal(day.stock.metal, 1000);
  assert.equal(day.stock.crystal, 1000);
  const over = { ...e, stock: { metal: 1500, crystal: 10 } };
  const later = advance(over, planet, 3600_000);
  assert.equal(later.stock.metal, 1500, 'nadwyżka zostaje, nie rośnie');
  assert.ok(later.stock.crystal > 10);
});

test('ukończony magazyn podnosi limit od chwili ukończenia', () => {
  const rich = { ...createEconomy(0), stock: { metal: 900, crystal: 900 } };
  const start = upgradeBuilding(rich, 'storage', 0);
  assert.ok(start.ok);
  const done = advance(start.state, planet, 24 * 3600_000);
  assert.equal(done.levels.storage, 2);
  assert.equal(done.stock.metal, 1600);
});

test('koszt większy niż magazyn = czytelny błąd i „nigdy” w czasie oczekiwania', () => {
  const e = { ...createEconomy(0), levels: { ...BALANCE.startingLevels, metalMine: 12 } };
  const cost = upgradeCost('metalMine', 12);
  assert.ok(cost.metal > 1000);
  assert.equal(fitsInStorage(e, cost), false);
  const r = upgradeBuilding(e, 'metalMine', 0);
  assert.equal(!r.ok && r.reason, 'storage-too-small');
  assert.match(r.message, /Za mały magazyn \(1000\)/);
  const rates = productionRates(e, planet);
  assert.equal(secondsUntilAffordable(e, cost, rates), Infinity);
});

test('„Ukończ teraz” za darmo do poziomu 5', () => {
  const start = upgradeBuilding(createEconomy(0), 'powerPlant', 0);
  assert.ok(start.ok);
  assert.equal(finishCost(start.state, 0), 0);
  const done = finishConstructionNow(start.state, 0);
  assert.ok(done.ok);
  assert.equal(done.state.levels.powerPlant, 2);
  assert.equal(done.state.construction, null);
  assert.deepEqual(done.state.stock, start.state.stock, 'nic nie kosztuje');
  assert.equal(done.state.antimatter, start.state.antimatter);
  assert.equal(!finishConstructionNow(createEconomy(0), 0).ok, true);
});

/** Budowa poziomu 6 elektrowni (3 minuty) z podanym zapasem antymaterii. */
function level6Build(antimatter: number) {
  const e = {
    ...createEconomy(0),
    antimatter,
    stock: { metal: 99_999, crystal: 99_999 },
    levels: { ...BALANCE.startingLevels, storage: 20, powerPlant: BALANCE.freeFinishMaxLevel },
  };
  const r = upgradeBuilding(e, 'powerPlant', 0);
  assert.ok(r.ok);
  return r.state;
}

test('powyżej poz. 5: 1 antymateria za każde rozpoczęte 15 minut', () => {
  const s = level6Build(10);
  assert.equal(buildSeconds(6), 180);
  assert.equal(finishCost(s, 0), 1, '3 min → 1');
  const long = { ...s, construction: { ...s.construction!, finishesAt: 40 * 60_000 } };
  assert.equal(finishCost(long, 0), 3, '40 min → 3');
  assert.equal(finishCost(long, 25 * 60_000), 1, 'zostało 15 min → 1');
  assert.equal(finishCost(long, 24 * 60_000), 2, 'zostało 16 min → 2');
});

test('płatne ukończenie odejmuje antymaterię, brak = czytelny błąd', () => {
  const paid = finishConstructionNow(level6Build(4), 0);
  assert.ok(paid.ok);
  assert.equal(paid.state.levels.powerPlant, 6);
  assert.equal(paid.state.antimatter, 3);
  assert.match(paid.message, /−1 antymateria/);
  const poor = finishConstructionNow(level6Build(0.9), 0);
  assert.equal(!poor.ok && poor.reason, 'not-enough-antimatter');
  assert.match(poor.message, /potrzeba 1, masz 0/);
});

test('antymateria: 1/h bez budynku (także offline), kolektor dodaje, brak energii go osłabia', () => {
  const e = createEconomy(0);
  assert.equal(e.antimatter, BALANCE.antimatter.startingStock);
  const hour = advance(e, planet, 3600_000);
  assert.ok(Math.abs(hour.antimatter - e.antimatter - 1) < 1e-9);
  const week = advance(e, planet, 7 * 24 * 3600_000);
  assert.ok(Math.abs(week.antimatter - e.antimatter - 8) < 1e-9, 'limit offline 8 h');

  const withCollector = { ...e, levels: { ...e.levels, antimatterCollector: 1, powerPlant: 3 } };
  const rates = productionRates(withCollector, planet);
  assert.equal(rates.efficiency, 1);
  assert.ok(Math.abs(rates.antimatterPerHour - (1 + 0.6 * 1.1)) < 1e-9);
  const starved = productionRates({ ...withCollector, levels: { ...withCollector.levels, powerPlant: 1 } }, planet);
  assert.ok(starved.efficiency < 1);
  assert.ok(starved.antimatterPerHour < rates.antimatterPerHour && starved.antimatterPerHour > 1);
});

test('odmiana: antymateria / antymaterie / antymaterii', () => {
  assert.equal(antimatterAmount(1), '1 antymateria');
  assert.equal(antimatterAmount(3), '3 antymaterie');
  assert.equal(antimatterAmount(5), '5 antymaterii');
  assert.equal(antimatterAmount(12), '12 antymaterii');
  assert.equal(antimatterAmount(22), '22 antymaterie');
});
