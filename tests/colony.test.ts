import assert from 'node:assert/strict';
import { test } from 'node:test';
import { generatePlanet } from '../src/core/generation/generatePlanet.ts';
import type { BuildingId } from '../src/core/types.ts';
import { PLANET_DEFINITIONS } from '../src/data/planets.ts';
import { fieldGrid } from '../src/core/colony/fieldGrid.ts';
import { reconcilePlots } from '../src/core/colony/plots.ts';
import { angleBetween, cellLookup, layoutFromPlots, offsetOnSphere } from '../src/planet-renderer/colony.ts';
import { complexGround, pitDepth, pitDepthMax, pitSink3d } from '../src/planet-renderer/complexLook.ts';
import { facingAngles } from '../src/planet-renderer/PlanetDisplay.ts';
import { createSurfaceSampler } from '../src/planet-renderer/surface.ts';

const IDS: BuildingId[] = ['metalMine', 'crystalMine', 'powerPlant', 'storage', 'antimatterCollector'];

test('offsetOnSphere zachowuje odległość kątową', () => {
  const c: [number, number, number] = [0, 0.6, 0.8];
  for (const d of [0.01, 0.1, 0.5]) assert.ok(Math.abs(angleBetween(c, offsetOnSphere(c, 1.3, d)) - d) < 1e-9);
});

for (const def of PLANET_DEFINITIONS) {
  test(`kolonia: ${def.id} — jeden kompleks na budynek, środek w obszarze, deterministyczna, na lądzie (v0.45)`, () => {
    for (const seed of ['PF-COL-1', 'PF-COL-2']) {
      const planet = generatePlanet(def, seed);
      const grid = fieldGrid(planet);
      const levels = { metalMine: 8, crystalMine: 6, powerPlant: 3, storage: 2, antimatterCollector: 1, laboratory: 0 };
      const plots = reconcilePlots(grid, {}, levels, IDS);
      const sampler = createSurfaceSampler(planet);
      const a = layoutFromPlots(grid, plots, sampler, IDS, levels);
      assert.deepEqual(a, layoutFromPlots(grid, plots, createSurfaceSampler(planet), IDS, levels));
      for (const id of IDS) {
        const c = a.complexes.find((x) => x.building === id);
        const cells = plots[id] ?? [];
        if (cells.length === 0) {
          assert.equal(c, undefined);
          continue;
        }
        assert.ok(c, id);
        assert.deepEqual(c.cells, cells);
        assert.equal(c.spots.length, cells.length, 'miejsce zabudowy na każdym polu');
        assert.equal(c.spots[0]!.t, Math.min(...c.spots.map((s) => s.t)), 'pierwsze miejsce — środek');
        assert.ok(c.spots.every((s) => s.r > 0 && s.r === grid.cells[s.cell]!.radius), 'promień pola przy każdym miejscu (modele 3D, v0.47)');
        for (const cell of cells) {
          assert.equal(a.owner[cell], a.complexes.indexOf(c));
          const kind = grid.cells[cell]!.kind;
          assert.ok(kind === 'land' || (id === 'crystalMine' && kind === 'ice'), `${seed} ${id}: kompleks na ${kind}`);
        }
        assert.ok(c.surface >= 1 && c.surface < 1.1);
        assert.ok(c.radius > 0 && c.radius < 1.5);
      }
    }
  });
}

test('mapa „punkt → pole” zgadza się z siatką pól (v0.45)', () => {
  const planet = generatePlanet(PLANET_DEFINITIONS[0]!, 'PF-LOOKUP');
  const grid = fieldGrid(planet);
  const lookup = cellLookup(grid);
  let hits = 0;
  grid.samples.forEach((p, i) => {
    if (lookup(...p) === grid.owner[i]) hits++;
  });
  assert.ok(hits / grid.samples.length > 0.9, `zgodnych ${hits} z ${grid.samples.length}`);
});

test('grunt kompleksu (v0.45): odkrywka kryształów schodzi tarasami w głąb, w środku dno; kolory w zakresie 0..1', () => {
  const planet = generatePlanet(PLANET_DEFINITIONS[0]!, 'PF-PIT');
  const grid = fieldGrid(planet);
  const levels = { metalMine: 13, crystalMine: 13, powerPlant: 0, storage: 0, antimatterCollector: 0, laboratory: 0 };
  const plots = reconcilePlots(grid, {}, levels, IDS);
  const layout = layoutFromPlots(grid, plots, createSurfaceSampler(planet), IDS, levels);
  const pit = layout.complexes.find((c) => c.building === 'crystalMine')!;
  assert.equal(pitDepth(pit, pit.core), 1, 'dno odkrywki w środku');
  const edge = offsetOnSphere(pit.core, 0.3, pit.radius * 0.99);
  assert.equal(pitDepth(pit, edge), 0, 'krawędź obszaru — poza odkrywką');
  let last = 1;
  for (let k = 0; k <= 20; k++) {
    const d = pitDepth(pit, offsetOnSphere(pit.core, 0.3, (pit.radius * k) / 20));
    assert.ok(d <= last + 1e-9, 'głębokość maleje od środka');
    last = d;
  }
  for (const c of layout.complexes) {
    for (const s of c.spots) {
      const g = complexGround(c, s.dir);
      for (const v of g.rgb) assert.ok(v >= 0 && v <= 1);
      assert.ok(g.glow >= 0 && g.glow <= 1);
    }
  }
});

