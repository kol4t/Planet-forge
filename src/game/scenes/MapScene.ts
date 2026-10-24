import Phaser from 'phaser';
import type { MapOccupant } from '../../app/GameController.ts';
import { findStar, parseAddress, SPIRAL, spiralPoint, type GasGiantLook, type StarSystem, type SystemPlanet, type SystemSummary } from '../../core/galaxy/galaxy.ts';
import { createRng } from '../../core/random/rng.ts';
import { compareGeology } from '../../core/economy/geology.ts';
import { generatePlanet } from '../../core/generation/generatePlanet.ts';
import { GALAXY_RULES, ZONE_LABELS } from '../../data/galaxy.ts';
import { findDefinition, STARTER } from '../../data/planets.ts';
import { PlanetThumbnail, THUMBNAIL_SIZE } from '../../planet-renderer/PlanetThumbnail.ts';
import type { ButtonStyle } from '../ui/Button.ts';
import { TOUCH, type Rect } from '../ui/layout.ts';
import { geologyLines } from '../ui/geologyText.ts';
import { COLORS, FONTS, formatDuration, formatInt } from '../ui/theme.ts';
import { OverlayScene, type OverlaySceneDeps } from './OverlayScene.ts';

/** Z czym otworzyć mapę: cała galaktyka albo od razu układ. */
export interface MapSceneData {
  system?: number;
}

const OCCUPANT_LABEL: Record<MapOccupant, string> = {
  you: 'Twoja planeta',
  bot: 'Miejsce startowe innego gracza (na razie bot)',
  alien: 'Forma obca',
  free: 'Wolna — do przejęcia',
};
const OCCUPANT_COLOR: Record<MapOccupant, number> = {
  you: COLORS.goldHex,
  bot: COLORS.dangerHex,
  alien: COLORS.antimatterHex,
  free: COLORS.tealHex,
};
const hex = (color: string) => Phaser.Display.Color.HexStringToColor(color).color;

/**
 * Ekran „Mapa”: galaktyka (układy jako gwiazdy; przesuwanie i przybliżanie palcami)
 * oraz widok układu (gwiazda, orbity, planety z miniaturami). Dotknięcie pokazuje szczegóły.
 */
export class MapScene extends OverlayScene {
  private mode: 'galaxy' | 'system' = 'galaxy';
  private systemIndex = 1;
  private world: Phaser.GameObjects.Container | undefined;
  private marks: Phaser.GameObjects.Graphics | undefined;
  private labels: { text: Phaser.GameObjects.Text; x: number; y: number; always: boolean }[] = [];
  private details: Phaser.GameObjects.Container | undefined;
  private thumbs: string[] = [];
  /** Środek mapy na ekranie i jednostka (px urządzenia na 1 jednostkę mapy). */
  private view = { cx: 0, cy: 0, unit: 1 };
  /** Zaznaczony układ (widok galaktyki) albo pozycja planety (widok układu). */
  private selected: number | null = null;
  private system: StarSystem | null = null;
  /** Położenia planet w widoku układu (px urządzenia). */
  private planetSpots: { position: number; x: number; y: number }[] = [];
  /** Pas asteroid w widoku układu (promień i pół szerokości, px urządzenia). */
  private beltRing: { r: number; half: number } | null = null;
  /** Odliczanie lotu statku w szczegółach planety. */
  private countdown: { text: Phaser.GameObjects.Text; target: string } | null = null;
  /** Komety przelatujące przez galaktykę (tylko wygląd; jednostki mapy na sekundę). */
  private comets: Phaser.GameObjects.Graphics | undefined;
  private cometList: { x: number; y: number; vx: number; vy: number; age: number; life: number }[] = [];
  private nextComet = 0;
  private readonly cometRng = createRng(`komety-${Date.now()}`);

  constructor(deps: OverlaySceneDeps) {
    super('map', deps, { min: 0.8, max: 4 });
  }

  init(data: MapSceneData): void {
    const index = data?.system;
    this.mode = index ? 'system' : 'galaxy';
    this.systemIndex = index ?? this.deps.controller.homeSystem;
    this.selected = this.mode === 'galaxy' ? this.systemIndex : null;
  }

  update(time: number, delta: number): void {
    super.update(time, delta);
    if (this.mode === 'galaxy') this.animateComets(delta / 1000);
  }

