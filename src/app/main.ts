import Phaser from 'phaser';
import { PlanetScene, type Viewport } from '../game/scenes/PlanetScene.ts';
import { CanvasPlanetFallback } from '../planet-renderer/CanvasPlanetFallback.ts';
import type { PlanetDisplay } from '../planet-renderer/PlanetDisplay.ts';
import { hasWebGL, PlanetView } from '../planet-renderer/PlanetView.ts';
import { BootGuard } from './bootGuard.ts';
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
  let display: PlanetDisplay;
  if (!safeMode && hasWebGL()) {
    try {
      display = new PlanetView(planetCanvas, () => {
        boot.step('utrata kontekstu 3D');
        showError('Utracono kontekst grafiki 3D. Zamknij i otwórz grę ponownie — uruchomi się w trybie bezpiecznym.');
      });
    } catch (error) {
      console.warn('WebGL nie zadziałał, używam widoku awaryjnego', error);
      display = new CanvasPlanetFallback(planetCanvas);
    }
  } else {
    display = new CanvasPlanetFallback(planetCanvas);
  }
  boot.step(`grafika ${display.kind}`);
  display.setPlanet(controller.planet);
  display.setStructures(controller.economy.levels);
  document.body.dataset.renderer = display.kind;
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
        location.reload();
      },
      diagnostics: () =>
        boot.diagnostics({
          wersja: __APP_VERSION__,
          przeglądarka: navigator.userAgent,
          ekran: `${screen.width}×${screen.height} @${window.devicePixelRatio}`,
          okno: `${viewport.width}×${viewport.height}`,
          'z ekranu początkowego': isStandalone() ? 'tak' : 'nie',
          'grafika teraz': display.kind,
          'płynność (ostatnia minuta)': fps.describe(),
          planety: `${controller.slotInfo.used} z ${controller.slotInfo.unlocked}`,
        }),
    },
  });
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

const boot = new BootGuard(safeStorage(), Date.now());
try {
  start(boot);
} catch (error) {
  boot.step(`błąd: ${(error as Error).message}`);
  console.error(error);
  showError(`Nie udało się uruchomić gry: ${(error as Error).message}`);
}
