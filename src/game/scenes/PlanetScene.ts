import Phaser from 'phaser';
import type { GameController } from '../../app/GameController.ts';
import { scaled } from '../../core/economy/economy.ts';
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
}

interface ResourceTexts {
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

    if (controller.offlineGain) {
      const gain = controller.offlineGain;
      this.showToast(
        `Podczas nieobecności (${formatDuration(gain.seconds)}): +${formatInt(gain.metal)} metalu, +${formatInt(gain.crystal)} kryształów`,
        'info',
        5000,
      );
      controller.offlineGain = null;
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

  private icon(kind: YieldId, x: number, y: number, size: number): void {
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
      return { value, note };
    };
    const metal = column(0, 'metal', 'METAL');
    const crystal = column(1, 'crystal', 'KRYSZTAŁY');
    const energy = column(2, 'energy', 'ENERGIA');
    this.res = {
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
    const row = layout.cardsDirection === 'row';
    const cardW = row ? (area.w - gap * (count - 1)) / count : area.w;
    const cardH = row ? area.h : (area.h - gap * (count - 1)) / count;
    BALANCE.buildings.forEach((def, index) => {
      const card: Rect = row
        ? { x: area.x + index * (cardW + gap), y: area.y, w: cardW, h: cardH }
        : { x: area.x, y: area.y + index * (cardH + gap), w: cardW, h: cardH };
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
      if (narrow) level.setVisible(false);
      this.cards.push({ id: def.id, level, effect, cost, button });
    });
  }

  // ——— akcje i odświeżanie ———

  private onUpgrade(id: BuildingId): void {
    const result = this.deps.controller.upgrade(id);
    this.showToast(result.message, result.ok ? 'ok' : 'error');
    if (result.ok) {
      this.deps.display.setStructures(this.deps.controller.economy.levels);
      this.deps.display.showBuilding(id);
    }
    this.refreshValues();
  }

  private refreshValues(): void {
    const controller = this.deps.controller;
    const rates = controller.rates;
    this.deps.display.setStructures(controller.economy.levels);

    if (this.res) {
      const pair = (value: Phaser.GameObjects.Text, note: Phaser.GameObjects.Text, v: string, n: string) => {
        value.setText(v);
        note.setText(n);
        note.setX(value.x + value.width + this.px(this.s(6)));
        note.setY(value.y + value.height - note.height - this.px(this.s(2)));
      };
      pair(this.res.metal, this.res.metalRate, formatInt(controller.economy.stock.metal), `+${formatRate(rates.metal)}/min`);
      pair(this.res.crystal, this.res.crystalRate, formatInt(controller.economy.stock.crystal), `+${formatRate(rates.crystal)}/min`);
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
      const richness = controller.planet.gameplay.richness[def.produces];
      const env = controller.planet.gameplay.environment.effects[def.produces] ?? 1;
      const gain = (scaled(def.baseOutput, level + 1, growth) - scaled(def.baseOutput, level, growth)) * richness * env;
      const unit = def.produces === 'energy' ? 'energii' : def.produces === 'metal' ? 'metalu/min' : 'kryształów/min';
      const energyCost =
        def.baseEnergyUse > 0
          ? ` · −${formatRate(scaled(def.baseEnergyUse, level + 1, growth) - scaled(def.baseEnergyUse, level, growth))} energii`
          : '';
      card.effect.setText(`Na poz. ${level + 1}: +${formatRate(gain)} ${unit}${energyCost}`);
      const cost = controller.costOf(card.id);
      card.cost.setText(`Koszt: ${formatInt(cost.metal)} metalu · ${formatInt(cost.crystal)} kryształów`);
      card.cost.setY(card.effect.y + card.effect.height + this.px(this.s(4)));
      if (level >= BALANCE.maxLevel) {
        card.button.setText('Maksymalny poziom').setStyle('disabled');
        continue;
      }
      const wait = controller.waitSecondsFor(card.id);
      if (wait <= 0) card.button.setText(`Ulepsz do ${level + 1}`).setStyle('primary');
      else card.button.setText(Number.isFinite(wait) ? `Dostępne za ${formatDuration(wait)}` : 'Brak produkcji').setStyle('disabled');
    }
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
