import assert from 'node:assert/strict';
import { test } from 'node:test';
import { DragRotator } from '../src/planet-renderer/input/dragRotator.ts';

test('przeciągnięcie obraca planetę, pochylenie jest ograniczone', () => {
  const r = new DragRotator();
  r.start(0);
  r.move(100, 0, 16);
  assert.ok(Math.abs(r.yaw - 0.6) < 1e-9);
  r.move(0, 10_000, 32);
  assert.equal(r.pitch, 1.1);
});

test('szybki ruch → bezwładność, która wygasa', () => {
  const r = new DragRotator();
  r.start(0);
  for (let t = 16; t <= 96; t += 16) r.move(40, 0, t);
  r.end(100);
  const yaw0 = r.yaw;
  r.update(0.1, 200);
  assert.ok(r.yaw > yaw0, 'kręci się dalej');
  for (let i = 0; i < 60; i++) r.update(0.1, 300 + i * 100);
  assert.ok(Math.abs(r.velYaw) < 0.01, 'zwalnia');
});

test('zatrzymany palec przed puszczeniem = brak rzutu', () => {
  const r = new DragRotator();
  r.start(0);
  r.move(50, 0, 16);
  r.end(500);
  assert.equal(r.velYaw, 0);
});

test('autoobrót wraca po bezczynności', () => {
  const r = new DragRotator();
  r.update(0.1, 10_000);
  assert.ok(r.yaw > 0);
});

test('turnTo obraca najkrótszą drogą, a dotyk go przerywa', () => {
  const r = new DragRotator();
  r.yaw = 0.1;
  r.turnTo(Math.PI * 2 - 0.1, 0.3, 0);
  for (let i = 0; i < 40; i++) r.update(0.05, i * 50);
  assert.ok(Math.abs(r.yaw - -0.1) < 0.01, `yaw=${r.yaw}`);
  assert.ok(Math.abs(r.pitch - 0.3) < 0.01);
  r.turnTo(2, 0, 0);
  r.start(10);
  r.end(20);
  r.update(0.1, 30);
  assert.ok(Math.abs(r.yaw - -0.1) < 0.05, 'cel anulowany dotykiem');
});
