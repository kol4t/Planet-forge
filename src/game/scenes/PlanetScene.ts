import Phaser from 'phaser';
import type { GameController } from '../../app/GameController.ts';
import { buildSeconds, capacityAtLevel, fitsInStorage, scaled } from '../../core/economy/economy.ts';
import type { BuildingId, YieldId } from '../../core/types.ts';
import { BALANCE } from '../../data/balance.ts';
import type { PlanetDisplay } from '../../planet-renderer/PlanetDisplay.ts';
import { Button, type ButtonStyle } from '../ui/Button.ts';
import { computeLayout, type Insets, type Layout, type Rect } from '../ui/layout.ts';
import { COLORS, FONTS, formatDuration, formatInt, formatRate } from '../ui/theme.ts';

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
}

interface BuildingCard {
  id: BuildingId;
  level: Phaser.GameObjects.Text;
  effect: Phaser.GameObjects.Text;
  cost: Phaser.GameObjects.Text;
  button: Button;
  /** „Ukończ teraz” — widoczny obok „Anuluj” podczas budowy (za darmo do poz. z balansu). */
  finish: Button;
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
}

type ToastKind = 'ok' | 'error' | 'info';

const RICHNESS_ROWS: readonly [YieldId, string, number][] = [
  ['metal', 'Metal', COLORS.stoneHex],
  ['crystal', 'Kryształy', COLORS.tealHex],
  ['energy', 'Energia', COLORS.goldHex],
];

