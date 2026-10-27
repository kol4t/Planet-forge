import Phaser from 'phaser';
import { openAsteroidPanel } from '../ui/asteroidPanel.ts';
import { openComplexPanel } from '../ui/complexPanel.ts';
import { openFindsPanel } from '../ui/findsPanel.ts';
import { openFactoryPanel } from '../ui/factoryPanel.ts';
import { TERRAIN_NAMES } from '../../core/colony/plots.ts';
import { BuildingCardView, type CardPlacement } from '../ui/buildingCard.ts';
import type { DepositInfo, GameController, PlanetOverview } from '../../app/GameController.ts';
import { antimatterAmount, capacityAtLevel, environmentEffect, fitsInStorage, scaled, secondsUntilAffordable } from '../../core/economy/economy.ts';
import { AI_RULES, type AiAction, type AiLevel, type AiRuleId } from '../../core/ai/advisor.ts';
import { ringLimit } from '../../core/research/research.ts';
import type { BuildingId, BuildingSettings, ResourceId, SpecializationId, YieldId } from '../../core/types.ts';
import { BALANCE } from '../../data/balance.ts';
import { findResearch } from '../../data/research.ts';
import type { PlanetDisplay } from '../../planet-renderer/PlanetDisplay.ts';
import { PlanetThumbnail, THUMBNAIL_SIZE } from '../../planet-renderer/PlanetThumbnail.ts';
import { Button, type ButtonStyle } from '../ui/Button.ts';
import { GestureTracker, type GestureEvent } from '../ui/gestures.ts';
import { openTextPanel } from '../ui/textPanel.ts';
import { openFeedbackPanel } from '../ui/feedbackPanel.ts';
import {
  computeLayout,
  planetFooterRows,
  PLANET_ROW_GAP,
  PLANET_ROW_H,
  DOCK_PANELS,
  TOUCH,
  type DockItemId,
  type Insets,
  type Layout,
  type PanelId,
  type PanelState,
  type Rect,
} from '../ui/layout.ts';
import { loadPanels, savePanels, FOCUS_ZOOMS, loadFocusZoom, loadGridVisible, saveFocusZoom, saveGridVisible } from '../ui/uiPrefs.ts';
import { approach, BUILD_FLASH_MS, PANEL_IN_MS, PANEL_IN_OFFSET, prefersReducedMotion } from '../ui/motion.ts';
import { COLORS, FONTS, formatAmount, formatDuration, formatInt, formatRate, formatSpan } from '../ui/theme.ts';
import { OVERLAY_CLOSED } from './OverlayScene.ts';

export interface Viewport {
  width: number;
  height: number;
  dpr: number;
  safe: Insets;
}

export interface SceneDeps {
  controller: GameController;
  display: PlanetDisplay;
  getViewport: () => Viewport;
  /** Wersja gry pokazywana w ustawieniach. */
  appVersion: string;
  graphics: GraphicsInfo;
}

/** Tryb grafiki i diagnostyka startu (z app/bootGuard). */
export interface GraphicsInfo {
  /** Gra działa w widoku 2D (domyślnie, z wyboru albo po awarii 3D). */
  safeMode: boolean;
  crashedLastTime: boolean;
  active: 'webgl' | 'canvas2d';
  /** Zmiana trybu zapisuje grę i przeładowuje stronę. */
  setMode(mode: '2d' | '3d'): void;
  diagnostics(): string;
}

interface BuildingCard {
  id: BuildingId;
  level: Phaser.GameObjects.Text;
  effect: Phaser.GameObjects.Text;
  cost: Phaser.GameObjects.Text;
  button: Button;
  /** „Ukończ teraz” — widoczny obok „Anuluj” podczas budowy (za darmo do poz. z balansu). */
  finish: Button;
  /** Laboratorium: przycisk „Badania” obok „Ulepsz”. */
  extra: Button | null;
  /** Miejsce na przyciski: x, pełna szerokość, odstęp między połówkami (w px urządzenia). */
  buttons: { x: number; w: number; gap: number };
  /** Pasek postępu budowy (rysowany nad przyciskiem). */
  progress: Phaser.GameObjects.Graphics;
  bar: { x: number; y: number; w: number };
  /** Miejsce karty (do błysku po rozpoczęciu budowy). */
  rect: Rect;
}

/** Jak długo drugie dotknięcie „Anuluj” potwierdza anulowanie (ms). */
const CANCEL_CONFIRM_MS = 3000;

interface ResourceTexts {
  /** Paski zapełnienia magazynu pod metalem i kryształami. */
  fill: Phaser.GameObjects.Graphics;
  fillBars: { metal: { x: number; y: number; w: number }; crystal: { x: number; y: number; w: number }; fields: { x: number; y: number; w: number } };
  metal: Phaser.GameObjects.Text;
  metalRate: Phaser.GameObjects.Text;
  crystal: Phaser.GameObjects.Text;
  crystalRate: Phaser.GameObjects.Text;
  energy: Phaser.GameObjects.Text;
  energyNote: Phaser.GameObjects.Text;
  antimatter: Phaser.GameObjects.Text;
  antimatterNote: Phaser.GameObjects.Text;
  /** Pola planety: zajęte / do zabudowy (v0.26.3). */
  fields: Phaser.GameObjects.Text;
  fieldsNote: Phaser.GameObjects.Text;
  /** Czy notatki (np. „+23/min”) mieszczą się obok wartości. */
  notes: boolean;
}

type ToastKind = 'ok' | 'error' | 'info';

const RICHNESS_ROWS: readonly [YieldId, string, number][] = [
  ['metal', 'Metal', COLORS.stoneHex],
  ['crystal', 'Kryształy', COLORS.tealHex],
  ['energy', 'Energia', COLORS.goldHex],
];

/** „Metal: zostało 1,9 mln z 2,0 mln (97%) · wyczerpie się za ok. 5 d 3 h”. */
function depositLine(id: ResourceId, d: DepositInfo): string {
  const name = id === 'metal' ? 'Metal' : 'Kryształy';
  if (d.left <= 0) return `${name}: złoże wyczerpane — kopalnia stoi`;
  const share = Math.ceil((d.left / Math.max(1, d.total)) * 100);
  const when = d.secondsLeft !== null ? ` · wyczerpie się za ok. ${formatSpan(d.secondsLeft)}` : ' · wydobycie stoi';
  return `${name}: zostało ${formatAmount(d.left)} z ${formatAmount(d.total)} (${share}%)${when}`;
}

const YIELD_NAMES: Record<YieldId, string> = { metal: 'metal', crystal: 'kryształy', energy: 'energia' };

const DOCK_LABELS: Record<DockItemId, string> = {
  production: 'Produkcja',
  research: 'Badania',
  map: 'Mapa',
  empire: 'Imperium',
  planet: 'Planeta',
  ai: 'SI',
};

const PANEL_TITLES: Record<PanelId, string> = { production: 'PRODUKCJA', planet: 'PLANETA', ai: 'SI MATKA', planets: 'PLANETY' };

/** HUD gry. Współrzędne liczone w punktach CSS, rysowane w pikselach urządzenia (px()). */
/** Krok przybliżania przyciskiem / klawiszem. */
const ZOOM_STEP = 1.4;

export class PlanetScene extends Phaser.Scene {
  private readonly deps: SceneDeps;
  private ui: Phaser.GameObjects.Container | undefined;
  private overlay: Phaser.GameObjects.Container | undefined;
  /** Budynek czekający na potwierdzenie zburzenia poziomu (drugie dotknięcie). */
  private demolishArmed: BuildingId | null = null;
  /** Specjalizacja czekająca na potwierdzenie zmiany (drugie dotknięcie). */
  private specArmed: SpecializationId | null = null;
  private toast: Phaser.GameObjects.Container | undefined;
  private cards: BuildingCard[] = [];
  private res: ResourceTexts | undefined;
  /** Wartości liczników w pasku (płynnie doganiają stan gry) i planeta, do której należą. */
  private counters: { metal?: number; crystal?: number; antimatter?: number } = {};
  private counterPlanet = '';
  /** Panel pokazany w ostatnim układzie (animujemy tylko nowo otwarty). */
  private shownPanel: PanelId | null = null;
  private readonly reducedMotion = prefersReducedMotion();
  /** Zmieniono planetę, ale jej model jeszcze się liczy (komunikat „Ładowanie…” na ekranie). */
  private planetPending = false;
  private layoutState: Layout | undefined;
  private dpr = 1;
  private readonly gestures = new GestureTracker();
  /** Rozwinięte/zwinięte panele (zapamiętane na urządzeniu). */
  private panels: PanelState = loadPanels();
  /** Bieżąca pozycja planety na ekranie (do płynnego przejścia przy zwijaniu paneli). */
  private focus: { cx: number; cy: number; r: number } | null = null;
  private focusTween: Phaser.Tweens.Tween | undefined;
  /** Przycisk „Produkcja” na dolnym pasku: pasek postępu budowy (gdy panel jest zamknięty). */
  private dockProgress: { progress: Phaser.GameObjects.Graphics; bar: { x: number; y: number; w: number } } | null = null;
  /** Budynek wybrany dotknięciem na planecie (okienko z „Ulepsz”). */
  private selected: BuildingId | null = null;
  /** Panel „Planety”: teksty stanu w wierszach (odświeżane co sekundę). */
  private planetStatus: { index: number; text: Phaser.GameObjects.Text }[] = [];
  private planetStatusAt = 0;
  /** Wiersze zasobu złóż w panelu „Planeta” (odświeżane co sekundę). */
  private depositRows: { id: ResourceId; text: Phaser.GameObjects.Text }[] = [];
  private depositRowsAt = 0;
  /** Wiersz „Pas asteroid” w panelu „Planeta” (odliczanie rozbudowy, v0.37). */
  private beltRow: Phaser.GameObjects.Text | null = null;
  /** Otwarty panel SI: stan reguł przy ostatnim rysowaniu (zmiana = przebudowa). */
  private aiPanelShape = '';
  /** Dymek SI Matki z bieżącą propozycją (klucz = propozycja + poziom). */
  private aiBubble: { container: Phaser.GameObjects.Container; key: string } | null = null;
  private refreshTimer = 0;
  private cancelArmedUntil = 0;
  /** Przełączenie na nową wersję gry (gdy service worker ją pobrał). */
  private updateApply: (() => void) | null = null;
  /** Otwarty ekran pełnoekranowy — Badania albo Mapa (HUD planety nie reaguje wtedy na dotyk). */
  private screenOpen = false;

  constructor(deps: SceneDeps) {
    super({ key: 'planet' });
    this.deps = deps;
  }

  create(): void {
    const { controller, display } = this.deps;
    this.relayout();

    // Gesty startują tylko poza panelami (panele mają strefy blokujące):
    // jeden palec obraca planetę, dwa palce ją przybliżają.
    const apply = (events: GestureEvent[]) => this.applyGestures(events);
    display.setGridVisible(loadGridVisible());
    // Przybliżenie przywrócone po przełączeniu grafiki — szczypanie i przyciski liczą od niego.
    this.gestures.setZoom(display.zoomLevel());
    this.input.on('pointerdown', (pointer: Phaser.Input.Pointer, over: Phaser.GameObjects.GameObject[]) => {
      if (over.length > 0 || this.overlay || this.screenOpen) return;
      apply(this.gestures.down(pointer.id, pointer.x, pointer.y));
    });
    this.input.on('pointermove', (pointer: Phaser.Input.Pointer) => apply(this.gestures.move(pointer.id, pointer.x, pointer.y)));
    const release = (pointer: Phaser.Input.Pointer) => apply(this.gestures.up(pointer.id));
    this.input.on('pointerup', release);
    this.input.on('pointerupoutside', release);
    this.input.on('gameout', () => apply(this.gestures.cancel()));
    // Komputer: kółko myszy przybliża planetę (nad panelami nie).
    this.input.on('wheel', (_p: Phaser.Input.Pointer, over: Phaser.GameObjects.GameObject[], _dx: number, dy: number) => {
      if (over.length === 0 && !this.overlay && !this.screenOpen) apply(this.gestures.wheel(dy));
    });

    // Komputer: + / − przybliżają i oddalają, 0 wraca do widoku startowego.
    this.input.keyboard?.on('keydown', (event: KeyboardEvent) => {
      if (this.overlay || this.screenOpen) return;
      if (event.key === '+' || event.key === '=') this.zoomBy(ZOOM_STEP);
      else if (event.key === '-') this.zoomBy(1 / ZOOM_STEP);
      else if (event.key === '0') this.resetView();
    });

    // Nowa planeta to kilkaset ms liczenia (teren, siatka pól, model) — najpierw komunikat na ekranie,
    // dopiero po jego narysowaniu liczenie; do tego czasu ekran nie odświeża danych planety.
    controller.onPlanetChange(() => {
      this.selected = null;
      this.planetPending = true;
      this.showToast(`Ładowanie: ${controller.planet.displayName}…`, 'info', 1500);
      this.game.events.once('postrender', () =>
        setTimeout(() => {
          display.setPlanet(controller.planet);
          const colony = controller.colony();
          display.setStructures(controller.economy.levels, null, colony.plots, colony.complexes);
          this.planetPending = false;
          this.relayout();
        }, 0),
      );
    });

    controller.onResearchComplete((id) => {
      if (!this.screenOpen) this.showToast(`Zbadano: ${findResearch(id)?.name ?? id}.`, 'ok', 3000);
      this.refreshValues();
    });
    this.game.events.on(OVERLAY_CLOSED, (message?: string) => {
      this.screenOpen = false;
      this.input.enabled = true;
      this.refreshValues();
      if (message) this.showToast(message, 'ok', 3000);
    });

    controller.onAiAction((text) => {
      if (!this.screenOpen) this.showToast(text, 'info', 3500);
      this.refreshValues();
    });

    controller.onExpeditionReturn((report) => {
      this.showToast(report.text, report.success ? 'ok' : 'info', 5000);
    });

    controller.onShipmentArrived((text) => {
      if (!this.screenOpen) this.showToast(text, 'ok', 3500);
      this.refreshValues();
    });

    controller.onColonyArrived((name) => {
      this.showToast(`Statek dotarł — skolonizowano ${name}. Znajdziesz ją w „Imperium”.`, 'ok', 4000);
      this.refreshValues();
    });

    controller.onBuildComplete((done) => {
      const name = BALANCE.buildings.find((b) => b.id === done.building)?.name ?? 'Budynek';
      this.showToast(`${name} — poziom ${done.level} gotowy.`, 'ok', 3000);
      this.refreshValues();
      display.showBuilding(done.building);
    });

    if (this.deps.graphics.crashedLastTime) {
      this.showToast(
        'Poprzednie uruchomienie się nie powiodło — gra działa na planecie 2D. Zgłoś to: Ustawienia → Zgłoś / diagnostyka.',
        'info',
        6000,
      );
    } else if (
      controller.offlineGain ||
      controller.completedWhileAway ||
      controller.researchedWhileAway.length > 0 ||
      controller.arrivedWhileAway.length > 0 ||
      controller.expeditionsWhileAway.length > 0 ||
      controller.shipmentsWhileAway.length > 0
    ) {
      const lines: string[] = [];
      const gain = controller.offlineGain;
      if (gain) {
        lines.push(
          `Podczas nieobecności (${formatDuration(gain.seconds)}): +${formatInt(gain.metal)} metalu, +${formatInt(gain.crystal)} kryształów`,
        );
      }
      const done = controller.completedWhileAway;
      if (done) {
        const name = BALANCE.buildings.find((b) => b.id === done.building)?.name ?? 'Budynek';
        lines.push(`Ukończono: ${name}, poziom ${done.level}.`);
        display.showBuilding(done.building);
      }
      for (const id of controller.researchedWhileAway) lines.push(`Zbadano: ${findResearch(id)?.name ?? id}.`);
      for (const name of controller.arrivedWhileAway) lines.push(`Statek dotarł — nowa kolonia: ${name}.`);
      for (const report of controller.expeditionsWhileAway) lines.push(report.text);
      lines.push(...controller.shipmentsWhileAway);
      this.showToast(lines.join('\n'), 'info', 5000);
      controller.offlineGain = null;
      controller.completedWhileAway = null;
      controller.researchedWhileAway = [];
      controller.arrivedWhileAway = [];
      controller.expeditionsWhileAway = [];
      controller.shipmentsWhileAway = [];
    }
  }

