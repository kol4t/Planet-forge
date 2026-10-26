import Phaser from 'phaser';
import { antimatterAmount } from '../../core/economy/economy.ts';
import { createRng } from '../../core/random/rng.ts';
import { armProgress, describeEffects, labLevelFor, researchableCount, researchLeadsTo, researchPath, type ResearchStatus } from '../../core/research/research.ts';
import type { ResearchNodeDef } from '../../core/types.ts';
import { findArm, findResearch, RESEARCH_ARMS, RESEARCH_NODES, RESEARCH_RULES } from '../../data/research.ts';
import type { ButtonStyle } from '../ui/Button.ts';
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
    this.panel(this.panelRect);
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
        .setAlpha(arm.active ? 0.95 : 0.55);
      this.labels.push({ text, at, node: false, arm: arm.id });
    }
    for (const node of RESEARCH_NODES) {
      const p = POSITIONS.get(node.id)!;
      const text = this.add
        .text(0, 0, node.name, {
          fontFamily: FONTS.body,
          fontSize: `${this.px(9.5 * this.u)}px`,
          color: COLORS.muted,
          align: 'center',
          wordWrap: { width: this.px(84 * this.u) },
        })
        .setOrigin(0.5, 0);
      this.labels.push({ text, at: p, node: true });
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
      label.text.setPosition(x, y).setVisible(inside && (!label.node || showNames));
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
      const arm = label.arm ? findArm(label.arm) : undefined;
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
      for (const from of froms) {
        const lit = status === 'done' || status === 'running' || status === 'available' || status === 'needs-lab';
        g.lineStyle(line * (lit ? 1.6 : 1), status === 'soon' ? COLORS.divider : arm.color, status === 'done' ? 0.75 : lit ? 0.45 : 0.22);
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
        this.dashedCircle(g, x, y, r * 0.85, line, arm.color, path.has(node.id) ? 0.9 : 0.45);
        iconAlpha = path.has(node.id) ? 0.8 : 0.4;
      } else {
        g.fillStyle(COLORS.panel, 1).fillCircle(x, y, r * 0.8);
        g.lineStyle(line, COLORS.panelBorder, 0.8).strokeCircle(x, y, r * 0.8);
        icon = 0x5f7873;
        iconAlpha = 0.7;
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

  /** Szczegóły zaznaczonego badania albo podpowiedź, gdy nic nie zaznaczono. */
  private buildDetails(): void {
    this.details?.destroy(true);
    this.detailsLive = {};
    const items: Phaser.GameObjects.GameObject[] = [];
    this.details = this.add.container(0, 0).setDepth(11);
    const rect = this.panelRect;
    const pad = 14 * this.u;
    const w = rect.w - 2 * pad;
    const x = rect.x + pad;
    let y = rect.y + pad - this.s(2);
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
    const buttonY = rect.y + rect.h - pad - TOUCH;
    const current = controller.research.current;
    const node = this.selected ? findResearch(this.selected) : undefined;

    if (!node) {
      // Panel w spoczynku: Laboratorium, trwające badanie, postęp ramion i badania dostępne teraz
      // (każda część tylko wtedy, gdy się mieści — telefon ma niski panel).
      const bottom = (current ? buttonY : rect.y + rect.h - pad) - this.s(8);
      const fits = (h: number) => y + h <= bottom;
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
        add(this.button(x, buttonY, w, 'Pokaż trwające badanie', 'secondary', () => this.select(current.id)));
      }
      const arms = RESEARCH_ARMS.filter((a) => a.active);
      if (fits(this.s(18) + arms.length * this.s(24))) {
        line('RAMIONA', 9.5, COLORS.muted, { fontStyle: '600', letterSpacing: 1.5 }, 6);
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
      const gap = this.s(8);
      if (available.length > 0 && fits(this.s(18) + TOUCH)) {
        line('DOSTĘPNE TERAZ', 9.5, COLORS.muted, { fontStyle: '600', letterSpacing: 1.5 }, 6);
        for (const { n } of available) {
          if (!fits(TOUCH)) break;
          add(this.button(x, y, w, n.name, 'secondary', () => this.select(n.id)));
          y += TOUCH + gap;
        }
      }
      if (fits(this.s(32))) line('Dotknij gwiazdy, aby zobaczyć badanie. Szczypnij, by przybliżyć — pojawią się nazwy.', 10.5, COLORS.faint);
      this.details.add(items);
      return;
    }

    const arm = findArm(node.arm)!;
    const status = this.statusOf(node);
    line(node.name, 18, COLORS.gold, { fontFamily: FONTS.serif }, 2);
    line(
      node.master ? `${arm.name} · gwiazda mistrzowska` : `${arm.name} · pierścień ${node.ring}`,
      10.5,
      Phaser.Display.Color.IntegerToColor(arm.color).rgba,
      { fontStyle: '600' },
    );
    line(node.description, 11.5, COLORS.muted);
    if (node.master) {
      line('Bardzo mocne badanie na krawędzi ramienia. Zbadasz wszystkie, ale aktywne będą maks. 2 naraz — to specjalizacje imperium. Wkrótce.', 11.5, COLORS.text);
    } else if (status === 'soon') {
      line(
        arm.active ? 'To badanie będzie dostępne w kolejnym etapie.' : `Ramię „${arm.name}” będzie dostępne w kolejnym etapie. ${arm.description}`,
        11.5,
        COLORS.text,
      );
    } else {
      // Od v0.15 efekty działają na planecie, która zbadała; odblokowania i miejsca — w całym imperium.
      const empireWide = node.effects.every((e) => e.kind === 'unlock' || e.kind === 'planetSlots');
      line(`Efekt (${empireWide ? 'całe imperium' : 'ta planeta'}): ${describeEffects(node)}`, 12, COLORS.teal, { fontStyle: '600' }, 4);
      if (status !== 'done') {
        for (const p of controller.researchPreview(node.id)) {
          line(`${p.label}: ${formatRate(p.before)}${p.unit} → ${formatRate(p.after)}${p.unit}`, 11.5, COLORS.text, {}, 2);
        }
        y += this.s(4);
      }
      if (status !== 'done') {
        const cost = controller.researchCost(node.id)!;
        const parts = [`${formatInt(cost.metal)} metalu`, `${formatInt(cost.crystal)} kryształów`];
        if (cost.antimatter > 0) parts.push(antimatterAmount(cost.antimatter));
        if (status === 'running') {
          this.detailsLive.countdown = line('', 12, COLORS.gold, { fontStyle: '600' }, 4);
          this.detailsLive.bar = { g: add(this.add.graphics()), rect: { x, y, w, h: this.s(4) } };
          y += this.s(10);
        } else {
          line(`Koszt: ${parts.join(' · ')} · czas ${formatDuration(controller.researchSeconds(node.id))}`, 11, COLORS.text);
          const stock = controller.economy.stock;
          line(
            `Masz: ${formatInt(stock.metal)} metalu · ${formatInt(stock.crystal)} kryształów · ${formatInt(controller.economy.antimatter)} antymaterii`,
            10.5,
            COLORS.faint,
          );
        }
      }
      if (status === 'needs-lab') {
        line(`Wymaga Laboratorium poz. ${labLevelFor(node.ring, RESEARCH_RULES)} (masz ${controller.labLevel}).`, 11.5, COLORS.danger);
      } else if (status === 'needs-research') {
        const missing = node.requires.filter((id) => !controller.research.done.includes(id)).map((id) => findResearch(id)?.name ?? id);
        line(`Najpierw zbadaj: ${missing.join(', ')}.`, 11.5, COLORS.danger);
        const steps = researchPath(node.id, controller.research.done).length - 1;
        if (steps > missing.length) line(`Do celu brakuje ${steps} badań — jasny szlak na mapie.`, 11, COLORS.gold);
      }
      const next = researchLeadsTo(node.id).filter((n) => !n.master);
      if (next.length > 0 && y < rect.y + rect.h - pad - TOUCH - this.s(30)) {
        line(`Prowadzi do: ${next.map((n) => n.name).join(', ')}.`, 10.5, COLORS.faint);
      }
    }

    // Przyciski: [akcja] [Zamknij szczegóły]
    const gap = this.s(8);
    const half = (w - gap) / 2;
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
    else if (status === 'needs-research') label = 'Zablokowane';
    else if (status === 'soon') label = 'Wkrótce';
    add(this.button(x, buttonY, half, label, style, action));
    add(this.button(x + half + gap, buttonY, half, 'Odznacz', 'secondary', () => this.select(null)));
    this.details.add(items);
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

  private select(id: string | null): void {
    this.selected = id;
    this.cancelArmedUntil = 0;
    this.refresh(true);
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
