// Pomiar wydajności w przeglądarce bezgłowej (audyt v0.46): start gry, klatki na sekundę (2D i 3D, z panelem
// i bez, przybliżenie), rysowania i trójkąty 3D, pamięć po 10 zmianach planety. SYMULACJA: procesor spowolniony
// 4× (CDP), 3D rysowane programowo (SwiftShader) — liczby porównują wersje między sobą, NIE są pomiarem iPada.
// Uruchomienie: node scripts/perf.ts <adres gry> [etykieta] [--deep]
//   adres zbudowanej gry (npm run build + serwer plików) — start i klatki;
//   --deep: dodatkowo rysowania 3D i pamięć (wymaga podglądu `npm run dev` — dostęp `window.__planetForge`).
import { createRequire } from 'node:module';
import { computeLayout } from '../src/game/ui/layout.ts';
import { BALANCE } from '../src/data/balance.ts';
import { AI_RULES } from '../src/core/ai/advisor.ts';

const url = process.argv[2] ?? 'http://localhost:5173';
const label = process.argv[3] ?? url;
const deep = process.argv.includes('--deep');
const THROTTLE = 4;
const VIEW = { width: 1180, height: 820 };

const store = new Map<string, string>();
(globalThis as { localStorage?: unknown }).localStorage = {
  getItem: (k: string) => store.get(k) ?? null,
  setItem: (k: string, v: string) => void store.set(k, v),
  removeItem: (k: string) => void store.delete(k),
};
const { GameController } = await import('../src/app/GameController.ts');
const { RESEARCH_NODES } = await import('../src/data/research.ts');

/** Ten sam zapis „ze środka gry” co w scripts/screens.ts (3 planety, rozbudowana startowa). */
function midGameSave(): string {
  store.clear();
  const now = Date.now();
  const game = new GameController(now);
  game.research = { done: RESEARCH_NODES.filter((n) => n.ring <= 2 && !n.soon).map((n) => n.id), current: null };
  game.economy = { ...game.economy, stock: { metal: 9e6, crystal: 9e6 } };
  const free = game.system(game.homeSystem)!.planets.filter((p) => p.body === 'rocky' && game.occupantAt(p) === 'free');
  for (const p of free.slice(0, 2)) game.colonize(p.address, now);
  game.switchPlanet(0, now);
  game.economy = {
    ...game.economy,
    levels: { metalMine: 14, crystalMine: 12, powerPlant: 11, storage: 16, antimatterCollector: 3, laboratory: 6 },
    stock: { metal: 48_215, crystal: 31_906 },
    antimatter: 37,
  };
  game.colony();
  game.save();
  return store.get('planet-forge.empire.v1')!;
}

const save = midGameSave();
const { chromium } = createRequire(import.meta.url)('playwright') as { chromium: any };
const browser = await chromium.launch({ args: ['--use-gl=swiftshader', '--enable-webgl', '--ignore-gpu-blocklist', '--enable-precise-memory-info', '--js-flags=--expose-gc'] });

async function open(graphics: '2d' | '3d') {
  const page = await browser.newPage({ viewport: VIEW, deviceScaleFactor: 2 });
  const cdp = await page.context().newCDPSession(page);
  await cdp.send('Emulation.setCPUThrottlingRate', { rate: THROTTLE });
  await cdp.send('Performance.enable');
  await page.addInitScript(
    ([s, g]: [string, string]) => {
      localStorage.setItem('planet-forge.empire.v1', s);
      localStorage.setItem('planet-forge.boot.v1', JSON.stringify({ run: null, ok: true, lastCrash: null, graphics: g }));
      localStorage.setItem('planet-forge.ui.v2', JSON.stringify({ open: null }));
    },
    [save, graphics],
  );
  const t0 = Date.now();
  await page.goto(url);
  await page.waitForFunction(() => document.getElementById('status')?.hidden === true, null, { timeout: 120_000 });
  const startMs = Date.now() - t0;
  return { page, cdp, startMs };
}