  /** Ekran „Badania” (galaktyka badań) — osobna scena nad HUD-em planety. */
  openResearch(): void {
    this.openScreen('research');
  }

  /** Ekran „Mapa”: cała galaktyka albo od razu wskazany układ. */
  openMap(system?: number): void {
    this.openScreen('map', system ? { system } : {});
  }

  private openScreen(key: 'research' | 'map' | 'empire', data: object = {}): void {
    if (this.screenOpen) return;
    this.closeOverlay();
    this.screenOpen = true;
    this.input.enabled = false;
    if (this.gestures.cancel().length > 0) this.deps.display.endDrag();
    this.scene.launch(key, data);
  }


  update(_time: number, delta: number): void {
    this.stepCounters(delta);
    this.refreshTimer -= delta;
    if (this.refreshTimer > 0) return;
    this.refreshTimer = 250;
    this.deps.controller.tick();
    this.refreshValues();
  }

  private applyGestures(events: GestureEvent[]): void {
    const display = this.deps.display;
    for (const e of events) {
      if (e.type === 'drag-start') display.beginDrag();
      else if (e.type === 'drag') display.drag(e.dx / this.dpr, e.dy / this.dpr);
      else if (e.type === 'drag-end') display.endDrag();
      else if (e.type === 'zoom') display.setZoom(e.zoom);
      else this.onPlanetTap(e.x, e.y);
    }
  }

  /** Przycisk albo klawisz: przybliżenie razy `factor` (płynnie — renderer dochodzi do celu). */
  private zoomBy(factor: number): void {
    this.applyGestures(this.gestures.setZoom(this.gestures.zoom * factor));
  }

  /** „Resetuj widok”: przybliżenie 1× i biegun u góry. */
  private resetView(): void {
    this.gestures.setZoom(1);
    this.deps.display.resetView();
  }

  /** Przyciski kamery w rogu wolnego miejsca (gdy się mieszczą). */
  private buildCamera(layout: Layout): void {
    if (!layout.camera) return;
    this.iconButton(layout.camera.zoomIn, 'plus', () => this.zoomBy(ZOOM_STEP));
    this.iconButton(layout.camera.zoomOut, 'minus', () => this.zoomBy(1 / ZOOM_STEP));
    this.iconButton(layout.camera.reset, 'reset', () => this.resetView());
  }

  /** `animate` — planeta płynnie przechodzi do nowego miejsca (zwijanie/rozwijanie paneli). */
  relayout(animate = false): void {
    const viewport = this.deps.getViewport();
    this.dpr = viewport.dpr;
    this.gestures.tapSlop = 12 * viewport.dpr;
    const layout = computeLayout(viewport.width, viewport.height, viewport.safe, BALANCE.buildings.length, this.panels, this.deps.controller.aiUnlocked ? AI_RULES.length : 0, this.deps.controller.slotInfo.used);
    this.layoutState = layout;
    this.deps.display.resize(viewport.width, viewport.height);
    this.moveFocus(layout.planet, animate);
    this.ui?.destroy(true);
    this.ui = this.add.container(0, 0);
    this.cards = [];
    this.planetStatus = [];
    this.depositRows = [];
    this.beltRow = null;
    this.dockProgress = null;
    this.aiPanelShape = '';
    this.buildTopBar(layout);
    const before = this.ui.length;
    this.buildPanel(layout);
    // Nowo otwarty panel wysuwa się krótko znad dolnego paska (zmiana rozmiaru ekranu — bez animacji).
    const opened = layout.panel?.id ?? null;
    if (animate && opened && opened !== this.shownPanel) this.slideIn(this.ui.list.slice(before));
    this.shownPanel = opened;
    this.buildSelected(layout);
    this.buildDock(layout);
    this.buildCamera(layout);
    this.buildUpdateBanner(layout);
    this.aiBubble = null;
    this.refreshValues();
    if (this.overlay) this.children.bringToTop(this.overlay);
  }

  /** Panel wjeżdża z dołu i rozjaśnia się (krótko; „Ogranicz ruch” — bez animacji). */
  private slideIn(objects: Phaser.GameObjects.GameObject[]): void {
    if (this.reducedMotion) return;
    const dy = this.px(this.s(PANEL_IN_OFFSET));
    for (const o of objects) {
      const t = o as Phaser.GameObjects.GameObject & Phaser.GameObjects.Components.Transform & Phaser.GameObjects.Components.AlphaSingle;
      if (typeof t.y !== 'number' || typeof t.alpha !== 'number' || typeof t.setAlpha !== 'function') continue;
      const y = t.y;
      const alpha = t.alpha;
      t.y = y + dy;
      t.setAlpha(0);
      this.tweens.add({ targets: t, y, alpha, duration: PANEL_IN_MS, ease: 'Cubic.Out' });
    }
  }

  /** Błysk karty budynku po rozpoczęciu budowy. */
  private flashCard(id: BuildingId): void {
    const card = this.cards.find((c) => c.id === id);
    if (!card || this.reducedMotion) return;
    const r = card.rect;
    const [x, y, w, h, radius] = [this.px(r.x), this.px(r.y), this.px(r.w), this.px(r.h), this.px(this.s(10))];
    const g = this.add
      .graphics()
      .fillStyle(COLORS.goldHex, 0.3)
      .fillRoundedRect(x, y, w, h, radius)
      .lineStyle(this.px(2), COLORS.goldHex, 1)
      .strokeRoundedRect(x, y, w, h, radius);
    this.ui!.add(g);
    this.tweens.add({ targets: g, alpha: 0, duration: BUILD_FLASH_MS, ease: 'Sine.In', onComplete: () => g.destroy() });
  }

  /**
   * Liczniki metalu, kryształów i antymaterii w pasku dochodzą płynnie do nowej wartości
   * (np. po zapłaceniu za budowę). Zmiana planety — od razu nowa wartość.
   */
  private stepCounters(delta: number): void {
    const controller = this.deps.controller;
    const res = this.res;
    if (!res) return;
    const planet = controller.planet.seed;
    const instant = this.reducedMotion || planet !== this.counterPlanet;
    this.counterPlanet = planet;
    const targets = { metal: controller.economy.stock.metal, crystal: controller.economy.stock.crystal, antimatter: controller.economy.antimatter };
    for (const key of ['metal', 'crystal', 'antimatter'] as const) {
      const before = this.counters[key];
      const next = instant ? targets[key] : approach(before, targets[key], delta);
      this.counters[key] = next;
      if (before === undefined || Math.floor(before) === Math.floor(next)) continue;
      const value = res[key];
      const note = key === 'metal' ? res.metalRate : key === 'crystal' ? res.crystalRate : res.antimatterNote;
      value.setText(formatInt(next));
      note.setX(value.x + value.width + this.px(this.s(6)));
    }
  }

  private moveFocus(target: { cx: number; cy: number; r: number }, animate: boolean): void {
    this.focusTween?.stop();
    const from = this.focus;
    const apply = (f: { cx: number; cy: number; r: number }) => {
      this.focus = f;
      this.deps.display.setFocus(f.cx, f.cy, f.r);
    };
    if (!animate || !from) {
      apply(target);
      return;
    }
    this.focusTween = this.tweens.addCounter({
      from: 0,
      to: 1,
      duration: 320,
      ease: 'Sine.easeInOut',
      onUpdate: (tween) => {
        const t = tween.getValue() ?? 1;
        apply({
          cx: from.cx + (target.cx - from.cx) * t,
          cy: from.cy + (target.cy - from.cy) * t,
          r: from.r + (target.r - from.r) * t,
        });
      },
    });
  }

  /** Przycisk panelu na dolnym pasku: otwiera panel, drugie dotknięcie go zamyka. */
  private togglePanel(id: PanelId): void {
    this.panels = { open: this.panels.open === id ? null : id };
    savePanels(this.panels);
    this.closeOverlay();
    this.relayout(true);
  }

  /** Przycisk dolnego paska albo pozycja menu. */
  private openDockItem(id: DockItemId): void {
    if (DOCK_PANELS.has(id)) this.togglePanel(id as PanelId);
    else if (id === 'research') this.openResearch();
    else if (id === 'map') this.openMap();
    else this.openScreen('empire');
  }

  /** Mały przycisk-ikona (44 × 44 pt): zamknij, menu „hamburger”, przybliż, oddal, resetuj widok, zarządzanie. */
  private iconButton(rect: Rect, kind: 'close' | 'menu' | 'plus' | 'minus' | 'reset' | 'manage', onTap: () => void): void {
    const g = this.add.graphics();
    const cx = this.px(rect.x + rect.w / 2);
    const cy = this.px(rect.y + rect.h / 2);
    const box = this.px(this.s(26));
    g.lineStyle(this.px(1), COLORS.panelBorder, 1).strokeRoundedRect(cx - box / 2, cy - box / 2, box, box, this.px(6));
    g.lineStyle(this.px(1.6), COLORS.tealHex, 1);
    const half = this.px(this.s(6.5));
    if (kind === 'menu') {
      for (const dy of [-1, 0, 1]) g.lineBetween(cx - half, cy + dy * this.px(this.s(4.5)), cx + half, cy + dy * this.px(this.s(4.5)));
    } else if (kind === 'plus' || kind === 'minus') {
      g.lineBetween(cx - half, cy, cx + half, cy);
      if (kind === 'plus') g.lineBetween(cx, cy - half, cx, cy + half);
    } else if (kind === 'manage') {
      // Trzy suwaki: kreski z gałkami na różnej wysokości.
      [-1, 0, 1].forEach((row, i) => {
        const y = cy + row * this.px(this.s(4.5));
        g.lineBetween(cx - half, y, cx + half, y);
        g.fillStyle(COLORS.tealHex, 1).fillCircle(cx + [-0.4, 0.5, -0.1][i]! * half * 2 * 0.6, y, this.px(1.9));
      });
    } else if (kind === 'reset') {
      // Celownik: okrąg z kropką — „wróć do widoku planety”.
      g.strokeCircle(cx, cy, half);
      g.fillStyle(COLORS.tealHex, 1).fillCircle(cx, cy, this.px(1.8));
    } else {
      const d = half * 0.8;
      g.lineBetween(cx - d, cy - d, cx + d, cy + d);
      g.lineBetween(cx - d, cy + d, cx + d, cy - d);
    }
    const zone = this.add
      .zone(this.px(rect.x), this.px(rect.y), this.px(rect.w), this.px(rect.h))
      .setOrigin(0)
      .setInteractive({ useHandCursor: true });
    zone.on('pointerup', onTap);
    this.ui!.add([g, zone]);
  }

  // ——— pomocnicze ———

  private px(v: number): number {
    return Math.round(v * this.dpr);
  }

  /** Skalowanie wielkości UI do ekranu. */
  private s(v: number): number {
    return v * (this.layoutState?.u ?? 1);
  }

  private text(
    x: number,
    y: number,
    content: string,
    size: number,
    color: string,
    style: Phaser.Types.GameObjects.Text.TextStyle = {},
  ): Phaser.GameObjects.Text {
    const t = this.add.text(this.px(x), this.px(y), content, {
      fontFamily: FONTS.body,
      fontSize: `${this.px(this.s(size))}px`,
      color,
      ...style,
    });
    this.ui!.add(t);
    return t;
  }

  /** Panel z tłem i strefą blokującą gest obrotu planety. */
  private panel(rect: Rect, accent = false): void {
    const g = this.add.graphics();
    const radius = this.px(this.s(14));
    const [x, y, w, h] = [this.px(rect.x), this.px(rect.y), this.px(rect.w), this.px(rect.h)];
    g.fillStyle(COLORS.panel, COLORS.panelAlpha).fillRoundedRect(x, y, w, h, radius);
    g.lineStyle(this.px(1), accent ? COLORS.goldHex : COLORS.panelBorder, accent ? 0.6 : 1).strokeRoundedRect(
      x,
      y,
      w,
      h,
      radius,
    );
    const blocker = this.add.zone(x, y, w, h).setOrigin(0).setInteractive();
    this.ui!.add([g, blocker]);
  }

