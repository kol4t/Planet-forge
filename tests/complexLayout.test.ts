import assert from 'node:assert/strict';
import { test } from 'node:test';
import { GameController } from '../src/app/GameController.ts';
import { fieldGrid, type FieldGrid, type Vec3 } from '../src/core/colony/fieldGrid.ts';
import {
  canBuildConstruct,
  chooseMetalCenter,
  complexLayout,
  constructThreshold,
  ensureMetalComplex,
  metalComplexFields,
  parseMetalComplex,
  type MetalComplexLayout,
} from '../src/core/colony/complexLayout.ts';
import { generatePlanet } from '../src/core/generation/generatePlanet.ts';
import { deserializeEmpire, EMPIRE_KEY } from '../src/core/save/empire.ts';
import { exportSave } from '../src/core/save/transfer.ts';
import { PLANET_DEFINITIONS, STARTER } from '../src/data/planets.ts';

const starter = generatePlanet(STARTER.definition, STARTER.seed);
const grid = fieldGrid(starter);

/** Typ punktu mapy najbliżej `p` (to samo kryterium „ląd” co w module). */
function kindAt(g: FieldGrid, p: Vec3): string {
  let best = -1;
  let bestDot = -Infinity;
  g.samples.forEach((q, i) => {
    const d = q[0] * p[0] + q[1] * p[1] + q[2] * p[2];
    if (d > bestDot) {
      bestDot = d;
      best = i;
    }
  });
  return g.kinds[best]!;
}

const allPoints = (l: MetalComplexLayout): Vec3[] => [
  l.center,
  ...l.obiekty.map((o) => o.pozycja),
  ...l.drogi.flatMap((d) => d.points),
  ...l.pasy.flatMap((p) => p.points),
];

const count = (l: MetalComplexLayout, typ: string) => l.obiekty.filter((o) => o.typ === typ).length;

test('kompleks metalu: liczba i typy obiektów zgodne z tabelą (poz. 1, 3, 9, 10, 20, 40)', () => {
  const table: [number, number, number, number[], number][] = [
    // poziom, kopalnie, fabryki, poziomy kopalń, drogi
    [1, 1, 0, [1], 0],
    [3, 1, 0, [3], 0],
    [9, 3, 0, [3, 3, 3], 0],
    [10, 3, 1, [3, 3, 3], 3],
    [20, 6, 2, [3, 3, 3, 3, 3, 3], 6],
    [40, 12, 4, Array(12).fill(3), 12],
  ];
  for (const [level, mines, factories, mineLevels, roads] of table) {
    const l = complexLayout(grid, starter.seed, level, 'osady');
    assert.equal(count(l, 'kopalnia'), mines, `poz. ${level}: kopalnie`);
    assert.equal(count(l, 'fabryka'), factories, `poz. ${level}: fabryki`);
    assert.equal(count(l, 'megakonstrukt'), 0, `poz. ${level}: bez konstruktu w fazie osad`);
    assert.deepEqual(l.obiekty.filter((o) => o.typ === 'kopalnia').map((o) => o.poziom), mineLevels, `poz. ${level}: poziomy kopalń`);
    assert.equal(l.drogi.length, roads, `poz. ${level}: drogi`);
    assert.equal(l.pasy.length, 0);
  }
  // Pośrednie poziomy: kopalnia 2 rośnie od poz. 4, fabryka dopiero na 10.
  assert.deepEqual(complexLayout(grid, starter.seed, 5, 'osady').obiekty.map((o) => [o.slotId, o.poziom]), [
    ['osada1.kopalnia1', 3],
    ['osada1.kopalnia2', 2],
  ]);
  assert.equal(complexLayout(grid, starter.seed, 0, 'osady').obiekty.length, 0);
});

test('kompleks metalu: pola robocze — komplet osad = 20 pól (próg megakonstruktu), konstrukt 4 pola', () => {
  assert.equal(constructThreshold(), 20);
  assert.equal(metalComplexFields(1, 'osady'), 1);
  assert.equal(metalComplexFields(10, 'osady'), 5);
  assert.equal(metalComplexFields(40, 'osady'), 20);
  assert.equal(metalComplexFields(40, 'konstrukt'), 24);
  assert.equal(canBuildConstruct(39), false);
  assert.equal(canBuildConstruct(40), true);
});

test('kompleks metalu: układ „konstrukt” ma konstrukt w środku, 4 fabryki i 12 pasów', () => {
  const l = complexLayout(grid, starter.seed, 40, 'konstrukt');
  assert.equal(count(l, 'megakonstrukt'), 1);
  assert.equal(count(l, 'fabryka'), 4);
  assert.equal(count(l, 'kopalnia'), 12);
  assert.equal(l.pasy.length, 12);
  for (let s = 1; s <= 4; s++) assert.equal(l.pasy.filter((p) => p.factory === `osada${s}.fabryka`).length, 3);
  const construct = l.obiekty.find((o) => o.typ === 'megakonstrukt')!;
  assert.ok(construct.wytrzymalosc > Math.max(...l.obiekty.filter((o) => o.typ !== 'megakonstrukt').map((o) => o.wytrzymalosc)), 'konstrukt bardzo wytrzymały');
  // Konstrukt bliżej środka niż fabryki, fabryki bliżej niż kopalnie (układ promienisty).
  const dist = (p: Vec3) => Math.acos(Math.min(1, p[0] * l.center[0] + p[1] * l.center[1] + p[2] * l.center[2]));
  const maxFactory = Math.max(...l.obiekty.filter((o) => o.typ === 'fabryka').map((o) => dist(o.pozycja)));
  const minMine = Math.min(...l.obiekty.filter((o) => o.typ === 'kopalnia').map((o) => dist(o.pozycja)));
  assert.ok(dist(construct.pozycja) < maxFactory && maxFactory < minMine);
});

