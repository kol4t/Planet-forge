import Phaser from 'phaser';
import type { GameController } from '../../app/GameController.ts';
import { createRng } from '../../core/random/rng.ts';
import { Button, type ButtonStyle } from '../ui/Button.ts';
import { GestureTracker, type GestureEvent } from '../ui/gestures.ts';
import { TOUCH, type Rect } from '../ui/layout.ts';
import { COLORS, FONTS } from '../ui/theme.ts';
import type { Viewport } from './PlanetScene.ts';

export interface OverlaySceneDeps {
  controller: GameController;
  getViewport: () => Viewport;
}

/** Zdarzenie gry: ekran pełnoekranowy (Badania, Mapa) zamknięty — HUD planety odzyskuje dotyk. */
export const OVERLAY_CLOSED = 'overlay-closed';

/** Ruch palca (pt), poniżej którego dotknięcie jest „stuknięciem”, a nie przesunięciem. */
const TAP_SLOP = 10;

/** Ramka ekranu: pasek u góry, obszar mapy i panel szczegółów (po prawej albo na dole). */
export interface OverlayFrame {
  bar: Rect;
  width: number;
  height: number;
}

/**
 * Wspólna podstawa ekranów pełnoekranowych nad HUD-em planety (Badania, Mapa):
 * gwiaździste tło, mapa przesuwana palcem i przybliżana dwoma, stuknięcie, panele, przyciski, komunikaty.
 */
export abstract class OverlayScene extends Phaser.Scene {
  protected readonly deps: OverlaySceneDeps;
  protected dpr = 1;
  protected u = 1;
  protected ui: Phaser.GameObjects.Container | undefined;
  protected area: Rect = { x: 0, y: 0, w: 1, h: 1 };
  protected panelRect: Rect = { x: 0, y: 0, w: 1, h: 1 };
  protected pan = { x: 0, y: 0 };
  protected zoom = 1;
  /** Mapę można przesuwać i przybliżać (np. widok układu — nie). */
  protected panZoom = true;
  protected readonly gestures: GestureTracker;
  private toast: Phaser.GameObjects.Container | undefined;
  private backdrop: Phaser.GameObjects.Graphics | undefined;
  /** Palce na mapie i kandydat na „stuknięcie” (unieważniany ruchem albo drugim palcem). */
  private readonly fingers = new Set<number>();
  private tap: { id: number; x: number; y: number; valid: boolean } | null = null;
  private refreshTimer = 0;

  constructor(key: string, deps: OverlaySceneDeps, zoom: { min: number; max: number }) {
    super({ key });
    this.deps = deps;
    this.gestures = new GestureTracker(zoom.min, zoom.max);
  }

  /** Stuknięcie w mapę (px urządzenia). */
  protected abstract onTap(px: number, py: number): void;
  /** Mapa przesunięta albo przybliżona. */
  protected abstract applyTransform(): void;
  /** Odświeżenie stanu (co 250 ms). */
  protected abstract refresh(): void;
  abstract relayout(): void;

  update(_time: number, delta: number): void {
    this.refreshTimer -= delta;
    if (this.refreshTimer > 0) return;
    this.refreshTimer = 250;
    this.refresh();
  }

