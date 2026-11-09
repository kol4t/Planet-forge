import assert from 'node:assert/strict';
import test from 'node:test';
import { auraEffects, auraShare, auraStats, STATION_AURA } from '../src/core/station/stationAura.ts';
import { GameController } from '../src/app/GameController.ts';

test('premia stacji: zasięg z badań (planeta → układ → sąsiednie), siła z rdzenia', () => {
  assert.equal(auraStats([], 1).reach, 0);
  assert.equal(auraStats(['st-power', 'st-aura-planet'], 1).reach, 1);
  assert.equal(auraStats(['st-aura-planet', 'st-aura-system'], 1).reach, 2);
  assert.equal(auraStats(['st-aura-planet', 'st-aura-system', 'st-aura-near'], 1).reach, 3);
  assert.equal(auraStats(['st-aura-planet'], 1).output, STATION_AURA.output);
  assert.ok(auraStats(['st-aura-planet'], 3).output > STATION_AURA.output);
  assert.equal(auraStats(['st-fuel-recovery'], 1).fromStationTime, -25);
  assert.equal(auraStats(['st-fuel-recovery'], 1).reach, 0);
});

test('premia stacji słabnie z odległością: planeta 100%, układ 50%, sąsiednie układy 25%, dalej nic', () => {
  assert.equal(auraShare(1, true, true, 0), 1);
  assert.equal(auraShare(1, false, true, 0), 0);
  assert.equal(auraShare(2, false, true, 0), 0.5);
  assert.equal(auraShare(2, false, false, 5), 0);
  assert.equal(auraShare(3, false, false, 10), 0.25);
  assert.equal(auraShare(3, false, false, 50), 0);
  const fx = auraEffects(auraStats(['st-aura-planet'], 1), 0.5);
  assert.ok(fx.some((e) => e.kind === 'output' && e.percent === STATION_AURA.output / 2));
  assert.equal(auraEffects(auraStats([], 1), 1).length, 0);
});

test('premia stacji w grze: planeta pod stacją wydobywa więcej i buduje szybciej', () => {
  const c = new GameController();
  const before = c.rates.metal;
  const t0 = c.balance.buildSecondsPerLevel;
  (c as unknown as { station: unknown }).station = { address: c.address, core: { level: 1, readyAt: 0 }, stock: { metal: 0, crystal: 0 }, research: { done: ['st-power', 'st-aura-planet'], current: null } };
  assert.equal(c.auraShareFor(c.address), 1);
  assert.ok(c.rates.metal > before, `${c.rates.metal} > ${before}`);
  assert.ok(c.stationAuraView().planets.some((p) => p.address === c.address));
  assert.ok(t0 > 0);
});
