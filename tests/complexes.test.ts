import assert from 'node:assert/strict';
import { test } from 'node:test';
import { GameController } from '../src/app/GameController.ts';
import { complexCandidate, megaCandidate, parseComplexes, validComplexes } from '../src/core/colony/complexes.ts';
import { PLOTS_LAYOUT } from '../src/core/colony/plots.ts';
import { fieldsFor } from '../src/core/economy/footprint.ts';
import { deserializeEmpire, EMPIRE_KEY } from '../src/core/save/empire.ts';
import type { BuildingLevels } from '../src/core/types.ts';
import { COMPLEX_FAMILIES, findFamily, MEGA_RULES } from '../src/data/complexes.ts';
import { STAGE_NAMES } from '../src/data/footprint.ts';
import { findResearch } from '../src/data/research.ts';

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

const levels = (l: Partial<BuildingLevels>): BuildingLevels => ({ metalMine: 0, crystalMine: 0, powerPlant: 0, storage: 1, antimatterCollector: 0, laboratory: 0, ...l });
const metal = findFamily('metalMine')!;

test('kompleks (v0.45): ulepszenie całego budynku od etapu „wielka fabryka”, megakompleks od najwyższego; jeden na budynek', () => {
  const names = STAGE_NAMES.metalMine;
  assert.equal(complexCandidate([], levels({ metalMine: 11 }), metal, names, 12).ok, false);
  const no = complexCandidate([], levels({ metalMine: 11 }), metal, names, 12);
  assert.ok(!no.ok && no.reason.includes('Huta') && no.reason.includes('poz. 12'), JSON.stringify(no));
  assert.equal(complexCandidate([], levels({ metalMine: 12 }), metal, names, 12).ok, true);
  const active = [{ family: metal.id, building: 'metalMine' as const }];
  assert.equal(complexCandidate(active, levels({ metalMine: 12 }), metal, names, 12).ok, false, 'już działa');
  assert.equal(megaCandidate([], levels({ metalMine: 25 }), metal, names, 20).ok, false, 'najpierw kompleks');
  assert.equal(megaCandidate(active, levels({ metalMine: 19 }), metal, names, 20).ok, false, 'za niski etap');
  assert.equal(megaCandidate(active, levels({ metalMine: 20 }), metal, names, 20).ok, true);
  // Budynek zburzony do zera — kompleks znika; podwójny wpis — jeden zostaje.
  assert.deepEqual(validComplexes([...active, ...active], levels({ metalMine: 12 })), active);
  assert.deepEqual(validComplexes(active, levels({ metalMine: 0 })), []);
});

test('migracja zapisu kompleksów (v0.45): stare kompleksy z polami i numerem megakompleksu → jeden na budynek, postęp zostaje', () => {
  const old = [
    { family: 'metal-factory', building: 'metalMine', cells: [1, 2, 3], hubs: [4], mode: 'eco', mega: 4 },
    { family: 'metal-factory', building: 'metalMine', cells: [5, 6, 7], hubs: [8], mega: 4 },
    { family: 'crystal-drill', building: 'crystalMine', cells: [9, 10, 11], hubs: [12] },
    { family: 'nieznana', building: 'storage', cells: [], hubs: [] },
  ];
  assert.deepEqual(parseComplexes(old, COMPLEX_FAMILIES), [
    { family: 'metal-factory', building: 'metalMine', mode: 'eco', mega: true },
    { family: 'crystal-drill', building: 'crystalMine' },
  ]);
  assert.deepEqual(parseComplexes([{ family: 'tesla-grid', building: 'powerPlant', mega: true }], COMPLEX_FAMILIES), [
    { family: 'tesla-grid', building: 'powerPlant', mega: true },
  ]);
});