  private icon(kind: YieldId | 'storage' | 'antimatter' | 'research' | 'fields', x: number, y: number, size: number): void {
    const g = this.add.graphics();
    const r = this.px(this.s(size));
    const cx = this.px(x);
    const cy = this.px(y);
    const V = Phaser.Math.Vector2;
    if (kind === 'metal') {
      g.fillStyle(COLORS.stoneHex, 1);
      const hex = Array.from(
        { length: 6 },
        (_, i) => new V(cx + r * Math.cos((i * Math.PI) / 3 + Math.PI / 6), cy + r * Math.sin((i * Math.PI) / 3 + Math.PI / 6)),
      );
      g.fillPoints(hex, true);
    } else if (kind === 'fields') {
      // Pole siatki: obrys sześciokąta z kropką.
      const hex = Array.from({ length: 6 }, (_, i) => new V(cx + r * Math.cos((i * Math.PI) / 3), cy + r * Math.sin((i * Math.PI) / 3)));
      g.lineStyle(Math.max(1.5, r * 0.24), COLORS.goldHex, 1).strokePoints(hex, true, true);
      g.fillStyle(COLORS.goldHex, 1).fillCircle(cx, cy, r * 0.28);
    } else if (kind === 'antimatter') {
      // Pierścień z jądrem.
      g.lineStyle(Math.max(1.5, r * 0.28), COLORS.antimatterHex, 1).strokeCircle(cx, cy, r * 0.95);
      g.fillStyle(COLORS.antimatterHex, 1).fillCircle(cx, cy, r * 0.38);
    } else if (kind === 'research') {
      // Mała galaktyka: jądro i dwa łuki ramion.
      g.fillStyle(COLORS.goldHex, 1).fillCircle(cx, cy, r * 0.32);
      g.lineStyle(Math.max(1.5, r * 0.22), COLORS.tealHex, 1);
      g.beginPath();
      g.arc(cx, cy, r * 0.8, Math.PI * 0.1, Math.PI * 0.85, false);
      g.strokePath();
      g.beginPath();
      g.arc(cx, cy, r * 0.8, Math.PI * 1.1, Math.PI * 1.85, false);
      g.strokePath();
    } else if (kind === 'storage') {
      // Skrzynia: kwadrat z poprzeczką.
      g.fillStyle(COLORS.stoneHex, 1).fillRect(cx - r, cy - r * 0.85, r * 2, r * 1.7);
      g.fillStyle(COLORS.panel, 1).fillRect(cx - r, cy - r * 0.12, r * 2, Math.max(1, r * 0.24));
    } else if (kind === 'crystal') {
      g.fillStyle(COLORS.tealHex, 1);
      g.fillPoints([new V(cx, cy - r * 1.15), new V(cx + r * 0.75, cy), new V(cx, cy + r * 1.15), new V(cx - r * 0.75, cy)], true);
    } else {
      g.fillStyle(COLORS.goldHex, 1);
      g.fillPoints(
        [
          new V(cx + r * 0.25, cy - r * 1.2),
          new V(cx - r * 0.65, cy + r * 0.15),
          new V(cx - r * 0.05, cy + r * 0.15),
          new V(cx - r * 0.3, cy + r * 1.2),
          new V(cx + r * 0.65, cy - r * 0.2),
          new V(cx + r * 0.05, cy - r * 0.2),
        ],
        true,
      );
    }
    this.ui!.add(g);
  }

  private addButton(
    x: number,
    y: number,
    w: number,
    h: number,
    label: string,
    style: ButtonStyle,
    onTap: () => void,
    fontSize = 15,
  ): Button {
    const button = new Button(this, this.px(x), this.px(y), this.px(w), this.px(h), label, this.dpr, onTap, this.s(fontSize));
    button.setStyle(style);
    this.ui!.add(button);
    return button;
  }

  // ——— panele ———

  private buildTopBar(layout: Layout): void {
    const bar = layout.topBar;
    this.panel(bar);
    const showTitle = bar.w > 640;
    const titleW = showTitle ? this.s(160) : 0;
    if (showTitle) {
      this.text(bar.x + this.s(16), bar.y + bar.h / 2, 'PLANET FORGE', 14, COLORS.gold, {
        fontFamily: FONTS.serif,
        letterSpacing: 3,
      }).setOrigin(0, 0.5);
    }
    const colW = (bar.w - titleW - this.s(8)) / 5;
    const notes = colW >= 120;
    const valueSize = bar.w < 420 ? 14 : 17;
    const column = (index: number, kind: YieldId | 'antimatter' | 'fields', label: string) => {
      const x = bar.x + titleW + this.s(8) + index * colW;
      if (index > 0 || showTitle) {
        const divider = this.add
          .graphics()
          .fillStyle(COLORS.divider, 1)
          .fillRect(this.px(x), this.px(bar.y + this.s(10)), this.px(1), this.px(bar.h - this.s(20)));
        this.ui!.add(divider);
      }
      this.icon(kind, x + this.s(18), bar.y + bar.h / 2, 6.5);
      const tx = x + this.s(32);
      this.text(tx, bar.y + this.s(7), label, 9.5, COLORS.muted, { fontStyle: '600' });
      const value = this.text(tx, bar.y + this.s(19), '0', valueSize, COLORS.text, { fontStyle: '600' });
      const note = this.text(tx, bar.y + this.s(19), '', 10.5, COLORS.teal);
      const fillBar = { x: tx, y: bar.y + bar.h - this.s(8), w: Math.max(20, colW - this.s(32) - this.s(12)) };
      return { value, note, fillBar };
    };
    // Wąskie kolumny (telefon) dostają skrócone etykiety.
    const short = colW < 112;
    const metal = column(0, 'metal', 'METAL');
    const crystal = column(1, 'crystal', short ? 'KRYSZT.' : 'KRYSZTAŁY');
    const energy = column(2, 'energy', 'ENERGIA');
    const antimatter = column(3, 'antimatter', short ? 'ANTYM.' : 'ANTYMATERIA');
    const fields = column(4, 'fields', 'POLA');
    const fill = this.add.graphics();
    this.ui!.add(fill);
    this.res = {
      fill,
      fillBars: { metal: metal.fillBar, crystal: crystal.fillBar, fields: fields.fillBar },
      metal: metal.value,
      metalRate: metal.note,
      crystal: crystal.value,
      crystalRate: crystal.note,
      energy: energy.value,
      energyNote: energy.note,
      antimatter: antimatter.value,
      antimatterNote: antimatter.note,
      fields: fields.value,
      fieldsNote: fields.note,
      notes,
    };
  }

  /** Dolny pasek: menu, przyciski paneli i ekranów (otwarty panel podświetlony). */
  private buildDock(layout: Layout): void {
    const { rect, menu, items } = layout.dock;
    this.panel(rect);
    this.iconButton(menu, 'menu', () => this.togglePanel('planets'));
    if (this.panels.open === 'planets') {
      // Otwarta lista planet: złota obwódka przycisku ☰.
      const ring = this.add.graphics().lineStyle(this.px(2), COLORS.goldHex, 1);
      ring.strokeRoundedRect(this.px(menu.x + 2), this.px(menu.y + 2), this.px(menu.w - 4), this.px(menu.h - 4), this.px(this.s(10)));
      this.ui!.add(ring);
    }
    const open = this.panels.open;
    for (const { id, rect: r } of items) {
      const active = open === id;
      this.addButton(r.x, r.y, r.w, r.h, DOCK_LABELS[id], active ? 'primary' : 'secondary', () => this.openDockItem(id), r.w < this.s(96) ? 12 : 13);
      if (id === 'production' && !active) {
        const progress = this.add.graphics();
        this.ui!.add(progress);
        this.dockProgress = { progress, bar: { x: r.x + this.s(10), y: r.y + r.h - this.s(7), w: r.w - this.s(20) } };
      }
    }
  }

  /** Otwarty panel nad dolnym paskiem: ramka, tytuł, „zamknij” i treść. */
  private buildPanel(layout: Layout): void {
    const panel = layout.panel;
    if (!panel) return;
    this.panel(panel.rect, panel.id === 'planet');
    this.text(panel.rect.x + this.s(14), panel.rect.y + this.s(13), PANEL_TITLES[panel.id], 11, panel.id === 'ai' ? COLORS.antimatter : COLORS.teal, {
      fontStyle: '600',
      letterSpacing: 1.5,
    });
    this.iconButton(panel.close, 'close', () => this.togglePanel(panel.id));
    if (panel.id === 'production') this.buildProduction(layout.cards);
    else if (panel.id === 'planet') this.buildPlanetInfo(panel.body);
    else if (panel.id === 'planets') this.buildPlanetsPanel(panel.body, layout);
    else this.buildAiPanel(panel.body);
  }

  /** Panel „Planety” (z przycisku ☰): lista planet imperium — dotknięcie przełącza; pod spodem Ustawienia. */
  private buildPlanetsPanel(box: Rect, layout: Layout): void {
    const c = this.deps.controller;
    const planets = c.overview();
    const gap = this.s(10);
    const footer = [...layout.dock.hidden, 'settings' as const];
    const footerRows = planetFooterRows(layout.dock.hidden.length);
    const footerTop = box.y + box.h - footerRows * TOUCH - (footerRows - 1) * gap;
    const rowH = this.s(PLANET_ROW_H);
    const step = rowH + this.s(PLANET_ROW_GAP);
    // Ile wierszy się mieści; reszta — w „Imperium”.
    const fit = Math.max(1, Math.floor((footerTop - gap - box.y + this.s(PLANET_ROW_GAP)) / step));
    const shown = planets.length > fit ? planets.slice(0, fit - 1) : planets;
    shown.forEach((p, i) => this.planetRow(p, { x: box.x, y: box.y + i * step, w: box.w, h: rowH }));
    if (shown.length < planets.length) {
      this.text(box.x + this.s(6), box.y + shown.length * step + this.s(8), `…i jeszcze ${planets.length - shown.length} — wszystkie w „Imperium”.`, 12, COLORS.muted);
    }
    const half = (box.w - gap) / 2;
    footer.forEach((id, i) => {
      const x = box.x + (i % 2) * (half + gap);
      const y = footerTop + Math.floor(i / 2) * (TOUCH + gap);
      if (id === 'settings') this.addButton(x, y, half, TOUCH, 'Ustawienia', 'secondary', () => this.openSettings(), 13);
      else this.addButton(x, y, half, TOUCH, DOCK_LABELS[id], 'secondary', () => this.openDockItem(id), 13);
    });
  }

  /** Stan planety w wierszu listy: budowa z odliczaniem albo zapasy. */
  private setPlanetStatus(text: Phaser.GameObjects.Text, p: PlanetOverview): void {
    const status = p.construction
      ? `Budowa: ${p.construction.name} ${p.construction.level} · ${formatDuration(p.construction.secondsLeft)}`
      : `${formatInt(p.stock.metal)} metalu · ${formatInt(p.stock.crystal)} kryształów · pola ${p.fields.used}/${p.fields.buildable}`;
    text.setText(`${p.active ? 'Tu jesteś · ' : ''}${p.address} · ${status}`).setColor(p.construction ? COLORS.gold : COLORS.muted);
  }

  /** Wiersz planety: miniatura, nazwa, adres i stan (budowa albo zasoby); dotknięcie = przejdź. */
  private planetRow(p: PlanetOverview, rect: Rect): void {
    const g = this.add.graphics();
    const radius = this.px(this.s(10));
    g.fillStyle(COLORS.buttonIdle, p.active ? 0.9 : 0.45).fillRoundedRect(this.px(rect.x), this.px(rect.y), this.px(rect.w), this.px(rect.h), radius);
    g.lineStyle(this.px(1), p.active ? COLORS.goldHex : COLORS.panelBorder, p.active ? 0.8 : 1).strokeRoundedRect(
      this.px(rect.x),
      this.px(rect.y),
      this.px(rect.w),
      this.px(rect.h),
      radius,
    );
    this.ui!.add(g);
    // Miniatura (tekstura zapamiętana dla planety — nie rysujemy jej przy każdym odświeżeniu).
    const key = `hud-thumb-${p.planet.definitionId}-${p.planet.seed}`;
    if (!this.textures.exists(key)) {
      const texture = this.textures.createCanvas(key, THUMBNAIL_SIZE, THUMBNAIL_SIZE)!;
      texture.setFilter(Phaser.Textures.FilterMode.NEAREST);
      new PlanetThumbnail(p.planet).draw(texture.context, p.index * 1.7);
      texture.refresh();
    }
    const pad = this.s(8);
    const d = rect.h - 2 * pad;
    this.ui!.add(this.add.image(this.px(rect.x + pad + d / 2), this.px(rect.y + rect.h / 2), key).setDisplaySize(this.px(d), this.px(d)));
    const tx = rect.x + pad + d + this.s(10);
    const tw = rect.x + rect.w - pad - tx;
    this.text(tx, rect.y + this.s(8), p.name, 14, p.active ? COLORS.gold : COLORS.text, { fontStyle: '600', fixedWidth: this.px(tw) });
    const status = this.text(tx, rect.y + this.s(27), '', 10.5, COLORS.muted, { fixedWidth: this.px(tw) });
    this.planetStatus.push({ index: p.index, text: status });
    this.setPlanetStatus(status, p);
    if (p.active) return;
    const zone = this.add.zone(this.px(rect.x), this.px(rect.y), this.px(rect.w), this.px(rect.h)).setOrigin(0).setInteractive({ useHandCursor: true });
    zone.on('pointerup', () => {
      const result = this.deps.controller.switchPlanet(p.index);
      this.showToast(result.message, result.ok ? 'ok' : 'error', 2600);
    });
    this.ui!.add(zone);
  }

