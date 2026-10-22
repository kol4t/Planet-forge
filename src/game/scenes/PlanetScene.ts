import Phaser from 'phaser';
import type { GameController } from '../../app/GameController.ts';
import { antimatterAmount, capacityAtLevel, environmentEffect, fitsInStorage, scaled } from '../../core/economy/economy.ts';
import { AI_RULES, type AiAction, type AiLevel, type AiRuleId } from '../../core/ai/advisor.ts';
import { ringLimit } from '../../core/research/research.ts';
import type { BuildingId, YieldId } from '../../core/types.ts';
import { BALANCE } from '../../data/balance.ts';
import { findResearch } from '../../data/research.ts';
import type { PlanetDisplay } from '../../planet-renderer/PlanetDisplay.ts';
import { Button, type ButtonStyle } from '../ui/Button.ts';
import { GestureTracker, PICK_ZOOM, type GestureEvent } from '../ui/gestures.ts';
import { openTextPanel } from '../ui/textPanel.ts';
import {
  computeLayout,
  DOCK_ORDER,
  DOCK_PANELS,
  TOUCH,
  type DockItemId,
  type Insets,
  type Layout,
  type PanelId,
  type PanelState,
  type Rect,
} from '../ui/layout.ts';
import { loadPanels, savePanels } from '../ui/uiPrefs.ts';
import { COLORS, FONTS, formatDuration, formatInt, formatRate } from '../ui/theme.ts';
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
}

/** Jak długo drugie dotknięcie „Anuluj” potwierdza anulowanie (ms). */
const CANCEL_CONFIRM_MS = 3000;

interface ResourceTexts {
  /** Paski zapełnienia magazynu pod metalem i kryształami. */
  fill: Phaser.GameObjects.Graphics;
  fillBars: { metal: { x: number; y: number; w: number }; crystal: { x: number; y: number; w: number } };
  metal: Phaser.GameObjects.Text;
  metalRate: Phaser.GameObjects.Text;
  crystal: Phaser.GameObjects.Text;
  crystalRate: Phaser.GameObjects.Text;
  energy: Phaser.GameObjects.Text;
  energyNote: Phaser.GameObjects.Text;
  antimatter: Phaser.GameObjects.Text;
  antimatterNote: Phaser.GameObjects.Text;
  /** Czy notatki (np. „+23/min”) mieszczą się obok wartości. */
  notes: boolean;
}

type ToastKind = 'ok' | 'error' | 'info';

const RICHNESS_ROWS: readonly [YieldId, string, number][] = [
  ['metal', 'Metal', COLORS.stoneHex],
  ['crystal', 'Kryształy', COLORS.tealHex],
  ['energy', 'Energia', COLORS.goldHex],
];

const YIELD_NAMES: Record<YieldId, string> = { metal: 'metal', crystal: 'kryształy', energy: 'energia' };

const DOCK_LABELS: Record<DockItemId, string> = {
  production: 'Produkcja',
  research: 'Badania',
  map: 'Mapa',
  empire: 'Imperium',
  planet: 'Planeta',
  ai: 'SI',
};

const PANEL_TITLES: Record<PanelId, string> = { production: 'PRODUKCJA', planet: 'PLANETA', ai: 'SI MATKA' };

/** HUD gry. Współrzędne liczone w punktach CSS, rysowane w pikselach urządzenia (px()). */
export class PlanetScene extends Phaser.Scene {
  private readonly deps: SceneDeps;
  private ui: Phaser.GameObjects.Container | undefined;
  private overlay: Phaser.GameObjects.Container | undefined;
  private toast: Phaser.GameObjects.Container | undefined;
  private cards: BuildingCard[] = [];
  private res: ResourceTexts | undefined;
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
    const apply = (events: GestureEvent[]) => {
      for (const e of events) {
        if (e.type === 'drag-start') display.beginDrag();
        else if (e.type === 'drag') display.drag(e.dx / this.dpr, e.dy / this.dpr);
        else if (e.type === 'drag-end') display.endDrag();
        else if (e.type === 'zoom') display.setZoom(e.zoom);
        else this.onPlanetTap(e.x, e.y);
      }
    };
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

