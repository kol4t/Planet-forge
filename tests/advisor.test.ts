import assert from 'node:assert/strict';
import { test } from 'node:test';
import { GameController } from '../src/app/GameController.ts';
import { parseAiLevels, suggest } from '../src/core/ai/advisor.ts';
import { simulateAwayAi } from '../src/core/ai/offline.ts';
import { createEconomy } from '../src/core/economy/economy.ts';
import { generatePlanet } from '../src/core/generation/generatePlanet.ts';
import { EMPTY_RESEARCH } from '../src/core/research/research.ts';
import type { EconomyState } from '../src/core/types.ts';
import { BALANCE } from '../src/data/balance.ts';
import { STARTER } from '../src/data/planets.ts';

const planet = generatePlanet(STARTER.definition, STARTER.seed);
const base = createEconomy(0);
const input = (economy: EconomyState, labLevel = 10) => ({ economy, planet, balance: BALANCE, research: EMPTY_RESEARCH, labLevel });

test('SI: brak energii → najpierw Elektrownia (z powodem po polsku)', () => {
  const economy = { ...base, stock: { metal: 900, crystal: 900 }, levels: { ...base.levels, metalMine: 6, crystalMine: 6 } };
  const [first] = suggest(input(economy));
  assert.equal(first?.rule, 'energy');
  assert.deepEqual(first?.action, { kind: 'build', building: 'powerPlant' });
  assert.match(first!.reason, /Energia wystarcza kopalniom w \d+%/);
  assert.match(first!.text, /^Ulepszyć Elektrownię do poz\. 2\?/);
});

test('SI: pełny magazyn → Magazyn; wolne Laboratorium → najtańsze badanie; nic gdy trwa budowa', () => {
  const full = { ...base, stock: { metal: 950, crystal: 300 }, levels: { ...base.levels, powerPlant: 5 } };
  assert.ok(suggest(input(full)).some((s) => s.rule === 'storage'));
  const lab = suggest(input({ ...base, stock: { metal: 800, crystal: 800 }, levels: { ...base.levels, powerPlant: 5 } }, 1));
  assert.ok(lab.some((s) => s.rule === 'research'), JSON.stringify(lab.map((s) => s.rule)));
  const busy = { ...full, construction: { building: 'metalMine' as const, targetLevel: 2, startedAt: 0, finishesAt: 1, cost: { metal: 0, crystal: 0 } } };
  assert.ok(suggest(input(busy)).every((s) => s.action.kind !== 'build'));
  const poor = { ...base, stock: { metal: 0, crystal: 0 } };
  assert.deepEqual(suggest(input(poor)), [], 'bez surowców — bez propozycji');
});

test('SI: budynki najwyżej do poziomu Laboratorium (decyzja właściciela)', () => {
  const economy = { ...base, stock: { metal: 9000, crystal: 9000 }, levels: { ...base.levels, metalMine: 6, crystalMine: 6, powerPlant: 3, storage: 3 } };
  assert.deepEqual(suggest(input(economy, 3)).filter((s) => s.action.kind === 'build'), [], 'Elektrownia 3 = Laboratorium 3 — stop');
  assert.ok(suggest(input(economy, 4)).some((s) => s.rule === 'energy'));
  assert.ok(suggest(input(economy, 10)).every((s) => !(s.action.kind === 'build' && s.action.building === 'laboratory')), 'Laboratorium ulepsza gracz');
});

test('SI: poziomy z zapisu — błędne wracają do „pyta”', () => {
  assert.deepEqual(parseAiLevels({ energy: 'auto', storage: 'xyz' }), { energy: 'auto', storage: 'ask', research: 'ask', mines: 'ask' });
});

/** Prosta pamięć zamiast localStorage przeglądarki. */
function withMemoryStorage(run: () => void): void {
  const store = new Map<string, string>();
  const original = Object.getOwnPropertyDescriptor(globalThis, 'localStorage');
  Object.defineProperty(globalThis, 'localStorage', {
    configurable: true,
    value: { getItem: (k: string) => store.get(k) ?? null, setItem: (k: string, v: string) => void store.set(k, v) },
  });
  try {
    run();
  } finally {
    if (original) Object.defineProperty(globalThis, 'localStorage', original);
    else delete (globalThis as { localStorage?: unknown }).localStorage;
  }
}

