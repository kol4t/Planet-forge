import assert from 'node:assert/strict';
import { ZoomSmoother } from '../src/planet-renderer/input/zoom.ts';
import { test } from 'node:test';
import { generatePlanet } from '../src/core/generation/generatePlanet.ts';
import { PLANET_DEFINITIONS } from '../src/data/planets.ts';
import { GestureTracker, PICK_ZOOM } from '../src/game/ui/gestures.ts';
import { renderDisc } from '../src/planet-renderer/discRenderer.ts';
import { createSurfaceSampler, hexToRgb } from '../src/planet-renderer/surface.ts';

test('jeden palec: obrót (start → ruch → koniec)', () => {
  const g = new GestureTracker();
  assert.deepEqual(g.down(1, 100, 100), [{ type: 'drag-start' }]);
  assert.deepEqual(g.move(1, 130, 95), [{ type: 'drag', dx: 30, dy: -5 }]);
  assert.deepEqual(g.up(1), [{ type: 'drag-end' }]);
  assert.deepEqual(g.move(1, 120, 95), [], 'po podniesieniu palca nic');
});

test('dwa palce: obrót się kończy, rozsunięcie przybliża, ściśnięcie oddala (w granicach)', () => {
  const g = new GestureTracker(1, 3.5);
  g.down(1, 100, 100);
  assert.deepEqual(g.down(2, 200, 100), [{ type: 'drag-end' }]);
  assert.deepEqual(g.move(2, 300, 100), [{ type: 'zoom', zoom: 2 }]);
  assert.deepEqual(g.move(2, 900, 100), [{ type: 'zoom', zoom: 3.5 }], 'maksimum');
  assert.deepEqual(g.move(2, 110, 100), [{ type: 'zoom', zoom: 1 }], 'minimum');
  assert.deepEqual(g.move(1, 101, 100), [], 'bez zmiany = bez zdarzenia');
});

test('palec pozostały po szczypaniu nie obraca planety; nowy dotyk znów obraca', () => {
  const g = new GestureTracker();
  g.down(1, 100, 100);
  g.down(2, 200, 100);
  g.move(2, 300, 100);
  assert.deepEqual(g.up(2), []);
  assert.deepEqual(g.move(1, 150, 100), []);
  assert.deepEqual(g.up(1), []);
  assert.deepEqual(g.down(3, 100, 100), [{ type: 'drag-start' }]);
  assert.equal(g.zoom, 2, 'przybliżenie zostaje');
});

test('kółko myszy (komputer): przybliża i oddala w granicach', () => {
  const g = new GestureTracker(1, 3.5);
  const [zoomIn] = g.wheel(-300);
  assert.ok(zoomIn?.type === 'zoom' && zoomIn.zoom > 1);
  assert.deepEqual(g.wheel(-100000), [{ type: 'zoom', zoom: 3.5 }]);
  assert.deepEqual(g.wheel(100000), [{ type: 'zoom', zoom: 1 }]);
  assert.deepEqual(g.wheel(500), [], 'już na minimum');
});

test('trzeci palec jest ignorowany, anulowanie kończy obrót', () => {
  const g = new GestureTracker();
  g.down(1, 0, 0);
  g.down(2, 10, 0);
  assert.deepEqual(g.down(3, 20, 0), []);
  const solo = new GestureTracker();
  solo.down(1, 0, 0);
  assert.deepEqual(solo.cancel(), [{ type: 'drag-end' }]);
  assert.deepEqual(solo.cancel(), []);
});

test('tarcza 2D/miniatura: deterministyczna, przezroczysta poza kołem, kryjąca w środku', () => {
  for (const def of PLANET_DEFINITIONS) {
    const planet = generatePlanet(def, 'PF-DISC');
    const look = { sampler: createSurfaceSampler(planet), seaLevel: planet.visual.seaLevel, atmosphere: hexToRgb(planet.visual.atmosphereColor) };
    const size = 24;
    const a = new Uint8ClampedArray(size * size * 4);
    const b = new Uint8ClampedArray(size * size * 4);
    renderDisc(a, size, look, 1.2, 0.3);
    renderDisc(b, size, look, 1.2, 0.3);
    assert.deepEqual(a, b, def.id);
    assert.equal(a[3], 0, 'róg przezroczysty');
    const center = ((size / 2) * size + size / 2) * 4;
    assert.equal(a[center + 3], 255, 'środek kryjący');
  }
});

test('krótkie dotknięcie bez przesuwania = tap (wybór budowli)', () => {
  const g = new GestureTracker();
  g.down(1, 100, 100, 0);
  g.move(1, 104, 103);
  assert.deepEqual(g.up(1, 200), [{ type: 'drag-end' }, { type: 'tap', x: 100, y: 100 }]);
  // Przesunięcie palca = obrót, nie tap.
  g.down(1, 100, 100, 0);
  g.move(1, 140, 100);
  assert.deepEqual(g.up(1, 200), [{ type: 'drag-end' }]);
  // Za długie przytrzymanie — nie tap.
  g.down(1, 100, 100, 0);
  assert.deepEqual(g.up(1, 2000), [{ type: 'drag-end' }]);
  // Szczypanie — nie tap.
  g.down(1, 100, 100, 0);
  g.down(2, 200, 100, 10);
  g.up(2, 50);
  assert.deepEqual(g.up(1, 60), []);
});

test('wybór budowli od 80% drogi do maksymalnego przybliżenia', async () => {
  const { PICK_ZOOM, MIN_ZOOM, MAX_ZOOM } = await import('../src/game/ui/gestures.ts');
  assert.equal(PICK_ZOOM, 3);
  assert.ok(PICK_ZOOM > MIN_ZOOM && PICK_ZOOM < MAX_ZOOM);
});

test('przybliżenie: zakres 0,8–3,5, wybór budowli od 3×, przyciski krokiem', () => {
  const g = new GestureTracker();
  assert.equal(PICK_ZOOM, 3);
  assert.deepEqual(g.setZoom(0.5), [{ type: 'zoom', zoom: 0.8 }], 'lekkie oddalenie do 0,8×');
  assert.deepEqual(g.setZoom(0.8), [], 'bez zmiany — bez zdarzenia');
  assert.deepEqual(g.setZoom(10), [{ type: 'zoom', zoom: 3.5 }]);
  g.setZoom(1);
  assert.equal(g.zoom, 1, 'reset widoku');
});

test('płynne przybliżanie: widok dochodzi do celu w ćwierć sekundy, bez przeskoku', () => {
  const z = new ZoomSmoother();
  z.set(3);
  let previous = z.value;
  let t = 0;
  while (z.update(1 / 60)) {
    assert.ok(z.value > previous && z.value <= 3, 'rośnie monotonicznie, bez przestrzelenia');
    previous = z.value;
    t += 1 / 60;
    if (t > 0.25) assert.ok(3 - z.value < 0.15, `po ${t.toFixed(2)} s: ${z.value}`);
  }
  assert.equal(z.value, 3);
  assert.ok(t < 0.6, `animacja trwała ${t} s`);
  z.set(0.1);
  assert.equal(z.target, 0.8);
  z.set(2, true);
  assert.equal(z.value, 2, '„Ogranicz ruch”: od razu');
  assert.equal(z.update(1 / 60), false);
});
