import assert from 'node:assert/strict';
import { test } from 'node:test';
import { filterCount, matchesFilter, systemRows, ZONE_COLORS, type SystemRowInput } from '../src/game/ui/systemTable.ts';

const planet = (position: number, over: Partial<SystemRowInput> = {}): SystemRowInput => ({
  position,
  gas: false,
  occupant: 'free',
  kind: 'skalista',
  richness: { metal: 1, crystal: 1 },
  total: { metal: 1_000_000, crystal: 500_000 },
  ...over,
});

test('mapa: tabela złóż — paski względem najbogatszej planety układu, gazowy olbrzym bez pasków', () => {
  const rows = systemRows(
    [
      planet(1, { total: { metal: 2_000_000, crystal: 250_000 }, occupant: 'you' }),
      planet(2),
      planet(3, { gas: true, kind: 'gazowy olbrzym', total: { metal: 0, crystal: 0 } }),
    ],
    'all',
  );
  assert.deepEqual(rows.map((r) => r.letter), ['b', 'c', 'd']);
  assert.equal(rows[0]!.metal, 1);
  assert.equal(rows[1]!.metal, 0.5);
  assert.equal(rows[1]!.crystal, 1);
  assert.equal(rows[0]!.metalText, '2,0 mln');
  assert.equal(rows[2]!.metal, 0);
  assert.equal(rows[2]!.metalText, '—');
  assert.ok(rows.every((r) => r.match));
});

test('mapa: filtry — wolne (bez gazowych olbrzymów), bogate w metal / kryształy od 120%', () => {
  const list = [
    planet(1, { occupant: 'you', richness: { metal: 1.3, crystal: 0.9 } }),
    planet(2, { richness: { metal: 0.8, crystal: 1.25 } }),
    planet(3, { gas: true }),
    planet(4, { occupant: 'bot', richness: { metal: 1.2, crystal: 1 } }),
  ];
  assert.deepEqual(list.filter((p) => matchesFilter(p, 'free')).map((p) => p.position), [2]);
  assert.deepEqual(list.filter((p) => matchesFilter(p, 'metal')).map((p) => p.position), [1, 4]);
  assert.deepEqual(list.filter((p) => matchesFilter(p, 'crystal')).map((p) => p.position), [2]);
  assert.equal(filterCount(list, 'all'), 4);
  assert.deepEqual(systemRows(list, 'free').map((r) => r.match), [false, true, false, false]);
});

test('mapa: każda strefa temperatury ma barwę', () => {
  for (const zone of ['hot', 'warm', 'temperate', 'cold', 'frozen'] as const) assert.equal(typeof ZONE_COLORS[zone], 'number');
});
