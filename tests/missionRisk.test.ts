import assert from 'node:assert/strict';
import { test } from 'node:test';
import { GameController } from '../src/app/GameController.ts';
import { addRepair, completeRepairs, parseFleet, starterFleet } from '../src/core/economy/fleet.ts';
import { cargoAfter, parseIncident, pirateNests, riskLabel, rollIncident, routeRisk, withEscort } from '../src/core/economy/missionRisk.ts';
import { parseShipments } from '../src/core/economy/transport.ts';
import { isColonizable } from '../src/core/galaxy/galaxy.ts';
import { BALANCE } from '../src/data/balance.ts';

function withMemoryStorage(run: () => void): void {
  const store = new Map<string, string>();
  const original = Object.getOwnPropertyDescriptor(globalThis, 'localStorage');
  Object.defineProperty(globalThis, 'localStorage', {
    configurable: true,
    value: { getItem: (k: string) => store.get(k) ?? null, setItem: (k: string, v: string) => void store.set(k, v), removeItem: (k: string) => void store.delete(k) },
  });
  try {
    run();
  } finally {
    if (original) Object.defineProperty(globalThis, 'localStorage', original);
    else delete (globalThis as { localStorage?: unknown }).localStorage;
  }
}

const A = { index: 1, x: 0, y: 0 };
const B = { index: 2, x: 100, y: 0 };

test('ryzyko misji (etap 7): ten sam układ bezpieczny, rośnie z odległością i przy gniazdach, maks. cap', () => {
  assert.deepEqual(routeRisk(A, { ...A }, [], 0, BALANCE), { base: 0, risk: 0, nests: 0, safe: true });
  const far = routeRisk(A, B, [], 0, BALANCE);
  const near = routeRisk(A, { index: 3, x: 20, y: 0 }, [], 0, BALANCE);
  assert.ok(far.base > near.base && near.base > 0, 'dalej = groźniej');
  assert.equal(far.base, 100 * BALANCE.missionRisk.perUnit);
  // Gniazdo przy trasie (w środku odcinka, pół zasięgu obok) dolicza ryzyko; daleko — nie.
  const nest = { index: 9, x: 50, y: BALANCE.missionRisk.nestRange * 0.5 };
  const away = { index: 8, x: 50, y: 90 };
  const withNest = routeRisk(A, B, [nest, away], 0, BALANCE);
  assert.equal(withNest.nests, 1);
  assert.ok(Math.abs(withNest.base - (far.base + BALANCE.missionRisk.perNest)) < 1e-9);
  const many = routeRisk(A, B, Array.from({ length: 10 }, (_, i) => ({ index: 20 + i, x: 10 * i, y: 0 })), 0, BALANCE);
  assert.equal(many.base, BALANCE.missionRisk.cap);
});

test('ryzyko misji: każdy okręt eskorty zmniejsza ryzyko, 3 okręty — prawie zero', () => {
  const base = 0.3;
  const r = [0, 1, 2, 3, 4].map((n) => withEscort(base, n, BALANCE));
  for (let i = 1; i < r.length; i++) assert.ok(r[i]! < r[i - 1]! || r[i] === 0);
  assert.ok(r[3]! <= base * 0.05, `3 okręty: ${r[3]}`);
  assert.equal(r[4], 0);
  assert.equal(riskLabel(0), '0%');
  assert.equal(riskLabel(0.004), '< 1%');
  assert.equal(riskLabel(0.153), '15%');
});

test('ryzyko misji: gniazda piratów stałe dla galaktyki, bez układu startowego', () => {
  const game = new GameController(0);
  const nests = pirateNests(game.galaxy, BALANCE, [game.homeSystem]);
  assert.equal(nests.length, Math.round(game.galaxy.systems.length * BALANCE.missionRisk.nestShare));
  assert.ok(!nests.some((n) => n.index === game.homeSystem));
  assert.deepEqual(pirateNests(game.galaxy, BALANCE, [game.homeSystem]), nests, 'deterministycznie');
  assert.equal(new Set(nests.map((n) => n.index)).size, nests.length, 'bez powtórzeń');
});

test('ryzyko misji: losowanie przy starcie — deterministyczne, chwila w trakcie lotu, łagodne skutki', () => {
  const flight = { departedAt: 1000, seconds: 600 };
  assert.equal(rollIncident('x', 0, 'cargo', flight, 0, BALANCE), null);
  const sure = rollIncident('trasa', 1, 'cargo', flight, 3, BALANCE)!;
  assert.deepEqual(rollIncident('trasa', 1, 'cargo', flight, 3, BALANCE), sure);
  assert.ok(sure.at > flight.departedAt && sure.at < flight.departedAt + flight.seconds * 1000);
  const { lossShare, delayShare } = BALANCE.missionRisk;
  assert.ok(sure.lossShare! >= lossShare.min && sure.lossShare! <= lossShare.max);
  assert.ok(sure.delaySeconds >= flight.seconds * delayShare.min - 1 && sure.delaySeconds <= flight.seconds * delayShare.max + 1);
  assert.ok((sure.damaged ?? 0) <= 3);
  // Kolonizacja i konstrukt: tylko opóźnienie, bez straty.
  assert.equal(rollIncident('trasa', 1, 'delay', flight, 0, BALANCE)!.lossShare, undefined);
  // Częstość ≈ ryzyko.
  let hits = 0;
  for (let i = 0; i < 2000; i++) if (rollIncident(`k${i}`, 0.25, 'cargo', flight, 0, BALANCE)) hits++;
  assert.ok(hits > 400 && hits < 600, `trafienia ${hits}/2000`);
  assert.deepEqual(cargoAfter({ metal: 100, crystal: 3 }, 0.25), { kept: { metal: 75, crystal: 2 }, lost: { metal: 25, crystal: 1 } });
});

