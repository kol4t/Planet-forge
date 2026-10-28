import assert from 'node:assert/strict';
import { test } from 'node:test';
import { generatePlanet } from '../src/core/generation/generatePlanet.ts';
import { fieldGrid } from '../src/core/colony/fieldGrid.ts';
import { reconcilePlots } from '../src/core/colony/plots.ts';
import type { BuildingId } from '../src/core/types.ts';
import { OPEN_PIT, openPitLook } from '../src/data/openPit.ts';
import { PLANET_DEFINITIONS } from '../src/data/planets.ts';
import { angleBetween, cellLookup, layoutFromPlots, offsetOnSphere, type Vec3 } from '../src/planet-renderer/colony.ts';
import { buildOpenPit, cablePath, oceanCutValue, pitDepthAt, pitRadius, rimAnchor, snapToContours, type OpenPit } from '../src/planet-renderer/openPit.ts';
import { createPitCables, hangingAttachPoints } from '../src/planet-renderer/openPitMeshes.ts';
import { createSurfaceSampler } from '../src/planet-renderer/surface.ts';

const IDS: BuildingId[] = ['metalMine', 'crystalMine', 'powerPlant', 'storage'];

function setup(defId: string, seed: string, crystal: number) {
  const def = PLANET_DEFINITIONS.find((d) => d.id === defId)!;
  const planet = generatePlanet(def, seed);
  const grid = fieldGrid(planet);
  const levels = { metalMine: 6, crystalMine: crystal, powerPlant: 4, storage: 2, antimatterCollector: 0, laboratory: 0 };
  const plots = reconcilePlots(grid, {}, levels, IDS);
  const sampler = createSurfaceSampler(planet);
  const layout = layoutFromPlots(grid, plots, sampler, IDS, levels);
  const c = layout.complexes.find((x) => x.building === 'crystalMine')!;
  const ground = (dir: Vec3) => {
    const level = Math.max(sampler.height(...dir), sampler.lakeLevel(...dir));
    return sampler.isLand(level) ? sampler.radius(level) : 1.001;
  };
  return { grid, layout, c, ground, pit: buildOpenPit(grid, layout, c, ground) };
}

const CASES = PLANET_DEFINITIONS.flatMap((d) => [12, 19, 25].map((level) => ({ id: d.id, level })));

test('wielka odkrywka: tylko etapy Odkrywka i Megaodkrywka (Szyb wiertniczy bez zmian)', () => {
  assert.equal(openPitLook(0), null);
  assert.equal(openPitLook(1), null);
  assert.equal(openPitLook(2), OPEN_PIT[2]);
  assert.equal(openPitLook(3), OPEN_PIT[3]);
  assert.equal(setup('kepler-186f', '1:1:1', 8).pit, null, 'poz. 8 — szyb wiertniczy, bez wielkiej odkrywki');
  assert.equal(setup('kepler-186f', '1:1:1', 19).pit?.look, OPEN_PIT[2]);
  assert.equal(setup('kepler-186f', '1:1:1', 25).pit?.look, OPEN_PIT[3]);
  assert.ok(OPEN_PIT[3].layers > OPEN_PIT[2].layers && OPEN_PIT[3].depth > OPEN_PIT[2].depth, 'megaodkrywka — więcej warstw i głębiej');
});

test('wielka odkrywka: warstwy schodzą monotonicznie w dół, półki i pochyłe zbocza', () => {
  for (const look of Object.values(OPEN_PIT)) {
    const pit = { look, rim: 1.02 };
    let lastDepth = -1;
    let lastRadius = Infinity;
    let flat = 0;
    for (let i = 0; i <= 1000; i++) {
      const s = i / 1000;
      const depth = pitDepthAt(look, s);
      const radius = pitRadius(pit, s, 1.03);
      assert.ok(Number.isFinite(depth) && Number.isFinite(radius));
      assert.ok(depth >= lastDepth - 1e-12, `głębokość niemalejąca (s = ${s})`);
      assert.ok(radius <= lastRadius + 1e-12, `teren nie rośnie w głąb (s = ${s})`);
      if (Math.abs(depth - lastDepth) < 1e-9) flat++;
      lastDepth = depth;
      lastRadius = radius;
    }
    assert.equal(pitDepthAt(look, 0), 0, 'krawędź na poziomie terenu');
    assert.ok(Math.abs(pitDepthAt(look, 1) - look.depth) < 1e-12, 'dno na pełnej głębokości');
    assert.equal(pitRadius(pit, 0, 1.03), 1.03, 'na obrysie teren nietknięty');
    assert.ok(flat > 1000 * look.shelf * 0.8, 'płaskie półki');
    // Zbocze nie jest pionową ścianą: spadek warstwy rozłożony na szerokość zbocza.
    const step = 1 / look.layers;
    const mid = pitDepthAt(look, step * ((1 - look.shelf) / 2));
    assert.ok(mid > 0.1 * (look.depth / look.layers) && mid < 0.9 * (look.depth / look.layers), 'pochyłe zbocze');
  }
});

