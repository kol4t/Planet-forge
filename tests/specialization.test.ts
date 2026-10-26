import assert from 'node:assert/strict';
import { test } from 'node:test';
import { GameController } from '../src/app/GameController.ts';
import { productionRates } from '../src/core/economy/economy.ts';
import {
  activeSpecializationEffects,
  affinity,
  affinityLabel,
  chooseSpecialization,
  parseSpecialization,
  specializationEffects,
} from '../src/core/economy/specialization.ts';
import { applyResearch } from '../src/core/research/research.ts';
import { deserializeEmpire, EMPIRE_KEY } from '../src/core/save/empire.ts';
import type { OrbitZone, StarKind } from '../src/core/types.ts';
import { BALANCE } from '../src/data/balance.ts';
import { STAR_KINDS } from '../src/data/galaxy.ts';
import { findResearch } from '../src/data/research.ts';
import { findSpecialization, SPECIALIZATION_RULES, SPECIALIZATIONS } from '../src/data/specializations.ts';

const HOUR = 3600_000;
const def = (id: string) => findSpecialization(id)!;

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

test('specjalizacje: 4 robocze, dopasowanie zależy od gwiazdy i strefy orbity', () => {
  assert.deepEqual(SPECIALIZATIONS.map((s) => s.id), ['mining', 'energy', 'science', 'industry']);
  for (const s of SPECIALIZATIONS) assert.equal(s.status, 'robocza');
  const site = (star: StarKind, zone: OrbitZone) => ({ star, zone });
  // Energetyczna: niebieski olbrzym w gorącej strefie — świetnie; czarna dziura w mroźnej — słabo.
  assert.ok(affinity(def('energy'), site('blue-giant', 'hot')) >= 1.9);
  assert.ok(affinity(def('energy'), site('black-hole', 'frozen')) <= 0.5);
  assert.equal(affinityLabel(affinity(def('energy'), site('blue-giant', 'hot'))), 'świetne');
  assert.equal(affinityLabel(affinity(def('energy'), site('black-hole', 'frozen'))), 'słabe');
  // Naukowa: pulsar i czarna dziura.
  assert.ok(affinity(def('science'), site('pulsar', 'temperate')) > affinity(def('science'), site('yellow', 'temperate')));
  // Brak położenia = zwykłe; granice z reguł.
  assert.equal(affinity(def('mining'), null), 1);
  for (const s of SPECIALIZATIONS) {
    for (const star of STAR_KINDS) {
      for (const zone of ['hot', 'warm', 'temperate', 'cold', 'frozen'] as const) {
        const f = affinity(s, site(star.id, zone));
        assert.ok(f >= SPECIALIZATION_RULES.affinityRange[0] && f <= SPECIALIZATION_RULES.affinityRange[1]);
      }
    }
  }
  // Efekty skalowane dopasowaniem.
  const strong = specializationEffects(def('energy'), site('blue-giant', 'hot'));
  assert.deepEqual(strong, [{ kind: 'output', resource: 'energy', percent: Math.round(25 * affinity(def('energy'), site('blue-giant', 'hot'))) }]);
});

test('specjalizacje: pierwszy wybór od razu, zmiana tylko po badaniu i trwa 1 h', () => {
  const first = chooseSpecialization(undefined, 'mining', 1000, false);
  assert.ok(first.ok);
  assert.deepEqual(first.ok && first.spec, { id: 'mining', readyAt: 1000 });
  const same = chooseSpecialization({ id: 'mining', readyAt: 0 }, 'mining', 1000, true);
  assert.equal(same.ok, false);
  const locked = chooseSpecialization({ id: 'mining', readyAt: 0 }, 'energy', 1000, false);
  assert.equal(locked.ok, false);
  assert.match(locked.message, /Przebudowa kolonii/);
  const change = chooseSpecialization({ id: 'mining', readyAt: 0 }, 'energy', 1000, true);
  assert.ok(change.ok);
  assert.equal(change.ok && change.spec.readyAt, 1000 + HOUR);
  assert.equal(SPECIALIZATION_RULES.changeSeconds, 3600);
  // W trakcie zmiany — bez premii.
  assert.deepEqual(activeSpecializationEffects({ id: 'energy', readyAt: 1000 + HOUR }, null, 1000), []);
  assert.equal(activeSpecializationEffects({ id: 'energy', readyAt: 1000 + HOUR }, null, 1000 + HOUR).length, 1);
  // Badanie odblokowujące zmianę jest w Planetologii.
  const node = findResearch('planet-spec')!;
  assert.equal(node.arm, 'planetology');
  assert.deepEqual(node.effects, [{ kind: 'unlock', feature: 'specialization-change' }]);
});

test('specjalizacje: efekty działają jak badania (sumują się z nimi)', () => {
  const effects = specializationEffects(def('mining'), null);
  const b = applyResearch(BALANCE, [], effects);
  const metal = b.buildings.find((d) => d.id === 'metalMine')!;
  assert.ok(Math.abs(metal.baseOutput - BALANCE.buildings.find((d) => d.id === 'metalMine')!.baseOutput * 1.15) < 1e-9);
  const both = applyResearch(BALANCE, ['mining-1'], effects);
  assert.ok(both.buildings.find((d) => d.id === 'metalMine')!.baseOutput > metal.baseOutput);
});

test('specjalizacje: zapis — błędne odrzucane, stary zapis bez specjalizacji', () => {
  assert.equal(parseSpecialization({ id: 'piractwo', readyAt: 0 }), undefined);
  assert.equal(parseSpecialization({ id: 'mining' }), undefined);
  assert.deepEqual(parseSpecialization({ id: 'science', readyAt: 5 }), { id: 'science', readyAt: 5 });
});

test('specjalizacje: kontroler — wybór, premia w produkcji, zmiana z podziałem czasu i zapisem', () => {
  withMemoryStorage(() => {
    const game = new GameController(0);
    const view = game.specialization(undefined, 0);
    assert.equal(view.current, null);
    assert.ok(view.siteText.includes('strefa'));
    const before = game.rates.metal;
    assert.ok(game.chooseSpecialization('mining', 0).ok);
    assert.ok(game.rates.metal > before, 'Górnicza: więcej metalu od razu');
    // Bez badania zmiana zablokowana.
    assert.equal(game.chooseSpecialization('energy', 1000).ok, false);
    game.research = { done: ['planet-1', 'planet-spec'], current: null };
    assert.ok(game.chooseSpecialization('energy', 2000).ok);
    // W trakcie zmiany — bez premii; po godzinie Energetyczna.
    assert.ok(Math.abs(game.rates.metal - productionRates(game.economy, game.planet, applyResearch(BALANCE, game.research.done)).metal) < 1e-9);
    game.tick(2000 + HOUR + 60_000);
    assert.equal(game.specialization(undefined, 2000 + HOUR + 60_000).current?.active, true);
    assert.ok(game.rates.energyProduced > productionRates(game.economy, game.planet, applyResearch(BALANCE, game.research.done)).energyProduced);
    const saved = deserializeEmpire(localStorage.getItem(EMPIRE_KEY));
    assert.deepEqual(saved?.slots[0]?.specialization, { id: 'energy', readyAt: 2000 + HOUR });
    // Wczytanie zachowuje specjalizację.
    const again = new GameController(2000 + HOUR + 120_000);
    assert.equal(again.specialization(undefined, 2000 + HOUR + 120_000).current?.id, 'energy');
    assert.ok(again.overview(2000 + HOUR + 120_000)[0]!.specialization?.name === 'Energetyczna');
  });
});
