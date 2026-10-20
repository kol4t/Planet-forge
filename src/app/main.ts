import Phaser from 'phaser';
import { PlanetScene, type Viewport } from '../game/scenes/PlanetScene.ts';
import { CanvasPlanetFallback } from '../planet-renderer/CanvasPlanetFallback.ts';
import type { PlanetDisplay } from '../planet-renderer/PlanetDisplay.ts';
import { hasWebGL, PlanetView } from '../planet-renderer/PlanetView.ts';
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
  return {
    width: Math.round(vv?.width ?? window.innerWidth),
    height: Math.round(vv?.height ?? window.innerHeight),
    dpr: Math.min(window.devicePixelRatio || 1, 3),
    safe: readSafeArea(),
  };
}

function start(): void {
  const planetCanvas = document.getElementById('planet') as HTMLCanvasElement;
  const uiRoot = document.getElementById('ui')!;
  const controller = new GameController();

  let display: PlanetDisplay;
  if (hasWebGL()) {
    try {
      display = new PlanetView(planetCanvas, () => showError('Utracono kontekst grafiki 3D. Odśwież stronę.'));
    } catch (error) {
      console.warn('WebGL nie zadziałał, używam widoku awaryjnego', error);
      display = new CanvasPlanetFallback(planetCanvas);
    }
  } else {
    display = new CanvasPlanetFallback(planetCanvas);
  }
  display.setPlanet(controller.planet);
  display.setStructures(controller.economy.levels);
  document.body.dataset.renderer = display.kind;

  const viewport = getViewport();
  const scene = new PlanetScene({ controller, display, getViewport, appVersion: __APP_VERSION__ });
  const game = new Phaser.Game({
    type: Phaser.AUTO,
    parent: uiRoot,
    transparent: true,
    width: viewport.width * viewport.dpr,
    height: viewport.height * viewport.dpr,
    scale: { mode: Phaser.Scale.NONE, zoom: 1 / viewport.dpr },
    input: { activePointers: 3 },
    banner: false,
    scene: [scene],
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
  window.addEventListener('pagehide', () => controller.save());
  setInterval(() => controller.save(), 10_000);

  game.events.once('ready', () => {
    const status = document.getElementById('status');
    if (status && !status.classList.contains('error')) status.hidden = true;
    // Offline + aktualizacje (tylko build produkcyjny serwowany przez https/http).
    registerServiceWorker((apply) => scene.showUpdateAvailable(apply));
  });

  // Safari: blokada powiększania strony gestem szczypania.
  for (const type of ['gesturestart', 'gesturechange']) {
    document.addEventListener(type, (event) => event.preventDefault());
  }
}

try {
  start();
} catch (error) {
  console.error(error);
  showError(`Nie udało się uruchomić gry: ${(error as Error).message}`);
}
