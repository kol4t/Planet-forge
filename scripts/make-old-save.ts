// Etap 12: zapis utworzony przez starą wersję gry (do tests/fixtures/saves/). Użycie (worktree starej wersji):
//   git worktree add /tmp/pf-0.58 <commit „v0.58.0: build”> && ln -s $PWD/node_modules /tmp/pf-0.58/node_modules
//   node scripts/make-old-save.ts /tmp/pf-0.58 tests/fixtures/saves/v0.58.0.json 0.58.0
import { writeFileSync } from 'node:fs';
const [root, out, version] = process.argv.slice(2);
const store = new Map<string, string>();
(globalThis as any).localStorage = { getItem: (k: string) => store.get(k) ?? null, setItem: (k: string, v: string) => void store.set(k, v), removeItem: (k: string) => void store.delete(k) };
const { GameController } = await import(`${root}/src/app/GameController.ts`);
const H = 3600_000;
const t0 = Date.UTC(2026, 9, 1, 8);
const g = new GameController(t0);
let t = t0;
const notes: string[] = [];
// Kilka godzin gry: ulepszenia po kolei (bez kolejki — działa w każdej wersji).
for (let i = 0; i < 40; i++) {
  t += 0.5 * H;
  g.tick(t);
  for (const id of ['metalMine', 'powerPlant', 'crystalMine', 'storage', 'laboratory']) {
    const r = g.upgrade(id, t);
    if (r.ok) break;
  }
}
// Kolonia we własnym układzie (jeśli wersja to umie).
try {
  const sys = g.system(g.homeSystem);
  const p = sys.planets.find((x: any) => x.body === 'rocky' && g.occupantAt(x) === 'free');
  if (p) {
    if ((g as any).fleet?.docked) (g as any).fleet.docked.colonyShip = ((g as any).fleet.docked.colonyShip ?? 0) + 1;
    g.economy = { ...g.economy, stock: { metal: 50_000, crystal: 50_000 }, antimatter: (g.economy.antimatter ?? 0) + 50 };
    const r = g.colonize(p.address, t);
    notes.push(`kolonizacja: ${r.message}`);
    t += 2 * H;
    g.tick(t);
  }
} catch (e) {
  notes.push(`kolonizacja niedostępna: ${(e as Error).message}`);
}
g.save();
const raw = store.get('planet-forge.empire.v1') ?? '';
let pf2 = '';
try { pf2 = g.exportSave(t); } catch { /* starsze wersje */ }
const summary = { planets: g.planets().length, levels: g.economy.levels };
writeFileSync(out!, JSON.stringify({ version, createdAt: t, summary, notes, raw, pf2 }, null, 1));
console.log(version, JSON.stringify(summary), notes.join(' | '));
