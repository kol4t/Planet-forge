// Podgląd etapów kompleksów (v0.45) dla właściciela: kopalnia metalu i ekstraktor kryształów na każdym etapie
// (mała instalacja → zakład → wielka fabryka → megakonstrukt), na kawałku planety startowej, z obrysem pól i liczbą pól.
// Używa prawdziwej gry (widok 2D) w przeglądarce Playwright — wymaga uruchomionego `npm run dev` (http://localhost:5173)
// i zainstalowanego Playwright z przeglądarką Chromium (nie jest zależnością projektu).
// Uruchomienie: node scripts/preview-stages.ts [plik.png] [2d|3d]
import { writeFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { fieldsFor, stageName } from '../src/core/economy/footprint.ts';
import { FOOTPRINT } from '../src/data/footprint.ts';
import type { BuildingId } from '../src/core/types.ts';

const out = process.argv[2] ?? 'docs/atlas/etapy-kompleksow.png';
const graphics = process.argv[3] === '3d' ? '3d' : '2d';
const url = process.env.PREVIEW_URL ?? 'http://localhost:5173';

const store = new Map<string, string>();
(globalThis as { localStorage?: unknown }).localStorage = {
  getItem: (k: string) => store.get(k) ?? null,
  setItem: (k: string, v: string) => void store.set(k, v),
  removeItem: (k: string) => void store.delete(k),
};
const { GameController } = await import('../src/app/GameController.ts');

/** Zapis planety startowej z jednym budynkiem na danym poziomie (plus magazyn). */
function saveWith(id: BuildingId, level: number): string {
  store.clear();
  const now = Date.now();
  const game = new GameController(now);
  game.economy = { ...game.economy, levels: { ...game.economy.levels, metalMine: 0, crystalMine: 0, powerPlant: 0, storage: 1, [id]: level }, stock: { metal: 5000, crystal: 5000 } };
  game.colony();
  (game as unknown as { save(): void }).save();
  return store.get('planet-forge.empire.v1')!;
}

/** Tytuł karty budynku w panelu „Produkcja” (okno 1180 × 820) — dotknięcie obraca planetę do budynku. */
const CARD: Partial<Record<BuildingId, [number, number]>> = { metalMine: [86, 378], crystalMine: [305, 378] };
const NAMES: Partial<Record<BuildingId, string>> = { metalMine: 'Kopalnia metalu', crystalMine: 'Ekstraktor kryształów' };

// Playwright jest poza zależnościami projektu — szukany jak `require` (także globalnie, NODE_PATH).
const { chromium } = createRequire(import.meta.url)('playwright') as { chromium: any };
const browser = await chromium.launch({ args: ['--use-gl=swiftshader', '--enable-webgl', '--ignore-gpu-blocklist'] });
const shots: { id: BuildingId; level: number; png: string }[] = [];
for (const id of ['metalMine', 'crystalMine'] as BuildingId[]) {
  for (const stage of FOOTPRINT[id]) {
    // Środek etapu (ostatni etap — pełna wielkość).
    const level = stage === FOOTPRINT[id][FOOTPRINT[id].length - 1] ? stage.from + 5 : stage.from + 1;
    const save = saveWith(id, level);
    const page = await browser.newPage({ viewport: { width: 1180, height: 820 }, deviceScaleFactor: 2 });
    await page.addInitScript(
      ([s, g]: [string, string]) => {
        localStorage.setItem('planet-forge.empire.v1', s);
        localStorage.setItem('planet-forge.boot.v1', JSON.stringify({ run: null, ok: true, lastCrash: null, graphics: g }));
      },
      [save, graphics],
    );
    await page.goto(url);
    await page.waitForTimeout(5000);
    await page.mouse.click(...CARD[id]!);
    await page.waitForTimeout(1800);
    // Panel zamknięty, planeta przybliżona 2× (klawisz „+”).
    await page.mouse.click(458, 346);
    for (let k = 0; k < 4; k++) await page.keyboard.press('=');
    await page.waitForTimeout(2200);
    const buffer: Buffer = await page.screenshot({ clip: { x: 470, y: 120, width: 700, height: 600 } });
    shots.push({ id, level, png: buffer.toString('base64') });
    await page.close();
  }
}
// Zestawienie: wiersz na budynek, kolumna na etap, podpis z poziomem, etapem i liczbą pól.
const cells = (id: BuildingId) =>
  shots
    .filter((s) => s.id === id)
    .map(
      (s) =>
        `<figure><img src="data:image/png;base64,${s.png}"><figcaption><b>${stageName(id, s.level)}</b> · poz. ${s.level}<span>${fieldsFor(id, s.level)} pól</span></figcaption></figure>`,
    )
    .join('');
const html = `<!doctype html><meta charset="utf-8"><style>
  body { margin: 0; padding: 24px; background: #071012; color: #d8e6e2; font: 15px system-ui, sans-serif; }
  h1 { margin: 0 0 4px; font: 600 22px Georgia, serif; color: #e6c77a; } p { margin: 0 0 18px; color: #8ea6a0; }
  h2 { margin: 18px 0 10px; font: 600 14px system-ui; letter-spacing: 1.4px; text-transform: uppercase; color: #5ff2e0; }
  .row { display: grid; grid-template-columns: repeat(4, 1fr); gap: 12px; }
  figure { margin: 0; border: 1px solid #2b4846; border-radius: 10px; overflow: hidden; background: #0b1517; }
  img { display: block; width: 100%; }
  figcaption { display: flex; justify-content: space-between; padding: 8px 10px; } figcaption span { color: #e6c77a; }
</style><h1>Etapy kompleksów (v0.45)</h1><p>Planeta startowa, widok 2D, przybliżenie. Turkusowy obrys — cały obszar budynku. Liczby pól robocze.</p>
<h2>${NAMES.metalMine}</h2><div class="row">${cells('metalMine')}</div>
<h2>${NAMES.crystalMine}</h2><div class="row">${cells('crystalMine')}</div>`;
const page = await browser.newPage({ viewport: { width: 1600, height: 900 } });
await page.setContent(html);
await page.waitForTimeout(300);
writeFileSync(out, await page.screenshot({ fullPage: true }));
await browser.close();
console.log(`Zapisano ${out}`);
