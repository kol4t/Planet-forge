import assert from 'node:assert/strict';
import { test } from 'node:test';
import { suggest } from '../src/core/ai/advisor.ts';
import {
  advance,
  createEconomy,
  depositsLeft,
  depositTotal,
  productionRates,
  setBuildingSettings,
  storageCapacity,
} from '../src/core/economy/economy.ts';
import { generatePlanet } from '../src/core/generation/generatePlanet.ts';
import { EMPTY_RESEARCH } from '../src/core/research/research.ts';
import { deserialize, serialize } from '../src/core/save/save.ts';
import type { Balance, EconomyState } from '../src/core/types.ts';
import { BALANCE } from '../src/data/balance.ts';
import { PLANET_DEFINITIONS, STARTER } from '../src/data/planets.ts';

const planet = generatePlanet(STARTER.definition, STARTER.seed);
const MIN = 60_000;
const HOUR = 60 * MIN;
/** Balans z małymi złożami, żeby wyczerpanie przyszło w minutach. */
const small = (metal: number, crystal: number): Balance => ({ ...BALANCE, deposits: { perHundredFields: { metal, crystal } } });
const mined = (e: EconomyState) => ({ metal: e.mined?.metal ?? 0, crystal: e.mined?.crystal ?? 0 });
/** Gospodarka z mocną elektrownią i dużym magazynem — kopalnie pracują pełną parą. */
const strong = (): EconomyState => {
  const e = createEconomy(0);
  return { ...e, levels: { ...e.levels, metalMine: 5, crystalMine: 5, powerPlant: 8, storage: 12 } };
};

test('złoża: początkowy zasób deterministyczny z seeda, różny dla różnych planet', () => {
  const total = depositTotal(planet);
  assert.deepEqual(total, depositTotal(generatePlanet(STARTER.definition, STARTER.seed)));
  // Planeta startowa: 100 pól, więc zasób = baza × bogactwo złóż.
  assert.equal(total.metal, Math.round(BALANCE.deposits.perHundredFields.metal * planet.gameplay.richness.metal));
  const totals = new Set<string>();
  for (const def of PLANET_DEFINITIONS) {
    for (const seed of ['A-1', 'B-2', 'C-3']) {
      const t = depositTotal(generatePlanet(def, seed));
      assert.ok(t.metal > 0 && t.crystal > 0, `${def.id}/${seed}`);
      totals.add(`${t.metal}/${t.crystal}`);
    }
  }
  assert.ok(totals.size > 10, 'planety mają różne złoża');
  // Nowa gra = złoża pełne.
  assert.deepEqual(depositsLeft(createEconomy(0), planet), total);
});

test('złoża: wydobycie zmniejsza złoże dokładnie o urobek kopalń (bez przyrostu podstawowego)', () => {
  const e = strong();
  const rates = productionRates(e, planet);
  const after = advance(e, planet, 10 * MIN);
  assert.ok(Math.abs(mined(after).metal - rates.fromDeposits.metal * 10) < 1e-6);
  assert.ok(Math.abs(mined(after).crystal - rates.fromDeposits.crystal * 10) < 1e-6);
  assert.ok(Math.abs(after.stock.metal - e.stock.metal - rates.metal * 10) < 1e-6);
  assert.ok(rates.metal - rates.fromDeposits.metal === BALANCE.passiveIncome.metal);
});

test('złoża: bez wydobycia (praca 0%, pełny magazyn) złoże się nie zmienia', () => {
  let off = setBuildingSettings(strong(), 'metalMine', { work: 0 });
  off = setBuildingSettings(off, 'crystalMine', { work: 0 });
  assert.deepEqual(mined(advance(off, planet, HOUR)), { metal: 0, crystal: 0 });
  const e = strong();
  const cap = storageCapacity(e);
  const full = { ...e, stock: { metal: cap, crystal: cap + 500 } };
  const after = advance(full, planet, HOUR);
  assert.deepEqual(mined(after), { metal: 0, crystal: 0 });
  assert.equal(after.stock.crystal, cap + 500, 'nadwyżka ponad pojemność nie przepada');
});

test('złoża: niedobór energii zmniejsza wydobycie i zużycie złoża', () => {
  const e = strong();
  const weak = { ...e, levels: { ...e.levels, powerPlant: 1 } };
  const dark = { ...e, levels: { ...e.levels, powerPlant: 0 } };
  assert.ok(productionRates(weak, planet).efficiency < 1);
  const full = mined(advance(e, planet, 10 * MIN)).metal;
  const part = mined(advance(weak, planet, 10 * MIN)).metal;
  assert.ok(part > 0 && part < full);
  assert.deepEqual(mined(advance(dark, planet, 10 * MIN)), { metal: 0, crystal: 0 });
});