test('kontroler: SI Matka po badaniu proponuje, „Tak” wykonuje, „Nie” wycisza, „działa samo” po SI wykonawczych', () => {
  withMemoryStorage(() => {
    const game = new GameController(0);
    game.economy = { ...game.economy, stock: { metal: 900, crystal: 900 }, levels: { ...game.economy.levels, metalMine: 6, crystalMine: 6, laboratory: 6 } };
    assert.equal(game.aiSuggestion(0), null, 'bez badania SI milczy');
    game.research = { done: ['ai-1'], current: null };
    const s = game.aiSuggestion(0)!;
    assert.equal(s.rule, 'energy');
    assert.equal(s.level, 'ask');
    game.aiDecline('energy', 0);
    assert.notEqual(game.aiSuggestion(1000)?.rule, 'energy', 'odrzucona na 10 min');
    assert.equal(game.aiSuggestion(11 * 60_000)?.rule, 'energy');
    const accepted = game.aiAccept(s.key, 11 * 60_000);
    assert.ok(accepted.ok, accepted.message);
    assert.equal(game.economy.construction?.building, 'powerPlant');
    assert.ok(game.journalEntries()[0]!.text.startsWith('SI Matka (za Twoją zgodą)'));
    // „Działa samo” wymaga SI wykonawczych.
    assert.equal(game.setAiLevel('storage', 'auto').ok, false);
    game.research = { done: ['ai-1', 'ai-2'], current: null };
    assert.ok(game.setAiLevel('energy', 'auto').ok);
    game.cancelUpgrade(11 * 60_000 + 1);
    game.cancelUpgrade(11 * 60_000 + 2);
    const actions: string[] = [];
    game.onAiAction((t) => actions.push(t));
    game.tick(11 * 60_000 + 3);
    assert.equal(game.economy.construction?.building, 'powerPlant', 'SI sama zaczęła budowę');
    assert.equal(actions.length, 1);
    const again = new GameController(11 * 60_000 + 4);
    assert.equal(again.aiLevel('energy'), 'auto', 'ustawienie w zapisie');
  });
});

test('SI przy zamkniętej grze (Autonomia): buduje sama, wolniej o 50%, wpisy w dzienniku', () => {
  const economy = { ...base, lastUpdate: 0, stock: { metal: 2000, crystal: 2000 }, levels: { ...base.levels, metalMine: 5, crystalMine: 5, laboratory: 6 } };
  const auto = { energy: 'auto', storage: 'auto', research: 'auto', mines: 'auto' } as const;
  const result = simulateAwayAi({ economy, planet, balance: BALANCE, research: EMPTY_RESEARCH, levels: auto }, 4 * 3600_000);
  assert.ok(result.started.length >= 2, `budów: ${result.started.length}`);
  const first = result.started[0]!;
  assert.equal(first.building, 'powerPlant', 'najpierw energia');
  assert.equal(result.economy.lastUpdate, 4 * 3600_000);
  // Budowa SI trwa 1,5× dłużej niż zwykła.
  const normal = BALANCE.buildSecondsPerLevel * first.level * 1000;
  const second = result.started[1]!;
  assert.ok(second.at - first.at >= normal * 1.5 - 1, `${second.at - first.at} vs ${normal * 1.5}`);
  assert.ok(result.started.every((s) => s.level <= 6), 'limit Laboratorium');
  const asked = simulateAwayAi({ economy, planet, balance: BALANCE, research: EMPTY_RESEARCH, levels: { ...auto, energy: 'ask', mines: 'ask', storage: 'ask' } }, 3600_000);
  assert.equal(asked.started.length, 0, 'reguły „pyta” nie działają bez gracza');
});

test('kontroler: po „Autonomii” SI buduje podczas nieobecności (wpis w dzienniku)', () => {
  withMemoryStorage(() => {
    const game = new GameController(0);
    game.research = { done: ['ai-1', 'ai-2', 'ai-3'], current: null };
    game.economy = { ...game.economy, stock: { metal: 3000, crystal: 3000 }, levels: { ...game.economy.levels, metalMine: 5, crystalMine: 5, laboratory: 6, storage: 4 } };
    for (const rule of ['energy', 'storage', 'mines'] as const) assert.ok(game.setAiLevel(rule, 'auto').ok);
    game.save();
    const later = new GameController(3 * 3600_000);
    const texts = later.journalEntries().map((e) => e.text);
    assert.ok(texts.some((t) => t.includes('(podczas nieobecności)')), texts.join(' | '));
    assert.ok(later.economy.levels.powerPlant > 1, 'Elektrownia rozbudowana pod nieobecność');
  });
});

test('kontroler: po anulowaniu badania SI („działa samo”) nie zajmuje Laboratorium, dopóki gracz sam nie wybierze', () => {
  withMemoryStorage(() => {
    const game = new GameController(0);
    game.economy = { ...game.economy, stock: { metal: 90000, crystal: 90000 }, levels: { ...game.economy.levels, laboratory: 6 } };
    game.research = { done: ['ai-1', 'ai-2'], current: null };
    assert.ok(game.setAiLevel('research', 'auto').ok);
    game.tick(1000);
    const byAi = game.research.current?.id;
    assert.ok(byAi, 'SI sama zaczęła badanie');
    assert.ok(game.cancelResearch(2000).ok);
    game.tick(3000);
    game.tick(60_000);
    assert.equal(game.research.current, null, 'SI nie wznawia badania po anulowaniu przez gracza');
    // Gracz wybiera inne badanie sam — działa, a potem SI wraca do pracy.
    const mine = ['prod-core', 'planet-1'].find((id) => id !== byAi)!;
    assert.ok(game.startResearch(mine, 61_000).ok);
    assert.equal(game.research.current?.id, mine);
    game.research = { ...game.research, current: null, done: [...game.research.done, mine] };
    game.tick(62_000);
    assert.ok(game.research.current, 'po ręcznym wyborze SI znów prowadzi badania');
  });
});
