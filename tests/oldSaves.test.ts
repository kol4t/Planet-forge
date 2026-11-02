// Etap 12 (kandydat MVP): zapisy utworzone prawdziwymi starymi wersjami gry (v0.46–v0.66, skrypt w opisie
// tests/fixtures/saves/README.md) wczytują się w obecnej wersji — planety, poziomy, naliczanie czasu, zapis i eksport.
import assert from 'node:assert/strict';
import { readdirSync, readFileSync } from 'node:fs';
import { test } from 'node:test';
import { GameController } from '../src/app/GameController.ts';
import { deserializeEmpire, EMPIRE_KEY } from '../src/core/save/empire.ts';

function withStorage(initial: Record<string, string>, run: () => void): void {
  const store = new Map<string, string>(Object.entries(initial));
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

const dir = new URL('./fixtures/saves/', import.meta.url);
const fixtures = readdirSync(dir)
  .filter((f) => f.endsWith('.json'))
  .map((f) => JSON.parse(readFileSync(new URL(f, dir), 'utf8')) as { version: string; createdAt: number; raw: string; pf2: string; summary: { planets: number } });

test('stare zapisy: są zapisy z co najmniej 7 wersji (od v0.46)', () => {
  assert.ok(fixtures.length >= 7, `zapisów: ${fixtures.length}`);
  assert.ok(fixtures.some((f) => f.version === '0.46.0'));
});

for (const f of fixtures) {
  test(`stary zapis v${f.version}: wczytanie, naliczenie 8 h, zapis i eksport w obecnej wersji`, () => {
    assert.ok(deserializeEmpire(f.raw), 'zapis rozpoznany');
    withStorage({ [EMPIRE_KEY]: f.raw }, () => {
      const now = f.createdAt + 8 * 3600_000;
      const game = new GameController(now);
      assert.equal(game.brokenSaveFound, false, 'nie uznany za uszkodzony');
      assert.equal(game.planets().length, f.summary.planets, 'te same planety');
      // Nieaktywne planety nadrabiają czas, przejście na każdą działa.
      for (let i = 0; i < game.planets().length; i++) assert.ok(game.switchPlanet(i, now + 1000 + i).ok);
      game.tick(now + 60_000);
      assert.ok(game.economy.stock.metal >= 0 && Number.isFinite(game.economy.stock.metal));
      // Widok, przewodnik i kolonia liczą się bez błędów.
      assert.ok(game.view.system >= 1);
      assert.ok(game.guideView());
      assert.ok(game.colony().plots);
      // Zapis w nowym formacie i eksport / import tekstem PF2.
      assert.ok(game.save());
      const again = deserializeEmpire(localStorage.getItem(EMPIRE_KEY));
      assert.equal(again?.slots.length, f.summary.planets);
      const text = game.exportSave(now + 120_000);
      assert.match(text, /^PF2:/);
      assert.ok(game.importSave(text, now + 130_000).ok);
    });
    // Tekst PF2 wyeksportowany przez starą wersję też się wczytuje.
    if (f.pf2) {
      withStorage({}, () => {
        const game = new GameController(f.createdAt);
        const result = game.importSave(f.pf2, f.createdAt + 1000);
        assert.ok(result.ok, result.message);
        assert.equal(game.planets().length, f.summary.planets);
      });
    }
  });
}
