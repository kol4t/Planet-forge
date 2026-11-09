import assert from 'node:assert/strict';
import test from 'node:test';
import { categoryNeedsLab, parseStationAuto, pickNightResearch, supplyCargo } from '../src/core/station/stationAuto.ts';
import { GameController } from '../src/app/GameController.ts';

test('dostawy: nadwyżka ponad próg, w granicach ładowności i miejsca na stacji', () => {
  assert.equal(supplyCargo({ metal: 400, crystal: 400 }, 1000, 0.5, 5000, { metal: 1e6, crystal: 1e6 }), null);
  assert.deepEqual(supplyCargo({ metal: 900, crystal: 600 }, 1000, 0.5, 5000, { metal: 1e6, crystal: 1e6 }), { metal: 400, crystal: 100 });
  const big = supplyCargo({ metal: 90_000, crystal: 90_000 }, 100_000, 0.5, 5000, { metal: 1e6, crystal: 1e6 })!;
  assert.equal(big.metal + big.crystal, 5000);
  assert.deepEqual(supplyCargo({ metal: 900, crystal: 900 }, 1000, 0.5, 5000, { metal: 100, crystal: 0 }), { metal: 100, crystal: 0 });
});

test('SI nocna: najtańsze dostępne w kategorii, na które starcza magazynu stacji', () => {
  const st = { done: [], current: null };
  assert.equal(pickNightResearch(st, 'production', 1, 1, { metal: 1e9, crystal: 1e9 }), 'st-power');
  assert.equal(pickNightResearch(st, 'production', 1, 1, { metal: 0, crystal: 0 }), null);
  assert.equal(pickNightResearch({ done: ['st-power'], current: null }, 'production', 1, 1, { metal: 1e9, crystal: 1e9 }), null, 'pierścień 2 wymaga laboratorium 2');
  assert.ok(categoryNeedsLab({ done: ['st-power'], current: null }, 'production', 1));
  assert.deepEqual(parseStationAuto({ supply: 0.75, night: 'fleet' }), { supply: 0.75, night: 'fleet' });
  assert.equal(parseStationAuto({ supply: 0.3, night: 'x' }), null);
});

test('automatyka w grze: przełączniki wymagają badań, SI nocna uruchamia badanie', () => {
  const c = new GameController();
  assert.ok(!c.setStationNight('production').ok);
  (c as unknown as { station: unknown }).station = {
    address: c.address,
    core: { level: 1, readyAt: 0 },
    lab: { level: 1, readyAt: 0 },
    stock: { metal: 1e7, crystal: 1e7 },
    research: { done: ['st-ai-node', 'st-ai-research', 'st-ai-queue', 'st-ai-night'], current: null },
  };
  assert.ok(c.setStationNight('production').ok);
  c.tick();
  const v = c.stationResearchView();
  assert.equal(v.current?.id, 'st-power');
  assert.ok(c.queueStationResearch('st-repair-dock').ok);
  assert.equal(c.stationResearchView().auto.queued?.id, 'st-repair-dock');
});

test('badanie stacji kończy się w trakcie gry (takt), nie tylko po wczytaniu', () => {
  const c = new GameController();
  (c as unknown as { station: unknown }).station = {
    address: c.address,
    core: { level: 1, readyAt: 0 },
    lab: { level: 1, readyAt: 0 },
    stock: { metal: 1e7, crystal: 1e7 },
    research: { done: [], current: { id: 'st-power', startedAt: 0, readyAt: 1 } },
  };
  c.tick();
  assert.ok(c.stationResearchView().nodes.find((n) => n.id === 'st-power')!.status === 'done');
});
