import assert from 'node:assert/strict';
import test from 'node:test';
import { moveCheck, moveSeconds, parseStationMove, STATION_MOVE } from '../src/core/station/stationMove.ts';
import { parseIncident } from '../src/core/economy/missionRisk.ts';
import { parseHomeStation } from '../src/core/economy/homeStation.ts';
import { GameController } from '../src/app/GameController.ts';

const base = { done: [STATION_MOVE.research], ready: true, moving: false, same: false, validTarget: true, escort: 0, escortDocked: 0 };

test('przenosiny stacji: warunki — stacja, badanie, w toku, cel, to samo miejsce, eskorta', () => {
  assert.ok(moveCheck(base).ok);
  assert.match((moveCheck({ ...base, ready: false }) as { message: string }).message, /zbuduj/);
  assert.match((moveCheck({ ...base, done: [] }) as { message: string }).message, /Silniki stacji/);
  assert.match((moveCheck({ ...base, moving: true }) as { message: string }).message, /już się przenosi/);
  assert.match((moveCheck({ ...base, validTarget: false }) as { message: string }).message, /nie da się/);
  assert.match((moveCheck({ ...base, same: true }) as { message: string }).message, /już tu jest/);
  assert.match((moveCheck({ ...base, escort: 2, escortDocked: 1 }) as { message: string }).message, /eskorty/);
  assert.equal(moveSeconds(10), STATION_MOVE.minSeconds);
  assert.equal(moveSeconds(3600), 3600 * STATION_MOVE.flightFactor);
  const m = { to: '1:5:3', at: 'belt', startedAt: 0, departsAt: 1, arrivesAt: 2, fuel: 30, escort: 9 };
  assert.deepEqual(parseStationMove(m, parseIncident), { ...m, escort: STATION_MOVE.maxEscort });
  assert.equal(parseStationMove({ ...m, to: 'x' }, parseIncident), null);
  const st = parseHomeStation({ address: '1:2:3', at: 'belt', move: m, core: { level: 1, readyAt: 0 }, stock: { metal: 0, crystal: 0 } });
  assert.equal(st?.at, 'belt');
  assert.equal(st?.move?.to, '1:5:3');
});

function game(): GameController {
  const c = new GameController(0);
  (c as unknown as { station: unknown }).station = { address: c.address, core: { level: 1, readyAt: 0 }, storage: { level: 10, readyAt: 0 }, stock: { metal: 100_000, crystal: 50_000 }, credits: 1000, research: { done: [STATION_MOVE.research, 'st-aura-planet'], current: null } };
  c.economy = { ...c.economy, antimatter: 2000 };
  return c;
}

test('przenosiny w grze: obca planeta w innym układzie — paliwo, rozkładanie, stacja działa w drodze, przylot', () => {
  const c = game();
  const home = c.address;
  let target = '';
  for (let i = 1; i <= 100 && !target; i++) {
    const sys = c.system(i);
    if (sys && i !== c.homeSystem) target = sys.planets.find((p) => c.occupantAt(p) !== 'you')?.address ?? '';
  }
  const info = c.stationMoveInfo(target);
  assert.equal(info.reason, null);
  assert.ok(info.fuel > 0 && info.seconds >= STATION_MOVE.minSeconds);
  const am = c.economy.antimatter;
  const r = c.moveStation(target, undefined, 0, 0);
  assert.ok(r.ok, r.message);
  assert.equal(c.economy.antimatter, am - info.fuel);
  assert.match(c.moveStation(target, undefined, 0, 0).message, /już się przenosi/);
  // W drodze: stacja nadal w starym miejscu i działa (premia dla planety pod nią).
  assert.equal(c.stationAddress, home);
  assert.ok(c.auraShareFor(home, 1000) > 0);
  // Odwołanie tylko przed startem.
  const arrive = (STATION_MOVE.prepareSeconds + info.seconds) * 1000;
  c.tick(STATION_MOVE.prepareSeconds * 1000 + 1);
  assert.match(c.cancelStationMove(STATION_MOVE.prepareSeconds * 1000 + 2).message, /już leci/);
  c.tick(arrive + 30 * 24 * 3600_000);
  assert.equal(c.stationAddress, target, 'na nowym miejscu');
  assert.equal(c.stationMoveView(), null);
  assert.equal(c.stationOverOwn, false);
  assert.equal(c.auraShareFor(home), 0, 'premia „planeta” — stara planeta już poza zasięgiem');
});

test('przenosiny w grze: pas asteroid, odwołanie oddaje paliwo; piraci zabierają część magazynu', () => {
  const c = game();
  let belt = 0;
  for (let i = 1; i <= 100 && !belt; i++) if (c.system(i)?.belt) belt = i;
  const to = c.system(belt)!.planets[0]!.address;
  const am = c.economy.antimatter;
  assert.ok(c.moveStation(to, 'belt', 0, 0).ok);
  assert.ok(c.cancelStationMove(1000).ok);
  assert.ok(Math.abs(c.economy.antimatter - am) < 0.01, 'paliwo wróciło');
  assert.ok(c.moveStation(to, 'belt', 0, 2000).ok);
  // Wymuszony atak w połowie lotu.
  const s = (c as unknown as { station: { move: any; stock: any } }).station;
  s.move = { ...s.move, incident: { at: s.move.departsAt + 1, delaySeconds: 600, lossShare: 0.3 } };
  c.tick(s.move.departsAt);
  const before = c.tradeView(s.move.departsAt);
  c.tick(s.move.departsAt + 2);
  const after = c.tradeView(s.move.departsAt + 2);
  assert.equal(after.stock.metal, before.stock.metal - Math.ceil(before.stock.metal * 0.3));
  assert.ok(Math.abs(after.credits - (before.credits - Math.floor(before.credits * 0.3))) < 0.01, 'kredyty −30%');
  c.tick(1e12);
  assert.equal(c.stationAtBelt, true);
  assert.ok(c.auraShareFor(to) < 1, 'przy pasie żadna planeta nie ma pełnej premii');
});