for (const { id, level } of CASES) {
  test(`wielka odkrywka: ${id}, poz. ${level} — środek w obrysie, kotwice na granicy pól, bez NaN, deterministyczna`, () => {
    const { grid, layout, c, ground, pit } = setup(id, 'PF-PIT-1', level);
    assert.ok(pit);
    const lookup = cellLookup(grid);
    const index = layout.complexes.indexOf(c);
    // Środek (ekstraktor, szyb) wewnątrz obszaru, z zapasem od obrysu większym niż dno.
    // Środek na polu ekstraktora albo w jeziorku otoczonym jego polami (jeziorka są częścią dziury).
    assert.ok(pit.inside(pit.center), 'środek w dziurze');
    const cell = lookup(...pit.center);
    assert.ok(cell < 0 || layout.owner[cell] === index, 'środek na polu ekstraktora');
    assert.ok(pit.centerDistance > 0 && pit.floorAngle < pit.centerDistance, 'dno w środku obrysu');
    assert.equal(pit.s(pit.center), 1);
    assert.ok(pit.rim > 0.9 && pit.floorRadius < pit.rim, 'dno poniżej krawędzi');
    // Kotwice: na obrysie, rozłożone dookoła, a między środkiem a kotwicą — dziura.
    const anchors = Array.from({ length: pit.look.cables }, (_, k) => rimAnchor(pit, (k * Math.PI * 2) / pit.look.cables));
    for (const a of anchors) {
      assert.ok(a.every(Number.isFinite));
      assert.ok(pit.distance(a) < 1e-3, `kotwica na granicy pól (${pit.distance(a)})`);
      assert.ok(angleBetween(pit.center, a) > pit.floorAngle, 'kotwica poza dnem');
    }
    // Próbki: s w [0, 1], 0 poza obszarem; wygładzanie nie daje NaN ani dalekich skoków.
    for (let i = 0; i < 400; i++) {
      const p = offsetOnSphere(pit.center, i * 2.39996, (pit.reach + 0.1) * Math.sqrt((i + 0.5) / 400));
      const s = pit.s(p);
      assert.ok(Number.isFinite(s) && s >= 0 && s <= 1);
      if (!pit.inside(p)) assert.equal(s, 0);
      const q = snapToContours(pit, p);
      assert.ok(q.every(Number.isFinite) && Math.abs(Math.hypot(...q) - 1) < 1e-9);
      assert.ok(angleBetween(p, q) < 0.0125, 'dosunięcie najwyżej o pół ścianki');
      assert.ok(Number.isFinite(pitRadius(pit, s, ground(p))));
    }
    // Tafla oceanu wycięta w dziurze, nie poza nią.
    assert.ok(oceanCutValue(pit, pit.center) > 0);
    let outside = 0;
    for (let i = 0; i < 200; i++) {
      const p = offsetOnSphere(pit.center, i * 2.39996, Math.PI * Math.sqrt((i + 0.5) / 200));
      if (pit.inside(p) || pit.distance(p) < 0.02) continue;
      assert.ok(oceanCutValue(pit, p) < 0, 'poza dziurą tafla zostaje');
      outside++;
    }
    assert.ok(outside > 0);
    // Deterministyczna z układu pól.
    const again = buildOpenPit(grid, layout, c, ground)!;
    assert.deepEqual(again.center, pit.center);
    assert.equal(again.rim, pit.rim);
    assert.deepEqual(rimAnchor(again, 1), rimAnchor(pit, 1));
  });
}

function hangingOf(pit: OpenPit) {
  return { dir: pit.center, radius: pit.rim - pit.look.hang * pit.look.depth, size: 0.08, spin: 0.4 };
}

test('liny-rury: od pierścienia ekstraktora do kotew na krawędzi, nad terenem, z lekkim zwisem', () => {
  for (const level of [12, 25]) {
    const { ground, pit } = setup('kepler-186f', '1:1:1', level);
    assert.ok(pit);
    const groundAt = (dir: Vec3) => pitRadius(pit, pit.s(dir), ground(dir));
    const hanging = hangingOf(pit);
    // Ekstraktor nad środkiem dziury, nad dnem, pod poziomem krawędzi.
    assert.ok(hanging.radius > pit.floorRadius && hanging.radius < pit.rim);
    const starts = hangingAttachPoints(hanging, pit.look.cables);
    assert.equal(starts.length, pit.look.cables);
    for (const s of starts) assert.ok(angleBetween(pit.center, s.map((v) => v / Math.hypot(...s)) as Vec3) < pit.floorAngle, 'zaczep nad dnem');
    const cables = createPitCables(pit, hanging, groundAt, false);
    assert.equal(cables.anchors.length, pit.look.cables);
    for (const a of cables.anchors) assert.ok(pit.distance(a) < 1e-3, 'kotwica na obrysie');
    // Kotwice rozłożone dookoła (różne kierunki).
    for (let i = 0; i < cables.anchors.length; i++) {
      for (let j = i + 1; j < cables.anchors.length; j++) assert.ok(angleBetween(cables.anchors[i]!, cables.anchors[j]!) > 0.05);
    }
    const position = cables.object.geometry.getAttribute('position');
    for (let i = 0; i < position.count; i++) assert.ok(Number.isFinite(position.getX(i) + position.getY(i) + position.getZ(i)));
    const path = cablePath(starts[0]!, [...cables.anchors[0]!.map((v) => v * 1.03)] as Vec3, pit.look.sag, 16, groundAt, 0.007);
    for (const p of path) {
      const r = Math.hypot(...p);
      const dir = p.map((v) => v / r) as Vec3;
      assert.ok(r >= groundAt(dir) + 0.007 - 1e-9, 'lina nad terenem');
    }
    // Zwis: środek liny niżej niż prosta między końcami.
    const mid = path[8]!;
    const straight = (Math.hypot(...path[0]!) + Math.hypot(...path[16]!)) / 2;
    assert.ok(Math.hypot(...mid) <= straight + 1e-9);
    cables.object.geometry.dispose();
  }
});
