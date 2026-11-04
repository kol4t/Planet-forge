// v0.69.2: siatka pól przechowywana w przeglądarce — pakowanie bez strat, odrzucanie uszkodzonych danych, podanie gotowej
// siatki do pamięci podręcznej (bez liczenia) i powiadomienie o nowo policzonej siatce.
import assert from 'node:assert/strict';
import { test } from 'node:test';
import { generatePlanet } from '../src/core/generation/generatePlanet.ts';
import { cachedFieldGrid, clearFieldGridCache, ensureSeaBorders, fieldGrid, fieldGridStoreKey, FIELD_GRID_VERSION, onFieldGridBuilt, primeFieldGrid } from '../src/core/colony/fieldGrid.ts';
import { packFieldGrid, unpackFieldGrid } from '../src/core/colony/fieldGridPack.ts';
import { PLANET_DEFINITIONS, STARTER } from '../src/data/planets.ts';

test('siatka pól: spakowana i odczytana jest identyczna (także planety z morzem i lawą)', () => {
  for (const def of [STARTER.definition, ...PLANET_DEFINITIONS.filter((d) => d.id === 'volcanic' || d.id === 'ocean')]) {
    const planet = generatePlanet(def, `PACK-${def.id}`);
    const grid = fieldGrid(planet);
    const back = unpackFieldGrid(structuredClone(packFieldGrid(grid)))!;
    assert.ok(back, def.id);
    const land = { ...grid, borders: grid.borders.slice(0, grid.seaBorderStart), seaBorderStart: grid.seaBorderStart };
    assert.deepEqual(back, land, def.id);
    // Granice pól morza liczone na żądanie — tak samo jak w świeżej siatce.
    ensureSeaBorders(back);
    assert.equal(back.borders.length, grid.borders.length > grid.seaBorderStart ? grid.borders.length : back.borders.length);
  }
});

test('siatka pól: uszkodzone albo z innej wersji dane są odrzucane (gra policzy siatkę od nowa)', () => {
  const grid = fieldGrid(generatePlanet(STARTER.definition, STARTER.seed));
  const packed = packFieldGrid(grid);
  assert.equal(unpackFieldGrid(null), null);
  assert.equal(unpackFieldGrid({ ...packed, version: FIELD_GRID_VERSION + 1 }), null);
  assert.equal(unpackFieldGrid({ ...packed, owner: packed.owner.slice(1) }), null);
  assert.equal(unpackFieldGrid({ ...packed, colonyCenter: 99_999 }), null);
  assert.equal(unpackFieldGrid({ ...packed, members: Int32Array.from(packed.members, () => -5) }), null);
  assert.equal(unpackFieldGrid({ ...packed, samples: [1, 2, 3] }), null);
});

test('siatka pól: gotowa siatka trafia do pamięci bez liczenia; nowo policzona — do słuchacza (zapisu w przeglądarce)', () => {
  const planet = generatePlanet(STARTER.definition, STARTER.seed);
  const packed = packFieldGrid(fieldGrid(planet));
  clearFieldGridCache();
  const built: string[] = [];
  const off = onFieldGridBuilt((p) => built.push(fieldGridStoreKey(p)));
  primeFieldGrid(planet, unpackFieldGrid(packed)!);
  assert.ok(cachedFieldGrid(planet));
  fieldGrid(planet);
  assert.deepEqual(built, [], 'siatka z przechowania nie jest liczona ani zapisywana ponownie');
  clearFieldGridCache();
  fieldGrid(planet);
  assert.deepEqual(built, [fieldGridStoreKey(planet)]);
  off();
});
