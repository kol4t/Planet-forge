// Kompleks kopalni metalu, etap 2 (osady na planecie): pola z modelu, rezerwacja dzielnicy, migracja, wybór środka,
// wygląd (bez nachodzenia, LOD, drogi, cele dotyku, następny obiekt).
import assert from 'node:assert/strict';
import { test } from 'node:test';
import { GameController } from '../src/app/GameController.ts';
import { fieldGrid, type FieldGrid, type Vec3 } from '../src/core/colony/fieldGrid.ts';
import { chooseMetalCenter, complexLayout, metalComplexCells, metalComplexFields } from '../src/core/colony/complexLayout.ts';
import { fieldsFor } from '../src/core/economy/footprint.ts';
import { generatePlanet } from '../src/core/generation/generatePlanet.ts';
import { EMPIRE_KEY } from '../src/core/save/empire.ts';
import { PLANET_DEFINITIONS, STARTER } from '../src/data/planets.ts';
import { METAL_LOOK, metalPickTargets, metalPieces, mineDetail, nextMetalObject, roadSegments } from '../src/planet-renderer/metalComplexMeshes.ts';

function withMemoryStorage(run: () => void): void {
  const store = new Map<string, string>();
  const original = Object.getOwnPropertyDescriptor(globalThis, 'localStorage');
  Object.defineProperty(globalThis, 'localStorage', {
    configurable: true,
    value: {
      getItem: (k: string) => store.get(k) ?? null,
      setItem: (k: string, v: string) => void store.set(k, v),
      removeItem: (k: string) => void store.delete(k),
    },
  });
  try {
    run();
  } finally {
    if (original) Object.defineProperty(globalThis, 'localStorage', original);
    else delete (globalThis as { localStorage?: unknown }).localStorage;
  }
}

const angle = (a: Vec3, b: Vec3) => Math.acos(Math.min(1, Math.max(-1, a[0] * b[0] + a[1] * b[1] + a[2] * b[2])));

test('pola kopalni metalu z modelu osad: obszar = pola obiektów, rośnie jak model, inne budynki nie stają w dzielnicy', () => {
  withMemoryStorage(() => {
    const game = new GameController(0);
    for (const level of [1, 4, 10, 25, 40]) {
      game.economy = { ...game.economy, levels: { ...game.economy.levels, metalMine: level, crystalMine: 12, powerPlant: 12, storage: 10, laboratory: 6 } };
      const { grid, plots, metalComplex } = game.colony();
      assert.equal(plots.metalMine!.length, fieldsFor('metalMine', level), `poz. ${level}: pola z modelu`);
      assert.equal(fieldsFor('metalMine', level), metalComplexFields(level, 'osady'));
      const district = metalComplexCells(grid, game.planet.seed, metalComplex!.center, level);
      const reserved = new Set(district.reserved);
      for (const id of ['crystalMine', 'powerPlant', 'storage', 'laboratory'] as const) {
        for (const c of plots[id] ?? []) assert.ok(!reserved.has(c), `poz. ${level}: ${id} w dzielnicy (pole ${c})`);
      }
      // Plac w środku też zarezerwowany.
      const center = district.reserved.find((c) => grid.cells[c]!.members.some((m) => angle(grid.samples[m]!, metalComplex!.center) < 1e-9));
      assert.ok(center !== undefined || district.reserved.length > district.cells.length, 'plac w rezerwie');
      assert.ok(game.fields.used <= game.fields.buildable);
    }
  });
});

test('migracja: stary zapis z kopalnią metalu poz. 25 i 50 polami — pola wracają do puli, poziom i reszta bez zmian', () => {
  withMemoryStorage(() => {
    const game = new GameController(0);
    game.economy = { ...game.economy, levels: { ...game.economy.levels, metalMine: 25, storage: 6 } };
    game.save();
    const data = JSON.parse(localStorage.getItem(EMPIRE_KEY)!);
    const grid = fieldGrid(game.planet);
    // Stary układ: 50 pól lądu dla kopalni metalu, bez kompleksu w zapisie.
    const land = grid.cells.map((c, i) => (i < grid.seaCellStart && c.kind === 'land' ? i : -1)).filter((i) => i >= 0);
    data.slots[0].plots = { ...data.slots[0].plots, metalMine: land.slice(0, 50) };
    delete data.slots[0].metalComplex;
    delete data.slots[0].fields;
    localStorage.setItem(EMPIRE_KEY, JSON.stringify(data));
    const loaded = new GameController(0);
    assert.equal(loaded.economy.levels.metalMine, 25, 'poziom bez zmian');
    assert.equal(loaded.economy.levels.storage, 6);
    const { plots, metalComplex } = loaded.colony();
    assert.ok(metalComplex, 'kompleks wybrany przy wczytaniu');
    assert.equal(plots.metalMine!.length, metalComplexFields(25, 'osady'), 'zamiast 50 pól — 12 z modelu');
    assert.ok(loaded.fields.used < 50, `pola zajęte: ${loaded.fields.used}`);
    // Kolejny poziom ma miejsce w dzielnicy (bez blokady „brak pól”).
    loaded.economy = { ...loaded.economy, levels: { ...loaded.economy.levels, storage: 30 }, stock: { metal: 1e9, crystal: 1e9 } };
    const up = loaded.upgrade('metalMine', 0);
    assert.ok(up.ok, up.message);
  });
});

