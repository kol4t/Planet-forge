// Ekran „Badania stacji” (etap 2a planu stacji, decyzje właściciela 2026-11-09): osobne, większe drzewko badań
// stacji. Najpierw wybór kategorii (Produkcja, Flota, SI, Planetologia, Handel, Eksploracja), potem galaktyka kategorii:
// jądro w środku, badania na pierścieniach, mosty do innych kategorii na krawędzi. Panel: laboratorium orbitalne,
// magazyn stacji (z niego płaci się za badania), badanie w toku i szczegóły wybranego badania.
import Phaser from 'phaser';
import type { StationResearchView } from '../../app/GameController.ts';
import type { StationCategoryId } from '../../data/stationResearch.ts';
import { TOUCH, type Rect } from '../ui/layout.ts';
import { COLORS, FONTS, formatDuration, formatInt } from '../ui/theme.ts';
import { OverlayScene, type OverlaySceneDeps } from './OverlayScene.ts';

export interface StationResearchSceneData {
  category?: StationCategoryId;
}

type Node = StationResearchView['nodes'][number];

const STATUS_TEXT: Record<Node['status'], string> = {
  done: 'Zbadane',
  researching: 'W toku',
  available: 'Dostępne',
  busy: 'Laboratorium zajęte innym badaniem',
  'needs-lab': 'Wymaga wyższego Laboratorium orbitalnego',
  'needs-research': 'Najpierw wcześniejsze badania',
};

/** Promień pierścienia galaktyki kategorii (× rozmiar mapy) i rozstaw gałęzi (rad). */
const RING_STEP = 0.2;
const LANE_SPREAD = 0.62;

export class StationResearchScene extends OverlayScene {
  private category: StationCategoryId | null = null;
  private selected: string | null = null;
  private map: Phaser.GameObjects.Container | undefined;
  /** Położenia gwiazd badań na mapie (pt względem środka mapy) — do trafień palcem. */
  private spots: { id: string; x: number; y: number; r: number; category?: StationCategoryId }[] = [];
  private center = { x: 0, y: 0 };
  private live: { status: Phaser.GameObjects.Text; bar: Phaser.GameObjects.Graphics; rect: Rect } | null = null;

  constructor(deps: OverlaySceneDeps) {
    super('stationResearch', deps, { min: 0.6, max: 2.2 });
  }

  init(data: StationResearchSceneData): void {
    this.category = data?.category ?? null;
    this.selected = null;
  }

  create(): void {
    this.setupInput();
    this.relayout();
  }

  relayout(): void {
    const { bar } = this.frame(270, 320, true, 0.8);
    this.map?.destroy(true);
    this.spots = [];
    const view = this.deps.controller.stationResearchView();
    this.center = { x: this.area.x + this.area.w / 2, y: this.area.y + this.area.h / 2 };
    this.map = this.add.container(0, 0);
    if (this.category) this.drawGalaxy(view, this.category);
    else this.drawCategories(view);
    this.beginUi();
    this.buildBar(bar, view);
    this.buildPanel(view);
    this.applyTransform();
  }

  // ——— pasek ———

  private buildBar(bar: Rect, view: StationResearchView): void {
    this.panel(bar);
    const pad = 12 * this.u;
    const cat = this.category ? view.categories.find((c) => c.id === this.category) : null;
    this.text(bar.x + pad, bar.y + this.s(8), cat ? `BADANIA STACJI · ${cat.name.toUpperCase()}` : 'BADANIA STACJI', 16, COLORS.gold, { fontFamily: FONTS.serif });
    this.text(bar.x + pad, bar.y + this.s(31), `Laboratorium orbitalne poz. ${view.lab} · zbadane ${view.done} · magazyn stacji: ${formatInt(view.stock.metal)} metalu, ${formatInt(view.stock.crystal)} kryształów`, 11, COLORS.muted);
    const closeW = this.s(110);
    this.addButton(bar.x + bar.w - pad / 2 - closeW, bar.y + (bar.h - TOUCH) / 2, closeW, TOUCH, 'Zamknij', 'secondary', () => this.close());
    if (this.category) {
      const backW = this.s(130);
      this.addButton(bar.x + bar.w - pad - closeW - backW, bar.y + (bar.h - TOUCH) / 2, backW, TOUCH, '‹ Kategorie', 'secondary', () => this.openCategory(null));
    }
  }

  private openCategory(id: StationCategoryId | null): void {
    this.category = id;
    this.selected = null;
    this.resetView();
    this.relayout();
  }

  // ——— mapa: kategorie ———