  create(): void {
    this.setupInput();
    this.relayout();
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => this.clearThumbs());
  }

  relayout(): void {
    const { bar } = this.frame(226, 256);
    this.panZoom = this.mode === 'galaxy';
    this.world?.destroy(true);
    this.details?.destroy(true);
    this.details = undefined;
    for (const label of this.labels) label.text.destroy();
    this.labels = [];
    this.clearThumbs();
    this.world = this.add.container(0, 0);
    if (this.mode === 'galaxy') this.buildGalaxy();
    else this.buildSystem();
    this.beginUi();
    this.buildTopBar(bar);
    this.panel(this.panelRect);
    this.applyTransform();
    this.refresh();
    this.buildDetails();
  }

  // ——— widok galaktyki ———

  private buildGalaxy(): void {
    const galaxy = this.deps.controller.galaxy;
    const radius = GALAXY_RULES.radius + 6;
    this.view = {
      cx: this.px(this.area.x + this.area.w / 2),
      cy: this.px(this.area.y + this.area.h / 2),
      unit: this.px(Math.min(this.area.w, this.area.h) / 2 / radius),
    };
    const U = this.view.unit;
    // Tło: jasne zgrubienie centralne, dwa ramiona spiralne z tysiącami gwiazd i pasami pyłu.
    const art = this.add.image(0, 0, galaxyArt(this)).setDisplaySize(2 * radius * U, 2 * radius * U);
    const g = this.add.graphics();
    for (const s of galaxy.systems) {
      const color = hex(findStar(s.star).color);
      const r = Math.max(1.4 * this.dpr, (0.55 + s.planetCount * 0.04) * U);
      g.fillStyle(color, 0.16).fillCircle(s.x * U, s.y * U, r * 2);
      g.fillStyle(color, 1).fillCircle(s.x * U, s.y * U, r);
    }
    this.marks = this.add.graphics();
    this.comets = this.add.graphics();
    this.world!.add([art, g, this.comets, this.marks]);
    const home = this.deps.controller.homeSystem;
    for (const s of galaxy.systems) {
      const own = s.index === home;
      const text = this.add
        .text(0, 0, own ? `${s.name}\nTwój układ` : s.name, {
          fontFamily: FONTS.body,
          fontSize: `${this.px(this.s(own ? 10.5 : 9.5))}px`,
          fontStyle: own ? '600' : 'normal',
          color: own ? COLORS.gold : COLORS.muted,
          align: 'center',
        })
        .setOrigin(0.5, 0);
      this.labels.push({ text, x: s.x, y: s.y, always: own });
    }
  }

  private drawGalaxyMarks(): void {
    const g = this.marks;
    if (!g || this.mode !== 'galaxy') return;
    g.clear();
    const U = this.view.unit;
    const line = Math.max(1, this.dpr) / this.zoom;
    const home = this.deps.controller.galaxy.systems[this.deps.controller.homeSystem - 1];
    if (home) g.lineStyle(line * 2, COLORS.goldHex, 1).strokeCircle(home.x * U, home.y * U, 3.2 * U);
    const selected = this.selected ? this.deps.controller.galaxy.systems[this.selected - 1] : undefined;
    if (selected) g.lineStyle(line * 1.6, 0xffffff, 0.9).strokeCircle(selected.x * U, selected.y * U, 4.2 * U);
  }

  // ——— widok układu ———

  private buildSystem(): void {
    const controller = this.deps.controller;
    const system = controller.system(this.systemIndex);
    this.system = system;
    if (!system) return;
    const cx = this.px(this.area.x + this.area.w / 2);
    const cy = this.px(this.area.y + this.area.h / 2);
    this.view = { cx, cy, unit: 1 };
    const maxR = this.px(Math.min(this.area.w, this.area.h) / 2) - this.px(this.s(30));
    const minR = Math.max(this.px(this.s(46)), maxR * 0.2);
    const n = system.planets.length;
    const g = this.add.graphics();
    this.drawStar(g, system);
    this.planetSpots = [];
    const thumbD = this.px(this.s(n > 7 ? 26 : 30));
    const items: Phaser.GameObjects.GameObject[] = [g];
    // Orbity w równych odstępach (czytelniej niż w prawdziwej skali); kolejność jak od gwiazdy.
    const orbit = (i: number) => (n === 1 ? minR : minR + ((maxR - minR) * i) / (n - 1));
    this.beltRing = null;
    if (system.belt) {
      const inner = orbit(system.belt.after - 1);
      const outer = orbit(system.belt.after);
      this.beltRing = { r: (inner + outer) / 2, half: (outer - inner) * 0.3 };
      drawBelt(g, this.beltRing.r, this.beltRing.half, `${system.index}`, this.dpr);
    }
    system.planets.forEach((p, i) => {
      const r = orbit(i);
      g.lineStyle(Math.max(1, this.dpr * 0.7), COLORS.panelBorder, 0.9).strokeCircle(0, 0, r);
      const x = Math.cos(p.angle) * r;
      const y = Math.sin(p.angle) * r;
      this.planetSpots.push({ position: p.position, x: cx + x, y: cy + y });
      const own = controller.slotAt(p.address) >= 0;
      if (p.body === 'gas-giant' && p.gas && !own) {
        // Gazowy olbrzym: większa tarcza w pikselowe pasy, czasem z pierścieniem.
        const giant = this.add.graphics();
        drawGasGiant(giant, x, y, thumbD * 0.8, p.gas, this.dpr);
        items.push(giant);
      } else {
        const key = `map-thumb-${p.address}-${Date.now()}`;
        const texture = this.textures.createCanvas(key, THUMBNAIL_SIZE, THUMBNAIL_SIZE)!;
        texture.setFilter(Phaser.Textures.FilterMode.NEAREST);
        new PlanetThumbnail(this.planetFor(p)).draw(texture.context, p.position * 1.3);
        texture.refresh();
        this.thumbs.push(key);
        items.push(this.add.image(x, y, key).setDisplaySize(thumbD, thumbD));
      }
      const text = this.add
        .text(0, 0, `${String.fromCharCode(97 + p.position)}`, {
          fontFamily: FONTS.body,
          fontSize: `${this.px(this.s(10.5))}px`,
          fontStyle: '600',
          color: COLORS.muted,
        })
        .setOrigin(0.5, 0);
      this.labels.push({ text, x: x / this.view.unit, y: y / this.view.unit + thumbD * (p.body === 'gas-giant' ? 0.85 : 0.62), always: true });
    });
    this.marks = this.add.graphics();
    items.push(this.marks);
    this.world!.add(items);
  }

  /** Planeta do miniatury: Twoja (z prawdziwym wyglądem) albo z galaktyki. */
  private planetFor(p: SystemPlanet) {
    const controller = this.deps.controller;
    const own = controller.planetAtSlot(controller.slotAt(p.address));
    if (own) return own;
    return generatePlanet(findDefinition(p.definitionId) ?? STARTER.definition, p.address);
  }

  private drawStar(g: Phaser.GameObjects.Graphics, system: StarSystem): void {
    const star = findStar(system.star);
    const color = hex(star.color);
    const r = this.px(this.s(16));
    if (system.star === 'black-hole') {
      g.lineStyle(this.px(this.s(5)), color, 0.35).strokeEllipse(0, 0, r * 3.6, r * 1.3);
      g.lineStyle(this.px(this.s(2)), color, 0.9).strokeEllipse(0, 0, r * 3, r * 1.05);
      g.fillStyle(0x000000, 1).fillCircle(0, 0, r * 0.85);
      g.lineStyle(this.px(1.2), color, 0.8).strokeCircle(0, 0, r * 0.88);
      return;
    }
    const glow = (x: number, y: number, size: number) => {
      for (const [k, a] of [
        [2.6, 0.06],
        [1.8, 0.12],
        [1.3, 0.25],
      ] as const) {
        g.fillStyle(color, a).fillCircle(x, y, size * k);
      }
      g.fillStyle(color, 1).fillCircle(x, y, size);
    };
    if (system.star === 'binary') {
      glow(-r * 0.7, 0, r * 0.7);
      glow(r * 0.8, r * 0.2, r * 0.55);
    } else if (system.star === 'pulsar') {
      g.fillStyle(color, 0.25).fillTriangle(0, 0, -r * 0.5, -r * 4, r * 0.5, -r * 4);
      g.fillStyle(color, 0.25).fillTriangle(0, 0, -r * 0.5, r * 4, r * 0.5, r * 4);
      glow(0, 0, r * 0.45);
    } else {
      glow(0, 0, system.star === 'blue-giant' ? r * 1.25 : system.star === 'red-dwarf' ? r * 0.7 : r);
    }
  }

  private drawSystemMarks(): void {
    const g = this.marks;
    const system = this.system;
    if (!g || !system || this.mode !== 'system') return;
    g.clear();
    const controller = this.deps.controller;
    const ring = this.px(this.s(system.planets.length > 7 ? 18 : 20));
    for (const p of system.planets) {
      const spot = this.planetSpots.find((s) => s.position === p.position)!;
      const x = spot.x - this.view.cx;
      const y = spot.y - this.view.cy;
      const occupant = controller.occupantAt(p);
      if (occupant !== 'free') {
        g.lineStyle(Math.max(1.5, this.dpr * 1.3), OCCUPANT_COLOR[occupant], occupant === 'you' ? 1 : 0.75).strokeCircle(x, y, ring);
      }
      if (p.address === controller.address) g.fillStyle(COLORS.goldHex, 1).fillCircle(x + ring * 0.75, y - ring * 0.75, this.px(3));
      if (controller.missionTo(p.address)) {
        // Statek w drodze: przerywany złoty pierścień i mały trójkąt.
        for (let k = 0; k < 12; k += 2) {
          g.lineStyle(Math.max(1.5, this.dpr), COLORS.goldHex, 0.9);
          g.beginPath();
          g.arc(x, y, ring * 1.15, (k * Math.PI) / 6, ((k + 1) * Math.PI) / 6, false);
          g.strokePath();
        }
        const sx = x - ring * 1.1;
        const sy = y - ring * 1.1;
        const t = this.px(4);
        g.fillStyle(COLORS.goldHex, 1).fillTriangle(sx + t, sy, sx - t, sy - t * 0.7, sx - t, sy + t * 0.7);
      }
      if (p.position === this.selected) g.lineStyle(Math.max(1.5, this.dpr * 1.2), 0xffffff, 0.9).strokeCircle(x, y, ring * 1.3);
    }
    if (this.selected === BELT && this.beltRing) {
      g.lineStyle(Math.max(1, this.dpr), 0xffffff, 0.5);
      g.strokeCircle(0, 0, this.beltRing.r - this.beltRing.half);
      g.strokeCircle(0, 0, this.beltRing.r + this.beltRing.half);
    }
  }

  /** Komety: kilka naraz, przelatują przez galaktykę po prostej, z warkoczem. */
  private animateComets(dt: number): void {
    const g = this.comets;
    if (!g) return;
    const R = GALAXY_RULES.radius;
    const rng = this.cometRng;
    this.nextComet -= dt;
    if (this.nextComet <= 0 && this.cometList.length < 3) {
      this.nextComet = rng.range(3, 8);
      // Start za krawędzią galaktyki, lot mniej więcej przez nią (12–20 s).
      const from = rng.range(0, Math.PI * 2);
      const to = from + Math.PI + rng.range(-0.7, 0.7);
      const start = { x: Math.cos(from) * (R + 12), y: Math.sin(from) * (R + 12) };
      const end = { x: Math.cos(to) * (R + 12), y: Math.sin(to) * (R + 12) };
      const life = rng.range(12, 20);
      this.cometList.push({ ...start, vx: (end.x - start.x) / life, vy: (end.y - start.y) / life, age: 0, life });
    }
    g.clear();
    const U = this.view.unit;
    const width = Math.max(1, this.dpr) / this.zoom;
    this.cometList = this.cometList.filter((c) => (c.age += dt) < c.life);
    for (const c of this.cometList) {
      c.x += c.vx * dt;
      c.y += c.vy * dt;
      // Pojawia się i znika płynnie na krańcach lotu.
      const fade = Math.min(1, c.age / 1.5, (c.life - c.age) / 1.5);
      const speed = Math.hypot(c.vx, c.vy) || 1;
      const tail = 9;
      for (let i = 0; i < 6; i++) {
        const a = (c.x - (c.vx / speed) * tail * (i / 6)) * U;
        const b = (c.y - (c.vy / speed) * tail * (i / 6)) * U;
        const a2 = (c.x - (c.vx / speed) * tail * ((i + 1) / 6)) * U;
        const b2 = (c.y - (c.vy / speed) * tail * ((i + 1) / 6)) * U;
        g.lineStyle(width * (2.2 - i * 0.3), 0xcfe8ff, fade * 0.55 * (1 - i / 6)).lineBetween(a, b, a2, b2);
      }
      g.fillStyle(0xffffff, fade).fillCircle(c.x * U, c.y * U, width * 1.8);
    }
    // Statki kolonizacyjne: złota przerywana trasa i statek w miejscu zgodnym z postępem lotu.
    const systems = this.deps.controller.galaxy.systems;
    for (const m of this.deps.controller.missionsView()) {
      const a = systems[(parseAddress(m.from)?.system ?? 1) - 1];
      const b = systems[(parseAddress(m.target)?.system ?? 1) - 1];
      if (!a || !b) continue;
      const steps = 14;
      for (let i = 0; i < steps; i += 2) {
        const t0 = i / steps;
        const t1 = (i + 1) / steps;
        g.lineStyle(width * 1.4, COLORS.goldHex, 0.7).lineBetween(
          (a.x + (b.x - a.x) * t0) * U,
          (a.y + (b.y - a.y) * t0) * U,
          (a.x + (b.x - a.x) * t1) * U,
          (a.y + (b.y - a.y) * t1) * U,
        );
      }
      const pulse = 0.75 + 0.25 * Math.sin(this.time.now / 250);
      g.fillStyle(COLORS.goldHex, pulse).fillCircle((a.x + (b.x - a.x) * m.progress) * U, (a.y + (b.y - a.y) * m.progress) * U, width * 3);
    }
  }

  // ——— wspólne ———

  protected applyTransform(): void {
    const scale = this.view.unit * this.zoom;
    if (this.mode === 'galaxy') {
      const limit = GALAXY_RULES.radius * scale * 0.9;
      this.pan.x = Math.max(-limit, Math.min(limit, this.pan.x));
      this.pan.y = Math.max(-limit, Math.min(limit, this.pan.y));
    }
    const cx = this.view.cx + this.pan.x;
    const cy = this.view.cy + this.pan.y;
    this.world?.setPosition(cx, cy).setScale(this.zoom);
    // Nazwy układów dopiero przy przybliżeniu (Twój układ — zawsze).
    const showAll = this.mode === 'system' || (scale * GALAXY_RULES.minSpacing) / this.dpr >= 70;
    const area = this.area;
    for (const label of this.labels) {
      const x = cx + label.x * scale;
      const y = cy + label.y * scale + (this.mode === 'galaxy' ? 2.4 * scale + this.px(2) : 0);
      const inside = x > this.px(area.x) && x < this.px(area.x + area.w) && y > this.px(area.y) && y < this.px(area.y + area.h);
      label.text.setPosition(x, y).setVisible(inside && (label.always || showAll));
    }
    this.drawGalaxyMarks();
  }

  protected refresh(): void {
    this.drawGalaxyMarks();
    this.drawSystemMarks();
    const live = this.countdown;
    if (live) {
      const mission = this.deps.controller.missionsView().find((m) => m.target === live.target);
      if (mission) live.text.setText(`Statek w drodze — przylot za ${formatDuration(mission.secondsLeft)}`);
      else {
        // Statek dotarł: kolonia gotowa — szczegóły od nowa.
        this.countdown = null;
        this.buildDetails();
      }
    }
  }

  /** Po wysłaniu / zawróceniu statku: komunikat i odświeżone szczegóły. */
  private afterShip(result: { ok: boolean; message: string }): void {
    this.showToast(result.message, result.ok ? 'ok' : 'error', 3200);
    this.buildDetails();
    this.refresh();
  }

  protected onTap(px: number, py: number): void {
    if (this.mode === 'galaxy') {
      const scale = this.view.unit * this.zoom;
      const gx = (px - this.view.cx - this.pan.x) / scale;
      const gy = (py - this.view.cy - this.pan.y) / scale;
      // Cel dotykowy co najmniej ~24 pt promienia, nawet przy oddaleniu.
      const reach = Math.max(GALAXY_RULES.minSpacing * 0.45, (24 * this.dpr) / scale);
      let best: SystemSummary | null = null;
      let bestD = reach;
      for (const s of this.deps.controller.galaxy.systems) {
        const d = Math.hypot(s.x - gx, s.y - gy);
        if (d <= bestD) {
          best = s;
          bestD = d;
        }
      }
      this.selected = best?.index ?? null;
    } else {
      const reach = this.px(28);
      let best: number | null = null;
      let bestD = reach;
      for (const spot of this.planetSpots) {
        const d = Math.hypot(spot.x - px, spot.y - py);
        if (d <= bestD) {
          best = spot.position;
          bestD = d;
        }
      }
      if (best === null && this.beltRing) {
        const d = Math.hypot(px - this.view.cx, py - this.view.cy);
        if (Math.abs(d - this.beltRing.r) <= Math.max(this.beltRing.half, this.px(14))) best = BELT;
      }
      this.selected = best;
    }
    this.refresh();
    this.buildDetails();
  }

  private openSystem(index: number): void {
    this.mode = 'system';
    this.systemIndex = index;
    this.selected = null;
    this.resetView();
    this.relayout();
  }

  private openGalaxy(): void {
    this.mode = 'galaxy';
    this.selected = this.systemIndex;
    this.resetView();
    this.relayout();
  }

  private clearThumbs(): void {
    for (const key of this.thumbs) if (this.textures.exists(key)) this.textures.remove(key);
    this.thumbs = [];
  }

  // ——— panele ———

  private buildTopBar(bar: Rect): void {
    this.panel(bar);
    const pad = 14 * this.u;
    const closeW = 104 * this.u;
    const controller = this.deps.controller;
    const galaxy = controller.galaxy;
    const title = this.mode === 'galaxy' ? `MAPA · ${galaxy.name.toUpperCase()}` : `UKŁAD ${this.system?.name ?? ''}`;
    const sub =
      this.mode === 'galaxy'
        ? `${galaxy.systems.length} układów · Twój układ: ${galaxy.systems[controller.homeSystem - 1]?.name ?? ''} (1:${controller.homeSystem})`
        : `Adres 1:${this.systemIndex} · ${this.system ? findStar(this.system.star).label : ''}`;
    const backW = this.mode === 'system' ? 112 * this.u : 0;
    this.text(bar.x + pad, bar.y + this.s(8), title, 15, COLORS.gold, { fontFamily: FONTS.serif, letterSpacing: 2, fixedWidth: this.px(bar.w - 2 * pad - closeW - backW) });
    this.text(bar.x + pad, bar.y + this.s(30), sub, 10.5, COLORS.muted, { fixedWidth: this.px(bar.w - 2 * pad - closeW - backW) });
    const y = bar.y + (bar.h - TOUCH) / 2;
    if (this.mode === 'system') {
      this.addButton(bar.x + bar.w - pad / 2 - closeW - this.s(8) - backW, y, backW, TOUCH, 'Galaktyka', 'secondary', () => this.openGalaxy());
    }
    this.addButton(bar.x + bar.w - pad / 2 - closeW, y, closeW, TOUCH, 'Zamknij', 'secondary', () => this.close());
  }

  private buildDetails(): void {
    this.countdown = null;
    this.details?.destroy(true);
    this.details = this.add.container(0, 0).setDepth(11);
    const items: Phaser.GameObjects.GameObject[] = [];
    const rect = this.panelRect;
    const pad = 14 * this.u;
    const w = rect.w - 2 * pad;
    const x = rect.x + pad;
    let y = rect.y + pad - this.s(2);
    const line = (content: string, size: number, color: string, extra: Phaser.Types.GameObjects.Text.TextStyle = {}, after = 6) => {
      const t = this.text(x, y, content, size, color, { wordWrap: { width: this.px(w) }, lineSpacing: this.px(2), ...extra }, false);
      items.push(t);
      y += t.height / this.dpr + this.s(after);
      return t;
    };
    const buttonY = rect.y + rect.h - pad - TOUCH;
    const gap = this.s(8);
    const half = (w - gap) / 2;
    const buttons = (left: [string, ButtonStyle, () => void], right: [string, ButtonStyle, () => void]) => {
      items.push(this.button(x, buttonY, half, ...left), this.button(x + half + gap, buttonY, half, ...right));
    };
    const controller = this.deps.controller;

    if (this.mode === 'galaxy') {
      const s = this.selected ? controller.galaxy.systems[this.selected - 1] : undefined;
      if (!s) {
        line('Galaktyka', 18, COLORS.gold, { fontFamily: FONTS.serif });
        line('Każdy punkt to układ gwiezdny. Przesuń palcem, szczypnij, aby przybliżyć; dotknij układu, aby zobaczyć szczegóły.', 11.5, COLORS.muted);
        line('Puste miejsca między układami zostaną na stacje kosmiczne, porty handlowe i planety gildii (wkrótce).', 11, COLORS.faint);
        buttons(['Twój układ', 'primary', () => this.openSystem(controller.homeSystem)], ['Zamknij', 'secondary', () => this.close()]);
      } else {
        const star = findStar(s.star);
        const system = controller.system(s.index)!;
        const own = s.index === controller.homeSystem;
        const homes = system.planets.filter((p) => p.occupant === 'home').length;
        line(s.name, 18, COLORS.gold, { fontFamily: FONTS.serif }, 2);
        line(`Układ 1:${s.index}${own ? ' · Twój układ' : ''}`, 10.5, own ? COLORS.gold : COLORS.teal, { fontStyle: '600' });
        line(`${star.label} — ${star.description}`, 11.5, COLORS.muted);
        const giants = system.planets.filter((p) => p.body === 'gas-giant').length;
        line(
          `Planet: ${s.planetCount} (gazowe olbrzymy: ${giants}) · miejsca startowe graczy: ${homes} · formy obce: ${system.planets.filter((p) => p.occupant === 'alien').length}${system.belt ? ' · pas asteroid' : ''}`,
          11.5,
          COLORS.text,
        );
        const ships = controller.missionsView().filter((m) => parseAddress(m.target)?.system === s.index);
        if (ships.length) line(`Statek kolonizacyjny w drodze: ${ships.map((m) => `${m.targetName} (${formatDuration(m.secondsLeft)})`).join(', ')}`, 11, COLORS.gold);
        buttons(['Pokaż układ', 'primary', () => this.openSystem(s.index)], ['Odznacz', 'secondary', () => this.onTap(-1e6, -1e6)]);
      }
      this.details.add(items);
      return;
    }

    const system = this.system;
    if (system?.belt && this.selected === BELT) {
      line('Pas asteroid', 18, COLORS.gold, { fontFamily: FONTS.serif }, 2);
      line(`${system.name} · między orbitami ${letter(system.belt.after)} i ${letter(system.belt.after + 1)}`, 10.5, COLORS.stone, { fontStyle: '600' });
      line('Tysiące skalnych odłamków na wspólnej orbicie. W przyszłości: wydobycie surowców z asteroid (wkrótce).', 11.5, COLORS.muted);
      buttons(['Wydobycie wkrótce', 'disabled', () => undefined], ['Odznacz', 'secondary', () => this.onTap(-1e6, -1e6)]);
      this.details.add(items);
      return;
    }
    const p = system && this.selected && this.selected > 0 ? system.planets[this.selected - 1] : undefined;
    if (!system || !p) {
      const star = system ? findStar(system.star) : null;
      line(system?.name ?? '', 18, COLORS.gold, { fontFamily: FONTS.serif }, 2);
      if (star) line(`${star.label} — ${star.description}`, 11.5, COLORS.muted);
      line('Dotknij planety: typ, odległość od gwiazdy i kto ją zajmuje. Złoty pierścień — Twoja, czerwony — inny gracz, fioletowy — forma obca, bez pierścienia — wolna.', 11, COLORS.faint);
      buttons(['Galaktyka', 'secondary', () => this.openGalaxy()], ['Zamknij', 'secondary', () => this.close()]);
      this.details.add(items);
      return;
    }
    const occupant = controller.occupantAt(p);
    const slot = controller.slotAt(p.address);
    if (p.body === 'gas-giant' && slot < 0) {
      line(p.name, 18, COLORS.gold, { fontFamily: FONTS.serif }, 2);
      line(`${p.address} · Gazowy olbrzym`, 10.5, COLORS.stone, { fontStyle: '600' });
      line(
        `Strefa ${ZONE_LABELS[p.zone]} (${String(p.orbit).replace('.', ',')} j.a.)${p.gas?.rings ? ' · z pierścieniami' : ''}. Bez stałej powierzchni — nie da się go skolonizować.`,
        11.5,
        COLORS.text,
      );
      line('W przyszłości: stacje wydobycia gazu na orbicie (wkrótce).', 11, COLORS.muted);
      buttons(['Gazowy olbrzym', 'disabled', () => this.showToast(controller.colonize(p.address).message, 'info', 3200)], [
        'Odznacz',
        'secondary',
        () => this.onTap(-1e6, -1e6),
      ]);
      this.details.add(items);
      return;
    }
    const planet = this.planetFor(p);
    const rich = planet.gameplay.richness;
    line(occupant === 'you' ? planet.displayName : p.name, 18, COLORS.gold, { fontFamily: FONTS.serif }, 2);
    line(`${p.address} · ${OCCUPANT_LABEL[occupant]}`, 10.5, Phaser.Display.Color.IntegerToColor(OCCUPANT_COLOR[occupant]).rgba, { fontStyle: '600' });
    line(
      `${planet.category} · ${planet.gameplay.sizeClass.label} · ${formatInt(planet.gameplay.radiusKm)} km · strefa ${ZONE_LABELS[p.zone]} (${String(p.orbit).replace('.', ',')} j.a.)`,
      11.5,
      COLORS.text,
    );
    line(
      `Bogactwo złóż: metal ${Math.round(rich.metal * 100)}% · kryształy ${Math.round(rich.crystal * 100)}% · energia ${Math.round(rich.energy * 100)}%`,
      11,
      COLORS.muted,
      {},
      2,
    );
    // Geologia: pola i złoża (własna planeta — ile zostało) oraz porównanie z planetą, na której jesteś.
    const geology = controller.geologyAt(planet, p.address);
    const here = p.address === controller.address;
    const compare = here ? null : { name: controller.planet.displayName, diff: compareGeology(geology, controller.geologyAt(controller.planet, controller.address)) };
    for (const text of geologyLines(geology, compare)) line(text, 11, COLORS.stone, {}, 2);
    y += this.s(4);
    let action: [string, ButtonStyle, () => void];
    if (occupant === 'you') {
      action =
        p.address === controller.address
          ? ['Tu jesteś', 'disabled', () => undefined]
          : ['Przejdź', 'primary', () => this.finish(controller.switchPlanet(slot))];
    } else if (occupant === 'free' && this.systemIndex === controller.homeSystem) {
      action = ['Skolonizuj', 'primary', () => this.finish(controller.colonize(p.address))];
    } else if (occupant === 'free') {
      // Inny układ: statek kolonizacyjny (po badaniu „Napęd międzygwiezdny”).
      const mission = controller.missionTo(p.address);
      const cost = controller.colonyShipCost;
      if (mission) {
        this.countdown = { text: line('', 11.5, COLORS.gold, { fontStyle: '600' }), target: p.address };
        action = ['Zawróć statek', 'secondary', () => this.afterShip(controller.cancelMission(p.address))];
      } else if (controller.colonyShipUnlocked) {
        line(
          `Statek kolonizacyjny: ${formatInt(cost.metal)} metalu · ${formatInt(cost.crystal)} kryształów (z ${controller.planet.displayName}) · lot ${formatDuration(controller.flightSeconds(this.systemIndex))}`,
          11,
          COLORS.text,
        );
        action = ['Wyślij statek', 'primary', () => this.afterShip(controller.sendColonyShip(p.address))];
      } else {
        line('Do innych układów poleci statek kolonizacyjny — najpierw badanie „Napęd międzygwiezdny” (Eksploracja).', 11, COLORS.faint);
        action = ['Wymaga badania', 'disabled', () => this.showToast(controller.colonize(p.address).message, 'info', 3600)];
      }
    } else {
      action = [occupant === 'alien' ? 'Forma obca' : 'Inny gracz', 'disabled', () => this.showToast(controller.colonize(p.address).message, 'info', 3200)];
    }
    // Wyszarzony przycisk też wyjaśnia powód po dotknięciu.
    buttons(action, ['Odznacz', 'secondary', () => this.onTap(-1e6, -1e6)]);
    this.details.add(items);
  }

  /** Przejście albo kolonizacja udana → zamknij mapę i pokaż planetę. */
  private finish(result: { ok: boolean; message: string }): void {
    if (!result.ok) {
      this.showToast(result.message, 'error', 3200);
      return;
    }
    this.close(result.message);
  }
}

