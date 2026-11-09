import assert from 'node:assert/strict';
import test from 'node:test';
import { STATION_MODULES, STATION_SOCKETS, STATION_STAGE_READY } from '../src/data/stationModules.ts';
import { moduleAnchor, pickStationModule, projectStation, rotateStation } from '../src/planet-renderer/stationScreenLayout.ts';
import { socketAngle, stationScreen, stationScreenKey } from '../src/core/station/stationScreen.ts';
import type { HomeStation } from '../src/core/types.ts';

const base: HomeStation = { address: '1:4:6', core: { level: 1, readyAt: 1000 }, stock: { metal: 0, crystal: 0 } };

test('moduły stacji: każde gniazdo zajęte przez jeden moduł, rdzeń w środku', () => {
  const sockets = STATION_MODULES.filter((m) => m.socket !== null && m.socket >= 0).map((m) => m.socket);
  assert.equal(new Set(sockets).size, sockets.length);
  assert.equal(sockets.length, STATION_SOCKETS);
  assert.ok(sockets.every((s) => s! >= 0 && s! < STATION_SOCKETS));
  assert.equal(STATION_MODULES.filter((m) => m.socket === null).map((m) => m.id).join(), 'core');
});

test('ekran stacji: brak stacji = brak modelu; rdzeń w budowie, potem gotowy', () => {
  assert.equal(stationScreen(null, 0), null);
  const building = stationScreen(base, 500)!;
  assert.equal(building.ready, false);
  assert.equal(building.modules.find((m) => m.id === 'core')!.state, 'building');
  const ready = stationScreen(base, 2000)!;
  assert.equal(ready.ready, true);
  assert.equal(ready.modules.find((m) => m.id === 'core')!.state, 'ready');
  assert.equal(ready.modules.find((m) => m.id === 'storage')!.state, 'empty');
  assert.ok(ready.modules.filter((m) => m.stage > STATION_STAGE_READY).every((m) => m.state === 'soon'));
  assert.equal(ready.modules.find((m) => m.id === 'lab')!.state, 'empty');
});

test('ekran stacji: moduł w rozbudowie pokazuje działający poziom i docelowy', () => {
  const s: HomeStation = { ...base, storage: { level: 3, readyAt: 5000 }, shipyard: { level: 1, readyAt: 3000 } };
  const m = stationScreen(s, 4000)!;
  const storage = m.modules.find((x) => x.id === 'storage')!;
  assert.deepEqual([storage.level, storage.state, storage.upgrading], [2, 'building', 3]);
  const yard = m.modules.find((x) => x.id === 'shipyard')!;
  assert.deepEqual([yard.level, yard.state, yard.upgrading], [1, 'ready', null]);
  const first = stationScreen({ ...base, shipyard: { level: 1, readyAt: 9000 } }, 4000)!.modules.find((x) => x.id === 'shipyard')!;
  assert.deepEqual([first.level, first.state, first.upgrading], [0, 'building', 1]);
  assert.notEqual(stationScreenKey(m), stationScreenKey(stationScreen(s, 6000)));
});

test('gniazda rozłożone równo na pierścieniu', () => {
  assert.equal(socketAngle(0), 0);
  assert.ok(Math.abs(socketAngle(STATION_SOCKETS / 2) - Math.PI) < 1e-9);
});



test('ekran stacji: dotknięcie modułu na ekranie wybiera go (2D i perspektywa)', () => {
  const model = stationScreen({ ...base, storage: { level: 2, readyAt: 0 } }, 5000)!;
  for (const view of [{ cx: 500, cy: 400, r: 200 }, { cx: 500, cy: 400, r: 200, perspective: { f: 700, d: 3.5 } }]) {
    for (const yaw of [0, 1.2, -2.5]) {
      for (const m of model.modules) {
        const s = projectStation(rotateStation(moduleAnchor(m), yaw, 0.1), view);
        assert.equal(pickStationModule(model.modules, yaw, 0.1, view, s.x + 3, s.y - 2, 30), m.id, `${m.id} yaw ${yaw}`);
      }
    }
    assert.equal(pickStationModule(model.modules, 0, 0, view, 5, 5, 30), null);
  }
});

test('ekran stacji: obrót zachowuje odległość od środka', () => {
  const p: [number, number, number] = [0.8, 0.1, -0.3];
  const q = rotateStation(p, 0.7, -0.4);
  assert.ok(Math.abs(Math.hypot(...p) - Math.hypot(...q)) < 1e-9);
});