test('ryzyko misji: zapis — zdarzenie i naprawy opcjonalne, błędne pomijane', () => {
  assert.equal(parseIncident({ at: 'x', delaySeconds: 1 }), null);
  assert.deepEqual(parseIncident({ at: 5, delaySeconds: 10, lossShare: 3, damaged: -1, done: true }), { at: 5, delaySeconds: 10, done: true });
  const [s] = parseShipments([{ from: '1:1:1', to: '1:2:1', departedAt: 0, arrivesAt: 10, cargo: { metal: 1, crystal: 1 }, incident: { at: 5, delaySeconds: 3, lossShare: 0.3 } }]);
  assert.deepEqual(s!.incident, { at: 5, delaySeconds: 3, lossShare: 0.3 });
  let fleet = addRepair(starterFleet(BALANCE), 2, 0, BALANCE);
  assert.deepEqual(parseFleet(JSON.parse(JSON.stringify(fleet)))!.repairs, fleet.repairs);
  assert.equal(completeRepairs(fleet, 1000).repaired.length, 0);
  const done = completeRepairs(fleet, BALANCE.missionRisk.repairSeconds * 1000);
  fleet = done.fleet;
  assert.equal(fleet.docked.escort, 2);
  assert.equal(fleet.repairs, undefined);
});

test('ryzyko misji: kontroler — przechwycony transport traci ładunek, spóźnia się, eskorta idzie do naprawy; dziennik', () => {
  withMemoryStorage(() => {
    const game = new GameController(0);
    const other = game.galaxy.systems.map((s) => game.system(s.index)!).find((s) => s.index !== game.homeSystem && s.planets.some(isColonizable))!;
    const target = other.planets.find(isColonizable)!.address;
    game.research = { done: ['explore-1', 'fleet-1'], current: null };
    game.markDiscovered(other.index, 4);
    game.economy = { ...game.economy, levels: { ...game.economy.levels, storage: 14 }, stock: { metal: 100_000, crystal: 100_000 }, antimatter: 500 };
    assert.ok(game.sendColonyShip(target, 0).ok);
    game.tick(30 * 24 * 3600_000);
    let now = 30 * 24 * 3600_000;
    assert.equal(game.slotAt(target), 1, 'kolonia w innym układzie');
    // Ryzyko widać przed wysłaniem; eskorta je obniża.
    const risk0 = game.routeRisk(game.address, target, 0);
    assert.ok(risk0.risk > 0 && !risk0.safe);
    assert.ok(game.routeRisk(game.address, target, 2).risk < risk0.risk);
    assert.match(game.riskText(game.address, target), /ryzyko piratów \d+%|< 1%/);
    const home = game.system(game.homeSystem)!.planets[0]!.address;
    assert.match(game.riskText(game.address, home), /bez ryzyka/);
    // Transport z 2 okrętami eskorty; zdarzenie wymuszone (los przy starcie jest deterministyczny, tu ustawiamy go sami).
    (game as unknown as { fleet: { docked: Record<string, number> } }).fleet.docked.escort = 2;
    assert.ok(game.sendResources(target, { metal: 1000, crystal: 400 }, now, 2).ok);
    const shipments = (game as unknown as { shipments: { arrivesAt: number; incident?: unknown }[] }).shipments;
    const arrives = shipments[0]!.arrivesAt;
    shipments[0]!.incident = { at: now + 1000, delaySeconds: 600, lossShare: 0.5, damaged: 1 };
    const notes: string[] = [];
    game.onShipmentArrived((t) => notes.push(t));
    now += 2000;
    game.tick(now);
    const view = game.shipmentsView(now)[0]!;
    assert.deepEqual(view.cargo, { metal: 500, crystal: 200 });
    assert.equal(view.arrivesAt, arrives + 600_000);
    assert.equal(view.escort, 1);
    const fv = game.fleetView(now);
    assert.equal(fv.repairing, 1);
    assert.ok(game.journalEntries().some((e) => e.text.startsWith('Piraci przechwycili transportowiec') && /1 z 2/.test(e.text)));
    // Przylot: połowa ładunku, eskorta (1) i transportowiec wracają; po naprawie wraca drugi okręt.
    now = arrives + 600_000 + BALANCE.missionRisk.repairSeconds * 1000;
    game.tick(now);
    assert.equal(game.shipmentsView(now).length, 0);
    assert.equal(game.fleetView(now).ships.find((s) => s.type === 'escort')!.docked, 2, 'eskorta po naprawie');
    assert.equal(game.fleetView(now).repairing, 0);
  });
});