/** Zaznaczenie pasa asteroid (zamiast numeru orbity). */
const BELT = -1;
const letter = (position: number) => String.fromCharCode(97 + position);

/** Pas asteroid: pierścień drobnych, nieregularnych okruchów (stałe położenie z adresu układu). */
function drawBelt(g: Phaser.GameObjects.Graphics, r: number, half: number, seed: string, dpr: number): void {
  const rng = createRng(`pas-${seed}`);
  for (let i = 0; i < 480; i++) {
    const a = rng.range(0, Math.PI * 2);
    const d = r + (rng.next() + rng.next() - 1) * half;
    const size = rng.range(0.6, 1.8) * dpr;
    g.fillStyle(rng.next() < 0.7 ? COLORS.stoneHex : 0x8a7f6c, rng.range(0.35, 0.8)).fillRect(Math.cos(a) * d, Math.sin(a) * d, size, size);
  }
}

/** Gazowy olbrzym: tarcza z poziomych pikselowych pasów, cień po nocnej stronie, opcjonalnie pierścień. */
function drawGasGiant(g: Phaser.GameObjects.Graphics, x: number, y: number, r: number, look: GasGiantLook, dpr: number): void {
  const ring = (front: boolean) => {
    const points: Phaser.Math.Vector2[] = [];
    for (let i = 0; i <= 32; i++) {
      const a = (front ? 0 : Math.PI) + (Math.PI * i) / 32;
      points.push(new Phaser.Math.Vector2(x + Math.cos(a) * r * 1.75, y + Math.sin(a) * r * 0.5));
    }
    g.lineStyle(Math.max(1.5, r * 0.16), hex(look.bands[2] ?? look.bands[0]!), 0.75).strokePoints(points, false);
  };
  if (look.rings) ring(false);
  const stripes = Math.max(9, Math.round((r * 2) / (2.2 * dpr)));
  const h = (2 * r) / stripes;
  for (let i = 0; i < stripes; i++) {
    const cy = -r + (i + 0.5) * h;
    const w = 2 * Math.sqrt(Math.max(0, r * r - cy * cy));
    const band = look.bands[Math.floor((i / stripes) * look.bands.length * 2) % look.bands.length]!;
    g.fillStyle(hex(band), 1).fillRect(Math.round(x - w / 2), Math.round(y + cy - h / 2), Math.round(w), Math.ceil(h));
    // Nocna strona: ciemniejszy prawy brzeg.
    g.fillStyle(0x000000, 0.35).fillRect(Math.round(x + w / 2 - w * 0.28), Math.round(y + cy - h / 2), Math.round(w * 0.28), Math.ceil(h));
  }
  if (look.rings) ring(true);
}