test('migracja zapisu pól (v0.45): stary układ (pole na 3 poziomy) → spójny obszar od pierwszego pola budynku', () => {
  withMemoryStorage(() => {
    const game = new GameController(0);
    game.economy = { ...game.economy, levels: { ...game.economy.levels, metalMine: 9, crystalMine: 6 } };
    const anchor = game.colony().plots.metalMine![0]!;
    (game as unknown as { save(): void }).save();
    // Zapis „sprzed v0.45”: bez `plotsLayout`, z 3 polami metalu (9 poziomów) i kompleksem z polami.
    const data = JSON.parse(localStorage.getItem(EMPIRE_KEY)!);
    delete data.slots[0].plotsLayout;
    data.slots[0].plots.metalMine = [anchor, 77, 78];
    data.slots[0].complexes = [{ family: 'metal-factory', building: 'metalMine', cells: [anchor, 77, 78], hubs: [79] }];
    localStorage.setItem(EMPIRE_KEY, JSON.stringify(data));
    const again = new GameController(1000);
    const plots = again.colony().plots;
    assert.equal(plots.metalMine![0], anchor, 'obszar zaczyna się w starym pierwszym polu');
    assert.equal(plots.metalMine!.length, fieldsFor('metalMine', 9));
    assert.equal(again.economy.levels.metalMine, 9, 'poziom bez zmian');
    assert.equal(again.complexView('metalMine')!.active, true, 'kompleks przeszedł');
    (again as unknown as { save(): void }).save();
    const saved = deserializeEmpire(localStorage.getItem(EMPIRE_KEY))!;
    assert.equal(saved.slots[0]!.plotsLayout, PLOTS_LAYOUT);
  });
});

test('kontroler: kompleks — badanie, etap, koszt, premia całego budynku (podgląd = gra), tryby, wyłączenie, zapis', () => {
  withMemoryStorage(() => {
    const game = new GameController(0);
    game.economy = { ...game.economy, levels: { ...game.economy.levels, metalMine: 12, powerPlant: 25, storage: 9 }, stock: { metal: 50000, crystal: 50000 } };
    assert.equal(game.mergeComplex('metalMine', 0).ok, false, 'bez badania');
    game.research = { done: ['metal-factory'], current: null };
    const view = game.complexView('metalMine')!;
    assert.equal(view.stage, 'Huta');
    assert.ok(view.candidate && view.candidate.gainPerMinute > 0);
    const before = game.rates.metal;
    assert.ok(game.mergeComplex('metalMine', 0).ok);
    assert.equal(game.economy.stock.metal, 50000 - metal.cost.metal);
    assert.ok(Math.abs(game.rates.metal - before - view.candidate!.gainPerMinute) < 1e-6, 'podgląd = gra');
    assert.ok(game.colony().plots.metalMine!.length === fieldsFor('metalMine', 12), 'kompleks nie zajmuje dodatkowych pól');
    // Tryby pracy (wielka fabryka): oszczędzanie — mniej metalu i energii, dokładnie jak w podglądzie.
    const factory = game.factoryView('metalMine')!;
    const eco = factory.complexes[0]!.modes.find((m) => m.id === 'eco')!;
    assert.ok(game.setComplexMode(factory.complexes[0]!.index, 'eco', 0).ok);
    assert.ok(Math.abs(game.rates.energyUsed - eco.energyUse) < 1e-6);
    assert.equal(game.buildingCard('metalMine').factory, 'Ekran: wielka fabryka');
    const again = new GameController(1000);
    assert.equal(again.factoryView('metalMine')!.complexes[0]!.mode, 'eco');
    assert.ok(again.splitComplex('metalMine', 2000).ok);
    assert.equal(again.complexView('metalMine')!.active, false);
  });
});

test('kontroler: megakompleks na najwyższym etapie — +60%, znaleziska zaplanowane, wyłączenie', () => {
  withMemoryStorage(() => {
    const game = new GameController(0);
    game.research = { done: ['crystal-complex', 'megastructures'], current: null };
    game.economy = { ...game.economy, levels: { ...game.economy.levels, crystalMine: 20, powerPlant: 25, storage: 10 }, stock: { metal: 90000, crystal: 90000 } };
    assert.ok(game.mergeComplex('crystalMine', 0).ok);
    const mega = game.complexView('crystalMine')!.mega;
    assert.ok(mega.candidate && mega.candidate.gainPerMinute > 0, mega.reason ?? '');
    const before = game.rates.crystal;
    assert.ok(game.mergeMega('crystalMine', 0).ok);
    assert.ok(Math.abs(game.rates.crystal - before - mega.candidate!.gainPerMinute) < 1e-6);
    assert.equal(game.complexView('crystalMine')!.mega.active, true);
    assert.equal(game.findsView(0).upcoming.length, 1);
    assert.equal(game.buildingCard('crystalMine').stage, 'Megaodkrywka');
    assert.ok(game.splitMega('crystalMine', 0).ok);
    assert.equal(game.complexView('crystalMine')!.mega.active, false);
    assert.equal(MEGA_RULES.bonus, 60);
  });
});

