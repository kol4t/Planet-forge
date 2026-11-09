import assert from 'node:assert/strict';
import test from 'node:test';
import { STATION_CATEGORIES, STATION_RESEARCH, findStationResearch } from '../src/data/stationResearch.ts';
import {
  completeStationResearch,
  labCost,
  parseStationResearch,
  startStationResearch,
  stationEmpireEffects,
  stationResearchStatus,
  upgradeLab,
} from '../src/core/station/stationResearch.ts';
import { parseHomeStation } from '../src/core/economy/homeStation.ts';
import type { HomeStation } from '../src/core/types.ts';

const rich: HomeStation = { address: '1:4:6', core: { level: 1, readyAt: 0 }, stock: { metal: 1e7, crystal: 1e7 } };

test('drzewko stacji: 6 kategorii, każde badanie w kategorii, wymagania istnieją, są mosty między kategoriami', () => {
  assert.equal(STATION_CATEGORIES.length, 6);
  const ids = new Set(STATION_RESEARCH.map((n) => n.id));
  assert.equal(ids.size, STATION_RESEARCH.length);
  for (const node of STATION_RESEARCH) {
    assert.ok(STATION_CATEGORIES.some((c) => c.id === node.category));
    for (const r of node.requires) assert.ok(ids.has(r), `${node.id} → ${r}`);
  }
  for (const c of STATION_CATEGORIES) assert.ok(STATION_RESEARCH.some((n) => n.category === c.id && n.ring === 1 && n.requires.length === 0), `${c.id}: start`);
  const bridges = STATION_RESEARCH.filter((n) => n.requires.some((r) => findStationResearch(r)!.category !== n.category));
  assert.ok(bridges.length >= 6);
});

test('laboratorium orbitalne: płaci magazyn stacji, bez surowców — czytelny błąd', () => {
  const r = upgradeLab(rich, 1000);
  assert.ok(r.ok);
  assert.equal(r.station.lab!.level, 1);
  assert.equal(r.station.stock.metal, rich.stock.metal - labCost(1).metal);
  const poor = upgradeLab({ ...rich, stock: { metal: 0, crystal: 0 } }, 1000);
  assert.ok(!poor.ok && /magazynie stacji/.test(poor.message));
  assert.ok(!upgradeLab({ ...rich, core: { level: 1, readyAt: 5000 } }, 1000).ok);
});

test('badanie stacji: wymaga laboratorium, płaci magazyn stacji, jedno naraz, kończy się po czasie', () => {
  const noLab = startStationResearch({ done: [], current: null }, rich, 'st-power', 0);
  assert.ok(!noLab.ok);
  const station = { ...rich, lab: { level: 1, readyAt: 0 } };
  const r = startStationResearch({ done: [], current: null }, station, 'st-power', 0);
  assert.ok(r.ok);
  assert.ok(r.station.stock.metal < station.stock.metal);
  const second = startStationResearch(r.research, r.station, 'st-ai-node', 0);
  assert.ok(!second.ok && /jedno naraz/.test(second.message));
  assert.equal(stationResearchStatus(findStationResearch('st-aura-planet')!, r.research, 1), 'needs-research');
  const early = completeStationResearch(r.research, 10);
  assert.equal(early.completed, null);
  const done = completeStationResearch(r.research, r.research.current!.readyAt);
  assert.equal(done.completed, 'st-power');
  assert.ok(done.research.done.includes('st-power'));
  // Pierścień 3 wymaga wyższego laboratorium.
  const deep = findStationResearch('st-aura-system')!;
  assert.equal(stationResearchStatus(deep, { done: ['st-power', 'st-aura-planet'], current: null }, 1), 'needs-lab');
});

test('efekty stacji dla imperium: bez efektów samej stacji i „przygotowań”', () => {
  const fx = stationEmpireEffects(['st-power', 'st-empire-mining', 'st-aura-planet']);
  assert.ok(fx.every((e) => e.kind === 'output'));
  assert.equal(fx.length, 2);
});

test('zapis badań stacji: nieznane pomijane, stary zapis bez pól działa', () => {
  const p = parseStationResearch({ done: ['st-power', 'x', 'st-power'], current: { id: 'st-ai-node', startedAt: 1, readyAt: 2 } });
  assert.deepEqual(p.done, ['st-power']);
  assert.equal(p.current!.id, 'st-ai-node');
  const s = parseHomeStation({ address: '1:4:6', core: { level: 1, readyAt: 0 }, stock: { metal: 1, crystal: 1 }, lab: { level: 2, readyAt: 0 }, research: { done: ['st-power'], current: null } })!;
  assert.equal(s.lab!.level, 2);
  assert.deepEqual(s.research!.done, ['st-power']);
  const old = parseHomeStation({ address: '1:4:6', core: { level: 1, readyAt: 0 }, stock: { metal: 1, crystal: 1 } })!;
  assert.equal(old.lab, undefined);
  assert.equal(old.research, undefined);
});

import { withStationResearch } from '../src/core/station/stationResearch.ts';
import { BALANCE } from '../src/data/balance.ts';
import { fuelCost } from '../src/core/economy/fuel.ts';

test('lista właściciela: 90 badań, po 15 w kategorii, 6 pierścieni, bez cykli', () => {
  assert.equal(STATION_RESEARCH.length, 90);
  for (const c of STATION_CATEGORIES) assert.equal(STATION_RESEARCH.filter((n) => n.category === c.id).length, 15, c.id);
  assert.equal(Math.max(...STATION_RESEARCH.map((n) => n.ring)), 6);
  // Wymaganie zawsze z niższego albo tego samego pierścienia (ścieżka istnieje), bez cykli.
  const seen = new Set<string>();
  const visit = (id: string, path: string[]): void => {
    assert.ok(!path.includes(id), `cykl: ${[...path, id].join(' → ')}`);
    if (seen.has(id)) return;
    for (const r of findStationResearch(id)!.requires) visit(r, [...path, id]);
    seen.add(id);
  };
  for (const node of STATION_RESEARCH) visit(node.id, []);
});

test('badania stacji zmieniają liczby imperium: paliwo, stocznia, magazyn stacji', () => {
  const b = withStationResearch(BALANCE, ['st-fuel-cells', 'st-serial-docks', 'st-fleet-hangar', 'st-trade-storage']);
  assert.ok(fuelCost('transport', 100, b) < fuelCost('transport', 100, BALANCE));
  assert.ok(b.fleet.ships.transport.seconds < BALANCE.fleet.ships.transport.seconds);
  assert.equal(b.fleet.queue, BALANCE.fleet.queue + 2);
  assert.ok(b.homeStation.storageBase > BALANCE.homeStation.storageBase);
  assert.equal(withStationResearch(BALANCE, ['st-power']), BALANCE);
});
