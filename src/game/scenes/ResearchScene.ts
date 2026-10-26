import Phaser from 'phaser';
import { antimatterAmount } from '../../core/economy/economy.ts';
import { createRng } from '../../core/random/rng.ts';
import { armProgress, describeEffects, labLevelFor, researchableCount, researchLeadsTo, researchPath, type ResearchStatus } from '../../core/research/research.ts';
import type { ResearchNodeDef } from '../../core/types.ts';
import { findArm, findResearch, RESEARCH_ARMS, RESEARCH_NODES, RESEARCH_RULES } from '../../data/research.ts';
import type { Button, ButtonStyle } from '../ui/Button.ts';
import { prefersReducedMotion } from '../ui/motion.ts';
import { armPoint, GALAXY_RADIUS, galaxyLayout, hitTest, nodeIcon, ringRadius, type NodeIcon, type Point } from '../ui/galaxy.ts';
import { TOUCH, type Rect } from '../ui/layout.ts';
import { COLORS, FONTS, formatDuration, formatInt, formatRate } from '../ui/theme.ts';
import { OverlayScene, type OverlaySceneDeps } from './OverlayScene.ts';

const CANCEL_CONFIRM_MS = 3000;
const POSITIONS = galaxyLayout(RESEARCH_ARMS, RESEARCH_NODES);

/**
 * Ekran „Badania”: galaktyka z jądrem w centrum i spiralnymi ramionami (kategoriami).
 * Jeden palec przesuwa mapę, dwa przybliżają; dotknięcie gwiazdy pokazuje szczegóły badania.
 */
export class ResearchScene extends OverlayScene {
  private world: Phaser.GameObjects.Container | undefined;
  private nodes: Phaser.GameObjects.Graphics | undefined;
  private labels: { text: Phaser.GameObjects.Text; at: Point; node: boolean; arm?: string }[] = [];
  private details: Phaser.GameObjects.Container | undefined;
  private detailsKey = '';
  private detailsLive: { countdown?: Phaser.GameObjects.Text; bar?: { g: Phaser.GameObjects.Graphics; rect: Rect } } = {};
  private header: Phaser.GameObjects.Text | undefined;
  /** Środek galaktyki na ekranie i jednostka (px urządzenia na 1 jednostkę galaktyki). */
  private view = { cx: 0, cy: 0, unit: 1 };
  private selected: string | null = null;
  private cancelArmedUntil = 0;
  /** Filtr ramienia (przygaszone pozostałe) i przyciski filtrów. */
  private armFilter: string | null = null;
  private readonly chips = new Map<string, Button>();
  private cameraTween: Phaser.Tweens.Tween | undefined;

  constructor(deps: OverlaySceneDeps) {
    super('research', deps, { min: 0.7, max: 3.5 });
  }

