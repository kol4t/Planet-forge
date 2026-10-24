import assert from 'node:assert/strict';
import { test } from 'node:test';
import { AdaptiveResolution, MIN_RENDER_SCALE } from '../src/planet-renderer/adaptiveResolution.ts';
import { DragRotator } from '../src/planet-renderer/input/dragRotator.ts';

test('rozdzielczość 3D: spada przy długich klatkach, wraca przy zapasie, ignoruje pojedyncze przerwy', () => {
  const r = new AdaptiveResolution();
  for (let i = 0; i < 1000; i++) r.sample(16.7);
  assert.equal(r.scale, 1, 'płynnie — pełna rozdzielczość');
  for (let i = 0; i < 10; i++) r.sample(500);
  assert.equal(r.scale, 1, 'przerwy > 200 ms (karta w tle) się nie liczą');
  let changes = 0;
  for (let i = 0; i < 2000; i++) if (r.sample(30)) changes++;
  assert.equal(r.scale, MIN_RENDER_SCALE, 'wolno — do minimum');
  assert.ok(changes >= 3);
  for (let i = 0; i < 5000; i++) r.sample(8);
  assert.equal(r.scale, 1, 'zapas — z powrotem pełna');
});

test('autoobrót wygasa przy przybliżeniu (spinFactor 0)', () => {
  const r = new DragRotator({ idleResumeMs: 0 });
  r.spinFactor = 0;
  for (let t = 0; t < 5000; t += 16) r.update(0.016, t);
  assert.equal(r.yaw, 0);
  r.spinFactor = 1;
  for (let t = 5000; t < 10000; t += 16) r.update(0.016, t);
  assert.ok(r.yaw > 0.1);
});
