import assert from 'node:assert/strict';
import { test } from 'node:test';
import { ease, fitCamera, lerpCamera, MIN_HIT_PT, orbitRadii, pickBody, placeBodies, SYSTEM_TILT, toScreen } from '../src/planet-renderer/systemLayout.ts';

const bodies = [
  { address: '1:5:1', orbit: 0.4, phase: 0 },
  { address: '1:5:2', orbit: 0.9, phase: 1 },
  { address: '1:5:3', orbit: 2.1, phase: 2 },
];

test('widok układu (etap C): orbity od wewnętrznej do zewnętrznej, położenia deterministyczne z czasu świata', () => {
  assert.deepEqual(orbitRadii(0), []);
  const r = orbitRadii(3);
  assert.equal(r[0], 0.22);
  assert.equal(r[2], 1);
  const a = placeBodies(bodies, 1_000_000);
  assert.deepEqual(a, placeBodies(bodies, 1_000_000), 'ta sama chwila — to samo położenie');
  for (const p of a) {
    assert.ok(Math.abs(Math.hypot(p.x, p.y / SYSTEM_TILT) - p.r) < 1e-9, 'na swojej elipsie');
    assert.ok(p.depth >= -1 && p.depth <= 1);
  }
  const later = placeBodies(bodies, 1_000_000 + 60_000);
  assert.notDeepEqual(later[0], a[0], 'orbity się poruszają (decyzja właściciela)');
});

test('widok układu: kamera mieści cały układ, lot wygładzony, trafienie dotykiem ≥ 44 pt', () => {
  const cam = fitCamera(800, 600);
  assert.ok(cam.scale * 1.05 <= 400, 'najdalsza orbita mieści się w szerokości');
  assert.equal(ease(0), 0);
  assert.equal(ease(1), 1);
  assert.ok(ease(0.25) < 0.25 && ease(0.75) > 0.75);
  const b = { cx: 0.5, cy: 0.1, scale: cam.scale * 8 };
  assert.deepEqual(lerpCamera(cam, b, 0), cam);
  assert.deepEqual(lerpCamera(cam, b, 1), b);
  const placed = placeBodies(bodies, 0);
  const target = placed[1]!;
  const s = toScreen(cam, target.x, target.y);
  // Mały rysunek (5 px), palec 20 pt obok — trafia (strefa 22 pt), 30 pt obok — nie.
  assert.equal(pickBody(placed, cam, s.x + 20, s.y, 5, 1), target.address);
  assert.equal(pickBody(placed, cam, s.x + MIN_HIT_PT + 8, s.y, 5, 1), null);
  assert.equal(pickBody(placed, cam, s.x, s.y, 5, 1), target.address);
});
