import Phaser from 'phaser';
import { PlanetScene, type Viewport } from '../game/scenes/PlanetScene.ts';
import { EmpireScene } from '../game/scenes/EmpireScene.ts';
import { MapScene } from '../game/scenes/MapScene.ts';
import { ResearchScene } from '../game/scenes/ResearchScene.ts';
import { CanvasPlanetFallback } from '../planet-renderer/CanvasPlanetFallback.ts';
import type { PlanetDisplay } from '../planet-renderer/PlanetDisplay.ts';
import { hasWebGL, PlanetView } from '../planet-renderer/PlanetView.ts';
import { distantBodies } from '../planet-renderer/sky.ts';
import { SpaceBackground, type SkyScene } from '../planet-renderer/spaceBackground.ts';
import { findStar, generateSystem, parseAddress } from '../core/galaxy/galaxy.ts';
import { PLANET_DEFINITIONS } from '../data/planets.ts';
import { BootGuard } from './bootGuard.ts';
import { createErrorLog } from './feedback.ts';
import { FpsMeter } from './fpsMeter.ts';
import { GameController } from './GameController.ts';
import { registerServiceWorker } from './pwa.ts';

function showError(message: string): void {
  const status = document.getElementById('status');
  if (!status) return;
  status.hidden = false;
  status.classList.add('error');
  status.textContent = message;
}

/** Marginesy bezpieczne (notch, pasek Home) odczytane z CSS env(). */
function readSafeArea(): Viewport['safe'] {
  const probe = document.getElementById('safe-probe');
  if (!probe) return { top: 0, right: 0, bottom: 0, left: 0 };
  const style = getComputedStyle(probe);
  return {
    top: parseFloat(style.paddingTop) || 0,
    right: parseFloat(style.paddingRight) || 0,
    bottom: parseFloat(style.paddingBottom) || 0,
    left: parseFloat(style.paddingLeft) || 0,
  };
}

function getViewport(): Viewport {
  const vv = window.visualViewport;
  // Tuż po starcie z ekranu początkowego iOS potrafi zgłosić zerowy rozmiar — wtedy bierzemy inne źródło.
  const pick = (...values: (number | undefined)[]) => Math.round(values.find((v) => v !== undefined && v > 0) ?? 1);
  return {
    width: pick(vv?.width, window.innerWidth, document.documentElement.clientWidth),
    height: pick(vv?.height, window.innerHeight, document.documentElement.clientHeight),
    // Panele (Phaser) w maks. 2× — wyżej nie widać różnicy, a rośnie zużycie pamięci.
    dpr: Math.min(window.devicePixelRatio || 1, 2),
    safe: readSafeArea(),
  };
}

/** Liczby z karty graficznej (tylko 3D): rysowania, trójkąty i zajęta pamięć (geometrie, tekstury). */
function gpuLine(display: PlanetDisplay): Record<string, string> {
  const s = display.gpuStats?.();
  return s ? { 'grafika 3D': `${s.drawCalls} rysowań, ${s.triangles} trójkątów, ${s.geometries} geometrii, ${s.textures} tekstur` } : {};
}

/** Niebo aktywnej planety: kolor gwiazdy i sąsiednie ciała jej układu (z mapy galaktyki). */
function skyFor(controller: GameController): SkyScene {
  const where = parseAddress(controller.address);
  const system = where ? generateSystem(controller.galaxy, where.system) : null;
  return {
    seed: controller.planet.seed,
    starColor: system ? findStar(system.star).color : '#f2d27a',
    bodies: distantBodies(system, where?.position ?? 0, PLANET_DEFINITIONS),
  };
}

/**
 * Tło kosmosu podpięte pod planetę: dostaje te same rozmiary i położenie co renderer
 * (PlanetScene dalej zna tylko interfejs PlanetDisplay).
 */
function withSpace(display: PlanetDisplay, space: SpaceBackground, controller: GameController): PlanetDisplay {
  return {
    kind: display.kind,
    setPlanet(planet) {
      display.setPlanet(planet);
      space.setScene(skyFor(controller));
    },
    setStructures: (levels, site, plots, complexes) => display.setStructures(levels, site, plots, complexes),
    pickStructure: (x, y) => display.pickStructure(x, y),
    setHighlight: (cells, mode) => display.setHighlight(cells, mode),
    pickCell: (x, y, cells) => display.pickCell(x, y, cells),
    showBuilding: (id, index) => display.showBuilding(id, index),
    beginDrag: () => display.beginDrag(),
    drag: (dx, dy) => display.drag(dx, dy),
    endDrag: () => display.endDrag(),
    setZoom: (zoom, instant) => display.setZoom(zoom, instant),
    zoomLevel: () => display.zoomLevel(),
    renderScale: display.renderScale ? () => display.renderScale!() : undefined,
    gpuStats: display.gpuStats ? () => display.gpuStats!() : undefined,
    resetView: () => display.resetView(),
    holdSpin: (hold) => display.holdSpin(hold),
    setGridVisible: (visible) => display.setGridVisible(visible),
    setOrbital: (level) => display.setOrbital(level),
    orientation: () => display.orientation(),
    setOrientation: (yaw, pitch) => display.setOrientation(yaw, pitch),
    setFocus(cx, cy, r) {
      display.setFocus(cx, cy, r);
      space.setFocus(cx, cy, r);
    },
    resize(width, height) {
      display.resize(width, height);
      space.resize(width, height);
    },
    dispose() {
      display.dispose();
      space.dispose();
    },
  };
}