    controller.onPlanetChange(() => {
      display.setPlanet(controller.planet);
      display.setStructures(controller.economy.levels);
      this.selected = null;
      this.relayout();
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
        'Poprzednie uruchomienie się nie powiodło — gra działa na planecie 2D. Szczegóły: Ustawienia → Diagnostyka.',
        'info',
        6000,
      );
    } else if (
      controller.offlineGain ||
      controller.completedWhileAway ||
      controller.researchedWhileAway.length > 0 ||
      controller.arrivedWhileAway.length > 0
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
      this.showToast(lines.join('\n'), 'info', 5000);
      controller.offlineGain = null;
      controller.completedWhileAway = null;
      controller.researchedWhileAway = [];
      controller.arrivedWhileAway = [];
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
    this.refreshTimer -= delta;
    if (this.refreshTimer > 0) return;
    this.refreshTimer = 250;
    this.deps.controller.tick();
    this.refreshValues();
  }

  /** `animate` — planeta płynnie przechodzi do nowego miejsca (zwijanie/rozwijanie paneli). */
  relayout(animate = false): void {
    const viewport = this.deps.getViewport();
    this.dpr = viewport.dpr;
    this.gestures.tapSlop = 12 * viewport.dpr;
    const layout = computeLayout(viewport.width, viewport.height, viewport.safe, BALANCE.buildings.length, this.panels, this.deps.controller.aiUnlocked ? AI_RULES.length : 0);
    this.layoutState = layout;
    this.deps.display.resize(viewport.width, viewport.height);
    this.moveFocus(layout.planet, animate);
    this.ui?.destroy(true);
    this.ui = this.add.container(0, 0);
    this.cards = [];
    this.dockProgress = null;
    this.aiPanelShape = '';
    this.buildTopBar(layout);
    this.buildPanel(layout);
    this.buildSelected(layout);
    this.buildDock(layout);
    this.buildUpdateBanner(layout);
    this.aiBubble = null;
    this.refreshValues();
    if (this.overlay) this.children.bringToTop(this.overlay);
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

  /** Mały przycisk-ikona (44 × 44 pt): zamknij / menu „hamburger”. */
  private iconButton(rect: Rect, kind: 'close' | 'menu', onTap: () => void): void {
    const g = this.add.graphics();
    const cx = this.px(rect.x + rect.w / 2);
    const cy = this.px(rect.y + rect.h / 2);
    const box = this.px(this.s(26));
    g.lineStyle(this.px(1), COLORS.panelBorder, 1).strokeRoundedRect(cx - box / 2, cy - box / 2, box, box, this.px(6));
    g.lineStyle(this.px(1.6), COLORS.tealHex, 1);
    const half = this.px(this.s(6.5));
    if (kind === 'menu') {
      for (const dy of [-1, 0, 1]) g.lineBetween(cx - half, cy + dy * this.px(this.s(4.5)), cx + half, cy + dy * this.px(this.s(4.5)));
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

  private icon(kind: YieldId | 'storage' | 'antimatter' | 'research', x: number, y: number, size: number): void {
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
    const colW = (bar.w - titleW - this.s(8)) / 4;
    const notes = colW >= 120;
    const valueSize = bar.w < 420 ? 14 : 17;
    const column = (index: number, kind: YieldId | 'antimatter', label: string) => {
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
    const fill = this.add.graphics();
    this.ui!.add(fill);
    this.res = {
      fill,
      fillBars: { metal: metal.fillBar, crystal: crystal.fillBar },
      metal: metal.value,
      metalRate: metal.note,
      crystal: crystal.value,
      crystalRate: crystal.note,
      energy: energy.value,
      energyNote: energy.note,
      antimatter: antimatter.value,
      antimatterNote: antimatter.note,
      notes,
    };
  }

  /** Dolny pasek: menu, przyciski paneli i ekranów (otwarty panel podświetlony). */
  private buildDock(layout: Layout): void {
    const { rect, menu, items } = layout.dock;
    this.panel(rect);
    this.iconButton(menu, 'menu', () => this.openMenu());
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
    else this.buildAiPanel(panel.body);
  }

  /** Menu (przycisk z trzema kreskami): wszystkie przyciski paska i ustawienia. */
  private openMenu(): void {
    if (this.overlay) return;
    const layout = this.layoutState!;
    const viewport = this.deps.getViewport();
    const shade = this.add.rectangle(0, 0, this.px(viewport.width), this.px(viewport.height), 0x000000, 0.35).setOrigin(0).setInteractive();
    shade.on('pointerup', () => this.closeOverlay());
    const entries: [string, () => void][] = [
      ...DOCK_ORDER.map((id): [string, () => void] => [DOCK_LABELS[id], () => (this.closeOverlay(), this.openDockItem(id))]),
      ['Ustawienia', () => (this.closeOverlay(), this.openSettings())],
    ];
    const pad = this.s(10);
    const gap = this.s(6);
    const w = Math.min(this.s(240), viewport.width - 2 * this.s(10));
    const h = 2 * pad + entries.length * TOUCH + (entries.length - 1) * gap;
    const x = layout.dock.rect.x;
    const y = Math.max(layout.topBar.y, layout.dock.rect.y - this.s(8) - h);
    const box = this.add
      .graphics()
      .fillStyle(COLORS.panel, 0.98)
      .fillRoundedRect(0, 0, this.px(w), this.px(h), this.px(this.s(14)))
      .lineStyle(this.px(1), COLORS.goldHex, 0.6)
      .strokeRoundedRect(0, 0, this.px(w), this.px(h), this.px(this.s(14)));
    const blocker = this.add.zone(0, 0, this.px(w), this.px(h)).setOrigin(0).setInteractive();
    const buttons = entries.map(([label, onTap], i) =>
      new Button(this, this.px(pad), this.px(pad + i * (TOUCH + gap)), this.px(w - 2 * pad), this.px(TOUCH), label, this.dpr, onTap, this.s(14)).setStyle(
        'secondary',
      ),
    );
    const dialog = this.add.container(this.px(x), this.px(y), [box, blocker, ...buttons]);
    this.overlay = this.add.container(0, 0, [shade, dialog]).setDepth(100);
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
    y += this.s(24);
    this.text(box.x + pad, y, 'ZŁOŻA', 9.5, COLORS.muted, { fontStyle: '600' });
    y += this.s(15);
    for (const [id, label, color] of RICHNESS_ROWS) {
      this.richnessBar(box.x + pad, y, w, label, g.richness[id], color);
      y += this.s(26);
    }
    y += this.s(4);
    this.text(box.x + pad, y, 'ŚRODOWISKO', 9.5, COLORS.muted, { fontStyle: '600' });
    y += this.s(14);
    this.text(box.x + pad, y, g.environment.label, 13.5, COLORS.text, { fontStyle: '600' });
    y += this.s(19);
    this.text(box.x + pad, y, `${g.environment.description}\n${effects}`, 11, COLORS.muted, {
      wordWrap: { width: this.px(w) },
      lineSpacing: this.px(2),
    });
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
    const narrow = card.w < 150;
    const pad = this.s(narrow ? 8 : 10);
    this.icon(def.produces, card.x + pad + this.s(5), card.y + pad + this.s(8), 5.5);
    const level = this.text(card.x + card.w - pad, card.y + pad, 'poz. 00', 11, COLORS.gold, { fontStyle: '600' }).setOrigin(1, 0);
    // Nazwa zawija się przed etykietą poziomu, zamiast na nią nachodzić.
    const levelSpace = narrow ? 0 : level.width / this.dpr + this.s(6);
    const title = this.text(card.x + pad + this.s(16), card.y + pad, def.name, narrow ? 12 : 13, COLORS.text, {
      fontStyle: '600',
      wordWrap: { width: this.px(card.w - 2 * pad - this.s(16) - levelSpace) },
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
    this.cards.push({ id: def.id, level, effect, cost, button, finish, extra, buttons, progress, bar });
  }

  /** Dotknięcie planety: od przybliżenia PICK_ZOOM wybiera budowlę (okienko z „Ulepsz”). */
  private onPlanetTap(x: number, y: number): void {
    const id = this.deps.display.pickStructure(x / this.dpr, y / this.dpr);
    if (this.gestures.zoom < PICK_ZOOM) {
      if (id) this.showToast('Przybliż planetę dwoma palcami, żeby wybrać budynek.', 'info', 2600);
      return;
    }
    if (id === this.selected) return;
    // Dotknięcie obok budowli zamyka okienko.
    this.selected = id;
    this.relayout();
  }

  /** Okienko wybranego budynku nad dolnym paskiem (w wolnym miejscu obok panelu). */
  private buildSelected(layout: Layout): void {
    const def = this.selected && BALANCE.buildings.find((b) => b.id === this.selected);
    if (!def) return;
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
    const result = controller.upgrade(id);
    this.showToast(result.message, result.ok ? 'ok' : 'error');
    this.refreshValues();
    if (result.ok) this.deps.display.showBuilding(id);
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
    const controller = this.deps.controller;
    const rates = controller.rates;
    const now = Date.now();
    this.refreshAiBubble();
    const construction = controller.economy.construction;
    const progress = controller.buildProgress(now);
    this.deps.display.setStructures(
      controller.economy.levels,
      construction ? { building: construction.building, targetLevel: construction.targetLevel, progress } : null,
    );
    if (this.layoutState?.panel?.id === 'ai' && this.aiShape() !== this.aiPanelShape) {
      this.relayout();
      return;
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
      pair(this.res.metal, this.res.metalRate, formatInt(stock.metal), rateNote(stock.metal, rates.metal));
      pair(this.res.crystal, this.res.crystalRate, formatInt(stock.crystal), rateNote(stock.crystal, rates.crystal));
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
      pair(this.res.antimatter, this.res.antimatterNote, formatInt(controller.economy.antimatter), `+${formatRate(rates.antimatterPerHour)}/h`);
      this.res.antimatterNote.setColor(COLORS.antimatter);
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
      } else {
        const richness = controller.planet.gameplay.richness[def.produces];
        const env = environmentEffect(controller.planet, def.produces, balance);
        const gain = (scaled(def.baseOutput, level + 1, growth) - scaled(def.baseOutput, level, growth)) * richness * env;
        const unit = def.produces === 'energy' ? 'energii' : def.produces === 'metal' ? 'metalu/min' : 'kryształów/min';
        card.effect.setText(`Na poz. ${level + 1}: +${formatRate(gain)} ${unit}${energyNext}`);
      }
      card.effect.setColor(def.produces === 'research' && controller.research.current ? COLORS.gold : COLORS.teal);
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
      if (construction) {
        card.button.setText(short ? 'Trwa budowa' : 'Trwa inna budowa').setStyle('disabled');
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
      .setAlpha(0);
    this.toast = toast;
    this.tweens.add({ targets: toast, alpha: 1, duration: 150 });
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
          ? 'Planeta 2D — poprzednie uruchomienie się nie powiodło. Skopiuj diagnostykę i prześlij ją.'
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
    const diag = new Button(this, pad + halfW + gap, y, halfW, buttonH, 'Diagnostyka', this.dpr, () => this.copyDiagnostics(), this.s(15)).setStyle(
      'secondary',
    );
    y += buttonH + gap * 1.5;
    const version = this.add.text(pad, y + (buttonH - this.px(this.s(16))) / 2, `Planet Forge ${this.deps.appVersion}`, font(12, COLORS.faint, { fontFamily: FONTS.mono }));
    const closeBtn = new Button(this, w - pad - halfW, y, halfW, buttonH, 'Zamknij', this.dpr, () => this.closeOverlay(), this.s(15)).setStyle(
      'primary',
    );
    y += buttonH + pad;
    items.push(title, saveLabel, saveHint, copy, load, gfxLabel, gfxHint, toggle, diag, version, closeBtn);

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

  private copyDiagnostics(): void {
    const text = this.deps.graphics.diagnostics();
    const fallback = () =>
      openTextPanel({ title: 'Diagnostyka', hint: 'Zaznacz cały tekst, skopiuj i wklej w rozmowie.', text, readOnly: true });
    try {
      navigator.clipboard
        .writeText(text)
        .then(() => this.showToast('Diagnostyka skopiowana — wklej ją w rozmowie.', 'ok', 3500))
        .catch(fallback);
    } catch {
      fallback();
    }
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
