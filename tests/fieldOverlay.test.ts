import assert from 'node:assert/strict';
import { test } from 'node:test';
import { fieldGrid } from '../src/core/colony/fieldGrid.ts';
import { generatePlanet } from '../src/core/generation/generatePlanet.ts';
import { STARTER } from '../src/data/planets.ts';
import { borderChains, borderStates } from '../src/planet-renderer/fieldOverlay.ts';

test('siatka pól: granice połączone w linie — każdy odcinek dokładnie raz, w swoim kolorze', () => {
  const grid = fieldGrid(generatePlanet(STARTER.definition, STARTER.seed));
  const plots = { metalMine: [grid.colonyCenter] };
  const states = borderStates(grid, plots);
  const chains = borderChains(grid, states);
  const key = (p: readonly number[]) => p.map((v) => v.toFixed(6)).join(',');
  const pair = (a: readonly number[], b: readonly number[]) => [key(a), key(b)].sort().join('|');
  // Każdy odcinek linii to odcinek granicy (z tym samym kolorem), a liczba się zgadza.
  const wanted = new Map<string, number>();
  let visible = 0;
  grid.borders.forEach((b, i) => {
    // Wolne pola morza (v0.57) nie mają rysowanych granic.
    if (states[i] === 'hidden') return;
    visible++;
    const k = `${states[i]}#${pair(b.from, b.to)}`;
    wanted.set(k, (wanted.get(k) ?? 0) + 1);
  });
  let segments = 0;
  for (const chain of chains) {
    assert.ok(chain.points.length >= 2);
    for (let i = 1; i < chain.points.length; i++) {
      const k = `${chain.state}#${pair(chain.points[i - 1]!, chain.points[i]!)}`;
      assert.ok((wanted.get(k) ?? 0) > 0, 'odcinek spoza granic albo w złym kolorze');
      wanted.set(k, wanted.get(k)! - 1);
      segments++;
    }
  }
  assert.equal(segments, visible);
  assert.equal(visible, grid.seaBorderStart, 'bez konstruktu na morzu — widać dokładnie granice lądu i lodu');
  // Linii jest dużo mniej niż odcinków (stąd szybsze rysowanie).
  assert.ok(chains.length < grid.borders.length / 5, `${chains.length} linii na ${grid.borders.length} odcinków`);
  assert.ok(chains.some((c) => c.state === 'taken'));
});
