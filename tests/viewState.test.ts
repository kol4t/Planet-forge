import assert from 'node:assert/strict';
import { test } from 'node:test';
import { GameController } from '../src/app/GameController.ts';
import { deserializeEmpire, EMPIRE_KEY } from '../src/core/save/empire.ts';
import { back, breadcrumb, focusObject, focusSystem, levelFor, parseView, planetZoom, resetView, startView, VIEW_RULES, zoomBy } from '../src/core/view/viewState.ts';
import { colonizeNow } from './helpers.ts';

function withMemoryStorage(run: () => void): void {
  const store = new Map<string, string>();
  const original = Object.getOwnPropertyDescriptor(globalThis, 'localStorage');
  Object.defineProperty(globalThis, 'localStorage', {
    configurable: true,
    value: { getItem: (k: string) => store.get(k) ?? null, setItem: (k: string, v: string) => void store.set(k, v), removeItem: (k: string) => void store.delete(k) },
  });
  try {
    run();
  } finally {
    if (original) Object.defineProperty(globalThis, 'localStorage', original);
    else delete (globalThis as { localStorage?: unknown }).localStorage;
  }
}

test('widok (etap B): start na aktywnej planecie — układ z adresu, poziom „obiekt”', () => {
  assert.deepEqual(startView('1:16:4'), { level: 'obiekt', system: 16, object: '1:16:4', zoom: VIEW_RULES.entry.obiekt });
  assert.deepEqual(resetView('1:7:2'), startView('1:7:2'));
  assert.ok(planetZoom(startView('1:1:1')) > VIEW_RULES.planetZoom[0] && planetZoom(startView('1:1:1')) < VIEW_RULES.planetZoom[1]);
  assert.equal(planetZoom({ ...startView('1:1:1'), zoom: VIEW_RULES.max }), VIEW_RULES.planetZoom[1]);
});

test('widok: progi poziomów z histerezą — bez migotania na granicy', () => {
  const h = VIEW_RULES.hysteresis;
  // W górę: próg 2 (układ → obiekt) wymaga 2 + h.
  assert.equal(levelFor(2.01, 'uklad'), 'uklad');
  assert.equal(levelFor(2 + h + 0.001, 'uklad'), 'obiekt');
  // W dół: wyjście z obiektu dopiero poniżej 2 − h.
  assert.equal(levelFor(1.99, 'obiekt'), 'obiekt');
  assert.equal(levelFor(2 - h - 0.001, 'obiekt'), 'uklad');
  // Drganie wokół progu nie zmienia poziomu.
  let level = levelFor(2.2, 'uklad');
  for (const z of [2.03, 1.97, 2.05, 1.95, 2.0]) level = levelFor(z, level);
  assert.equal(level, 'obiekt');
  // Duży skok przez kilka progów.
  assert.equal(levelFor(4, 'galaktyka'), 'powierzchnia');
  assert.equal(levelFor(0.2, 'powierzchnia'), 'galaktyka');
});

test('widok: zoom ciągły przez poziomy, granice, bez obiektu nie wejdzie na planetę', () => {
  let v = startView('1:16:4');
  v = zoomBy(v, 10);
  assert.equal(v.zoom, VIEW_RULES.max);
  assert.equal(v.level, 'powierzchnia');
  v = zoomBy(v, -1.6);
  assert.equal(v.level, 'obiekt');
  v = zoomBy(v, -1.5);
  assert.equal(v.level, 'uklad');
  assert.equal(v.object, null, 'oddalenie do układu odpina obiekt');
  v = zoomBy(v, -10);
  assert.equal(v.zoom, VIEW_RULES.min);
  assert.equal(v.level, 'galaktyka');
  // Bez obiektu przybliżanie zatrzymuje się na poziomie układu.
  v = zoomBy(focusSystem(v, 3), 5);
  assert.equal(v.level, 'uklad');
  assert.ok(v.zoom < VIEW_RULES.thresholds[1] + VIEW_RULES.hysteresis);
  // Dotknięcie obiektu: kamera na nim, układ z adresu.
  v = focusObject(v, '1:3:2');
  assert.deepEqual([v.level, v.system, v.object], ['obiekt', 3, '1:3:2']);
  assert.equal(focusObject(v, 'zły'), v, 'błędny adres — bez zmian');
});

test('widok: „wstecz” i ścieżka nawigacji', () => {
  let v = zoomBy(startView('1:16:4'), 2);
  assert.equal(v.level, 'powierzchnia');
  assert.deepEqual(breadcrumb(v).map((b) => b.label), ['Galaktyka', 'Układ', 'Obiekt']);
  v = back(v);
  assert.equal(v.level, 'obiekt');
  v = back(v);
  assert.deepEqual([v.level, v.object], ['uklad', null]);
  assert.deepEqual(breadcrumb(v).map((b) => b.label), ['Galaktyka', 'Układ']);
  v = back(v);
  assert.equal(v.level, 'galaktyka');
  assert.equal(back(v), v);
});

test('widok: zapis — opcjonalne pole, błędne pomijane, niespójne naprawiane', () => {
  assert.equal(parseView(null), null);
  assert.equal(parseView({ level: 'kosmos', system: 1, zoom: 1 }), null);
  assert.equal(parseView({ level: 'uklad', system: 0, zoom: 1 }), null);
  assert.deepEqual(parseView({ level: 'obiekt', system: 4, object: null, zoom: 2.5 }), { level: 'uklad', system: 4, object: null, zoom: VIEW_RULES.entry.uklad });
  assert.equal(parseView({ level: 'obiekt', system: 4, object: '1:4:2', zoom: 99 })!.zoom, VIEW_RULES.max);
});

test('widok: kontroler — dotknięcie własnej planety zmienia aktywną (switchPlanet), obcej — tylko widok; zapis', () => {
  withMemoryStorage(() => {
    const game = new GameController(0);
    const home = game.address;
    assert.deepEqual(game.view, startView(home));
    const colony = game.system(game.homeSystem)!.planets.find((p) => p.body === 'rocky' && game.occupantAt(p) === 'free')!.address;
    assert.ok(colonizeNow(game, colony, 0).ok);
    assert.ok(game.switchPlanet(0, 0).ok);
    assert.equal(game.view.object, home, 'przejście na planetę — kamera na nią');
    // Dotknięcie własnej kolonii w układzie: aktywna zmienia się przez switchPlanet.
    assert.ok(game.selectObject(colony, 1000).ok);
    assert.equal(game.address, colony);
    assert.deepEqual([game.view.level, game.view.object], ['obiekt', colony]);
    // Obca planeta: tylko widok — aktywna bez zmian.
    const other = game.system(game.homeSystem)!.planets.find((p) => game.slotAt(p.address) < 0)!.address;
    game.selectObject(other, 2000);
    assert.equal(game.address, colony);
    assert.equal(game.view.object, other);
    game.viewBack();
    assert.equal(game.view.level, 'uklad');
    game.save();
    assert.equal(deserializeEmpire(localStorage.getItem(EMPIRE_KEY))!.view?.level, 'uklad');
    const fresh = new GameController(3000);
    assert.equal(fresh.view.level, 'uklad', 'widok wczytany z zapisu');
    assert.deepEqual(fresh.resetView(), startView(colony));
  });
});
