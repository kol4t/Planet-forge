import assert from 'node:assert/strict';
import { test } from 'node:test';
import { createNoise3D, fbm } from '../src/core/random/noise.ts';
import { createRng, hashString } from '../src/core/random/rng.ts';

test('ten sam seed daje tę samą sekwencję', () => {
  const a = createRng('PF-TEST');
  const b = createRng('PF-TEST');
  for (let i = 0; i < 50; i++) assert.equal(a.next(), b.next());
});

test('różne seedy dają różne sekwencje', () => {
  assert.notEqual(createRng('A').next(), createRng('B').next());
});

test('next() w [0,1), int() w domkniętym zakresie', () => {
  const rng = createRng(42);
  const seen = new Set<number>();
  for (let i = 0; i < 2000; i++) {
    const v = rng.next();
    assert.ok(v >= 0 && v < 1);
    const n = rng.int(1, 3);
    assert.ok(Number.isInteger(n) && n >= 1 && n <= 3);
    seen.add(n);
  }
  assert.deepEqual([...seen].sort(), [1, 2, 3]);
});

test('fork nie zużywa losowań rodzica i jest stabilny', () => {
  const a = createRng('x');
  const b = createRng('x');
  a.fork('visual').next();
  assert.equal(a.next(), b.next());
  assert.equal(createRng('x').fork('gameplay').next(), createRng('x').fork('gameplay').next());
  assert.notEqual(createRng('x').fork('gameplay').next(), createRng('x').fork('visual').next());
});

test('weighted respektuje wagi i odrzuca pustą listę', () => {
  const rng = createRng('w');
  const counts = { a: 0, b: 0 };
  for (let i = 0; i < 4000; i++) counts[rng.weighted([{ id: 'a' as const, weight: 3 }, { id: 'b' as const, weight: 1 }]).id]++;
  assert.ok(counts.a > counts.b * 2);
  assert.throws(() => rng.weighted([]));
});

test('hashString jest stabilny (zmiana = inne planety u graczy!)', () => {
  assert.equal(hashString('planet-forge'), hashString('planet-forge'));
  assert.equal(hashString(''), 2872998923);
});

test('szum 3D i fBm są deterministyczne i w zakresie 0..1', () => {
  const n1 = createNoise3D(7);
  const n2 = createNoise3D(7);
  for (let i = 0; i < 300; i++) {
    const p = [i * 0.37, i * 0.11, -i * 0.23] as const;
    assert.equal(n1(...p), n2(...p));
    const f = fbm(n1, ...p, 5);
    assert.ok(f >= 0 && f <= 1);
  }
});
