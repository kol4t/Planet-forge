import assert from 'node:assert/strict';
import { test } from 'node:test';
import { DRILL_LOOKS, DRILL_STAGE_LEVELS, drillLook } from '../src/data/drill.ts';
import { PLANET_DEFINITIONS } from '../src/data/planets.ts';
import { angleBetween } from '../src/planet-renderer/colony.ts';
import { bearingOf, buildDrill, CORE_RADIUS, drillParams, drillStage, layerAt, rimPoint } from '../src/planet-renderer/drill.ts';

const AXIS: [number, number, number] = [0.6, 0.48, 0.64];

test('odwiert (v0.48): 8 etapów z poziomu, rosnąco', () => {
  assert.equal(drillStage(0), 0);
  let last = 0;
  for (let level = 1; level <= 40; level++) {
    const s = drillStage(level);
    assert.ok(s >= last && s >= 1 && s <= 8);
    last = s;
  }
  assert.equal(drillStage(DRILL_STAGE_LEVELS[7]), 8);
  assert.equal(drillStage(DRILL_STAGE_LEVELS[7] - 1), 7);
});

test('odwiert: studnia głębsza z etapem, wierzchołki pod powierzchnią, krawędź dokładnie na okręgu otworu', () => {
  assert.equal(drillParams(1, 0.4, 0.95), null, 'etap 1 — tylko urządzenia na powierzchni');
  let lastBottom = Infinity;
  for (let stage = 2; stage <= 8; stage++) {
    const p = drillParams(stage, 0.4, 0.95)!;
    assert.ok(p.bottom < lastBottom, `etap ${stage}: głębiej`);
    lastBottom = p.bottom;
    const { walls, glow } = buildDrill(AXIS, p, drillLook('kepler-186f'), 7);
    assert.ok(walls.position.length > 0 && walls.position.length === walls.color.length);
    assert.equal(glow.position.length, glow.color.length);
    for (let i = 0; i < walls.position.length; i += 3) {
      const r = Math.hypot(walls.position[i]!, walls.position[i + 1]!, walls.position[i + 2]!);
      assert.ok(r <= p.rimRadius + 1e-6, `etap ${stage}: ściany nie wystają ponad krawędź`);
    }
    for (const c of walls.color) assert.ok(c >= 0 && c <= 1);
    // Okrąg krawędzi: punkt przypięcia lądu leży na promieniu krawędzi i w kącie otworu od osi.
    for (const b of [0, 1.3, -2.5]) {
      const q = rimPoint(AXIS, p, b);
      const len = Math.hypot(q[0], q[1], q[2]);
      assert.ok(Math.abs(len - p.rimRadius) < 1e-9);
      const dir: [number, number, number] = [q[0] / len, q[1] / len, q[2] / len];
      const axis = Math.hypot(...AXIS);
      assert.ok(Math.abs(angleBetween(dir, [AXIS[0] / axis, AXIS[1] / axis, AXIS[2] / axis]) - p.rimAngle) < 1e-6);
      assert.ok(Math.abs(Math.atan2(Math.sin(bearingOf([AXIS[0] / axis, AXIS[1] / axis, AXIS[2] / axis], q) - b), Math.cos(bearingOf([AXIS[0] / axis, AXIS[1] / axis, AXIS[2] / axis], q) - b))) < 1e-6);
    }
  }
});

test('odwiert: na etapie 8 jądro wewnątrz planety, co najmniej trzy warstwy, świecą pęknięcia i jądro', () => {
  const axis = Math.hypot(...AXIS);
  const n: [number, number, number] = [AXIS[0] / axis, AXIS[1] / axis, AXIS[2] / axis];
  const p = drillParams(8, 0.5, 0.93)!;
  assert.ok(p.core !== null && p.cavity !== null && p.core < p.cavity && p.cavity < p.rimRadius);
  const { walls, glow } = buildDrill(n, p, drillLook('volcanic'), 3);
  const layers = new Set<number>();
  for (let i = 0; i < walls.position.length; i += 3) layers.add(layerAt(Math.hypot(walls.position[i]!, walls.position[i + 1]!, walls.position[i + 2]!)));
  assert.ok(layers.size >= 3, `warstw: ${layers.size}`);
  let coreVerts = 0;
  for (let i = 0; i < glow.position.length; i += 3) {
    const r = Math.hypot(glow.position[i]!, glow.position[i + 1]!, glow.position[i + 2]!);
    assert.ok(r < p.rimRadius, 'blask w głębi, nie na powierzchni');
    if (Math.abs(r - CORE_RADIUS) < 1e-6) coreVerts++;
  }
  assert.ok(coreVerts >= 60, 'jądro w środku planety');
  // Deterministycznie.
  assert.deepEqual(buildDrill(n, p, drillLook('volcanic'), 3).walls.position, walls.position);
});

test('odwiert: wygląd dla każdego typu planety (albo skalisty domyślny)', () => {
  for (const def of PLANET_DEFINITIONS) {
    const look = drillLook(def.id);
    for (const c of [look.crust, look.deepCrust, look.mantle, look.hot, look.core, look.glow]) assert.match(c, /^#[0-9a-f]{6}$/i);
  }
  assert.equal(drillLook('nieznany'), DRILL_LOOKS['kepler-186f']);
});
