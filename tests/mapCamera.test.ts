import assert from 'node:assert/strict';
import { test } from 'node:test';
import { centerOn, edgePointer } from '../src/game/ui/mapCamera.ts';

const box = { left: 0, top: 0, right: 200, bottom: 100 };

test('mapa: strzałka do Twojego układu — tylko gdy układ jest poza widokiem, na krawędzi w jego stronę', () => {
  assert.equal(edgePointer(box, { x: 50, y: 50 }), null);
  const left = edgePointer(box, { x: -300, y: 50 })!;
  assert.deepEqual([left.x, left.y], [0, 50]);
  assert.ok(Math.abs(Math.abs(left.angle) - Math.PI) < 1e-9);
  const up = edgePointer(box, { x: 100, y: -500 })!;
  assert.deepEqual([up.x, up.y], [100, 0]);
  // Po przekątnej: punkt leży na krawędzi i na linii od środka do celu.
  const corner = edgePointer(box, { x: 400, y: 300 })!;
  assert.ok(corner.x <= 200 + 1e-9 && corner.y <= 100 + 1e-9);
  assert.ok(Math.abs((corner.y - 50) / (corner.x - 100) - (300 - 50) / (400 - 100)) < 1e-9);
});

test('mapa: „Mój układ” — przesunięcie stawia układ w środku widoku', () => {
  const pan = centerOn({ x: -60, y: 20 }, 3);
  assert.deepEqual(pan, { x: 180, y: -60 });
  // Środek widoku + przesunięcie + położenie × skala = środek.
  assert.equal(pan.x + -60 * 3, 0);
  assert.equal(pan.y + 20 * 3, 0);
});