/**
 * Tło galaktyki (rysowane raz, zapamiętane jako tekstura): jasne zgrubienie centralne,
 * dwa ramiona spirali logarytmicznej z tysiącami gwiazd, obłoki wodoru i ciemne pasy pyłu.
 */
function galaxyArt(scene: Phaser.Scene): string {
  const key = 'galaxy-art-v3';
  if (scene.textures.exists(key)) return key;
  const T = 1024;
  const texture = scene.textures.createCanvas(key, T, T)!;
  const ctx = texture.context;
  const R = GALAXY_RULES.radius;
  const k = T / 2 / (R + 6);
  const c = T / 2;
  const rng = createRng('galaktyka-tlo');
  const gauss = () => (rng.next() + rng.next() + rng.next() - 1.5) * 1.15;
  const dot = (x: number, y: number, size: number, color: string) => {
    ctx.fillStyle = color;
    ctx.fillRect(c + x * k - size / 2, c + y * k - size / 2, size, size);
  };
  // Poświata dysku i jądra.
  const glow = ctx.createRadialGradient(c, c, 0, c, c, R * k);
  glow.addColorStop(0, 'rgba(255,236,204,0.55)');
  glow.addColorStop(0.1, 'rgba(250,222,176,0.28)');
  glow.addColorStop(0.35, 'rgba(150,176,210,0.08)');
  glow.addColorStop(1, 'rgba(90,120,150,0)');
  ctx.fillStyle = glow;
  ctx.fillRect(0, 0, T, T);
  ctx.globalCompositeOperation = 'lighter';
  // Ramiona: gęsto przy osi, rzadziej na zewnątrz; wewnątrz ciepłe, na obrzeżach niebieskawe gwiazdy.
  for (let i = 0; i < 11000; i++) {
    const arm = rng.int(0, SPIRAL.arms - 1);
    const r = R * (0.1 + 0.95 * rng.next() ** 0.9);
    const p = spiralPoint(arm, r, R);
    const spread = r * (0.06 + 0.12 * rng.next());
    const t = r / R;
    const warm = Math.max(0, 1 - t * 1.6);
    const color = `rgba(${Math.round(175 + 80 * warm)},${Math.round(200 + 30 * warm)},${Math.round(255 - 55 * warm)},${(0.14 + 0.3 * rng.next()) * (1.1 - t * 0.5)})`;
    dot(p.x + gauss() * spread, p.y + gauss() * spread, rng.range(0.8, 2.2), color);
    if (rng.next() < 0.02) dot(p.x + gauss() * spread, p.y + gauss() * spread, rng.range(2.5, 4.5), 'rgba(255,140,175,0.22)');
  }
  // Zgrubienie centralne.
  for (let i = 0; i < 3500; i++) {
    const r = R * 0.13 * Math.abs(gauss());
    const a = rng.range(0, Math.PI * 2);
    dot(Math.cos(a) * r, Math.sin(a) * r * 0.85, rng.range(0.8, 2), `rgba(255,228,190,${0.12 + 0.2 * rng.next()})`);
  }
  // Rozproszone gwiazdy dysku między ramionami.
  for (let i = 0; i < 2500; i++) {
    const r = R * Math.sqrt(rng.next());
    const a = rng.range(0, Math.PI * 2);
    dot(Math.cos(a) * r, Math.sin(a) * r, rng.range(0.6, 1.4), `rgba(200,215,235,${0.06 + 0.1 * rng.next()})`);
  }
  // Ciemne pasy pyłu po wewnętrznej stronie ramion.
  ctx.globalCompositeOperation = 'source-over';
  for (let i = 0; i < 4000; i++) {
    const arm = rng.int(0, SPIRAL.arms - 1);
    const r = R * (0.14 + 0.7 * rng.next());
    const p = spiralPoint(arm, r * 0.94, R);
    const spread = r * 0.035;
    dot(p.x + gauss() * spread, p.y + gauss() * spread, rng.range(1.5, 3), 'rgba(4,8,10,0.16)');
  }
  texture.refresh();
  return key;
}
