// Pomiar widoku (etap A planu „widok układu”): konteksty WebGL, pętla rysowania przy bezruchu, kolonia na wysokich
// poziomach (rysowania 3D), koszt mapy galaktyki i układu. Wymaga podglądu `npm run dev` (window.__planetForge).
// Uruchomienie: node scripts/perf-view.ts — SYMULACJA w przeglądarce bezgłowej (3D programowo), nie pomiar iPada.
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
const { chromium } = require('playwright');
const out: string[] = [];
const browser = await chromium.launch({ args: ['--use-gl=swiftshader', '--enable-webgl', '--ignore-gpu-blocklist'] });
for (const mode of ['2d', '3d']) {
  const page = await browser.newPage({ viewport: { width: 1180, height: 820 }, deviceScaleFactor: 2 });
  await page.addInitScript((mode: string) => {
    localStorage.setItem('planet-forge.boot.v1', JSON.stringify({ run: null, ok: true, lastCrash: null, graphics: mode }));
    const w = window as any;
    w.__gl = 0; w.__raf = 0; w.__ctx = [];
    const get = HTMLCanvasElement.prototype.getContext;
    HTMLCanvasElement.prototype.getContext = function (this: HTMLCanvasElement, type: string, ...a: any[]) {
      const c = get.call(this, type as any, ...a);
      if (c && /webgl/.test(type) && !(this as any).__counted) { (this as any).__counted = true; w.__gl++; w.__ctx.push(c); }
      return c;
    } as any;
    // Rysowania WebGL na sekundę (3D) — czy przy bezruchu renderer rysuje rzadziej (etap F).
    w.__draws = 0;
    for (const proto of [window.WebGL2RenderingContext?.prototype, window.WebGLRenderingContext?.prototype]) {
      if (!proto) continue;
      for (const name of ['drawElements', 'drawArrays', 'drawElementsInstanced', 'drawArraysInstanced'] as const) {
        const fn = (proto as any)[name];
        if (typeof fn === 'function') (proto as any)[name] = function (this: unknown, ...a: unknown[]) { w.__draws++; return fn.apply(this, a); };
      }
    }
    const raf = window.requestAnimationFrame.bind(window);
    window.requestAnimationFrame = (cb: FrameRequestCallback) => { w.__raf++; return raf(cb); };
  }, mode);
  await page.goto('http://localhost:5173/');
  await page.waitForFunction(() => (window as any).__planetForge, null, { timeout: 120000 });
  await page.waitForTimeout(4000);
  // Bezruch: wywołania requestAnimationFrame i (3D) rysowania w 3 s bez dotyku.
  const idle = await page.evaluate(async () => {
    const w = window as any;
    const r0 = w.__raf;
    const d0 = w.__draws;
    const g0 = w.__planetForge.display.gpuStats?.();
    await new Promise((r) => setTimeout(r, 3000));
    return { drawsPerSec: Math.round((w.__draws - d0) / 3), rafPerSec: Math.round((w.__raf - r0) / 3), gl: w.__gl, live: w.__ctx.filter((c: any) => !c.isContextLost()).length, gpu: g0 };
  });
  out.push(`${mode}: konteksty WebGL utworzone przy starcie ${idle.gl}, aktywne po starcie ${idle.live}; wywołania requestAnimationFrame przy bezruchu ~${idle.rafPerSec}/s (wszystkie pętle razem); rysowania WebGL przy bezruchu ~${idle.drawsPerSec}/s`);
  // Kolonia na poz. 40 (wszystkie budynki), bez megakonstruktu.
  const colony = await page.evaluate(async () => {
    const { controller: c, display: d } = (window as any).__planetForge;
    c.economy = { ...c.economy, levels: { metalMine: 40, crystalMine: 19, powerPlant: 30, storage: 20, antimatterCollector: 10, laboratory: 10 } };
    const col = c.colony();
    const t = performance.now();
    d.setStructures(c.economy.levels, null, col.plots, col.complexes, col.metalComplex);
    const ms = performance.now() - t;
    await new Promise((r) => setTimeout(r, 1500));
    return { ms: Math.round(ms), gpu: d.gpuStats?.() ?? null };
  });
  out.push(`${mode}: kolonia (metal 40, kryształy 19, energia 30, magazyn 20) — przeliczenie wyglądu ${colony.ms} ms; rysowania/trójkąty: ${colony.gpu ? `${colony.gpu.drawCalls} / ${colony.gpu.triangles} (geometrie ${colony.gpu.geometries})` : '— (2D)'}`);
  // Mapa: galaktyka i układ — czas zbudowania i liczba obiektów Phaser.
  const map = await page.evaluate(async () => {
    const { scene } = (window as any).__planetForge;
    const game = scene.game;
    const t = performance.now();
    game.scene.start('map', {});
    await new Promise((r) => setTimeout(r, 1500));
    const m = game.scene.getScene('map');
    const galaxy = { objects: m.children.list.length, ms: Math.round(performance.now() - t - 1500) };
    const sys = (window as any).__planetForge.controller.homeSystem;
    game.scene.start('map', { system: sys });
    await new Promise((r) => setTimeout(r, 1500));
    const m2 = game.scene.getScene('map');
    const textures = Object.keys(game.textures.list).filter((k) => k.startsWith('map-thumb')).length;
    return { galaxy, system: { objects: m2.children.list.length, textures } };
  });
  out.push(`${mode}: mapa — galaktyka: obiektów Phaser ${map.galaxy.objects}; układ: obiektów ${map.system.objects}, miniatur planet (tekstury) ${map.system.textures}`);
  await page.close();
}
await browser.close();
console.log(out.join('\n'));
