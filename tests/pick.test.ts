import assert from 'node:assert/strict';
import { test } from 'node:test';
import type { BuildingLevels } from '../src/core/types.ts';
import type { ColonyLayout, ColonySlot } from '../src/planet-renderer/colony.ts';
import { pickStructure, pickStructureHit, projectPoint, type PickView } from '../src/planet-renderer/pick.ts';

const slot = (dir: [number, number, number]): ColonySlot => ({ dir, surface: 1.02, spin: 0, size: 1, onLand: true });
const colony: ColonyLayout = {
  center: [0, 0, 1],
  slots: {
    metalMine: [slot([0, 0, 1]), slot([0.2, 0, 0.98])],
    crystalMine: [slot([0, 0, -1])],
    powerPlant: [slot([-0.3, 0.1, 0.95])],
    storage: [],
    antimatterCollector: [slot([0.5, 0, 0.87])],
    laboratory: [],
  },
};
const levels = { metalMine: 2, crystalMine: 1, powerPlant: 1, storage: 1, antimatterCollector: 0, laboratory: 0 } as BuildingLevels;
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

test('wybór: najbliższa widoczna budowla w promieniu dotyku', () => {
  assert.equal(pickStructure(colony, levels, ortho, 503, 402), 'metalMine');
  const power = projectPoint([-0.3, 0.1, 0.95], ortho);
  assert.equal(pickStructure(colony, levels, ortho, power.x + 5, power.y), 'powerPlant');
  assert.equal(pickStructure(colony, levels, ortho, 900, 100), null, 'pusty kosmos');
  // Trafienie wskazuje konkretną budowlę (numer w dzielnicy) — kamera może do niej podjechać.
  const hit = pickStructureHit(colony, levels, ortho, power.x + 5, power.y);
  assert.equal(hit?.id, 'powerPlant');
  assert.ok(hit && hit.index >= 0 && colony.slots.powerPlant[hit.index]);
  // Kolektor ma poziom 0 — jego budowli nie ma na planecie.
  const collector = projectPoint([0.5, 0, 0.87], ortho);
  assert.notEqual(pickStructure(colony, levels, ortho, collector.x, collector.y), 'antimatterCollector');
  // Ekstraktor jest po drugiej stronie; po obrocie o 180° widać go.
  assert.equal(pickStructure(colony, levels, { ...ortho, yaw: Math.PI }, 500, 400), 'crystalMine');
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
