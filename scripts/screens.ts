// Zrzuty głównych ekranów w kilku rozmiarach (audyt v0.46): iPad poziomo/pionowo, telefon, komputer.
// Prawdziwa gra (`npm run dev`, http://localhost:5173) w przeglądarce bezgłowej Playwright (devDependency) na
// przykładowym zapisie „ze środka gry”. To SYMULACJA — nie zastępuje sprawdzenia na iPadzie.
// Uruchomienie: node scripts/screens.ts [folder] [2d|3d] [rozmiary, np. ipad-l,phone-p]
// Wynik: PNG każdego ekranu + zestawienia `zestaw-<rozmiar>.png` (wszystkie ekrany jednego rozmiaru).
import { mkdirSync, writeFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { computeLayout, planetFooterRows, TOUCH, type PanelId } from '../src/game/ui/layout.ts';
import { AI_RULES } from '../src/core/ai/advisor.ts';
import { BALANCE } from '../src/data/balance.ts';
import { RESEARCH_NODES } from '../src/data/research.ts';

const outDir = process.argv[2] ?? 'docs/audyt/zrzuty';
const graphics = process.argv[3] === '3d' ? '3d' : '2d';
const only = process.argv[4]?.split(',');
const url = process.env.PREVIEW_URL ?? 'http://localhost:5173';

export const VIEWPORTS = [
  { id: 'ipad-l', name: 'iPad poziomo 1180×820', width: 1180, height: 820, scale: 2, mobile: true },
  { id: 'ipad-pro', name: 'iPad Pro poziomo 1366×1024', width: 1366, height: 1024, scale: 2, mobile: true },
  { id: 'ipad-p', name: 'iPad pionowo 820×1180', width: 820, height: 1180, scale: 2, mobile: true },
  { id: 'phone-p', name: 'Telefon pionowo 390×844', width: 390, height: 844, scale: 3, mobile: true },
  { id: 'phone-l', name: 'Telefon poziomo 844×390', width: 844, height: 390, scale: 3, mobile: true },
  { id: 'desk', name: 'Komputer 1440×900', width: 1440, height: 900, scale: 1, mobile: false },
  { id: 'desk-hd', name: 'Komputer 1920×1080', width: 1920, height: 1080, scale: 1, mobile: false },
] as const;

const store = new Map<string, string>();
(globalThis as { localStorage?: unknown }).localStorage = {
  getItem: (k: string) => store.get(k) ?? null,
  setItem: (k: string, v: string) => void store.set(k, v),
  removeItem: (k: string) => void store.delete(k),
};
const { GameController } = await import('../src/app/GameController.ts');

/** Zapis „ze środka gry”: rozbudowana planeta startowa (z niedoborem energii), badania, SI, 3 planety. */
function midGameSave(): { save: string; planets: number } {
  store.clear();
  const now = Date.now();
  const game = new GameController(now);
  // Badania pierwszych pierścieni wszystkich aktywnych ramion (SI Matka, statki, sondy…).
  const done = RESEARCH_NODES.filter((n) => n.ring <= 2 && !n.soon).map((n) => n.id);
  game.research = { done, current: null };
  const free = game.system(game.homeSystem)!.planets.filter((p) => p.body === 'rocky' && game.occupantAt(p) === 'free');
  game.economy = { ...game.economy, stock: { metal: 9e6, crystal: 9e6 } };
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
  return { save: store.get('planet-forge.empire.v1')!, planets: game.slotInfo.used };
}

type Shot = { id: string; name: string; png: Buffer };

const { chromium } = createRequire(import.meta.url)('playwright') as { chromium: any };
const browser = await chromium.launch({ args: ['--use-gl=swiftshader', '--enable-webgl', '--ignore-gpu-blocklist'] });
const { save, planets } = midGameSave();
mkdirSync(outDir, { recursive: true });

for (const vp of VIEWPORTS.filter((v) => !only || only.includes(v.id))) {
  const aiRows = AI_RULES.length;
  const layoutFor = (open: PanelId | null) => computeLayout(vp.width, vp.height, undefined, BALANCE.buildings.length, { open }, aiRows, planets);
  const shots: Shot[] = [];

  const open = async (panel: PanelId | null) => {
    const page = await browser.newPage({ viewport: { width: vp.width, height: vp.height }, deviceScaleFactor: vp.scale, isMobile: vp.mobile, hasTouch: vp.mobile });
    await page.addInitScript(
      ([s, g, p]: [string, string, string | null]) => {
        localStorage.setItem('planet-forge.empire.v1', s);
        localStorage.setItem('planet-forge.boot.v1', JSON.stringify({ run: null, ok: true, lastCrash: null, graphics: g }));
        localStorage.setItem('planet-forge.ui.v2', JSON.stringify({ open: p }));
      },
      [save, graphics, panel],
    );
    await page.goto(url);
    await page.waitForTimeout(4500);
    return page;
  };
  const tap = async (page: any, x: number, y: number) => {
    if (vp.mobile) await page.touchscreen.tap(x, y);
    else await page.mouse.click(x, y);
  };
  const center = (r: { x: number; y: number; w: number; h: number }) => [r.x + r.w / 2, r.y + r.h / 2] as const;
  const shoot = async (page: any, id: string, name: string) => {
    const png: Buffer = await page.screenshot();
    writeFileSync(`${outDir}/${vp.id}-${id}.png`, png);
    shots.push({ id, name, png });
  };

  // Panele z dolnego paska (stan panelu z pamięci urządzenia).
  for (const [panel, name] of [
    [null, 'Planeta (bez paneli)'],
    ['production', 'Produkcja'],
    ['planet', 'Planeta — panel'],
    ['ai', 'SI'],
    ['planets', 'Lista planet (☰)'],
  ] as const) {
    const page = await open(panel);
    await shoot(page, panel ?? 'start', name);
    if (panel === 'production') {
      // Panel budynku: dotknięcie karty obraca planetę do budowli, dotknięcie budowli otwiera kartę.
      const l = layoutFor('production');
      const card = l.cards[0]!;
      await tap(page, card.x + card.w * 0.3, card.y + 14);
      await page.waitForTimeout(1800);
      await tap(page, l.planet.cx, l.planet.cy);
      await page.waitForTimeout(1600);
      await shoot(page, 'building', 'Panel budynku (z Produkcją)');
    }
    if (panel === 'planets') {
      const l = layoutFor('planets');
      const box = l.panel!.body;
      const gap = Math.round(10 * l.u);
      const rows = planetFooterRows(l.dock.hidden.length);
      const footerTop = box.y + box.h - rows * TOUCH - (rows - 1) * gap;
      const i = l.dock.hidden.length;
      const half = (box.w - gap) / 2;
      await tap(page, box.x + (i % 2) * (half + gap) + half / 2, footerTop + Math.floor(i / 2) * (TOUCH + gap) + TOUCH / 2);
      await page.waitForTimeout(900);
      await shoot(page, 'settings', 'Ustawienia');
    }
    await page.close();
  }
  // Ekrany pełnoekranowe z dolnego paska (albo z menu, gdy się nie zmieściły).
  for (const [screen, name] of [
    ['research', 'Badania'],
    ['map', 'Mapa'],
    ['empire', 'Imperium'],
  ] as const) {
    const page = await open(null);
    const l = layoutFor(null);
    const item = l.dock.items.find((d) => d.id === screen);
    if (item) {
      await tap(page, ...center(item.rect));
    } else {
      // Przycisk w panelu „Planety” (pod listą).
      await tap(page, ...center(l.dock.menu));
      await page.waitForTimeout(700);
      const lp = layoutFor('planets');
      const box = lp.panel!.body;
      const gap = Math.round(10 * lp.u);
      const rows = planetFooterRows(lp.dock.hidden.length);
      const footerTop = box.y + box.h - rows * TOUCH - (rows - 1) * gap;
      const i = lp.dock.hidden.indexOf(screen);
      const half = (box.w - gap) / 2;
      await tap(page, box.x + (i % 2) * (half + gap) + half / 2, footerTop + Math.floor(i / 2) * (TOUCH + gap) + TOUCH / 2);
    }
    await page.waitForTimeout(2200);
    await shoot(page, screen, name);
    await page.close();
  }

  // Zestawienie wszystkich ekranów rozmiaru.
  const cols = vp.width >= vp.height ? 3 : 5;
  const html = `<!doctype html><meta charset="utf-8"><style>
    body { margin: 0; padding: 20px; background: #071012; color: #d8e6e2; font: 15px system-ui, sans-serif; }
    h1 { margin: 0 0 14px; font: 600 20px Georgia, serif; color: #e6c77a; }
    .grid { display: grid; grid-template-columns: repeat(${cols}, 1fr); gap: 14px; }
    figure { margin: 0; border: 1px solid #2b4846; border-radius: 8px; overflow: hidden; background: #0b1517; }
    img { display: block; width: 100%; } figcaption { padding: 6px 10px; color: #9fd8cf; }
  </style><h1>${vp.name} · ${graphics.toUpperCase()} · symulacja w przeglądarce bezgłowej</h1><div class="grid">${shots
    .map((s) => `<figure><img src="data:image/png;base64,${s.png.toString('base64')}"><figcaption>${s.name}</figcaption></figure>`)
    .join('')}</div>`;
  const sheet = await browser.newPage({ viewport: { width: cols * 520, height: 900 } });
  await sheet.setContent(html);
  await sheet.waitForTimeout(300);
  writeFileSync(`${outDir}/zestaw-${vp.id}.png`, await sheet.screenshot({ fullPage: true }));
  await sheet.close();
  console.log(`${vp.name}: ${shots.length} zrzutów`);
}
await browser.close();
