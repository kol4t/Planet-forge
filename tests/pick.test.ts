import assert from 'node:assert/strict';
import { test } from 'node:test';
import type { BuildingLevels } from '../src/core/types.ts';
import { fieldGrid } from '../src/core/colony/fieldGrid.ts';
import { reconcilePlots } from '../src/core/colony/plots.ts';
import { generatePlanet } from '../src/core/generation/generatePlanet.ts';
import type { BuildingId } from '../src/core/types.ts';
import { STARTER } from '../src/data/planets.ts';
import { layoutFromPlots } from '../src/planet-renderer/colony.ts';
import { pickComplex, projectPoint, type PickView } from '../src/planet-renderer/pick.ts';
import { facingAngles } from '../src/planet-renderer/PlanetDisplay.ts';
import { createSurfaceSampler } from '../src/planet-renderer/surface.ts';

const ortho: PickView = { cx: 500, cy: 400, yaw: 0, pitch: 0, tilt: 0, projection: { kind: 'ortho', r: 300 } };

test('rzut 2D: środek tarczy, przód widoczny, tył ukryty', () => {
  assert.deepEqual(projectPoint([0, 0, 1], ortho), { x: 500, y: 400, visible: true });
  assert.equal(projectPoint([0, 0, -1], ortho).visible, false);
  const up = projectPoint([0, 1, 0], { ...ortho, pitch: 0.5 });
  assert.ok(up.visible && up.y < 400, 'pochylenie pokazuje biegun północny u góry');
});

test('rzut 2D zgodny z rysowaniem budowli w CanvasPlanetFallback (obrót, potem pochylenie)', () => {
  const [yaw, pitch] = [0.7, -0.3];
  const p: [number, number, number] = [0.3, 0.4, 0.866];
  const cy = Math.cos(yaw), sy = Math.sin(yaw), cp = Math.cos(pitch), sp = Math.sin(pitch);
  const sx = p[0] * cy + p[2] * sy;
  const hz = -p[0] * sy + p[2] * cy;
  const got = projectPoint(p, { ...ortho, yaw, pitch });
  assert.ok(Math.abs(got.x - (500 + sx * 300)) < 1e-9);
  assert.ok(Math.abs(got.y - (400 - (p[1] * cp - hz * sp) * 300)) < 1e-9);
});

test('perspektywa 3D: środek planety w punkcie ostrości, punkty boczne bliżej środka niż w rzucie prostokątnym', () => {
  const persp: PickView = { ...ortho, projection: { kind: 'perspective', f: 1200, d: 4 } };
  const c = projectPoint([0, 0, 1], persp);
  assert.equal(c.x, 500);
  assert.equal(c.visible, true);
  assert.equal(projectPoint([0, 0, -1], persp).visible, false);
  assert.equal(projectPoint([1, 0, 0], persp).visible, false, 'krawędź widoczna z bliska tylko z przodu');
});

test('wybór (v0.45): dotknięcie dowolnego miejsca obszaru kompleksu wybiera budynek; pusty teren i druga strona — nic', () => {
  const planet = generatePlanet(STARTER.definition, STARTER.seed);
  const grid = fieldGrid(planet);
  const ids: BuildingId[] = ['metalMine', 'crystalMine'];
  const levels = { metalMine: 12, crystalMine: 6 } as BuildingLevels;
  const plots = reconcilePlots(grid, {}, levels, ids);
  const colony = layoutFromPlots(grid, plots, createSurfaceSampler(planet), ids, levels);
  const metal = colony.complexes.find((c) => c.building === 'metalMine')!;
  // Planeta obrócona tak, że środek huty jest w środku tarczy.
  const { yaw, pitch } = facingAngles(metal.core, 0, 0);
  const view = { ...ortho, yaw, pitch };
  for (const spot of metal.spots) {
    const p = projectPoint(spot.dir, view);
    if (!p.visible) continue;
    assert.equal(pickComplex(colony, grid, view, p.x + 3, p.y - 2)?.id, 'metalMine', 'każde pole obszaru');
  }
  assert.equal(pickComplex(colony, grid, view, 2000, 2000), null, 'poza planetą');
  // Druga strona planety: środek huty niewidoczny.
  const back = { ...view, yaw: yaw + Math.PI };
  const c = projectPoint(metal.core, back);
  assert.equal(c.visible, false);
});

test('pokazanie budowli: przy nachylonej osi (3D) i lift 0 budowla trafia dokładnie w środek tarczy', async () => {
  const { facingAngles } = await import('../src/planet-renderer/PlanetDisplay.ts');
  for (const tilt of [0, 0.2, 0.45]) {
    for (const dir of [[0.3, 0.5, -0.81], [-0.9, -0.2, 0.39], [0.1, 0.95, 0.29]] as const) {
      const len = Math.hypot(...dir);
      const p: [number, number, number] = [dir[0] / len, dir[1] / len, dir[2] / len];
      // Bez obrotu wokół osi widzenia punkt blisko bieguna przy dużym nachyleniu da się tylko zbliżyć do środka.
      if (Math.abs(p[1] * Math.tan(tilt)) > Math.hypot(p[0], p[2])) continue;
      const { yaw, pitch } = facingAngles(p, tilt, 0);
      const s = projectPoint(p, { ...ortho, yaw, pitch, tilt });
      assert.ok(Math.abs(s.x - ortho.cx) < 1e-6 && Math.abs(s.y - ortho.cy) < 1e-6, `tilt ${tilt}: ${s.x}, ${s.y}`);
      assert.ok(s.visible);
    }
  }
});
