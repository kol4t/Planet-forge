import assert from 'node:assert/strict';
import test from 'node:test';
import { stationCapacity, upgradeCore, upgradeStationStorage } from '../src/core/economy/homeStation.ts';
import { orderShip, shipyardLanes, upgradeShipyard } from '../src/core/economy/fleet.ts';
import { labLanes, startStationResearch, completeStationResearch } from '../src/core/station/stationResearch.ts';
import { stationCoreLevel, stationScreen } from '../src/core/station/stationScreen.ts';
import { BALANCE } from '../src/data/balance.ts';
import type { HomeStation } from '../src/core/types.ts';

const base: HomeStation = { address: '1:4:6', core: { level: 1, readyAt: 0 }, stock: { metal: 1e8, crystal: 1e8 } };
const rich = { metal: 1e8, crystal: 1e8 };

test('rdzeń: rozbudowa wymaga badania, płaci magazyn stacji, w trakcie stacja działa', () => {
  assert.ok(!upgradeCore(base, [], 0).ok);
  const r = upgradeCore(base, ['st-core-2'], 0);
  assert.ok(r.ok);
  assert.ok(r.station.stock.metal < base.stock.metal);
  assert.equal(stationCoreLevel(r.station, 10), 1);
  assert.equal(stationCoreLevel(r.station, r.station.coreUpgrade!.readyAt), 2);
  assert.ok(!upgradeCore({ ...r.station, coreUpgrade: { level: 2, readyAt: 0 } }, ['st-core-2'], 1).ok, 'poz. 3 wymaga drugiego badania');
  assert.ok(upgradeCore({ ...r.station, coreUpgrade: { level: 2, readyAt: 0 } }, ['st-core-2', 'st-core-3'], 1).ok);
});

test('drugi pierścień: moduły zablokowane do rozbudowy rdzenia, potem działają', () => {
  assert.equal(stationScreen(base, 1)!.modules.find((m) => m.id === 'storage2')!.state, 'locked');
  assert.ok(!upgradeStationStorage(base, { stock: rich, now: 1 }, BALANCE, 2).ok);
  const two: HomeStation = { ...base, coreUpgrade: { level: 2, readyAt: 0 }, storage: { level: 1, readyAt: 0 } };
  const r = upgradeStationStorage(two, { stock: rich, now: 1 }, BALANCE, 2);
  assert.ok(r.ok);
  assert.ok(stationCapacity(r.station, r.station.storage2!.readyAt, BALANCE) > stationCapacity(two, 1, BALANCE), 'pojemności się sumują');
});

test('druga stocznia: dwa statki budują się naraz', () => {
  const two: HomeStation = { ...base, coreUpgrade: { level: 2, readyAt: 0 }, shipyard: { level: 1, readyAt: 0 } };
  const y = upgradeShipyard(two, { stock: rich, now: 0 }, BALANCE, 2);
  assert.ok(y.ok);
  const s = { ...y.station, shipyard2: { level: 1, readyAt: 0 } };
  assert.equal(shipyardLanes(s, 1), 2);
  let fleet = { docked: { transport: 0, colonyShip: 0, tug: 0, escort: 0 }, queue: [] as never[] } as any;
  const a = orderShip(fleet, 'transport', { shipyard: 1, stock: rich, now: 1000, lanes: 2 }, BALANCE);
  assert.ok(a.ok);
  fleet = a.fleet;
  const b = orderShip(fleet, 'transport', { shipyard: 1, stock: rich, now: 1000, lanes: 2 }, BALANCE);
  assert.ok(b.ok);
  assert.equal(b.order.startsAt, 1000, 'drugi startuje od razu w drugiej stoczni');
  const c = orderShip(b.fleet, 'transport', { shipyard: 1, stock: rich, now: 1000, lanes: 2 }, BALANCE);
  assert.ok(c.ok && c.order.startsAt > 1000, 'trzeci czeka');
  assert.ok(!upgradeShipyard({ ...s }, { stock: rich, now: 1 }, BALANCE, 2).ok, 'kopia ma jeden poziom');
});

test('drugie laboratorium: dwa badania stacji naraz, oba się kończą', () => {
  const s: HomeStation = { ...base, coreUpgrade: { level: 2, readyAt: 0 }, lab: { level: 2, readyAt: 0 }, lab2: { level: 1, readyAt: 0 } };
  assert.equal(labLanes(s, 1), 2);
  const a = startStationResearch({ done: [], current: null }, s, 'st-power', 0);
  assert.ok(a.ok);
  const b = startStationResearch(a.research, a.station, 'st-ai-node', 0);
  assert.ok(b.ok, !b.ok ? b.message : '');
  const c = startStationResearch(b.research, b.station, 'st-repair-dock', 0);
  assert.ok(!c.ok);
  const end = Math.max(b.research.current!.readyAt, b.research.more![0]!.readyAt);
  const done = completeStationResearch(b.research, end);
  assert.deepEqual([...done.completed].sort(), ['st-ai-node', 'st-power']);
  assert.equal(done.research.current, null);
});