  private drawCategories(view: StationResearchView): void {
    const g = this.add.graphics();
    this.map!.add(g);
    const cx = this.center.x;
    const cy = this.center.y;
    const R = Math.min(this.area.w, this.area.h) * 0.34;
    // Mosty między kategoriami: linie między kategoriami, które łączy choć jedno badanie.
    const pos = new Map<StationCategoryId, { x: number; y: number }>();
    view.categories.forEach((c, i) => {
      const a = -Math.PI / 2 + (i / view.categories.length) * Math.PI * 2;
      pos.set(c.id, { x: cx + Math.cos(a) * R, y: cy + Math.sin(a) * R });
    });
    const links = new Set<string>();
    for (const n of view.nodes) for (const r of n.requires) if (r.category !== n.category) links.add([r.category, n.category].sort().join('|'));
    g.lineStyle(this.px(1.5), COLORS.stoneHex, 0.45);
    for (const key of links) {
      const [a, b] = key.split('|') as [StationCategoryId, StationCategoryId];
      const p = pos.get(a)!;
      const q = pos.get(b)!;
      g.lineBetween(this.px(p.x), this.px(p.y), this.px(q.x), this.px(q.y));
    }
    // Jądro: stacja.
    g.fillStyle(COLORS.tealHex, 0.18).fillCircle(this.px(cx), this.px(cy), this.px(R * 0.32));
    g.lineStyle(this.px(2), COLORS.tealHex, 0.8).strokeEllipse(this.px(cx), this.px(cy), this.px(R * 0.42), this.px(R * 0.18));
    for (const c of view.categories) {
      const p = pos.get(c.id)!;
      const r = Math.max(TOUCH * 0.75, R * 0.24);
      g.fillStyle(0x0b1416, 0.95).fillCircle(this.px(p.x), this.px(p.y), this.px(r));
      g.lineStyle(this.px(3), c.color, 0.95).strokeCircle(this.px(p.x), this.px(p.y), this.px(r));
      // Postęp kategorii: łuk.
      if (c.done > 0) g.lineStyle(this.px(5), c.color, 1).beginPath().arc(this.px(p.x), this.px(p.y), this.px(r + 7), -Math.PI / 2, -Math.PI / 2 + (c.done / c.total) * Math.PI * 2).strokePath();
      const name = this.text(p.x, p.y - this.s(8), c.name, 14, COLORS.text, { fontStyle: '600' }, false).setOrigin(0.5);
      const count = this.text(p.x, p.y + this.s(12), `${c.done} / ${c.total}`, 11, COLORS.muted, {}, false).setOrigin(0.5);
      this.map!.add([name, count]);
      this.spots.push({ id: c.id, x: p.x - cx, y: p.y - cy, r: r + 8, category: c.id });
    }
  }

  // ——— mapa: galaktyka kategorii ———

  private nodeSpot(n: Node, R: number): { x: number; y: number } {
    const a = -Math.PI / 2 + n.lane * LANE_SPREAD / Math.max(1, n.ring * 0.75);
    const d = R * RING_STEP * (n.ring + 0.6);
    return { x: Math.cos(a) * d, y: Math.sin(a) * d };
  }