  /** Panel „Planeta”: nazwa, typ, adres, złoża i środowisko. */
  private buildPlanetInfo(box: Rect): void {
    const { planet } = this.deps.controller;
    const g = planet.gameplay;
    const pad = this.s(6);
    const w = box.w - 2 * pad;
    const percent = (m: number | undefined) =>
      m && m !== 1 ? `${m > 1 ? '+' : ''}${Math.round((m - 1) * 100)}%` : null;
    const effects =
      (['metal', 'crystal', 'energy'] as const)
        .map((id) => {
          const p = percent(g.environment.effects[id]);
          return p ? `${YIELD_NAMES[id]} ${p}` : null;
        })
        .filter(Boolean)
        .join(' · ') || 'bez efektów';
    let y = box.y;
    this.text(box.x + pad, y, planet.displayName, 22, COLORS.gold, { fontFamily: FONTS.serif, fixedWidth: this.px(w) });
    y += this.s(30);
    this.text(box.x + pad, y, `${planet.category} · ${g.sizeClass.label} · ${formatInt(g.radiusKm)} km`, 11.5, COLORS.stone, {
      wordWrap: { width: this.px(w) },
    });
    y += this.s(17);
    this.text(box.x + pad, y, addressLine(this.deps.controller.address, planet.seed), 10.5, COLORS.faint, { fontFamily: FONTS.mono });
    y += this.s(19);
    // Pola: każdy poziom budynku zajmuje jedno pole lądu; ich liczba wynika z seeda planety.
    const f = this.deps.controller.fields;
    const full = f.used >= f.buildable;
    this.text(box.x + pad, y, `POLA  ${f.used} / ${f.buildable} zajęte${full ? ' — brak wolnych' : ''}`, 10.5, full ? COLORS.danger : COLORS.teal, {
      fontStyle: '600',
      wordWrap: { width: this.px(w) },
    });
    y += this.s(21);
    // Specjalizacja kolonii (od v0.32.3): nazwa i przycisk okna wyboru.
    const spec = this.deps.controller.specialization();
    const specText = spec.current
      ? spec.current.active
        ? spec.current.name
        : `→ ${spec.current.name} · ${formatDuration(spec.current.secondsLeft)}`
      : 'brak — wybierz';
    const specW = this.s(96);
    this.text(box.x + pad, y + this.s(4), 'SPECJALIZACJA', 9.5, COLORS.muted, { fontStyle: '600' });
    this.text(box.x + pad, y + this.s(18), specText, 13, spec.current ? COLORS.text : COLORS.gold, { fontStyle: '600', wordWrap: { width: this.px(w - specW - this.s(8)) } });
    this.addButton(box.x + pad + w - specW, y, specW, TOUCH, spec.current ? 'Szczegóły' : 'Wybierz', spec.current ? 'secondary' : 'primary', () => {
      this.specArmed = null;
      this.openSpecialization();
    }, 12.5);
    y += TOUCH + this.s(10);
    // Pas asteroid (od v0.37): stan stacji i okno budowy.
    const belt = this.deps.controller.asteroidView();
    this.text(box.x + pad, y + this.s(4), 'KOSMOS', 9.5, COLORS.muted, { fontStyle: '600' });
    this.beltRow = this.text(box.x + pad, y + this.s(18), this.beltText(), 13, belt.target > 0 ? COLORS.text : COLORS.stone, { fontStyle: '600', wordWrap: { width: this.px(w - specW - this.s(8)) } });
    this.addButton(box.x + pad + w - specW, y, specW, TOUCH, 'Kosmos', (this.deps.controller.collectorView().unlocked && this.deps.controller.collectorView().target === 0) || (belt.hasBelt && belt.unlocked && belt.target === 0 && !belt.takenBy) || (this.deps.controller.cometView().unlocked && !this.deps.controller.cometView().flying) ? 'primary' : 'secondary', () => this.openAsteroid(), 12.5);
    y += TOUCH + this.s(10);
    this.text(box.x + pad, y, 'ZŁOŻA', 9.5, COLORS.muted, { fontStyle: '600' });
    y += this.s(15);
    for (const [id, label, color] of RICHNESS_ROWS) {
      this.richnessBar(box.x + pad, y, w, label, g.richness[id], color);
      y += this.s(26);
    }
    // Zasób złóż: kopalnie go wyczerpują (przyrost podstawowy działa zawsze).
    const deposits = this.deps.controller.deposits;
    for (const id of ['metal', 'crystal'] as const) {
      const t = this.text(box.x + pad, y, '', 10.5, COLORS.stone, { wordWrap: { width: this.px(w) } });
      this.setDepositRow(t, id, deposits[id]);
      this.depositRows.push({ id, text: t });
      y += t.height / this.dpr + this.s(3);
    }
    y += this.s(6);
    this.text(box.x + pad, y, 'ŚRODOWISKO', 9.5, COLORS.muted, { fontStyle: '600' });
    y += this.s(14);
    this.text(box.x + pad, y, g.environment.label, 13.5, COLORS.text, { fontStyle: '600' });
    y += this.s(19);
    this.text(box.x + pad, y, `${g.environment.description}\n${effects}`, 11, COLORS.muted, {
      wordWrap: { width: this.px(w) },
      lineSpacing: this.px(2),
    });
  }

  private setDepositRow(t: Phaser.GameObjects.Text, id: ResourceId, d: DepositInfo): void {
    t.setText(depositLine(id, d));
    t.setColor(d.left <= 0 ? COLORS.danger : COLORS.stone);
  }

  /** Panel „SI”: stan SI Matki i samodzielność każdej reguły (pełny opis w „Imperium” → „SI”). */
  private buildAiPanel(box: Rect): void {
    const c = this.deps.controller;
    this.aiPanelShape = this.aiShape();
    const pad = this.s(6);
    const w = box.w - 2 * pad;
    const x = box.x + pad;
    const bottom = box.y + box.h;
    let y = box.y;
    const line = (content: string, size: number, color: string, extra: Phaser.Types.GameObjects.Text.TextStyle = {}, after = 6) => {
      const t = this.text(x, y, content, size, color, { wordWrap: { width: this.px(w) }, lineSpacing: this.px(2), ...extra });
      y += t.height / this.dpr + this.s(after);
    };
    const more = () => this.addButton(x, bottom - TOUCH, w, TOUCH, 'Więcej w „Imperium” → SI', 'secondary', () => this.openScreen('empire', { tab: 'ai' }), 13);
    if (!c.aiUnlocked) {
      line('SI Matka jeszcze śpi. Zbadaj „SI Matka” (Badania → ramię SI), a zacznie proponować działania.', 12.5, COLORS.muted, {}, 12);
      this.addButton(x, y, w, TOUCH, 'Otwórz Badania', 'secondary', () => this.openResearch(), 13);
      return;
    }
    line(
      c.aiAutoUnlocked
        ? 'Wybierz, jak samodzielna ma być SI dla każdej reguły.'
        : 'SI pyta o zgodę. Działanie bez pytania odblokuje badanie „SI wykonawcze”.',
      11.5,
      COLORS.muted,
      {},
      10,
    );
    const levels: [AiLevel, string][] = [
      ['propose', 'Podpowiada'],
      ['ask', 'Pyta'],
      ['auto', 'Samo'],
    ];
    const gap = this.s(6);
    const bw = (w - 2 * gap) / 3;
    const rowH = this.s(20) + TOUCH + this.s(10);
    for (const rule of AI_RULES) {
      // Reguły, które się nie mieszczą, są w „Imperium” → „SI”.
      if (y + rowH > bottom - TOUCH - this.s(8)) break;
      line(rule.name, 13, COLORS.text, { fontStyle: '600' }, 4);
      levels.forEach(([level, label], i) => {
        const current = c.aiLevel(rule.id) === level;
        const locked = level === 'auto' && !c.aiAutoUnlocked;
        this.addButton(x + i * (bw + gap), y, bw, TOUCH, label, current ? 'primary' : locked ? 'disabled' : 'secondary', () => {
          const result = c.setAiLevel(rule.id, level);
          if (!result.ok) this.showToast(result.message, 'info', 3200);
          this.relayout();
        }, 12.5);
      });
      y += TOUCH + this.s(10);
    }
    more();
  }

  private aiShape(): string {
    const c = this.deps.controller;
    return `${c.aiUnlocked}|${c.aiAutoUnlocked}|${AI_RULES.map((r) => c.aiLevel(r.id)).join(',')}`;
  }

  private richnessBar(x: number, y: number, w: number, label: string, value: number, color: number, compact = false): void {
    this.text(x, y, label, compact ? 10.5 : 11, COLORS.muted);
    this.text(x + w, y, `${Math.round(value * 100)}%`, compact ? 10.5 : 11, COLORS.text, { fontStyle: '600' }).setOrigin(1, 0);
    const barY = y + this.s(compact ? 13 : 15);
    const fill = Math.min(1, value / 1.5);
    const g = this.add.graphics();
    g.fillStyle(COLORS.divider, 1).fillRoundedRect(this.px(x), this.px(barY), this.px(w), this.px(this.s(3.5)), this.px(2));
    g.fillStyle(color, 0.9).fillRoundedRect(this.px(x), this.px(barY), this.px(w * fill), this.px(this.s(3.5)), this.px(2));
    this.ui!.add(g);
  }

  /** Karty budynków w panelu „Produkcja”. */
  private buildProduction(cards: Rect[]): void {
    BALANCE.buildings.forEach((def, index) => this.addCard(def, cards[index]!));
  }

  /** Karta budynku: nazwa, poziom, efekt, koszt, „Ulepsz” (odświeżana w refreshValues). */
  private addCard(def: (typeof BALANCE.buildings)[number], card: Rect): void {
    this.subPanel(card);
    // Dotknięcie karty (poza przyciskami, które leżą wyżej) pokazuje budynek na planecie z bliska.
    const cardZone = this.add
      .zone(this.px(card.x), this.px(card.y), this.px(card.w), this.px(card.h))
      .setOrigin(0)
      .setInteractive({ useHandCursor: true });
    cardZone.on('pointerup', () => this.focusBuilding(def.id));
    this.ui!.add(cardZone);
    const narrow = card.w < 150;
    const pad = this.s(narrow ? 8 : 10);
    this.icon(def.produces, card.x + pad + this.s(5), card.y + pad + this.s(8), 5.5);
    // Mały kwadrat „Zarządzanie” w prawym górnym rogu (wszystkie budynki poza kolektorem antymaterii).
    const managed = def.id !== 'antimatterCollector';
    if (managed) this.iconButton({ x: card.x + card.w - TOUCH, y: card.y, w: TOUCH, h: TOUCH }, 'manage', () => this.openManagement(def.id));
    const levelRight = managed ? card.x + card.w - TOUCH + this.s(4) : card.x + card.w - pad;
    const level = this.text(levelRight, card.y + pad, 'poz. 00', 11, COLORS.gold, { fontStyle: '600' }).setOrigin(1, 0);
    // Nazwa zawija się przed etykietą poziomu, zamiast na nią nachodzić.
    const titleX = card.x + pad + this.s(16);
    const titleRight = narrow ? card.x + card.w - pad : levelRight - level.width / this.dpr - this.s(6);
    const title = this.text(titleX, card.y + pad, def.name, narrow ? 12 : 13, COLORS.text, {
      fontStyle: '600',
      wordWrap: { width: this.px(titleRight - titleX) },
    });
    const textTop = Math.max(this.s(narrow ? 34 : 21), title.height / this.dpr + this.s(4));
    const effect = this.text(card.x + pad, card.y + pad + textTop, '', narrow ? 10.5 : 11, COLORS.teal, {
      wordWrap: { width: this.px(card.w - 2 * pad) },
    });
    const cost = this.text(card.x + pad, card.y + pad + textTop + this.s(16), '', narrow ? 10.5 : 11, COLORS.muted, {
      wordWrap: { width: this.px(card.w - 2 * pad) },
    });
    const buttonH = TOUCH;
    const bar = { x: card.x + pad, y: card.y + card.h - pad - buttonH - this.s(7), w: card.w - 2 * pad };
    const progress = this.add.graphics();
    this.ui!.add(progress);
    const button = this.addButton(card.x + pad, card.y + card.h - pad - buttonH, card.w - 2 * pad, buttonH, 'Ulepsz', 'primary', () =>
      this.onUpgrade(def.id), narrow ? 12.5 : 13.5);
    const finish = this.addButton(
      card.x + pad,
      card.y + card.h - pad - buttonH,
      (card.w - 2 * pad) / 2,
      buttonH,
      'Ukończ',
      'primary',
      () => this.onFinish(),
      narrow ? 12.5 : 13.5,
    ).setShown(false);
    const extra =
      def.produces === 'research'
        ? this.addButton(card.x + pad, card.y + card.h - pad - buttonH, (card.w - 2 * pad) / 2, buttonH, 'Badania', 'secondary', () =>
            this.openResearch(), narrow ? 12.5 : 13.5)
        : null;
    if (narrow) level.setVisible(false);
    const buttons = { x: this.px(card.x + pad), w: this.px(card.w - 2 * pad), gap: this.px(this.s(6)) };
    this.cards.push({ id: def.id, level, effect, cost, button, finish, extra, buttons, progress, bar, rect: card });
  }

  /**
   * Dotknięcie planety przy dowolnym przybliżeniu: trafiona budowla → kamera obraca się do niej,
   * przybliża (do 3×) i otwiera się okienko budynku. Dotknięcie obok budowli zamyka okienko.
   */
  private onPlanetTap(x: number, y: number): void {
    if (this.placing) {
      this.placeAt(x, y);
      return;
    }
    const hit = this.deps.display.pickStructure(x / this.dpr, y / this.dpr);
    if (hit) this.focusBuilding(hit.id, hit.index);
    const id = hit?.id ?? null;
    if (id === this.selected) return;
    this.selected = id;
    this.relayout();
  }

  /**
   * Pokaż budowlę z bliska: obrót do niej i przybliżenie co najmniej do wybranego w Ustawieniach
   * (1,5× domyślnie, 3× opcjonalnie); autoobrót wstrzymany, dopóki gracz nie dotknie planety.
   */
  private focusBuilding(id: BuildingId, index?: number): void {
    // Najpierw przybliżenie — renderer dobiera do niego kąt, żeby budowla stanęła w środku kadru.
    const zoom = this.gestures.zoom;
    const target = loadFocusZoom();
    if (zoom < target) this.applyGestures(this.gestures.setZoom(target));
    if (this.deps.display.showBuilding(id, index)) {
      this.deps.display.holdSpin(true);
    } else {
      if (zoom < target) this.applyGestures(this.gestures.setZoom(zoom));
      const name = BALANCE.buildings.find((b) => b.id === id)?.name ?? id;
      this.showToast(`${name} nie stoi jeszcze na planecie — ulepsz do poz. 1.`, 'info', 2600);
    }
  }

