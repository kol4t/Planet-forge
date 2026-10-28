// Pomiar (audyt v0.46): czas generowania planety każdego typu i każdą metodą terenu, siatki pól,
// naliczania offline (8 h, 5 planet) i rozmiar zapisu. Node, bez przeglądarki — czasy na komputerze,
// nie na iPadzie (iPad bywa kilka razy wolniejszy). Uruchomienie: node scripts/perf-generation.ts
import { generatePlanet } from '../src/core/generation/generatePlanet.ts';
import { PLANET_DEFINITIONS } from '../src/data/planets.ts';
import { TERRAIN_METHOD_IDS } from '../src/core/surface/methods/index.ts';
import { createSurfaceSampler } from '../src/planet-renderer/surface.ts';
import { buildFieldGrid } from '../src/core/colony/fieldGrid.ts';
import type { Planet } from '../src/core/types.ts';

const ms = (run: () => void) => {
  const t = performance.now();
  run();
  return performance.now() - t;
};
const median = (v: number[]) => [...v].sort((a, b) => a - b)[Math.floor(v.length / 2)]!;
const REPEAT = Number(process.argv[2] ?? 3);

console.log('## Generowanie planety (mediana z ' + REPEAT + ', ms)\n');
console.log('| Typ | Metoda | dane planety | teren (pieczenie) | teren + woda/lawa | siatka pól | razem |');
console.log('|---|---|---:|---:|---:|---:|---:|');
let n = 0;
for (const def of PLANET_DEFINITIONS) {
  for (const method of TERRAIN_METHOD_IDS) {
    const rows: number[][] = [];
    for (let r = 0; r < REPEAT; r++) {
      const seed = `perf:${def.id}:${method}:${r}:${n++}`;
      let planet!: Planet;
      const gen = ms(() => {
        planet = generatePlanet(def, seed);
      });
      planet = { ...planet, visual: { ...planet.visual, terrainMethod: method } };
      const field = ms(() => void createSurfaceSampler(planet, { inland: false }).height(0, 0, 1));
      const inland = ms(() => {
        const s = createSurfaceSampler(planet, { inland: true });
        s.lakeLevel(0, 1, 0);
      });
      const grid = ms(() => void buildFieldGrid(planet));
      rows.push([gen, field, inland, grid]);
    }
    const m = [0, 1, 2, 3].map((i) => median(rows.map((r) => r[i]!)));
    const f = (v: number) => v.toFixed(v < 10 ? 1 : 0);
    console.log(`| ${def.id} | ${method} | ${f(m[0]!)} | ${f(m[1]!)} | ${f(m[2]!)} | ${f(m[3]!)} | ${f(m[0]! + m[1]! + m[2]! + m[3]!)} |`);
  }
}

// Naliczanie offline i zapis — przez kontroler gry (pamięć zamiast localStorage).
const store = new Map<string, string>();
(globalThis as { localStorage?: unknown }).localStorage = {
  getItem: (k: string) => store.get(k) ?? null,
  setItem: (k: string, v: string) => void store.set(k, v),
  removeItem: (k: string) => void store.delete(k),
};
const { GameController } = await import('../src/app/GameController.ts');
const { RESEARCH_NODES } = await import('../src/data/research.ts');
const t0 = Date.now();
const game = new GameController(t0);
game.research = { done: RESEARCH_NODES.filter((r) => r.ring <= 2 && !r.soon).map((r) => r.id), current: null };
game.economy = { ...game.economy, stock: { metal: 9e6, crystal: 9e6 } };
const free = game.system(game.homeSystem)!.planets.filter((p) => p.body === 'rocky' && game.occupantAt(p) === 'free');
// v0.53: kolonie zakłada statek (koszt, paliwo, lot ok. 2 min) — wysłane wcześniej, doleciały do `t0`.
game.economy = { ...game.economy, levels: { ...game.economy.levels, storage: 12 }, antimatter: 100 };
for (const p of free.slice(0, 4)) game.colonize(p.address, t0 - 130_000);
game.tick(t0);
console.log(`\nPlanety w imperium: ${game.slotInfo.used}`);
for (let i = 0; i < game.slotInfo.used; i++) {
  game.switchPlanet(i, t0);
  game.economy = { ...game.economy, levels: { metalMine: 14, crystalMine: 12, powerPlant: 11, storage: 16, antimatterCollector: 3, laboratory: 6 } };
  game.enqueue('metalMine', t0);
}
game.switchPlanet(0, t0);
game.save();
const save = store.get('planet-forge.empire.v1')!;
console.log(`Rozmiar zapisu (5 planet, dziennik): ${save.length} znaków (${(save.length / 1024).toFixed(1)} KB); tekst PF2: ${game.exportSave(t0).length} znaków`);
const away = t0 + 8 * 3600_000;
const start = ms(() => void new GameController(away));
console.log(`Start gry po 8 h nieobecności (wczytanie + naliczenie aktywnej planety): ${start.toFixed(0)} ms`);
const again = new GameController(away);
const switches = ms(() => {
  for (let i = 1; i < again.slotInfo.used; i++) again.switchPlanet(i, away);
});
console.log(`Przejście kolejno na 4 nieaktywne planety (każda nadrabia 8 h): ${switches.toFixed(0)} ms (${(switches / 4).toFixed(0)} ms na planetę)`);
const over = ms(() => void again.overview(away + 60_000));
console.log(`Zestawienie „Imperium” (5 planet liczonych „na niby”): ${over.toFixed(0)} ms`);
