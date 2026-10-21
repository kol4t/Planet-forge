import assert from 'node:assert/strict';
import { test } from 'node:test';
import { generatePlanet } from '../src/core/generation/generatePlanet.ts';
import { PLANET_DEFINITIONS } from '../src/data/planets.ts';
import { buildLowPolyLand, shapedRadius, terrace } from '../src/planet-renderer/lowPoly.ts';
import { createSurfaceSampler } from '../src/planet-renderer/surface.ts';

test('tarasy: płaskie poziomy, wynik rośnie i mieści się w 0..1', () => {
  assert.equal(terrace(0, 5), 0);
  assert.equal(terrace(1, 5), 1);
  assert.equal(terrace(0.25, 5), terrace(0.21, 5)); // środek poziomu jest płaski
  let prev = -1;
  for (let t = 0; t <= 1; t += 0.01) {
    const v = terrace(t, 5);
    assert.ok(v >= prev - 1e-9 && v >= 0 && v <= 1);
    prev = v;
  }
});

test('ląd low-poly: każdy typ planety daje poprawną siatkę i kolory', () => {
  // Mała sfera testowa: ośmiościan (8 trójkątów) podzielony raz → 32 fasety.
  const base = [
    [1, 0, 0], [0, 1, 0], [0, 0, 1], [-1, 0, 0], [0, -1, 0], [0, 0, -1],
  ];
  const faces = [[0, 1, 2], [1, 3, 2], [3, 4, 2], [4, 0, 2], [1, 0, 5], [3, 1, 5], [4, 3, 5], [0, 4, 5]];
  const mid = (a: number[], b: number[]) => a.map((v, i) => (v + b[i]!) / 2);
  const tris: number[] = [];
  for (const [i, j, k] of faces) {
    const a = base[i!]!, b = base[j!]!, c = base[k!]!;
    const ab = mid(a, b), bc = mid(b, c), ca = mid(c, a);
    for (const t of [[a, ab, ca], [ab, b, bc], [ca, bc, c], [ab, bc, ca]]) for (const p of t) tris.push(...p);
  }
  const unit = new Float32Array(tris);
  for (const def of PLANET_DEFINITIONS) {
    const planet = generatePlanet(def, 'TEST-LOWPOLY');
    const land = buildLowPolyLand(planet, createSurfaceSampler(planet), unit);
    assert.equal(land.positions.length, unit.length);
    for (let i = 0; i < land.colors.length; i++) {
      assert.ok(land.colors[i]! >= 0 && land.colors[i]! <= 1, `${def.id}: kolor poza zakresem`);
    }
    for (let i = 0; i < land.positions.length; i += 3) {
      const r = Math.hypot(land.positions[i]!, land.positions[i + 1]!, land.positions[i + 2]!);
      assert.ok(r > 0.7 && r < 1.3, `${def.id}: promień ${r}`);
    }
    // Ląd nad morzem nigdy nie jest niżej niż poziom wody.
    assert.ok(shapedRadius(planet, planet.visual.seaLevel) >= 1);
  }
});