  /** Okienko wybranego budynku nad dolnym paskiem (w wolnym miejscu obok panelu). */
  private buildSelected(layout: Layout): void {
    const def = this.selected && BALANCE.buildings.find((b) => b.id === this.selected);
    if (!def) {
      this.cardAt = null;
      this.placing = null;
      this.buildingCard.hide();
      this.deps.display.setHighlight(null);
      return;
    }
    const stage = layout.stage;
    const gap = this.s(10);
    const pad = this.s(8);
    const w = Math.min(this.s(340), stage.w);
    const cardH = this.s(w - 2 * pad >= this.s(230) ? 128 : 176);
    const h = this.s(40) + cardH + pad;
    const rect: Rect = { x: stage.x + (stage.w - w) / 2, y: stage.y + stage.h - h - gap / 2, w, h };
    this.panel(rect, true);
    this.text(rect.x + this.s(14), rect.y + this.s(13), 'BUDYNEK', 11, COLORS.gold, { fontStyle: '600', letterSpacing: 1.5 });
    this.iconButton({ x: rect.x + rect.w - TOUCH, y: rect.y, w: TOUCH, h: TOUCH }, 'close', () => {
      this.selected = null;
      this.relayout();
    });
    this.addCard(def, { x: rect.x + pad, y: rect.y + this.s(40), w: rect.w - 2 * pad, h: cardH });
    // Karta budowli (HTML): po prawej stronie planety na szerokim miejscu, u góry na wąskim.
    const narrow = stage.w < 600;
    const cardW = narrow ? stage.w - 2 * gap : Math.min(310, stage.w * 0.4);
    const top = stage.y + gap;
    this.cardAt = {
      x: narrow ? stage.x + gap : stage.x + stage.w - cardW - gap,
      y: top,
      w: cardW,
      maxH: Math.max(160, narrow ? (rect.y - top) * 0.6 : rect.y - top - gap),
    };
    this.cardRefreshAt = 0;
  }

  /** Ekran fabryki wybranej budowli (HTML, v0.39). */
  private openFactory(): void {
    const id = this.selected;
    if (!id) return;
    const c = this.deps.controller;
    this.closeAsteroid?.();
    this.closeAsteroid = openFactoryPanel({
      view: () => c.factoryView(id),
      setMode: (index, mode) => c.setComplexMode(index, mode),
      onChange: (message) => {
        this.showToast(message, 'ok', 2600);
        this.cardRefreshAt = 0;
        this.refreshValues();
      },
    });
  }

  /** Włącz / wyłącz wybór pola: złote obrysy wolnych pól dedykowanego terenu na planecie. */
  private togglePlacing(): void {
    const id = this.selected;
    if (this.placing || !id) {
      this.placing = null;
    } else {
      const choice = this.deps.controller.placement(id);
      if (!choice.needed || choice.cells.length === 0) return;
      this.placing = { id, cells: choice.cells };
      this.showToast(`Dotknij złote pole (${choice.terrain ?? 'teren budynku'}) — tam stanie poz. ${choice.level}.`, 'info', 3200);
    }
    this.cardRefreshAt = 0;
    this.refreshBuildingCard();
  }

  /** Dotknięcie planety w trybie wyboru: trafione złote pole → budowa tam; obok — podpowiedź. */
  private placeAt(x: number, y: number): void {
    const placing = this.placing!;
    const cell = this.deps.display.pickCell(x / this.dpr, y / this.dpr, placing.cells);
    if (cell === null) {
      this.showToast('Dotknij jedno ze złotych pól — albo „Anuluj wybór miejsca” w karcie.', 'info', 2600);
      return;
    }
    const result = this.deps.controller.upgradeAt(placing.id, cell);
    this.placing = null;
    this.showToast(result.message, result.ok ? 'ok' : 'error', 3000);
    if (result.ok) this.deps.display.showBuilding(placing.id);
    this.cardRefreshAt = 0;
    this.relayout();
  }

  /** Karta budowli i obrys jej pól: odświeżane najwyżej co sekundę; schowane, gdy otwarty jest inny ekran. */
  private refreshBuildingCard(): void {
    const id = this.selected;
    if (!id || !this.cardAt || this.screenOpen || this.overlay) {
      this.buildingCard.hide();
      if (!id) this.deps.display.setHighlight(null);
      return;
    }
    const now = Date.now();
    if (now - this.cardRefreshAt < 1000) return;
    this.cardRefreshAt = now;
    const controller = this.deps.controller;
    if (this.placing && this.placing.id !== id) this.placing = null;
    this.buildingCard.show(controller.buildingCard(id), this.cardAt, !!this.placing);
    if (this.placing) this.deps.display.setHighlight(this.placing.cells, 'choice');
    else this.deps.display.setHighlight(controller.footprint(id));
  }

  /** Karta wewnątrz panelu: jaśniejsza ramka, bez osobnej strefy (panel już blokuje gesty). */
  private subPanel(rect: Rect): void {
    const g = this.add.graphics();
    const radius = this.px(this.s(10));
    g.fillStyle(COLORS.buttonIdle, 0.45).fillRoundedRect(this.px(rect.x), this.px(rect.y), this.px(rect.w), this.px(rect.h), radius);
    g.lineStyle(this.px(1), COLORS.panelBorder, 1).strokeRoundedRect(this.px(rect.x), this.px(rect.y), this.px(rect.w), this.px(rect.h), radius);
    this.ui!.add(g);
  }

  // ——— akcje i odświeżanie ———

  /** Przycisk karty: ulepsz, a gdy ten budynek się buduje — anuluj (z potwierdzeniem). */
  private onUpgrade(id: BuildingId): void {
    const controller = this.deps.controller;
    if (controller.economy.construction?.building === id) {
      this.onCancel();
      return;
    }
    // Budynek w kolejce: dotknięcie zdejmuje go z kolejki (nic nie było pobrane).
    const queued = controller.queue.map((q) => q.building).lastIndexOf(id);
    if (queued >= 0) {
      const item = controller.queue[queued]!;
      controller.dequeue(queued);
      this.showToast(`${item.name} (poz. ${item.level}) — usunięto z kolejki.`, 'info');
      this.refreshValues();
      return;
    }
    // Coś się buduje albo kolejka czeka na surowce → dopisz do kolejki (koszt przy starcie).
    if (controller.economy.construction || controller.queue.length > 0) {
      const queuedResult = controller.enqueue(id);
      this.showToast(queuedResult.message, queuedResult.ok ? 'ok' : 'error', queuedResult.ok ? 2600 : 2200);
      this.refreshValues();
      if (queuedResult.ok) this.flashCard(id);
      return;
    }
    const result = controller.upgrade(id);
    this.showToast(result.message, result.ok ? 'ok' : 'error');
    this.refreshValues();
    if (result.ok) {
      this.deps.display.showBuilding(id);
      this.flashCard(id);
    }
  }

  private onFinish(): void {
    this.cancelArmedUntil = 0;
    // onBuildComplete pokazuje budowlę; tu komunikat z ceną (np. „… gotowy (−1 antymateria)”).
    const result = this.deps.controller.finishNow();
    this.showToast(result.message, result.ok ? 'ok' : 'error', result.ok ? 3000 : 2200);
    this.refreshValues();
  }

  private onCancel(): void {
    const now = Date.now();
    if (now > this.cancelArmedUntil) {
      // Pierwsze dotknięcie tylko pyta — przypadkowy dotyk nie przerwie budowy.
      this.cancelArmedUntil = now + CANCEL_CONFIRM_MS;
      this.refreshValues();
      return;
    }
    this.cancelArmedUntil = 0;
    const result = this.deps.controller.cancelUpgrade(now);
    this.showToast(result.message, result.ok ? 'info' : 'error');
    this.refreshValues();
  }

  private refreshValues(): void {
    this.refreshBuildingCard();
    if (this.planetPending) return;
    const controller = this.deps.controller;
    const rates = controller.rates;
    const now = Date.now();
    this.refreshAiBubble();
    const construction = controller.economy.construction;
    const progress = controller.buildProgress(now);
    const colony = controller.colony();
    this.deps.display.setStructures(
      controller.economy.levels,
      construction ? { building: construction.building, targetLevel: construction.targetLevel, progress } : null,
      colony.plots,
      colony.complexes,
    );
    // Kolektor energii gwiazdy na orbicie (v0.44) — tani zapis liczby; renderer przebudowuje tylko przy zmianie.
    this.deps.display.setOrbital(controller.collectorView(now).level);
    if (this.layoutState?.panel?.id === 'ai' && this.aiShape() !== this.aiPanelShape) {
      this.relayout();
      return;
    }
    if (this.planetStatus.length > 0 && now - this.planetStatusAt >= 1000) {
      this.planetStatusAt = now;
      const overview = controller.overview();
      for (const row of this.planetStatus) {
        const p = overview.find((o) => o.index === row.index);
        if (p) this.setPlanetStatus(row.text, p);
      }
    }
    if (this.depositRows.length > 0 && now - this.depositRowsAt >= 1000) {
      this.depositRowsAt = now;
      this.beltRow?.setText(this.beltText());
      const deposits = controller.deposits;
      for (const row of this.depositRows) this.setDepositRow(row.text, row.id, deposits[row.id]);
    }
    if (this.dockProgress) {
      // Zamknięta „Produkcja”: cienki złoty pasek postępu budowy na przycisku paska.
      const { progress: g, bar } = this.dockProgress;
      g.clear();
      if (construction) {
        const h = this.s(3);
        g.fillStyle(COLORS.divider, 1).fillRect(this.px(bar.x), this.px(bar.y), this.px(bar.w), this.px(h));
        g.fillStyle(COLORS.goldHex, 1).fillRect(this.px(bar.x), this.px(bar.y), this.px(Math.max(h, bar.w * progress)), this.px(h));
      }
    }

    if (this.res) {
      const showNotes = this.res.notes;
      const pair = (value: Phaser.GameObjects.Text, note: Phaser.GameObjects.Text, v: string, n: string) => {
        value.setText(v);
        note.setText(showNotes ? n : '');
        note.setX(value.x + value.width + this.px(this.s(6)));
        note.setY(value.y + value.height - note.height - this.px(this.s(2)));
      };
      const capacity = controller.capacity;
      const stock = controller.economy.stock;
      const rateNote = (have: number, perMinute: number) => (have >= capacity ? 'magazyn pełny' : `+${formatRate(perMinute)}/min`);
      const shown = (key: keyof typeof this.counters, actual: number) => formatInt(this.counters[key] ?? actual);
      pair(this.res.metal, this.res.metalRate, shown('metal', stock.metal), rateNote(stock.metal, rates.metal));
      pair(this.res.crystal, this.res.crystalRate, shown('crystal', stock.crystal), rateNote(stock.crystal, rates.crystal));
      this.res.metalRate.setColor(stock.metal >= capacity ? COLORS.danger : COLORS.teal);
      this.res.crystalRate.setColor(stock.crystal >= capacity ? COLORS.danger : COLORS.teal);
      this.drawStorageFill(stock.metal / capacity, stock.crystal / capacity);
      const balance = rates.energyProduced - rates.energyUsed;
      pair(
        this.res.energy,
        this.res.energyNote,
        `${balance >= 0 ? '+' : '−'}${formatInt(Math.abs(balance))}`,
        rates.efficiency < 1
          ? `kopalnie ${Math.round(rates.efficiency * 100)}%`
          : `${formatInt(rates.energyProduced)}/${formatInt(rates.energyUsed)}`,
      );
      this.res.energy.setColor(balance >= 0 ? COLORS.text : COLORS.danger);
      this.res.energyNote.setColor(rates.efficiency < 1 ? COLORS.danger : COLORS.muted);
      pair(this.res.antimatter, this.res.antimatterNote, shown('antimatter', controller.economy.antimatter), `+${formatRate(rates.antimatterPerHour)}/h`);
      this.res.antimatterNote.setColor(COLORS.antimatter);
      const f = controller.fields;
      const full = f.used >= f.buildable;
      pair(this.res.fields, this.res.fieldsNote, `${formatInt(f.used)}/${formatInt(f.buildable)}`, full ? 'brak wolnych' : 'zajęte');
      this.res.fields.setColor(full ? COLORS.danger : COLORS.text);
      this.res.fieldsNote.setColor(full ? COLORS.danger : COLORS.muted);
      this.drawFieldsFill(f.used / Math.max(1, f.buildable));
    }

    const balance = controller.balance;
    const growth = balance.levelGrowth;
    for (const card of this.cards) {
      const def = balance.buildings.find((b) => b.id === card.id)!;
      const level = controller.economy.levels[card.id];
      card.level.setText(`poz. ${level}`);
      const energyNext =
        def.baseEnergyUse > 0
          ? ` · −${formatRate(scaled(def.baseEnergyUse, level + 1, growth) - scaled(def.baseEnergyUse, level, growth))} energii`
          : '';
      if (def.produces === 'research') {
        const ring = ringLimit(level + 1);
        const current = controller.research.current;
        card.effect.setText(
          current
            ? `Badanie: ${findResearch(current.id)?.name ?? ''} · zostało ${formatDuration(controller.researchSecondsLeft(now))}`
            : `Na poz. ${level + 1}: pierścień ${ring}${energyNext}`,
        );
      } else if (def.produces === 'antimatter') {
        const gain = scaled(def.baseOutput, level + 1, growth) - scaled(def.baseOutput, level, growth);
        const energyCost = scaled(def.baseEnergyUse, level + 1, growth) - scaled(def.baseEnergyUse, level, growth);
        card.effect.setText(`Na poz. ${level + 1}: +${formatRate(gain)} antymaterii/h · −${formatRate(energyCost)} energii`);
      } else if (def.produces === 'storage') {
        const next = capacityAtLevel(level + 1, balance);
        card.effect.setText(`Na poz. ${level + 1}: pojemność ${formatInt(next)} (+${formatInt(next - capacityAtLevel(level, balance))})`);
      } else if ((def.produces === 'metal' || def.produces === 'crystal') && controller.deposits[def.produces].left <= 0) {
        card.effect.setText('Złoże wyczerpane — kopalnia stoi');
      } else {
        const richness = controller.planet.gameplay.richness[def.produces];
        const env = environmentEffect(controller.planet, def.produces, balance);
        const gain = (scaled(def.baseOutput, level + 1, growth) - scaled(def.baseOutput, level, growth)) * richness * env;
        const unit = def.produces === 'energy' ? 'energii' : def.produces === 'metal' ? 'metalu/min' : 'kryształów/min';
        card.effect.setText(`Na poz. ${level + 1}: +${formatRate(gain)} ${unit}${energyNext}`);
      }
      const dry = (def.produces === 'metal' || def.produces === 'crystal') && controller.deposits[def.produces].left <= 0;
      card.effect.setColor(dry ? COLORS.danger : def.produces === 'research' && controller.research.current ? COLORS.gold : COLORS.teal);
      card.progress.clear();
      const { x: bx, w: bw, gap: bgap } = card.buttons;
      const building = construction?.building === card.id;
      card.extra?.setShown(!building);
      if (building) {
        // Ten budynek się buduje: odliczanie, pasek, „Ukończ teraz” (do poz. 5 za darmo,
        // wyżej za antymaterię) i anulowanie.
        const target = construction!.targetLevel;
        const price = controller.finishPrice(now);
        const have = Math.floor(controller.economy.antimatter);
        card.effect.setText(`Budowa poz. ${target} · zostało ${formatDuration(controller.buildSecondsLeft(now))}`);
        card.effect.setColor(COLORS.gold);
        card.cost.setText(
          price === 0
            ? `Ukończ teraz — za darmo do poz. ${balance.freeFinishMaxLevel}.`
            : `Ukończ teraz: ${antimatterAmount(price)} (masz ${have}).`,
        );
        card.cost.setColor(price > have ? COLORS.danger : price > 0 ? COLORS.antimatter : COLORS.muted);
        card.cost.setY(card.effect.y + card.effect.height + this.px(this.s(4)));
        this.drawProgress(card, progress);
        const armed = now <= this.cancelArmedUntil;
        const half = (bw - bgap) / 2;
        const wide = half / this.dpr >= 104;
        const finishLabel = price === 0 ? (wide ? 'Ukończ teraz' : 'Ukończ') : `Ukończ (${price})`;
        card.finish
          .setShown(true)
          .setSpan(bx, half)
          .setText(finishLabel)
          .setStyle(price > have ? 'disabled' : 'primary');
        card.button
          .setSpan(bx + half + bgap, half)
          .setText(armed ? 'Na pewno?' : 'Anuluj')
          .setStyle(armed ? 'danger' : 'secondary');
        continue;
      }
      card.finish.setShown(false);
      // Laboratorium: „Ulepsz” i „Badania” obok siebie (krótsze napisy).
      const half = card.extra ? (bw - bgap) / 2 : bw;
      card.button.setSpan(bx, half);
      card.extra?.setSpan(bx + half + bgap, half);
      const short = !!card.extra;
      card.cost.setColor(COLORS.muted);
      const cost = controller.costOf(card.id);
      const time = formatDuration(controller.buildSecondsFor(level + 1));
      card.cost.setText(`Koszt: ${formatInt(cost.metal)} metalu · ${formatInt(cost.crystal)} kryształów · ${time}`);
      card.cost.setY(card.effect.y + card.effect.height + this.px(this.s(4)));
      if (level >= balance.maxLevel) {
        card.button.setText(short ? 'Maks. poziom' : 'Maksymalny poziom').setStyle('disabled');
        continue;
      }
      // Kolejka budowy (od v0.32.2): pozycja tego budynku albo miejsce na dopisanie.
      const queue = controller.queue;
      const mine = queue.filter((q) => q.building === card.id).pop();
      if (mine) {
        const waiting = !construction && queue[0]?.building === card.id;
        const wait = waiting ? secondsUntilAffordable(controller.economy, mine.cost, rates, balance) : 0;
        // Jedna linia — karta z dwuwierszową nazwą nie ma miejsca na więcej.
        card.effect
          .setText(`W kolejce: poz. ${mine.level} · ${waiting ? `czeka${Number.isFinite(wait) ? ` ${formatDuration(wait)}` : ''}` : 'koszt przy starcie'}`)
          .setColor(COLORS.gold);
        card.cost.setText('');
        card.cost.setY(card.effect.y + card.effect.height + this.px(this.s(4)));
        card.button.setText(short ? 'Z kolejki' : 'Usuń z kolejki').setStyle('secondary');
        continue;
      }
      if (construction || queue.length > 0) {
        const room = queue.length < controller.queueCapacity;
        if (room) card.button.setText(short ? 'Do kolejki' : `Do kolejki (${queue.length}/${controller.queueCapacity})`).setStyle('secondary');
        else card.button.setText(short ? 'Kolejka pełna' : `Kolejka pełna (${queue.length}/${controller.queueCapacity})`).setStyle('disabled');
        continue;
      }
      if (!fitsInStorage(controller.economy, controller.costOf(card.id), balance)) {
        card.button.setText(short ? 'Mały magazyn' : 'Za mały magazyn').setStyle('disabled');
        continue;
      }
      const wait = controller.waitSecondsFor(card.id);
      if (wait <= 0) card.button.setText(short ? `Ulepsz (${level + 1})` : `Ulepsz do ${level + 1}`).setStyle('primary');
      else {
        const label = Number.isFinite(wait) ? `${short ? 'Za' : 'Dostępne za'} ${formatDuration(wait)}` : 'Brak produkcji';
        card.button.setText(label).setStyle('disabled');
      }
    }
  }