/** Obrót i przybliżenie planety przenoszone przez przeładowanie strony przy zmianie grafiki 2D ↔ 3D. */
const VIEW_KEY = 'planet-forge.view.v1';

function rememberView(display: PlanetDisplay): void {
  try {
    sessionStorage.setItem(VIEW_KEY, JSON.stringify({ ...display.orientation(), zoom: display.zoomLevel() }));
  } catch {
    // brak pamięci sesji — planeta startuje w zwykłej pozycji
  }
}

function restoreView(display: PlanetDisplay): void {
  try {
    const raw = sessionStorage.getItem(VIEW_KEY);
    if (!raw) return;
    sessionStorage.removeItem(VIEW_KEY);
    const view = JSON.parse(raw) as { yaw?: unknown; pitch?: unknown; zoom?: unknown };
    if (typeof view.yaw === 'number' && typeof view.pitch === 'number' && Number.isFinite(view.yaw + view.pitch)) {
      display.setOrientation(view.yaw, view.pitch);
    }
    if (typeof view.zoom === 'number' && Number.isFinite(view.zoom)) display.setZoom(view.zoom, true);
  } catch {
    // uszkodzony wpis — ignorujemy
  }
}

function safeStorage(): Storage | null {
  try {
    return globalThis.localStorage ?? null;
  } catch {
    return null;
  }
}

function isStandalone(): boolean {
  try {
    return matchMedia('(display-mode: standalone)').matches || (navigator as { standalone?: boolean }).standalone === true;
  } catch {
    return false;
  }
}

