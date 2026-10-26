import assert from 'node:assert/strict';
import { test } from 'node:test';
import { advance, createEconomy } from '../src/core/economy/economy.ts';
import { generatePlanet } from '../src/core/generation/generatePlanet.ts';
import { armProgress, researchLeadsTo, researchPath, researchPreview } from '../src/core/research/research.ts';
import { findResearch, RESEARCH_NODES } from '../src/data/research.ts';
import { STARTER } from '../src/data/planets.ts';
import { nodeIcon } from '../src/game/ui/galaxy.ts';

const planet = generatePlanet(STARTER.definition, STARTER.seed);

test('badania — szlak do celu: niezbadane wymagania aż do jądra, bez zbadanych', () => {
  // Głębokie szyby mają most do Geologii głębinowej (Planetologia, v0.35) — szlak przez dwa ramiona.
  assert.deepEqual(researchPath('mining-3', []).sort(), ['mining-1', 'mining-2', 'mining-3', 'planet-1', 'planet-4', 'prod-core'].sort());
  assert.deepEqual(researchPath('mining-3', ['prod-core', 'mining-1', 'planet-1', 'planet-4']).sort(), ['mining-2', 'mining-3'].sort());
  assert.deepEqual(researchPath('mining-3', ['prod-core', 'mining-1', 'mining-2', 'mining-3']), []);
  assert.deepEqual(researchLeadsTo('mining-2').map((n) => n.id), ['mining-3']);
});

test('badania — postęp ramienia liczy tylko badania do zrobienia', () => {
  assert.deepEqual(armProgress('productivity', []), { done: 0, total: 21 });
  assert.deepEqual(armProgress('productivity', ['prod-core', 'mining-1', 'planet-1']), { done: 2, total: 21 });
  assert.equal(armProgress('station', []).total, 0, 'ramię „wkrótce”');
});

test('badania — efekt „przed → po” zgodny z gospodarką (wydobycie, magazyn, czas budowy)', () => {
  const e = createEconomy(0);
  const economy = advance({ ...e, levels: { ...e.levels, powerPlant: 5 } }, planet, 0);
  const mining = researchPreview(findResearch('mining-1')!, economy, planet, []);
  assert.equal(mining.length, 1);
  assert.equal(mining[0]!.label, 'Metal');
  assert.ok(mining[0]!.after > mining[0]!.before);
  const storage = researchPreview(findResearch('log-1')!, economy, planet, []);
  assert.deepEqual(storage.map((p) => [p.label, p.before, p.after]), [['Magazyn', 1000, 1200]]);
  const build = researchPreview(findResearch('eng-1')!, economy, planet, []);
  assert.deepEqual(build.map((p) => [p.before, p.after]), [[30, 27]]);
  // Odblokowania nie mają liczby.
  assert.deepEqual(researchPreview(findResearch('ai-1')!, economy, planet, []), []);
});

test('badania — każda gwiazda (poza mistrzowskimi) ma ikonę rodzaju', () => {
  for (const node of RESEARCH_NODES.filter((n) => !n.master)) assert.notEqual(nodeIcon(node), 'none', node.id);
  assert.equal(nodeIcon(findResearch('mining-1')!), 'metal');
  assert.equal(nodeIcon(findResearch('energy-2')!), 'energy');
  assert.equal(nodeIcon(findResearch('explore-1')!), 'ship');
});
