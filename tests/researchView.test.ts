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
  assert.deepEqual(researchLeadsTo('mining-2').map((n) => n.id).sort(), ['crystal-complex', 'mining-3']);
});

test('badania — postęp ramienia liczy tylko badania do zrobienia', () => {
  assert.deepEqual(armProgress('productivity', []), { done: 0, total: 22 });
  assert.deepEqual(armProgress('productivity', ['prod-core', 'mining-1', 'planet-1']), { done: 2, total: 22 });
  assert.equal(armProgress('station', []).total, 3, 'Stacja i handel: Górnictwo asteroid, Przechwyt komet, Rafinacja (reszta wkrótce)');
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

test('badania — łuki połączeń po spirali i zaczepy mostów (v0.36.1)', async () => {
  const { isBridge, linkCurve, polylinePrefix } = await import('../src/game/ui/galaxy.ts');
  // Łuk między punktami po przeciwnych stronach jądra nie przechodzi przez jądro.
  const curve = linkCurve({ x: 3, y: 0 }, { x: -3, y: 0.01 });
  assert.deepEqual(curve[0], { x: 3, y: 0 });
  for (const p of curve) assert.ok(Math.hypot(p.x, p.y) > 2.9);
  // Z jądra — prosto na zewnątrz.
  const out = linkCurve({ x: 0, y: 0 }, { x: 0, y: 2 });
  assert.ok(out.every((p) => Math.abs(p.x) < 1e-9));
  // Zaczep ma zadaną długość.
  const stub = polylinePrefix(curve, 0.42);
  let length = 0;
  for (let i = 1; i < stub.length; i++) length += Math.hypot(stub[i]!.x - stub[i - 1]!.x, stub[i]!.y - stub[i - 1]!.y);
  assert.ok(Math.abs(length - 0.42) < 1e-9);
  // Mosty: wymaganie z innego ramienia.
  assert.equal(isBridge(findResearch('log-4')!, findResearch('ai-3')), true);
  assert.equal(isBridge(findResearch('log-4')!, findResearch('log-3')), false);
});
