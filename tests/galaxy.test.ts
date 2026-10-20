import assert from 'node:assert/strict';
import { test } from 'node:test';
import { formatAddress, generateGalaxy, generateSystem, homeCount, parseAddress, starterSystem, zoneFor } from '../src/core/galaxy/galaxy.ts';
import { GALAXY_RULES, STAR_KINDS } from '../src/data/galaxy.ts';
import { findDefinition } from '../src/data/planets.ts';

const galaxy = generateGalaxy(1);

test('galaktyka: 100 układów, deterministycznie, z odstępami i unikalnymi nazwami', () => {
  assert.equal(galaxy.systems.length, GALAXY_RULES.systemCount);
  assert.deepEqual(generateGalaxy(1, { ...GALAXY_RULES }), galaxy, 'ta sama galaktyka za każdym razem');
  assert.equal(new Set(galaxy.systems.map((s) => s.name)).size, galaxy.systems.length);
  let tooClose = 0;
  for (const a of galaxy.systems) {
    assert.ok(Math.hypot(a.x, a.y) <= GALAXY_RULES.radius + 0.5, a.name);
    assert.ok(a.planetCount >= 3 && a.planetCount <= 10, a.name);
    for (const b of galaxy.systems) if (a !== b && Math.hypot(a.x - b.x, a.y - b.y) < GALAXY_RULES.minSpacing * 0.5) tooClose++;
  }
  assert.equal(tooClose, 0, 'układy nie leżą na sobie');
  const kinds = new Set(galaxy.systems.map((s) => s.star));
  assert.ok(kinds.size >= 5, `rodzaje gwiazd: ${[...kinds].join(', ')}`);
});

test('układ: 2 miejsca startowe do 7 planet, 3 przy większych; adresy i typy planet poprawne', () => {
  for (const summary of galaxy.systems) {
    const system = generateSystem(galaxy, summary.index)!;
    assert.equal(system.planets.length, summary.planetCount);
    const homes = system.planets.filter((p) => p.occupant === 'home').length;
    assert.equal(homes, summary.planetCount <= 7 ? 2 : 3, summary.name);
    assert.equal(homes, homeCount(summary.planetCount));
    for (const p of system.planets) {
      assert.equal(p.address, `1:${summary.index}:${p.position}`);
      assert.ok(findDefinition(p.definitionId), p.definitionId);
    }
    // Orbity rosną, temperatura maleje od gwiazdy.
    for (let i = 1; i < system.planets.length; i++) {
      assert.ok(system.planets[i]!.orbit > system.planets[i - 1]!.orbit);
      assert.ok(system.planets[i]!.temperature <= system.planets[i - 1]!.temperature);
    }
  }
});

test('typ planety zależy od gwiazdy i odległości: gorąco → wulkany/pustynie, zimno → lód', () => {
  const all = galaxy.systems.flatMap((s) => generateSystem(galaxy, s.index)!.planets);
  const share = (zone: string, ids: string[]) => {
    const inZone = all.filter((p) => p.zone === zone);
    return inZone.filter((p) => ids.includes(p.definitionId)).length / Math.max(1, inZone.length);
  };
  assert.equal(share('hot', ['volcanic', 'arid']), 1);
  assert.equal(share('frozen', ['ice']), 1);
  assert.equal(zoneFor(2), 'hot');
  assert.equal(zoneFor(1), 'temperate');
  assert.equal(zoneFor(0.1), 'frozen');
  const blue = STAR_KINDS.find((s) => s.id === 'blue-giant')!;
  const hole = STAR_KINDS.find((s) => s.id === 'black-hole')!;
  assert.ok(blue.luminosity > hole.luminosity);
});

test('adresy: zapis i odczyt „1:42:7”, błędne odrzucone', () => {
  assert.deepEqual(parseAddress('1:42:7'), { galaxy: 1, system: 42, position: 7 });
  assert.equal(formatAddress({ galaxy: 1, system: 42, position: 7 }), '1:42:7');
  for (const bad of ['', '1:42', 'a:b:c', '0:1:1', '1:1:0']) assert.equal(parseAddress(bad), null, bad);
});

test('układ startowy ma miejsce startowe i co najmniej 5 wolnych planet', () => {
  const { system, home } = starterSystem(galaxy, 5);
  assert.equal(home.occupant, 'home');
  assert.equal(home.zone, 'temperate');
  assert.ok(system.planets.filter((p) => p.occupant === 'free').length >= 5);
});