  private drawStorageFill(metal: number, crystal: number): void {
    if (!this.res) return;
    const g = this.res.fill.clear();
    const h = this.s(3);
    for (const [bar, value, color] of [
      [this.res.fillBars.metal, metal, COLORS.stoneHex],
      [this.res.fillBars.crystal, crystal, COLORS.tealHex],
    ] as const) {
      const v = Math.min(1, Math.max(0, value));
      g.fillStyle(COLORS.divider, 1).fillRect(this.px(bar.x), this.px(bar.y), this.px(bar.w), this.px(h));
      g.fillStyle(v >= 1 ? COLORS.dangerHex : color, 0.9).fillRect(this.px(bar.x), this.px(bar.y), this.px(bar.w * v), this.px(h));
    }
  }

  /** Pasek zajętych pól pod „POLA” (rysowany na tej samej grafice co magazyn). */
  private drawFieldsFill(value: number): void {
    if (!this.res) return;
    const bar = this.res.fillBars.fields;
    const h = this.s(3);
    const v = Math.min(1, Math.max(0, value));
    this.res.fill.fillStyle(COLORS.divider, 1).fillRect(this.px(bar.x), this.px(bar.y), this.px(bar.w), this.px(h));
    this.res.fill.fillStyle(v >= 1 ? COLORS.dangerHex : COLORS.goldHex, 0.9).fillRect(this.px(bar.x), this.px(bar.y), this.px(bar.w * v), this.px(h));
  }

  private drawProgress(card: BuildingCard, value: number): void {
    const { x, y, w } = card.bar;
    const h = this.s(4);
    card.progress
      .fillStyle(COLORS.divider, 1)
      .fillRoundedRect(this.px(x), this.px(y), this.px(w), this.px(h), this.px(2))
      .fillStyle(COLORS.goldHex, 1)
      .fillRoundedRect(this.px(x), this.px(y), this.px(Math.max(h, w * value)), this.px(h), this.px(2));
  }

  /** Dymek SI Matki: przebudowa tylko, gdy zmieniła się propozycja. */
  private refreshAiBubble(): void {
    const layout = this.layoutState;
    if (!layout || !this.ui) return;
    const suggestion = this.deps.controller.aiSuggestion();
    const key = suggestion ? `${suggestion.key}|${suggestion.level}|${this.deps.controller.aiAutoUnlocked}` : '';
    if ((this.aiBubble?.key ?? '') === key) return;
    this.aiBubble?.container.destroy(true);
    this.aiBubble = null;
    if (!suggestion) return;
    const controller = this.deps.controller;
    // Miejsce: u góry wolnego miejsca obok panelu (nad planetą).
    const stage = layout.stage;
    const w = Math.min(this.s(460), stage.w);
    const x = stage.x + (stage.w - w) / 2;
    const top = stage.y;
    const pad = this.s(12);
    const items: Phaser.GameObjects.GameObject[] = [];
    const t = (y: number, content: string, size: number, color: string, extra: Phaser.Types.GameObjects.Text.TextStyle = {}) => {
      const text = this.add.text(this.px(pad), this.px(y), content, {
        fontFamily: FONTS.body,
        fontSize: `${this.px(this.s(size))}px`,
        color,
        wordWrap: { width: this.px(w - 2 * pad) },
        ...extra,
      });
      items.push(text);
      return y + text.height / this.dpr;
    };
    let y = pad - this.s(2);
    y = t(y, 'SI MATKA', 10, COLORS.antimatter, { fontStyle: '600', letterSpacing: 1.5 }) + this.s(3);
    y = t(y, suggestion.text, 13.5, COLORS.text, { fontStyle: '600' }) + this.s(2);
    y = t(y, suggestion.reason, 11.5, COLORS.muted) + this.s(10);
    const h = y + TOUCH + pad;
    const by = top;
    const bg = this.add.graphics();
    const radius = this.px(this.s(12));
    bg.fillStyle(COLORS.panel, 0.96).fillRoundedRect(0, 0, this.px(w), this.px(h), radius);
    bg.lineStyle(this.px(1), COLORS.antimatterHex, 0.7).strokeRoundedRect(0, 0, this.px(w), this.px(h), radius);
    const blocker = this.add.zone(0, 0, this.px(w), this.px(h)).setOrigin(0).setInteractive();
    const choices: [string, ButtonStyle, () => void][] =
      suggestion.level === 'propose'
        ? [['Rozumiem', 'secondary', () => this.onAiDecline(suggestion.rule)]]
        : [
            ['Tak', 'primary', () => this.onAiAccept(suggestion.key, suggestion.action)],
            ['Nie', 'secondary', () => this.onAiDecline(suggestion.rule)],
            ...(controller.aiAutoUnlocked
              ? [['Zawsze tak rób', 'secondary', () => this.onAiAccept(suggestion.key, suggestion.action, true)] as [string, ButtonStyle, () => void]]
              : []),
          ];
    const bw = (w - 2 * pad - this.s(8) * (choices.length - 1)) / choices.length;
    const buttons = choices.map(([label, style, onTap], i) =>
      new Button(this, this.px(pad + i * (bw + this.s(8))), this.px(y), this.px(bw), this.px(TOUCH), label, this.dpr, onTap, this.s(13)).setStyle(style),
    );
    const container = this.add.container(this.px(x), this.px(by), [bg, blocker, ...items, ...buttons]).setDepth(40);
    this.ui.add(container);
    this.aiBubble = { container, key };
  }

  private onAiAccept(key: string, action: AiAction, always = false): void {
    const controller = this.deps.controller;
    const result = always ? controller.aiAlways(key) : controller.aiAccept(key);
    this.showToast(result.message, result.ok ? 'ok' : 'error', 3000);
    if (result.ok && action.kind === 'build') this.deps.display.showBuilding(action.building);
    this.refreshValues();
  }

  private onAiDecline(rule: AiRuleId): void {
    this.deps.controller.aiDecline(rule);
    this.refreshValues();
  }

  private showToast(message: string, kind: ToastKind, duration = 2200): void {
    this.toast?.destroy(true);
    const layout = this.layoutState!;
    const viewport = this.deps.getViewport();
    const label = this.add
      .text(0, 0, message, {
        fontFamily: FONTS.body,
        fontSize: `${this.px(this.s(13.5))}px`,
        fontStyle: '600',
        color: kind === 'error' ? COLORS.danger : kind === 'ok' ? COLORS.teal : COLORS.text,
        align: 'center',
        wordWrap: { width: this.px(Math.min(viewport.width - 40, 520)) },
      })
      .setOrigin(0.5);
    const w = label.width + this.px(this.s(32));
    const h = label.height + this.px(this.s(18));
    const bg = this.add
      .graphics()
      .fillStyle(COLORS.panel, 0.94)
      .fillRoundedRect(-w / 2, -h / 2, w, h, h / 2)
      .lineStyle(this.px(1), kind === 'error' ? COLORS.dangerHex : COLORS.tealHex, 0.7)
      .strokeRoundedRect(-w / 2, -h / 2, w, h, h / 2);
    const toast = this.add
      .container(this.px(layout.stage.x + layout.stage.w / 2), this.px(layout.toastY), [bg, label])
      .setDepth(50)
      .setAlpha(this.planetPending ? 1 : 0);
    this.toast = toast;
    // Podczas ładowania planety komunikat musi być widoczny od pierwszej klatki (potem ekran stoi).
    if (!this.planetPending) this.tweens.add({ targets: toast, alpha: 1, duration: 150 });
    this.tweens.add({
      targets: toast,
      alpha: 0,
      delay: duration,
      duration: 400,
      onComplete: () => {
        toast.destroy(true);
        if (this.toast === toast) this.toast = undefined;
      },
    });
  }

  /** Pokazuje pasek „Dostępna aktualizacja” (zostaje do odświeżenia). */
  showUpdateAvailable(apply: () => void): void {
    this.updateApply = apply;
    if (this.layoutState) this.relayout();
  }

  private buildUpdateBanner(layout: Layout): void {
    if (!this.updateApply) return;
    const viewport = this.deps.getViewport();
    const w = Math.min(viewport.width - 2 * this.s(16), this.s(380));
    const h = this.s(60);
    const y = Math.max(layout.stage.y, layout.planet.cy - layout.planet.r - h - this.s(8));
    const rect: Rect = { x: layout.planet.cx - w / 2, y, w, h };
    this.panel(rect, true);
    const pad = this.s(10);
    this.text(rect.x + this.s(16), rect.y + h / 2, 'Dostępna aktualizacja', 14, COLORS.text, { fontStyle: '600' }).setOrigin(0, 0.5);
    const buttonW = this.s(120);
    this.addButton(rect.x + w - pad - buttonW, rect.y + (h - 44) / 2, buttonW, 44, 'Odśwież', 'primary', () => {
      this.deps.controller.save();
      this.updateApply?.();
    });
  }

  private closeOverlay(): void {
    this.overlay?.destroy(true);
    this.overlay = undefined;
  }

