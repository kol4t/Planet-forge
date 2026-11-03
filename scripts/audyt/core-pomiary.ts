// Audyt (2026-11): pomiary logiki bez przeglądarki — generowanie planety i siatki pól, rozmiar i czas zapisu, naliczanie
// nieobecności przy 5 planetach. `node scripts/audyt/core-pomiary.ts`. Liczby z komputera (nie iPad).
import { performance } from 'node:perf_hooks';
import { generatePlanet } from '../../src/core/generation/generatePlanet.ts';
import { fieldGrid } from '../../src/core/colony/fieldGrid.ts';
import { PLANET_DEFINITIONS, STARTER } from '../../src/data/planets.ts';
import { GameController } from '../../src/app/GameController.ts';
import { colonizeNow } from '../../tests/helpers.ts';

const store = new Map<string, string>();
Object.defineProperty(globalThis, 'localStorage', { configurable: true, value: { getItem: (k: string) => store.get(k) ?? null, setItem: (k: string, v: string) => void store.set(k, v), removeItem: (k: string) => void store.delete(k) } });
const ms = (f: () => void, n = 1) => { const t = performance.now(); for (let i = 0; i < n; i++) f(); return (performance.now() - t) / n; };

console.log('| Pomiar | Wynik |\n|---|---|');
console.log(`| Generowanie planety startowej (dane) | ${ms(() => generatePlanet(STARTER.definition, STARTER.seed), 20).toFixed(1)} ms |`);
for (const def of PLANET_DEFINITIONS) {
  const p = generatePlanet(def, `AUDYT-${def.id}`);
  const t = performance.now();
  const g = fieldGrid(p);
  console.log(`| Siatka pól ${def.id} (${g.cells.length} pól) — pierwsze liczenie | ${(performance.now() - t).toFixed(0)} ms |`);
}
// Imperium 5 planet, wysokie poziomy.
const game = new GameController(0);
const free = game.system(game.homeSystem)!.planets.filter((p) => game.occupantAt(p) === 'free').slice(0, 4);
for (const p of free) colonizeNow(game, p.address, 0);
for (let i = 0; i < game.planets().length; i++) {
  game.switchPlanet(i, 0);
  game.economy = { ...game.economy, levels: { metalMine: 40, crystalMine: 40, powerPlant: 40, storage: 30, antimatterCollector: 10, laboratory: 15 } };
  game.colony();
}
game.save();
const raw = store.get('planet-forge.empire.v1') ?? '';
console.log(`| Planety w imperium | ${game.planets().length} |`);
console.log(`| Rozmiar zapisu (localStorage) | ${(raw.length / 1024).toFixed(1)} KB |`);
console.log(`| Czas zapisu (serializacja + setItem) | ${ms(() => game.save(), 20).toFixed(2)} ms |`);
console.log(`| Rozmiar eksportu PF2 | ${(game.exportSave().length / 1024).toFixed(1)} KB |`);
const t8 = performance.now();
const back = new GameController(8 * 3600_000);
console.log(`| Wczytanie gry po 8 h nieobecności (5 planet) | ${(performance.now() - t8).toFixed(0)} ms |`);
for (let i = 0; i < back.planets().length; i++) back.switchPlanet(i, 8 * 3600_000);
const t30 = performance.now();
new GameController(30 * 24 * 3600_000);
console.log(`| Wczytanie gry po 30 dniach nieobecności | ${(performance.now() - t30).toFixed(0)} ms |`);
const tickN = 200;
console.log(`| Jeden tick gospodarki (co klatkę UI) | ${ms(() => back.tick(8 * 3600_000 + 1000), tickN).toFixed(2)} ms |`);
console.log(`| Przełączenie planety (z siatką w pamięci) | ${ms(() => { back.switchPlanet(1, 8 * 3600_000 + 2000); back.switchPlanet(0, 8 * 3600_000 + 2000); }, 10).toFixed(1)} ms (×2) |`);
back.switchPlanet(0, 8 * 3600_000 + 3000);
console.log(`| colony() — przeliczenie pól (co 250 ms w UI) | ${ms(() => back.colony(), 50).toFixed(2)} ms |`);
console.log(`| Gospodarka + panel: rates (co odświeżenie) | ${ms(() => back.rates, 50).toFixed(3)} ms |`);