function start(boot: BootGuard): void {
  const planetCanvas = document.getElementById('planet') as HTMLCanvasElement;
  const uiRoot = document.getElementById('ui')!;
  const controller = new GameController();
  boot.step('zapis wczytany');

  const { safeMode } = boot.state;
  let renderer: PlanetDisplay;
  if (!safeMode && hasWebGL()) {
    try {
      renderer = new PlanetView(planetCanvas, () => {
        boot.step('utrata kontekstu 3D');
        showError('Utracono kontekst grafiki 3D. Zamknij i otwórz grę ponownie — uruchomi się w trybie bezpiecznym.');
      });
    } catch (error) {
      console.warn('WebGL nie zadziałał, używam widoku awaryjnego', error);
      renderer = new CanvasPlanetFallback(planetCanvas);
    }
  } else {
    renderer = new CanvasPlanetFallback(planetCanvas);
  }
  const space = new SpaceBackground(document.body, () => renderer.orientation());
  const display = withSpace(renderer, space, controller);
  boot.step(`grafika ${display.kind}`);
  display.setPlanet(controller.planet);
  display.setStructures(controller.economy.levels, null, controller.colony().plots, controller.colony().complexes);
  document.body.dataset.renderer = display.kind;
  restoreView(display);
  boot.step('planeta gotowa');

  const viewport = getViewport();
  // Licznik płynności: osobna, bardzo lekka pętla klatek (tylko liczy).
  const fps = new FpsMeter();
  const countFrame = (time: number) => {
    fps.frame(time);
    requestAnimationFrame(countFrame);
  };
  requestAnimationFrame(countFrame);
  const scene = new PlanetScene({
    controller,
    display,
    getViewport,
    appVersion: __APP_VERSION__,
    graphics: {
      safeMode,
      crashedLastTime: boot.crashedLastTime,
      active: display.kind,
      setMode: (mode: '2d' | '3d') => {
        boot.setGraphics(mode);
        controller.save();
        rememberView(display);
        location.reload();
      },
      diagnostics: () =>
        [
          boot.diagnostics({
          wersja: __APP_VERSION__,
          przeglądarka: navigator.userAgent,
          ekran: `${screen.width}×${screen.height} @${window.devicePixelRatio}`,
          okno: `${viewport.width}×${viewport.height}`,
          'z ekranu początkowego': isStandalone() ? 'tak' : 'nie',
          'grafika teraz': display.kind + (display.renderScale ? ` (rozdzielczość ${Math.round(display.renderScale() * 100)}%)` : ''),
          'płynność (ostatnia minuta)': fps.describe(),
          ...gpuLine(display),
          planety: `${controller.slotInfo.used} z ${controller.slotInfo.unlocked}`,
          planeta: `${controller.planet.displayName} (${controller.planet.definitionId}, ${controller.address || 'startowa'}, seed ${controller.planet.seed})`,
          budynki: Object.entries(controller.economy.levels)
            .map(([id, level]) => `${id} ${level}`)
            .join(', '),
          pola: `${controller.fields.used}/${controller.fields.buildable}`,
        }),
          errors.describe(),
        ].join('\n'),
    },
  });
  // Tylko podgląd (`npm run dev`, bez PWA): dostęp dla skryptów pomiarowych (scripts/perf.ts). W grze — nie istnieje.
  if (!__PWA__) (window as unknown as { __planetForge?: unknown }).__planetForge = { controller, display, fps, scene };
  const research = new ResearchScene({ controller, getViewport });
  const map = new MapScene({ controller, getViewport });
  const empire = new EmpireScene({ controller, getViewport });
  const game = new Phaser.Game({
    // Panele rysowane w Canvas 2D: jedyny kontekst WebGL ma planeta (mniej pamięci grafiki).
    type: Phaser.CANVAS,
    parent: uiRoot,
    transparent: true,
    width: viewport.width * viewport.dpr,
    height: viewport.height * viewport.dpr,
    scale: { mode: Phaser.Scale.NONE, zoom: 1 / viewport.dpr },
    input: { activePointers: 3 },
    banner: false,
    scene: [scene, research, map, empire],
  });

  let pending = 0;
  const onResize = () => {
    cancelAnimationFrame(pending);
    pending = requestAnimationFrame(() => {
      if (!game.isBooted) return;
      const vp = getViewport();
      game.scale.resize(vp.width * vp.dpr, vp.height * vp.dpr);
      game.scale.setZoom(1 / vp.dpr);
      if (scene.sys?.isActive()) scene.relayout();
      if (research.sys?.isActive()) research.relayout();
      if (map.sys?.isActive()) map.relayout();
      if (empire.sys?.isActive()) empire.relayout();
    });
  };
  window.addEventListener('resize', onResize);
  window.visualViewport?.addEventListener('resize', onResize);
  window.addEventListener('orientationchange', () => setTimeout(onResize, 250));

  // Zapis: przy schowaniu karty, przy zamknięciu i co 10 s.
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'hidden') controller.save();
    else controller.tick();
  });
  window.addEventListener('pagehide', () => {
    controller.save();
    boot.markClosed();
  });
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'hidden') boot.markClosed();
  });
  setInterval(() => controller.save(), 10_000);

  game.events.once('ready', () => {
    boot.step('panele gotowe');
    const status = document.getElementById('status');
    if (status && !status.classList.contains('error')) status.hidden = true;
    // Offline + aktualizacje. Po awarii nowa wersja (może z poprawką) włącza się od razu.
    registerServiceWorker((apply) => scene.showUpdateAvailable(apply), { applyImmediately: boot.crashedLastTime });
  });

  // Stabilnie = 8 s widocznej pracy. Dopiero wtedy start nie liczy się jako awaria.
  let visibleMs = 0;
  const stableTimer = setInterval(() => {
    if (document.visibilityState === 'visible') visibleMs += 1000;
    if (visibleMs >= 8000) {
      boot.markStable();
      clearInterval(stableTimer);
    }
  }, 1000);

  // Safari: blokada powiększania strony gestem szczypania.
  for (const type of ['gesturestart', 'gesturechange']) {
    document.addEventListener(type, (event) => event.preventDefault());
  }
}

// Dziennik błędów do zgłoszeń (Ustawienia → Zgłoś / diagnostyka): błędy JavaScript i odrzucone obietnice.
const errors = createErrorLog(safeStorage(), __APP_VERSION__);
window.addEventListener('error', (event) => {
  const file = (event.filename || '').split('/').pop() || '?';
  errors.record(event.message || String(event.error), `${file}:${event.lineno}:${event.colno}`);
});
window.addEventListener('unhandledrejection', (event) => {
  const reason = event.reason as { message?: string } | undefined;
  errors.record(String(reason?.message ?? event.reason), 'promise');
});

const boot = new BootGuard(safeStorage(), Date.now());
try {
  start(boot);
} catch (error) {
  errors.record((error as Error).message, 'start');
  boot.step(`błąd: ${(error as Error).message}`);
  console.error(error);
  showError(`Nie udało się uruchomić gry: ${(error as Error).message}`);
}
