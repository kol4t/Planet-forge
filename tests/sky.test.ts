import assert from 'node:assert/strict';
import { test } from 'node:test';
import { generateGalaxy, generateSystem } from '../src/core/galaxy/galaxy.ts';
import { PLANET_DEFINITIONS } from '../src/data/planets.ts';
import { distantBodies, layoutSky } from '../src/planet-renderer/sky.ts';

test('niebo: ten sam seed = te same gwiazdy, wszystko w obszarze', () => {
  const a = layoutSky('1:16:4', 1100, 860, '#f2d27a');
  const b = layoutSky('1:16:4', 1100, 860, '#f2d27a');
  assert.deepEqual(a, b);
  assert.notDeepEqual(a.far, layoutSky('1:16:5', 1100, 860, '#f2d27a').far);
  for (const s of [...a.far, ...a.near, ...a.twinkle]) {
    assert.ok(s.x >= 0 && s.x <= 1100 && s.y >= 0 && s.y <= 860);
    assert.ok(s.a > 0 && s.a <= 1);
  }
  assert.ok(a.nebulae.length >= 3 && a.nebulae.every((n) => n.alpha < 0.35));
  assert.ok(a.near.some((s) => s.glint));
});

test('niebo: liczba gwiazd rośnie z rozmiarem ekranu (telefon < iPad)', () => {
  const phone = layoutSky('x', 430, 930, '#ffffff');
  const ipad = layoutSky('x', 1080, 1420, '#ffffff');
  assert.ok(ipad.far.length > phone.far.length * 2);
  assert.ok(ipad.far.length < 2000, 'limit wydajności');
});

test('odległe ciała: do 2 prawdziwych sąsiadów z układu, bez własnej planety', () => {
  const galaxy = generateGalaxy(1);
  const system = generateSystem(galaxy, 16)!;
  const bodies = distantBodies(system, 4, PLANET_DEFINITIONS);
  assert.ok(bodies.length >= 1 && bodies.length <= 2);
  const own = system.planets.find((p) => p.position === 4)!;
  for (const body of bodies) {
    assert.notEqual(body.name, own.name);
    assert.ok(system.planets.some((p) => p.name === body.name && p.address === body.seed));
    assert.ok(body.size > 0 && body.size < 0.3);
  }
  assert.deepEqual(distantBodies(null, 1, PLANET_DEFINITIONS), []);
});
