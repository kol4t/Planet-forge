import assert from 'node:assert/strict';
import { test } from 'node:test';
import { GameController } from '../src/app/GameController.ts';
import { cachedFieldGrid, clearFieldGridCache } from '../src/core/colony/fieldGrid.ts';
import { EMPIRE_KEY } from '../src/core/save/empire.ts';

function withMemoryStorage(run: (store: Map<string, string>) => void): void {
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
    run(store);
  } finally {
    if (original) Object.defineProperty(globalThis, 'localStorage', original);
    else delete (globalThis as { localStorage?: unknown }).localStorage;
  }
}

test('zgłoszenie #1: lista planet po starcie nie liczy siatek pól nieaktywnych planet (pola z zapisu)', () => {
  withMemoryStorage((store) => {
    const first = new GameController(0);
    const free = first
      .system(first.homeSystem)!
      .planets.filter((p) => p.body === 'rocky' && first.occupantAt(p) === 'free')
      .map((p) => p.address);
    for (const address of free.slice(0, 2)) assert.ok(first.colonize(address, 0).ok);
    assert.ok(first.switchPlanet(0, 0).ok);
    const expected = first.overview(0).map((p) => p.fields);
    first.save();

    // Nowe uruchomienie: siatki nie są w pamięci.
    clearFieldGridCache();
    const again = new GameController(0);
    const fields = again.overview(0).map((p) => p.fields);
    assert.deepEqual(fields, expected);
    for (const p of again.planets().filter((p) => !p.active)) assert.equal(cachedFieldGrid(p.planet), undefined, p.name);

    // Stary zapis bez zapamiętanych pól: liczy raz i daje to samo.
    const raw = JSON.parse(store.get(EMPIRE_KEY)!);
    for (const slot of raw.slots) delete slot.fields;
    store.set(EMPIRE_KEY, JSON.stringify(raw));
    clearFieldGridCache();
    const old = new GameController(0);
    assert.deepEqual(old.overview(0).map((p) => p.fields), expected);
  });
});
