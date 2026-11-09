import assert from 'node:assert/strict';
import test from 'node:test';
import { OUTPOSTS, outpostLevel, outpostLimit, outpostOutput, outpostYield, parseOutposts, sendConstructionShip, upgradeOutpost } from '../src/core/station/outposts.ts';
import { GameController } from '../src/app/GameController.ts';

const h = 3600_000;
const all = ['st-space-mining', 'st-belt-station'];
const ctx = { kind: 'mining' as const, system: 7, hasSite: true, done: all, ships: 1, stationReady: true, now: 0, seconds: 3600 };

test('stacje wyspecjalizowane: wysyłka — stacja, badania, pas, jedna na pas, limit z badań, statek', () => {
  assert.equal(outpostLimit([]), 0);
  assert.equal(outpostLimit(all), 2);
  const ok = sendConstructionShip([], ctx);
  assert.ok(ok.ok);
  assert.equal(ok.outpost.arrivesAt, h);
  assert.match((sendConstructionShip([], { ...ctx, stationReady: false }) as { message: string }).message, /stacji macierzystej/);
  assert.match((sendConstructionShip([], { ...ctx, done: ['st-space-mining'] }) as { message: string }).message, /Stacja górnicza na pasie/);
  assert.match((sendConstructionShip([], { ...ctx, hasSite: false }) as { message: string }).message, /nie ma pasa/);
  assert.match((sendConstructionShip([ok.outpost], ctx) as { message: string }).message, /już jest/);
  const other = { ...ok.outpost, site: 'pas:3', system: 3 };
  assert.match((sendConstructionShip([ok.outpost, other], { ...ctx, system: 9 }) as { message: string }).message, /2 z 2/);
  assert.match((sendConstructionShip([], { ...ctx, ships: 0 }) as { message: string }).message, /statku konstrukcyjnego/);
});

test('stacje wyspecjalizowane: urobek od przylotu, rozbudowa z podziałem w chwili końca, zapis', () => {
  const o = (sendConstructionShip([], ctx) as { outpost: any }).outpost;
  assert.equal(outpostLevel(o, 0), 0);
  assert.deepEqual(outpostYield(o, h), { metal: 0, crystal: 0, antimatter: 0 }, 'statek leci');
  assert.equal(outpostYield(o, 3 * h).metal, 2 * OUTPOSTS.kinds.mining.perHour.metal);
  assert.match((upgradeOutpost(o, { metal: 1e9, crystal: 1e9 }, 0) as { message: string }).message, /leci/);
  assert.match((upgradeOutpost(o, { metal: 0, crystal: 0 }, h) as { message: string }).message, /brakuje/);
  const up = upgradeOutpost({ ...o, collectedAt: h }, { metal: 1e9, crystal: 1e9 }, h);
  assert.ok(up.ok);
  assert.equal(outpostLevel(up.outpost, h + 1), 1, 'w rozbudowie — stary poziom');
  const end = up.outpost.readyAt;
  const got = outpostYield(up.outpost, end + h).metal;
  const expect = (OUTPOSTS.kinds.mining.perHour.metal * (end - h)) / h + outpostOutput('mining', 2).metal;
  assert.ok(Math.abs(got - expect) < 1e-6);
  assert.deepEqual(parseOutposts([o, o, { kind: 'gaz' }, null]), [o]);
});

