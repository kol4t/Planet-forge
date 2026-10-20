import Phaser from 'phaser';
import type { MapOccupant } from '../../app/GameController.ts';
import { findStar, type StarSystem, type SystemPlanet, type SystemSummary } from '../../core/galaxy/galaxy.ts';
import { generatePlanet } from '../../core/generation/generatePlanet.ts';
import { GALAXY_RULES, ZONE_LABELS } from '../../data/galaxy.ts';
import { findDefinition, STARTER } from '../../data/planets.ts';
import { PlanetThumbnail, THUMBNAIL_SIZE } from '../../planet-renderer/PlanetThumbnail.ts';
import type { ButtonStyle } from '../ui/Button.ts';
import { TOUCH, type Rect } from '../ui/layout.ts';
import { COLORS, FONTS, formatInt } from '../ui/theme.ts';
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

  constructor(deps: OverlaySceneDeps) {
    super('map', deps, { min: 0.8, max: 4 });
  }

  init(data: MapSceneData): void {
    const index = data?.system;
    this.mode = index ? 'system' : 'galaxy';
    this.systemIndex = index ?? this.deps.controller.homeSystem;
    this.selected = this.mode === 'galaxy' ? this.systemIndex : null;
  }

  create(): void {
    this.setupInput();
    this.relayout();
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => this.clearThumbs());
  }

  relayout(): void {
    const { bar } = this.frame(196, 226);
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
    const g = this.add.graphics();
    // Delikatny pył dysku galaktyki pod układami.
    g.fillStyle(COLORS.tealHex, 0.04).fillCircle(0, 0, (GALAXY_RULES.radius + 4) * U);
    g.fillStyle(COLORS.goldHex, 0.06).fillCircle(0, 0, GALAXY_RULES.radius * 0.25 * U);
    for (const s of galaxy.systems) {
      const color = hex(findStar(s.star).color);
      const r = Math.max(1.6 * this.dpr, (0.9 + s.planetCount * 0.08) * U);
      g.fillStyle(color, 0.18).fillCircle(s.x * U, s.y * U, r * 2.4);
      g.fillStyle(color, 1).fillCircle(s.x * U, s.y * U, r);
    }
    this.marks = this.add.graphics();
    this.world!.add([g, this.marks]);
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
    system.planets.forEach((p, i) => {
      // Orbity w równych odstępach (czytelniej niż w prawdziwej skali); kolejność jak od gwiazdy.
      const r = n === 1 ? minR : minR + ((maxR - minR) * i) / (n - 1);
      g.lineStyle(Math.max(1, this.dpr * 0.7), COLORS.panelBorder, 0.9).strokeCircle(0, 0, r);
      const x = Math.cos(p.angle) * r;
      const y = Math.sin(p.angle) * r;
      this.planetSpots.push({ position: p.position, x: cx + x, y: cy + y });
      const key = `map-thumb-${p.address}-${Date.now()}`;
      const texture = this.textures.createCanvas(key, THUMBNAIL_SIZE, THUMBNAIL_SIZE)!;
      texture.setFilter(Phaser.Textures.FilterMode.NEAREST);
      new PlanetThumbnail(this.planetFor(p)).draw(texture.context, p.position * 1.3);
      texture.refresh();
      this.thumbs.push(key);
      items.push(this.add.image(x, y, key).setDisplaySize(thumbD, thumbD));
      const text = this.add
        .text(0, 0, `${String.fromCharCode(97 + p.position)}`, {
          fontFamily: FONTS.body,
          fontSize: `${this.px(this.s(10.5))}px`,
          fontStyle: '600',
          color: COLORS.muted,
        })
        .setOrigin(0.5, 0);
      this.labels.push({ text, x: x / this.view.unit, y: y / this.view.unit + thumbD * 0.62, always: true });
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
      if (p.position === this.selected) g.lineStyle(Math.max(1.5, this.dpr * 1.2), 0xffffff, 0.9).strokeCircle(x, y, ring * 1.3);
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
        line(`Planet: ${s.planetCount} · miejsca startowe graczy: ${homes} · formy obce: ${system.planets.filter((p) => p.occupant === 'alien').length}`, 11.5, COLORS.text);
        buttons(['Pokaż układ', 'primary', () => this.openSystem(s.index)], ['Odznacz', 'secondary', () => this.onTap(-1e6, -1e6)]);
      }
      this.details.add(items);
      return;
    }

    const system = this.system;
    const p = system && this.selected ? system.planets[this.selected - 1] : undefined;
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
      `Złoża: metal ${Math.round(rich.metal * 100)}% · kryształy ${Math.round(rich.crystal * 100)}% · energia ${Math.round(rich.energy * 100)}%`,
      11,
      COLORS.muted,
    );
    let action: [string, ButtonStyle, () => void];
    if (occupant === 'you') {
      action =
        p.address === controller.address
          ? ['Tu jesteś', 'disabled', () => undefined]
          : ['Przejdź', 'primary', () => this.finish(controller.switchPlanet(slot))];
    } else if (occupant === 'free' && this.systemIndex === controller.homeSystem) {
      action = ['Skolonizuj', 'primary', () => this.finish(controller.colonize(p.address))];
    } else if (occupant === 'free') {
      action = ['Wymaga statku', 'disabled', () => this.showToast(controller.colonize(p.address).message, 'info', 3200)];
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