  /** Gesty na mapie (poza panelami). Wywołaj raz w `create`. */
  protected setupInput(): void {
    this.zoom = 1;
    this.pan = { x: 0, y: 0 };
    this.gestures.zoom = 1;
    const apply = (events: GestureEvent[]) => {
      if (!this.panZoom) return;
      for (const e of events) {
        if (e.type === 'drag') {
          this.pan.x += e.dx;
          this.pan.y += e.dy;
          this.applyTransform();
        } else if (e.type === 'zoom') {
          // Przybliżenie wokół środka mapy.
          const ratio = e.zoom / this.zoom;
          this.zoom = e.zoom;
          this.pan.x *= ratio;
          this.pan.y *= ratio;
          this.applyTransform();
        }
      }
    };
    this.input.on('pointerdown', (pointer: Phaser.Input.Pointer, over: Phaser.GameObjects.GameObject[]) => {
      if (over.length > 0) return;
      this.fingers.add(pointer.id);
      if (this.fingers.size === 1) this.tap = { id: pointer.id, x: pointer.x, y: pointer.y, valid: true };
      else if (this.tap) this.tap.valid = false;
      apply(this.gestures.down(pointer.id, pointer.x, pointer.y));
    });
    this.input.on('pointermove', (pointer: Phaser.Input.Pointer) => {
      const tap = this.tap;
      if (tap?.id === pointer.id && Math.hypot(pointer.x - tap.x, pointer.y - tap.y) > TAP_SLOP * this.dpr) tap.valid = false;
      apply(this.gestures.move(pointer.id, pointer.x, pointer.y));
    });
    const release = (pointer: Phaser.Input.Pointer) => {
      apply(this.gestures.up(pointer.id));
      if (!this.fingers.delete(pointer.id)) return;
      const tap = this.tap;
      if (tap?.id === pointer.id && tap.valid) this.onTap(pointer.x, pointer.y);
      if (tap?.id === pointer.id || this.fingers.size === 0) this.tap = null;
    };
    this.input.on('pointerup', release);
    this.input.on('pointerupoutside', release);
    this.input.on('gameout', () => {
      apply(this.gestures.cancel());
      this.fingers.clear();
      this.tap = null;
    });
    this.input.on('wheel', (_p: Phaser.Input.Pointer, over: Phaser.GameObjects.GameObject[], _dx: number, dy: number) => {
      if (over.length === 0) apply(this.gestures.wheel(dy));
    });
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      this.gestures.cancel();
      this.fingers.clear();
      this.tap = null;
    });
  }

  /** Mapa wraca do środka i bez przybliżenia. */
  protected resetView(): void {
    this.zoom = 1;
    this.pan = { x: 0, y: 0 };
    this.gestures.cancel();
    this.gestures.zoom = 1;
  }

  /**
   * Ramka ekranu: pasek u góry, panel szczegółów (szeroki ekran — po prawej, wąski — na dole)
   * i obszar mapy. Czyści poprzedni widok i rysuje tło.
   */
  protected frame(narrowPanelH: number, phonePanelH: number): OverlayFrame {
    const viewport = this.deps.getViewport();
    this.dpr = viewport.dpr;
    const { width, height, safe } = viewport;
    this.u = Math.min(1.1, Math.max(0.8, Math.min(width, height) / 880));
    const gap = Math.round(10 * this.u);
    const left = safe.left + gap;
    const right = width - safe.right - gap;
    const top = safe.top + gap;
    const bottom = height - safe.bottom - gap;
    const bar: Rect = { x: left, y: top, w: right - left, h: Math.round(54 * this.u) };
    const contentTop = bar.y + bar.h + gap;
    const wide = width / height >= 1.15 && width >= 700;
    if (wide) {
      const w = Math.min(340 * this.u, (right - left) * 0.36);
      this.panelRect = { x: right - w, y: contentTop, w, h: bottom - contentTop };
      this.area = { x: left, y: contentTop, w: right - left - w - gap, h: bottom - contentTop };
    } else {
      const h = Math.round((width < 520 ? phonePanelH : narrowPanelH) * this.u);
      this.panelRect = { x: left, y: bottom - h, w: right - left, h };
      this.area = { x: left, y: contentTop, w: right - left, h: bottom - h - gap - contentTop };
    }
    this.ui?.destroy(true);
    this.backdrop?.destroy();
    this.cameras.main.setBackgroundColor('#04080a');
    const rng = createRng('badania-gwiazdy');
    const g = this.add.graphics();
    for (let i = 0; i < 160; i++) {
      const size = rng.range(0.5, 1.4) * this.dpr;
      g.fillStyle(0xdfe7e1, rng.range(0.15, 0.55)).fillRect(rng.range(0, this.px(width)), rng.range(0, this.px(height)), size, size);
    }
    this.backdrop = g;
    return { bar, width, height };
  }

  /** Pojemnik UI nad mapą (panele, przyciski). Wywołaj po narysowaniu mapy. */
  protected beginUi(): void {
    this.ui = this.add.container(0, 0).setDepth(10);
  }

  /** `message` — komunikat do pokazania na ekranie planety (np. „Skolonizowano: …”). */
  protected close(message?: string): void {
    this.game.events.emit(OVERLAY_CLOSED, message);
    this.scene.stop();
  }

  // ——— pomocnicze ———

  protected px(v: number): number {
    return Math.round(v * this.dpr);
  }

  protected s(v: number): number {
    return v * this.u;
  }

  protected text(
    x: number,
    y: number,
    content: string,
    size: number,
    color: string,
    style: Phaser.Types.GameObjects.Text.TextStyle = {},
    toUi = true,
  ): Phaser.GameObjects.Text {
    const t = this.add.text(this.px(x), this.px(y), content, {
      fontFamily: FONTS.body,
      fontSize: `${this.px(this.s(size))}px`,
      color,
      ...style,
    });
    if (toUi) this.ui!.add(t);
    return t;
  }

  /** Panel z tłem i strefą blokującą gesty mapy. */
  protected panel(rect: Rect): void {
    const g = this.add.graphics();
    const radius = this.px(this.s(14));
    const [x, y, w, h] = [this.px(rect.x), this.px(rect.y), this.px(rect.w), this.px(rect.h)];
    g.fillStyle(COLORS.panel, 0.94).fillRoundedRect(x, y, w, h, radius);
    g.lineStyle(this.px(1), COLORS.panelBorder, 1).strokeRoundedRect(x, y, w, h, radius);
    const blocker = this.add.zone(x, y, w, h).setOrigin(0).setInteractive();
    this.ui!.add([g, blocker]);
  }

  /** Przycisk 44 pt wysokości (nie dodany do UI — np. do panelu szczegółów). */
  protected button(x: number, y: number, w: number, label: string, style: ButtonStyle, onTap: () => void): Button {
    return new Button(this, this.px(x), this.px(y), this.px(w), this.px(TOUCH), label, this.dpr, onTap, this.s(14)).setStyle(style);
  }

  protected addButton(x: number, y: number, w: number, h: number, label: string, style: ButtonStyle, onTap: () => void): Button {
    const button = new Button(this, this.px(x), this.px(y), this.px(w), this.px(h), label, this.dpr, onTap, this.s(14)).setStyle(style);
    this.ui!.add(button);
    return button;
  }

  protected showToast(message: string, kind: 'ok' | 'error' | 'info', duration = 2400): void {
    this.toast?.destroy(true);
    const label = this.add
      .text(0, 0, message, {
        fontFamily: FONTS.body,
        fontSize: `${this.px(this.s(13.5))}px`,
        fontStyle: '600',
        color: kind === 'error' ? COLORS.danger : kind === 'ok' ? COLORS.teal : COLORS.text,
        align: 'center',
        wordWrap: { width: this.px(Math.min(this.area.w - 24, 480)) },
      })
      .setOrigin(0.5);
    const w = label.width + this.px(this.s(32));
    const h = label.height + this.px(this.s(18));
    const bg = this.add
      .graphics()
      .fillStyle(COLORS.panel, 0.95)
      .fillRoundedRect(-w / 2, -h / 2, w, h, h / 2)
      .lineStyle(this.px(1), kind === 'error' ? COLORS.dangerHex : COLORS.tealHex, 0.7)
      .strokeRoundedRect(-w / 2, -h / 2, w, h, h / 2);
    const toast = this.add
      .container(this.px(this.area.x + this.area.w / 2), this.px(this.area.y + this.area.h) - h / 2 - this.px(this.s(10)), [bg, label])
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
}
