import assert from 'node:assert/strict';
import { test } from 'node:test';
import { GameController } from '../src/app/GameController.ts';
import { firstOpenStep, goalProgress, parseGuide, type GuideSnapshot } from '../src/core/guide/guide.ts';
import { deserializeEmpire, EMPIRE_KEY } from '../src/core/save/empire.ts';
import { GUIDE_STEPS } from '../src/data/guide.ts';

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

const empty: GuideSnapshot = { levels: {}, researched: 0, unlocked: () => false, seen: [], complexes: [], stationReady: false, planets: 1, konstrukt: false, transport: false, exploited: 0, stellar: false };

test('przewodnik (etap 11): kroki przez całą pętlę, każdy z celem i nagrodą, unikalne id', () => {
  assert.ok(GUIDE_STEPS.length >= 15);
  assert.equal(new Set(GUIDE_STEPS.map((s) => s.id)).size, GUIDE_STEPS.length);
  assert.equal(GUIDE_STEPS.at(-1)!.goal.kind, 'stellar', 'ostatni krok — imperium gwiezdne (zamknięcie pętli)');
  for (const s of GUIDE_STEPS) {
    assert.ok(s.title && s.hint, s.id);
    assert.ok(s.reward.metal >= 0 && s.reward.crystal >= 0);
    assert.equal(goalProgress(s.goal, empty).done, false, `${s.id} nie jest wykonany na starcie`);
  }
});

test('przewodnik: postęp kroku i przewinięcie przez to, co już osiągnięte', () => {
  const p = goalProgress({ kind: 'level', building: 'metalMine', level: 10 }, { ...empty, levels: { metalMine: 4 } });
  assert.deepEqual([p.done, p.value, p.label], [false, 0.4, '4 / 10']);
  assert.equal(goalProgress({ kind: 'seen', what: 'system' }, { ...empty, seen: ['system'] }).done, true);
  // Gracz z rozwiniętą planetą — przewinięcie do pierwszego niewykonanego (widok układu jeszcze nieobejrzany).
  const developed = { ...empty, levels: { metalMine: 12, crystalMine: 8, powerPlant: 9, storage: 6, laboratory: 3 }, researched: 4 };
  assert.equal(GUIDE_STEPS[firstOpenStep(GUIDE_STEPS, developed)]!.id, 'system');
  assert.equal(firstOpenStep(GUIDE_STEPS, { ...developed, seen: ['system'] }), GUIDE_STEPS.findIndex((s) => s.id === 'factory-research'));
  assert.equal(parseGuide({ step: 'x' }, 19), null);
  assert.equal(parseGuide({ step: 99 }, 19), null);
  assert.deepEqual(parseGuide({ step: 3, off: true, seen: ['system', 5], transport: true }, 19), { step: 3, off: true, seen: ['system'], transport: true });
});

test('przewodnik: kontroler — nagroda za wykonany krok, dziennik, widok układu, wyłącznik, zapis', () => {
  withMemoryStorage(() => {
    const game = new GameController(0);
    game.tick(1000);
    let v = game.guideView()!;
    assert.deepEqual([v.enabled, v.index, v.title], [true, 0, GUIDE_STEPS[0]!.title]);
    const texts: string[] = [];
    game.onGuideStep((t) => texts.push(t));
    // Krok 1: kopalnia metalu poz. 3 — nagroda do magazynu.
    const before = game.economy.stock.metal;
    game.economy = { ...game.economy, levels: { ...game.economy.levels, metalMine: 3 } };
    game.tick(2000);
    assert.equal(texts.length, 1);
    assert.match(texts[0]!, /SI Matka: wykonane — Rozbuduj Kopalnię metalu do poz\. 3\. Nagroda: 150 metalu, 60 kryształów\./);
    assert.ok(game.economy.stock.metal >= before + GUIDE_STEPS[0]!.reward.metal);
    assert.ok(game.journalEntries().some((e) => e.text.startsWith('SI Matka: wykonane')));
    assert.equal(game.guideView()!.index, 1);
    // Kilka kroków naraz (energia, kryształy, magazyn) — każdy z nagrodą; „Obejrzyj układ” czeka na widok układu.
    game.economy = { ...game.economy, levels: { ...game.economy.levels, powerPlant: 3, crystalMine: 3, storage: 4 } };
    game.tick(3000);
    assert.equal(texts.length, 4);
    v = game.guideView()!;
    assert.equal(GUIDE_STEPS[v.index]!.id, 'system');
    game.selectSystem(game.homeSystem);
    game.tick(4000);
    assert.equal(GUIDE_STEPS[game.guideView()!.index]!.id, 'lab');
    // Wyłącznik: krok zostaje, nagrody nie przychodzą.
    game.setGuideEnabled(false);
    assert.equal(game.guideView()!.enabled, false);
    game.research = { done: ['prod-core'], current: null };
    game.tick(5000);
    assert.equal(GUIDE_STEPS[game.guideView()!.index]!.id, 'lab');
    game.setGuideEnabled(true);
    game.tick(6000);
    assert.equal(GUIDE_STEPS[game.guideView()!.index]!.id, 'metal-10');
    game.save();
    assert.equal(deserializeEmpire(localStorage.getItem(EMPIRE_KEY))!.guide?.step, game.guideView()!.index);
  });
});

test('przewodnik: istniejący zapis bez przewodnika — start od niewykonanego kroku, bez nagród za przeszłość', () => {
  withMemoryStorage(() => {
    const game = new GameController(0);
    game.economy = { ...game.economy, levels: { ...game.economy.levels, metalMine: 12, crystalMine: 8, powerPlant: 9, storage: 6 } };
    const stock = game.economy.stock.metal;
    const texts: string[] = [];
    game.onGuideStep((t) => texts.push(t));
    game.tick(0);
    assert.equal(texts.length, 0, 'bez komunikatów i nagród');
    assert.equal(game.economy.stock.metal, stock);
    assert.equal(GUIDE_STEPS[game.guideView()!.index]!.id, 'system');
  });
});