const YIELD_NAMES: Record<YieldId, string> = { metal: 'metal', crystal: 'kryształy', energy: 'energia' };

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
  private dragPointer: number | null = null;
  private lastPointer = { x: 0, y: 0 };
  private refreshTimer = 0;
  private cancelArmedUntil = 0;

  constructor(deps: SceneDeps) {
    super({ key: 'planet' });
    this.deps = deps;
  }

  create(): void {
    const { controller, display } = this.deps;
    this.relayout();

    // Gest obrotu startuje tylko poza panelami (panele mają strefy blokujące).
    this.input.on('pointerdown', (pointer: Phaser.Input.Pointer, over: Phaser.GameObjects.GameObject[]) => {
      if (over.length > 0 || this.dragPointer !== null || this.overlay) return;
      this.dragPointer = pointer.id;
      this.lastPointer = { x: pointer.x, y: pointer.y };
      display.beginDrag();
    });
    this.input.on('pointermove', (pointer: Phaser.Input.Pointer) => {
      if (pointer.id !== this.dragPointer) return;
      display.drag((pointer.x - this.lastPointer.x) / this.dpr, (pointer.y - this.lastPointer.y) / this.dpr);
      this.lastPointer = { x: pointer.x, y: pointer.y };
    });
    const release = (pointer: Phaser.Input.Pointer) => {
      if (pointer.id !== this.dragPointer) return;
      this.dragPointer = null;
      display.endDrag();
    };
    this.input.on('pointerup', release);
    this.input.on('pointerupoutside', release);
    this.input.on('gameout', () => {
      if (this.dragPointer === null) return;
      this.dragPointer = null;
      display.endDrag();
    });

    controller.onPlanetChange(() => {
      display.setPlanet(controller.planet);
      display.setStructures(controller.economy.levels);
      this.relayout();
    });

    controller.onBuildComplete((done) => {
      const name = BALANCE.buildings.find((b) => b.id === done.building)?.name ?? 'Budynek';
      this.showToast(`${name} — poziom ${done.level} gotowy.`, 'ok', 3000);
      this.refreshValues();
      display.showBuilding(done.building);
    });

    if (controller.offlineGain || controller.completedWhileAway) {
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
      this.showToast(lines.join('\n'), 'info', 5000);
      controller.offlineGain = null;
      controller.completedWhileAway = null;
    }
  }

  update(_time: number, delta: number): void {
    this.refreshTimer -= delta;
    if (this.refreshTimer > 0) return;
    this.refreshTimer = 250;
    this.deps.controller.tick();
    this.refreshValues();
  }

  relayout(): void {
    const viewport = this.deps.getViewport();
    this.dpr = viewport.dpr;
    const layout = computeLayout(viewport.width, viewport.height, viewport.safe);
    this.layoutState = layout;
    this.deps.display.resize(viewport.width, viewport.height);
    this.deps.display.setFocus(layout.planet.cx, layout.planet.cy, layout.planet.r);
    this.ui?.destroy(true);
    this.ui = this.add.container(0, 0);
    this.cards = [];
    this.buildTopBar(layout);
    this.buildInfo(layout);
    this.buildBuildings(layout);
    this.refreshValues();
    if (this.overlay) this.children.bringToTop(this.overlay);
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

  private icon(kind: YieldId | 'storage', x: number, y: number, size: number): void {
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
    const titleW = showTitle ? this.s(170) : 0;
    if (showTitle) {
      this.text(bar.x + this.s(18), bar.y + bar.h / 2, 'PLANET FORGE', 15, COLORS.gold, {
        fontFamily: FONTS.serif,
        letterSpacing: 3,
      }).setOrigin(0, 0.5);
    }
    const colW = (bar.w - titleW - this.s(8)) / 3;
    const valueSize = bar.w < 420 ? 15 : 19;
    const column = (index: number, kind: YieldId, label: string) => {
      const x = bar.x + titleW + this.s(8) + index * colW;
      if (index > 0 || showTitle) {
        const divider = this.add
          .graphics()
          .fillStyle(COLORS.divider, 1)
          .fillRect(this.px(x), this.px(bar.y + this.s(12)), this.px(1), this.px(bar.h - this.s(24)));
        this.ui!.add(divider);
      }
      this.icon(kind, x + this.s(20), bar.y + bar.h / 2, 7);
      const tx = x + this.s(36);
      this.text(tx, bar.y + this.s(9), label, 10.5, COLORS.muted, { fontStyle: '600' });
      const value = this.text(tx, bar.y + this.s(22), '0', valueSize, COLORS.text, { fontStyle: '600' });
      const note = this.text(tx, bar.y + this.s(22), '', 11, COLORS.teal);
      const fillBar = { x: tx, y: bar.y + bar.h - this.s(9), w: Math.max(20, colW - this.s(36) - this.s(14)) };
      return { value, note, fillBar };
    };
    const metal = column(0, 'metal', 'METAL');
    const crystal = column(1, 'crystal', 'KRYSZTAŁY');
    const energy = column(2, 'energy', 'ENERGIA');
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
    };
  }

  private buildInfo(layout: Layout): void {
    const box = layout.info;
    const { planet } = this.deps.controller;
    const g = planet.gameplay;
    this.panel(box, true);
    const pad = this.s(16);
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
    const buttonH = Math.max(44, this.s(44));

    if (layout.mode === 'landscape') {
      let y = box.y + pad;
      this.text(box.x + pad, y, 'PLANETA', 10.5, COLORS.muted, { fontStyle: '600' });
      y += this.s(16);
      this.text(box.x + pad, y, planet.displayName, 26, COLORS.gold, { fontFamily: FONTS.serif });
      y += this.s(36);
      this.text(box.x + pad, y, planet.category, 13, COLORS.stone);
      y += this.s(22);
      this.text(box.x + pad, y, `seed  ${planet.seed}`, 12, COLORS.faint, { fontFamily: FONTS.mono });
      y += this.s(30);
      this.text(box.x + pad, y, 'Klasa', 12.5, COLORS.muted);
      this.text(box.x + box.w - pad, y, `${g.sizeClass.label} · ${formatInt(g.radiusKm)} km`, 13.5, COLORS.text, {
        fontStyle: '600',
      }).setOrigin(1, 0);
      y += this.s(28);
      this.text(box.x + pad, y, 'ZŁOŻA', 10.5, COLORS.muted, { fontStyle: '600' });
      y += this.s(18);
      for (const [id, label, color] of RICHNESS_ROWS) {
        this.richnessBar(box.x + pad, y, box.w - 2 * pad, label, g.richness[id], color);
        y += this.s(30);
      }
      y += this.s(4);
      this.text(box.x + pad, y, 'ŚRODOWISKO', 10.5, COLORS.muted, { fontStyle: '600' });
      y += this.s(17);
      this.text(box.x + pad, y, g.environment.label, 15, COLORS.text, { fontStyle: '600' });
      y += this.s(21);
      this.text(box.x + pad, y, `${g.environment.description}\n${effects}`, 12, COLORS.muted, {
        wordWrap: { width: this.px(box.w - 2 * pad) },
        lineSpacing: this.px(3),
      });
      this.addButton(box.x + pad, box.y + box.h - pad - buttonH, box.w - 2 * pad, buttonH, 'Nowa planeta', 'secondary', () =>
        this.confirmNewPlanet(),
      );
    } else {
      const colW = (box.w - 3 * pad) / 2;
      let y = box.y + this.s(12);
      this.text(box.x + pad, y, planet.displayName, 22, COLORS.gold, { fontFamily: FONTS.serif });
      y += this.s(30);
      this.text(box.x + pad, y, `${g.sizeClass.label} · ${formatInt(g.radiusKm)} km`, 12, COLORS.stone);
      y += this.s(18);
      this.text(box.x + pad, y, planet.category, 11, COLORS.faint, {
        wordWrap: { width: this.px(colW) },
      });
      const btnW = Math.min(colW, this.s(150));
      const btnH = Math.max(36, this.s(32));
      this.addButton(box.x + pad, box.y + box.h - this.s(10) - btnH, btnW, btnH, 'Nowa planeta', 'secondary', () => this.confirmNewPlanet(), 13);
      const x2 = box.x + 2 * pad + colW;
      let y2 = box.y + this.s(12);
      this.text(x2, y2, g.environment.label, 14, COLORS.text, { fontStyle: '600' });
      y2 += this.s(19);
      this.text(x2, y2, effects, 11.5, COLORS.muted, { wordWrap: { width: this.px(colW) } });
      y2 += this.s(22);
      for (const [id, label, color] of RICHNESS_ROWS) {
        this.richnessBar(x2, y2, colW, label, g.richness[id], color, true);
        y2 += this.s(20);
      }
    }
  }

  private richnessBar(x: number, y: number, w: number, label: string, value: number, color: number, compact = false): void {
    this.text(x, y, label, compact ? 11 : 12, COLORS.muted);
    this.text(x + w, y, `${Math.round(value * 100)}%`, compact ? 11 : 12, COLORS.text, { fontStyle: '600' }).setOrigin(1, 0);
    const barY = y + this.s(compact ? 14 : 17);
    const fill = Math.min(1, value / 1.5);
    const g = this.add.graphics();
    g.fillStyle(COLORS.divider, 1).fillRoundedRect(this.px(x), this.px(barY), this.px(w), this.px(this.s(4)), this.px(2));
    g.fillStyle(color, 0.9).fillRoundedRect(this.px(x), this.px(barY), this.px(w * fill), this.px(this.s(4)), this.px(2));
    this.ui!.add(g);
  }

  private buildBuildings(layout: Layout): void {
    const area = layout.buildings;
    const gap = this.s(10);
    const count = BALANCE.buildings.length;
    const cols = layout.cardColumns;
    const rows = Math.ceil(count / cols);
    const cardW = (area.w - gap * (cols - 1)) / cols;
    const cardH = (area.h - gap * (rows - 1)) / rows;
    BALANCE.buildings.forEach((def, index) => {
      const col = index % cols;
      const row = Math.floor(index / cols);
      const card: Rect = { x: area.x + col * (cardW + gap), y: area.y + row * (cardH + gap), w: cardW, h: cardH };
      this.panel(card);
      const narrow = card.w < 150;
      const pad = this.s(narrow ? 10 : 14);
      this.icon(def.produces, card.x + pad + this.s(6), card.y + pad + this.s(9), 6);
      const level = this.text(card.x + card.w - pad, card.y + pad, 'poz. 00', 12, COLORS.gold, { fontStyle: '600' }).setOrigin(1, 0);
      // Nazwa zawija się przed etykietą poziomu, zamiast na nią nachodzić.
      const levelSpace = narrow ? 0 : level.width / this.dpr + this.s(6);
      const title = this.text(card.x + pad + this.s(18), card.y + pad, def.name, narrow ? 12.5 : 14.5, COLORS.text, {
        fontStyle: '600',
        wordWrap: { width: this.px(card.w - 2 * pad - this.s(18) - levelSpace) },
      });
      const textTop = Math.max(narrow ? this.s(40) : this.s(26), title.height / this.dpr + this.s(5));
      const effect = this.text(card.x + pad, card.y + pad + textTop, '', narrow ? 11 : 12, COLORS.teal, {
        wordWrap: { width: this.px(card.w - 2 * pad) },
      });
      const cost = this.text(card.x + pad, card.y + pad + textTop + this.s(narrow ? 32 : 20), '', narrow ? 11 : 12, COLORS.muted, {
        wordWrap: { width: this.px(card.w - 2 * pad) },
      });
      const buttonH = Math.max(44, this.s(40));
      const bar = { x: card.x + pad, y: card.y + card.h - pad - buttonH - this.s(9), w: card.w - 2 * pad };
      const progress = this.add.graphics();
      this.ui!.add(progress);
      const button = this.addButton(
        card.x + pad,
        card.y + card.h - pad - buttonH,
        card.w - 2 * pad,
        buttonH,
        'Ulepsz',
        'primary',
        () => this.onUpgrade(def.id),
        narrow ? 13 : 14,
      );
      const finish = this.addButton(
        card.x + pad,
        card.y + card.h - pad - buttonH,
        (card.w - 2 * pad) / 2,
        buttonH,
        'Ukończ',
        'primary',
        () => this.onFinish(),
        narrow ? 13 : 14,
      ).setShown(false);
      if (narrow) level.setVisible(false);
      const buttons = { x: this.px(card.x + pad), w: this.px(card.w - 2 * pad), gap: this.px(this.s(8)) };
      this.cards.push({ id: def.id, level, effect, cost, button, finish, buttons, progress, bar });
    });
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
    // Sukces ogłasza onBuildComplete (komunikat + pokazanie budowli).
    const result = this.deps.controller.finishNow();
    if (!result.ok) this.showToast(result.message, 'error');
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
    const construction = controller.economy.construction;
    const progress = controller.buildProgress(now);
    this.deps.display.setStructures(
      controller.economy.levels,
      construction ? { building: construction.building, targetLevel: construction.targetLevel, progress } : null,
    );

    if (this.res) {
      const pair = (value: Phaser.GameObjects.Text, note: Phaser.GameObjects.Text, v: string, n: string) => {
        value.setText(v);
        note.setText(n);
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
    }

    const growth = BALANCE.levelGrowth;
    for (const card of this.cards) {
      const def = BALANCE.buildings.find((b) => b.id === card.id)!;
      const level = controller.economy.levels[card.id];
      card.level.setText(`poz. ${level}`);
      if (def.produces === 'storage') {
        const next = capacityAtLevel(level + 1);
        card.effect.setText(`Na poz. ${level + 1}: pojemność ${formatInt(next)} (+${formatInt(next - capacityAtLevel(level))})`);
      } else {
        const richness = controller.planet.gameplay.richness[def.produces];
        const env = controller.planet.gameplay.environment.effects[def.produces] ?? 1;
        const gain = (scaled(def.baseOutput, level + 1, growth) - scaled(def.baseOutput, level, growth)) * richness * env;
        const unit = def.produces === 'energy' ? 'energii' : def.produces === 'metal' ? 'metalu/min' : 'kryształów/min';
        const energyCost =
          def.baseEnergyUse > 0
            ? ` · −${formatRate(scaled(def.baseEnergyUse, level + 1, growth) - scaled(def.baseEnergyUse, level, growth))} energii`
            : '';
        card.effect.setText(`Na poz. ${level + 1}: +${formatRate(gain)} ${unit}${energyCost}`);
      }
      card.progress.clear();
      const { x: bx, w: bw, gap: bgap } = card.buttons;
      const building = construction?.building === card.id;
      if (building) {
        // Ten budynek się buduje: odliczanie, pasek postępu, „Ukończ teraz” (do poz. 5) i anulowanie.
        const target = construction!.targetLevel;
        const free = target <= BALANCE.freeFinishMaxLevel;
        card.effect.setText(`Budowa poz. ${target} · zostało ${formatDuration(controller.buildSecondsLeft(now))}`);
        card.effect.setColor(COLORS.gold);
        card.cost.setText(free ? 'Ukończ teraz — za darmo do poz. 5.' : 'Anulowanie zwraca pełny koszt.');
        card.cost.setY(card.effect.y + card.effect.height + this.px(this.s(4)));
        this.drawProgress(card, progress);
        const armed = now <= this.cancelArmedUntil;
        const half = (bw - bgap) / 2;
        const wide = half / this.dpr >= 104;
        card.finish.setShown(free).setSpan(bx, half).setText(wide ? 'Ukończ teraz' : 'Ukończ');
        card.button
          .setSpan(free ? bx + half + bgap : bx, free ? half : bw)
          .setText(armed ? (free ? 'Na pewno?' : 'Na pewno anulować?') : free ? 'Anuluj' : 'Anuluj budowę')
          .setStyle(armed ? 'danger' : 'secondary');
        continue;
      }
      card.finish.setShown(false);
      card.button.setSpan(bx, bw);
      card.effect.setColor(COLORS.teal);
      const cost = controller.costOf(card.id);
      const time = formatDuration(buildSeconds(level + 1));
      card.cost.setText(`Koszt: ${formatInt(cost.metal)} metalu · ${formatInt(cost.crystal)} kryształów · ${time}`);
      card.cost.setY(card.effect.y + card.effect.height + this.px(this.s(4)));
      if (level >= BALANCE.maxLevel) {
        card.button.setText('Maksymalny poziom').setStyle('disabled');
        continue;
      }
      if (construction) {
        card.button.setText('Trwa inna budowa').setStyle('disabled');
        continue;
      }
      if (!fitsInStorage(controller.economy, controller.costOf(card.id))) {
        card.button.setText('Za mały magazyn').setStyle('disabled');
        continue;
      }
      const wait = controller.waitSecondsFor(card.id);
      if (wait <= 0) card.button.setText(`Ulepsz do ${level + 1}`).setStyle('primary');
      else card.button.setText(Number.isFinite(wait) ? `Dostępne za ${formatDuration(wait)}` : 'Brak produkcji').setStyle('disabled');
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
      .container(this.px(layout.planet.cx), this.px(layout.toastY), [bg, label])
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

  private confirmNewPlanet(): void {
    if (this.overlay) return;
    const viewport = this.deps.getViewport();
    const W = this.px(viewport.width);
    const H = this.px(viewport.height);
    const shade = this.add.rectangle(0, 0, W, H, 0x000000, 0.6).setOrigin(0).setInteractive();
    const w = this.px(Math.min(viewport.width - 32, this.s(420)));
    const h = this.px(this.s(220));
    const x = (W - w) / 2;
    const y = (H - h) / 2;
    const box = this.add
      .graphics()
      .fillStyle(COLORS.panel, 0.98)
      .fillRoundedRect(x, y, w, h, this.px(16))
      .lineStyle(this.px(1), COLORS.goldHex, 0.7)
      .strokeRoundedRect(x, y, w, h, this.px(16));
    const pad = this.px(this.s(20));
    const title = this.add.text(x + pad, y + pad, 'Nowa ekspedycja?', {
      fontFamily: FONTS.serif,
      fontSize: `${this.px(this.s(22))}px`,
      color: COLORS.gold,
    });
    const body = this.add.text(
      x + pad,
      y + pad + this.px(this.s(38)),
      'Zostanie wygenerowana nowa planeta z losowego seeda — także jej typ.\nObecny postęp i zasoby zostaną utracone.',
      {
        fontFamily: FONTS.body,
        fontSize: `${this.px(this.s(13.5))}px`,
        color: COLORS.muted,
        wordWrap: { width: w - 2 * pad },
        lineSpacing: this.px(4),
      },
    );
    const buttonH = this.px(Math.max(44, this.s(44)));
    const buttonW = (w - 3 * pad) / 2;
    const close = () => {
      this.overlay?.destroy(true);
      this.overlay = undefined;
    };
    const cancel = new Button(this, x + pad, y + h - pad - buttonH, buttonW, buttonH, 'Anuluj', this.dpr, close, this.s(15)).setStyle(
      'secondary',
    );
    const confirm = new Button(
      this,
      x + 2 * pad + buttonW,
      y + h - pad - buttonH,
      buttonW,
      buttonH,
      'Generuj',
      this.dpr,
      () => {
        close();
        this.deps.controller.startNewPlanet();
        const planet = this.deps.controller.planet;
        this.showToast(`Nowa planeta: ${planet.displayName} (${planet.category})`, 'ok');
      },
      this.s(15),
    ).setStyle('primary');
    this.overlay = this.add.container(0, 0, [shade, box, title, body, cancel, confirm]).setDepth(100);
  }
}