  private drawGalaxy(view: StationResearchView, id: StationCategoryId): void {
    const cat = view.categories.find((c) => c.id === id)!;
    const nodes = view.nodes.filter((n) => n.category === id);
    const g = this.add.graphics();
    this.map!.add(g);
    const cx = this.center.x;
    const cy = this.center.y;
    const maxRing = Math.max(...nodes.map((n) => n.ring));
    // Jądro przy dolnej krawędzi obszaru, ostatni pierścień (z podpisem i mostami) mieści się pod paskiem.
    const reach = RING_STEP * (maxRing + 0.6);
    const R = Math.min((this.area.h * 0.72) / reach, (this.area.w * 0.95) / reach);
    const oy = this.area.h * 0.4;
    // Pierścienie.
    g.lineStyle(this.px(1), cat.color, 0.18);
    for (let ring = 1; ring <= maxRing; ring++) g.strokeCircle(this.px(cx), this.px(cy + oy), this.px(R * RING_STEP * (ring + 0.6)));
    const at = new Map<string, { x: number; y: number }>();
    for (const n of nodes) {
      const p = this.nodeSpot(n, R);
      at.set(n.id, { x: p.x, y: p.y + oy });
    }
    // Jądro kategorii.
    g.fillStyle(cat.color, 0.25).fillCircle(this.px(cx), this.px(cy + oy), this.px(R * 0.06));
    // Połączenia w kategorii i mosty do innych.
    let bridgeIndex = 0;
    for (const n of nodes) {
      const p = at.get(n.id)!;
      if (n.requires.length === 0) {
        g.lineStyle(this.px(2), cat.color, 0.35).lineBetween(this.px(cx), this.px(cy + oy), this.px(cx + p.x), this.px(cy + p.y));
      }
      for (const r of n.requires) {
        const q = at.get(r.id);
        if (q) {
          const done = view.nodes.find((x) => x.id === r.id)?.status === 'done';
          g.lineStyle(this.px(2), cat.color, done ? 0.85 : 0.35).lineBetween(this.px(cx + q.x), this.px(cy + q.y), this.px(cx + p.x), this.px(cy + p.y));
          continue;
        }
        // Most: znacznik innej kategorii z boku gwiazdy, dotknięcie — przejście do tamtej kategorii.
        const other = view.categories.find((c) => c.id === r.category)!;
        const side = bridgeIndex++ % 2 === 0 ? 1 : -1;
        const bx = p.x + side * this.s(78);
        const by = p.y - this.s(30);
        g.lineStyle(this.px(1.5), other.color, 0.8);
        g.lineBetween(this.px(cx + bx), this.px(cy + by), this.px(cx + p.x), this.px(cy + p.y));
        g.fillStyle(0x0b1416, 0.95).fillRoundedRect(this.px(cx + bx - this.s(52)), this.px(cy + by - this.s(13)), this.px(this.s(104)), this.px(this.s(26)), this.px(this.s(13)));
        g.lineStyle(this.px(1.5), other.color, 0.9).strokeRoundedRect(this.px(cx + bx - this.s(52)), this.px(cy + by - this.s(13)), this.px(this.s(104)), this.px(this.s(26)), this.px(this.s(13)));
        const label = this.text(cx + bx, cy + by, `most · ${other.name}`, 10, COLORS.text, {}, false).setOrigin(0.5);
        this.map!.add(label);
        this.spots.push({ id: r.id, x: bx, y: by, r: this.s(30), category: r.category });
      }
    }
    // Gwiazdy badań.
    for (const n of nodes) {
      const p = at.get(n.id)!;
      const r = this.s(16);
      const color = n.status === 'done' ? cat.color : n.status === 'researching' ? COLORS.goldHex : n.status === 'available' ? 0xdfe7e1 : 0x4a5856;
      g.fillStyle(0x0b1416, 1).fillCircle(this.px(cx + p.x), this.px(cy + p.y), this.px(r));
      g.fillStyle(color, n.status === 'done' ? 0.9 : 0.25).fillCircle(this.px(cx + p.x), this.px(cy + p.y), this.px(r * 0.7));
      g.lineStyle(this.px(n.id === this.selected ? 3 : 1.5), n.id === this.selected ? COLORS.goldHex : color, 1).strokeCircle(this.px(cx + p.x), this.px(cy + p.y), this.px(r));
      const label = this.text(cx + p.x, cy + p.y + r + this.s(4), n.name, 11, n.status === 'done' ? COLORS.text : COLORS.muted, { align: 'center', wordWrap: { width: this.px(this.s(120)) } }, false).setOrigin(0.5, 0);
      this.map!.add(label);
      this.spots.push({ id: n.id, x: p.x, y: p.y, r: Math.max(TOUCH / 2, r + 6) });
    }
  }

  // ——— panel ———

