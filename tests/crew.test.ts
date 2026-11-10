import assert from 'node:assert/strict';
import test from 'node:test';
import { CREW, crewAt, crewBonus, crewNeed, crewPlaces, habitatCost, parseCrew } from '../src/core/station/crew.ts';
import { parseHomeStation } from '../src/core/economy/homeStation.ts';
import { stationResearchSeconds } from '../src/core/station/stationResearch.ts';
import { STATION_RESEARCH } from '../src/data/stationResearch.ts';
import { GameController } from '../src/app/GameController.ts';

const h = 3600_000;
const st = (extra: object = {}) => ({ address: '1:1:1', core: { level: 1, readyAt: 0 }, stock: { metal: 0, crystal: 0 }, ...extra }) as never;

test('załoga (5a): miejsca z modułu mieszkalnego i kwater, wzrost sam do miejsc, potrzeba modułów, premia do 25%', () => {
  const s = st({ habitat: { level: 2, readyAt: 0 }, crew: { count: 0, at: 0 }, storage: { level: 3, readyAt: 0 }, lab: { level: 2, readyAt: 0 } });
  assert.equal(crewPlaces(s, 0, []), 2 * CREW.placesPerLevel);
  assert.equal(crewPlaces(s, 0, [CREW.quartersResearch]), 2 * CREW.placesPerLevel * CREW.quartersFactor);
  assert.equal(crewAt(s, 2 * h, []), 2 * 2 * CREW.growthPerLevel);
  assert.equal(crewAt(s, 1000 * h, []), crewPlaces(s, 0, []), 'nie więcej niż miejsc');
  assert.equal(crewNeed(s, 0, 1), (1 + 3 + 2) * CREW.needPerModuleLevel);
  assert.deepEqual(crewBonus(0, 30), { share: 0, bonus: 0 });
  assert.deepEqual(crewBonus(15, 30), { share: 0.5, bonus: CREW.maxBonus / 2 });
  assert.deepEqual(crewBonus(99, 30), { share: 1, bonus: CREW.maxBonus });
  assert.equal(crewAt(st(), 5 * h, []), 0, 'bez modułu mieszkalnego — brak załogi');
  assert.ok(habitatCost(3).metal > habitatCost(2).metal);
  // Badania stacji szybsze z premią.
  const n = STATION_RESEARCH[0]!;
  assert.ok(stationResearchSeconds(n, 1, [], 0.75) < stationResearchSeconds(n, 1, []));
  assert.equal(parseCrew({ count: -1, at: 0 }), null);
  assert.deepEqual(parseHomeStation({ address: '1:1:1', core: { level: 1, readyAt: 0 }, habitat: { level: 1, readyAt: 0 }, crew: { count: 7, at: 5 }, stock: { metal: 0, crystal: 0 } })?.crew, { count: 7, at: 5 });
});

test('załoga w grze: moduł po badaniu z magazynu stacji, załoga rośnie, premia skraca stocznię i wzmacnia premię stacji', () => {
  const c = new GameController(0);
  (c as unknown as { station: unknown }).station = {
    address: c.address,
    core: { level: 1, readyAt: 0 },
    storage: { level: 5, readyAt: 0 },
    shipyard: { level: 1, readyAt: 0 },
    stock: { metal: 1e6, crystal: 1e6 },
    research: { done: ['st-aura-planet'], current: null },
  };
  assert.match(c.upgradeHabitat(0).message, /Moduł mieszkalny/);
  const auraBefore = c.stationAura(0).output;
  const shipBefore = c.fleetView(0).ships.find((s) => s.type === 'escort')!.seconds;
  (c as unknown as { station: { research: { done: string[] } } }).station.research.done.push(CREW.research);
  const r = c.upgradeHabitat(0);
  assert.ok(r.ok, r.message);
  const ready = CREW.habitat.secondsPerLevel * 1000;
  c.tick(ready);
  assert.equal(c.crewState(ready).count, 0);
  c.tick(ready + 100 * h);
  const crew = c.crewState(ready + 100 * h);
  assert.equal(crew.count, crew.places);
  assert.ok(crew.bonus > 0);
  assert.ok(c.stationAura(ready + 100 * h).output > auraBefore, 'premia stacji silniejsza');
  assert.ok(c.fleetView(ready + 100 * h).ships.find((s) => s.type === 'escort')!.seconds < shipBefore, 'stocznia szybsza');
  const card = c.stationModuleCards(ready + 100 * h).find((x) => x.id === 'habitat')!;
  assert.equal(card.level, 1);
  assert.equal(card.action, 'habitat');
});