test('facingAngles kieruje punkt do kamery (+z)', () => {
  const dir: [number, number, number] = [0.6, 0, -0.8];
  const { yaw } = facingAngles(dir, 0);
  // Obrót wokół Y o yaw: x' = x cos + z sin, z' = -x sin + z cos.
  const x = dir[0] * Math.cos(yaw) + dir[2] * Math.sin(yaw);
  const z = -dir[0] * Math.sin(yaw) + dir[2] * Math.cos(yaw);
  assert.ok(Math.abs(x) < 1e-9 && z > 0.99);
});

test('miejsca zabudowy stoją na suchym lądzie pola, nie w wodzie (v0.26.2)', () => {
  let wet = 0;
  let all = 0;
  for (const def of PLANET_DEFINITIONS) {
    for (const seed of ['1:5:3', 'kepler-x']) {
      const planet = generatePlanet(def, seed);
      const grid = fieldGrid(planet);
      const sampler = createSurfaceSampler(planet);
      const land = grid.cells.map((c, i) => (c.kind === 'land' ? i : -1)).filter((i) => i >= 0);
      const layout = layoutFromPlots(grid, { metalMine: land }, sampler, ['metalMine'], { metalMine: 20 });
      for (const spot of layout.complexes[0]?.spots ?? []) {
        all += 1;
        if (!sampler.isLand(sampler.height(...spot.dir), ...spot.dir)) wet += 1;
      }
    }
  }
  assert.ok(all > 0 && wet / all < 0.01, `w wodzie ${wet} z ${all}`);
});

test('wolne miejsce budowli (v0.47): w promieniu `free` tylko suchy ląd własnego obszaru; 2D bez pomiaru', () => {
  const def = PLANET_DEFINITIONS[0]!;
  const planet = generatePlanet(def, 'PF-FREE-1');
  const grid = fieldGrid(planet);
  const levels = { metalMine: 15, crystalMine: 12, powerPlant: 10, storage: 4, antimatterCollector: 1, laboratory: 0 };
  const plots = reconcilePlots(grid, {}, levels, IDS);
  const sampler = createSurfaceSampler(planet);
  const lookup = cellLookup(grid);
  const layout = layoutFromPlots(grid, plots, sampler, IDS, levels, [], true);
  let measured = 0;
  for (const c of layout.complexes) {
    const own = new Set(c.cells);
    for (const s of c.spots) {
      assert.ok(s.free >= 0 && s.free <= s.r * 1.2 + 1e-9);
      if (s.free === 0) continue;
      measured++;
      for (let a = 0; a < 12; a++) {
        const p = offsetOnSphere(s.dir, (a * Math.PI) / 6, s.free);
        assert.ok(own.has(lookup(...p)), `${c.building}: punkt poza obszarem`);
        const level = Math.max(sampler.height(...p), sampler.lakeLevel(...p));
        assert.ok(sampler.isLand(level), `${c.building}: punkt na wodzie`);
      }
    }
  }
  assert.ok(measured > 0);
  // 2D (bez pomiaru) — ten sam układ, `free` = 0.
  const flat = layoutFromPlots(grid, plots, sampler, IDS, levels);
  assert.deepEqual(
    flat.complexes.map((c) => c.spots.map((s) => s.cell)),
    layout.complexes.map((c) => c.spots.map((s) => s.cell)),
  );
  assert.ok(flat.complexes.every((c) => c.free === 0 && c.spots.every((s) => s.free === 0)));
});

test('wyrobisko kryształów w 3D (v0.47): równa niecka głębsza z poziomem, najgłębiej w środku, 0 poza wyrobiskiem', () => {
  const planet = generatePlanet(PLANET_DEFINITIONS[0]!, 'PF-PIT');
  const grid = fieldGrid(planet);
  let previous = 0;
  for (const level of [1, 6, 12, 20, 30]) {
    const levels = { metalMine: 5, crystalMine: level, powerPlant: 0, storage: 0, antimatterCollector: 0, laboratory: 0 };
    const plots = reconcilePlots(grid, {}, levels, IDS);
    const pit = layoutFromPlots(grid, plots, createSurfaceSampler(planet), IDS, levels).complexes.find((c) => c.building === 'crystalMine')!;
    const floor = pitSink3d(pit, pit.core);
    assert.equal(floor, pitDepthMax(level), `poz. ${level}: dno w środku`);
    assert.ok(floor > previous, `poz. ${level}: głębiej niż na niższym poziomie`);
    previous = floor;
    assert.equal(pitSink3d(pit, offsetOnSphere(pit.core, 0.3, pit.radius * 0.99)), 0, 'skraj obszaru — poza wyrobiskiem');
    let last = Infinity;
    for (let k = 0; k <= 20; k++) {
      const d = pitSink3d(pit, offsetOnSphere(pit.core, 0.3, (pit.radius * k) / 20));
      assert.ok(d <= last + 1e-12, 'płyciej od środka ku krawędzi');
      last = d;
    }
  }
  assert.ok(previous >= 0.1, 'na wysokim poziomie dziura sięga wyraźnie poniżej poziomu morza');
});