  private buildPanel(view: StationResearchView): void {
    const rect = this.panelRect;
    this.panel(rect);
    const pad = this.s(14);
    const w = rect.w - 2 * pad;
    let y = rect.y + pad;
    const line = (content: string, size: number, color: string, extra: Phaser.Types.GameObjects.Text.TextStyle = {}, after = 6) => {
      const t = this.text(rect.x + pad, y, content, size, color, { wordWrap: { width: this.px(w) }, lineSpacing: this.px(2), ...extra });
      y += t.height / this.dpr + this.s(after);
      return t;
    };
    const bottom = rect.y + rect.h - pad;
    // Badanie w toku (pasek postępu odświeżany co 250 ms).
    const status = line('', 12, COLORS.gold, { fontStyle: '600' }, 4);
    const bar = this.add.graphics();
    this.ui!.add(bar);
    this.live = { status, bar, rect: { x: rect.x + pad, y, w, h: this.s(4) } };
    y += this.s(14);
    const node = this.selected ? view.nodes.find((n) => n.id === this.selected) : null;
    if (!view.built) {
      line('Najpierw zbuduj stację macierzystą (Imperium → karta stacji).', 13, COLORS.text);
      return;
    }
    if (!node) {
      if (view.lab === 0) {
        line('Laboratorium orbitalne', 16, COLORS.gold, { fontFamily: FONTS.serif });
        line('Badania stacji prowadzi Laboratorium orbitalne — zbuduj je w „Modułach” stacji. Płaci magazyn stacji: dowieź surowce transportowcem („Na stację”).', 12, COLORS.stone);
      } else {
        line(this.category ? 'Dotknij gwiazdy badania, żeby zobaczyć szczegóły. Znaczniki „most” prowadzą do innych kategorii.' : 'Wybierz kategorię. Linie między kategoriami to mosty — badania jednej kategorii otwierają badania w drugiej.', 12, COLORS.stone);
      }
      if (view.nextLabCost) {
        line(`Laboratorium poz. ${view.lab + 1}: ${formatInt(view.nextLabCost.metal)} metalu · ${formatInt(view.nextLabCost.crystal)} kryształów (magazyn stacji)${view.labUpgrading ? ` · rozbudowa: ${formatDuration(view.labUpgrading)}` : ''}`, 11.5, COLORS.muted);
        if (!view.labUpgrading && y + TOUCH <= bottom) {
          this.addButton(rect.x + pad, bottom - TOUCH, w, TOUCH, view.lab === 0 ? 'Zbuduj laboratorium' : `Laboratorium → poz. ${view.lab + 1}`, 'primary', () => this.act(this.deps.controller.upgradeStationLab()));
        }
      }
      return;
    }
    line(node.name, 17, COLORS.gold, { fontFamily: FONTS.serif }, 4);
    line(STATUS_TEXT[node.status], 11.5, node.status === 'available' ? COLORS.teal : node.status === 'done' ? COLORS.teal : COLORS.muted, { fontStyle: '600' });
    line(node.description, 12, COLORS.stone);
    for (const e of node.effects) line(e, 11.5, COLORS.text, {}, 3);
    y += this.s(4);
    if (node.requires.length > 0) line(`Wymaga: ${node.requires.map((r) => r.name).join(', ')}`, 11, COLORS.muted);
    if (node.status !== 'done') {
      line(`Koszt (magazyn stacji): ${formatInt(node.cost.metal)} metalu · ${formatInt(node.cost.crystal)} kryształów · ${formatDuration(node.seconds)} · laboratorium poz. ${node.labNeeded}`, 11, COLORS.muted);
    }
    if (node.status === 'available') {
      this.addButton(rect.x + pad, bottom - TOUCH, w, TOUCH, 'Rozpocznij badanie', 'primary', () => this.act(this.deps.controller.startStationResearch(node.id)));
    }
  }

  private act(result: { ok: boolean; message: string }): void {
    this.showToast(result.message, result.ok ? 'ok' : 'error', 3200);
    this.relayout();
  }

  protected onTap(px: number, py: number): void {
    const x = (px / this.dpr - this.center.x - this.pan.x / this.dpr) / this.zoom;
    const y = (py / this.dpr - this.center.y - this.pan.y / this.dpr) / this.zoom;
    const hit = this.spots.find((s) => Math.hypot(s.x - x, s.y - y) <= s.r / this.zoom + 4);
    if (!hit) return;
    if (!this.category) return this.openCategory(hit.category!);
    if (hit.category && hit.category !== this.category) {
      this.openCategory(hit.category);
      this.selected = hit.id;
      this.relayout();
      return;
    }
    this.selected = hit.id;
    this.relayout();
  }

  protected applyTransform(): void {
    if (!this.map) return;
    // Mapa skalowana wokół środka obszaru.
    const cx = this.px(this.center.x);
    const cy = this.px(this.center.y);
    this.map.setScale(this.zoom);
    this.map.setPosition(cx - cx * this.zoom + this.pan.x, cy - cy * this.zoom + this.pan.y);
  }

  protected refresh(): void {
    const live = this.live;
    if (!live) return;
    const view = this.deps.controller.stationResearchView();
    const c = view.current;
    live.status.setText(c ? `W toku: ${c.name} · ${formatDuration(c.secondsLeft)}` : view.lab > 0 ? 'Laboratorium orbitalne wolne' : 'Brak Laboratorium orbitalnego');
    live.bar.clear();
    const r = live.rect;
    live.bar.fillStyle(COLORS.panelBorder, 1).fillRect(this.px(r.x), this.px(r.y), this.px(r.w), this.px(r.h));
    if (c) live.bar.fillStyle(COLORS.goldHex, 1).fillRect(this.px(r.x), this.px(r.y), this.px(r.w * c.progress), this.px(r.h));
    // Ukończone badanie albo laboratorium — przebudowa widoku.
    const key = `${view.done}|${view.lab}|${c?.id ?? ''}`;
    if (this.lastKey && key !== this.lastKey) this.relayout();
    this.lastKey = key;
  }

  private lastKey = '';
}