  /**
   * Okno „Zarządzanie” budynku: suwaki produktywności (wydobycie i zużycie energii razem) i pierwszeństwa
   * do energii, teren grup budowli i złoża planety. Zmiana zapisuje się po puszczeniu suwaka.
   */
  private openManagement(id: BuildingId): void {
    if (this.overlay) this.closeOverlay();
    const c = this.deps.controller;
    const def = BALANCE.buildings.find((b) => b.id === id)!;
    const info = c.buildingInfo(id);
    const viewport = this.deps.getViewport();
    const W = this.px(viewport.width);
    const H = this.px(viewport.height);
    const shade = this.add.rectangle(0, 0, W, H, 0x000000, 0.6).setOrigin(0).setInteractive();
    shade.on('pointerup', () => {
      this.demolishArmed = null;
      this.closeOverlay();
    });
    const w = this.px(Math.min(viewport.width - 32, this.s(420)));
    const pad = this.px(this.s(20));
    const buttonH = this.px(Math.max(44, this.s(44)));
    const gap = this.px(this.s(10));
    const font = (size: number, color: string, extra: Phaser.Types.GameObjects.Text.TextStyle = {}) => ({
      fontFamily: FONTS.body,
      fontSize: `${this.px(this.s(size))}px`,
      color,
      wordWrap: { width: w - 2 * pad },
      lineSpacing: this.px(3),
      ...extra,
    });
    const items: Phaser.GameObjects.GameObject[] = [];
    let y = pad;
    const add = (text: string, size: number, color: string, extra: Phaser.Types.GameObjects.Text.TextStyle = {}, after = gap) => {
      const t = this.add.text(pad, y, text, font(size, color, extra));
      items.push(t);
      y += t.height + after;
      return t;
    };
    add('Zarządzanie', 11, COLORS.muted, { fontStyle: '600' }, this.px(2));
    add(`${def.name} · poz. ${info.level}`, 20, COLORS.gold, { fontFamily: FONTS.serif });
    const pct = (v: number) => `${Math.round(v * 100)}%`;
    const consumes = def.baseEnergyUse > 0;
    const produces = def.produces === 'metal' || def.produces === 'crystal' || def.produces === 'energy';
    const slider = (label: string, hint: string, value: number, apply: (v: number) => void) => {
      add(label, 13, COLORS.text, { fontStyle: '600' }, this.px(2));
      add(hint, 11, COLORS.muted, {}, this.px(6));
      items.push(...this.slider(pad, y, w - 2 * pad, buttonH, value, apply));
      y += buttonH + gap;
    };
    if (produces) {
      slider(
        'Produktywność',
        def.produces === 'energy' ? 'Ile energii wytwarza elektrownia.' : 'Wydobycie i zużycie energii razem — 0% wyłącza budynek.',
        info.settings.work,
        (v) => this.applySetting(id, { work: v }),
      );
    }
    if (consumes) {
      slider(
        'Energia — pierwszeństwo',
        'Gdy energii brakuje, budynki z wyższym pierwszeństwem dostają ją najpierw.',
        info.settings.priority,
        (v) => this.applySetting(id, { priority: v }),
      );
    }
    // Dedykowany teren (v0.38.2): wybór pola i łączenie w kompleks tylko na nim.
    const terrain = TERRAIN_NAMES;
    const lines: string[] = [];
    if (consumes) lines.push(`Energia: dostaje ${pct(info.energyEfficiency)} potrzebnej.`);
    lines.push(`Pola: ${info.groups} (każde mieści 3 poziomy)${info.onIce > 0 ? `, w tym ${info.onIce} na lodzie` : ''}.`);
    if (terrain[id]) {
      lines.push(`Najlepszy teren: ${terrain[id]} — ${info.suitedGroups} z ${info.groups} pól. Wydajność terenu: ${pct(info.siteFactor)} (pola poza nim pracują w 75%).`);
    }
    if (info.richness !== null) lines.push(`Złoża planety: ${pct(info.richness)}.`);
    if (info.deposit) lines.push(`${depositLine(def.produces === 'metal' ? 'metal' : 'crystal', info.deposit)}.`);
    if (id === 'storage') lines.push('Magazyn nie ma ustawień pracy — tu przybędą funkcje z badań.');
    // Zburzenie poziomu (v0.35): zwalnia pole, gdy grupa budowli się zmniejsza — bez zwrotu surowców.
    const canDemolish = info.level > (id === 'storage' ? 1 : 0);
    if (canDemolish) lines.push('Zburzenie: −1 poziom od razu, bez zwrotu surowców; pole zwalnia się, gdy grupa 3 poziomów maleje.');
    // Kompleks (v0.38): rodziny z `data/complexes.ts` — okno z podglądem i decyzją.
    const complex = c.complexView(id);
    if (complex) {
      lines.push(`${complex.name}: ${complex.count > 0 ? `${complex.count} (+${complex.bonus}% z ${complex.levelsIn} poziomów)` : complex.candidate ? 'można połączyć pola' : 'brak'}.`);
      if (complex.mega.count > 0) lines.push(`${complex.mega.name}: ${complex.mega.count} (+${complex.mega.bonus}%).`);
      else if (complex.mega.unlocked && complex.mega.candidate) lines.push(`${complex.mega.name}: można połączyć dwa kompleksy.`);
    }
    add(lines.join('\n'), 12, COLORS.stone, {}, gap * 1.5);
    if (complex) {
      const open = new Button(this, pad, y, w - 2 * pad, buttonH, complex.name, this.dpr, () => {
        this.demolishArmed = null;
        this.closeOverlay();
        this.openComplex(id);
      }, this.s(14));
      items.push(open.setStyle((complex.candidate && complex.unlocked) || (complex.mega.unlocked && complex.mega.candidate) ? 'primary' : 'secondary'));
      y += buttonH + gap;
    }
    if (canDemolish) {
      const armed = this.demolishArmed === id;
      const demolish = new Button(this, pad, y, this.px(this.s(170)), buttonH, armed ? 'Na pewno?' : `Zburz poz. ${info.level}`, this.dpr, () => this.onDemolish(id), this.s(14));
      items.push(demolish.setStyle(armed ? 'danger' : 'secondary'));
    }
    const closeBtn = new Button(this, w - pad - this.px(this.s(150)), y, this.px(this.s(150)), buttonH, 'Zamknij', this.dpr, () => {
      this.demolishArmed = null;
      this.closeOverlay();
    }, this.s(15)).setStyle('primary');
    items.push(closeBtn);
    y += buttonH + pad;
    const h = y;
    const x = (W - w) / 2;
    const top = Math.max(this.px(8), (H - h) / 2);
    const box = this.add
      .graphics()
      .fillStyle(COLORS.panel, 0.98)
      .fillRoundedRect(0, 0, w, h, this.px(16))
      .lineStyle(this.px(1), COLORS.goldHex, 0.7)
      .strokeRoundedRect(0, 0, w, h, this.px(16));
    const blocker = this.add.zone(0, 0, w, h).setOrigin(0).setInteractive();
    const dialog = this.add.container(x, top, [box, blocker, ...items]);
    this.overlay = this.add.container(0, 0, [shade, dialog]).setDepth(100);
  }

  /**
   * Okno „Specjalizacja kolonii”: położenie planety (gwiazda, strefa), cztery specjalizacje z dopasowaniem
   * i efektami na tej planecie. Pierwszy wybór od razu; zmiana po badaniu „Przebudowa kolonii”, trwa 1 h
   * (drugie dotknięcie potwierdza — przez ten czas planeta nie ma premii).
   */
  private closeAsteroid: (() => void) | null = null;
  /** Karta budowli obok przybliżonej planety i jej miejsce (v0.38.1). */
  private readonly buildingCard = new BuildingCardView(
    () => {
      this.selected = null;
      this.placing = null;
      this.relayout();
    },
    () => this.togglePlacing(),
    () => this.openFactory(),
  );
  /** Tryb wyboru pola dla następnego poziomu wybranej budowli (v0.38.2). */
  private placing: { id: BuildingId; cells: number[] } | null = null;
  private cardAt: CardPlacement | null = null;
  private cardRefreshAt = 0;

  /** Okno „Kompleks” (HTML) budynku aktywnej planety. */
  private openComplex(id: BuildingId): void {
    const c = this.deps.controller;
    this.closeAsteroid?.();
    this.closeAsteroid = openComplexPanel({
      view: () => c.complexView(id)!,
      merge: () => c.mergeComplex(id),
      split: () => c.splitComplex(id),
      mergeMega: () => c.mergeMega(id),
      splitMega: () => c.splitMega(id),
      finds: () => c.findsView().total,
      openFinds: () => {
        this.closeAsteroid = openFindsPanel(() => c.findsView());
      },
      onDone: (message) => {
        this.closeAsteroid = null;
        this.showToast(message, 'ok', 3600);
        this.relayout();
      },
    });
  }

  /** Stan wydobycia w kosmosie w jednym wierszu: stacja na pasie i holownik po kometę (v0.37.1). */
  private beltText(): string {
    const belt = this.deps.controller.asteroidView();
    const comet = this.deps.controller.cometView();
    const cometPart = comet.flying ? `kometa ${formatDuration(comet.flying.secondsLeft)}` : comet.unlocked ? 'holownik gotowy' : null;
    let beltPart: string;
    if (!belt.hasBelt) beltPart = cometPart ? 'bez pasa' : 'brak pasa w układzie';
    else if (belt.target === 0) beltPart = belt.takenBy ? `stacja planety ${belt.takenBy}` : belt.unlocked ? 'bez stacji' : 'pas bez stacji';
    else if (belt.target > belt.level) beltPart = cometPart ? `stacja → ${belt.target}` : `stacja → poz. ${belt.target} · ${formatDuration(belt.secondsLeft)}`;
    else beltPart = cometPart ? `stacja ${belt.level}` : `stacja poz. ${belt.level} · +${formatInt((belt.output.metal + belt.output.crystal) * 60)}/h`;
    // Jeden wiersz (krótkie formy, gdy działa też holownik); kolektor energii gwiazdy (v0.44) na końcu.
    const star = this.deps.controller.collectorView();
    const starPart = star.target > 0 ? ` · kolektor ${star.target > star.level ? `→ ${star.target}` : star.level}` : '';
    return (cometPart ? `${beltPart} · ${cometPart}` : beltPart) + starPart;
  }

  /** Okno „Pas asteroid” (HTML) — stacja wydobywcza aktywnej planety. */
  private openAsteroid(): void {
    const c = this.deps.controller;
    this.closeAsteroid?.();
    this.closeAsteroid = openAsteroidPanel({
      planetName: c.planet.displayName,
      view: () => c.asteroidView(),
      upgrade: () => c.upgradeAsteroidStation(),
      comet: () => c.cometView(),
      launchComet: () => c.launchComet(),
      collector: () => c.collectorView(),
      upgradeCollector: () => c.upgradeStarCollector(),
      onDone: (message) => {
        this.closeAsteroid = null;
        this.showToast(message, 'ok', 3200);
        this.relayout();
      },
    });
  }

  private openSpecialization(): void {
    if (this.overlay) this.closeOverlay();
    const c = this.deps.controller;
    const view = c.specialization();
    const viewport = this.deps.getViewport();
    const W = this.px(viewport.width);
    const H = this.px(viewport.height);
    const shade = this.add.rectangle(0, 0, W, H, 0x000000, 0.6).setOrigin(0).setInteractive();
    shade.on('pointerup', () => this.closeOverlay());
    const w = this.px(Math.min(viewport.width - 32, this.s(460)));
    const pad = this.px(this.s(20));
    const buttonH = this.px(Math.max(44, this.s(44)));
    const buttonW = this.px(this.s(118));
    const gap = this.px(this.s(10));
    const font = (size: number, color: string, width: number, extra: Phaser.Types.GameObjects.Text.TextStyle = {}) => ({
      fontFamily: FONTS.body,
      fontSize: `${this.px(this.s(size))}px`,
      color,
      wordWrap: { width },
      lineSpacing: this.px(2),
      ...extra,
    });
    const items: Phaser.GameObjects.GameObject[] = [];
    let y = pad;
    const add = (text: string, size: number, color: string, extra: Phaser.Types.GameObjects.Text.TextStyle = {}, after = gap) => {
      const t = this.add.text(pad, y, text, font(size, color, w - 2 * pad, extra));
      items.push(t);
      y += t.height + after;
      return t;
    };
    add('Specjalizacja kolonii', 11, COLORS.muted, { fontStyle: '600' }, this.px(2));
    add(c.planet.displayName, 20, COLORS.gold, { fontFamily: FONTS.serif }, this.px(4));
    if (view.siteText) add(`${view.siteText} — od położenia zależy, jak mocno działa każda specjalizacja.`, 11, COLORS.stone);
    const cur = view.current;
    const hours = view.changeSeconds / 3600;
    const status = !cur
      ? 'Bez specjalizacji. Pierwszy wybór działa od razu i jest darmowy.'
      : cur.active
        ? `Obecna: ${cur.name}.${view.canChange ? ` Zmiana trwa ${hours === 1 ? '1 godzinę' : `${hours} h`} — w tym czasie planeta nie ma premii.` : ' Zmianę odblokowuje badanie „Przebudowa kolonii” (Planetologia).'}`
        : `Trwa zmiana na: ${cur.name} — zostało ${formatDuration(cur.secondsLeft)}.`;
    add(status, 12, cur && !cur.active ? COLORS.gold : COLORS.text, {}, gap * 1.2);
    const tones: Record<string, string> = { świetne: COLORS.gold, dobre: COLORS.teal, zwykłe: COLORS.stone, słabe: COLORS.danger };
    for (const option of view.options) {
      const textW = w - 2 * pad - buttonW - gap;
      const top = y;
      const title = this.add.text(pad, y, option.name, font(14, COLORS.text, textW, { fontStyle: '600' }));
      const fit = this.add.text(pad + title.width + this.px(this.s(8)), y + this.px(this.s(2)), `dopasowanie ${option.label} ×${String(option.affinity).replace('.', ',')}`, font(10.5, tones[option.label] ?? COLORS.stone, textW));
      const effects = this.add.text(pad, y + title.height + this.px(2), option.effects, font(11, COLORS.muted, textW));
      items.push(title, fit, effects);
      // Etykieta „dopasowanie …” w nowej linii, gdy nie mieści się obok nazwy.
      if (title.width + fit.width + this.px(this.s(8)) > textW) {
        fit.setPosition(pad, effects.y);
        effects.setY(fit.y + fit.height + this.px(2));
      }
      const blockH = effects.y + effects.height - top;
      const current = cur?.id === option.id;
      const armed = this.specArmed === option.id;
      const label = current ? (cur!.active ? 'Obecna' : 'Trwa zmiana') : !cur ? 'Wybierz' : !view.canChange ? 'Zablokowane' : armed ? 'Na pewno?' : `Zmień (${hours} h)`;
      const style = current || (cur && !view.canChange) ? 'disabled' : armed ? 'danger' : !cur ? 'primary' : 'secondary';
      const by = top + Math.max(0, (blockH - buttonH) / 2);
      const button = new Button(this, w - pad - buttonW, by, buttonW, buttonH, label, this.dpr, () => this.onSpecialization(option.id), this.s(13.5)).setStyle(style);
      items.push(button);
      y = top + Math.max(blockH, buttonH) + gap * 1.2;
    }
    const closeBtn = new Button(this, w - pad - this.px(this.s(150)), y, this.px(this.s(150)), buttonH, 'Zamknij', this.dpr, () => this.closeOverlay(), this.s(15)).setStyle('secondary');
    items.push(closeBtn);
    y += buttonH + pad;
    const h = y;
    const x = (W - w) / 2;
    const top = Math.max(this.px(8), (H - h) / 2);
    const box = this.add
      .graphics()
      .fillStyle(COLORS.panel, 0.98)
      .fillRoundedRect(0, 0, w, h, this.px(16))
      .lineStyle(this.px(1), COLORS.goldHex, 0.7)
      .strokeRoundedRect(0, 0, w, h, this.px(16));
    const blocker = this.add.zone(0, 0, w, h).setOrigin(0).setInteractive();
    const dialog = this.add.container(x, top, [box, blocker, ...items]);
    this.overlay = this.add.container(0, 0, [shade, dialog]).setDepth(100);
  }

