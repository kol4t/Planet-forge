import assert from 'node:assert/strict';
import { test } from 'node:test';
import { approach } from '../src/game/ui/motion.ts';

test('licznik w pasku: płynnie do celu, bez przeskoku za cel, małe różnice od razu', () => {
  assert.equal(approach(undefined, 250, 16), 250, 'pierwsza wartość — od razu');
  assert.equal(approach(100, 100.3, 16), 100.3, 'różnica < 0,5 — od razu');
  assert.equal(approach(100, 50, 0), 50, 'bez upływu czasu — od razu');
  // Spadek po zapłaceniu 90: po klatce bliżej celu, ale jeszcze nie u celu.
  const one = approach(250, 160, 16);
  assert.ok(one < 250 && one > 160);
  // Po ok. 1 s (60 klatek) — u celu, nigdy poza nim.
  let v = 250;
  for (let i = 0; i < 60; i++) {
    v = approach(v, 160, 16);
    assert.ok(v >= 160);
  }
  assert.equal(v, 160);
  // Wzrost też płynny.
  assert.ok(approach(160, 250, 16) > 160 && approach(160, 250, 16) < 250);
});