  create(): void {
    this.selected = this.deps.controller.research.current?.id ?? null;
    this.setupInput();
    this.relayout();

    const offComplete = this.deps.controller.onResearchComplete((id) => {
      this.showToast(`Zbadano: ${findResearch(id)?.name ?? id}.`, 'ok');
      this.refresh(true);
    });
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, offComplete);
  }

  // ——— układ ———

  relayout(): void {
    const { bar } = this.frame(206, 236);
    this.view = {
      cx: this.px(this.area.x + this.area.w / 2),
      cy: this.px(this.area.y + this.area.h / 2),
      unit: this.px(Math.min(this.area.w, this.area.h) / 2 / GALAXY_RADIUS),
    };

    this.world?.destroy(true);
    this.details?.destroy(true);
    this.details = undefined;
    this.detailsKey = '';
    for (const label of this.labels) label.text.destroy();
    this.labels = [];
    this.world = this.add.container(0, 0);
    this.buildGalaxy();
    this.buildLabels();
    this.beginUi();
    this.buildTopBar(bar);
    this.buildFilters();
    this.applyTransform();
    this.refresh(true);
  }

  /** Pył ramion, pierścienie i jądro (statyczne — rysowane raz na układ). */
  private buildGalaxy(): void {
    const world = this.world!;
    const U = this.view.unit;
    const g = this.add.graphics();
    // Delikatne pierścienie zasięgu.
    for (let ring = 1; ring <= 6; ring++) {
      g.lineStyle(Math.max(1, this.dpr * 0.6), COLORS.divider, ring === 6 ? 0.35 : 0.55).strokeCircle(0, 0, ringRadius(ring) * U);
    }
    // Pył spiralnych ramion.
    const rng = createRng('badania-pył');
    for (const arm of RESEARCH_ARMS) {
      for (let i = 0; i < 150; i++) {
        const radius = rng.range(0.6, GALAXY_RADIUS - 0.5);
        const spread = (arm.id === 'productivity' ? 1.9 : 0.55) * (0.4 + radius / GALAXY_RADIUS);
        const p = armPoint(arm, radius, rng.range(-spread, spread));
        const alpha = (arm.active ? 0.32 : 0.16) * rng.range(0.4, 1);
        g.fillStyle(arm.color, alpha).fillCircle(p.x * U, p.y * U, rng.range(0.6, 1.8) * this.dpr);
      }
    }
    // Jądro: miękka złota poświata.
    for (const [r, a] of [
      [0.62, 0.08],
      [0.45, 0.14],
      [0.3, 0.3],
      [0.16, 0.85],
    ] as const) {
      g.fillStyle(COLORS.goldHex, a).fillCircle(0, 0, r * U);
    }
    this.nodes = this.add.graphics();
    world.add([g, this.nodes]);
  }

  private buildLabels(): void {
    for (const arm of RESEARCH_ARMS) {
      const at = armPoint(arm, GALAXY_RADIUS - 0.35);
      const text = this.add
        .text(0, 0, arm.active ? arm.name.toUpperCase() : `${arm.name.toUpperCase()}\nwkrótce`, {
          fontFamily: FONTS.body,
          fontSize: `${this.px(10.5 * this.u)}px`,
          fontStyle: '600',
          color: Phaser.Display.Color.IntegerToColor(arm.color).rgba,
          align: 'center',
          letterSpacing: 1,
        })
        .setOrigin(0.5)
        .setAlpha(arm.active ? 1 : 0.75);
      this.labels.push({ text, at, node: false, arm: arm.id });
    }
    for (const node of RESEARCH_NODES) {
      const p = POSITIONS.get(node.id)!;
      const text = this.add
        .text(0, 0, node.name, {
          fontFamily: FONTS.body,
          fontSize: `${this.px(10.5 * this.u)}px`,
          color: COLORS.text,
          align: 'center',
          wordWrap: { width: this.px(92 * this.u) },
        })
        .setOrigin(0.5, 0);
      this.labels.push({ text, at: p, node: true, arm: node.arm });
    }
  }

  /** Przesunięcie i przybliżenie mapy (z ograniczeniem, żeby galaktyka nie uciekła z ekranu). */
  protected applyTransform(): void {
    const limit = GALAXY_RADIUS * this.view.unit * this.zoom * 0.85;
    this.pan.x = Math.max(-limit, Math.min(limit, this.pan.x));
    this.pan.y = Math.max(-limit, Math.min(limit, this.pan.y));
    const cx = this.view.cx + this.pan.x;
    const cy = this.view.cy + this.pan.y;
    this.world?.setPosition(cx, cy).setScale(this.zoom);
    // Nazwy gwiazd dopiero przy przybliżeniu (inaczej nachodzą na siebie).
    const scale = this.view.unit * this.zoom;
    const showNames = (scale * 0.82) / this.dpr >= 78;
    const area = this.area;
    for (const label of this.labels) {
      let x = cx + label.at.x * scale;
      if (!label.node) {
        // Nazwy ramion nie wychodzą poza mapę (wąski ekran telefonu).
        const half = label.text.width / 2 + this.px(4);
        x = Math.max(this.px(area.x) + half, Math.min(this.px(area.x + area.w) - half, x));
      }
      const y = cy + label.at.y * scale + (label.node ? 0.3 * scale : 0);
      const inside =
        x > this.px(area.x) && x < this.px(area.x + area.w) && y > this.px(area.y) && y < this.px(area.y + area.h);
      const filtered = label.node && this.armFilter !== null && label.arm !== this.armFilter;
      label.text.setPosition(x, y).setVisible(inside && (!label.node || (showNames && !filtered)));
    }
  }

  // ——— rysowanie stanu ———

  protected refresh(force = false): void {
    const controller = this.deps.controller;
    this.drawNodes();
    const lab = controller.labLevel;
    const done = controller.research.done.length;
    this.header?.setText(
      `${controller.planet.displayName} · Laboratorium poz. ${lab} · pierścień ${controller.researchRing} z 5 · zbadano ${done} z ${researchableCount()}`,
    );
    // Nazwy ramion z postępem („PRODUKTYWNOŚĆ 5/21”).
    for (const label of this.labels) {
      const arm = !label.node && label.arm ? findArm(label.arm) : undefined;
      if (!arm?.active) continue;
      const p = armProgress(arm.id, controller.research.done);
      label.text.setText(`${arm.name.toUpperCase()} ${p.done}/${p.total}`);
    }
    const key = this.detailsSignature();
    if (force || key !== this.detailsKey) {
      this.detailsKey = key;
      this.buildDetails();
    }
    this.refreshLive();
  }

  private statusOf(node: ResearchNodeDef): ResearchStatus {
    return this.deps.controller.researchStatus(node.id) ?? 'soon';
  }

  private drawNodes(): void {
    const g = this.nodes;
    if (!g) return;
    g.clear();
    const U = this.view.unit;
    const line = Math.max(1, this.dpr);
    const controller = this.deps.controller;
    const now = Date.now();
    // Szlak do zaznaczonego celu: ono i wszystkie niezbadane badania przed nim.
    const path = new Set(this.selected ? researchPath(this.selected, controller.research.done) : []);
    // Połączenia (od wymaganego badania do następnego); pierścień 1 łączy się z jądrem.
    for (const node of RESEARCH_NODES) {
      const p = POSITIONS.get(node.id)!;
      const arm = findArm(node.arm)!;
      const status = this.statusOf(node);
      const froms = node.requires.length > 0 ? node.requires.map((id) => POSITIONS.get(id)!) : [{ x: 0, y: 0 }];
      // Gwiazdy „wkrótce” daleko od poprzedniej (np. mistrzowskie) — bez długich linii przez mapę.
      if (status === 'soon' && node.requires.some((id) => (findResearch(id)?.ring ?? 0) < node.ring - 1)) continue;
      // Filtr ramienia: połączenia innych ramion ledwo widoczne.
      const dim = this.armFilter !== null && node.arm !== this.armFilter ? 0.25 : 1;
      for (const from of froms) {
        const lit = status === 'done' || status === 'running' || status === 'available' || status === 'needs-lab';
        g.lineStyle(line * (lit ? 1.6 : 1), status === 'soon' ? COLORS.panelBorder : arm.color, (status === 'done' ? 0.75 : lit ? 0.5 : 0.34) * dim);
        g.lineBetween(from.x * U, from.y * U, p.x * U, p.y * U);
      }
    }
    if (path.size > 1 || (path.size === 1 && this.selected && this.statusOf(findResearch(this.selected)!) !== 'available')) {
      // Jasny szlak (złoto zlewałoby się z ramieniem Produktywności).
      g.lineStyle(line * 2.6, 0xdfe7e1, 0.85);
      for (const id of path) {
        const node = findResearch(id)!;
        const p = POSITIONS.get(id)!;
        const froms = node.requires.length > 0 ? node.requires.map((r) => POSITIONS.get(r)!) : [{ x: 0, y: 0 }];
        for (const from of froms) g.lineBetween(from.x * U, from.y * U, p.x * U, p.y * U);
      }
    }
    for (const node of RESEARCH_NODES) {
      const p = POSITIONS.get(node.id)!;
      const arm = findArm(node.arm)!;
      const status = this.statusOf(node);
      const x = p.x * U;
      const y = p.y * U;
      const r = (node.master ? 0.3 : 0.2) * U;
      if (this.armFilter !== null && node.arm !== this.armFilter) {
        // Poza filtrem: mała, przygaszona kropka (zbadane — w kolorze ramienia).
        g.fillStyle(status === 'done' ? arm.color : COLORS.panelBorder, 0.45).fillCircle(x, y, r * 0.45);
        continue;
      }
      // Kolor ikony: ciemna na pełnej gwieździe, w kolorze ramienia na pustej.
      let icon: number = arm.color;
      let iconAlpha = 1;
      if (node.master) {
        this.star(g, x, y, r * 1.25, status === 'soon' ? 0x5f7873 : arm.color, status === 'soon' ? 0.5 : 1);
        iconAlpha = 0;
      } else if (status === 'done') {
        g.fillStyle(arm.color, 0.3).fillCircle(x, y, r * 1.5);
        g.fillStyle(arm.color, 1).fillCircle(x, y, r);
        icon = COLORS.panel;
      } else if (status === 'running') {
        g.fillStyle(COLORS.goldHex, 0.14 + 0.08 * Math.sin(now / 500)).fillCircle(x, y, r * 1.6);
        g.fillStyle(COLORS.panel, 1).fillCircle(x, y, r);
        g.lineStyle(line * 1.2, arm.color, 0.4).strokeCircle(x, y, r);
        const progress = controller.researchProgress(now);
        g.lineStyle(line * 2.4, COLORS.goldHex, 1);
        g.beginPath();
        g.arc(x, y, r, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * Math.max(0.03, progress), false);
        g.strokePath();
      } else if (status === 'available') {
        g.fillStyle(arm.color, 0.18 + 0.1 * Math.sin(now / 400)).fillCircle(x, y, r * 1.55);
        g.fillStyle(COLORS.panel, 1).fillCircle(x, y, r);
        g.lineStyle(line * 1.8, arm.color, 1).strokeCircle(x, y, r);
      } else if (status === 'needs-lab') {
        g.fillStyle(COLORS.panel, 1).fillCircle(x, y, r);
        this.dashedCircle(g, x, y, r, line * 1.4, arm.color, 0.7);
        iconAlpha = 0.7;
      } else if (status === 'needs-research') {
        g.fillStyle(COLORS.panel, 1).fillCircle(x, y, r * 0.85);
        this.dashedCircle(g, x, y, r * 0.85, line * 1.2, arm.color, path.has(node.id) ? 0.95 : 0.7);
        iconAlpha = path.has(node.id) ? 0.9 : 0.65;
      } else {
        g.fillStyle(COLORS.panel, 1).fillCircle(x, y, r * 0.8);
        g.lineStyle(line, 0x4f6a66, 1).strokeCircle(x, y, r * 0.8);
        icon = 0x7f9690;
        iconAlpha = 0.9;
      }
      if (iconAlpha > 0) this.drawIcon(g, nodeIcon(node), x, y, r * 0.5, icon, iconAlpha, line);
      if (node.id === this.selected) {
        g.lineStyle(line * 1.4, 0xffffff, 0.9).strokeCircle(x, y, r * 1.75);
      }
    }
  }

  /** Okrąg z kresek (badanie zablokowane). */
  private dashedCircle(g: Phaser.GameObjects.Graphics, x: number, y: number, r: number, width: number, color: number, alpha: number): void {
    const parts = 10;
    g.lineStyle(width, color, alpha);
    for (let i = 0; i < parts; i++) {
      const a = (i / parts) * Math.PI * 2;
      g.beginPath();
      g.arc(x, y, r, a, a + (Math.PI * 2) / parts / 1.8, false);
      g.strokePath();
    }
  }

  /** Mała ikona rodzaju badania w środku gwiazdy (`s` — połowa szerokości ikony). */
  private drawIcon(g: Phaser.GameObjects.Graphics, kind: NodeIcon, x: number, y: number, s: number, color: number, alpha: number, line: number): void {
    const V = Phaser.Math.Vector2;
    const poly = (points: [number, number][]) => g.fillPoints(points.map(([px, py]) => new V(x + px * s, y + py * s)), true);
    g.fillStyle(color, alpha);
    g.lineStyle(Math.max(1, line * 1.2), color, alpha);
    switch (kind) {
      case 'metal':
        poly([[0, -1], [0.87, -0.5], [0.87, 0.5], [0, 1], [-0.87, 0.5], [-0.87, -0.5]]);
        break;
      case 'crystal':
        poly([[0, -1.05], [0.62, 0], [0, 1.05], [-0.62, 0]]);
        break;
      case 'mining':
        // Wiertło: grot w dół.
        poly([[-0.8, -0.8], [0.8, -0.8], [0, 1]]);
        break;
      case 'energy':
        poly([[0.15, -1], [-0.6, 0.15], [-0.05, 0.15], [-0.25, 1], [0.6, -0.2], [0.05, -0.2]]);
        break;
      case 'build':
        // Młotek: obuch i trzonek.
        g.fillRect(x - s * 0.8, y - s * 0.85, s * 1.6, s * 0.55);
        g.fillRect(x - s * 0.18, y - s * 0.3, s * 0.36, s * 1.25);
        break;
      case 'storage':
        g.strokeRect(x - s * 0.8, y - s * 0.6, s * 1.6, s * 1.3);
        g.lineBetween(x - s * 0.8, y - s * 0.15, x + s * 0.8, y - s * 0.15);
        break;
      case 'antimatter':
        g.strokeCircle(x, y, s * 0.85);
        g.fillCircle(x, y, s * 0.32);
        break;
      case 'planet':
        g.strokeCircle(x, y, s * 0.7);
        g.lineBetween(x - s * 1.05, y + s * 0.3, x + s * 1.05, y - s * 0.3);
        break;
      case 'ship':
        poly([[0, -1], [0.7, 0.85], [0, 0.45], [-0.7, 0.85]]);
        break;
      case 'ai':
        for (const dx of [-0.6, 0, 0.6]) g.fillCircle(x + dx * s, y, s * 0.26);
        break;
      case 'station':
        g.strokeRect(x - s * 0.55, y - s * 0.55, s * 1.1, s * 1.1);
        g.lineBetween(x - s, y, x + s, y);
        break;
      case 'fleet':
        poly([[-0.8, -0.7], [0.9, 0], [-0.8, 0.7], [-0.4, 0]]);
        break;
      default:
        break;
    }
  }

  /** Czteroramienna gwiazda (gwiazda mistrzowska). */
  private star(g: Phaser.GameObjects.Graphics, x: number, y: number, r: number, color: number, alpha: number): void {
    const V = Phaser.Math.Vector2;
    const points: Phaser.Math.Vector2[] = [];
    for (let i = 0; i < 8; i++) {
      const a = (i * Math.PI) / 4 - Math.PI / 2;
      const d = i % 2 === 0 ? r : r * 0.38;
      points.push(new V(x + Math.cos(a) * d, y + Math.sin(a) * d));
    }
    g.fillStyle(color, alpha).fillPoints(points, true);
  }

  // ——— panele ———

  private buildTopBar(bar: Rect): void {
    this.panel(bar);
    const pad = 14 * this.u;
    const closeW = 112 * this.u;
    this.text(bar.x + pad, bar.y + this.s(8), 'BADANIA', 15, COLORS.gold, { fontFamily: FONTS.serif, letterSpacing: 2 });
    this.header = this.text(bar.x + pad, bar.y + this.s(30), '', 10.5, COLORS.muted, {
      fixedWidth: this.px(bar.w - 2 * pad - closeW),
    });
    this.addButton(bar.x + bar.w - pad / 2 - closeW, bar.y + (bar.h - TOUCH) / 2, closeW, TOUCH, 'Zamknij', 'secondary', () => this.close());
  }

  private detailsSignature(): string {
    const c = this.deps.controller;
    const node = this.selected ? findResearch(this.selected) : undefined;
    const armed = Date.now() <= this.cancelArmedUntil;
    return [this.selected, node ? this.statusOf(node) : '', c.research.current?.id ?? '', c.research.done.length, c.labLevel, armed].join('|');
  }

  /**
   * Panel szczegółów jako karta dopasowana do treści (od v0.31.2): szeroki ekran — u góry po prawej,
   * wąski — dolny arkusz. Miejsce pod kartą należy do mapy (przesuwanie, przybliżanie).
   */
  private buildDetails(): void {
    this.details?.destroy(true);
    this.detailsLive = {};
    const items: Phaser.GameObjects.GameObject[] = [];
    this.details = this.add.container(0, 0).setDepth(11);
    const wide = this.panelRect.x > this.area.x + 1;
    const node = this.selected ? findResearch(this.selected) : undefined;
    // Wąski ekran: szczegóły badania jako wyższy dolny arkusz (do filtrów u góry mapy); w spoczynku — niski.
    const top = this.area.y + TOUCH + this.s(16);
    const rect: Rect =
      wide || !node ? this.panelRect : { ...this.panelRect, y: top, h: this.panelRect.y + this.panelRect.h - top };
    const pad = 14 * this.u;
    const w = rect.w - 2 * pad;
    const x = rect.x + pad;
    let y = rect.y + pad - this.s(2);
    const maxBottom = rect.y + rect.h - pad;
    const controller = this.deps.controller;
    const add = <T extends Phaser.GameObjects.GameObject>(o: T): T => {
      items.push(o);
      return o;
    };
    const line = (content: string, size: number, color: string, extra: Phaser.Types.GameObjects.Text.TextStyle = {}, after = 6) => {
      const t = add(this.text(x, y, content, size, color, { wordWrap: { width: this.px(w) }, lineSpacing: this.px(2), ...extra }, false));
      y += t.height / this.dpr + this.s(after);
      return t;
    };
    const heading = (label: string) => line(label, 9.5, COLORS.muted, { fontStyle: '600', letterSpacing: 1.5 }, 5);
    // Miejsce na treść nad przyciskami (opcjonalne części tylko, gdy się mieszczą).
    const fits = (h: number, buttons = 1) => y + h + buttons * (TOUCH + this.s(8)) <= maxBottom;
    const gap = this.s(8);
    const half = (w - gap) / 2;
    const current = controller.research.current;
    let buttonsRow: ((at: number) => void) | null = null;

    if (!node) {
      line('Galaktyka badań', 18, COLORS.gold, { fontFamily: FONTS.serif }, 2);
      line(
        controller.labLevel === 0
          ? 'Zbuduj Laboratorium (panel Produkcja), aby zacząć badania.'
          : `Laboratorium poz. ${controller.labLevel} sięga do pierścienia ${controller.researchRing}.`,
        11.5,
        controller.labLevel === 0 ? COLORS.danger : COLORS.muted,
        {},
        8,
      );
      if (current) {
        const running = findResearch(current.id);
        this.detailsLive.countdown = line(`Trwa: ${running?.name ?? ''}`, 12, COLORS.gold, { fontStyle: '600' }, 4);
        this.detailsLive.bar = { g: add(this.add.graphics()), rect: { x, y, w, h: this.s(4) } };
        y += this.s(14);
      }
      const arms = RESEARCH_ARMS.filter((a) => a.active);
      if (fits(this.s(18) + arms.length * this.s(24), current ? 1 : 0)) {
        heading('RAMIONA');
        const bars = add(this.add.graphics());
        for (const arm of arms) {
          const p = armProgress(arm.id, controller.research.done);
          add(this.text(x, y, arm.name, 11, COLORS.text, {}, false));
          add(this.text(x + w, y, `${p.done}/${p.total}`, 11, COLORS.muted, {}, false).setOrigin(1, 0));
          const by = y + this.s(16);
          bars.fillStyle(COLORS.divider, 1).fillRoundedRect(this.px(x), this.px(by), this.px(w), this.px(this.s(3)), this.px(1.5));
          if (p.done > 0) {
            bars.fillStyle(arm.color, 1).fillRoundedRect(this.px(x), this.px(by), this.px(Math.max(this.s(3), (w * p.done) / p.total)), this.px(this.s(3)), this.px(1.5));
          }
          y += this.s(24);
        }
        y += this.s(6);
      }
      const available = RESEARCH_NODES.filter((n) => this.statusOf(n) === 'available')
        .map((n) => ({ n, cost: controller.researchCost(n.id)! }))
        .sort((p, q) => p.cost.metal + p.cost.crystal - (q.cost.metal + q.cost.crystal))
        .slice(0, 3);
      if (available.length > 0 && fits(this.s(18) + TOUCH, current ? 1 : 0)) {
        heading('DOSTĘPNE TERAZ');
        for (const { n } of available) {
          if (!fits(TOUCH, current ? 1 : 0)) break;
          add(this.button(x, y, w, n.name, 'secondary', () => this.select(n.id, true)));
          y += TOUCH + gap;
        }
        y += this.s(2);
      }
      if (fits(this.s(56), current ? 1 : 0)) this.legend(add, x, y, w, (h) => (y += h));
      if (current) buttonsRow = (at) => add(this.button(x, at, w, 'Pokaż trwające badanie', 'secondary', () => this.select(current.id, true)));
    } else {
      const arm = findArm(node.arm)!;
      const status = this.statusOf(node);
      const armColor = Phaser.Display.Color.IntegerToColor(arm.color).rgba;
      // Tytuł i „Wyśrodkuj” w jednym wierszu.
      const centerW = this.s(104);
      const titleY = y;
      line(node.name, 18, COLORS.gold, { fontFamily: FONTS.serif, wordWrap: { width: this.px(w - centerW - gap) } }, 2);
      add(this.button(x + w - centerW, titleY - this.s(2), centerW, 'Wyśrodkuj', 'secondary', () => this.centerOn(node.id)));
      line(
        node.master ? `${arm.name} · gwiazda mistrzowska (przełom)` : `${arm.name} · pierścień ${node.ring} · Laboratorium ${labLevelFor(node.ring, RESEARCH_RULES)}`,
        10.5,
        armColor,
        { fontStyle: '600', wordWrap: { width: this.px(w - centerW - gap) } },
      );
      y = Math.max(y, titleY + TOUCH + this.s(4));
      line(node.description, 11.5, COLORS.muted, {}, 10);
      if (node.master) {
        line('Przełom na krawędzi ramienia. Zbadasz wszystkie, ale aktywne będą najwyżej 2 naraz — to specjalizacje imperium. Wkrótce.', 11.5, COLORS.text);
      } else if (status === 'soon') {
        line(
          arm.active ? 'To badanie będzie dostępne w kolejnym etapie.' : `Ramię „${arm.name}” będzie dostępne w kolejnym etapie. ${arm.description}`,
          11.5,
          COLORS.text,
        );
      } else {
        // Od v0.15 efekty działają na planecie, która zbadała; odblokowania i miejsca — w całym imperium.
        const empireWide = node.effects.every((e) => e.kind === 'unlock' || e.kind === 'planetSlots');
        heading(empireWide ? 'EFEKT · CAŁE IMPERIUM' : `EFEKT · ${controller.planet.displayName.toUpperCase()}`);
        line(describeEffects(node), 12, COLORS.teal, { fontStyle: '600' }, 4);
        if (status !== 'done') {
          for (const p of controller.researchPreview(node.id)) {
            line(`${p.label}: ${formatRate(p.before)}${p.unit} → ${formatRate(p.after)}${p.unit}`, 11.5, COLORS.text, {}, 2);
          }
        }
        y += this.s(8);
        if (status !== 'done') {
          const cost = controller.researchCost(node.id)!;
          if (status === 'running') {
            heading('POSTĘP');
            this.detailsLive.countdown = line('', 12, COLORS.gold, { fontStyle: '600' }, 4);
            this.detailsLive.bar = { g: add(this.add.graphics()), rect: { x, y, w, h: this.s(4) } };
            y += this.s(14);
          } else {
            heading('KOSZT I CZAS');
            const parts = [`${formatInt(cost.metal)} metalu`, `${formatInt(cost.crystal)} kryształów`];
            if (cost.antimatter > 0) parts.push(antimatterAmount(cost.antimatter));
            line(`${parts.join(' · ')} · ${formatDuration(controller.researchSeconds(node.id))}`, 11.5, COLORS.text, {}, 2);
            const stock = controller.economy.stock;
            const missing: string[] = [];
            if (stock.metal < cost.metal) missing.push(`${formatInt(cost.metal - stock.metal)} metalu`);
            if (stock.crystal < cost.crystal) missing.push(`${formatInt(cost.crystal - stock.crystal)} kryształów`);
            if (Math.floor(controller.economy.antimatter) < cost.antimatter) missing.push(antimatterAmount(cost.antimatter - Math.floor(controller.economy.antimatter)));
            line(missing.length > 0 ? `Brakuje: ${missing.join(', ')}` : 'Masz wszystkie surowce.', 10.5, missing.length > 0 ? COLORS.danger : COLORS.teal, {}, 8);
          }
          // Wymagania: każde z ✓ albo ✗ (badania wcześniej i poziom Laboratorium).
          heading('WYMAGANIA');
          const done = controller.research.done;
          const needLab = labLevelFor(node.ring, RESEARCH_RULES);
          const rows: [boolean, string][] = [
            ...node.requires.map((id): [boolean, string] => [done.includes(id), findResearch(id)?.name ?? id]),
            [controller.labLevel >= needLab, `Laboratorium poz. ${needLab} (masz ${controller.labLevel})`],
          ];
          for (const [ok, label] of rows) line(`${ok ? '✓' : '✗'}  ${label}`, 11, ok ? COLORS.teal : COLORS.danger, {}, 2);
          const steps = researchPath(node.id, done).length - 1;
          if (steps > node.requires.filter((id) => !done.includes(id)).length) line(`Do celu brakuje ${steps} badań — jasny szlak na mapie.`, 10.5, COLORS.gold, {}, 2);
          y += this.s(6);
        }
        const next = researchLeadsTo(node.id).filter((n) => !n.master);
        if (next.length > 0 && fits(this.s(30))) line(`Prowadzi do: ${next.map((n) => n.name).join(', ')}.`, 10.5, COLORS.faint, {}, 8);
      }
      // Przyciski: [akcja albo powód blokady] [Odznacz]
      let label = 'Zbadane';
      let style: ButtonStyle = 'disabled';
      let action: () => void = () => undefined;
      if (status === 'running') {
        const armed = Date.now() <= this.cancelArmedUntil;
        label = armed ? 'Na pewno?' : 'Anuluj';
        style = armed ? 'danger' : 'secondary';
        action = () => this.onCancel();
      } else if (status === 'available') {
        if (current) {
          label = 'Trwa inne badanie';
        } else {
          label = 'Badaj';
          style = 'primary';
          action = () => this.onStart(node.id);
        }
      } else if (status === 'needs-lab') label = `Laboratorium ${labLevelFor(node.ring, RESEARCH_RULES)}`;
      else if (status === 'needs-research') label = 'Najpierw wymagania';
      else if (status === 'soon') label = 'Wkrótce';
      buttonsRow = (at) => {
        add(this.button(x, at, half, label, style, action));
        add(this.button(x + half + gap, at, half, 'Odznacz', 'secondary', () => this.select(null)));
      };
    }

    // Przyciski pod treścią (albo przy dolnej krawędzi, gdy treść jest długa), tło karty pod wszystkim.
    if (buttonsRow) {
      const at = Math.min(y + this.s(4), maxBottom - TOUCH);
      buttonsRow(at);
      y = at + TOUCH;
    }
    const height = Math.min(rect.h, y + pad - rect.y);
    const bg = this.add.graphics();
    const radius = this.px(this.s(14));
    bg.fillStyle(COLORS.panel, 0.94).fillRoundedRect(this.px(rect.x), this.px(rect.y), this.px(rect.w), this.px(height), radius);
    bg.lineStyle(this.px(1), COLORS.panelBorder, 1).strokeRoundedRect(this.px(rect.x), this.px(rect.y), this.px(rect.w), this.px(height), radius);
    const blocker = this.add.zone(this.px(rect.x), this.px(rect.y), this.px(rect.w), this.px(height)).setOrigin(0).setInteractive();
    this.details.add([bg, blocker, ...items]);
    // Wąski ekran: dolny arkusz przyklejony do dołu.
    if (!wide) this.details.setY(this.px(rect.h - height));
  }

  /** Legenda stanów gwiazd (panel w spoczynku). */
  private legend(add: <T extends Phaser.GameObjects.GameObject>(o: T) => T, x: number, y: number, w: number, advance: (h: number) => void): void {
    const g = add(this.add.graphics());
    const r = this.s(5);
    const line = Math.max(1, this.dpr);
    const entries: [string, (cx: number, cy: number) => void][] = [
      ['zbadane', (cx, cy) => g.fillStyle(COLORS.goldHex, 1).fillCircle(cx, cy, this.px(r))],
      ['dostępne', (cx, cy) => g.lineStyle(line * 1.8, COLORS.goldHex, 1).strokeCircle(cx, cy, this.px(r))],
      ['trwa', (cx, cy) => {
        g.lineStyle(line * 1.2, COLORS.goldHex, 0.4).strokeCircle(cx, cy, this.px(r));
        g.lineStyle(line * 2.4, COLORS.goldHex, 1).beginPath();
        g.arc(cx, cy, this.px(r), -Math.PI / 2, Math.PI / 3, false);
        g.strokePath();
      }],
      ['zablokowane', (cx, cy) => this.dashedCircle(g, cx, cy, this.px(r), line * 1.2, COLORS.goldHex, 0.8)],
    ];
    const col = w / 2;
    entries.forEach(([label, draw], i) => {
      const ex = x + (i % 2) * col;
      const ey = y + Math.floor(i / 2) * this.s(22);
      draw(this.px(ex + r), this.px(ey + this.s(8)));
      add(this.text(ex + 2 * r + this.s(8), ey, label, 11, COLORS.muted, {}, false));
    });
    advance(this.s(48));
  }

  /** Odliczanie i pasek trwającego badania (co 250 ms, bez przebudowy panelu). */
  private refreshLive(): void {
    const controller = this.deps.controller;
    const current = controller.research.current;
    const now = Date.now();
    if (this.detailsLive.countdown && current) {
      const name = findResearch(current.id)?.name ?? '';
      const left = formatDuration(controller.researchSecondsLeft(now));
      this.detailsLive.countdown.setText(this.selected === current.id ? `Trwa badanie · zostało ${left}` : `Trwa: ${name} · zostało ${left}`);
    }
    const bar = this.detailsLive.bar;
    if (bar && current) {
      const { x, y, w, h } = bar.rect;
      bar.g
        .clear()
        .fillStyle(COLORS.divider, 1)
        .fillRoundedRect(this.px(x), this.px(y), this.px(w), this.px(h), this.px(2))
        .fillStyle(COLORS.goldHex, 1)
        .fillRoundedRect(this.px(x), this.px(y), this.px(Math.max(h, w * controller.researchProgress(now))), this.px(h), this.px(2));
    }
  }

  // ——— akcje ———

  protected onTap(px: number, py: number): void {
    const scale = this.view.unit * this.zoom;
    const gx = (px - this.view.cx - this.pan.x) / scale;
    const gy = (py - this.view.cy - this.pan.y) / scale;
    // Cel dotykowy co najmniej ~24 pt promienia, nawet przy oddaleniu.
    const reach = Math.max(0.42, (24 * this.dpr) / scale);
    this.select(hitTest(POSITIONS, gx, gy, reach));
  }

  /** `center` — mapa płynnie podjeżdża do badania (wybór z listy w panelu). */
  private select(id: string | null, center = false): void {
    this.selected = id;
    this.cancelArmedUntil = 0;
    this.refresh(true);
    if (id && center) this.centerOn(id);
  }

  /** Środek mapy na badaniu, z przybliżeniem co najmniej 1,6× (nazwy gwiazd widoczne). */
  private centerOn(id: string): void {
    const p = POSITIONS.get(id);
    if (p) this.moveCamera(p, Math.max(this.zoom, 1.6));
  }

  /** Filtr ramienia: przygasza pozostałe i pokazuje całe ramię; `null` — całe drzewo. */
  private focusArm(arm: string | null): void {
    this.armFilter = arm;
    for (const [id, chip] of this.chips) chip.setStyle(id === (arm ?? 'all') ? 'primary' : 'secondary');
    if (!arm) {
      this.moveCamera({ x: 0, y: 0 }, 1);
    } else {
      const points = RESEARCH_NODES.filter((n) => n.arm === arm && !n.master).map((n) => POSITIONS.get(n.id)!);
      const xs = points.map((q) => q.x);
      const ys = points.map((q) => q.y);
      const center = { x: (Math.min(...xs) + Math.max(...xs)) / 2, y: (Math.min(...ys) + Math.max(...ys)) / 2 };
      const span = Math.max(Math.max(...xs) - Math.min(...xs), Math.max(...ys) - Math.min(...ys), 2);
      // Ramię mieści się w obszarze mapy z marginesem.
      const fit = (Math.min(this.area.w, this.area.h) * this.dpr * 0.8) / (span * this.view.unit);
      this.moveCamera(center, Math.max(1, Math.min(2.4, fit)));
    }
    this.refresh(true);
  }

  /** Płynny przejazd mapy: punkt galaktyki na środek obszaru mapy, przybliżenie `zoom`. */
  private moveCamera(target: Point, zoom: number): void {
    this.cameraTween?.stop();
    const from = { zoom: this.zoom, x: this.pan.x, y: this.pan.y };
    const to = { zoom, x: -target.x * this.view.unit * zoom, y: -target.y * this.view.unit * zoom };
    const apply = (t: number) => {
      this.zoom = from.zoom + (to.zoom - from.zoom) * t;
      this.pan.x = from.x + (to.x - from.x) * t;
      this.pan.y = from.y + (to.y - from.y) * t;
      this.gestures.zoom = this.zoom;
      this.applyTransform();
    };
    if (prefersReducedMotion()) {
      apply(1);
      return;
    }
    this.cameraTween = this.tweens.addCounter({ from: 0, to: 1, duration: 420, ease: 'Cubic.InOut', onUpdate: (tw) => apply(tw.getValue() ?? 1) });
  }

  /** Filtry ramion u góry mapy: „Całe drzewo” i aktywne ramiona (tyle, ile się zmieści). */
  private buildFilters(): void {
    this.chips.clear();
    const gap = this.s(6);
    let x = this.area.x + gap;
    const y = this.area.y + gap;
    const right = this.area.x + this.area.w - gap;
    const entries: [string, string][] = [['all', 'Całe drzewo'], ...RESEARCH_ARMS.filter((a) => a.active).map((a): [string, string] => [a.id, a.name])];
    for (const [id, label] of entries) {
      const w = this.s(label.length * 7.6 + 30);
      if (x + w > right) break;
      const chip = this.addButton(x, y, w, TOUCH, label, id === (this.armFilter ?? 'all') ? 'primary' : 'secondary', () =>
        this.focusArm(id === 'all' ? null : id),
      );
      this.chips.set(id, chip);
      x += w + gap;
    }
  }

  private onStart(id: string): void {
    const result = this.deps.controller.startResearch(id);
    this.showToast(result.message, result.ok ? 'ok' : 'error');
    this.refresh(true);
  }

  private onCancel(): void {
    const now = Date.now();
    if (now > this.cancelArmedUntil) {
      // Pierwsze dotknięcie tylko pyta — przypadkowy dotyk nie przerwie badania.
      this.cancelArmedUntil = now + CANCEL_CONFIRM_MS;
      this.refresh(true);
      return;
    }
    this.cancelArmedUntil = 0;
    const result = this.deps.controller.cancelResearch(now);
    this.showToast(result.message, result.ok ? 'info' : 'error', 3200);
    this.refresh(true);
  }
}