test('karta budowli (v0.45): etap, wygląd, następny etap z liczbą pól, zajętość pól budynku', () => {
  withMemoryStorage(() => {
    const game = new GameController(0);
    game.economy = { ...game.economy, levels: { ...game.economy.levels, crystalMine: 7 } };
    const card = game.buildingCard('crystalMine');
    assert.equal(card.stage, 'Szyb wiertniczy');
    assert.equal(card.fields, fieldsFor('crystalMine', 7));
    assert.deepEqual(card.look, { tier: 2, max: 4, name: 'Szyb wiertniczy', nextFrom: 12, nextName: 'Odkrywka' });
    assert.deepEqual(card.stages.map((s) => s.state).slice(0, 4), ['done', 'current', 'next', 'locked']);
    assert.match(card.next ?? '', /poz\. 12 — etap „Odkrywka”: 16 pól/);
    assert.deepEqual(game.footprint('crystalMine'), game.colony().plots.crystalMine);
  });
});

test('blokada (v0.45): gdy obok kompleksu brakuje pól na kolejny etap — ulepszenie i kolejka odrzucone z komunikatem', () => {
  withMemoryStorage(() => {
    const game = new GameController(0);
    // Planeta startowa ma 100 pól: huta 25 poz. (50 pól) + dwa kompleksy po 22 pola zostawiają za mało na megakonstrukt.
    game.economy = { ...game.economy, levels: { ...game.economy.levels, metalMine: 25, crystalMine: 19, powerPlant: 19, storage: 8 }, stock: { metal: 1e9, crystal: 1e9 } };
    game.colony();
    const result = game.upgrade('powerPlant', 0);
    assert.equal(result.ok, false);
    assert.equal(result.reason, 'no-fields');
    assert.match(result.message, /Elektrownia poz\. 20 \(Reaktor antymaterii\) potrzebuje 40 pól/);
    assert.ok(game.fields.used <= game.fields.buildable);
  });
});

test('znaleziska (v0.43.1): megakompleks co kilka godzin coś znajduje (też offline), premie, limity, zapis', async () => {
  const { rollFind, findInterval, findEffects, parseFinds } = await import('../src/core/economy/finds.ts');
  const { FIND_DEFS } = await import('../src/data/finds.ts');
  const a = findInterval('s:1', 1000);
  assert.equal(a, findInterval('s:1', 1000));
  assert.ok(a >= 4 * 3600_000 && a <= 8 * 3600_000);
  for (let t = 0; t < 50; t++) {
    const f = rollFind('s:1', t * 7777, 'metal-factory', {})!;
    assert.ok(f.families.length === 0 || f.families.includes('metal-factory'), f.id);
  }
  const full = Object.fromEntries(FIND_DEFS.map((f) => [f.id, f.max]));
  assert.equal(rollFind('s:1', 5, 'metal-factory', full), null, 'wszystko zebrane — nic nowego');
  assert.deepEqual(findEffects({ 'unknown-alloy': 3 }), [{ kind: 'output', resource: 'metal', percent: 6 }]);
  assert.deepEqual(parseFinds({ items: { 'unknown-alloy': 99, bogus: 2 }, next: { 'x:metalMine': 5, bad: 1 } }), { items: { 'unknown-alloy': 5 }, next: { 'x:metalMine': 5 } });
  withMemoryStorage(() => {
    const game = new GameController(0);
    game.research = { done: ['metal-factory', 'megastructures'], current: null };
    game.economy = { ...game.economy, levels: { ...game.economy.levels, metalMine: 20, powerPlant: 25, storage: 10 }, stock: { metal: 90000, crystal: 90000 } };
    assert.ok(game.mergeComplex('metalMine', 0).ok && game.mergeMega('metalMine', 0).ok);
    assert.equal(game.findsView(0).total, 0);
    const later = new GameController(48 * 3600_000);
    const view = later.findsView(48 * 3600_000);
    assert.ok(view.total >= 6 && view.total <= 12, `znalezisk: ${view.total}`);
    assert.ok(later.journalEntries().some((e) => e.text.startsWith('Znalezisko (')));
    const again = new GameController(48 * 3600_000 + 1);
    assert.equal(again.findsView(48 * 3600_000 + 1).total, view.total, 'ten sam wynik po wczytaniu');
  });
});

test('badania kompleksów: wszystkie rodziny i megastruktury mają węzły z odblokowaniem', () => {
  for (const f of COMPLEX_FAMILIES) assert.ok(findResearch(f.unlock === 'crystal-complex' ? 'crystal-complex' : f.unlock), f.unlock);
  assert.ok(findResearch('megastructures'));
});