test('złoża: wyczerpane złoże zatrzymuje kopalnię, zapas zostaje, przyrost podstawowy działa', () => {
  const balance = small(1_000, 1_000_000);
  const e = strong();
  const total = depositTotal(planet, balance);
  const after = advance(e, planet, 2 * HOUR, balance);
  assert.equal(depositsLeft(after, planet, balance).metal, 0);
  assert.equal(mined(after).metal, total.metal, 'złoże nie schodzi poniżej zera');
  const rates = productionRates(after, planet, balance);
  assert.equal(rates.fromDeposits.metal, 0);
  assert.equal(rates.metal, BALANCE.passiveIncome.metal);
  // Zgromadzony metal nie przepada: przybyło złoże + przyrost podstawowy za cały czas.
  assert.ok(Math.abs(after.stock.metal - e.stock.metal - total.metal - BALANCE.passiveIncome.metal * 120) < 1e-6);
  // Kryształy wydobywane dalej.
  assert.ok(rates.fromDeposits.crystal > 0);
});

test('złoża: po wyczerpaniu metalu kryształy dostają jego energię (i odwrotnie)', () => {
  const e = strong();
  const short = { ...e, levels: { ...e.levels, powerPlant: 3 } };
  for (const [gone, other, balance] of [
    ['metal', 'crystal', small(500, 10_000_000)],
    ['crystal', 'metal', small(10_000_000, 500)],
  ] as const) {
    const before = productionRates(short, planet, balance);
    assert.ok(before.efficiency < 1);
    const after = advance(short, planet, HOUR, balance);
    assert.equal(depositsLeft(after, planet, balance)[gone], 0, gone);
    const rates = productionRates(after, planet, balance);
    assert.equal(rates.fromDeposits[gone], 0);
    assert.ok(rates.fromDeposits[other] > before.fromDeposits[other], `${other} szybciej po wyczerpaniu ${gone}`);
  }
});

test('złoża: przy limicie magazynu złoże traci tylko to, co się zmieściło', () => {
  const e = strong();
  const cap = storageCapacity(e);
  const near = { ...e, stock: { metal: cap - 300, crystal: 0 } };
  const after = advance(near, planet, HOUR);
  assert.equal(after.stock.metal, cap);
  const rates = productionRates(near, planet);
  // Część kopalń w 300 jednostkach, które się zmieściły.
  const share = rates.fromDeposits.metal / rates.metal;
  assert.ok(Math.abs(mined(after).metal - 300 * share) < 1e-6);
});

test('złoża: nadrabianie nieobecności daje to samo co gra na bieżąco (także z wyczerpaniem po drodze)', () => {
  const balance = small(8_000, 40_000);
  const e = { ...strong(), levels: { ...strong().levels, powerPlant: 3, storage: 20 } };
  const once = advance(e, planet, 6 * HOUR, balance);
  let step = e;
  for (let t = MIN; t <= 6 * HOUR; t += MIN) step = advance(step, planet, t, balance);
  assert.equal(depositsLeft(once, planet, balance).metal, 0);
  for (const id of ['metal', 'crystal'] as const) {
    assert.ok(Math.abs(once.stock[id] - step.stock[id]) < 1e-3, `${id}: ${once.stock[id]} vs ${step.stock[id]}`);
    assert.ok(Math.abs(mined(once)[id] - mined(step)[id]) < 1e-3, id);
  }
  // Limit nieobecności (8 h) obejmuje też wydobycie.
  const away = advance(strong(), planet, 24 * HOUR);
  assert.ok(Math.abs(mined(away).metal - productionRates(strong(), planet).fromDeposits.metal * 8 * 60) < 1e-6);
});

test('złoża: zapis i odczyt zachowują wydobycie; stary zapis = złoża pełne, reszta bez zmian', () => {
  const after = advance(strong(), planet, HOUR);
  const ref = { definitionId: STARTER.definition.id, seed: STARTER.seed, generatorVersion: 1 };
  const back = deserialize(serialize({ planet: ref, economy: after }));
  assert.deepEqual(back?.economy.mined, after.mined);
  assert.deepEqual(back?.economy.stock, after.stock);
  const old = JSON.parse(serialize({ planet: ref, economy: after }));
  delete old.economy.mined;
  const legacy = deserialize(JSON.stringify(old))!;
  assert.equal(legacy.economy.mined, undefined);
  assert.deepEqual(legacy.economy.stock, after.stock);
  assert.deepEqual(legacy.economy.levels, after.levels);
  assert.deepEqual(depositsLeft(legacy.economy, planet), depositTotal(planet));
  // Błędne wydobycie nie psuje zapisu.
  old.economy.mined = { metal: -5, crystal: 'dużo' };
  assert.equal(deserialize(JSON.stringify(old))?.economy.mined, undefined);
});

test('złoża: SI nie proponuje kopalni na wyczerpanym złożu', () => {
  const balance = small(1, 10_000_000);
  const e = { ...createEconomy(0), stock: { metal: 900, crystal: 100 }, levels: { ...createEconomy(0).levels, powerPlant: 6 } };
  const dry = { ...e, mined: { metal: depositTotal(planet, balance).metal, crystal: 0 } };
  const pick = (economy: EconomyState) =>
    suggest({ economy, planet, balance, research: EMPTY_RESEARCH, labLevel: 10 }).find((s) => s.rule === 'mines')?.action;
  const lowMetal = { metal: 100, crystal: 900 };
  assert.deepEqual(pick({ ...e, stock: lowMetal }), { kind: 'build', building: 'metalMine' });
  assert.deepEqual(pick({ ...dry, stock: lowMetal }), { kind: 'build', building: 'crystalMine' });
});