test('stacje wyspecjalizowane w grze: statek ze stoczni po badaniu, lot, urobek do magazynu stacji', () => {
  const c = new GameController(0);
  const index = Array.from({ length: 100 }, (_, i) => i + 1).find((i) => c.system(i)?.belt)!;
  const system = { index };
  (c as unknown as { station: unknown }).station = { address: c.address, core: { level: 1, readyAt: 0 }, storage: { level: 10, readyAt: 0 }, stock: { metal: 0, crystal: 0 }, research: { done: [], current: null } };
  c.economy = { ...c.economy, antimatter: 500 };
  assert.match(c.orderShip('constructionShip', 0).message, /Wydobycie z kosmosu/);
  assert.match(c.sendOutpost(system.index, 0).message, /badanie|Stacja górnicza/);
  (c as unknown as { station: { research: { done: string[] } } }).station.research.done.push('st-space-mining', 'st-belt-station');
  assert.match(c.sendOutpost(system.index, 0).message, /Brak statku konstrukcyjnego/);
  (c as unknown as { fleet: { docked: Record<string, number> } }).fleet.docked.constructionShip = 1;
  const r = c.sendOutpost(system.index, 0);
  assert.ok(r.ok, r.message);
  assert.equal(c.fleetView(0).ships.find((s) => s.type === 'constructionShip')!.flying, 1);
  const v = c.outpostsView(system.index, 0);
  assert.equal(v.list.length, 1);
  assert.ok(v.list[0]!.flying);
  const arrive = v.list[0]!.secondsLeft * 1000;
  c.tick(arrive + 2 * h);
  const stock = c.tradeView(arrive + 2 * h).stock;
  assert.ok(Math.abs(stock.metal - 2 * OUTPOSTS.kinds.mining.perHour.metal) < 1, `urobek metalu ${stock.metal}`);
  assert.equal(c.fleetView(arrive + 2 * h).ships.find((s) => s.type === 'constructionShip')!.flying, 0, 'statek zużyty');
});

test('stacja gazowa (4b): przy olbrzymie, po badaniu „Czerpanie gazu”, antymateria do wspólnego zapasu', () => {
  const gctx = { ...ctx, kind: 'gas' as const, target: '1:7:5', done: ['st-space-mining', 'st-gas-harvest'] };
  assert.match((sendConstructionShip([], { ...gctx, done: ['st-space-mining'] }) as { message: string }).message, /Czerpanie gazu/);
  assert.match((sendConstructionShip([], { ...gctx, hasSite: false }) as { message: string }).message, /gazowym olbrzymie/);
  const ok = sendConstructionShip([], gctx);
  assert.ok(ok.ok);
  assert.equal(ok.outpost.site, 'gaz:1:7:5');
  assert.match((sendConstructionShip([ok.outpost], gctx) as { message: string }).message, /olbrzymie już/);
  assert.ok(sendConstructionShip([ok.outpost], { ...gctx, target: '1:7:6' }).ok, 'drugi olbrzym w tym samym układzie');
  const y = outpostYield(ok.outpost, 3 * h);
  assert.equal(y.metal, 0);
  assert.ok(Math.abs(y.antimatter - 2 * OUTPOSTS.kinds.gas.antimatterPerHour) < 1e-9);
  assert.deepEqual(parseOutposts([ok.outpost, { ...ok.outpost, site: 'gaz:x', target: 5 }]), [ok.outpost]);

  const c = new GameController(0);
  let giant: string | null = null;
  for (let i = 1; i <= 100 && !giant; i++) giant = c.system(i)?.planets.find((p) => p.body === 'gas-giant')?.address ?? null;
  (c as unknown as { station: unknown }).station = { address: c.address, core: { level: 1, readyAt: 0 }, storage: { level: 10, readyAt: 0 }, stock: { metal: 0, crystal: 0 }, research: { done: ['st-space-mining', 'st-gas-harvest'], current: null } };
  (c as unknown as { fleet: { docked: Record<string, number> } }).fleet.docked.constructionShip = 1;
  c.economy = { ...c.economy, antimatter: 500 };
  assert.match(c.sendGasOutpost(c.address, 0).message, /gazowym olbrzymie/, 'zwykła planeta to nie olbrzym');
  const r = c.sendGasOutpost(giant!, 0);
  assert.ok(r.ok, r.message);
  const info = c.gasOutpostInfo(giant!, 0);
  assert.ok(info.built?.flying);
  const arrive = info.built!.secondsLeft * 1000;
  c.tick(arrive);
  const before = c.economy.antimatter;
  const own = c.rates.antimatterPerHour;
  c.tick(arrive + 5 * h);
  // Przyrost = własny (pasywny i kolektory) + stacja gazowa.
  const gain = c.economy.antimatter - before;
  assert.ok(Math.abs(gain - 5 * (own + OUTPOSTS.kinds.gas.antimatterPerHour)) < 0.01, `przyrost ${gain}`);
  assert.equal(c.outpostsView(null, arrive + 5 * h).list[0]!.kind, 'gas');
});