  /** Dotknięcie specjalizacji: wybór od razu; zmiana — najpierw „Na pewno?”, drugie dotknięcie zmienia. */
  private onSpecialization(id: SpecializationId): void {
    const view = this.deps.controller.specialization();
    if (view.current?.id === id) return;
    if (view.current && view.canChange && this.specArmed !== id) {
      this.specArmed = id;
      this.time.delayedCall(0, () => this.openSpecialization());
      return;
    }
    this.specArmed = null;
    const result = this.deps.controller.chooseSpecialization(id);
    this.showToast(result.message, result.ok ? 'ok' : 'error', 3200);
    this.relayout();
    this.time.delayedCall(0, () => this.openSpecialization());
  }

  /** Zapis ustawienia budynku i odświeżenie okna (nowa wydajność energii, produkcja w pasku). */
  /** Zburzenie poziomu: pierwsze dotknięcie pyta („Na pewno?”), drugie burzy. */
  private onDemolish(id: BuildingId): void {
    if (this.demolishArmed !== id) {
      this.demolishArmed = id;
      this.time.delayedCall(0, () => this.openManagement(id));
      return;
    }
    this.demolishArmed = null;
    const result = this.deps.controller.demolish(id);
    this.showToast(result.message, result.ok ? 'info' : 'error', 3000);
    this.refreshValues();
    this.time.delayedCall(0, () => this.openManagement(id));
  }

  private applySetting(id: BuildingId, change: Partial<BuildingSettings>): void {
    this.deps.controller.setBuildingSettings(id, change);
    this.refreshValues();
    // Po zakończeniu obsługi dotknięcia — okno budujemy od nowa z aktualnymi liczbami.
    this.time.delayedCall(0, () => this.openManagement(id));
  }

  /**
   * Suwak 0–100% (krok 5%) w pikselach okna: tor z wypełnieniem, gałka i wartość. Przeciąganie
   * i dotknięcie toru zmieniają wartość; `commit` dostaje ją po puszczeniu palca (zapis gry).
   */
  private slider(x: number, y: number, w: number, h: number, value: number, commit: (v: number) => void): Phaser.GameObjects.GameObject[] {
    const labelW = this.px(this.s(52));
    const trackW = w - labelW;
    const g = this.add.graphics();
    const label = this.add.text(x + w, y + h / 2, '', { fontFamily: FONTS.body, fontSize: `${this.px(this.s(15))}px`, color: COLORS.gold, fontStyle: '600' }).setOrigin(1, 0.5);
    let current = value;
    const draw = () => {
      const cy = y + h / 2;
      const knob = x + current * trackW;
      g.clear();
      g.fillStyle(COLORS.panelBorder, 1).fillRoundedRect(x, cy - this.px(3), trackW, this.px(6), this.px(3));
      g.fillStyle(COLORS.tealHex, 1).fillRoundedRect(x, cy - this.px(3), Math.max(this.px(6), current * trackW), this.px(6), this.px(3));
      g.fillStyle(COLORS.goldHex, 1).fillCircle(knob, cy, this.px(this.s(10)));
      label.setText(`${Math.round(current * 100)}%`);
    };
    draw();
    const zone = this.add.zone(x - this.px(12), y, trackW + this.px(24), h).setOrigin(0).setInteractive({ useHandCursor: true });
    let dragging = false;
    const at = (pointer: Phaser.Input.Pointer) => {
      // Strefa leży w kontenerze okna — pozycję toru liczymy względem jej lewej krawędzi na ekranie.
      const left = zone.getBounds().x + this.px(12);
      current = Math.round(Math.min(1, Math.max(0, (pointer.x - left) / trackW)) * 20) / 20;
      draw();
    };
    zone.on('pointerdown', (pointer: Phaser.Input.Pointer) => {
      dragging = true;
      at(pointer);
    });
    zone.on('pointermove', (pointer: Phaser.Input.Pointer) => {
      if (dragging && pointer.isDown) at(pointer);
    });
    const release = () => {
      if (!dragging) return;
      dragging = false;
      commit(current);
    };
    zone.on('pointerup', release);
    zone.on('pointerout', release);
    return [g, label, zone];
  }

  /** Okno ustawień: przenoszenie zapisu, nowa planeta, wersja gry. */
  private openSettings(): void {
    if (this.overlay) return;
    const viewport = this.deps.getViewport();
    const W = this.px(viewport.width);
    const H = this.px(viewport.height);
    const shade = this.add.rectangle(0, 0, W, H, 0x000000, 0.6).setOrigin(0).setInteractive();
    shade.on('pointerup', () => this.closeOverlay());
    const w = this.px(Math.min(viewport.width - 32, this.s(440)));
    const pad = this.px(this.s(20));
    const buttonH = this.px(Math.max(44, this.s(44)));
    const gap = this.px(this.s(12));
    const font = (size: number, color: string, extra: Phaser.Types.GameObjects.Text.TextStyle = {}) => ({
      fontFamily: FONTS.body,
      fontSize: `${this.px(this.s(size))}px`,
      color,
      wordWrap: { width: w - 2 * pad },
      lineSpacing: this.px(3),
      ...extra,
    });
    const halfW = (w - 2 * pad - gap) / 2;

    // Najpierw treść (żeby znać wysokość okna), potem tło pod nią.
    const items: Phaser.GameObjects.GameObject[] = [];
    let y = pad;
    const title = this.add.text(pad, y, 'Ustawienia', { ...font(22, COLORS.gold), fontFamily: FONTS.serif });
    y += title.height + gap;
    const saveLabel = this.add.text(pad, y, 'ZAPIS GRY', font(11, COLORS.muted, { fontStyle: '600' }));
    y += saveLabel.height + this.px(4);
    const saveHint = this.add.text(
      pad,
      y,
      'Zapis obejmuje wszystkie Twoje planety. Gra w Safari i gra z ekranu początkowego mają osobną pamięć — skopiuj zapis w jednej i wczytaj w drugiej (albo zachowaj kopię w notatkach).',
      font(13, COLORS.muted),
    );
    y += saveHint.height + gap;
    const copy = new Button(this, pad, y, halfW, buttonH, 'Kopiuj zapis', this.dpr, () => this.copySave(), this.s(15)).setStyle('secondary');
    const load = new Button(this, pad + halfW + gap, y, halfW, buttonH, 'Wczytaj zapis', this.dpr, () => this.loadSave(), this.s(15)).setStyle(
      'secondary',
    );
    y += buttonH + gap * 1.5;
    const g = this.deps.graphics;
    const gfxLabel = this.add.text(pad, y, 'GRAFIKA', font(11, COLORS.muted, { fontStyle: '600' }));
    y += gfxLabel.height + this.px(4);
    const gfxHint = this.add.text(
      pad,
      y,
      g.active === 'webgl'
        ? 'Planeta 3D (opcja dodatkowa). Jeśli gra działa wolno, zamyka się albo iPad się restartuje, wróć do 2D.'
        : g.crashedLastTime
          ? 'Planeta 2D — poprzednie uruchomienie się nie powiodło. Zgłoś błąd przyciskiem „Zgłoś / diagnostyka”.'
          : 'Planeta 2D (domyślnie): lekka, pikselowa, z obrotem palcem. Model 3D to opcja dodatkowa — na starszych iPadach może działać wolniej.',
      font(13, COLORS.muted),
    );
    y += gfxHint.height + gap;
    const toggle = new Button(
      this,
      pad,
      y,
      halfW,
      buttonH,
      g.active === 'webgl' ? 'Wróć do 2D' : 'Włącz 3D',
      this.dpr,
      () => g.setMode(g.active === 'webgl' ? '2d' : '3d'),
      this.s(15),
    ).setStyle('secondary');
    const diag = new Button(this, pad + halfW + gap, y, halfW, buttonH, 'Zgłoś / diagnostyka', this.dpr, () => this.openFeedback(), this.s(15)).setStyle(
      'secondary',
    );
    y += buttonH + gap * 1.5;
    const viewLabel = this.add.text(pad, y, 'WIDOK', font(11, COLORS.muted, { fontStyle: '600' }));
    y += viewLabel.height + this.px(4);
    const viewHint = this.add.text(pad, y, 'Dotknięcie budynku (na planecie albo karty w „Produkcji”) przybliża planetę do:', font(13, COLORS.muted));
    y += viewHint.height + gap;
    const focus = loadFocusZoom();
    const zoomButtons = FOCUS_ZOOMS.map((zoom, i) =>
      new Button(this, pad + i * (halfW + gap), y, halfW, buttonH, zoom === 1.5 ? '1,5× (domyślnie)' : `${zoom}× — z bliska`, this.dpr, () => {
        saveFocusZoom(zoom);
        this.closeOverlay();
        this.openSettings();
      }, this.s(15)).setStyle(zoom === focus ? 'primary' : 'secondary'),
    );
    y += buttonH + gap;
    const gridOn = loadGridVisible();
    const gridButton = new Button(this, pad, y, w - 2 * pad, buttonH, gridOn ? 'Siatka pól: widoczna — ukryj' : 'Siatka pól: ukryta — pokaż', this.dpr, () => {
      saveGridVisible(!gridOn);
      this.deps.display.setGridVisible(!gridOn);
      this.closeOverlay();
      this.openSettings();
    }, this.s(15)).setStyle(gridOn ? 'primary' : 'secondary');
    y += buttonH + gap * 1.5;
    const version = this.add.text(pad, y + (buttonH - this.px(this.s(16))) / 2, `Planet Forge ${this.deps.appVersion}`, font(12, COLORS.faint, { fontFamily: FONTS.mono }));
    const closeBtn = new Button(this, w - pad - halfW, y, halfW, buttonH, 'Zamknij', this.dpr, () => this.closeOverlay(), this.s(15)).setStyle(
      'primary',
    );
    y += buttonH + pad;
    items.push(title, saveLabel, saveHint, copy, load, gfxLabel, gfxHint, toggle, diag, viewLabel, viewHint, ...zoomButtons, gridButton, version, closeBtn);

    const h = y;
    const x = (W - w) / 2;
    const top = Math.max(this.px(8), (H - h) / 2);
    const box = this.add
      .graphics()
      .fillStyle(COLORS.panel, 0.98)
      .fillRoundedRect(0, 0, w, h, this.px(16))
      .lineStyle(this.px(1), COLORS.goldHex, 0.7)
      .strokeRoundedRect(0, 0, w, h, this.px(16));
    // Strefa pod oknem łapie dotyk, żeby nie zamykał go „klik w tło”.
    const blocker = this.add.zone(0, 0, w, h).setOrigin(0).setInteractive();
    const dialog = this.add.container(x, top, [box, blocker, ...items]);
    this.overlay = this.add.container(0, 0, [shade, dialog]).setDepth(100);
  }

  /** Okno „Diagnostyka i zgłoszenia”: błąd albo sugestia → zgłoszenie w repozytorium gry (GitHub) albo tekst do skopiowania. */
  private openFeedback(): void {
    this.closeOverlay();
    openFeedbackPanel({ diagnostics: () => this.deps.graphics.diagnostics(), save: () => this.deps.controller.exportSave() });
  }

  private copySave(): void {
    const text = this.deps.controller.exportSave();
    const fallback = () =>
      openTextPanel({
        title: 'Kopiuj zapis',
        hint: 'Nie udało się skopiować automatycznie. Przytrzymaj tekst, wybierz „Zaznacz wszystko”, a potem „Kopiuj”.',
        text,
        readOnly: true,
      });
    try {
      // Wywołane prosto z dotknięcia przycisku — Safari wymaga gestu użytkownika.
      navigator.clipboard
        .writeText(text)
        .then(() => this.showToast('Zapis skopiowany. Wklej go w notatkach albo w drugiej kopii gry.', 'ok', 3500))
        .catch(fallback);
    } catch {
      fallback();
    }
  }

  private loadSave(): void {
    openTextPanel({
      title: 'Wczytaj zapis',
      hint: 'Wklej tekst zapisu (zaczyna się od „PF2:” albo starszego „PF1:”). Wszystkie obecne planety i postęp zostaną zastąpione.',
      confirmLabel: 'Wczytaj',
      onConfirm: (text) => {
        const result = this.deps.controller.importSave(text);
        if (!result.ok) return result.message;
        this.closeOverlay();
        this.showToast(result.message, 'ok', 3000);
        return null;
      },
    });
  }
}

/** „1:42:7 · seed …” — dla planet z galaktyki (seed = adres) sam adres. */
function addressLine(address: string, seed: string): string {
  return seed === address ? `adres  ${address}` : `${address} · ${seed}`;
}
