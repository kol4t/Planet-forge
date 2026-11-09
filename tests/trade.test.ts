import assert from 'node:assert/strict';
import test from 'node:test';
import { driftFactor, marketRate, marketSpread, marketTrade, TRADE } from '../src/core/station/trade.ts';
import { GameController } from '../src/app/GameController.ts';

const ctx = { level: 1, stock: { metal: 10_000, crystal: 10_000 }, wallet: 50, capacity: 1e6, antimatterTrade: false, ratesResearch: false, at: 0 };

test('rynek: marża maleje z poziomem doku i po badaniu, kurs waha się co 6 h w granicach', () => {
  assert.ok(marketSpread(5, false) < marketSpread(1, false));
  assert.ok(marketSpread(1, true) < marketSpread(1, false));
  assert.ok(marketSpread(99, true) >= TRADE.spread.min);
  for (let p = 0; p < 50; p++) {
    const f = driftFactor('crystal', p * TRADE.periodMs);
    assert.ok(f >= 1 - TRADE.drift - 1e-9 && f <= 1 + TRADE.drift + 1e-9);
  }
  assert.equal(driftFactor('crystal', 1), driftFactor('crystal', TRADE.periodMs - 1), 'stały w okresie');
  // Wymiana tam i z powrotem zawsze traci (marża).
  const there = marketRate('metal', 'crystal', 0, 1, false) * marketRate('crystal', 'metal', 0, 1, false);
  assert.ok(there < 1);
});

test('wymiana: dok, towar, antymateria po badaniu, miejsce w magazynie stacji', () => {
  assert.ok(!marketTrade({ ...ctx, level: 0 }, 'metal', 100, 'crystal').ok);
  const ok = marketTrade(ctx, 'metal', 1000, 'crystal');
  assert.ok(ok.ok && ok.received > 0);
  assert.ok(!marketTrade(ctx, 'metal', 20_000, 'crystal').ok, 'brak towaru');
  assert.match((marketTrade(ctx, 'antimatter', 1, 'metal') as { message: string }).message, /Handel antymaterią/);
  assert.ok(marketTrade({ ...ctx, antimatterTrade: true }, 'antimatter', 1, 'metal').ok);
  assert.ok(!marketTrade({ ...ctx, capacity: 10_000 }, 'metal', 1000, 'crystal').ok, 'magazyn stacji pełny');
});

test('dok handlowy w grze: budowa po badaniu, wymiana zmienia magazyn stacji', () => {
  const c = new GameController();
  (c as unknown as { station: unknown }).station = { address: c.address, core: { level: 1, readyAt: 0 }, storage: { level: 5, readyAt: 0 }, stock: { metal: 200_000, crystal: 200_000 }, research: { done: [], current: null } };
  assert.ok(!c.upgradeStationDock().ok);
  (c as unknown as { station: { research: unknown } }).station.research = { done: ['st-merchants', 'st-trade-dock'], current: null };
  assert.ok(c.upgradeStationDock().ok);
  (c as unknown as { station: { dock: unknown } }).station.dock = { level: 1, readyAt: 0 };
  const before = c.tradeView().stock;
  const r = c.trade('metal', 10_000, 'crystal');
  assert.ok(r.ok, r.message);
  const after = c.tradeView().stock;
  assert.equal(after.metal, before.metal - 10_000);
  assert.ok(after.crystal > before.crystal);
});