test('kompleks metalu: deterministyczny, stałe sloty, wszystko „aktywne”', () => {
  const a = complexLayout(grid, starter.seed, 40, 'osady');
  const b = complexLayout(fieldGrid(generatePlanet(STARTER.definition, STARTER.seed)), starter.seed, 40, 'osady');
  assert.deepEqual(a, b);
  // Ten sam slot = to samo miejsce na kolejnych poziomach.
  const low = complexLayout(grid, starter.seed, 10, 'osady');
  for (const o of low.obiekty) assert.deepEqual(o.pozycja, a.obiekty.find((x) => x.slotId === o.slotId)!.pozycja, o.slotId);
  assert.ok(a.obiekty.every((o) => o.stan === 'aktywny'));
  assert.equal(new Set(a.obiekty.map((o) => o.slotId)).size, a.obiekty.length, 'slotId bez powtórzeń');
  // Zapisany stan obiektu przechodzi do układu (pod przyszłe zniszczenia).
  const hurt = complexLayout(grid, starter.seed, 40, 'osady', { center: a.center, states: { 'osada1.fabryka': { stan: 'zniszczony', wytrzymalosc: 0 } } });
  assert.equal(hurt.obiekty.find((o) => o.slotId === 'osada1.fabryka')!.stan, 'zniszczony');
});

test('kompleks metalu: wszystkie obiekty na lądzie, bez NaN — na planetach każdego typu', () => {
  for (const def of PLANET_DEFINITIONS) {
    for (const seed of ['1:3:4', '1:57:2']) {
      const planet = generatePlanet(def, seed);
      const g = fieldGrid(planet);
      for (const phase of ['osady', 'konstrukt'] as const) {
        const l = complexLayout(g, planet.seed, 40, phase);
        for (const p of allPoints(l)) {
          assert.ok(p.every((v) => Number.isFinite(v)), `${def.id} ${seed} ${phase}: NaN`);
          assert.ok(Math.abs(Math.hypot(...p) - 1) < 1e-6, 'punkt na sferze jednostkowej');
        }
        for (const o of l.obiekty) assert.equal(kindAt(g, o.pozycja), 'land', `${def.id} ${seed} ${phase}: ${o.slotId} poza lądem`);
        assert.ok(Number.isFinite(l.rotation) && l.scale > 0);
      }
    }
  }
});

test('kompleks metalu: zapis — walidacja i migracja środka (deterministyczna, na lądzie)', () => {
  assert.equal(parseMetalComplex(null), null);
  assert.equal(parseMetalComplex({ center: [0, 0, 5], phase: 'osady' }), null);
  assert.equal(parseMetalComplex({ center: [0, NaN, 1] }), null);
  const parsed = parseMetalComplex({ center: [0, 0, 1], phase: 'zły', states: { 'osada1.kopalnia1': { stan: 'w_odbudowie', wytrzymalosc: 40 }, obcy: { stan: 'aktywny', wytrzymalosc: 1 } } });
  assert.deepEqual(parsed, { center: [0, 0, 1], phase: 'osady', states: { 'osada1.kopalnia1': { stan: 'w_odbudowie', wytrzymalosc: 40 } } });
  const a = ensureMetalComplex(undefined, grid, starter.seed, 5, []);
  const b = ensureMetalComplex(undefined, grid, starter.seed, 5, []);
  assert.deepEqual(a, b);
  assert.equal(a!.phase, 'osady');
  assert.equal(kindAt(grid, a!.center), 'land');
  assert.equal(ensureMetalComplex(undefined, grid, starter.seed, 0), undefined, 'bez kopalni — bez kompleksu');
  assert.equal(ensureMetalComplex(a, grid, starter.seed, 5, [1, 2]), a, 'zapisany środek się nie zmienia');
  assert.equal(kindAt(grid, chooseMetalCenter(grid, starter.seed, [grid.colonyCenter])), 'land');
});

const decode = (text: string) => new TextDecoder().decode(Uint8Array.from(atob(text.slice(4)), (c) => c.charCodeAt(0)));

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

test('kompleks metalu: migracja starego zapisu (import PF2 bez pola metalComplex) — ten sam środek, zapis go zachowuje', () => {
  withMemoryStorage(() => {
    const game = new GameController(0);
    const fresh = game.metalComplexState();
    assert.ok(fresh, 'nowa gra dostaje kompleks');
    // Stary zapis: bez pola metalComplex.
    const data = deserializeEmpire(decode(game.exportSave(0)))!;
    assert.deepEqual(data.slots[0]!.metalComplex, fresh, 'nowe pole jest w zapisie');
    for (const slot of data.slots) delete slot.metalComplex;
    const old = exportSave(data);
    const other = new GameController(0);
    assert.equal(other.importSave(old, 1000).ok, true);
    const migrated = other.metalComplexState();
    assert.deepEqual(migrated, fresh, 'środek wybrany automatycznie i deterministycznie');
    // Po migracji pole trafia do zapisu i wczytuje się bez zmian.
    const again = deserializeEmpire(decode(other.exportSave(1000)));
    assert.deepEqual(again?.slots[0]?.metalComplex, fresh);
    assert.ok(localStorage.getItem(EMPIRE_KEY));
  });
});