/** Klatki na sekundę przez `seconds` s: średnia i najsłabsza sekunda (licznik requestAnimationFrame). */
async function fps(page: any, seconds = 5): Promise<{ avg: number; worst: number }> {
  return page.evaluate(
    (s: number) =>
      new Promise<{ avg: number; worst: number }>((resolve) => {
        const per: number[] = [];
        let frames = 0;
        let start = performance.now();
        let bucket = start;
        const tick = (t: number) => {
          frames++;
          if (t - bucket >= 1000) {
            per.push((frames * 1000) / (t - bucket));
            frames = 0;
            bucket = t;
          }
          if (t - start < s * 1000) requestAnimationFrame(tick);
          else resolve({ avg: per.reduce((a, b) => a + b, 0) / Math.max(1, per.length), worst: Math.min(...per) });
        };
        requestAnimationFrame((t) => {
          start = bucket = t;
          requestAnimationFrame(tick);
        });
      }),
    seconds,
  );
}

const heapMB = async (cdp: any) => {
  await cdp.send('HeapProfiler.collectGarbage');
  const { metrics } = await cdp.send('Performance.getMetrics');
  return metrics.find((m: { name: string }) => m.name === 'JSHeapUsedSize').value / 1048576;
};

const layout = (open: 'production' | null) => computeLayout(VIEW.width, VIEW.height, undefined, BALANCE.buildings.length, { open }, AI_RULES.length, 3);
const rows: string[] = [];
for (const graphics of ['2d', '3d'] as const) {
  const { page, cdp, startMs } = await open(graphics);
  await page.waitForTimeout(2500);
  rows.push(`| ${graphics.toUpperCase()} | start (do gotowych paneli) | ${(startMs / 1000).toFixed(1)} s |`);
  const base = await fps(page);
  rows.push(`| ${graphics.toUpperCase()} | klatki: bez panelu, 1× | ${base.avg.toFixed(0)} (najsłabsza s: ${base.worst.toFixed(0)}) |`);
  for (let k = 0; k < 3; k++) await page.keyboard.press('=');
  await page.waitForTimeout(1500);
  const near = await fps(page);
  rows.push(`| ${graphics.toUpperCase()} | klatki: bez panelu, przybliżenie ~2,7× | ${near.avg.toFixed(0)} (${near.worst.toFixed(0)}) |`);
  await page.keyboard.press('0');
  const prod = layout(null).dock.items.find((i) => i.id === 'production')!.rect;
  await page.mouse.click(prod.x + prod.w / 2, prod.y + prod.h / 2);
  await page.waitForTimeout(1500);
  const panel = await fps(page);
  rows.push(`| ${graphics.toUpperCase()} | klatki: panel „Produkcja”, 1× | ${panel.avg.toFixed(0)} (${panel.worst.toFixed(0)}) |`);
  if (deep) {
    const stats = await page.evaluate(() => (window as any).__planetForge?.display.gpuStats?.() ?? null);
    if (stats) rows.push(`| 3D | rysowania / trójkąty / geometrie / tekstury | ${stats.drawCalls} / ${stats.triangles} / ${stats.geometries} / ${stats.textures} |`);
    const before = await heapMB(cdp);
    const gpuBefore = stats;
    // 10 zmian, potem kolejne 10: wzrost po pierwszych to pamięć podręczna siatek i terenu (3 planety),
    // wzrost po drugich świadczyłby o wycieku.
    const tour = async () => {
      for (let i = 0; i < 10; i++) {
        await page.evaluate((n: number) => (window as any).__planetForge.controller.switchPlanet(n), (i + 1) % 3);
        await page.waitForTimeout(1200);
      }
      await page.evaluate(() => (window as any).__planetForge.controller.switchPlanet(0));
      await page.waitForTimeout(1500);
      return { heap: await heapMB(cdp), gpu: await page.evaluate(() => (window as any).__planetForge?.display.gpuStats?.() ?? null) };
    };
    const first = await tour();
    const second = await tour();
    rows.push(`| ${graphics.toUpperCase()} | pamięć JS: start → po 10 → po 20 zmianach planety | ${before.toFixed(1)} → ${first.heap.toFixed(1)} → ${second.heap.toFixed(1)} MB |`);
    if (gpuBefore && first.gpu && second.gpu) {
      rows.push(`| 3D | geometrie / tekstury: start → po 10 → po 20 zmianach | ${gpuBefore.geometries}/${gpuBefore.textures} → ${first.gpu.geometries}/${first.gpu.textures} → ${second.gpu.geometries}/${second.gpu.textures} |`);
    }
  }
  await page.close();
}
await browser.close();
console.log(`\n### ${label} (procesor spowolniony ${THROTTLE}×, okno ${VIEW.width}×${VIEW.height} @2x)\n`);
console.log('| Grafika | Pomiar | Wynik |\n|---|---|---:|');
for (const r of rows) console.log(r);