/** Dawny wybór środka (etap 1, bez dopasowania układu): pole lądu z największą ilością lądu w promieniu dzielnicy. */
function oldCenter(grid: FieldGrid): Vec3 {
  const land: number[] = [];
  for (let i = 0; i < grid.seaCellStart; i++) if (grid.cells[i]!.kind === 'land') land.push(i);
  let unit = 0;
  for (const i of land) unit += grid.cells[i]!.radius;
  unit /= land.length;
  const reach = Math.cos(unit * 4.5);
  let best = land[0]!;
  let bestScore = -Infinity;
  for (const i of land) {
    const c = grid.cells[i]!;
    let around = 0;
    for (const j of land) if (grid.cells[j]!.center[0] * c.center[0] + grid.cells[j]!.center[1] * c.center[1] + grid.cells[j]!.center[2] * c.center[2] >= reach) around++;
    const score = around + (c.terrain === 'hill' || c.terrain === 'mountain' ? 1.5 : 0);
    if (score > bestScore) {
      bestScore = score;
      best = i;
    }
  }
  return grid.cells[best]!.center;
}

test('nowy wybór środka: układ w większej skali niż przy dawnym wyborze (bez zwężania poniżej 70%)', () => {
  let oldSum = 0;
  let newSum = 0;
  for (const d of PLANET_DEFINITIONS) {
    for (const seed of ['A1', 'D4']) {
      const planet = generatePlanet(d, seed);
      const grid = fieldGrid(planet);
      const before = complexLayout(grid, planet.seed, 40, 'osady', { center: oldCenter(grid) }).scale;
      const after = complexLayout(grid, planet.seed, 40, 'osady', { center: chooseMetalCenter(grid, planet.seed) }).scale;
      assert.ok(after >= 0.7 - 1e-9, `${d.id} ${seed}: skala ${after}`);
      oldSum += before;
      newSum += after;
    }
  }
  assert.ok(newSum > oldSum, `średnio więcej: ${newSum.toFixed(2)} > ${oldSum.toFixed(2)}`);
});

test('wygląd osad: bez nachodzenia płyt, drogi od kopalni do fabryki, cele dotyku, LOD i następny obiekt', () => {
  const planet = generatePlanet(STARTER.definition, STARTER.seed);
  const grid = fieldGrid(planet);
  const center = chooseMetalCenter(grid, planet.seed);
  const layout = complexLayout(grid, planet.seed, 40, 'osady', { center });
  const pieces = metalPieces(layout, false);
  assert.equal(pieces.filter((p) => p.kind === 'mine').length, 12);
  assert.equal(pieces.filter((p) => p.kind === 'factory').length, 4);
  assert.equal(pieces.filter((p) => p.kind === 'plaza').length, 1);
  assert.equal(metalPieces(layout, true).filter((p) => p.kind === 'mega').length, 1, 'megakompleks na placu');
  const plate = { mine: 0.46, factory: 0.5 } as const;
  const objects = pieces.filter((p) => p.kind === 'mine' || p.kind === 'factory');
  for (let i = 0; i < objects.length; i++) {
    for (let j = i + 1; j < objects.length; j++) {
      const a = objects[i]!;
      const b = objects[j]!;
      assert.ok(angle(a.dir, b.dir) >= plate[a.kind as 'mine'] * a.size + plate[b.kind as 'mine'] * b.size - 1e-9, `${a.slotId} × ${b.slotId}`);
    }
  }
  const roads = roadSegments(layout, pieces);
  assert.equal(roads.length, layout.drogi.length * METAL_LOOK.roadSteps);
  for (const r of roads) assert.ok([...r.from, ...r.to].every(Number.isFinite) && r.width > 0);
  const targets = metalPickTargets(layout, false);
  assert.equal(targets.length, pieces.length + roads.length);
  assert.ok(targets.every((t) => t.id === 'metalMine' && t.reach > 0));
  // LOD: z daleka bez kopalń, płynnie do pełnych przy przybliżeniu.
  assert.equal(mineDetail(1), 0);
  assert.equal(mineDetail(3), 1);
  let last = -1;
  for (let z = 1; z <= 2.2; z += 0.05) {
    const d = mineDetail(z);
    assert.ok(d >= last - 1e-12 && d >= 0 && d <= 1);
    last = d;
  }
  // Następny obiekt: poz. 3 → kopalnia 2, poz. 9 → fabryka osady 1, poz. 40 → brak.
  assert.equal(nextMetalObject(grid, planet.seed, center, 'osady', 3)?.slotId, 'osada1.kopalnia2');
  assert.equal(nextMetalObject(grid, planet.seed, center, 'osady', 9)?.slotId, 'osada1.fabryka');
  assert.equal(nextMetalObject(grid, planet.seed, center, 'osady', 40), null);
});
